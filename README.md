# Dosimat Pro - Gestión de Piscinas y Finanzas

Sistema inteligente para el mantenimiento de piscinas y control financiero diseñado para profesionales.

## Guía de Producción

### 1. Personalizar tu Dominio
Si deseas cambiar la dirección predeterminada (`studio-xxx.web.app`) por una propia (ej. `www.tuempresa.com`):

1. **En la Consola de Firebase**:
   - Si usas **App Hosting**: Ve a la sección **App Hosting** > Selecciona tu app > Pestaña **Configuración** > **Dominios personalizados**.
   - Si usas **Hosting estándar**: Ve a **Hosting** > Botón **"Agregar dominio personalizado"**.
2. **Configuración DNS**:
   - Ingresa tu dominio.
   - Copia los registros **A** o **CNAME** que te proporciona Firebase.
   - Pégalos en el panel de control de tu proveedor de dominio (donde lo compraste).
3. **Certificado SSL**: Firebase generará un certificado de seguridad (HTTPS) automáticamente para tu dominio sin costo adicional una vez que los DNS se propaguen (puede tardar de 1 a 24 horas).

### 2. Checklist de Seguridad y Servicios
Para que todo funcione correctamente, verifica en la [Consola de Firebase](https://console.firebase.google.com/):
- **Authentication**: El método de "Correo electrónico/contraseña" debe estar **Habilitado**.
- **Firestore**: La base de datos debe estar inicializada. Las reglas de seguridad se suben automáticamente con tu código.

### 3. Gestión de Usuarios
Recuerda que el primer usuario que se registre será automáticamente **Administrador**. Para agregar colaboradores, pídeles que se registren y luego cámbiales el rol en la sección **Equipo** de la App.

---
*Desarrollado con Next.js, Firebase y Genkit.*