export type UserRole = 'ADMIN' | 'MANAGER' | 'CUSTODIAN' | 'AUDITOR' | 'USER';

export const APP_VERSION = '3.1';

export function getNextAppVersion(currentVersion: string = APP_VERSION): string {
  const match = currentVersion.trim().match(/^v?(\d+)\.(\d+)$/);
  if (!match) return '3.2';
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  if (minor >= 9) {
    return `${major + 1}.0`;
  }
  return `${major}.${minor + 1}`;
}

export type ParentModule = 'CRM' | 'QUOTATION' | 'HRMS' | 'CASH_BOOK' | 'SETTINGS' | 'ADMIN_SETTINGS';

export interface ParentModuleOption {
  id: ParentModule;
  label: string;
  description: string;
}

export const ALL_PARENT_MODULES: ParentModuleOption[] = [
  { id: 'CRM', label: 'CRM', description: 'Accounts, Contacts, and Opportunity pipeline' },
  { id: 'QUOTATION', label: 'Quotation', description: 'Solar proposals, canvas builder, and pricing tools' },
  { id: 'HRMS', label: 'HRMS', description: 'Employee directory and HR management' },
  { id: 'CASH_BOOK', label: 'Cash Book', description: 'Financial overview, petty cash inward, outward, and approvals' },
  { id: 'SETTINGS', label: 'Settings', description: 'Personal preferences and system defaults' },
  { id: 'ADMIN_SETTINGS', label: 'Admin Settings', description: 'User management, audit trails, and master configuration' }
];

export interface UserPreferences {
  defaultPaymentMode?: 'CASH' | 'ONLINE';
  dateFormat?: 'DD-MM-YYYY' | 'DD/MM/YYYY';
  defaultModule?: string;
  defaultDateFilter?: 'THIS_MONTH' | 'LAST_30' | 'ALL';
  defaultCountryCode?: string;
}

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
  preferences?: UserPreferences;
  allowedModules?: ParentModule[];
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
  allowManualVoucherNumbering?: boolean;
  appVersion?: string;
}

export interface IntegrationSettings {
  cloudinaryEnabled?: boolean;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryFolderName?: string;
  cloudinaryStorageMode?: 'DIRECT_CLOUDINARY' | 'HYBRID_FIRESTORE';
  emailEnabled?: boolean;
  msTenantId?: string;
  msClientId?: string;
  msClientSecret?: string;
  msSenderEmail?: string;
  msSenderName?: string;
  emailRecipients?: string;
  pettyCashRecipients?: string;
  cashAdminEmail?: string;
  crmRecipients?: string;
  emailSubjectNew?: string;
  emailBodyNew?: string;
  emailSubjectEdit?: string;
  emailBodyEdit?: string;
  emailSubjectInward?: string;
  emailBodyInward?: string;
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
  emailSubjectRequestRerouted?: string;
  emailBodyRequestRerouted?: string;
  emailSubjectQuery?: string;
  emailBodyQuery?: string;
  emailSubjectQueryResponse?: string;
  emailBodyQueryResponse?: string;
  crmEmailSubjectNewOpp?: string;
  crmEmailBodyNewOpp?: string;
  crmEmailSubjectWinOpp?: string;
  crmEmailBodyWinOpp?: string;
  crmEmailSubjectLostOpp?: string;
  crmEmailBodyLostOpp?: string;
}

export type TransactionType = 'IN' | 'OUT';
export type TransactionStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAID' | 'DELETED';

export interface WorkflowHistoryEntry {
  id?: string;
  timestamp: string;
  action: 'CREATED' | 'SUBMITTED' | 'RE_ROUTED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'DELETED';
  actor: string;
  target?: string;
  reason?: string;
}

export interface EditHistoryEntry {
  timestamp: string;
  editedBy: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

export interface QueryMessage {
  id: string;
  senderId?: string;
  senderName: string;
  senderRole: UserRole;
  senderEmail?: string;
  message: string;
  timestamp: string;
  attachments?: {
    name: string;
    url: string;
    size?: string;
  }[];
}

export interface ExpenseQuery {
  id: string;
  transactionId: string;
  voucherNo: string;
  amount: number;
  category: string;
  particulars: string;
  requestedBy: string;
  managerName: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
  messages: QueryMessage[];
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
  projectRefNo?: string;
  paymentType?: 'CASH' | 'ONLINE';
  editHistory?: EditHistoryEntry[];
  workflowHistory?: WorkflowHistoryEntry[];
  queryStatus?: 'OPEN' | 'CLOSED';
  hasQuery?: boolean;
  latestQueryId?: string;
  requestedBy?: string; // Full name or username of requester
  approverName?: string; // Full name or username of manager assigned to approve
  approvedBy?: string; // Full name of manager who approved
  approvedAt?: string; // Timestamp when manager approved
  paidBy?: string; // Full name of admin/custodian who issued cash
  paidAt?: string; // Timestamp when admin issued/marked paid
  rejectedBy?: string; // Full name of person who rejected
  rejectedAt?: string; // Timestamp if rejected
  rejectionReason?: string;
  reRoutedBy?: string; // Full name of manager who re-routed approval
  reRoutedAt?: string; // Timestamp when re-routed
  reRouteReason?: string; // Reason for re-routing
  deletedBy?: string; // Full name of person who deleted/voided
  deletedAt?: string; // Timestamp if deleted
  deleteReason?: string; // Reason for deletion
}

export const formatDateToDMY = (dateStr?: string | null, customFormat?: string): string => {
  if (!dateStr) return '';
  let str = dateStr.trim();
  if (str.includes('T')) {
    str = str.split('T')[0];
  }
  const prefFormat = customFormat || (typeof window !== 'undefined' ? localStorage.getItem('ommax_pref_date_format') : null) || 'DD-MM-YYYY';
  const sep = prefFormat.includes('/') ? '/' : '-';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [yyyy, mm, dd] = str.split('-');
    return `${dd}${sep}${mm}${sep}${yyyy}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split('/');
    return `${dd}${sep}${mm}${sep}${yyyy}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split('-');
    return `${dd}${sep}${mm}${sep}${yyyy}`;
  }
  return str;
};

export const formatISTDateTime = (isoOrDateStr?: string | null, customFormat?: string): string => {
  if (!isoOrDateStr) return '';
  const str = isoOrDateStr.trim();
  if (!str.includes('T') && !str.includes(':')) {
    return formatDateToDMY(str, customFormat);
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const prefFormat = customFormat || (typeof window !== 'undefined' ? localStorage.getItem('ommax_pref_date_format') : null) || 'DD-MM-YYYY';
    const sep = prefFormat.includes('/') ? '/' : '-';
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
    const cleanDate = parts[0].replace(/[\/-]/g, sep);
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
  module?: string;
  action: string;
  details: string;
  ipAddress?: string;
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
