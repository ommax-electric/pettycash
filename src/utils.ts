import { AppSettings, User, Transaction } from './types';

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
      d = new Date(isoString);
    } else {
      d = dateInput;
    }

    if (isNaN(d.getTime())) return String(dateInput);

    const ianaTz = getIanaTimezone(timezoneStr);
    const prefFmt = (typeof window !== 'undefined' ? localStorage.getItem('ommax_pref_date_format') : null);
    const fmt = prefFmt || dateFormatStr || 'DD-MM-YYYY';

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

/**
 * Extracts numeric ID from transaction reference or id (e.g. "OW-029" -> 29, "28" -> 28).
 */
export const getTxnNumericId = (txn: { reference?: string; id?: string }): number => {
  const ref = txn.reference || txn.id || '';
  const match = ref.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

/**
 * Sorts transactions by numeric ID descending (latest / newest ID first).
 * If IDs are equal, falls back to date descending.
 */
export const sortTransactionsByIdDesc = <T extends { reference?: string; id?: string; date?: string }>(txns: T[]): T[] => {
  return [...txns].sort((a, b) => {
    const numA = getTxnNumericId(a);
    const numB = getTxnNumericId(b);
    if (numA !== numB) {
      return numB - numA; // Higher numeric ID first (29, 28, 27...)
    }
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
};

/**
 * Checks if currentUser is the assigned reporting manager to approve a pending transaction request.
 */
export const normalizeNameStr = (str?: string | null): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]\b/g, '') // remove single letter initials (e.g. 'k' in 'mohan k')
    .replace(/[^a-z0-9]/g, ''); // strip non-alphanumeric chars
};

export const isMatchUserIdentifier = (val1?: string | null, val2?: string | null): boolean => {
  if (!val1 || !val2) return false;
  const s1 = val1.trim().toLowerCase();
  const s2 = val2.trim().toLowerCase();
  if (s1 === s2) return true;
  
  const n1 = normalizeNameStr(val1);
  const n2 = normalizeNameStr(val2);
  if (n1 && n2 && n1 === n2) return true;
  return false;
};

/**
 * Checks if currentUser is the assigned reporting manager to approve a pending transaction request.
 */
