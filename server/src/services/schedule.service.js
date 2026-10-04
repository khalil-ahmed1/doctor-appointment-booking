const Schedule = require('../models/Schedule');
const ScheduleException = require('../models/ScheduleException');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { getDoctorProfileByUser } = require('./doctor.service');

// Helper to check if two time windows overlap
// Times are in "HH:mm" format, so string comparison works perfectly.
const checkOverlap = (win1, win2) => {
  return win1.start < win2.end && win1.end > win2.start;
};

// Check self-overlaps within an array of windows
const checkSelfOverlaps = (windows) => {
  for (let i = 0; i < windows.length; i++) {
    if (windows[i].start >= windows[i].end) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `Window start must be before end: ${windows[i].start} - ${windows[i].end}`,
      );
    }
    for (let j = i + 1; j < windows.length; j++) {
      if (checkOverlap(windows[i], windows[j])) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          `Overlapping windows detected: ${windows[i].start}-${windows[i].end} and ${windows[j].start}-${windows[j].end}`,
        );
      }
    }
  }
};

const getSchedule = async (userId, type) => {
  const profile = await getDoctorProfileByUser(userId);

  let schedule = await Schedule.findOne({ doctor: profile._id, type });

  if (!schedule) {
    // Return empty/default schedule
    schedule = new Schedule({
      doctor: profile._id,
      type,
      weeklyRules: Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        isWorking: false,
        windows: [],
      })),
    });
    await schedule.save();
  }

  return schedule;
};

const updateSchedule = async (userId, type, scheduleData) => {
  const profile = await getDoctorProfileByUser(userId);
  let schedule = await getSchedule(userId, type);

  // If weeklyRules is provided, we must check overlaps
  if (scheduleData.weeklyRules) {
    // 1. Check self-overlaps
    scheduleData.weeklyRules.forEach((rule) => {
      checkSelfOverlaps(rule.windows);
    });

    // 2. Check cross-type overlap (Premium vs Home Visit)
    const otherType = type === 'PREMIUM' ? 'HOME_VISIT' : 'PREMIUM';
    const otherSchedule = await Schedule.findOne({ doctor: profile._id, type: otherType });

    if (otherSchedule && otherSchedule.weeklyRules) {
      scheduleData.weeklyRules.forEach((rule) => {
        if (!rule.isWorking || !rule.windows.length) return;

        const otherRule = otherSchedule.weeklyRules.find((r) => r.dayOfWeek === rule.dayOfWeek);
        if (!otherRule || !otherRule.isWorking) return;

        rule.windows.forEach((win) => {
          otherRule.windows.forEach((otherWin) => {
            if (checkOverlap(win, otherWin)) {
              throw new ApiError(
                400,
                'VALIDATION_ERROR',
                `Cross-type overlap on day ${rule.dayOfWeek}: ${win.start}-${win.end} overlaps with ${otherType} window ${otherWin.start}-${otherWin.end}`,
              );
            }
          });
        });
      });
    }

    // 3. Conflict detection with existing appointments
    // According to PRD: Changing schedule edits only affect future unbooked slots.
    // "If a change would remove a window containing confirmed appointments → API returns 409 with the list of conflicting appointments..."
    // Implementing a basic conflict check for upcoming dates.
    // Since we are changing weekly rules, this affects all future dates.
    const today = new Date().toISOString().split('T')[0];
    const upcomingAppointments = await Appointment.find({
      doctor: profile._id,
      type,
      status: { $in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'EN_ROUTE', 'IN_PROGRESS'] },
      dateStr: { $gte: today },
    });

    const conflicts = [];
    upcomingAppointments.forEach((app) => {
      if (!app.startAt) return; // Normal appointments don't have startAt
      const appDayOfWeek = app.startAt.getUTCDay();
      const rule = scheduleData.weeklyRules.find((r) => r.dayOfWeek === appDayOfWeek);

      let isCovered = false;
      if (rule && rule.isWorking) {
        // Does the appointment fit fully inside any of the new windows?
        for (const win of rule.windows) {
          if (app.startTime >= win.start && app.endTime <= win.end) {
            isCovered = true;
            break;
          }
        }
      }

      if (!isCovered) {
        conflicts.push(app);
      }
    });

    if (conflicts.length > 0) {
      // PRD: return 409 with the list of conflicting appointments
      throw new ApiError(
        409,
        'SCHEDULE_CONFLICT',
        'Cannot update schedule because it conflicts with existing appointments. Please reschedule or cancel them first.',
        conflicts.map((c) => c._id),
      );
    }
  }

  // Update schedule
  if (scheduleData.slotDurationMin !== undefined)
    schedule.slotDurationMin = scheduleData.slotDurationMin;
  if (scheduleData.bufferMin !== undefined) schedule.bufferMin = scheduleData.bufferMin;
  if (scheduleData.advanceBookingDays !== undefined)
    schedule.advanceBookingDays = scheduleData.advanceBookingDays;
  if (scheduleData.minNoticeMinutes !== undefined)
    schedule.minNoticeMinutes = scheduleData.minNoticeMinutes;
  if (scheduleData.weeklyRules !== undefined) schedule.weeklyRules = scheduleData.weeklyRules;

  await schedule.save();
  return schedule;
};

