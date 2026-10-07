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

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin header Origin (server-to-server, curl o health checks locales)
    if (!origin) return callback(null, true);
    if (
      config.NODE_ENV !== 'production' ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.mvevip.com')
    ) {
      return callback(null, true);
    }
    return callback(new Error('Acceso bloqueado por política CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));
app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar WebSockets con CORS seguro
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        config.NODE_ENV !== 'production' ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.mvevip.com')
      ) {
        return callback(null, true);
      }
      return callback(new Error('WebSocket no permitido por CORS'));
    },
    methods: ['GET', 'POST']
  }
});

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
