# Dosimat Pro - Gestión de Piscinas y Finanzas

Sistema inteligente para el mantenimiento de piscinas y control financiero diseñado para profesionales.

## Guía de Producción y Dominios

### 1. Nombre Fácil y Gratuito (ej: `mi-negocio.web.app`)
Si quieres una dirección personalizada sin comprar un dominio:

1. **Ir a la Consola**: Entra en [Firebase Console > Hosting](https://console.firebase.google.com/project/_/hosting/main).
2. **Bajar hasta el final**: En la pestaña de "Hosting", desplázate hasta abajo del todo, debajo de la lista de archivos o dominios actuales.
3. **Sección Sitios**: Verás un botón que dice **"Agregar otro sitio"**.
4. **Elegir nombre**: Escribe el nombre deseado. Si está disponible, Firebase te dará la dirección `nombre.web.app` y `nombre.firebaseapp.com` al instante.
5. **Vincular con App Hosting**: Luego, en la sección de **App Hosting**, puedes asociar este nuevo sitio como el destino de tu aplicación Next.js.

### 2. Personalizar tu Dominio Propio (comprado)
Si tienes un dominio como `www.tuempresa.com`:

1. **En la Consola**: Ve a **App Hosting** > **Configuración** > **Dominios personalizados**.
2. **Configuración DNS**: Ingresa tu dominio y copia los registros **A** o **CNAME**.
3. **Panel de Dominio**: Pega esos registros en el panel de control donde compraste el dominio (GoDaddy, Namecheap, etc.).
4. **SSL**: El certificado "candado" (HTTPS) se activará solo una vez que los DNS se propaguen.

### 3. Checklist de Seguridad Final
Antes de compartir la App con tu equipo:
- **Authentication**: Asegúrate de que el método "Correo electrónico/contraseña" esté **Habilitado**.
- **Roles**: El primer usuario que se registre será Administrador automáticamente gracias al sistema de auto-reparación de roles integrado.
- **Equipo**: Puedes invitar a otros y cambiar sus roles desde la sección **Equipo** dentro de la App.

---
*Desarrollado con Next.js 15, Firebase y Genkit.*
