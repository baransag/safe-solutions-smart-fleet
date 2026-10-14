// Pakistan Standard Time (PKT - Asia/Karachi, UTC+5) Helpers

export const PKT_TIMEZONE = 'Asia/Karachi';

/**
 * Format a date/timestamp to a readable date in Pakistan Time (e.g. "14 Oct 2026")
 */
export function formatPKTDate(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-GB', {
      timeZone: PKT_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Format a date/timestamp to 12-hour time in Pakistan Time (e.g. "08:30 AM")
 */
export function formatPKTTime(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString('en-US', {
      timeZone: PKT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Format date and time together in Pakistan Time (e.g. "14 Oct 2026, 08:30 AM")
 */
export function formatPKTDateTime(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return `${formatPKTDate(d)}, ${formatPKTTime(d)}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Calculate working duration between check-in and check-out timestamps.
 * ONLY returns a formatted string if both timestamps are valid and checkout >= checkin.
 */
export function calculateWorkingDuration(checkInInput, checkOutInput) {
  if (!checkInInput || !checkOutInput) {
    return { formatted: 'N/A', hours: null, isValid: false, missingCheckout: !checkOutInput && !!checkInInput };
  }
  try {
    const inD = new Date(checkInInput);
    const outD = new Date(checkOutInput);
    if (isNaN(inD.getTime()) || isNaN(outD.getTime()) || outD.getTime() < inD.getTime()) {
      return { formatted: 'Invalid Timestamps', hours: null, isValid: false, missingCheckout: false };
    }
    const diffMs = outD.getTime() - inD.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const hoursDecimal = +(diffMs / (1000 * 60 * 60)).toFixed(2);
    return {
      formatted: `${hrs}h ${mins}m`,
      hours: hoursDecimal,
      totalMinutes,
      isValid: true,
      missingCheckout: false
    };
  } catch {
    return { formatted: 'N/A', hours: null, isValid: false, missingCheckout: false };
  }
}

/**
 * Get current date string in Pakistan Time (YYYY-MM-DD)
 */
export function getPKTTodayString() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: PKT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now);
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}
