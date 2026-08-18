export type CRMTab = 'DASHBOARD' | 'ACCOUNTS' | 'CONTACTS' | 'OPPORTUNITIES' | 'SETTINGS';

export interface AccountEditHistoryEntry {
  timestamp: string;
  changedBy: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'OWNER_REASSIGNED';
  details?: string;
  oldStatus?: string;
  newStatus?: string;
}

export interface CRMAccount {
  id: string;
  name: string;
  businessCategory?: string;
  industry?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  website?: string;
  address?: string;
  billingCity?: string;
  billingState?: string;
  pincode?: string;
  country?: string;
  billingCountry?: string;
  annualRevenue?: number;
  creditLimit?: number;
  status: 'ACTIVE' | 'PROSPECT' | 'INACTIVE';
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  editHistory?: AccountEditHistoryEntry[];
}

export const formatCRMIDateTime = (isoString?: string | null): string => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const dd = map.day || '01';
    const mm = map.month || '01';
    const yyyy = map.year || '2026';
    const hh = map.hour || '12';
    const min = map.minute || '00';
    const dayPeriod = (map.dayPeriod || 'AM').toUpperCase();
    return `${dd}-${mm}-${yyyy} | ${hh}:${min} ${dayPeriod}`;
  } catch {
    return isoString || '—';
  }
};

export const formatCRMIDate = (isoString?: string | null): string => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const dd = map.day || '01';
    const mm = map.month || '01';
    const yyyy = map.year || '2026';
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return isoString || '—';
  }
};

export type ContactStatus = 'ACTIVE' | 'INACTIVE' | 'LEFT_COMPANY' | 'DO_NOT_CONTACT';

export interface CRMContact {
  id: string;
  accountId?: string;
  accountName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  mobile?: string;
  altMobile?: string;
  designation?: string;
  department?: string;
  isPrimary?: boolean;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  status: ContactStatus | 'ACTIVE' | 'INACTIVE';
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  editHistory?: AccountEditHistoryEntry[];
}

export type OpportunityStage = 
  | 'PROSPECTING' 
  | 'QUALIFICATION' 
  | 'PROPOSAL' 
  | 'NEGOTIATION' 
  | 'CLOSED_WON' 
  | 'CLOSED_LOST';

export interface CRMOpportunity {
  id: string;
  title: string;
  accountId: string;
  accountName: string;
  contactId?: string;
  contactName?: string;
  amount: number;
  stage: OpportunityStage;
  probability: number; // e.g. 10 to 100
  expectedCloseDate: string;
  leadSource?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  lostReason?: string;
}

export interface CRMSettings {
  pipelineStages: {
    id: OpportunityStage;
    label: string;
    probability: number;
    color: string;
  }[];
  leadSources: string[];
  industries: string[];
  businessCategories: string[];
  defaultCurrency: string;
}

export const DEFAULT_CRM_SETTINGS: CRMSettings = {
  pipelineStages: [
    { id: 'PROSPECTING', label: 'Prospecting', probability: 10, color: '#64748b' },
    { id: 'QUALIFICATION', label: 'Qualification', probability: 25, color: '#0ea5e9' },
    { id: 'PROPOSAL', label: 'Proposal / Quote', probability: 50, color: '#f59e0b' },
    { id: 'NEGOTIATION', label: 'Negotiation', probability: 75, color: '#8b5cf6' },
    { id: 'CLOSED_WON', label: 'Closed Won', probability: 100, color: '#10b981' },
    { id: 'CLOSED_LOST', label: 'Closed Lost', probability: 0, color: '#ef4444' },
  ],
  leadSources: ['Direct Referral', 'Website', 'Trade Fair / Expo', 'Cold Call', 'LinkedIn', 'Partner Channel', 'Existing Client'],
  industries: ['Electrical & Power', 'Manufacturing', 'Construction & Infra', 'Renewable Energy', 'Automotive', 'Technology', 'Trading & Distribution', 'Other'],
  businessCategories: ['Enterprise / Corporate', 'SME / MSME', 'Government / PSU', 'EPC Contractor', 'Retail / Dealer', 'Consultant', 'Other'],
  defaultCurrency: '₹',
};