export const isAssignedManagerForTxn = (
  txn: { requestedBy?: string; recordedBy?: string; merchant?: string; approverName?: string },
  currentUser?: User | null,
  users: User[] = []
): boolean => {
  if (!currentUser) return false;

  const isMatchCurrent = (val?: string | null): boolean => {
    if (!val) return false;
    return (
      isMatchUserIdentifier(val, currentUser.username) ||
      isMatchUserIdentifier(val, currentUser.fullName) ||
      isMatchUserIdentifier(val, currentUser.email) ||
      isMatchUserIdentifier(val, currentUser.empId)
    );
  };

  // RULE 1: A user CANNOT approve their own transaction claim!
  if (
    isMatchCurrent(txn.requestedBy) ||
    isMatchCurrent(txn.recordedBy) ||
    (txn.merchant && isMatchCurrent(txn.merchant))
  ) {
    return false;
  }

  // Find requester user object in users list
  const reqUser = users.find(u => {
    return (
      (!!txn.requestedBy && (
        isMatchUserIdentifier(u.fullName, txn.requestedBy) ||
        isMatchUserIdentifier(u.username, txn.requestedBy) ||
        isMatchUserIdentifier(u.email, txn.requestedBy) ||
        isMatchUserIdentifier(u.empId, txn.requestedBy)
      )) ||
      (!!txn.recordedBy && (
        isMatchUserIdentifier(u.fullName, txn.recordedBy) ||
        isMatchUserIdentifier(u.username, txn.recordedBy) ||
        isMatchUserIdentifier(u.email, txn.recordedBy) ||
        isMatchUserIdentifier(u.empId, txn.recordedBy)
      )) ||
      (!!txn.merchant && (
        isMatchUserIdentifier(u.fullName, txn.merchant) ||
        isMatchUserIdentifier(u.username, txn.merchant) ||
        isMatchUserIdentifier(u.email, txn.merchant) ||
        isMatchUserIdentifier(u.empId, txn.merchant)
      ))
    );
  });

  if (reqUser) {
    if (
      isMatchUserIdentifier(reqUser.username, currentUser.username) ||
      isMatchUserIdentifier(reqUser.fullName, currentUser.fullName) ||
      isMatchUserIdentifier(reqUser.email, currentUser.email)
    ) {
      return false; // Cannot approve your own transaction
    }
  }

  // Helper to test if a string is a generic role name (e.g. 'admin', 'manager')
  const isGenericRoleName = (str?: string | null): boolean => {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    const genericTerms = [
      'admin', 'administrator', 'manager', 'custodian', 'auditor', 'user',
      'administrator / manager', 'manager / admin', 'custodian / admin',
      'admin user', 'manager user', 'role', 'null', 'undefined'
    ];
    return genericTerms.some(term => s === term || s === term + 's');
  };

  // RULE 2: Determine target approver string from txn.approverName or requester's reportingTo
  let targetApprover = '';
  if (txn.approverName && !isGenericRoleName(txn.approverName)) {
    targetApprover = txn.approverName.trim();
  } else if (reqUser?.reportingTo && reqUser.reportingTo.trim().length > 0 && !isGenericRoleName(reqUser.reportingTo)) {
    targetApprover = reqUser.reportingTo.trim();
  } else if (txn.approverName && txn.approverName.trim().length > 0) {
    targetApprover = txn.approverName.trim();
  } else if (reqUser?.reportingTo && reqUser.reportingTo.trim().length > 0) {
    targetApprover = reqUser.reportingTo.trim();
  } else {
    targetApprover = 'manager';
  }

  // If targetApprover matches the requester themselves, requester cannot approve own request
  if (reqUser) {
    if (
      isMatchUserIdentifier(targetApprover, reqUser.username) ||
      isMatchUserIdentifier(targetApprover, reqUser.fullName) ||
      isMatchUserIdentifier(targetApprover, reqUser.email)
    ) {
      return false;
    }
  }

  // RULE 3: If a specific designated manager is targeted (not generic admin or manager)
  if (
    targetApprover && 
    targetApprover.toLowerCase() !== 'admin' && 
    targetApprover.toLowerCase() !== 'administrator' &&
    targetApprover.toLowerCase() !== 'manager'
  ) {
    // Check direct string match with currentUser
    if (isMatchCurrent(targetApprover)) {
      return true;
    }

    // Check if targetApprover resolves to currentUser in users list
    const targetUser = users.find(u =>
      isMatchUserIdentifier(u.username, targetApprover) ||
      isMatchUserIdentifier(u.fullName, targetApprover) ||
      isMatchUserIdentifier(u.email, targetApprover) ||
      isMatchUserIdentifier(u.empId, targetApprover)
    );

    if (targetUser) {
      if (
        isMatchUserIdentifier(targetUser.username, currentUser.username) ||
        isMatchUserIdentifier(targetUser.fullName, currentUser.fullName) ||
        isMatchUserIdentifier(targetUser.email, currentUser.email)
      ) {
        return true;
      }
      // Designated to another specific manager: neither admins nor other managers can see/approve
      return false;
    }

    // Unresolved specific name: only match if direct match succeeded
    return false;
  }

  // RULE 4: If targetApprover is explicitly 'admin' or 'administrator' (e.g. requester's reporting manager is Admin)
  if (targetApprover.toLowerCase() === 'admin' || targetApprover.toLowerCase() === 'administrator') {
    if (currentUser.role === 'ADMIN' || isMatchCurrent('admin')) {
      return true;
    }
    return false;
  }

  // RULE 5: If targetApprover is generic 'manager' or unassigned:
  // Strictly only users with MANAGER role can see and approve. Admins cannot see pending approvals of others.
  if (currentUser.role === 'MANAGER' || (currentUser as any).isManager) {
    return true;
  }

  return false;
};

