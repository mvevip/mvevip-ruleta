# ChatRace: FLUJO 0 — Premio de la ruleta (cita de canje)

Bloque para pegar en el prompt del agente de ChatRace **justo antes de "FLUJO 1"** (debe ir primero para que gane
sobre los demás flujos: algunos premios se llaman "Proceso de Visado EEUU GRATIS" o "Segundo destino GRATIS" y
podrían activar por error el Flujo 7 (visa) o el 5 (Tventas)).

## Mensajes reales que envía el botón de la ruleta (canal Correo)
Generados por `buildWhatsappUrl` en `api/src/controllers/rouletteController.js` (empresa = `COMPANY_NAME`, número = `WHATSAPP_NUMBER`).

Ganador nuevo:
```
¡Hola Marketing VIP! Acabo de ganar *Maleta de Mano* en la ruleta 🎰

👤 Mi Nombre: Ana Perez Mora
🎟️ Código: VIP-AB12
📅 Mi cita: sábado 24 de octubre de 2026 a las 10:00 am

¡Quiero confirmar mi cita y reclamar mi premio!
```
Quien ya había participado:
```
¡Hola Marketing VIP! Ya participé en la ruleta 🎰

👤 Nombre: Ana Perez Mora
🎟️ Código: VIP-AB12
🎁 Premio: Maleta de Mano
📅 Cita: sábado 24 de octubre de 2026 a las 10:00 am

¡Quiero confirmar mi cita para canjear mi premio!
```
El mensaje trae nombre, fecha, hora, código y premio. Lo único que falta para el Flujo 3 es la **ciudad** (Quito o Guayaquil).
Si se cambia el texto del mensaje en el código, hay que actualizar el activador de este flujo.

## Texto para pegar
```
FLUJO 0 — PREMIO DE LA RULETA (CITA DE CANJE) · PRIORIDAD ABSOLUTA

ACTIVADOR
Se activa cuando el mensaje contiene la palabra "ruleta", un código con formato VIP-XXXX y la palabra "cita". Llega con esta estructura (cambian premio, nombre, código y fecha):
"¡Hola Marketing VIP! Acabo de ganar *[PREMIO]* en la ruleta 🎰
👤 Mi Nombre: [NOMBRE]
🎟️ Código: VIP-XXXX
📅 Mi cita: [DÍA, FECHA a las HORA]
¡Quiero confirmar mi cita y reclamar mi premio!"
O la variante: "¡Hola Marketing VIP! Ya participé en la ruleta 🎰 ... 🎁 Premio: [PREMIO] ... 📅 Cita: [...] ¡Quiero confirmar mi cita para canjear mi premio!"

PRIORIDAD
Este flujo está por encima de TODOS los demás. NO uses el nombre del premio para activar otro flujo: aunque el premio mencione "Visado/Visa", "destino", "Tventas", "vuelo", "paquete" u "oferta", NO inicies Visa Americana, Tventas, Cotizaciones ni Ofertas. El cliente viene a canjear su premio.

DATOS (ya vienen en el mensaje; no los vuelvas a pedir)
1. Nombre completo: el de "Nombre".
2. Fecha y hora: las de "Cita" (normalmente sábado a las 10:00). No corrijas al cliente.
3. Código y premio: los del mensaje.
ÚNICO DATO QUE PUEDE FALTAR: ciudad de la oficina (Quito o Guayaquil).

PASOS
1. Primer mensaje (uno solo): saluda por su primer nombre, felicítalo por su premio, menciona su código y su cita, y pregunta solo la ciudad. Modelo:
"¡Felicitaciones, [Nombre]! 🎉 Ya registramos tu premio [PREMIO] (código [VIP-XXXX]) y tu cita para canjearlo el [DÍA, FECHA a las HORA]. ¿En qué oficina prefieres canjearlo: Quito o Guayaquil? 😊"
2. Cuando responda la ciudad (o si ya la indicó): EJECUTA INMEDIATAMENTE agenda_citas_paquetes_vuelos con nombre completo, fecha, hora y ciudad. Sin resumen, sin confirmación y sin más preguntas.
3. Después responde: "Perfecto, tu cita ya está siendo gestionada. ✅" y ejecuta la ubicación de esa ciudad: ubicacion_uio (Quito) o ubicacion_gye (Guayaquil).

REGLAS
- Si ya indicó la ciudad en su mensaje, no preguntes: ejecuta de una vez.
- Ejecuta agenda_citas_paquetes_vuelos UNA SOLA VEZ por lead. Si reenvía el mensaje o vuelve a escribir por el mismo premio, no la ejecutes otra vez; solo confirma que su cita ya está registrada.
- Si la fecha de la cita ya pasó (según FECHA ACTUAL), pide solo una nueva fecha y hora dentro del horario (lunes a viernes 09h00–19h00; sábados 09h00–14h00) y luego ejecuta.
- Si el cliente pide otra fecha u hora dentro del horario, úsala en la función.
- No inventes condiciones, valores ni requisitos del premio. Si pregunta qué incluye o cómo se canjea, responde que el asesor se lo explicará en su cita.
- No recomiendes otras agencias ni plataformas externas.
```

## Revisar en ChatRace antes de activarlo
1. **FECHA ACTUAL del prompt está desactualizada** ("martes 01 de septiembre de 2026"): actualizarla o usar la variable de fecha dinámica.
2. Campos y formatos de la función `agenda_citas_paquetes_vuelos` (nombre, fecha, hora, ciudad): ajustar el paso 2 con los nombres exactos.
3. El asesor necesita saber el premio: si la función tiene campo de notas/observaciones/campaña, enviar "Ruleta cuotas – CÓDIGO – PREMIO". Si no existe, pedir que lo agreguen (el código también se valida en Admin > Canjear).

## Pruebas
En el chat de prueba pegar los dos mensajes con: premio normal, **premio de visado**, **premio "Segundo destino"** y la variante "ya participé";
ciudad en el mismo mensaje; mensaje reenviado; fecha ya pasada. Debe preguntar solo la ciudad, ejecutar la función una vez y enviar la ubicación,
sin activar visa, Tventas, cotizaciones ni ofertas. Luego una prueba real: giro con usuario de prueba del admin → botón de WhatsApp → bot.

## Mejoras opcionales (no implementadas)
- Marca fija en el mensaje (p. ej. "🎰 Ruleta Cuotas") para detección 100% fiable.
- Elegir la ciudad en la página del premio e incluir "📍 Oficina: Quito" en el mensaje, para que el bot no pregunte.
