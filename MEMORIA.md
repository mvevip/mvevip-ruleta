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
1. **Confirmar versión desplegada** del Lambda/frontends vs `178940d` y, si difiere, desplegar (solo con orden explícita).
2. **Desplegar el retiro del PIN `ADMIN`** (cambio en `authMiddleware.js`, `frontend-admin/src/App.jsx`, `frontend-screen/src/components/AdminModal.jsx`).
3. **Sincronización Dual de Repositorios Git:** `origin` hoy apunta solo a `mvevip/mvevip-ruleta`; falta push simultáneo a `caloloc2/mvevip_ruleta`.
4. **Integración Brevo (API v3):** sin código aún. Faltan `BREVO_API_KEY`, `templateId` (Autos y Ford), mapeo de `params` y correo de prueba.
5. **Hardening restante:**
   - CORS abierto (`AllowOrigins: ['*']` en `deploy/aws-infrastructure.yaml`).
   - Sin AWS WAF en CloudFront.
   - Verificar si RDS sigue con acceso público / Security Groups.
   - PIN compartido: migrar a JWT + hash o Secrets Manager.
6. **Higiene:** `deploy_aws.sh` desactualizado (us-east-1, sin admin ni Ford); `/api/health` devuelve 404; README describe solo el stand Autos; solo existe la migración 002 en `deploy/migrations/`.
