const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const Specialization = require('../models/Specialization');

const router = express.Router();

const slotController = require('../controllers/slot.controller');

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

module.exports = router;
