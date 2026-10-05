import dayjs from 'dayjs';

/**
 * Converts a 24-hour time string (e.g., "14:30") to a 12-hour AM/PM string (e.g., "02:30 PM").
 * @param {string} timeStr - 24-hour time string (HH:mm)
 * @returns {string} - 12-hour AM/PM time string
 */
export const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  return dayjs(`2000-01-01T${timeStr}`).format('hh:mm A');
};

/**
 * Converts a date string or Date object to Indian format with Day: "Mon, 05-10-2026"
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDateIndian = (date) => {
  if (!date) return '';
  return dayjs(date).format('ddd, DD-MM-YYYY');
};
