# Deploy (Vercel) y operación

## 1. Primer deploy
1. Subir el repo a GitHub e importarlo en Vercel (framework: Astro; Node 22).
2. Cargar las variables de `.env.example` en Vercel (Production y Preview).
3. Dominio: definir `PUBLIC_SITE_URL` con el dominio final (canonical, sitemap y OG dependen de eso).

## 2. Leads (Google Sheets)
Seguir `docs/google-sheets.gs`. Variables: `LEADS_WEBHOOK_URL`, `LEADS_WEBHOOK_SECRET`.
Sin `LEADS_WEBHOOK_URL`, en producción el formulario responde 503 a propósito: no se aceptan leads que no se puedan guardar.

## 3. Tracking
- `PUBLIC_META_PIXEL_ID`, `PUBLIC_GA4_ID`: sin valor, el script no se carga.
- API de conversiones: `META_CAPI_TOKEN` (y `META_TEST_EVENT_CODE` sólo para probar en Events Manager).
- El `Lead` del navegador y el del servidor comparten `event_id` para deduplicar.

## 4. Panel /admin (imágenes por URL)
Las imágenes se alojan en Cloudinary; el panel sólo guarda sus URLs.

1. **Redis**: en Vercel > Storage > Marketplace, agregar *Upstash Redis* al proyecto. Define `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
2. **Clave**: en tu máquina, `npm run admin:hash` (pide la clave sin mostrarla; exige 14+ caracteres con mayúscula, minúscula, número y símbolo) o `npm run admin:hash -- --generate` para que cree una. Copiar la línea `ADMIN_PASSWORD_HASH=...` a Vercel.
3. `ADMIN_USERNAME`: el usuario que quieran.
4. Entrar a `https://dominio/admin`.

Cómo funciona y qué garantiza:
- scrypt (N=32768) con sal única; la clave nunca se guarda. El login tarda lo mismo si falla el usuario o la clave.
- Sesión de 8 h en cookie `HttpOnly`, `Secure`, `SameSite=Strict`. El servidor guarda sólo el hash del token y lo revoca al salir.
- 5 intentos fallidos por IP bloquean 15 minutos. Mutaciones con verificación de `Origin` y token CSRF.
- Sólo se aceptan URLs `https` de `res.cloudinary.com` (otros hosts: `ADMIN_IMAGE_HOSTS`, separados por coma).
- Cada cambio queda en un historial (quién, qué imagen, antes/después).
- Prioridad de imágenes: URL del panel > archivo en `src/assets` > placeholder. "Restablecer" borra la URL del panel.
- Los cambios llegan al sitio en ~1 minuto (caché de borde). Si Redis cae, el sitio sigue con las imágenes locales.

**Rotar la clave:** correr `npm run admin:hash`, reemplazar `ADMIN_PASSWORD_HASH` en Vercel y redeployar. Para cerrar todas las sesiones, vaciar las claves `krens:sess:*` en Upstash.

## 5. Rollback
Vercel > Deployments > Promote anterior. Los datos del panel viven en Redis y no se ven afectados.

## 6. Pendientes con el cliente
Logo en alta, número de WhatsApp, horarios, zonas de entrega, clientes/eventos a mostrar, testimonios, ID del Pixel, dominio, autorización de imágenes de terceros.
