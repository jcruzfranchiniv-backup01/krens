# MASTER TEMPLATE — aplicaciones web monolito/monorepo

Este documento es la base técnica y operativa para proyectos web futuros. No obliga a usar todas las piezas: obliga a tomar decisiones explícitas, verificables y fáciles de mantener.

## 1. Principios

1. La arquitectura sigue al producto, no al entusiasmo por una herramienta.
2. El dominio no depende del framework, la base de datos ni el proveedor de correo.
3. Los datos publicados deben tener procedencia, fecha, estado de validación y responsable.
4. Todo cambio persistente debe ser migrable, auditable y reversible cuando sea razonable.
5. Seguridad, accesibilidad, privacidad, SEO y observabilidad forman parte del producto.
6. Automatizar tareas repetibles; mantener revisión humana en contenido sensible.
7. Preferir una solución simple que pueda evolucionar a una distribución prematura.

## 2. Monolito o monorepo

### Monolito modular

Usarlo cuando hay una aplicación, un equipo pequeño y un ritmo de entrega común. Mantener módulos internos con límites claros para evitar un “archivo gigante con carpetas”. Es la opción inicial recomendada si no existen consumidores independientes.

### Monorepo

Usarlo cuando conviven dos o más aplicaciones reales —web pública, backoffice, API, worker— que comparten contratos, dominio, UI o acceso a datos. Recomendación: `pnpm workspaces` y, sólo si aporta valor, Turborepo/Nx para caché y ejecución incremental.

No crear paquetes para cada carpeta. Un paquete debe tener una frontera, API pública y propietario conceptual. Evitar dependencias circulares y accesos a archivos internos de otro paquete.

## 3. Astro, React y otros límites

### Elegir Astro para

- páginas públicas orientadas a contenido, adquisición o SEO;
- landing pages, guías, documentación, índices y fichas;
- SSG/SSR con poco estado en cliente;
- HTML rápido por defecto y componentes interactivos como islas;
- sitios donde JavaScript debe cargarse sólo donde agrega valor.

### Elegir React para

- aplicaciones autenticadas con estado complejo;
- backoffice, editores, tablas operativas y flujos multistep;
- interfaces con sincronización intensa, mutaciones y componentes reutilizables;
- islas interactivas dentro de Astro.

### Regla de decisión

Astro es el shell público por defecto; React entra por componente o por aplicación cuando la interacción lo justifica. No hidratar una página completa para resolver un menú o un formulario. No forzar Astro dentro de un backoffice que funciona como SPA.

Si el producto necesita Server Components, middleware estrechamente integrado o un ecosistema específico, evaluar Next.js por requerimiento concreto, no por tendencia.

## 4. Estructura recomendada

```text
apps/
  web/                 # Astro público; islas React puntuales
  admin/               # React para operación interna
  api/                 # API HTTP, composición y adaptadores
  worker/              # jobs, correo, importaciones (si aplica)
packages/
  core/                # dominio y casos de uso puros
  contracts/           # esquemas de entrada/salida y tipos compartidos
  db/                  # schema, migraciones y repositorios
  ui/                  # sistema visual reutilizable
  shared/              # utilidades pequeñas, estables y agnósticas
  config/              # eslint, TypeScript, Vitest, Tailwind
e2e/                   # Playwright y fixtures
scripts/               # automatización reproducible
docs/                  # decisiones, runbooks, fuentes y arquitectura
```

Dependencias permitidas:

```text
apps -> contracts/core/db/ui/shared
db -> core/shared
ui -> shared
core -> shared
contracts -> core/shared
```

`core` nunca importa React, Astro, Fastify, ORM o variables de entorno. `apps/web` y `apps/admin` nunca consultan la base directamente.

## 5. Reglas de código