export const INITIAL_CRM_ACCOUNTS: CRMAccount[] = [
  {
    id: 'ACC - 001',
    name: 'Tata Power Solar Systems Ltd',
    businessCategory: 'Enterprise / Corporate',
    industry: 'Renewable Energy',
    phone: '+91 22 6665 8282',
    altPhone: '+91 22 6665 8200',
    email: 'procurement@tatapower.com',
    website: 'https://tatapower.com',
    address: 'C-52, Sector 62, Electronic City',
    billingCity: 'Mumbai',
    billingState: 'Maharashtra',
    pincode: '400001',
    country: 'India',
    billingCountry: 'India',
    annualRevenue: 50000000,
    creditLimit: 2500000,
    status: 'ACTIVE',
    assignedTo: 'Admin Operator',
    createdAt: new Date().toISOString(),
    notes: 'Key client for high-voltage transmission and substation equipment supplies.',
    editHistory: [
      {
        timestamp: new Date().toISOString(),
        changedBy: 'Admin Operator',
        action: 'CREATED',
        details: 'Account created with status Active Client'
      }
    ]
  },
  {
    id: 'ACC - 002',
    name: 'Larsen & Toubro Ltd (ECC Div)',
    businessCategory: 'EPC Contractor',
    industry: 'Construction & Infra',
    phone: '+91 44 2252 6000',
    altPhone: '+91 44 2252 6100',
    email: 'supplychain@lntecc.com',
    website: 'https://larsentoubro.com',
    address: 'Mount Poonamallee Road, Manapakkam',
    billingCity: 'Chennai',
    billingState: 'Tamil Nadu',
    pincode: '600089',
    country: 'India',
    billingCountry: 'India',
    annualRevenue: 120000000,
    creditLimit: 5000000,
    status: 'ACTIVE',
    assignedTo: 'Finance Manager',
    createdAt: new Date().toISOString(),
    notes: 'Regular vendor for industrial switchgears and electrical control panels.',
    editHistory: [
      {
        timestamp: new Date().toISOString(),
        changedBy: 'Finance Manager',
        action: 'CREATED',
        details: 'Account created with status Active Client'
      }
    ]
  },
  {
    id: 'ACC - 003',
    name: 'Schneider Electric India Pvt Ltd',
    businessCategory: 'Enterprise / Corporate',
    industry: 'Electrical & Power',
    phone: '+91 124 456 7890',
    altPhone: '+91 124 456 7899',
    email: 'oem.orders@se.com',
    website: 'https://se.com/in',
    address: '9th Floor, DLF Cyber City, Tower C',
    billingCity: 'Gurugram',
    billingState: 'Haryana',
    pincode: '122002',
    country: 'India',
    billingCountry: 'India',
    annualRevenue: 35000000,
    creditLimit: 1500000,
    status: 'PROSPECT',
    assignedTo: 'Admin Operator',
    createdAt: new Date().toISOString(),
    notes: 'Exploring OEM partnership for distribution panel accessories.',
    editHistory: [
      {
        timestamp: new Date().toISOString(),
        changedBy: 'Admin Operator',
        action: 'CREATED',
        details: 'Account created with status Prospect / Lead'
      }
    ]
  }
];

