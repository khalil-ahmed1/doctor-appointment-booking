const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('PATIENT'));

router.get('/appointments', patientController.getMyAppointments);
router.get('/doctors', patientController.getMyDoctors);
router.get('/payments', patientController.getMyPayments);
router.put('/profile', patientController.updateProfile);

module.exports = router;