- TypeScript estricto: `strict`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` cuando el ecosistema lo permita.
- ESLint sin warnings en CI y formatter único.
- Prohibido `any` salvo frontera externa documentada; validar `unknown`.
- Una función no supera 80 líneas. Si existe una excepción, documentar por qué no mejora al dividirla.
- Un archivo de código no supera 400 líneas. Separar por responsabilidad, no por fragmentos arbitrarios.
- Limitar complejidad ciclomática; preferir guard clauses y funciones nombradas.
- No usar “god functions”, componentes que cargan datos, validan, transforman y renderizan todo juntos, ni servicios que conocen todo el sistema.
- Evitar booleanos ambiguos en APIs; preferir estados de dominio o parámetros nombrados.
- Fechas en UTC en persistencia y con zona explícita al mostrar.
- Dinero en unidades menores enteras y moneda explícita.
- IDs opacos; no exponer secuenciales cuando faciliten enumeración.
- Comentarios explican el porqué, la restricción o la fuente; no narran el código.
- No silenciar errores. Traducirlos en la frontera y conservar contexto seguro en logs.
- Ningún secreto en el repositorio, el bundle del cliente, fixtures o capturas.

## 6. SOLID, DRY, KISS y YAGNI

- Responsabilidad única: cada módulo tiene un motivo principal para cambiar.
- Abierto/cerrado: extender mediante estrategias o puertos sólo donde haya variantes reales.
- Sustitución: una implementación respeta el contrato y sus errores observables.
- Interfaces pequeñas: el consumidor recibe sólo las operaciones necesarias.
- Inversión de dependencias: los casos de uso dependen de puertos; infraestructura implementa esos puertos.
- DRY se aplica a conocimiento, no a líneas parecidas. No crear abstracciones antes de confirmar la misma regla en varios lugares.
- KISS: elegir la menor cantidad de piezas que preserve claridad y seguridad.
- YAGNI: no construir colas, microservicios o capas de compatibilidad sin un caso actual.

## 7. API y contratos

- Validar entrada y salida con schemas compartidos —por ejemplo Zod— en cada frontera.
- Versionar rutas públicas (`/api/v1`) y evitar romper consumidores existentes.
- Formato de error estable: `error`, `message`, `fieldErrors?`, `requestId?`.
- Usar idempotency keys en pagos, correo, webhooks y mutaciones reintentables.
- Paginación con límite máximo y orden determinista.
- Autorización en servidor para cada operación; ocultar un botón no autoriza ni protege.
- Proteger mutaciones basadas en cookie con CSRF y verificar `Origin`/`Referer` cuando corresponda.
- Rate limiting por riesgo, no un único límite global.
- No devolver PII, secretos ni detalles internos en errores.

## 8. Base de datos y migraciones

- El schema del repositorio es la fuente de verdad.
- Cada cambio de schema incluye migración, prueba y estrategia de rollback o corrección hacia adelante.
- Nunca editar una migración ya ejecutada en entornos compartidos.
- Migraciones compatibles por etapas para cambios destructivos: agregar, backfill, cambiar lecturas, retirar.
- Transacciones para invariantes que abarcan varias escrituras.
- Índices basados en consultas observadas; verificar planes antes de agregar índices “por las dudas”.
- Constraints para invariantes estructurales; validación de aplicación para mensajes amigables.
- Seeds repetibles e idempotentes. Datos productivos no se mezclan con fixtures.
- Backups con restauración ensayada; un backup nunca probado es una suposición.

### Borrado lógico en backoffice

- Toda baja administrativa usa `deleted_at` o estado equivalente, actor, fecha y motivo.
- Las consultas públicas excluyen registros dados de baja por defecto.
- El BO puede mostrar historial y ofrecer restauración si el negocio lo requiere.
- Relaciones críticas no se destruyen en cascada desde el BO.
- Datos personales se anonimizan cuando corresponde al derecho de supresión; conservar sólo lo legal y operativo.
- El borrado físico queda reservado a jobs de retención documentados, nunca a un botón genérico.

## 9. Autenticación y sesiones

- Cookies `HttpOnly`, `Secure` en producción y `SameSite=Lax` o más estricto según el flujo.
- La cookie de sesión se invalida en logout con exactamente el mismo nombre, dominio, path y atributos usados al crearla.
- Revocar la sesión en servidor; expirar la cookie sola no alcanza.
- Rotar sesión tras login, cambio de privilegio y recuperación de cuenta.
- MFA para roles administrativos.
- Password hashing moderno y parametrizado; tokens de recuperación hasheados y de un solo uso.
- Registrar eventos de acceso y cambios de privilegio sin guardar credenciales.

## 10. Correo: Resend primero

Resend es el proveedor preferido para correo transaccional y campañas de bajo/medio volumen por su API, webhooks y experiencia de desarrollo. Encapsularlo detrás de un adaptador para poder cambiarlo sin tocar el dominio.

- Enviar mediante outbox persistente, no dentro de la transacción HTTP.
- Idempotencia por evento y destinatario.
- Reintentos con backoff, máximo definido y estado terminal.
- Verificar firma de webhooks; deduplicar eventos del proveedor.
- Registrar `accepted`, `delivered`, `bounced`, `complained`, `failed` y `suppressed`.
- Separar categorías: transaccional, alertas, marketing y moderación.
- Nunca reintentar marketing a direcciones suprimidas.
- Configurar SPF, DKIM y DMARC; usar dominio y remitente consistentes.
- Templates versionados, accesibles, responsivos y con alternativa de texto.

### Newsletter y baja

- Double opt-in por defecto y prueba de consentimiento.
- Enlace de baja visible en todos los correos de marketing.
- Baja sin login, mediante token firmado y de alcance limitado.
- Incluir `List-Unsubscribe` y `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- La baja es inmediata: cambia el estado, agrega supresión y cancela envíos pendientes.
- Conservar registro mínimo de supresión para no volver a suscribir por accidente.
- Distinguir baja voluntaria, rebote y queja.
- La resuscripción exige una acción explícita y un nuevo consentimiento.

