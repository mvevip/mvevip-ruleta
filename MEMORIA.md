# MEMORIA DEL PROYECTO: MARKETING VIP - RULETA DE FERIA Y CAMPAÑA POR CORREO
**Última actualización:** 22 de Octubre de 2026 (cierre de sesión)  
**Dominio de Producción:** [https://autos.mvevip.com](https://autos.mvevip.com)  
**Infraestructura:** AWS 100% Serverless (CloudFront `d16kuftm1n5423.cloudfront.net` + S3 + API Gateway + Lambda + RDS MySQL)
**Repositorios:**
- Personal (respaldo de actividad): `https://github.com/caloloc2/mvevip_ruleta.git`
- Empresa (principal colaborador): `https://github.com/mvevip/mvevip-ruleta.git`

---

## ⚠️ PROTOCOLO ESTRICTO DE DESARROLLO Y AISLAMIENTO (REGLA DE ORO)

> [!CAUTION]
> **TODO DESARROLLO ES 100% LOCAL POR DEFECTO.**  
> 1. **Prohibido tocar producción sin orden explícita:** NUNCA ejecutar scripts de despliegue (`deploy_aws.ps1`, `deploy_aws.sh`, comandos `aws s3 sync`, `aws lambda update-function-code`, o similares) a menos que el usuario lo solicite de manera directa y unívoca (e.g. *"listo despliega"*).
> 2. **Aislamiento absoluto de Base de Datos:**
>    - En entorno local, la API se conecta única y exclusivamente al contenedor MySQL local de Docker (`marketingvip_db` en el puerto `5501`).
>    - Las credenciales de AWS RDS de producción NUNCA se conectan desde el código local.
> 3. **Aislamiento de WebSockets y Tráfico de Red:**
>    - La pantalla y el móvil local se comunican en salas separadas (`STAND_LOCAL` / `STAND_LOCAL_2`) y rechazan orígenes de producción `autos.mvevip.com`.
>    - Jugar o probar en local NUNCA debe emitir eventos hacia las pantallas ni formularios de producción.
> 4. **Insignias Visuales de Entorno:**
>    - La pantalla local y el panel admin muestran siempre distintivos visibles (`[ENTORNO LOCAL 💻]`, `[DOCKER DB LOCAL]`) para confirmar en todo momento que se opera en el ambiente aislado.

---

## 1. Arquitectura y Enrutamiento Multi-Stand

| URL (Local / Prod) | Stand | Componente | Descripción |
| :--- | :--- | :--- | :--- |
| `/` (`https://autos.mvevip.com`) | Autos (Stand 1) | `frontend-mobile` | PWA participantes Stand Autos: registro en 2 pasos, selección de destino, tema oscuro motorsport + `#9AC31C`. |
| `/formulario2` | Ford (Stand 2) | `frontend-mobile` | PWA participantes Stand Ford \| Quito Motors: registro sin selector de destino, tema blanco corporativo + `#212650` y logo Ford. |
| `/pantalla` (`.../pantalla`) | Autos (Stand 1) | `frontend-screen` | Pantalla ruleta rin motorsport Stand Autos: video de espera alternado 20s, QR a `/`, sala `STAND_01`/`STAND_LOCAL`. |
| `/pantalla2` | Ford (Stand 2) | `frontend-screen` | Pantalla ruleta Stand Ford: diseño blanco corporativo con acentos `#212650`, logo Ford, QR a `/formulario2`, sala `STAND_02`/`STAND_LOCAL_2`. |
| `/pantalla?view=qr` / `/pantalla2?view=qr` | Autos / Ford | `frontend-screen` | Cartelería: Solo QR Gigante "Escanea y Gana" adaptado a cada stand. |
| `/pantalla?view=slider` / `/pantalla2?view=slider` | Autos / Ford | `frontend-screen` | Cartelería: Slider continuo de banners publicitarios independientes por stand. |
| `/pantalla?view=combo` / `/pantalla2?view=combo` | Autos / Ford | `frontend-screen` | Cartelería: Pantalla híbrida (Slider + Pasos + QR) adaptada a la marca del stand. |
| `/?view=mail` | Correo (campaña Brevo) | `frontend-mobile` | Formulario + ruleta en el propio celular del cliente. Marca Autos, sin selector de destino. `screen_id` `MAIL_01`. |
| `/admin` (`.../admin`) | Global (Ambos) | `frontend-admin` | Panel de control unificado: selector superior `🏎️ Stand 1: AUTOS` \| `🚘 Stand 2: FORD`. Gestión independiente de premios, pantallas, videos, métricas y leads filtrables. |
| `/api/*` (`.../api/*`) | Ambos | `api` (Node.js 20) | API REST multi-stand con resolución automática de stand vía query param `?stand=autos|ford` o screen id. |

---

## 2. Historial de Implementaciones

### A. Soporte Multi-Stand (Stand 1: Autos | Stand 2: Ford Quito Motors)
1. **Aislamiento Total de Disparo (Sockets):**
   - El escaneo y giro en `/formulario2` (`STAND_02` / `STAND_LOCAL_2`) acciona **únicamente** la ruleta de `/pantalla2`.
   - `/pantalla` (Autos) no se inmuta ni recibe eventos de Ford, garantizando operación independiente en la misma feria.
2. **Regla de 1 Participación por Stand:**
   - Un asistente puede jugar 1 vez en Stand Autos y 1 vez en Stand Ford con el mismo teléfono/email.
   - Bloqueo de duplicados contextualizado por stand en `rouletteController.js`.
3. **Catálogo de Premios y Contenidos Separados:**
   - Columna `stand` en tablas `prizes` y `slider_images`.
   - Semilla oficial de 6 premios para Ford (`id` 101–106) con colores `#212650` y `#FFFFFF`.
   - Configuraciones independientes en `display_configs` (`ford_roulette`, `ford_qr`, `ford_slider`, `ford_combo`).
4. **Branding Dinámico por Stand:**
   - Detección en frontend vía ruta (`/formulario2`, `/pantalla2`) o parámetro.
   - Inyección de variables CSS y assets (`logo_ford.jpeg` vs `logotipo.png`).
5. **Panel Admin Unificado:**
   - Switcher en barra superior para administrar premios, pantallas y métricas de cada stand por separado.
   - Vista de leads con indicador de procedencia y filtros específicos.

### A2. Canal Correo (campaña Brevo, `/?view=mail`) — DESPLEGADO en producción el 21-oct-2026
Para clientes con cuotas pendientes (~500 emails). Juegan desde su celular o PC, sin pantalla de stand.
1. **Flujo:** formulario → `¡Juega y Gana!` → ruleta en el celular + botón ENGINE START → giro de 8 s hasta el sector que el servidor ya decidió → modal "¡Ganaste!" con código y cita → botón WhatsApp.
2. **Cita:** siempre el próximo sábado 10:00 am hora Ecuador (`api/src/services/appointment.js`; sábado desde las 10:00 pasa al siguiente). Va en la respuesta de `/api/spin` y en el mensaje de WhatsApp (mismo número de siempre; el bot atiende después).
3. **Canal aislado (`stand = mail`, `screen_id = MAIL_01`):** catálogo de premios y stock propios; sin cola, sin sockets, sin `TRIGGER_SPIN`, sin ping a pantallas (verificado: un giro de correo no emite nada a las salas de Autos/Ford). El móvil en modo mail no abre socket ni llama `screen/activity`.
4. **1 participación en este canal;** no cuenta lo jugado en los stands (y viceversa). Doble clic/pestañas simultáneas se serializan con `GET_LOCK` por celular; el stock de premios se bloquea con `FOR UPDATE`.
5. **Admin:** nueva pestaña `📧 CORREO` (premios, leads, métricas). Sin pestaña Pantallas para este canal. Se corrigió además un bug en Métricas (`byStand.autos/ford` eran objetos renderizados como texto).
6. **Quién puede jugar:** cualquiera con el enlace abierto (`/?view=mail`), o el enlace personalizado del correo de Brevo (ver puntos 11–13). Protecciones: rate limit 12 giros/min por IP; Turnstile NO está activo (ver sección 5).
7. **Diseño de marketing + íconos (22-oct-2026, DESPLEGADO en producción; migración 004 ejecutada por el usuario):** el canal usa la cabecera de campaña (`frontend-mobile/public/mail-hero.jpg`, recorte del arte de marketing), fondo tropical en CSS (`.mail-shell`), ruleta navy/lima con **íconos de viaje en lugar de texto**, panel de 3 pasos y botón "JUGAR Y GANAR". Los íconos se eligen por premio en Admin > CORREO (selector de 40 íconos; llaves en `api/src/config/prizeIcons.js`, mismas en `frontend-*/src/utils/prizeIcons.js`). Premio sin ícono = se dibuja su nombre en texto. Requiere `deploy/migrations/004_prize_icons.sql` (columna `prizes.icon`) ejecutada en RDS ANTES de desplegar el código. Pendiente que marketing entregue el fondo limpio (sin ruleta/UI) para reemplazar el degradado CSS.
8. **Ajuste "sin scroll" (22-oct-2026, DESPLEGADO en producción; backup previo `backups/pre-center-button/`, rollback `deploy/rollback_pre_mail.sh pre-center-button`):** en el paso de la ruleta el botón JUGAR Y GANAR va en el centro de la ruleta (rojo metálico, anillos pulsantes, ámbar "GIRANDO"); se quitó el botón inferior y el mensaje "Cuando estés listo…". La pantalla ocupa `100dvh` sin scroll: la ruleta mide el espacio libre (`ResizeObserver`) y la cabecera se recorta por arriba en pantallas bajas. Verificado sin scroll ni recortes en 390×844, 360×740, 375×667, 360×640, 412×915 y 320×568. Solo frontend móvil, sin migración.
9. **Pase del premio compacto (22-oct-2026, DESPLEGADO; backup previo `backups/pre-voucher/`, rollback `deploy/rollback_pre_mail.sh pre-voucher`):** en el canal Correo se quitó el trofeo y "¡Felicitaciones! ¡Ganaste!"; la cita dice "Tu cita para canjear el premio". La pantalla del premio no genera scroll (verificado en 390×844, 390×700, 360×740, 375×667, 360×640, 412×915 y 320×568; descripción del premio, nota inferior y aviso de "ya participaste" solo se muestran en pantallas altas).
10. **CORS restringido (22-oct-2026, DESPLEGADO):** API Gateway `MarketingVIP-Roulette-HttpApi-prod` (id `s2pr0nlyce`) ahora permite solo `https://autos.mvevip.com` (antes `*`; plantilla actualizada). El Lambda usa `ALLOWED_ORIGINS` en producción: orígenes ajenos no reciben cabeceras CORS y los POST/PUT/PATCH/DELETE con `Origin` no permitido (incluido `null`) devuelven 403; sin `Origin` (curl) pasan y las rutas sensibles siguen exigiendo PIN/rate limit. Nota: la variable `ALLOWED_ORIGINS` del Lambda aún incluye `https://mvevip.com` (el API Gateway no). Backup previo: `backups/pre-cors/` (api.zip + `apigw-cors-before.json`). Rollback API Gateway: `aws apigatewayv2 update-api --api-id s2pr0nlyce --cors-configuration 'AllowOrigins=*,AllowMethods=GET,POST,PUT,DELETE,OPTIONS,AllowHeaders=*'`; rollback código: `deploy/rollback_pre_mail.sh pre-cors` (restaura también el frontend de ese prefijo: usar solo si hace falta, el frontend no cambió).
11. **Enlace personalizado desde el correo de Brevo (22-oct-2026; histórico, ver punto 12 para el método vigente):** el botón del correo apunta a `https://autos.mvevip.com/?view=mail&correo={{ contact.EMAIL }}&t={{ contact.RULETA_TOKEN }}`. `GET /api/mail/lookup` (límite 10/min/IP, `no-store`) valida el token (HMAC-SHA256 del correo con `MAIL_TOKEN_SECRET`, 16 hex; sin clave la búsqueda queda deshabilitada) y consulta en solo lectura `mve.mve_clientes` (mismo RDS; el Lambda usa el usuario `admin`). Caminos: datos completos → directo a la ruleta; datos inválidos/incompletos → formulario prellenado con campos marcados; no encontrado o token falso → formulario (correo prellenado solo si el token es válido); ya participó → ve su premio y cita. El correo/token se quitan de la URL tras leerlos. El `+` sin codificar que inserta Brevo se restituye en servidor y cliente. Datos corregidos se guardan solo en la BD de la ruleta (`leads.crm_email`, `leads.crm_match` = direct/corrected; migración `005_leads_crm_link.sql`, opcional: sin ella el giro igual funciona). Informe para el CRM: `deploy/reports/mail_crm_corrections.sql`. Tokens para Brevo: `MAIL_TOKEN_SECRET=<clave> node deploy/tools/make_mail_tokens.js lista.csv salida.csv` (importar `salida.csv` en Brevo mapeando EMAIL y RULETA_TOKEN). Pendiente para desplegar: variable `MAIL_TOKEN_SECRET` en el Lambda, CSV de la lista, migración 005. Nota: el flujo directo no muestra widget Turnstile (hoy inactivo en producción). Pendiente de seguridad: el Lambda usa el usuario maestro `admin` de RDS (conviene un usuario de mínimo privilegio).
12. **Clave de campaña (22-oct-2026, DESPLEGADO en producción; backup previo `backups/pre-crm-lookup/`, rollback `deploy/rollback_pre_mail.sh pre-crm-lookup`; sustituye al token por correo como método principal):** el enlace de la campaña es `https://autos.mvevip.com/?view=mail&correo={{ contact.EMAIL }}&c=campana_cuotas`. La clave `campana_cuotas` está fija en `api/src/services/mailLookup.js` (vence 2026-12-31 23:59 hora Ecuador; se puede redefinir con la variable `MAIL_CAMPAIGN_KEYS="clave:AAAA-MM-DD,..."` sin tocar código). Cualquier persona de Brevo reutiliza la campaña sin generar nada por contacto; el token firmado (`&t=`) sigue aceptándose como alternativa. Privacidad: el celular NUNCA llega al navegador (solo enmascarado, p. ej. `09******67`, como ayuda); en el flujo directo el navegador no envía datos y el servidor lee nombre/celular/correo del CRM al girar (los datos que envíe un cliente en ese modo se ignoran); si los datos están incompletos, el cliente vuelve a escribir su celular. La clave es previsible y viaja en cada correo: **mejora de seguridad pendiente** (clave menos adivinable, rotación por campaña, o token por contacto). Atributo `RULETA_TOKEN` de Brevo ya no es necesario. Verificado en producción con la consulta real a `mve.mve_clientes` (el usuario `admin` del Lambda tiene acceso; migración 005 ejecutada por el usuario). Informe de correcciones para el CRM: `deploy/reports/mail_crm_corrections.sql`.
13. **Ajustes tras la primera prueba real (22-oct-2026, DESPLEGADO en producción; backup previo `backups/pre-wa-number/`, rollback `deploy/rollback_pre_mail.sh pre-wa-number`):** (a) quien ya jugó por el enlace del correo y corrigió sus datos, al volver a entrar ve directo su premio y su cita (sin formulario): el lookup y el giro buscan la participación previa por `leads.crm_email` y usan los datos GUARDADOS en el lead, no los del CRM; además no puede jugar dos veces cambiando celular/correo en el formulario. Limitación: si corrigió datos pero NO llegó a girar, esa corrección no se guarda (el lead se crea al girar) y volverá a ver el formulario. (b) En la cita del pase se agregaron los botones "Quito" y "Guayaquil" (Google Maps, pestaña nueva; URLs en `PrizeVoucher.jsx`). Pase del premio sin scroll en 7 tamaños (reglas por altura de pantalla).
14. **Número de WhatsApp (22-oct-2026, DESPLEGADO):** ahora es `593987933325` (antes `593993111114`) para TODOS los canales (correo y stands Autos/Ford: el valor es único). Se cambió en la variable `WHATSAPP_NUMBER` del Lambda (viva), en `deploy/aws-infrastructure.yaml` (para que un futuro `deploy_aws.ps1` no lo revierta), en el valor por defecto de `api/src/config/env.js` y en `.env.example`. Rollback del número: volver a poner `593993111114` en la variable del Lambda (combinando con las demás variables).
15. **Leads del admin por canal (22-oct-2026, en repo, PENDIENTE de despliegue):** el admin mostraba los leads de todos los canales mezclados aunque se eligiera CORREO arriba. Causa: la pestaña Leads usaba su propio filtro interno (arrancaba en "Todos") y el selector superior no lo controlaba; además se pedían todos los leads de golpe con tope de 500, así que con muchos leads de la feria los más antiguos de un canal podían desaparecer. Solución: `GET /api/leads` ya filtraba bien por `?stand=`; ahora el admin pide solo el canal elegido, el selector superior fija el filtro de Leads (los chips Todos/Autos/Ford/Correo siguen disponibles), los contadores de los chips son totales reales (`totals` en la respuesta del API) y se muestra "Mostrando X de Y" si hay más filas que el tope (parámetro opcional `limit`, por defecto 500, máx. 2000). Los datos en BD estaban bien. Solo cambian `leadsController.js` y `frontend-admin/src/App.jsx`; sin migración.
16. **Enlace para Brevo:** `https://autos.mvevip.com/?view=mail&utm_source=brevo&utm_campaign=cuotas`.

### B. Corrección de Algoritmo de Premios y Ángulo
- Columna `active` asegurada en consultas SQL.
- Selección ponderada real sin favorecer el primer premio.
- Fórmula de rotación incremental `deltaAngle = (targetModAngle - currentModAngle) % 360` eliminando desvíos acumulativos.

### C. Video Standby / Attract (100% Pantalla y Ciclo de 20s)
- Iframe de YouTube cargado en memoria, detección de aspecto vía oEmbed, escalado al 100% viewport.
- Al culminar, rebobina y se pausa en memoria, mostrando la ruleta 20 segundos antes de reiniciar sin recarga.
- Controles discretos tipo icono y visibilidad de logo conmutable desde Admin.

### D. Asignación Estricta de Asesores
- Catálogo oficial de 28 asesores (`asesores.csv`).
- Columna `assigned_to` en tabla `leads`.
- Componente `StrictAdvisorSelect.jsx` buscable con validación en tiempo real.

---

## 3. Estado Actual (22 de Octubre de 2026)

**Todo lo descrito en la sección 2 está DESPLEGADO en producción** (`https://autos.mvevip.com`) y probado por el usuario con envíos reales de prueba: multi-stand Ford, canal Correo con ruleta de íconos, enlace personalizado de Brevo con consulta al CRM, CORS restringido, número de WhatsApp nuevo (`593987933325`) y retiro del PIN comodín `ADMIN`. La rama `claude/upbeat-faraday-gtjq65` coincide con producción (último código desplegado: commit `55c9f56`; después solo documentación).

### Migraciones de base de datos (las ejecuta SIEMPRE el usuario en RDS; la IA nunca toca la BD)
| Migración | Contenido | Estado |
|---|---|---|
| `002_stand_support.sql` | Multi-stand (columna `stand`, premios Ford, configs) | Aplicada |
| `003_mail_stand.sql` | Premios del canal `mail` (copia del catálogo de Autos) | Aplicada (21-oct) |
| `004_prize_icons.sql` | Columna `prizes.icon` + íconos sugeridos | Aplicada (22-oct) |
| `005_leads_crm_link.sql` | `leads.crm_email`, `leads.crm_match` + índice | Aplicada (22-oct) |

### Infraestructura (datos de referencia)
- Cuenta AWS `021891594659`, región `us-west-2`; el entorno de la IA usa credenciales inyectadas (usuario IAM `admin-cli`); AWS CLI instalada con `pip install awscli`.
- Stack CloudFormation `MarketingVIP-Roulette-Stack` (NO se ejecuta `cloudformation deploy` en los despliegues normales: exige secretos que no están en el repo y reescribiría la config del Lambda).
- CloudFront `E1ZMRVAW1NYIDC` (`/api/*` con política `CachingDisabled`; sin páginas de error personalizadas; **sin WAF**). API Gateway HTTP API `s2pr0nlyce`. Lambda `MarketingVIP-Roulette-Api-prod` (nodejs20.x, 512 MB, 30 s, fuera de VPC, usa el usuario maestro `admin` de RDS).
- Buckets: frontends `marketingvip-autos-frontend-021891594659-us-west-2`; artefactos y backups `mvevip-recursos/marketingvip-roulette/`.
- Variables del Lambda (solo nombres): `ADMIN_PIN, ALLOWED_ORIGINS, COMPANY_NAME, COMPANY_SLOGAN, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, NODE_ENV, TURNSTILE_SECRET_KEY (vacía), WHATSAPP_NUMBER`. Para cambiar una variable: leer la config actual, modificar solo esa clave y reenviar el conjunto completo (archivo temporal con permisos 600 que se borra; nunca imprimir secretos) y verificar que las demás no cambiaron.
- La cuenta tiene otras 11 distribuciones CloudFront; 4 (`cotiza`, `trip`, `quala`, `tarjetas`) ya usan un Web ACL propio "CreatedByCloudFront-…" con 3 reglas gestionadas de AWS (IP Reputation, Common, KnownBadInputs).

### Backups y rollback (`s3://mvevip-recursos/marketingvip-roulette/backups/<nombre>/`)
`pre-ford`, `pre-mail`, `pre-icons`, `pre-center-button`, `pre-voucher`, `pre-cors` (incluye `apigw-cors-before.json`), `pre-crm-lookup`, `pre-wa-number`.
Rollback de código y frontend: `deploy/rollback_pre_mail.sh <nombre>` (por defecto `pre-mail`, que quita también el canal Correo; usar el backup más reciente que corresponda). **No revierte** la BD, la config CORS del API Gateway ni las variables del Lambda (cada una tiene su propio rollback anotado en la sección 2: CORS en A2.10, WhatsApp en A2.14).

### Procedimiento de despliegue estándar (solo con orden explícita del usuario)
1. Backup: copiar `api.zip` actual y sincronizar el bucket de frontends a `backups/<nombre>/` + `INFO.txt`; comparar nº de objetos y tamaño.
2. Backend: copiar `src`, `package*.json` a una carpeta limpia, `npm ci --omit=dev`, `zip -r api.zip src node_modules package.json`; probar la carga con `timeout` (`lambda.js` levanta el servidor si el puerto está libre y cuelga la prueba sin timeout); subir a `mvevip-recursos/marketingvip-roulette/api.zip`, `aws lambda update-function-code` y `aws lambda wait function-updated`.
3. Frontends: compilar con `VITE_WS_URL= VITE_API_URL= VITE_MOBILE_URL= VITE_SCREEN_URL= VITE_ADMIN_URL=` vacías y `VITE_BASE_PATH=/pantalla/` o `/admin/` (móvil en `/`). Sin `VITE_TURNSTILE_SITE_KEY` (hoy así está producción).
4. Subida: `aws s3 sync dist s3://<bucket>/ --delete` primero con `--dryrun`; el móvil (raíz) con `--exclude "pantalla/*" --exclude "admin/*"` para no borrar las otras apps.
5. `aws cloudfront create-invalidation --paths "/*"` y esperar con `aws cloudfront wait invalidation-completed`.
6. Verificar: rutas `/`, `/?view=mail`, `/formulario2`, `/pantalla`, `/pantalla2`, `/admin/`, `/api/prizes?stand=…`; PIN `ADMIN` = 401; pruebas con navegador (Playwright + Chromium preinstalado) SIN hacer giros reales (crean leads y descuentan stock). Los giros de verificación los hace el usuario con un usuario de prueba del admin.
7. Registrar en esta memoria y hacer commit/push.

### Pruebas locales (referencia)
MariaDB local con `deploy/init_db.sql`; esquema simulado del CRM en `deploy/tools/local_mve_schema.sql`; API con `NODE_ENV=development DB_HOST=127.0.0.1 MAIL_TOKEN_SECRET=<prueba>`; frontends con `vite preview` (puertos 5503 móvil, 5504 admin). Casos probados: flujo directo, datos inválidos, apellido NULL, correo con `+`, no encontrado, clave incorrecta/vencida, ya participó, doble participación cambiando datos, scroll en 7 tamaños de celular. Notas operativas: `sleep` largo en primer plano está bloqueado; no usar `pkill -f` con un patrón que aparezca en la propia línea de comandos (mata el shell).

## 4. Decisiones del usuario (vigentes)
- Todo desarrollo local; despliegue solo con orden explícita ("despliega"); la IA no modifica la BD (entrega scripts SQL) ni escribe en el CRM.
- Enlace de la campaña de Brevo: `https://autos.mvevip.com/?view=mail&correo={{ contact.EMAIL }}&c=campana_cuotas` (clave fija hasta fin de 2026; mejora de seguridad pospuesta). Mismo enlace en el botón "DESCUBRIR MI PREMIO" y en la imagen "QUIERO GANAR AHORA".
- Datos corregidos por el cliente: solo se guardan en la BD de la ruleta (no en `mve.mve_clientes`).
- Quien ya participó ve directo su premio y su cita. Cita siempre el próximo sábado 10:00 am (hora Ecuador). Un solo número de WhatsApp para todos los canales.
- Premios del canal Correo con catálogo y stock propios (administrables en Admin > CORREO).

## 5. Hallazgos de seguridad y estado
| Tema | Estado |
|---|---|
| PIN del admin | **Débil**: 7 caracteres, `VIP2026` escrito en texto plano en el JS público del admin (verificado), valor por defecto `|| 'VIP2026'` en el frontend, y comprobación similar en el modal de admin de `frontend-screen`. El límite de intentos es en memoria por contenedor (no compartido). |
| Turnstile | **Inactivo**: `TURNSTILE_SECRET_KEY` vacía y bundle sin site key. Además `turnstileMiddleware.js` deja pasar en 4 casos (sin clave, token vacío o `BYPASS_*`, `invalid-input-response`, error de red): hay que reescribirlo para que sea efectivo. El script de Turnstile ya se carga desde `index.html`. |
| WAF | Sin Web ACL en `autos`. Plan analizado (ver pendientes). |
| CORS | Restringido a `https://autos.mvevip.com` (API Gateway + guard de `Origin` en el Lambda). |
| Clave de campaña | `campana_cuotas` es previsible y viaja en cada correo. El celular nunca llega al navegador (solo enmascarado). |
| RDS / usuario de BD | RDS accesible públicamente y Lambda con usuario maestro `admin`: pendiente de arquitectura (usuario de mínimo privilegio; VPC). |

## 6. Pendientes / Próximos pasos (priorizados)
1. **PIN del admin + Turnstile (aprobados para empezar, plan detallado, sin implementar):**
   - *PIN:* clave aleatoria de 12 caracteres (se entrega una vez en el chat) en `ADMIN_PIN`; `POST /api/admin/login` valida en servidor y devuelve token de sesión firmado de 12 h (nueva variable `ADMIN_SESSION_SECRET`); el servidor acepta solo el token (se elimina el PIN en cabeceras); quitar `VIP2026` y el valor por defecto de `frontend-admin` y `frontend-screen/AdminModal`; login limitado a 5 intentos/10 min por IP + pausa de 1 s en fallos. Los asesores deberán iniciar sesión con la clave nueva. Backup previo y rollback.
   - *Turnstile:* el usuario crea el widget gratis en Cloudflare (dominio `autos.mvevip.com`, modo Managed) y entrega site key y secret key. Servidor estricto (exigir token válido y hostname correcto, rechazar `BYPASS_*`; si Cloudflare no responde, permitir y registrar), variable `TURNSTILE_MODE` (`monitor` = solo registra, `enforce` = bloquea; vaciar la clave lo apaga). Frontend: widget también en la pantalla de la ruleta del flujo directo, con refresco automático (el token dura 5 min y es de un solo uso); site key incrustada al compilar. Desplegar primero en `monitor` y pasar a `enforce` tras revisar registros. Pruebas con las claves de prueba de Cloudflare. Riesgo a vigilar: navegadores internos de WhatsApp/Instagram.
2. **WAF en CloudFront (decisión pendiente del usuario):** Web ACL propio para `autos` en us-east-1 con reglas gestionadas (IP Reputation, Known Bad Inputs, Common Rule Set con `SizeRestrictions_BODY` en Count o excepción para la subida de imágenes del slider en `/api/admin/displays/slider-images`) y límites por IP solo en `POST /api/spin`, `/api/admin/*` (+canje/leads) y `/api/mail/lookup`; todo en modo Count primero, pasar a bloqueo tras 2–3 días de datos incluida la campaña. Costo estimado ~US$11/mes + peticiones (~400 mil en 14 días). No aplicar límites generales por IP (pantallas de stand consultan cada segundo desde una IP compartida). Añadir `WebACLId` a la plantilla de CloudFormation (si no, el próximo `deploy_aws.ps1` lo desasocia). Evitar logs completos (contienen PIN y correos) o redactarlos. No cambiar infraestructura durante el envío de correos.
3. **ChatRace:** bloque "FLUJO 0 — Premio de la ruleta" listo en `docs/chatrace_flujo0_ruleta.md` para pegar antes de FLUJO 1. Pendiente del usuario: pegarlo, actualizar la FECHA ACTUAL del prompt (dice 01-sep-2026), verificar campos/formatos de `agenda_citas_paquetes_vuelos` y que el asesor reciba premio y código; probar con premio de visado y de "Segundo destino". Opcional (a pedido): marca fija en el mensaje de WhatsApp y elegir ciudad en la página del premio.
4. **Premios del canal Correo:** "Proceso de Visado EEUU GRATIS" tiene stock 0 y peso 1 pero se dibuja en la ruleta; ajustar o desactivar en Admin > CORREO. Revisar nombres largos (se leen pequeños) — ahora la ruleta usa íconos.
5. **Fondo limpio de marketing** (sin ruleta ni botones) para reemplazar el degradado CSS; hoy solo se usa un recorte de la cabecera del arte (`mail-hero.jpg`).
6. **Limitación conocida:** si un cliente corrige sus datos pero no llega a girar, la corrección no se guarda (el lead se crea al girar). Mejora posible: guardar al pulsar "Continuar" (tabla nueva, la crearía el usuario).
7. **Informe de correcciones para el CRM:** `deploy/reports/mail_crm_corrections.sql` (requiere 005).
8. **Integración Brevo API v3:** sin código aún (correo transaccional de confirmación con premio/código/cita, atributos de contacto para segmentar recordatorios). Faltan `BREVO_API_KEY`, templates y mapeo de `params`.
9. **Sincronización dual de repos Git:** `origin` apunta solo a `mvevip/mvevip-ruleta`; falta push al repo personal `caloloc2/mvevip_ruleta`.
10. **Higiene:** `deploy_aws.sh` desactualizado (us-east-1, sin admin ni Ford); `/api/health` devuelve 404 aunque el README lo menciona; README documenta el PIN y solo el stand Autos; variable `ALLOWED_ORIGINS` del Lambda aún incluye `https://mvevip.com`; variable `MAIL_TOKEN_SECRET` no configurada (el token por correo está deshabilitado, solo funciona la clave de campaña); `deploy/rollback_pre_ford.ps1` restauraría una versión sin Ford.
