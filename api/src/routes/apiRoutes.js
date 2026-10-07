const express = require('express');
const router = express.Router();
const rouletteController = require('../controllers/rouletteController');
const leadsController = require('../controllers/leadsController');
const destinationsController = require('../controllers/destinationsController');
const { spinLimiter, adminLimiter } = require('../middlewares/rateLimiter');
const { requireAdminAuth } = require('../middlewares/authMiddleware');
const { verifyTurnstile } = require('../middlewares/turnstileMiddleware');

// Rutas Públicas de Ruleta & Destinos
router.get('/prizes', rouletteController.getPrizes);
router.post('/spin', spinLimiter, verifyTurnstile, rouletteController.processSpin);
router.get('/spin/latest', rouletteController.getLatestSpin);
router.post('/screen/activity', rouletteController.recordScreenActivity);
router.get('/ticket/:code', rouletteController.verifyTicket);
router.get('/destinations', destinationsController.getDestinations);

// Rutas Administrativas de Premios y Canjes (Protegidas con PIN y Rate Limit)
router.post('/ticket/:code/redeem', adminLimiter, requireAdminAuth, rouletteController.redeemTicket);
router.get('/admin/prizes', adminLimiter, requireAdminAuth, rouletteController.getAdminPrizes);
router.post('/admin/prizes', adminLimiter, requireAdminAuth, rouletteController.createPrize);
router.put('/admin/prizes/:id', adminLimiter, requireAdminAuth, rouletteController.updatePrize);

// Rutas Administrativas de Destinos Soñados
router.get('/admin/destinations', adminLimiter, requireAdminAuth, destinationsController.getAdminDestinations);
router.post('/admin/destinations', adminLimiter, requireAdminAuth, destinationsController.createDestination);
router.put('/admin/destinations/:id', adminLimiter, requireAdminAuth, destinationsController.updateDestination);
router.delete('/admin/destinations/:id', adminLimiter, requireAdminAuth, destinationsController.deleteDestination);

// Rutas Administrativas de Leads & Estadísticas de feria
router.get('/leads', adminLimiter, requireAdminAuth, leadsController.getLeads);
router.get('/metrics', adminLimiter, requireAdminAuth, leadsController.getMetrics);

module.exports = router;