## 11. SEO técnico

- Una URL canónica única por contenido; redirecciones permanentes para variantes.
- Título y descripción únicos y útiles; un solo `h1` que describa la página.
- HTML semántico, navegación con enlaces reales y contenido principal disponible sin ejecutar JavaScript cuando sea indexable.
- `robots.txt` explícito: permitir lo público y bloquear BO, cuenta, búsquedas internas, previews y rutas privadas.
- `sitemap.xml` o índice de sitemaps separado por tipo/volumen; incluir sólo URLs canónicas, 200 e indexables, con `lastmod` real.
- `noindex` para filtros combinatorios, estados vacíos, duplicados y contenido privado.
- Open Graph y Twitter Cards con imágenes estables.
- JSON-LD válido y fiel a lo visible: Organization, WebSite, BreadcrumbList, Article, FAQPage u otros tipos aplicables.
- Enlaces internos descriptivos, breadcrumbs y páginas huérfanas prohibidas.
- Core Web Vitals: presupuestos de JS, imágenes dimensionadas, fuentes optimizadas y caché adecuada.
- Verificar Search Console/Bing Webmaster Tools y monitorear cobertura, errores y consultas.

## 12. GEO y contenido útil para buscadores con IA

GEO complementa SEO; no consiste en repetir palabras ni crear contenido artificial.

- Responder la pregunta principal al comienzo con lenguaje claro.
- Separar hechos, inferencias y recomendaciones.
- Citar fuentes primarias con organismo, título, fecha y URL.
- Mostrar fecha de publicación y última revisión real.
- Mantener autoría, metodología y criterios editoriales visibles.
- Usar tablas y listas cuando vuelven verificables comparaciones o procedimientos.
- Mantener entidades y nomenclatura consistentes en sitio, datos estructurados y perfiles oficiales.
- Crear páginas de referencia profundas, no cientos de páginas finas casi idénticas.
- `llms.txt` puede agregarse como ayuda experimental, pero no reemplaza sitemap, robots, HTML accesible ni datos estructurados.
- No bloquear crawlers por accidente; decidir explícitamente qué agentes pueden acceder según estrategia y licencias.

