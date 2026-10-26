const express = require('express');
const router = express.Router();
const rouletteController = require('../controllers/rouletteController');
const leadsController = require('../controllers/leadsController');
const destinationsController = require('../controllers/destinationsController');
const displaysController = require('../controllers/displaysController');
const testUsersController = require('../controllers/testUsersController');
const mailController = require('../controllers/mailController');
const channelsController = require('../controllers/channelsController');
const kioskController = require('../controllers/kioskController');
const { spinLimiter, adminLimiter, lookupLimiter } = require('../middlewares/rateLimiter');
const { requireAdminAuth } = require('../middlewares/authMiddleware');
const { verifyTurnstile } = require('../middlewares/turnstileMiddleware');

// Rutas Públicas de Ruleta & Destinos
router.get('/prizes', rouletteController.getPrizes);
router.post('/spin', spinLimiter, verifyTurnstile, rouletteController.processSpin);
router.get('/spin/latest', rouletteController.getLatestSpin);
router.get('/spin/queue/status', rouletteController.getQueueStatus);
router.post('/spin/queue/next', rouletteController.nextInQueue);
router.post('/screen/activity', rouletteController.recordScreenActivity);
router.get('/ticket/:code', rouletteController.verifyTicket);
router.get('/destinations', destinationsController.getDestinations);

// Canales de acceso habilitados y canal por defecto (el frontend móvil lo consulta al abrir)
router.get('/channels', channelsController.getPublicChannels);

// Kiosco de 2 pantallas (KIOSK_01): registro desde el celular, botón en la pantalla de abajo, giro en la de arriba
router.post('/kiosk/register', spinLimiter, verifyTurnstile, kioskController.registerParticipant);
router.get('/kiosk/state', kioskController.getState);
router.post('/kiosk/start', adminLimiter, kioskController.requireKioskKey, kioskController.startSpin);
router.post('/kiosk/revealed', adminLimiter, kioskController.markRevealed);
router.post('/kiosk/printed', adminLimiter, kioskController.requireKioskKey, kioskController.reportPrinted);
router.post('/admin/kiosk/reprint/:code', adminLimiter, requireAdminAuth, kioskController.requestReprint);

// Canal Correo (Brevo): búsqueda del cliente en el CRM por correo + token firmado
router.get('/mail/lookup', lookupLimiter, mailController.lookupMailClient);

// Rutas Públicas de Cartelería Digital y Sincronización
router.get('/displays/config', displaysController.getDisplaysConfig);
router.get('/displays/slider-images', displaysController.getSliderImages);
router.get('/displays/sync', displaysController.getSyncStatus);

// Rutas Administrativas de Premios y Canjes (Protegidas con PIN y Rate Limit)
router.post('/ticket/:code/redeem', adminLimiter, requireAdminAuth, rouletteController.redeemTicket);
router.get('/admin/prizes', adminLimiter, requireAdminAuth, rouletteController.getAdminPrizes);
router.post('/admin/prizes', adminLimiter, requireAdminAuth, rouletteController.createPrize);
router.put('/admin/prizes/:id', adminLimiter, requireAdminAuth, rouletteController.updatePrize);

// Rutas Administrativas de Canales de acceso (habilitar/deshabilitar y canal por defecto)
router.get('/admin/channels', adminLimiter, requireAdminAuth, channelsController.getAdminChannels);
router.put('/admin/channels', adminLimiter, requireAdminAuth, channelsController.updateChannels);

// Rutas Administrativas de Destinos Soñados
router.get('/admin/destinations', adminLimiter, requireAdminAuth, destinationsController.getAdminDestinations);
router.post('/admin/destinations', adminLimiter, requireAdminAuth, destinationsController.createDestination);
router.put('/admin/destinations/:id', adminLimiter, requireAdminAuth, destinationsController.updateDestination);
router.delete('/admin/destinations/:id', adminLimiter, requireAdminAuth, destinationsController.deleteDestination);

// Rutas Administrativas de Pantallas, Slider y Sincronización Remota
router.get('/admin/displays/config', adminLimiter, requireAdminAuth, displaysController.getDisplaysConfig);
router.put('/admin/displays/config', adminLimiter, requireAdminAuth, displaysController.updateDisplayConfig);
router.get('/admin/displays/slider-images', adminLimiter, requireAdminAuth, displaysController.getAdminSliderImages);
router.post('/admin/displays/slider-images', adminLimiter, requireAdminAuth, displaysController.createSliderImage);
router.put('/admin/displays/slider-images/reorder', adminLimiter, requireAdminAuth, displaysController.reorderSliderImages);
router.put('/admin/displays/slider-images/:id', adminLimiter, requireAdminAuth, displaysController.updateSliderImage);
router.delete('/admin/displays/slider-images/:id', adminLimiter, requireAdminAuth, displaysController.deleteSliderImage);
router.post('/admin/displays/reload', adminLimiter, requireAdminAuth, displaysController.triggerRemoteReload);

// Rutas Administrativas de Leads & Estadísticas de feria
router.get('/leads', adminLimiter, requireAdminAuth, leadsController.getLeads);
router.put('/leads/:id/assign', adminLimiter, requireAdminAuth, leadsController.assignAdvisorToLead);
router.get('/metrics', adminLimiter, requireAdminAuth, leadsController.getMetrics);

// Rutas Administrativas de Usuarios de Prueba (Modo Demo Stand)
router.get('/admin/test-users', adminLimiter, requireAdminAuth, testUsersController.getTestUsers);
router.post('/admin/test-users', adminLimiter, requireAdminAuth, testUsersController.createTestUser);
router.put('/admin/test-users/:id', adminLimiter, requireAdminAuth, testUsersController.toggleTestUser);
router.delete('/admin/test-users/:id', adminLimiter, requireAdminAuth, testUsersController.deleteTestUser);

module.exports = router;

