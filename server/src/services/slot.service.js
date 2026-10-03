const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const DoctorProfile = require('../models/DoctorProfile');
const Schedule = require('../models/Schedule');
const ScheduleException = require('../models/ScheduleException');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Kolkata');

// Helper to convert HH:mm to minutes from midnight
const timeToMins = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Helper to convert minutes from midnight to HH:mm
const minsToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper to check overlap between two [startMins, endMins] ranges
const checkOverlapMins = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};

const getSlotsForDate = async (slug, type, dateStr) => {
  if (type !== 'PREMIUM' && type !== 'HOME_VISIT') {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Slots are only generated for PREMIUM or HOME_VISIT types',
    );
  }

  // Find doctor
  const profile = await DoctorProfile.findOne({ slug, isPublished: true });
  if (!profile || profile.status !== 'ACTIVE') {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor not found or not bookable');
  }

  // Type must be enabled
  const typeKey = type === 'PREMIUM' ? 'premium' : 'homeVisit';
  if (!profile.types[typeKey] || !profile.types[typeKey].enabled) {
    throw new ApiError(
      409,
      'TYPE_DISABLED',
      `${type} appointments are not enabled for this doctor`,
    );
  }

  const schedule = await Schedule.findOne({ doctor: profile._id, type });
  if (!schedule) {
    return []; // No schedule = no slots
  }

  // 1. Check if date is within [today + minNotice, today + advanceBookingDays]
  const now = dayjs().tz('Asia/Kolkata');
  const targetDate = dayjs.tz(dateStr, 'Asia/Kolkata');
  const minDate = now.startOf('day');
  const maxDate = now.add(schedule.advanceBookingDays, 'day').endOf('day');

  if (targetDate.isBefore(minDate) || targetDate.isAfter(maxDate)) {
    return [];
  }

  // 2. Determine windows based on weekly rules and exceptions
  const dayOfWeek = targetDate.day(); // 0 (Sun) to 6 (Sat)
  const weeklyRule = schedule.weeklyRules.find((r) => r.dayOfWeek === dayOfWeek);

  let windows = [];
  if (weeklyRule && weeklyRule.isWorking) {
    windows = weeklyRule.windows;
  }

  const exception = await ScheduleException.findOne({
    doctor: profile._id,
    dateStr,
    appliesTo: type,
  });
  if (exception) {
    if (exception.kind === 'LEAVE') {
      windows = []; // Full leave for this type
    } else if (exception.kind === 'CUSTOM_HOURS' && exception.windows) {
      windows = exception.windows; // Override windows
    }
  }

  if (windows.length === 0) {
    return []; // Not working on this date
  }

  // 3. Generate slots
  let slots = [];
  const duration = schedule.slotDurationMin;
  const buffer = schedule.bufferMin;

  windows.forEach((win) => {
    let curMins = timeToMins(win.start);
    const endMins = timeToMins(win.end);

    while (curMins + duration <= endMins) {
      slots.push({
        startTime: minsToTime(curMins),
        endTime: minsToTime(curMins + duration),
        startMins: curMins,
        endMins: curMins + duration,
        status: 'AVAILABLE',
      });
      curMins += duration + buffer;
    }
  });

  // 4. Remove slots whose start < now + minNoticeMinutes
  const minAllowedTimeObj = now.add(schedule.minNoticeMinutes, 'minute');
  slots = slots.filter((slot) => {
    const slotTimeObj = dayjs.tz(
      `${dateStr} ${slot.startTime}`,
      'YYYY-MM-DD HH:mm',
      'Asia/Kolkata',
    );
    return slotTimeObj.isAfter(minAllowedTimeObj) || slotTimeObj.isSame(minAllowedTimeObj);
  });

  if (slots.length === 0) {
    return [];
  }

  // 5. Mark unavailable slots that have active appointments (any type) overlapping
  const activeStatuses = ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'EN_ROUTE', 'IN_PROGRESS'];
  const appointments = await Appointment.find({
    doctor: profile._id,
    dateStr,
    status: { $in: activeStatuses },
  });

  const nowUTC = new Date();

  slots.forEach((slot) => {
    for (const app of appointments) {
      // For Normal queue, startAt/endAt might be empty, but if they are there, we could check.
      // Normal appointments typically don't block slots, but if a Normal appointment has a defined time we might want to block?
      // Actually PRD says "in ANY type that overlaps". Premium and Home have startTime/endTime.
      if (!app.startTime || !app.endTime) continue;

      // Handle PENDING_PAYMENT expiry check
      if (app.status === 'PENDING_PAYMENT' && app.holdExpiresAt && app.holdExpiresAt < nowUTC) {
        continue; // Hold has expired
      }

      const appStartMins = timeToMins(app.startTime);
      const appEndMins = timeToMins(app.endTime);

      if (checkOverlapMins(slot.startMins, slot.endMins, appStartMins, appEndMins)) {
        if (app.status === 'PENDING_PAYMENT') {
          slot.status = 'HELD';
        } else {
          slot.status = 'BOOKED';
        }
        break; // Only need one overlap to mark it unavailable
      }
    }
  });

  // Cleanup internal properties before returning
  return slots.map((s) => ({
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
  }));
};

const getAvailabilityForRange = async (slug, type, fromDateStr, toDateStr) => {
  // Simple implementation: iterate over dates and call getSlotsForDate
  // A true bulk query would be more efficient, but this is fine for ~30 days.
  const from = dayjs(fromDateStr);
  const to = dayjs(toDateStr);
  const diff = to.diff(from, 'day');

  if (diff < 0 || diff > 90) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Date range must be between 0 and 90 days');
  }

  const availability = [];
  for (let i = 0; i <= diff; i++) {
    const dStr = from.add(i, 'day').format('YYYY-MM-DD');
    try {
      const slots = await getSlotsForDate(slug, type, dStr);
      // We say it's available if there's at least one AVAILABLE slot
      const hasAvailableSlots = slots.some((s) => s.status === 'AVAILABLE');
      availability.push({
        dateStr: dStr,
        isAvailable: hasAvailableSlots,
        totalSlots: slots.length,
        availableSlots: slots.filter((s) => s.status === 'AVAILABLE').length,
      });
    } catch (error) {
      // Ignore days where type is disabled or doctor not found?
      // If the first day threw 404/409, we should just throw.
      if (i === 0 && (error.statusCode === 404 || error.statusCode === 409)) {
        throw error;
      }
      availability.push({ dateStr: dStr, isAvailable: false, totalSlots: 0, availableSlots: 0 });
    }
  }

  return availability;
};

module.exports = {
  getSlotsForDate,
  getAvailabilityForRange,
};
