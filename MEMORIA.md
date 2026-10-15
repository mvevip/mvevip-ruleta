# MEMORIA DEL PROYECTO: MARKETING VIP - RULETA DE FERIA
**Última actualización:** 13 de Octubre de 2026  
**Dominio de Producción:** [https://autos.mvevip.com](https://autos.mvevip.com)  
**Infraestructura:** AWS 100% Serverless (CloudFront `d16kuftm1n5423.cloudfront.net` + S3 + API Gateway + Lambda + RDS MySQL)

---

## 1. Arquitectura y Enrutamiento en Producción

| URL | Componente | Descripción |
| :--- | :--- | :--- |
| `https://autos.mvevip.com` | `frontend-mobile` | PWA para participantes: registro de leads, selección de destino soñado, verificación Cloudflare Turnstile y botón ENGINE START. |
| `https://autos.mvevip.com/pantalla` | `frontend-screen` | Pantalla principal del stand: ruleta rim motorsport, telemetría, video corporativo de standby, QR arrastrable con memoria. |
| `https://autos.mvevip.com/pantalla?view=qr` | `frontend-screen` | Cartelería: Solo QR Gigante "Escanea y Gana" con detección de orientación (horizontal completo / vertical tótem maximizado). |
| `https://autos.mvevip.com/pantalla?view=slider` | `frontend-screen` | Cartelería: Slider continuo de banners publicitarios en loop infinito con tiempos configurables. |
| `https://autos.mvevip.com/pantalla?view=combo` | `frontend-screen` | Cartelería: Pantalla híbrida (Slider arriba, franja central con 3 pasos dinámicos, y QR al porcentaje calibrado abajo sin solapamientos). |
| `https://autos.mvevip.com/admin` | `frontend-admin` | PWA para operadores y asesores: gestión de premios, pesos, stock, canjes con PIN, control remoto de pantallas, slider de imágenes, cambio de video de YouTube y calibración de tamaño del QR. |
| `https://autos.mvevip.com/api/*` | `api` (AWS Lambda) | Endpoints REST protegidos con PIN, rate limiter y conexión resiliente a RDS MySQL. |

---

## 2. Historial de Implementaciones Recientes

### A. Cartelería Digital y Control Remoto de Pantallas
1. **Tres Nuevas Pantallas de Exhibición:**
   - Implementadas en `frontend-screen`: `/pantalla?view=qr`, `/pantalla?view=slider`, `/pantalla?view=combo`.
   - Compatibilidad completa por query param (`?view=...`) y subruta (`/pantalla/...`).
2. **Sincronización Remota en Tiempo Real:**
   - Tabla `system_sync` y endpoint público `/api/displays/sync` con polling ligero (3.5s).
   - Botón *"🔄 RECARGAR PANTALLAS"* en `/admin` que emite comando de sincronización inmediata hacia todas las pantallas físicas.
3. **Gestor de Banners en Admin:**
   - Subida de imágenes con compresión WebP automática en cliente (Canvas) Full HD a 150-300 KB.
   - Activación, desactivación, reordenamiento y duración individual por slide.

### B. Código QR Arrastrable con Persistencia
- Disponible en la ruleta principal y sobre el video corporativo de atracción (`QRCodeCard.jsx` y `VideoAttractOverlay.jsx`).
- Mover libremente con mouse/touch por si una columna o vehículo tapa el código en el stand.
- Guardado en `localStorage` (`mvevip_screen_qr_pos` y `mvevip_video_qr_pos`) con botón de reset para restaurar la posición por defecto.

### C. Video de YouTube Dinámico
- Configurable directamente desde `/admin` (Pestaña Pantallas -> Ruleta Principal).
- Acepta URLs completas (`https://youtu.be/...`, `https://www.youtube.com/watch?v=...`) o ID de 11 caracteres.
- Persistido en `display_configs.video_url` y transmitido en tiempo real al iframe de standby.

### D. Rediseño Móvil a Modo Light Ejecutivo
- Paleta sobria en escala de grises con toques neón `#9AC31C`.
- Botón **ENGINE START** con llamados prominentes a levantar la mirada: *"📺 ¡MIRA LA PANTALLA GIGANTE! 👀"*.

### E. Perfeccionamiento de la Pantalla Combo (`/pantalla?view=combo`)
1. **3 Pasos Dinámicos al Centro:**
   - Ubicados en la franja media entre el slider superior y el código QR.
   - Cuadrícula de 3 columnas compacta (`grid grid-cols-3`) que garantiza visualización al 100% en pantallas verticales estrechas sin cortarse.
   - Animaciones desfasadas de flotación (`comboStepFloat`) y radar ping.
2. **Estructura Flex Sin Solapamientos:**
   - Encabezado (`¡GIRA LA RULETA EN VIVO!`, `ESCANEA Y GANA`) y pie de página con `flex-shrink-0`.
   - Área del QR aislada con `min-h-0 overflow-hidden` para impedir que el QR toque o tape los textos.
3. **Control Porcentual de Tamaño de QR desde Admin:**
   - Control deslizante interactivo (30% a 90%) en `/admin` para calibrar el tamaño del QR en vivo.
   - Persistido en `display_configs.qr_scale_percent`.
4. **Resiliencia de Base de Datos y Lambda:**
   - Ejecución de `checkConnection` en arranque en frío de Lambda (`lambda.js`).
   - Mecanismo de auto-migración y recuperación en caliente en `displaysController.js` para crear columnas faltantes en RDS si fuera necesario.
5. **Limpieza de Errores en Consola:**
   - Sockets desactivados en vistas de cartelería y en entornos serverless sin backend de WebSockets para evitar bucles `403 Forbidden`.

### F. Ensanchamiento Horizontal de la Ruleta (Aspecto Ovalado)
1. **Calibración Dinámica desde `/admin`:**
   - Control deslizante interactivo (`90%` a `150%`) y botones de ajuste rápido (`100% Circular`, `110% Leve`, `115% Recomendado`, `120% Notorio`, `125% Amplio`) en la tarjeta **Ruleta Principal** en `/admin`.
   - Persistido en `display_configs.wheel_scale_x` con auto-migración de columna en MySQL.
2. **Transformación Geométrica en Pantalla (`/pantalla`):**
   - El disco de freno ventilado y el rin de la ruleta se proyectan elípticamente con `scaleX(wheelScaleX)`.
   - La ruleta gira circularmente en su interior sin ningún bamboleo o desvío excéntrico.
   - El indicador/clacker rojo superior aplica contra-escala inversa `scaleX(1 / wheelScaleX)` para mantenerse nítido, simétrico y apuntar con exactitud al gajo ganador.
   - Sincronización en tiempo real vía Sockets y polling ligero: cualquier cambio en `/admin` se refleja de inmediato en la pantalla del stand sin recargar.

---

## 3. Credenciales y Configuración de Despliegue

- **Perfil AWS:** `marketingvip` (Región `us-west-2`)
- **Bucket Frontend:** `marketingvip-autos-frontend-021891594659-us-west-2`
- **ID CloudFront:** `E1ZMRVAW1NYIDC`
- **PIN Administrativo:** `VIP2026`
- **Script de Despliegue:** `powershell -ExecutionPolicy Bypass -File deploy\deploy_aws.ps1`
- **Repositorio Git:** `https://github.com/caloloc2/mvevip_ruleta.git` (Rama `main`)

---

## 4. Estado del Sistema

- Código compilado y desplegado con éxito en AWS (S3, CloudFront y Lambda).
- Caché de CloudFront invalidada en producción (`https://autos.mvevip.com`).
- Repositorio limpio y listo para operación en la feria.
