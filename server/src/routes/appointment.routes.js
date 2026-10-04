const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { protect, authorize } = require('../middlewares/auth');

router.post('/hold', protect, authorize('PATIENT'), appointmentController.holdSlot);
router.get('/:id/receipt', protect, appointmentController.downloadReceipt);

module.exports = router;
