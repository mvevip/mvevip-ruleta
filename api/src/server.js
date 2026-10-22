const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const config = require('./config/env');
const { checkConnection } = require('./config/db');
const { setupSocket } = require('./socket/socketHandler');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const server = http.createServer(app);

// Habilitar trust proxy para CloudFront y API Gateway (Requerido por express-rate-limit)
app.set('trust proxy', 1);

const { globalLimiter } = require('./middlewares/rateLimiter');

// Configuración de CORS restringida por entorno y dominio
const allowedOrigins = config.SECURITY.allowedOrigins;
const isProduction = config.NODE_ENV === 'production';

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // En servidor local, bloquear estrictamente peticiones cruzadas originadas en el dominio de producción
    if (config.NODE_ENV !== 'production' && (origin.includes('autos.mvevip.com') || origin.includes('mvevip.com'))) {
      console.warn(`[CORS Security] Rechazada petición HTTP desde producción: ${origin}`);
      return callback(new Error('Petición desde producción bloqueada en servidor local'));
    }
    // En producción solo los orígenes de ALLOWED_ORIGINS reciben cabeceras CORS (el navegador bloquea al resto)
    if (isProduction && !allowedOrigins.includes(origin)) return callback(null, false);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));

// Producción: rechazar escrituras (POST/PUT/PATCH/DELETE) que declaren un Origin no permitido.
// Sin cabecera Origin (curl, herramientas del servidor) se deja pasar: las rutas sensibles ya exigen PIN / rate limit.
app.use((req, res, next) => {
  if (isProduction && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      console.warn(`[CORS Security] ${req.method} ${req.path} rechazado por origen no permitido: ${origin}`);
      return res.status(403).json({ success: false, message: 'Origen no permitido.' });
    }
  }
  next();
});
app.use(globalLimiter);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Configurar WebSockets con CORS seguro: aislar 100% de producción
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Bloquear estrictamente cualquier conexión de sockets desde el dominio de producción
      if (origin.includes('autos.mvevip.com') || origin.includes('mvevip.com')) {
        console.warn(`[Socket Security] Rechazada conexión WebSocket desde producción: ${origin}`);
        return callback(new Error('WebSocket desde producción bloqueado en servidor local'));
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST']
  }
});

global.io = io;

// Middleware para inyectar io en las peticiones REST
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Configurar eventos de sockets
setupSocket(io);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Marketing VIP Roulette API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rutas de API
app.use('/api', apiRoutes);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Iniciar servidor
const PORT = config.PORT;

async function startServer() {
  console.log(`[API] Iniciando Marketing VIP Roulette API en puerto ${PORT}...`);
  await checkConnection();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Marketing VIP - Ruleta API ejecutándose en:`);
    console.log(`👉 Local:   http://localhost:${PORT}`);
    console.log(`👉 Health:  http://localhost:${PORT}/health`);
    console.log(`👉 Premios: http://localhost:${PORT}/api/prizes`);
    console.log(`=======================================================`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

module.exports = { app, server };