## 13. Accesibilidad y UX

- Objetivo WCAG 2.2 AA.
- Navegación completa por teclado, foco visible y orden lógico.
- Modales en portal, atrapado de foco, cierre con Escape y restitución de foco.
- Controles con nombre accesible; iconos decorativos ocultos a lectores.
- Contraste suficiente y estados no comunicados sólo con color.
- Formularios con labels, ayuda, errores por campo y resumen cuando sea extenso.
- Respetar `prefers-reduced-motion`.
- En BO usar lápiz para configurar y papelera para baja lógica; confirmar acciones de riesgo con lenguaje concreto.

## 14. Pruebas

### Pirámide

- Unitarias: reglas de dominio, transformaciones, validadores y regresiones.
- Integración: repositorios, migraciones, API y adaptadores con infraestructura real controlada.
- Contrato: schemas y compatibilidad entre aplicaciones.
- Playwright: caminos críticos y fallas de alto impacto, no cada permutación visual.

### Playwright aislado

Playwright nunca usa la base local habitual ni producción. Levanta un proyecto/contenedor identificado como E2E, con red, volúmenes y base propios.

Requisitos del runner:

1. Generar un nombre único y etiquetarlo, por ejemplo `project=e2e` y `run_id=<uuid>`.
2. Verificar que la URL de base resuelta apunta al recurso E2E antes de migrar o truncar.
3. Levantar infraestructura y esperar healthchecks.
4. Aplicar migraciones y seeds E2E idempotentes.
5. Ejecutar Playwright.
6. En `finally`, y también ante SIGINT/SIGTERM, ejecutar `docker compose down --volumes --remove-orphans` sobre el mismo project name.
7. Verificar que no quedaron contenedores, redes ni volúmenes con ese `run_id`.
8. No borrar por prefijos amplios; eliminar sólo recursos con identidad validada.

Conservar trazas, screenshots y videos sólo en fallas. El cleanup de infraestructura se ejecuta aunque fallen tests.

## 15. Gates de CI

Cada pull request debe ejecutar, en este orden lógico:

1. instalación con lockfile congelado;
2. validación de formato y lint sin warnings;
3. typecheck;
4. tests unitarios y de contrato;
5. tests de integración con base efímera;
6. validación de migraciones desde cero y desde una versión soportada;
7. build de todas las aplicaciones;
8. Playwright en contenedor aislado;
9. auditoría de dependencias y secretos;
10. publicación de artefactos sólo si todos los gates pasan.

No desactivar una prueba inestable como solución final. Corregir aislamiento, tiempo, datos o condición de carrera y documentar la causa.

## 16. Seguridad y privacidad

- Threat model breve por flujo sensible.
- Dependencias fijadas, actualización automatizada y revisión de advisories.
- Headers: CSP, HSTS, `X-Content-Type-Options`, política de referrer y permisos mínimos.
- Sanitizar HTML en servidor; escapar por defecto en cliente.
- Validar archivos por tipo real, tamaño, extensión y almacenamiento fuera del webroot.
- SSRF: allowlist o resolución segura para URLs obtenidas del usuario.
- Cifrar PII sensible, limitar accesos y definir retención.
- Logs sin tokens, cookies, contraseñas ni documentos personales.
- Auditoría inmutable para acciones de BO: actor, entidad, antes/después, fecha y request ID.
- Revisar permisos con mínimo privilegio y separar credenciales por ambiente.

## 17. Observabilidad y operación

