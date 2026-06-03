import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { normalizeEmail, isStaffOrClientRole } from '@/lib/auth-routing'

export type PortalClientAuth = { clientId: string; uid: string }

/**
 * Verifica token de cliente del portal y resuelve clientId por email (fuente de verdad)
 * o por users.clientId, sincronizando el vínculo si hace falta.
 */
export async function verifyPortalClient(
  request: NextRequest,
): Promise<{ auth: PortalClientAuth } | { error: NextResponse }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }) }
  }

  if (!adminAuth || !adminDb) {
    return { error: NextResponse.json({ error: 'Servidor no configurado.' }, { status: 500 }) }
  }

  try {
    const idToken = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(idToken)
    const email = decoded.email ? normalizeEmail(decoded.email) : null

    const userRef = adminDb.collection('users').doc(decoded.uid)
    const userDoc = await userRef.get()
    const userData = userDoc.data()

    if (!userData || !isStaffOrClientRole(userData.role)) {
      return { error: NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }) }
    }

    let clientId: string | null = null

    if (email) {
      const clientSnap = await adminDb
        .collection('clients')
        .where('mail', '==', email)
        .limit(1)
        .get()
      if (!clientSnap.empty) {
        clientId = clientSnap.docs[0].id
      }
    }

    if (!clientId && userData.clientId) {
      clientId = String(userData.clientId)
    }

    if (!clientId) {
      return {
        error: NextResponse.json(
          { error: 'Tu cuenta no está vinculada a una ficha de cliente.' },
          { status: 403 },
        ),
      }
    }

    if (userData.clientId !== clientId) {
      await userRef.set({ clientId, updatedAt: new Date().toISOString() }, { merge: true })
    }

    return { auth: { clientId, uid: decoded.uid } }
  } catch (e) {
    console.error('verifyPortalClient', e)
    return { error: NextResponse.json({ error: 'Token inválido.' }, { status: 401 }) }
  }
}
