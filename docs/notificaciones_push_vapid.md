# Notificaciones push (VAPID) del Admin

Cada lead nuevo (pantalla gigante, kiosco o correo) genera un aviso en los dispositivos que tengan las notificaciones
activadas en el Admin (navegador de escritorio o celular, y la app instalada). El aviso muestra **nombre, ciudad/frente y premio**
(sin teléfono ni correo) y al tocarlo abre los leads de esa ciudad. En el kiosco el aviso llega al **registrarse** la persona.

## Cómo está hecho
- Estándar Web Push con claves **VAPID** (librería `web-push` en el API).
- Tabla `push_subscriptions` (migración `deploy/migrations/011_push_subscriptions.sql`): una fila por dispositivo y sus filtros
  (ciudades, frentes, incluir demos).
- Servicio `api/src/services/pushService.js`: envía a los dispositivos cuyo filtro coincide, elimina las suscripciones caducadas (404/410)
  y **nunca** hace fallar ni retrasa más de ~3,5 s la participación (el Lambda se congela al responder, por eso se espera el envío).
- Service worker `frontend-admin/public/sw.js`: muestra la notificación, avisa al Admin abierto para refrescar y abre la página al tocarla.
- Rutas: `GET /api/push/public-key` (pública) y `/api/admin/push/*` (PIN).

## Puesta en marcha (una sola vez)
1. **Generar las claves** (en cualquier computador con Node):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Devuelve una clave pública y una privada. **La privada es un secreto**: no la compartas ni la subas al repositorio.
2. **Variables del Lambda** `MarketingVIP-Roulette-Api-prod` (AWS → Lambda → Configuración → Variables de entorno → Editar → Agregar):
   | Variable | Valor |
   |---|---|
   | `VAPID_PUBLIC_KEY` | la clave pública |
   | `VAPID_PRIVATE_KEY` | la clave privada |
   | `VAPID_SUBJECT` | opcional; por defecto `https://autos.mvevip.com` |
   No borres ni cambies las variables que ya existen. Guardar no requiere un nuevo despliegue.
3. **Migración 011** en RDS (`deploy/migrations/011_push_subscriptions.sql`).
4. **Desplegar** (workflow manual) y, en el Admin, ir a **Ajustes → Notificaciones → Activar notificaciones en este dispositivo**.
   Repetirlo en cada dispositivo (cada uno elige qué ciudades y frentes recibir). Usar **Enviar una notificación de prueba**.

> Si las claves cambian, hay que volver a activar las notificaciones en cada dispositivo (las suscripciones quedan atadas a la clave).

## Instalación como aplicación (PWA)
- Android y escritorio (Chrome/Edge): botón **Instalar aplicación** (menú lateral o Ajustes → Instalar la app) o ícono de instalación de la barra de direcciones.
- iPhone/iPad: Safari → Compartir → **Agregar a inicio**; abrir "VIP Admin" desde el ícono y activar las notificaciones desde ahí (iOS 16.4 o superior).
- El service worker y el manifiesto se sirven con `Cache-Control: no-cache` (lo hace el workflow de despliegue) para que las actualizaciones lleguen.

## Problemas frecuentes
| Síntoma | Causa y solución |
|---|---|
| "Falta configurar el servidor" | Faltan `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` en el Lambda. |
| "Falta ejecutar la migración 011" | Ejecutar `011_push_subscriptions.sql` en RDS. |
| "Bloqueaste las notificaciones" | Permitirlas desde el candado de la barra de direcciones (o Ajustes del navegador) para `autos.mvevip.com`. |
| No llegan en iPhone | La app debe estar instalada en la pantalla de inicio (iOS 16.4+) y las notificaciones permitidas para ella. |
| Dejó de llegar en un dispositivo | Entrar a Ajustes → Notificaciones y volver a activarlas (la suscripción pudo caducar y se eliminó sola). |

## Pruebas
`deploy/tools/push_e2e.js` (22 comprobaciones): simula el servicio de push con un servidor HTTPS local y **descifra** el mensaje
(RFC 8291) para comprobar firma VAPID, contenido, filtros por ciudad/frente/demos, limpieza de suscripciones caducadas y que un fallo
del servicio de push no afecta a la participación.
