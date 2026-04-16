import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendPushNotification } from '@/app/actions/notifications';

/**
 * Endpoint de CRON llamado por Fastcron periódicamente.
 * Se encarga de:
 * 1. Avisar entre las 9 AM y 11 AM sobre rutas para hoy.
 * 2. Avisar sobre rutas de días anteriores que siguen "En Camino".
 * 3. Avisar a la noche (>= 20hs) si la ruta de hoy sigue abierta.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Validar clave secreta contra variable de entorno
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    
    // Obtener fecha y hora de Argentina de forma robusta
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const dateParts: Record<string, string> = {};
    parts.forEach(({ type, value }) => { dateParts[type] = value; });

    const currentHour = parseInt(dateParts.hour);
    const todayStr = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;

    // Optimización: Solo traer rutas que no están completadas
    const sheetsSnap = await adminDb.collection('route_sheets')
      .where('status', 'in', ['planned', 'active'])
      .get();
      
    const usersSnap = await adminDb.collection('users').get();
    
    const allUsers = usersSnap.docs.map(doc => doc.data());
    const authorizedRoles = ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'];
    
    // Obtener tokens de todos los miembros del equipo
    const allTokens = allUsers
      .filter(u => authorizedRoles.includes(u.role) && u.fcmTokens && u.fcmTokens.length > 0)
      .flatMap(u => u.fcmTokens);

    let notificationsSent = 0;

    for (const doc of sheetsSnap.docs) {
      const sheet = doc.data();
      const sheetDate = sheet.date;

      // 1. Alerta Mañanera (9 AM a 11 AM)
      // Se activa si la ruta es para hoy y estamos en el rango horario, y aún no se envió.
      if (sheetDate === todayStr && currentHour >= 9 && currentHour < 11 && !sheet.morningAlertSent) {
        if (allTokens.length > 0) {
          await sendPushNotification(allTokens, "Ruta para Hoy", "Hay una Hoja de Ruta programada para cumplir hoy.");
          await doc.ref.update({ morningAlertSent: true });
          notificationsSent++;
        }
      }

      // 2. Alerta de Cierre Tardío (Hoy - post 20:00hs)
      if (sheetDate === todayStr && sheet.status === 'active' && currentHour >= 20 && (!sheet.lastOverdueAlertDate || !sheet.lastOverdueAlertDate.includes(todayStr))) {
        if (allTokens.length > 0) {
          await sendPushNotification(
            allTokens, 
            "Ruta sin Cerrar", 
            "La jornada de hoy todavía figura 'En Camino'. No olvides finalizarla al terminar."
          );
          await doc.ref.update({ lastOverdueAlertDate: todayStr });
          notificationsSent++;
        }
      }

      // 3. Alerta de Ruta de días anteriores sin finalizar
      if (sheetDate < todayStr && sheet.status === 'active' && (!sheet.lastOverdueAlertDate || !sheet.lastOverdueAlertDate.includes(todayStr))) {
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

    return NextResponse.json({ 
      success: true, 
      processed: sheetsSnap.size, 
      notificationsSent,
      argentinaTime: `${todayStr} ${currentHour}hs`,
      debug: { hour: currentHour, today: todayStr }
    });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
