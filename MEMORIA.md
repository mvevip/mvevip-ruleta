# MEMORIA DEL PROYECTO: MARKETING VIP - RULETA DE FERIA
**Última actualización:** 21 de Octubre de 2026  
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
6. **Quién puede jugar:** por ahora cualquiera con el enlace (decisión del usuario); límites: Turnstile (verificar si está activo en prod), rate limit 12 giros/min por IP.
7. **Diseño de marketing + íconos (22-oct-2026, en repo, PENDIENTE de despliegue):** el canal usa la cabecera de campaña (`frontend-mobile/public/mail-hero.jpg`, recorte del arte de marketing), fondo tropical en CSS (`.mail-shell`), ruleta navy/lima con **íconos de viaje en lugar de texto**, panel de 3 pasos y botón "JUGAR Y GANAR". Los íconos se eligen por premio en Admin > CORREO (selector de 40 íconos; llaves en `api/src/config/prizeIcons.js`, mismas en `frontend-*/src/utils/prizeIcons.js`). Premio sin ícono = se dibuja su nombre en texto. Requiere `deploy/migrations/004_prize_icons.sql` (columna `prizes.icon`) ejecutada en RDS ANTES de desplegar el código. Pendiente que marketing entregue el fondo limpio (sin ruleta/UI) para reemplazar el degradado CSS.
8. **Enlace para Brevo:** `https://autos.mvevip.com/?view=mail&utm_source=brevo&utm_campaign=cuotas`.

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

## 3. Estado Actual y Tareas Pendientes

### ✅ Estado Actual (21 de Octubre de 2026)
- **Local (Docker):** Multi-Stand (Autos + Ford) operativo en `localhost:5500–5504`.
- **Producción (verificado 21-oct con GET públicos a `autos.mvevip.com`):** el multi-stand Ford **ya está desplegado y en uso**.
  - `/formulario2`, `/pantalla2` y `/admin/` responden 200; los bundles contienen `formulario2`, `STAND_02` y "Stand 2: FORD".
  - `/api/prizes?stand=ford` devuelve premios Ford propios (ya editados desde el admin, distintos de la semilla 101–106 de la migración) y `/api/displays/config?stand=ford` tiene filas `ford_*` actualizadas el 17-oct. Es decir, la migración `002_stand_support.sql` ya se aplicó en RDS.
  - El frontend publicado tiene fecha 17-oct, anterior al commit `178940d` (21-oct). No se pudo confirmar si el Lambda corresponde exactamente a ese commit; confirmar con quien desplegó.
- **Rollback disponible:** `deploy/rollback_pre_ford.ps1` (restaura desde `s3://mvevip-recursos/marketingvip-roulette/backups/pre-ford`). Nota: el backup es de la versión single-stand; usarlo ahora retiraría Ford de producción.
- **Seguridad:** se eliminó el PIN comodín `ADMIN` (API y frontends). El PIN válido es solo el configurado en `ADMIN_PIN` (por defecto `VIP2026`). Requiere despliegue para surtir efecto en producción.

### ⏳ Pendientes / Próximos Pasos
0. **Canal Correo desplegado (21-oct-2026, 23:12 UTC):**
   - Migración `003_mail_stand.sql` ejecutada por el usuario en RDS (6 premios `mail`, ids 107–112, copiados de Autos).
   - Lambda `MarketingVIP-Roulette-Api-prod` actualizado (sha `qe+1hwnb…`), frontends sincronizados a S3 y CloudFront invalidado. NO se ejecutó `cloudformation deploy` (sin cambios de infraestructura).
   - **Incluye el retiro del PIN comodín `ADMIN`** (verificado: 401 en producción).
   - Backup previo: `s3://mvevip-recursos/marketingvip-roulette/backups/pre-mail/` (api.zip + frontend + INFO.txt). Rollback: `deploy/rollback_pre_mail.sh` (no toca la BD).
   - **Antes de enviar la campaña:** revisar premios en Admin > CORREO ("Proceso de Visado EEUU GRATIS" tiene stock 0 y se dibuja igual en la ruleta; ajustar o desactivar), hacer una prueba real con un usuario de prueba, y enviar en tandas.
   - **Hallazgo:** Cloudflare Turnstile NO está activo en producción (el bundle se compiló sin `VITE_TURNSTILE_SITE_KEY`; el formulario envía `BYPASS_DEV`). La protección anti-bot real es solo el rate limit.
1. ~~Confirmar versión desplegada / desplegar PIN ADMIN~~ — resuelto con el despliegue del 21-oct (Lambda y frontends ahora salen de la rama actual).
3. **Sincronización Dual de Repositorios Git:** `origin` hoy apunta solo a `mvevip/mvevip-ruleta`; falta push simultáneo a `caloloc2/mvevip_ruleta`.
4. **Integración Brevo (API v3):** sin código aún. Faltan `BREVO_API_KEY`, `templateId` (Autos y Ford), mapeo de `params` y correo de prueba.
5. **Hardening restante:**
   - CORS abierto (`AllowOrigins: ['*']` en `deploy/aws-infrastructure.yaml`).
   - Sin AWS WAF en CloudFront.
   - Verificar si RDS sigue con acceso público / Security Groups.
   - PIN compartido: migrar a JWT + hash o Secrets Manager.
6. **Higiene:** `deploy_aws.sh` desactualizado (us-east-1, sin admin ni Ford); `/api/health` devuelve 404; README describe solo el stand Autos; solo existe la migración 002 en `deploy/migrations/`.
