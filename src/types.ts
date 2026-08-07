export type UserRole = 'ADMIN' | 'MANAGER' | 'CUSTODIAN' | 'AUDITOR' | 'USER';

export interface User {
  id?: string;
  username: string; // Login Username
  empId?: string; // Employee ID
  fullName: string;
  role: UserRole;
  email?: string; // User Email ID
  avatarUrl?: string;
  password?: string;
  reportingTo?: string; // Username/FullName of reporting manager
  isManager?: boolean;
}

export interface AppSettings {
  currencySymbol: string; // e.g. "₹", "$", "€", "£", "AED", "SAR", "S$"
  dateFormat: string; // e.g. "DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY", "DD-MMM-YYYY"
  timezone: string; // e.g. "Asia/Kolkata (IST)", "UTC", "America/New_York (EST)", "Europe/London (GMT)"
  companyStampUrl?: string;
  companyStampEnabled?: boolean;
  companyStampRotate?: number; // rotation in degrees e.g. -180 to 180
  companyStampOpacity?: number; // opacity e.g. 0.1 to 1.0
  companyStampWidth?: number; // stamp image width in px e.g. 50 to 150
}

export interface IntegrationSettings {
  smsEnabled?: boolean;
  smsGatewayUrl?: string;
  smsUsername?: string;
  smsPassword?: string;
  smsRecipients?: string;
  smsTemplateNew?: string;
  smsTemplateEdit?: string;
  smsTemplateInward?: string;
  smsTemplateInwardEdit?: string;
  googleDriveEnabled?: boolean;
  googleDriveFolderName?: string;
  googleDriveFolderId?: string;
  googleDriveStorageMode?: 'DIRECT_DRIVE' | 'HYBRID_FIRESTORE';
  googleDriveConnectedAccount?: string;
  cloudinaryEnabled?: boolean;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryApiKey?: string;
  cloudinaryFolderName?: string;
  cloudinaryStorageMode?: 'DIRECT_CLOUDINARY' | 'HYBRID_FIRESTORE';
  emailEnabled: boolean;
  msTenantId: string;
  msClientId: string;
  msClientSecret: string;
  msSenderEmail: string;
  msSenderName: string;
  emailRecipients: string;
  emailSubjectNew: string;
  emailBodyNew: string;
  emailSubjectEdit: string;
  emailBodyEdit: string;
  emailSubjectInward: string;
  emailBodyInward: string;
  emailSubjectInwardEdit?: string;
  emailBodyInwardEdit?: string;
  emailSubjectRequestSubmitted?: string;
  emailBodyRequestSubmitted?: string;
  emailSubjectRequestApproved?: string;
  emailBodyRequestApproved?: string;
  emailSubjectRequestPaid?: string;
  emailBodyRequestPaid?: string;
  emailSubjectRequestRejected?: string;
  emailBodyRequestRejected?: string;
}

export type TransactionType = 'IN' | 'OUT';
export type TransactionStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAID' | 'DELETED';

export interface EditHistoryEntry {
  timestamp: string;
  editedBy: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  category: string;
  merchant: string;
  reference: string; // e.g., Voucher # or Receipt ID
  recordedBy: string;
  status: TransactionStatus;
  description: string;
  receiptName: string | null;
  receiptSize: string | null;
  receiptUrl?: string | null;
  remarks?: string;
  paymentType?: 'CASH' | 'ONLINE';
  editHistory?: EditHistoryEntry[];
  requestedBy?: string; // Full name or username of requester
  approverName?: string; // Full name or username of manager assigned to approve
  approvedBy?: string; // Full name of manager who approved
  approvedAt?: string; // Timestamp when manager approved
  paidBy?: string; // Full name of admin/custodian who issued cash
  paidAt?: string; // Timestamp when admin issued/marked paid
  rejectedBy?: string; // Full name of person who rejected
  rejectedAt?: string; // Timestamp if rejected
  rejectionReason?: string;
  deletedBy?: string; // Full name of person who deleted/voided
  deletedAt?: string; // Timestamp if deleted
  deleteReason?: string; // Reason for deletion
}

export const formatDateToDMY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  let str = dateStr.trim();
  if (str.includes('T')) {
    str = str.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [yyyy, mm, dd] = str.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split('/');
    return `${dd}-${mm}-${yyyy}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }
  return str;
};

export const formatISTDateTime = (isoOrDateStr?: string | null): string => {
  if (!isoOrDateStr) return '';
  const str = isoOrDateStr.trim();
  if (!str.includes('T') && !str.includes(':')) {
    return formatDateToDMY(str);
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    const formatted = new Intl.DateTimeFormat('en-GB', options).format(d);
    const parts = formatted.split(', ');
    const cleanDate = parts[0].replace(/\//g, '-');
    const cleanTime = parts[1] ? parts[1].toUpperCase() : '';
    return `${cleanDate} ${cleanTime} IST`;
  } catch {
    return str;
  }
};

export interface CategoryLimit {
  id?: string;
  name: string;
  color: string;
  budget: number;
  spent: number;
  type?: 'IN' | 'OUT' | 'BOTH';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
  ipAddress: string;
}

export interface DashboardStats {
  cashOnHand: number;
  totalCashIn: number;
  totalCashOut: number;
  pendingApprovals: number;
  recentTransactions: Transaction[];
  categorySpent: { name: string; value: number; color: string }[];
  monthlyTrend: { month: string; inflow: number; outflow: number }[];
}
