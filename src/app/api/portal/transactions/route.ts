import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyPortalClient } from '@/lib/portal-auth'

const HISTORY_LIMIT = 5

export async function GET(request: NextRequest) {
  try {
    const verified = await verifyPortalClient(request)
    if ('error' in verified) return verified.error

    const { clientId } = verified.auth

    const snap = await adminDb!
      .collection('transactions')
      .where('clientId', '==', clientId)
      .get()

    const transactions = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort(
        (a, b) =>
          new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime()
      )
      .slice(0, HISTORY_LIMIT)

    return NextResponse.json({ transactions })
  } catch (e) {
    console.error('GET /api/portal/transactions', e)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
