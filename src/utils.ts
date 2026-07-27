import { AppSettings } from './types';

/**
 * Extracts standard IANA timezone identifier from AppSettings.timezone string
 * e.g. "Asia/Kolkata (IST, UTC+05:30)" -> "Asia/Kolkata"
 */
export const getIanaTimezone = (tzStr?: string): string => {
  if (!tzStr) return 'Asia/Kolkata';
  if (tzStr.includes('Asia/Kolkata')) return 'Asia/Kolkata';
  if (tzStr.includes('UTC')) return 'UTC';
  if (tzStr.includes('America/New_York')) return 'America/New_York';
  if (tzStr.includes('Europe/London')) return 'Europe/London';
  const clean = tzStr.split(' ')[0];
  return clean || 'Asia/Kolkata';
};

/**
 * Formats a timestamp string or Date object into localized date & time
 * according to the app's configured timezone and date format.
 */
export const formatTimestampInTimezone = (
  dateInput: string | Date,
  timezoneStr?: string,
  dateFormatStr?: string
): string => {
  if (!dateInput) return '';

  try {
    let d: Date;
    if (typeof dateInput === 'string') {
      let isoString = dateInput.trim();
      // If missing T (e.g. "2026-07-25 02:47:04"), convert space to T
      if (!isoString.includes('T')) {
        isoString = isoString.replace(' ', 'T');
      }
      // If no timezone offset is present, append 'Z' to treat as UTC
      if (!isoString.endsWith('Z') && !isoString.includes('+') && !isoString.includes('-')) {
        isoString += 'Z';
      }
      d = new Date(isoString);
    } else {
      d = dateInput;
    }

    if (isNaN(d.getTime())) return String(dateInput);

    const ianaTz = getIanaTimezone(timezoneStr);
    const fmt = dateFormatStr || 'DD/MM/YYYY';

    // Format using Intl.DateTimeFormat in the requested timezone
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ianaTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(d);
    const map: { [key: string]: string } = {};
    parts.forEach(p => { map[p.type] = p.value; });

    const yyyy = map.year;
    const mm = map.month;
    const dd = map.day;
    const timePart = `${map.hour}:${map.minute}:${map.second}`;

    let datePart = `${dd}/${mm}/${yyyy}`;
    if (fmt === 'DD-MM-YYYY') datePart = `${dd}-${mm}-${yyyy}`;
    else if (fmt === 'YYYY-MM-DD') datePart = `${yyyy}-${mm}-${dd}`;
    else if (fmt === 'MM/DD/YYYY') datePart = `${mm}/${dd}/${yyyy}`;
    else if (fmt === 'DD-MMM-YYYY') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(mm, 10) - 1;
      datePart = `${dd}-${monthNames[monthIdx] || mm}-${yyyy}`;
    }

    return `${datePart} ${timePart}`;
  } catch (err) {
    return String(dateInput);
  }
};