export const INITIAL_CRM_CONTACTS: CRMContact[] = [
  {
    id: 'CON - 001',
    accountId: 'ACC - 001',
    accountName: 'Tata Power Solar Systems Ltd',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@tatapower.com',
    phone: '+91 98201 12345',
    mobile: '+91 98201 12345',
    designation: 'Head of Electrical Procurement',
    department: 'Procurement & Vendor Mgmt',
    isPrimary: true,
    status: 'ACTIVE',
    assignedTo: 'Admin Operator',
    createdAt: new Date().toISOString(),
    notes: 'Main point of contact for solar project transformer bidding.',
    editHistory: [
      {
        timestamp: new Date().toISOString(),
        changedBy: 'Admin Operator',
        action: 'CREATED',
        details: 'Contact created with status Active'
      }
    ]
  },
  {
    id: 'CON - 002',
    accountId: 'ACC - 002',
    accountName: 'Larsen & Toubro Ltd (ECC Div)',
    firstName: 'Priya',
    lastName: 'Narayanan',
    name: 'Priya Narayanan',
    email: 'p.narayanan@lntecc.com',
    phone: '+91 94440 98765',
    mobile: '+91 94440 98765',
    designation: 'Senior Project Engineer',
    department: 'Substation Projects',
    isPrimary: true,
    status: 'ACTIVE',
    assignedTo: 'Admin Operator',
    createdAt: new Date().toISOString(),
    notes: 'Handles technical vendor approvals and drawing sign-offs.',
    editHistory: [
      {
        timestamp: new Date().toISOString(),
        changedBy: 'Admin Operator',
        action: 'CREATED',
        details: 'Contact created with status Active'
      }
    ]
  },
  {
    id: 'CON - 003',
    accountId: 'ACC - 003',
    accountName: 'Schneider Electric India Pvt Ltd',
    firstName: 'Amit',
    lastName: 'Deshmukh',
    name: 'Amit Deshmukh',
    email: 'amit.deshmukh@se.com',
    phone: '+91 98110 54321',
    mobile: '+91 98110 54321',
    designation: 'Regional Sourcing Manager',
    department: 'Supply Chain',
    isPrimary: true,
    status: 'ACTIVE',
    assignedTo: 'Admin Operator',
    createdAt: new Date().toISOString(),
    notes: 'Initiated preliminary OEM pricing discussions.',
    editHistory: [
      {
        timestamp: new Date().toISOString(),
        changedBy: 'Admin Operator',
        action: 'CREATED',
        details: 'Contact created with status Active'
      }
    ]
  }
];

export const INITIAL_CRM_OPPORTUNITIES: CRMOpportunity[] = [
  {
    id: 'OPP-3001',
    title: '500kVA Transformer & HT Panel Supply - Phase 2',
    accountId: 'ACC-1001',
    accountName: 'Tata Power Solar Systems Ltd',
    contactId: 'CON-2001',
    contactName: 'Rajesh Sharma',
    amount: 1850000,
    stage: 'NEGOTIATION',
    probability: 75,
    expectedCloseDate: '2026-09-30',
    leadSource: 'Existing Client',
    assignedTo: 'Admin Operator',
    createdAt: new Date().toISOString(),
    notes: 'Commercial negotiations on payment terms and delivery timeline.'
  },
  {
    id: 'OPP-3002',
    title: 'Metro Rail Substation Switchgear Package',
    accountId: 'ACC-1002',
    accountName: 'Larsen & Toubro Ltd (ECC Div)',
    contactId: 'CON-2002',
    contactName: 'Priya Narayanan',
    amount: 4200000,
    stage: 'PROPOSAL',
    probability: 50,
    expectedCloseDate: '2026-10-15',
    leadSource: 'Trade Fair / Expo',
    assignedTo: 'Finance Manager',
    createdAt: new Date().toISOString(),
    notes: 'Technical bid submitted. Awaiting commercial evaluation.'
  },
  {
    id: 'OPP-3003',
    title: 'Smart Metering & Panel Components Batch Order',
    accountId: 'ACC-1003',
    accountName: 'Schneider Electric India Pvt Ltd',
    contactId: 'CON-2003',
    contactName: 'Amit Deshmukh',
    amount: 920000,
    stage: 'QUALIFICATION',
    probability: 25,
    expectedCloseDate: '2026-11-20',
    leadSource: 'Direct Referral',
    assignedTo: 'Admin Operator',
    createdAt: new Date().toISOString(),
    notes: 'Initial sample approval underway.'
  }
];
