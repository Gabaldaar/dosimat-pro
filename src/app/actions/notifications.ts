'use server';

import { JWT } from 'google-auth-library';

/**
 * Envía una notificación push a través de FCM V1 HTTP API.
 * Requiere la variable de entorno FIREBASE_SERVICE_ACCOUNT con el JSON de la cuenta de servicio.
 */
export async function sendPushNotification(tokens: string[], title: string, body: string, url: string = '/') {
  if (!tokens || tokens.length === 0) return { success: false, message: 'No tokens provided' };
  
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    console.error('FIREBASE_SERVICE_ACCOUNT environment variable is missing');
    return { success: false, message: 'Server configuration error' };
  }

  try {
    const key = JSON.parse(serviceAccountRaw);
    const jwtClient = new JWT(
      key.client_email,
      undefined,
      key.private_key,
      ['https://www.googleapis.com/auth/cloud-platform']
    );

    const authRes = await jwtClient.authorize();
    const accessToken = authRes.access_token;
    const projectId = key.project_id;

    const results = await Promise.all(tokens.map(async (token) => {
      try {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: { title, body },
              data: { click_action: url },
              webpush: {
                fcm_options: {
                  link: url
                }
              }
            },
          }),
        });
        return response.ok;
      } catch (e) {
        console.error('Error sending individual token:', e);
        return false;
      }
    }));

    return { success: true, sent: results.filter(r => r).length };
  } catch (error) {
    console.error('FCM Send Error:', error);
    return { success: false, error: String(error) };
  }
}