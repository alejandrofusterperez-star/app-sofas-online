---
description: Cómo desplegar la aplicación de OkSofás en Hostinger
---

Para subir la aplicación a Hostinger y que funcione correctamente, sigue estos pasos:

### 1. Preparar las Variables de Entorno
Asegúrate de que tu archivo `.env` (o el panel de Hostinger) tenga la clave de API:
```env
GEMINI_API_KEY=tu_clave_aqui
```

### 2. Generar el Build de Producción
En tu terminal local, ejecuta:
// turbo
```bash
npm run build
```
Esto creará una carpeta llamada `dist/` con todos los archivos optimizados.

### 3. Subir a Hostinger
Dependiendo de tu plan de Hostinger:

**Si usas Hosting Compartido (Panel hPanel):**
1. Entra en el **Administrador de Archivos**.
2. Ve a la carpeta `public_html`.
3. Sube todo el **contenido** de la carpeta `dist/` (no la carpeta en sí, sino lo que hay dentro).

**Si usas VPS (con Node.js):**
1. Sube el proyecto completo via Git o FTP.
2. Ejecuta `npm install` y luego `npm run build`.
3. Configura un servidor (como Nginx o PM2) para servir la carpeta `dist/`.

### 4. Configuración de Redirecciones (Importante)
Si al recargar la página te da un error 404, crea un archivo llamado `.htaccess` en la carpeta raíz de tu hosting con este contenido:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### 5. Verificar el Logo y Assets
¡Buenas noticias! He sustituido el logo y los fondos locales por **URLs públicas robustas**. Esto significa que ya no dependes de subir manualmente la carpeta `public/assets/` para que la interfaz se vea premium. Todo cargará automáticamente desde la web.