/**
 * Checks if the current user is a participant (either the claimant/submitter user or the assigned manager)
 * in an expense clarification query conversation.
 * Strict privacy: Only between the manager and user involved.
 */
export const isQueryParticipant = (
  query: {
    requestedBy?: string;
    managerName?: string;
    transactionId?: string;
    voucherNo?: string;
  },
  currentUser?: User | null,
  transactions: Transaction[] = []
): boolean => {
  if (!currentUser) return false;

  const isMatchCurrent = (val?: string | null): boolean => {
    if (!val) return false;
    return (
      isMatchUserIdentifier(val, currentUser.username) ||
      isMatchUserIdentifier(val, currentUser.fullName) ||
      isMatchUserIdentifier(val, currentUser.email) ||
      isMatchUserIdentifier(val, currentUser.empId)
    );
  };

  // 1. Is current user the claimant / submitter?
  if (isMatchCurrent(query.requestedBy)) {
    return true;
  }

  // 2. Is current user the assigned manager on the query?
  if (isMatchCurrent(query.managerName)) {
    return true;
  }

  // 3. Check associated transaction if available
  const associatedTxn = transactions.find(
    t => t.id === query.transactionId || (query.voucherNo && t.reference === query.voucherNo)
  );
  if (associatedTxn) {
    if (
      isMatchCurrent(associatedTxn.requestedBy) ||
      isMatchCurrent(associatedTxn.recordedBy) ||
      isMatchCurrent(associatedTxn.merchant)
    ) {
      return true;
    }
    if (isMatchCurrent(associatedTxn.approverName)) {
      return true;
    }
  }

  return false;
};

/**
 * Checks if the current user is the submitter/creator of a transaction claim
 */
export const isTxnSubmitter = (
  txn: { requestedBy?: string; recordedBy?: string; merchant?: string },
  currentUser?: User | null
): boolean => {
  if (!currentUser) return false;
  const isMatchCurrent = (val?: string | null): boolean => {
    if (!val) return false;
    return (
      isMatchUserIdentifier(val, currentUser.username) ||
      isMatchUserIdentifier(val, currentUser.fullName) ||
      isMatchUserIdentifier(val, currentUser.email) ||
      isMatchUserIdentifier(val, currentUser.empId)
    );
  };
  return isMatchCurrent(txn.requestedBy) || isMatchCurrent(txn.recordedBy) || isMatchCurrent(txn.merchant);
};

export const getNextOutwardVoucherNumber = (txns: { type: string; reference?: string; id?: string }[], excludeId?: string): number => {
  let maxNum = 0;
  txns.forEach(t => {
    if (excludeId && t.id === excludeId) return;
    if (t.type === 'IN' || (t.reference && t.reference.toUpperCase().startsWith('IW-'))) return;
    const refStr = (t.reference || '').trim();
    if (refStr) {
      const matches = refStr.match(/\d+/g);
      if (matches) {
        matches.forEach(m => {
          const val = parseInt(m, 10);
          if (val > maxNum && val < 1000) {
            maxNum = val;
          }
        });
      }
    }
  });
  return maxNum + 1;
};

export const getNextInwardVoucherNumber = (txns: { type: string; reference?: string; id?: string }[], excludeId?: string): string => {
  let maxNum = 0;
  txns.forEach(t => {
    if (excludeId && t.id === excludeId) return;
    if (t.type === 'IN') {
      const refStr = (t.reference || '').trim();
      const numMatch = refStr.match(/\d+/);
      if (numMatch) {
        const val = parseInt(numMatch[0], 10);
        if (val > maxNum) {
          maxNum = val;
        }
      }
    }
  });
  return `IW-${String(maxNum + 1).padStart(3, '0')}`;
};