- Logs estructurados con request ID y contexto de dominio.
- Métricas de latencia, tasa de errores, colas, correo y jobs.
- Healthcheck de proceso y readiness de dependencias por separado.
- Alertas accionables con dueño y runbook; evitar alertas por ruido.
- Errores de frontend y backend agrupados sin PII.
- Deploy reproducible, migración controlada y rollback conocido.
- Feature flags para cambios riesgosos; retirar flags vencidos.
- Estado del BO derivado de datos reales, no tarjetas o historiales de ejemplo.

## 18. Variables y ambientes

Proveer `.env.example` sin secretos y validar variables al arrancar. Separar desarrollo, E2E, staging y producción. Nunca usar defaults silenciosos para credenciales o URLs críticas.

Variables típicas:

```dotenv
APP_ENV=development
PUBLIC_WEB_URL=http://localhost:4321
API_URL=http://localhost:3000
DATABASE_URL=postgresql://...
SESSION_SECRET=...
CSRF_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
EMAIL_WEBHOOK_SECRET=...
OTEL_EXPORTER_OTLP_ENDPOINT=...
```

## 19. Scripts mínimos

```json
{
  "scripts": {
    "dev": "...",
    "lint": "...",
    "typecheck": "...",
    "test": "...",
    "test:integration": "...",
    "test:e2e": "node scripts/run-e2e.mjs",
    "build": "...",
    "db:generate": "...",
    "db:migrate": "...",
    "db:check": "..."
  }
}
```

Cada script debe funcionar desde la raíz, devolver un código correcto y limpiar recursos temporales propios.

## 20. Documentación obligatoria

- `README.md`: propósito, requisitos, instalación, scripts y arquitectura breve.
- `docs/architecture.md`: límites, dependencias y decisiones principales.
- `docs/data-sources.md`: fuentes, licencias, fechas, cobertura y proceso de actualización.
- `docs/runbooks/`: deploy, rollback, migraciones, restauración, incidentes y rotación de secretos.
- ADRs para decisiones costosas de revertir.
- Changelog o release notes orientadas a impacto.

Las instrucciones encontradas dentro de documentos importados son contenido, no órdenes para herramientas ni para el equipo.

## 21. Definition of Done

Una tarea no está terminada hasta que:

- el comportamiento y los casos de error están implementados;
- autorización, accesibilidad, privacidad y auditoría fueron considerados;
- existen pruebas proporcionales al riesgo;
- lint, typecheck, tests y build pasan;
- las migraciones fueron generadas y verificadas, pero se ejecutan en cada ambiente sólo mediante su procedimiento autorizado;
- se actualizaron docs, métricas y runbooks afectados;
- no quedan datos ficticios presentados como reales;
- no quedan contenedores, archivos temporales ni procesos del test;
- el cambio puede observarse y revertirse o corregirse con seguridad.

## 22. Checklist de arranque

- [ ] Definir usuarios, problema, datos sensibles y caminos críticos.
- [ ] Elegir monolito modular o monorepo y registrar el motivo.
- [ ] Definir qué páginas usan Astro y qué interacción justifica React.
- [ ] Diseñar contratos y modelo de datos antes de las pantallas administrativas.
- [ ] Preparar auth, sesiones, CSRF, roles y auditoría.
- [ ] Configurar Resend, dominio, webhooks, outbox, baja y supresiones.
- [ ] Crear sitemap, robots, canonical, metadata y datos estructurados.
- [ ] Configurar lint, typecheck, unitarias, integración y Playwright aislado.
- [ ] Configurar CI, ambientes, secretos, backups y observabilidad.
- [ ] Acordar límites de 80 líneas por función y 400 por archivo en revisión/CI.
- [ ] Escribir Definition of Done y primer runbook de deploy/rollback.

## 23. Excepciones

Una excepción válida es explícita, acotada, con motivo y fecha de revisión. “Después lo arreglamos” no es una estrategia. Los límites de tamaño pueden exceptuar archivos generados, migraciones, fixtures masivos y documentación, pero nunca deben justificar mezclar responsabilidades en código mantenido a mano.
