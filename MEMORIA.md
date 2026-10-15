# MEMORIA DEL PROYECTO: MARKETING VIP - RULETA DE FERIA
**Última actualización:** 15 de Octubre de 2026  
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
| `https://autos.mvevip.com/pantalla` | `frontend-screen` | Pantalla principal del stand: ruleta rim motorsport, video corporativo de standby con logo centrado y QR inferior derecho, bucle instantáneo sin recarga. |
| `https://autos.mvevip.com/pantalla?view=qr` | `frontend-screen` | Cartelería: Solo QR Gigante "Escanea y Gana" con detección de orientación (horizontal completo / vertical tótem maximizado). |
| `https://autos.mvevip.com/pantalla?view=slider` | `frontend-screen` | Cartelería: Slider continuo de banners publicitarios en loop infinito con tiempos configurables. |
| `https://autos.mvevip.com/pantalla?view=combo` | `frontend-screen` | Cartelería: Pantalla híbrida (Slider arriba, franja central con 3 pasos dinámicos, y QR al porcentaje calibrado abajo sin solapamientos). |
| `https://autos.mvevip.com/admin` | `frontend-admin` | PWA para operadores y asesores: gestión de premios, pesos, stock, usuarios demo, control remoto de pantallas, slider de imágenes, cambio de video de YouTube y tamaño de logotipo corporativo. |
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

### C. Video Standby / Attract en Pantalla Principal
1. **Logotipo Corporativo Centrado:**
   - Ubicado fijamente en la parte superior horizontalmente centrado (`top-6 left-1/2 -translate-x-1/2`).
   - Escala regulable desde el panel Admin (`video_logo_scale` de 50% a 250%) con guardado en base de datos.
   - Controles de la esquina superior derecha (*Audio*, *Stand #*, *Cerrar*) permanecen anclados a `top-6 right-6` sin desfasarse al agrandar el logo.
2. **Código QR Fijo en Esquina Inferior Derecha:**
   - Restaurado a su posición original limpia (`bottom-8 right-8`), sin barras de arrastre ni interferencias. Clics en el QR no cierran el video.
3. **Bucle Instantáneo sin Buffering / Recarga (Zero Delay):**
   - Eliminados parámetros `&loop=1&playlist=...` de YouTube que forzaban la recarga del reproductor y mostraban la rueda de carga por 5 segundos.
   - Uso de API postMessage de YouTube (`enablejsapi=1`): cuando el video finaliza (`playerState === 0`), se ejecuta instantáneamente `seekTo(0, true)` y `playVideo()`. El reinicio es inmediato y sin pantalla de espera.
   - Al ocultarse por giro o juego, el video solo se pausa (`pauseVideo`); al volver, se reanuda (`playVideo`) sin recargar el iframe.

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
