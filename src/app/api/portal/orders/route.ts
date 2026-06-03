import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import {
  formatRevisionSummary,
  type ClientRequestRevisionSnapshot,
} from '@/lib/client-request-revisions'
import { sendPushNotification } from '@/app/actions/notifications'
import { verifyPortalClient } from '@/lib/portal-auth'

const LOCKED_MESSAGE =
  'Tu pedido ya está en reparto. Para cambios, comunicate con nosotros por teléfono o WhatsApp.'

async function isClientDeliveryLocked(clientId: string): Promise<boolean> {
  const snap = await adminDb!
    .collection('route_sheets')
    .where('participantClientIds', 'array-contains', clientId)
    .where('status', '==', 'active')
    .limit(1)
    .get()
  return !snap.empty
}

async function loadRequestForClient(requestId: string, clientId: string) {
  const reqRef = adminDb!.collection('client_requests').doc(requestId)
  const reqDoc = await reqRef.get()
  if (!reqDoc.exists) {
    return { error: NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 }) }
  }

  const req = reqDoc.data()!
  if (req.clientId !== clientId) {
    return { error: NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }) }
  }

  if (req.status === 'completed' || req.status === 'cancelled') {
    return {
      error: NextResponse.json({ error: 'Este pedido ya no se puede modificar.' }, { status: 400 }),
    }
  }

  if (await isClientDeliveryLocked(clientId)) {
    return {
      error: NextResponse.json({ error: LOCKED_MESSAGE, code: 'DELIVERY_ACTIVE' }, { status: 403 }),
    }
  }

  if (req.routeSheetId) {
    const sheetDoc = await adminDb!.collection('route_sheets').doc(req.routeSheetId).get()
    if (sheetDoc.exists) {
      const sheetStatus = sheetDoc.data()?.status
      if (sheetStatus === 'active' || sheetStatus === 'completed') {
        return {
          error: NextResponse.json(
            { error: LOCKED_MESSAGE, code: 'DELIVERY_ACTIVE' },
            { status: 403 }
          ),
        }
      }
    }
  }

  return { reqRef, req, reqDoc }
}

function snapshotFromRequest(req: Record<string, unknown>): ClientRequestRevisionSnapshot {
  return {
    cloro: Number(req.cloro || 0),
    acido: Number(req.acido || 0),
    notes: String(req.notes || ''),
  }
}

async function notifyStaffOfRevision(
  clientName: string,
  type: 'updated' | 'cancelled',
  previous: ClientRequestRevisionSnapshot | null,
  current: ClientRequestRevisionSnapshot
) {
  if (!adminDb) return
  const usersSnap = await adminDb.collection('users').get()
  const managementRoles = ['Admin', 'Employee', 'Communicator']
  const tokens = usersSnap.docs
    .filter((d) => managementRoles.includes(d.data().role) && d.data().fcmTokens?.length)
    .flatMap((d) => d.data().fcmTokens as string[])

  if (tokens.length === 0) return

  const body = formatRevisionSummary(type, clientName, current, previous ?? undefined)
  await sendPushNotification(tokens, 'Cambio en pedido del portal', body, '/routes')
}

export async function PATCH(request: NextRequest) {
  try {
    const verified = await verifyPortalClient(request)
    if ('error' in verified) return verified.error
    const auth = verified.auth

    const body = await request.json()
    const { requestId, cloro, acido, notes } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId es obligatorio.' }, { status: 400 })
    }

    const cloroNum = Number(cloro)
    const acidoNum = Number(acido)
    if (cloroNum < 0 || acidoNum < 0 || (cloroNum === 0 && acidoNum === 0)) {
      return NextResponse.json(
        { error: 'Indicá al menos un bidón de cloro o ácido.' },
        { status: 400 }
      )
    }

    const loaded = await loadRequestForClient(requestId, auth.clientId)
    if ('error' in loaded && loaded.error) return loaded.error

    const { reqRef, req } = loaded
    const now = new Date().toISOString()
    const isScheduled = req.status === 'scheduled' && !!req.routeSheetId

    const update: Record<string, unknown> = {
      cloro: cloroNum,
      acido: acidoNum,
      notes: String(notes || ''),
      updatedAt: now,
    }

    if (isScheduled) {
      const previous = snapshotFromRequest(req)
      update.revisionSnapshot = previous
      update.needsStaffReview = true
      update.clientRevisionType = 'updated'
      update.clientRevisionAt = now
      update.staffReviewedAt = null
      update.clientDismissedReviewNotice = false
      await reqRef!.update(update)
      await notifyStaffOfRevision(
        String(req.clientName || 'Cliente'),
        'updated',
        previous,
        { cloro: cloroNum, acido: acidoNum, notes: String(notes || '') }
      )
      return NextResponse.json({
        success: true,
        needsStaffReview: true,
        message: 'Cambios guardados. Avisamos al equipo para que actualice la planilla.',
      })
    } else {
      update.needsStaffReview = false
      update.clientRevisionType = null
      update.clientRevisionAt = null
      update.revisionSnapshot = null
    }

    await reqRef!.update(update)

    return NextResponse.json({
      success: true,
      needsStaffReview: false,
      message: 'Pedido actualizado.',
    })
  } catch (e: unknown) {
    console.error('PATCH /api/portal/orders', e)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const verified = await verifyPortalClient(request)
    if ('error' in verified) return verified.error
    const auth = verified.auth

    const requestId = request.nextUrl.searchParams.get('requestId')
    if (!requestId) {
      return NextResponse.json({ error: 'requestId es obligatorio.' }, { status: 400 })
    }

    const loaded = await loadRequestForClient(requestId, auth.clientId)
    if ('error' in loaded && loaded.error) return loaded.error

    const { reqRef, req } = loaded
    const now = new Date().toISOString()
    const isScheduled = req.status === 'scheduled' && !!req.routeSheetId

    if (isScheduled) {
      const previous = snapshotFromRequest(req)
      await reqRef!.update({
        status: 'cancelled',
        revisionSnapshot: previous,
        needsStaffReview: true,
        clientRevisionType: 'cancelled',
        clientRevisionAt: now,
        staffReviewedAt: null,
        clientDismissedReviewNotice: false,
        updatedAt: now,
      })
      await notifyStaffOfRevision(
        String(req.clientName || 'Cliente'),
        'cancelled',
        previous,
        previous
      )
      return NextResponse.json({
        success: true,
        needsStaffReview: true,
        message: 'Pedido anulado. Avisamos al equipo para que actualice la planilla.',
      })
    }

    await reqRef!.delete()
    return NextResponse.json({ success: true, message: 'Pedido anulado.' })
  } catch (e: unknown) {
    console.error('DELETE /api/portal/orders', e)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
