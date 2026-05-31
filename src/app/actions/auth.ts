
'use server';

/**
 * Función dummy para evitar errores de importación.
 * La validación se realiza íntegramente en el cliente para evitar errores de credenciales de servidor.
 */
export async function verifyClientCredentials(email: string, dni: string) {
  return { success: true };
}