const getExceptions = async (userId) => {
  const profile = await getDoctorProfileByUser(userId);
  const today = new Date().toISOString().split('T')[0];
  // return future exceptions
  return await ScheduleException.find({ doctor: profile._id, dateStr: { $gte: today } }).sort({
    dateStr: 1,
  });
};

const addException = async (userId, data) => {
  const profile = await getDoctorProfileByUser(userId);

  if (data.kind === 'CUSTOM_HOURS' && data.windows) {
    checkSelfOverlaps(data.windows);
  }

  // If CUSTOM_HOURS for Premium/Home Visit, check cross-type overlap with the other type's actual schedule for that date
  if (data.kind === 'CUSTOM_HOURS') {
    const hasPremium = data.appliesTo.includes('PREMIUM');
    const hasHome = data.appliesTo.includes('HOME_VISIT');

    // We shouldn't allow CUSTOM_HOURS that apply to both Premium and Home Visit if there is any window since they would overlap with themselves across types.
    if (hasPremium && hasHome && data.windows && data.windows.length > 0) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Cannot apply the same custom hours to both Premium and Home Visit as it creates a cross-type overlap.',
      );
    }

    // Check overlap with the OTHER type's schedule on this date
    let otherTypeToCheck = null;
    if (hasPremium) otherTypeToCheck = 'HOME_VISIT';
    else if (hasHome) otherTypeToCheck = 'PREMIUM';

    if (otherTypeToCheck) {
      // Look for a custom hours exception on that date for the other type
      const otherException = await ScheduleException.findOne({
        doctor: profile._id,
        dateStr: data.dateStr,
        kind: 'CUSTOM_HOURS',
        appliesTo: otherTypeToCheck,
      });

      let otherWindows = [];
      if (otherException) {
        otherWindows = otherException.windows;
      } else {
        // Check weekly schedule for that date
        const otherSchedule = await Schedule.findOne({
          doctor: profile._id,
          type: otherTypeToCheck,
        });
        if (otherSchedule && otherSchedule.weeklyRules) {
          const dateObj = new Date(data.dateStr);
          const dayOfWeek = dateObj.getUTCDay();
          const rule = otherSchedule.weeklyRules.find((r) => r.dayOfWeek === dayOfWeek);
          if (rule && rule.isWorking) {
            otherWindows = rule.windows;
          }
        }
      }

      data.windows.forEach((win) => {
        otherWindows.forEach((otherWin) => {
          if (checkOverlap(win, otherWin)) {
            throw new ApiError(
              400,
              'VALIDATION_ERROR',
              `Cross-type overlap on date ${data.dateStr}: Custom window ${win.start}-${win.end} overlaps with ${otherTypeToCheck} window ${otherWin.start}-${otherWin.end}`,
            );
          }
        });
      });
    }
  }

  // Conflict detection for existing appointments on this date
  const conflictingAppointments = await Appointment.find({
    doctor: profile._id,
    dateStr: data.dateStr,
    type: { $in: data.appliesTo },
    status: { $in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'EN_ROUTE', 'IN_PROGRESS'] },
  });

  if (conflictingAppointments.length > 0) {
    if (data.kind === 'LEAVE') {
      // If it's a full day leave, all appointments are conflicts
      throw new ApiError(
        409,
        'SCHEDULE_CONFLICT',
        'Cannot add leave because there are existing appointments on this date. Please cancel or reschedule them first.',
        conflictingAppointments.map((c) => c._id),
      );
    } else if (data.kind === 'CUSTOM_HOURS') {
      // Check if they fit in new windows
      const conflicts = [];
      conflictingAppointments.forEach((app) => {
        let isCovered = false;
        for (const win of data.windows) {
          if (app.startTime >= win.start && app.endTime <= win.end) {
            isCovered = true;
            break;
          }
        }
        if (!isCovered) conflicts.push(app);
      });
      if (conflicts.length > 0) {
        throw new ApiError(
          409,
          'SCHEDULE_CONFLICT',
          'Custom hours conflict with existing appointments on this date.',
          conflicts.map((c) => c._id),
        );
      }
    }
  }

  // Upsert exception for that date and kind
  const exception = await ScheduleException.findOneAndUpdate(
    { doctor: profile._id, dateStr: data.dateStr, kind: data.kind },
    { ...data, doctor: profile._id },
    { new: true, upsert: true },
  );

  // Auto-extend Normal queue validity if doctor takes a leave
  if (data.kind === 'LEAVE' && data.appliesTo.includes('NORMAL')) {
    const leaveDate = new Date(data.dateStr);

    const activeNormalTokens = await Appointment.find({
      doctor: profile._id,
      type: 'NORMAL',
      status: 'CONFIRMED',
      validUntil: { $gte: leaveDate },
    });

    for (const token of activeNormalTokens) {
      token.validUntil = new Date(token.validUntil.getTime() + 24 * 60 * 60 * 1000);
      token.extendedByDays = (token.extendedByDays || 0) + 1;
      await token.save();
    }
  }

  return exception;
};

const deleteException = async (userId, exceptionId) => {
  const profile = await getDoctorProfileByUser(userId);
  const exception = await ScheduleException.findOneAndDelete({
    _id: exceptionId,
    doctor: profile._id,
  });

  if (!exception) {
    throw new ApiError(404, 'NOT_FOUND', 'Exception not found');
  }

  return { success: true };
};

module.exports = {
  getSchedule,
  updateSchedule,
  getExceptions,
  addException,
  deleteException,
};
