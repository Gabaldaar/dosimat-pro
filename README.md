# Dosimat Pro - Gestión de Piscinas y Finanzas

Sistema inteligente para el mantenimiento de piscinas y control financiero diseñado para profesionales.

## Guía de Producción

### 1. Nombre Fácil (Gratis, similar a Netlify)
Si quieres una dirección como `mi-negocio.web.app` en lugar del código numérico:

1. **En la Consola de Firebase**: Ve a **Hosting** (icono del mundo en el menú lateral).
2. **Agregar Sitio**: Al final de la página, haz clic en **"Agregar otro sitio"**.
3. **Elige tu nombre**: Escribe el nombre deseado. Si está disponible, Firebase te dará la dirección `nombre.web.app` instantáneamente.
4. **Vincular**: Luego, en la configuración de despliegue, elige ese nuevo sitio como destino principal.

### 2. Personalizar tu Dominio Propio
Si tienes un dominio comprado (ej. `www.tuempresa.com`):

1. **En la Consola de Firebase**:
   - Ve a **App Hosting** (o Hosting estándar) > **Configuración** > **Dominios personalizados**.
2. **Configuración DNS**: Ingresa tu dominio y copia los registros **A** o **CNAME** que te proporciona Firebase.
3. **Panel de Dominio**: Pega esos registros en el panel de control donde compraste el dominio (GoDaddy, DonWeb, etc.).
4. **Certificado SSL**: Firebase generará el candado de seguridad (HTTPS) automáticamente una vez que los DNS se propaguen.

### 3. Checklist de Seguridad
Para que la App funcione en el mundo real:
- **Authentication**: Verifica que el método de "Correo electrónico/contraseña" esté **Habilitado**.
- **Firestore**: La base de datos debe estar en **Modo Producción**.
- **Roles**: El primer usuario que se registre será Administrador. Puedes gestionar el resto del equipo desde la sección **Equipo** de la App.

---
*Desarrollado con Next.js, Firebase y Genkit.*
