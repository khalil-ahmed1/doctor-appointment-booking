const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const Specialization = require('../models/Specialization');

const router = express.Router();

const slotController = require('../controllers/slot.controller');
const publicController = require('../controllers/public.controller');
const validate = require('../middlewares/validate');
const { searchDoctorsSchema } = require('../validations/public.validation');

router.get(
  '/specializations',
  asyncHandler(async (req, res) => {
    const specializations = await Specialization.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: specializations,
    });
  }),
);

router.get('/doctors/:slug/slots', slotController.getSlotsForDate);
router.get('/doctors/:slug/availability', slotController.getAvailability);

router.get('/doctors', validate(searchDoctorsSchema), publicController.searchDoctors);
router.get('/doctors/:slug', publicController.getDoctorBySlug);

module.exports = router;
