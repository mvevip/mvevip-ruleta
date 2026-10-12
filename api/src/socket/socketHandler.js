/**
 * Gestor de eventos en tiempo real con Socket.io
 */

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Nuevo cliente conectado: ${socket.id}`);

    // Unirse a una sala específica de pantalla (ej: STAND_01)
    socket.on('JOIN_ROOM', (roomData) => {
      const roomId = typeof roomData === 'string' ? roomData : roomData?.screenId || 'STAND_01';
      const role = roomData?.role || 'viewer'; // 'screen' | 'mobile'

      socket.join(roomId);
      console.log(`[Socket] ${socket.id} (${role}) se unió a la sala: ${roomId}`);

      // Si el móvil se conecta, notificar a la pantalla grande con efecto de "Piloto listo en boxes"
      if (role === 'mobile') {
        io.to(roomId).emit('USER_CONNECTED', {
          socketId: socket.id,
          message: '¡Piloto listo en la línea de salida! Completando formulario...',
          timestamp: new Date().toISOString()
        });
      }
    });

    // El móvil notifica que el usuario escaneó o está activo en el formulario
    socket.on('USER_ENGAGED', (data) => {
      const roomId = data?.screenId || 'STAND_01';
      io.to(roomId).emit('USER_ENGAGED', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    // El móvil notifica que el usuario está escribiendo o listo para presionar Start
    socket.on('USER_READY_TO_START', (data) => {
      const roomId = data?.screenId || 'STAND_01';
      io.to(roomId).emit('DRIVER_READY', {
        name: data?.name || 'Nuevo Visitante',
        message: '¡Encendiendo motores... A punto de girar!'
      });
    });

    // Notificar fin de giro desde la pantalla grande
    socket.on('SPIN_COMPLETED', (data) => {
      const roomId = data?.screenId || 'STAND_01';
      io.to(roomId).emit('SPIN_FINISHED', data);
      console.log(`[Socket] Giro completado para ticket en ${roomId}:`, data?.ticketCode);
    });

    // Ping / Pong para mantener conexión viva en redes de feria
    socket.on('PING', () => {
      socket.emit('PONG', { time: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}`);
    });
  });
}

module.exports = { setupSocket };
