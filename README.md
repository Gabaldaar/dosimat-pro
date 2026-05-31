# Dosimat Pro - Gestión de Piscinas y Finanzas

Sistema inteligente para el mantenimiento de piscinas y control financiero diseñado para profesionales.

## 🚀 Cómo subir este proyecto a GitHub

Si al intentar subir el código recibes un error de **"Invalid username or token"**, es porque GitHub ya no acepta tu contraseña de siempre para la terminal. Sigue estos pasos:

### 1. Generar tu Token en GitHub
1. Ve a tu cuenta de GitHub en el navegador.
2. Entra en **Settings** (Configuración) -> **Developer settings** (al final a la izquierda).
3. Haz clic en **Personal access tokens** -> **Tokens (classic)**.
4. Dale a **Generate new token (classic)**.
5. Ponle un nombre (ej: "Token Dosimat"), elige la expiración que prefieras y **marca la casilla "repo"** (esto es muy importante).
6. Haz clic en **Generate token** al final.
7. **Copia el código que te dan** (empieza con `ghp_...`). ¡Guárdalo bien porque no volverá a aparecer!

### 2. Actualizar tu proyecto con el Token
Copia y pega este comando en tu terminal, reemplazando `<TU_TOKEN>` por el código que acabas de copiar:

```bash
git remote set-url origin https://<TU_TOKEN>@github.com/Gabaldaar/dosimat-pro.git
```

### 3. Subir el código definitivamente
Ahora ya puedes hacer el push final:

```bash
git push -u origin main
```

---

## 🛠️ Guía de Dominios Gratuitos

Si quieres una dirección personalizada sin comprar un dominio:

1. Entra en [Firebase Console > Hosting](https://console.firebase.google.com/project/_/hosting/main).
2. Si no has comenzado, haz clic en **"Comenzar"**.
3. Baja hasta el final de la página y busca la sección **"Sitios"**.
4. Haz clic en **"Agregar otro sitio"**.
5. Escribe el nombre deseado. Firebase te dará la dirección `nombre.web.app` al instante.

---
*Desarrollado con Next.js 15, Firebase y Genkit.*
