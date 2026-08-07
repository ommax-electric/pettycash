import { Transaction, CategoryLimit, ActivityLog, User, AppSettings, IntegrationSettings } from './types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currencySymbol: '₹',
  dateFormat: 'DD-MM-YYYY',
  timezone: 'Asia/Kolkata (IST, UTC+05:30)',
  companyStampUrl: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><circle cx='80' cy='80' r='74' fill='none' stroke='%231d4ed8' stroke-width='3.5' stroke-dasharray='7 3'/><circle cx='80' cy='80' r='66' fill='none' stroke='%231e40af' stroke-width='2.5'/><circle cx='80' cy='80' r='48' fill='none' stroke='%231e40af' stroke-width='1.5'/><path id='c1' fill='none' d='M 28,80 A 52,52 0 1,1 132,80' /><text fill='%231e40af' font-size='9.5' font-weight='800' font-family='sans-serif' letter-spacing='1.2'><textPath href='%23c1' startOffset='50%' text-anchor='middle'>OMMAX ELECTRIC PVT LTD</textPath></text><path id='c2' fill='none' d='M 132,80 A 52,52 0 1,1 28,80' /><text fill='%231e40af' font-size='8.5' font-weight='700' font-family='sans-serif' letter-spacing='1'><textPath href='%23c2' startOffset='50%' text-anchor='middle'>★ APPROVED & AUDITED ★</textPath></text><polygon points='80,60 85,74 100,74 88,83 93,98 80,89 67,98 72,83 60,74 75,74' fill='%232563eb'/><text x='80' y='110' text-anchor='middle' fill='%231e40af' font-size='9' font-weight='900' font-family='sans-serif' letter-spacing='0.5'>PETTY CASH</text></svg>`,
  companyStampEnabled: true,
  companyStampRotate: -12,
  companyStampOpacity: 0.85,
  companyStampWidth: 85,
  allowManualVoucherNumbering: false
};

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  smsEnabled: false,
  smsGatewayUrl: 'https://api.sms-gate.app/3rdparty/v1/message',
  smsUsername: 'WRJ0SQ',
  smsPassword: 'sdoaxryxfmy5qh',
  smsRecipients: '+91 90259 76761',
  smsTemplateNew: 'New Petty Cash Voucher Alert: #{voucher_id} for {amount} paid to {paid_to} ({category}). Cash balance: {balance}.',
  smsTemplateEdit: 'Changes Alert for Petty Cash Voucher #{voucher_id}: {changed_fields} changed by {updated_by}. Please review. Balance: {balance}.',
  smsTemplateInward: 'Inward Cash Deposit Alert: #{voucher_id} for {amount} received from {paid_to} ({category}). Cash balance: {balance}.',
  smsTemplateInwardEdit: 'Deposit Changes Alert for Cash Deposit #{voucher_id}: {changed_fields} changed by {updated_by}. Please review. Balance: {balance}.',
  googleDriveEnabled: false,
  googleDriveFolderName: 'Petty Cash Voucher Attachments',
  googleDriveFolderId: '1A2b3C4d5E6f7G8h9I0j-PettyCashRoot',
  googleDriveStorageMode: 'HYBRID_FIRESTORE',
  googleDriveConnectedAccount: 'mail@ommaxelectric.com',
  cloudinaryEnabled: false,
  cloudinaryCloudName: 'ommaxelectric',
  cloudinaryUploadPreset: 'petty_cash_receipts',
  cloudinaryApiKey: '',
  cloudinaryFolderName: 'PettyCashRegister',
  cloudinaryStorageMode: 'HYBRID_FIRESTORE',
  emailEnabled: true,
  msTenantId: 'a63883ba-4173-48a2-a29d-247ca0c8e59a',
  msClientId: 'cf54c887-7846-4cc7-8c4c-ed9d407d07d6',
  msClientSecret: 'G0_8Q~QEhThZjfB8yvfs2eVIWan_GQ2_toG4kcUz',
  msSenderEmail: 'mail@ommaxelectric.com',
  msSenderName: 'Petty Cash',
  emailRecipients: 'info@ommaxelectric.com, admin@ommaxelectric.com',
  emailSubjectNew: '[Petty Cash Alert] New Voucher #{voucher_id} - {amount} ({category})',
  emailBodyNew: 'Hello Finance Team,\n\nA new petty cash voucher has been registered:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.',
  emailSubjectEdit: '[Petty Cash Changes Alert] Voucher #{voucher_id} Modified ({changed_fields}) - {amount}',
  emailBodyEdit: 'Hello Finance Team,\n\nChanges Alert for Petty Cash Voucher #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.',
  emailSubjectInward: '[Petty Cash Alert] Inward Deposit #{voucher_id} - {amount} ({category})',
  emailBodyInward: 'Hello Finance Team,\n\nA new petty cash inward deposit has been recorded:\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.',
  emailSubjectInwardEdit: '[Petty Cash Deposit Changes Alert] Deposit #{voucher_id} Modified ({changed_fields}) - {amount}',
  emailBodyInwardEdit: 'Hello Finance Team,\n\nDeposit Changes Alert for Petty Cash Deposit #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.',
  emailSubjectRequestSubmitted: '[Petty Cash Request] New Claim #{voucher_id} - {amount} requested by {paid_to}',
  emailBodyRequestSubmitted: 'Hello Manager / Approver,\n\nA new petty cash claim has been submitted for your approval:\n\nVoucher ID: #{voucher_id}\nRequested By: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nRemarks: {remarks}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review and approve this request in the Petty Cash Portal.',
  emailSubjectRequestApproved: '[Action Required] Claim #{voucher_id} - {amount} Approved - Issue Cash',
  emailBodyRequestApproved: 'Hello Finance Admin & Claimant,\n\nPetty cash voucher #{voucher_id} requested by {paid_to} has been APPROVED by {approved_by} and is ready for payment disbursement:\n\nVoucher ID: #{voucher_id}\nClaimant / Paid To: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nApproved By: {approved_by}\nDate: {date}\nRemarks: {remarks}\n\nCurrent Cash Balance: {balance}\n\nPlease log in to the Petty Cash Portal to issue cash and mark as paid.',
  emailSubjectRequestPaid: '[Petty Cash Paid] Voucher #{voucher_id} - {amount} Issued',
  emailBodyRequestPaid: 'Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} has been DISBURSED and marked as PAID by {paid_by}:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nIssued / Paid By: {paid_by}\nApproved By: {approved_by}\n\nCurrent Cash Balance: {balance}\n\nThank you.',
  emailSubjectRequestRejected: '[Petty Cash Rejected] Claim #{voucher_id} - {amount}',
  emailBodyRequestRejected: 'Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} was REJECTED by {rejected_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nParticulars: {particulars}\nRemarks / Reason: {remarks}\nRejected By: {rejected_by}\n\nPlease contact your manager or admin for further details.'
};

export const MOCK_USERS: User[] = [
  {
    username: 'admin',
    empId: 'OEPL-101',
    fullName: 'Sarah Jenkins',
    role: 'ADMIN',
    email: 'admin@ommaxelectric.com',
    password: 'admin123',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'
  },
  {
    username: 'manager',
    empId: 'OEPL-102',
    fullName: 'Mohan',
    role: 'MANAGER',
    email: 'mohan@ommaxelectric.com',
    isManager: true,
    reportingTo: 'Admin',
    password: 'manager123',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
  },
  {
    username: 'custodian',
    empId: 'OEPL-103',
    fullName: 'David Vance',
    role: 'CUSTODIAN',
    email: 'david.v@ommaxelectric.com',
    password: 'custodian123',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120'
  },
  {
    username: 'moorthi',
    empId: 'OEPL-104',
    fullName: 'Moorthi',
    role: 'USER',
    email: 'moorthi@ommaxelectric.com',
    reportingTo: 'Mohan',
    password: 'user123',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
  },
  {
    username: 'auditor',
    empId: 'OEPL-105',
    fullName: 'Elena Rostova',
    role: 'AUDITOR',
    email: 'elena.r@ommaxelectric.com',
    password: 'auditor123',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120'
  }
];

export const MOCK_CATEGORIES: CategoryLimit[] = [
  { id: 'CAT-001', name: 'Cash Source', color: '#10b981', budget: 50000, spent: 0, type: 'IN' },
  { id: 'CAT-002', name: 'Bank Withdrawal', color: '#06b6d4', budget: 50000, spent: 0, type: 'IN' },
  { id: 'CAT-003', name: 'Labour Charges', color: '#ec4899', budget: 5000, spent: 4000, type: 'OUT' },
  { id: 'CAT-004', name: 'Rent & Advertising', color: '#3b82f6', budget: 3000, spent: 2100, type: 'OUT' },
  { id: 'CAT-005', name: 'Electrical & Materials', color: '#f59e0b', budget: 2500, spent: 1329, type: 'OUT' },
  { id: 'CAT-006', name: 'Chemicals & Delivery', color: '#10b981', budget: 2000, spent: 1082, type: 'OUT' },
  { id: 'CAT-007', name: 'Travel & Site Visits', color: '#8b5cf6', budget: 1500, spent: 525, type: 'OUT' },
  { id: 'CAT-008', name: 'Miscellaneous', color: '#6b7280', budget: 500, spent: 0, type: 'OUT' }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-2026-001',
    date: '2026-05-15',
    type: 'OUT',
    amount: 700.00,
    category: 'Rent & Advertising',
    merchant: 'Chandrasekar',
    reference: 'OW-001',
    recordedBy: 'Mohan',
    status: 'PAID',
    description: 'Solar Advertisement Banner Rent for April\' 26 - May\' 26',
    receiptName: 'Parthiban given May month - settled',
    receiptSize: 'Local',
    editHistory: [
      {
        timestamp: '2026-05-16 11:30:22',
        editedBy: 'Sarah Jenkins',
        changes: [
          { field: 'Paid To', oldValue: 'Mohan', newValue: 'Chandrasekar' },
          { field: 'Amount', oldValue: '₹500.00', newValue: '₹700.00' }
        ]
      }
    ]
  },
  {
    id: 'TXN-2026-002',
    date: '2026-06-15',
    type: 'IN',
    amount: 5000.00,
    category: 'Cash Source',
    merchant: 'Parthiban',
    reference: 'IW-001',
    recordedBy: 'Mohan',
    status: 'APPROVED',
    description: 'Initial Amount from Parthiban',
    receiptName: 'initial_deposit.pdf',
    receiptSize: '154 KB'
  },
  {
    id: 'TXN-2026-003',
    date: '2026-06-15',
    type: 'IN',
    amount: 5500.00,
    category: 'Cash Source',
    merchant: 'ATM Withdrawal',
    reference: 'IW-002',
    recordedBy: 'Mohan',
    status: 'APPROVED',
    description: 'ATM withdraw by Mohan',
    receiptName: 'atm_receipt.png',
    receiptSize: '88 KB'
  },
  {
    id: 'TXN-2026-004',
    date: '2026-06-15',
    type: 'OUT',
    amount: 700.00,
    category: 'Rent & Advertising',
    merchant: 'Chandrasekar',
    reference: 'OW-002',
    recordedBy: 'Mohan',
    status: 'PAID',
    description: 'Solar Advertisement Banner Rent for May\'26 - June\' 26',
    receiptName: 'Parthiban given May month - settled',
    receiptSize: 'Local'
  },
  {
    id: 'TXN-2026-005',
    date: '2026-07-08',
    type: 'OUT',
    amount: 1329.00,
    category: 'Electrical & Materials',
    merchant: 'Mohan',
    reference: 'OW-003',
    recordedBy: 'Mohan',
    status: 'PAID',
    description: 'Gland purchase by Mohan #',
    receiptName: 'gland_invoice.pdf',
    receiptSize: '245 KB'
  },
  {
    id: 'TXN-2026-006',
    date: '2026-07-08',
    type: 'OUT',
    amount: 525.00,
    category: 'Travel & Site Visits',
    merchant: 'Mohan',
    reference: 'OW-004',
    recordedBy: 'Mohan',
    status: 'PAID',
    description: 'Taxi charges by Mohan for Anna Nagar Site visit',
    receiptName: 'OEPL to Anna Nagar site & Anna Nagar to OEPL',
    receiptSize: 'Local'
  },
  {
    id: 'TXN-2026-007',
    date: '2026-07-08',
    type: 'OUT',
    amount: 4000.00,
    category: 'Labour Charges',
    merchant: 'Mohan',
    reference: 'OW-005',
    recordedBy: 'Mohan',
    status: 'PAID',
    description: 'Solar Labour Charges for unloading Solar equipment',
    receiptName: 'Anna Nagar site (30 panel + inverters)',
    receiptSize: 'Local'
  },
  {
    id: 'TXN-2026-008',
    date: '2026-07-14',
    type: 'IN',
    amount: 2500.00,
    category: 'Cash Source',
    merchant: 'Cash Deposit',
    reference: 'IW-003',
    recordedBy: 'Mohan',
    status: 'APPROVED',
    description: 'Rejected amount from 1.5L cash deposit',
    receiptName: 'deposit_slip.png',
    receiptSize: '112 KB'
  },
  {
    id: 'TXN-2026-009',
    date: '2026-07-14',
    type: 'OUT',
    amount: 1082.00,
    category: 'Chemicals & Delivery',
    merchant: 'Mohan',
    reference: 'OW-006',
    recordedBy: 'Mohan',
    status: 'PAID',
    description: 'Saint Gobain - Chemical delivery by Mohan #',
    receiptName: 'chemical_invoice.pdf',
    receiptSize: '315 KB'
  },
  {
    id: 'TXN-2026-010',
    date: '2026-07-17',
    type: 'OUT',
    amount: 700.00,
    category: 'Rent & Advertising',
    merchant: 'Chandrasekar',
    reference: 'OW-007',
    recordedBy: 'Mohan',
    status: 'PAID',
    description: 'Solar Ad. banner rent - June\'26 - July\' 26',
    receiptName: 'rent_banner_july.png',
    receiptSize: '124 KB'
  }
];

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'LOG-001',
    timestamp: '2026-07-14 11:24:10',
    user: 'David Vance',
    role: 'CUSTODIAN',
    action: 'TXN_CREATE',
    details: 'Logged ₹1,082.00 expense (Chemicals & Delivery) to Mohan',
    ipAddress: '192.168.1.112'
  }
];

export const MOCK_MONTHLY_TRENDS = [
  { month: 'Feb 2026', inflow: 0, outflow: 0 },
  { month: 'Mar 2026', inflow: 0, outflow: 0 },
  { month: 'Apr 2026', inflow: 0, outflow: 0 },
  { month: 'May 2026', inflow: 0, outflow: 700 },
  { month: 'Jun 2026', inflow: 10500, outflow: 700 },
  { month: 'Jul 2026', inflow: 2500, outflow: 7636 }
];
