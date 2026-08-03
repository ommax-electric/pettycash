export type UserRole = 'ADMIN' | 'CUSTODIAN' | 'AUDITOR';

export interface User {
  id?: string;
  username: string; // Login Username
  empId?: string; // Employee ID
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  password?: string;
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
  smsEnabled: boolean;
  smsGatewayUrl: string;
  smsUsername: string;
  smsPassword: string;
  smsRecipients: string;
  smsTemplateNew: string;
  smsTemplateEdit: string;
  smsTemplateInward: string;
  smsTemplateInwardEdit?: string;
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
}

export type TransactionType = 'IN' | 'OUT';
export type TransactionStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

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
}

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
