
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendPushNotification } from '@/app/actions/notifications';

/**
 * Endpoint de CRON llamado por Fastcron periódicamente.
 * Se encarga de:
 * 1. Avisar a las 9 AM sobre rutas programadas para hoy.
 * 2. Avisar sobre rutas de días anteriores que siguen "En Camino".
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Validar clave secreta
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Convertir a hora de Argentina (GMT-3)
    const argentinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const currentHour = argentinaTime.getHours();
    const todayStr = argentinaTime.toISOString().split('T')[0];

    const sheetsSnap = await adminDb.collection('route_sheets').get();
    const usersSnap = await adminDb.collection('users').get();
    
    const allUsers = usersSnap.docs.map(doc => doc.data());
    const authorizedRoles = ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'];
    
    // Obtener tokens de todos
    const allTokens = allUsers
      .filter(u => authorizedRoles.includes(u.role) && u.fcmTokens)
      .flatMap(u => u.fcmTokens);

    let notificationsSent = 0;

    for (const doc of sheetsSnap.docs) {
      const sheet = doc.data();
      const sheetDate = sheet.date;

      // 1. Alerta Mañanera (9 AM)
      if (sheetDate === todayStr && sheet.status === 'planned' && currentHour === 9 && !sheet.morningAlertSent) {
        if (allTokens.length > 0) {
          await sendPushNotification(allTokens, "Ruta para Hoy", "Hay una Hoja de Ruta programada para cumplir hoy.");
          await doc.ref.update({ morningAlertSent: true });
          notificationsSent++;
        }
      }

      // 2. Alerta de Ruta sin finalizar (Si es de ayer o antes y sigue activa)
      if (sheetDate < todayStr && sheet.status === 'active' && !sheet.lastOverdueAlertDate?.includes(todayStr)) {
        if (allTokens.length > 0) {
          await sendPushNotification(
            allTokens, 
            "Ruta Pendiente de Cierre", 
            `La hoja de ruta del ${sheetDate} aún figura "En Camino". Por favor, finalizar la jornada.`
          );
          await doc.ref.update({ lastOverdueAlertDate: todayStr });
          notificationsSent++;
        }
      }
    }

    return NextResponse.json({ success: true, processed: sheetsSnap.size, notificationsSent });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
