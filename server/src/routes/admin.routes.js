const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const adminValidation = require('../validations/admin.validation');

const router = express.Router();

// All admin routes are protected and require ADMIN or SUB_ADMIN role
router.use(protect);
router.use(authorize('ADMIN', 'SUB_ADMIN'));

// Doctor Management
router
  .route('/doctors')
  .post(validate(adminValidation.onboardDoctorSchema), adminController.onboardDoctor)
  .get(adminController.getDoctors);

router
  .route('/doctors/:id')
  .get(validate(adminValidation.getDoctorParamsSchema), adminController.getDoctorById)
  // Re-using onboard schema for update as all fields are optional (we can define a specific update schema if needed)
  .put(adminController.updateDoctor);

router.patch(
  '/doctors/:id/status',
  validate(adminValidation.updateDoctorStatusSchema),
  adminController.updateDoctorStatus
);

router.patch(
  '/doctors/:id/publish',
  validate(adminValidation.updateDoctorPublishSchema),
  adminController.updateDoctorPublish
);

module.exports = router;
