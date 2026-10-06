const express = require('express');
const router = express.Router();
const rouletteController = require('../controllers/rouletteController');
const leadsController = require('../controllers/leadsController');

// Rutas Públicas de Ruleta
router.get('/prizes', rouletteController.getPrizes);
router.post('/spin', rouletteController.processSpin);
router.get('/spin/latest', rouletteController.getLatestSpin);
router.get('/ticket/:code', rouletteController.verifyTicket);
router.post('/ticket/:code/redeem', rouletteController.redeemTicket);

// Rutas Administrativas de Premios (CRUD & Calibración de Probabilidades)
router.get('/admin/prizes', rouletteController.getAdminPrizes);
router.post('/admin/prizes', rouletteController.createPrize);
router.put('/admin/prizes/:id', rouletteController.updatePrize);

// Rutas de Leads & Estadísticas de feria
router.get('/leads', leadsController.getLeads);
router.get('/metrics', leadsController.getMetrics);

module.exports = router;
