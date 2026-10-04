const slotService = require('../services/slot.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getSlotsForDate = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { type, date } = req.query;

  if (!type || !date) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'type and date queries are required');
  }

  const slots = await slotService.getSlotsForDate(slug, type, date);
  res.status(200).json({ success: true, data: slots });
});

const getAvailability = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { type, from, to } = req.query;

  if (!type || !from || !to) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'type, from, and to queries are required');
  }

  const availability = await slotService.getAvailabilityForRange(slug, type, from, to);
  res.status(200).json({ success: true, data: availability });
});

module.exports = {
  getSlotsForDate,
  getAvailability,
};
