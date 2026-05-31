import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // 1. Obtener la sesión del usuario para validar que es Admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado: Cabecera Authorization faltante.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'El SDK de administración de Firebase no está configurado.' }, { status: 500 });
    }
    
    // Verificar token del administrador
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminUid = decodedToken.uid;
    
    // Verificar que el usuario que hace el request es un Administrador
    const adminUserDoc = await adminDb.collection('users').doc(adminUid).get();
    const adminUserData = adminUserDoc.data();
    if (!adminUserData || adminUserData.role !== 'Admin') {
      return NextResponse.json({ error: 'Acceso Denegado: Solo administradores pueden eliminar usuarios.' }, { status: 403 });
    }

    // 2. Obtener el UID del usuario a eliminar
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'El userId es obligatorio.' }, { status: 400 });
    }

    // Evitar que el administrador se elimine a sí mismo
    if (userId === adminUid) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo.' }, { status: 400 });
    }

    // 3. Eliminar de Firebase Auth
    try {
      await adminAuth.deleteUser(userId);
    } catch (authError: any) {
      // Si el usuario no existe en Auth (por ejemplo, ya fue borrado), ignorar este error y proceder con Firestore
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    // 4. Eliminar de Firestore (colección 'users')
    await adminDb.collection('users').doc(userId).delete();

    return NextResponse.json({ success: true, message: `Usuario ${userId} eliminado con éxito.` });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
