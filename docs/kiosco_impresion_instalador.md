# Kiosco · API local de impresión (TG2480H): lo que el instalador debe agregar

La página del botón (`https://autos.mvevip.com/pantalla/?view=kiosk-button&screen=KIOSK_01&k=...`) corre en el Ubuntu del kiosco
y llama a la API local `http://127.0.0.1:8765`. Hoy funciona el modo **texto** (`/print`). Para imprimir el **boarding pass gráfico**
hace falta un endpoint nuevo que reciba una imagen ya dibujada por la página.

## Por qué la imagen la dibuja la página (y no el servicio local)
- El diseño vive en el repositorio (versionado y desplegable sin tocar el PC del kiosco).
- El servicio local **no recibe HTML ni plantillas**: solo una imagen, y la convierte a comandos gráficos de la TG2480H.
- No hace falta instalar un navegador headless en el kiosco.

## Endpoint nuevo: `POST /print-image`
```
POST http://127.0.0.1:8765/print-image
Content-Type: application/json

{"image":"<PNG en base64, SIN el prefijo data:image/png;base64,>","cut":true}
```
Respuesta correcta: `{"ok":true,"job":"..."}`. Error: HTTP 4xx/5xx con `{"ok":false,"error":"..."}`.

Qué debe hacer el servicio:
1. Decodificar el PNG. Llega **576 px de ancho** (72 mm a 203 dpi) y altura variable (~900 px). Valores solo blanco/negro (sin grises),
   aunque el PNG sea RGBA de 8 bits: **binarizar con umbral 128** por seguridad.
2. Convertir a raster ESC/POS (`GS v 0`, modo normal) compatible con la TG2480H; enviar en bloques (p. ej. 128–256 filas) si el equipo lo requiere.
3. Centrar en el área imprimible (76 mm = 608 puntos; la imagen de 576 deja ~2 mm por lado).
4. Si `cut` es `true`: avanzar unas líneas y enviar el comando de corte (`GS V`), como lo haga hoy `/print`.
5. Enviar a CUPS por la misma cola raw `TG2480`.
6. Límites sugeridos: ancho exacto 576, altura máx. 2000 px, cuerpo máx. ~2 MB.

## CORS y red privada (importante)
La página es `https` pública y llama a `127.0.0.1`. Chromium envía un *preflight* con `Access-Control-Request-Private-Network: true`.
La API debe responder en `OPTIONS` **y** en las respuestas:
```
Access-Control-Allow-Origin: https://autos.mvevip.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Private-Network: true
```
Además, en Chromium reciente (v142+) puede aparecer un permiso de **"acceso a la red local"** la primera vez; hay que aceptarlo una vez
en ese navegador o fijarlo por política (`LocalNetworkAccessAllowedForUrls` con `https://autos.mvevip.com`).

## Prueba rápida desde el propio PC
```bash
curl -s http://127.0.0.1:8765/health
python3 - <<'PY'
import base64, json, urllib.request
png = open('ticket_prueba.png','rb').read()
req = urllib.request.Request('http://127.0.0.1:8765/print-image',
    data=json.dumps({"image": base64.b64encode(png).decode(), "cut": True}).encode(),
    headers={'Content-Type':'application/json'})
print(urllib.request.urlopen(req).read())
PY
```
Una imagen de ejemplo del ticket real: `docs/ticket_ejemplo_576px.png`.

## Modo de impresión de la página
- **Por defecto imprime el boarding pass con imagen** (`POST /print-image`), con el logo de Marketing VIP tramado en 1 bit y el QR de canje.
- Si la impresora rechaza la imagen (error o endpoint inexistente), la página imprime automáticamente el **ticket de texto** (`POST /print`) como respaldo, para que el visitante siempre reciba su ticket.
- `&print=text` en la URL de la pantalla del botón fuerza solo texto (útil para pruebas o si la imagen diera problemas).
