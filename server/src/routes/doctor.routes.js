const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const doctorValidation = require('../validations/doctor.validation');
const doctorController = require('../controllers/doctor.controller');

const router = express.Router();

// Memory storage since we validate magic bytes and use sharp in the service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Protect all routes and restrict to DOCTOR role
router.use(protect);
router.use(authorize('DOCTOR'));

// Profile
router
  .route('/profile')
  .get(doctorController.getProfile)
  .patch(validate(doctorValidation.updateProfileSchema), doctorController.updateProfile);

// Profile Picture
router
  .route('/profile/picture')
  .post(upload.single('image'), doctorController.updateProfilePicture)
  .delete(doctorController.deleteProfilePicture);

// Gallery
router
  .route('/gallery')
  .post(
    upload.single('image'),
    validate(doctorValidation.addGalleryItemSchema),
    doctorController.addGalleryImage,
  );

router
  .route('/gallery/:imageId')
  .patch(validate(doctorValidation.updateGalleryItemSchema), doctorController.updateGalleryImage)
  .delete(validate(doctorValidation.deleteGalleryItemSchema), doctorController.deleteGalleryImage);

// Clinic
router.patch(
  '/clinic',
  validate(doctorValidation.updateClinicSchema),
  doctorController.updateClinic,
);

// Fees
router.patch('/fees', validate(doctorValidation.updateFeesSchema), doctorController.updateFees);

// Types
router.patch('/types', validate(doctorValidation.updateTypesSchema), doctorController.updateTypes);

const scheduleValidation = require('../validations/schedule.validation');
const scheduleController = require('../controllers/schedule.controller');

// Schedules
router
  .route('/schedules/:type')
  .get(
    validate(scheduleValidation.updateScheduleSchema.pick({ params: true })),
    scheduleController.getSchedule,
  )
  .put(validate(scheduleValidation.updateScheduleSchema), scheduleController.updateSchedule);

// Exceptions
router
  .route('/exceptions')
  .get(scheduleController.getExceptions)
  .post(validate(scheduleValidation.addExceptionSchema), scheduleController.addException);

router
  .route('/exceptions/:id')
  .delete(validate(scheduleValidation.deleteExceptionSchema), scheduleController.deleteException);

// Dashboard & Appointments
router.get('/dashboard', doctorController.getDashboardKPIs);

router
  .route('/appointments')
  .get(validate(doctorValidation.getAppointmentsSchema), doctorController.getAppointments);

router.get('/appointments/normal-queue', doctorController.getNormalQueue);

router.patch(
  '/appointments/:id/status',
  validate(doctorValidation.updateAppointmentStatusSchema),
  doctorController.updateAppointmentStatus,
);

router.patch(
  '/appointments/:id/note',
  validate(doctorValidation.updateAppointmentNoteSchema),
  doctorController.updateAppointmentNote,
);

router.patch(
  '/appointments/:id/reschedule',
  validate(doctorValidation.rescheduleAppointmentSchema),
  doctorController.rescheduleAppointment,
);

// Earnings Ledger
router.get(
  '/earnings',
  validate(doctorValidation.getEarningsSchema),
  doctorController.getEarnings,
);

router.get(
  '/earnings/export',
  validate(doctorValidation.getEarningsSchema),
  doctorController.exportEarningsCSV,
);

module.exports = router;
