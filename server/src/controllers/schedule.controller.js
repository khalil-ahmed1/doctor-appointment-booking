const scheduleService = require('../services/schedule.service');
const asyncHandler = require('../utils/asyncHandler');

const getSchedule = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const schedule = await scheduleService.getSchedule(req.user.id, type);
  res.status(200).json({ success: true, data: schedule });
});

const updateSchedule = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const schedule = await scheduleService.updateSchedule(req.user.id, type, req.body);
  res.status(200).json({ success: true, data: schedule });
});

const getExceptions = asyncHandler(async (req, res) => {
  const exceptions = await scheduleService.getExceptions(req.user.id);
  res.status(200).json({ success: true, data: exceptions });
});

const addException = asyncHandler(async (req, res) => {
  const exception = await scheduleService.addException(req.user.id, req.body);
  res.status(200).json({ success: true, data: exception });
});

const deleteException = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await scheduleService.deleteException(req.user.id, id);
  res.status(200).json({ success: true, data: null });
});

module.exports = {
  getSchedule,
  updateSchedule,
  getExceptions,
  addException,
  deleteException,
};
