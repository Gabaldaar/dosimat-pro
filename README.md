# Dosimat Pro - Gestión de Piscinas y Finanzas

Sistema inteligente para el mantenimiento de piscinas y control financiero diseñado para profesionales.

## 🚀 Guía: Cómo subir este proyecto a GitHub

Para guardar tu código y habilitar el despliegue automático, sigue estos pasos exactos en tu terminal:

### 1. Preparación en GitHub
1. Entra a [github.com](https://github.com/) e inicia sesión.
2. Haz clic en el botón **"New"** (Nuevo repositorio).
3. Ponle un nombre (ej: `dosimat-pro`) y haz clic en **"Create repository"**.
4. **IMPORTANTE**: Copia la URL que termina en `.git` (la verás en la página que aparece).

### 2. Comandos en tu Terminal
Abre la terminal en la carpeta de este proyecto y pega estos comandos uno por uno:

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

4. **Configurar la rama principal**:
   ```bash
   git branch -M main
   ```

5. **Vincular con tu Repo**:
   *(Reemplaza la URL con la que copiaste en el paso anterior)*
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   ```

6. **Subir el código**:
   ```bash
   git push -u origin main
   ```

---

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

---
*Desarrollado con Next.js 15, Firebase y Genkit.*
