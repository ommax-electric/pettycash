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

/**
 * Safely opens file attachments (data URLs, blob URLs, or web URLs) in a new browser tab.
 * Browser security policies block opening raw base64 data: URLs via target="_blank" links directly.
 * This helper converts data URLs into Object Blobs to bypass iframe/browser security restrictions.
 */
export const openAttachmentInNewTab = (url?: string | null, fileName?: string): void => {
  if (!url) return;

  try {
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      if (parts.length >= 2) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          // If popup is blocked, open window then assign location
          const w = window.open('', '_blank');
          if (w) {
            w.location.href = blobUrl;
          }
        }
        return;
      }
    }

    // Standard HTTP or Blob URL
    const win = window.open(url, '_blank');
    if (!win) {
      const w = window.open('', '_blank');
      if (w) {
        w.location.href = url;
      }
    }
  } catch (err) {
    console.error('Error opening attachment in new tab:', err);
    // Fallback: open iframe in empty window
    try {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head><title>${fileName || 'Attachment Preview'}</title></head>
            <body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-center; height:100vh;">
              <iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>
            </body>
          </html>
        `);
      }
    } catch (e) {
      console.error('Fallback window open failed:', e);
    }
  }
};

