# Dosimat Pro - Gestión de Piscinas y Finanzas

Sistema inteligente para el mantenimiento de piscinas y control financiero diseñado para profesionales.

## 🚀 Cómo subir este proyecto a GitHub

Para guardar tu código y habilitar el despliegue automático, sigue estos pasos en tu terminal:

1. **Inicializar Git**:
   ```bash
   git init
   ```

2. **Agregar los archivos**:
   ```bash
   git add .
   ```

3. **Primer Commit**:
   ```bash
   git commit -m "Primer despliegue de Dosimat Pro"
   ```

4. **Vincular con tu Repo en GitHub**:
   *(Crea un repo vacío en github.com y copia la URL)*
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git branch -M main
   git push -u origin main
   ```

## 🛠️ Guía de Producción y Dominios

### 1. Nombre Fácil y Gratuito (ej: `mi-negocio.web.app`)
Si quieres una dirección personalizada sin comprar un dominio:

1. **Ir a la Consola**: Entra en [Firebase Console > Hosting](https://console.firebase.google.com/project/_/hosting/main).
2. **Pestaña Hosting**: Si no la ves, búscala en el menú "Build" (Compilación). Haz clic en "Comenzar" si es la primera vez.
3. **Bajar hasta el final**: Verás una sección llamada **"Sitios"**.
4. **Agregar otro sitio**: Escribe el nombre deseado. Firebase te dará la dirección `nombre.web.app` al instante.

### 2. Personalizar tu Dominio Propio (comprado)
Si tienes un dominio como `www.tuempresa.com`:

1. **En la Consola**: Ve a **App Hosting** > **Configuración** > **Dominios personalizados**.
2. **Configuración DNS**: Ingresa tu dominio y copia los registros **A** o **CNAME**.
3. **Panel de Dominio**: Pega esos registros en el panel de control de tu proveedor (GoDaddy, etc.).

### 3. Checklist de Seguridad
- **Authentication**: Asegúrate de que el método "Correo electrónico/contraseña" esté **Habilitado**.
- **Roles**: La App tiene un sistema de auto-reparación. El primer usuario que se registre será Administrador automáticamente.

---
*Desarrollado con Next.js 15, Firebase y Genkit.*
