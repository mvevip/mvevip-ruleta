# MEMORIA DEL PROYECTO: MARKETING VIP - RULETA DE FERIA
**Última actualización:** 16 de Octubre de 2026  
**Dominio de Producción:** [https://autos.mvevip.com](https://autos.mvevip.com)  
**Infraestructura:** AWS 100% Serverless (CloudFront `d16kuftm1n5423.cloudfront.net` + S3 + API Gateway + Lambda + RDS MySQL)

---

## ⚠️ PROTOCOLO ESTRICTO DE DESARROLLO Y AISLAMIENTO (REGLA DE ORO)

> [!CAUTION]
> **TODO DESARROLLO ES 100% LOCAL POR DEFECTO.**  
> 1. **Prohibido tocar producción sin orden explícita:** NUNCA ejecutar scripts de despliegue (`deploy_aws.ps1`, `deploy_aws.sh`, comandos `aws s3 sync`, `aws lambda update-function-code`, o similares) a menos que el usuario lo solicite de manera directa y unívoca (e.g. *"listo despliega"*).
> 2. **Aislamiento absoluto de Base de Datos:**
>    - En entorno local, la API se conecta única y exclusivamente al contenedor MySQL local de Docker (`marketingvip_db` en el puerto `5501`).
>    - Las credenciales de AWS RDS de producción NUNCA se conectan desde el código local.
> 3. **Aislamiento de WebSockets y Tráfico de Red:**
>    - La pantalla y el móvil local se comunican en salas separadas (`STAND_LOCAL` / `local`) y rechazan orígenes de producción `autos.mvevip.com`.
>    - Jugar o probar en local NUNCA debe emitir eventos hacia las pantallas ni formularios de producción.
> 4. **Insignias Visuales de Entorno:**
>    - La pantalla local y el panel admin muestran siempre distintivos visibles (`[ENTORNO LOCAL 💻]`, `[DOCKER DB LOCAL]`) para confirmar en todo momento que se opera en el ambiente aislado.

---

## 1. Arquitectura y Enrutamiento en Producción

| URL | Componente | Descripción |
| :--- | :--- | :--- |
| `https://autos.mvevip.com` | `frontend-mobile` | PWA para participantes: registro de leads en 2 pasos (datos + botón START ENGINE), selección de destino, Cloudflare Turnstile. |
| `https://autos.mvevip.com/pantalla` | `frontend-screen` | Pantalla principal del stand: ruleta rim motorsport, video corporativo de standby al 100% horizontal/vertical con alternancia automática de 20s hacia la ruleta sin recarga. |
| `https://autos.mvevip.com/pantalla?view=qr` | `frontend-screen` | Cartelería: Solo QR Gigante "Escanea y Gana" con detección de orientación (horizontal completo / vertical tótem maximizado). |
| `https://autos.mvevip.com/pantalla?view=slider` | `frontend-screen` | Cartelería: Slider continuo de banners publicitarios en loop infinito con tiempos configurables. |
| `https://autos.mvevip.com/pantalla?view=combo` | `frontend-screen` | Cartelería: Pantalla híbrida (Slider arriba, franja central con 3 pasos dinámicos, y QR al porcentaje calibrado abajo sin solapamientos). |
| `https://autos.mvevip.com/admin` | `frontend-admin` | PWA para operadores y asesores: gestión de premios, pesos, stock, usuarios demo, control remoto de pantallas, slider de imágenes, cambio de video de YouTube y visibilidad/tamaño de logotipo corporativo. |
| `https://autos.mvevip.com/api/*` | `api` (AWS Lambda) | Endpoints REST protegidos con PIN, rate limiter y conexión resiliente a RDS MySQL. |

---

## 2. Historial de Implementaciones Recientes

### A. Corrección del Algoritmo de Premios ("Bug de Visado")
1. **Inclusión de columna `active`:** En `rouletteController.js`, se corrigió la consulta SQL de premios disponibles (`SELECT id, name, ..., active FROM prizes WHERE active = 1`) para evitar campos `undefined`.
2. **Selección Ponderada Confiable:** En `rouletteLogic.js`, se endureció la función `selectWeightedPrize`. Si un premio tiene probabilidad configurada, compite con su peso real en la ruleta, erradicando el problema donde siempre caía el primer premio ("Visado").

### B. Corrección de Desfase de Ángulo en Ruleta
- En `frontend-screen/src/App.jsx`, se corrigió la fórmula de acumulación de giro:
  `deltaAngle = (targetModAngle - currentModAngle) % 360`
- Con esto, giros consecutivos de la ruleta mantienen alineación física al 100% con la aguja indicadora superior, sin derivas acumulativas.

### C. Video Standby / Attract en Pantalla Principal (100% Pantalla y Alternancia 20s)
1. **Ajuste al 100% Horizontal y Vertical sin Recortes:**
   - Detección dinámica de la relación de aspecto nativa del video mediante `oEmbed` de YouTube y cálculo de transformación `scale(scaleX, scaleY)` ajustado a `window.innerWidth` × `window.innerHeight`.
   - Eliminación del zoom `1.4x` y de sombras oscuras superiores para mostrar el 100% del cuadro del video sin cortes.
2. **Alternancia Automática Video ↔ Ruleta (20 Segundos) con Carga Única:**
   - El `<iframe>` se carga una sola vez al entrar a la página (`isConfigLoaded`) y permanece en memoria.
   - Al terminar el video (`playerState === 0`), se rebobina a `0s` (`seekTo(0, true)`) y se pausa (`pauseVideo`) en memoria, mostrando la **ruleta durante 20 segundos (`ROULETTE_PAUSE_MS = 20000`)** antes de reanudar el video desde el inicio sin volver a cargarlo.
3. **Controles Superiores Derechos de Solo Icono y Tag de Stand Discreto:**
   - En la esquina superior derecha (`top-4 right-4`) solo se muestran 2 botones circulares de icono (`Audio` y `Cerrar`) con alto contraste (`bg-zinc-950/90`, `strokeWidth={2.5}`) sin texto que tape el video.
   - El identificador `Stand #...` se ubica en la esquina inferior izquierda (`bottom-3 left-3`) en formato pequeño y discreto (`10px`).
4. **Logotipo Oculto por Defecto con Control Mostrar/Ocultar en Admin:**
   - Columna `video_logo_visible BOOLEAN NOT NULL DEFAULT FALSE` en `display_configs`.
   - El logotipo permanece escondido por defecto en el video y puede mostrarse u ocultarse en tiempo real desde `/admin` (*Pantallas → Ruleta Principal*).
5. **Código QR en Alta Resolución para Impresión:**
   - Exportado en `QR_Ruleta_MarketingVIP_AltaResolucion.png` (`2400 × 2400 px`, `300 DPI`, nivel `H`).

### D. Flujo Móvil en 2 Pasos (Registro + Lanzamiento)
1. **Paso 1 (Registro de Lead):** Formulario ergonómico con validación de teléfono (10 dígitos Ecuador), correo y selección de vehículo/destino, rematado con botón prominente **`¡JUGAR Y GANAR!`**.
2. **Paso 2 (Lanzamiento):** Pantalla limpia que enfoca la atención del usuario hacia el stand: **`¡MIRA LA PANTALLA GIGANTE! 👀`** con el botón centrado **`START ENGINE`**. Al pulsarlo, activa el giro en la pantalla física del stand.

### E. Ensanchamiento Horizontal de la Ruleta y Tipografía Adaptativa
- Ensanchamiento elíptico configurable desde `/admin` (`wheel_scale_x`) con proyección `scaleX` y contra-escala en el clacker superior.
- Ajuste de tipografía de premios (`wheel_font_size`) con cálculo automático para evitar solapamientos con las divisiones del rin.

### F. Gestión de Usuarios de Prueba (Modo Demo Stand)
- Módulo en `/admin` para registrar asesores con teléfono/email demo.
- Permite giros ilimitados sin bloqueo `already_played`, sin restar stock de premios reales y sin contaminar las estadísticas de leads oficiales.

---

## 3. Credenciales y Configuración de Despliegue

- **Perfil AWS:** `marketingvip` (Región `us-west-2`)
- **Bucket Frontend:** `marketingvip-autos-frontend-021891594659-us-west-2`
- **ID CloudFront:** `E1ZMRVAW1NYIDC`
- **PIN Administrativo:** `VIP2026`
- **Script de Despliegue Oficial:** `powershell -ExecutionPolicy Bypass -File deploy\deploy_aws.ps1`
- **Repositorio Git:** `https://github.com/caloloc2/mvevip_ruleta.git` (Rama `main`)

---

## 4. Estado Actual del Sistema (Cierre de Sesión)

- **Producción AWS:** 100% desplegada, verificada y activa en `https://autos.mvevip.com`.
- **Git:** Todos los cambios confirmados en commit `1c26892` y sincronizados en GitHub (`main`).
- **Entorno Local Docker:** Operativo e independiente en puertos:
  - Pantalla: `http://localhost:5502`
  - Móvil: `http://localhost:5503`
  - Admin: `http://localhost:5504`
  - API: `http://localhost:5500`
  - DB: `localhost:5501`
