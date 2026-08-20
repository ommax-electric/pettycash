export type CRMTab = 'DASHBOARD' | 'ACCOUNTS' | 'CONTACTS' | 'OPPORTUNITIES' | 'SETTINGS';

export interface AccountEditHistoryEntry {
  timestamp: string;
  changedBy: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'OWNER_REASSIGNED';
  details?: string;
  oldStatus?: string;
  newStatus?: string;
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
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
  hasAlternativeAddress?: boolean;
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

export interface CountryCodeConfig {
  code: string;       // e.g. '+91'
  name: string;       // e.g. 'India'
  flag: string;       // e.g. '🇮🇳'
  digitLength?: number; // e.g. 10
  isCustom?: boolean;
}

export const STANDARD_COUNTRY_CODES: CountryCodeConfig[] = [
  { code: '+91', name: 'India', flag: '🇮🇳', digitLength: 10 },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪', digitLength: 9 },
  { code: '+1', name: 'United States / Canada', flag: '🇺🇸', digitLength: 10 },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', digitLength: 10 },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', digitLength: 8 },
  { code: '+49', name: 'Germany', flag: '🇩🇪', digitLength: 10 },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', digitLength: 9 },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾', digitLength: 9 },
  { code: '+61', name: 'Australia', flag: '🇦🇺', digitLength: 9 },
  { code: '+81', name: 'Japan', flag: '🇯🇵', digitLength: 10 },
  { code: '+86', name: 'China', flag: '🇨🇳', digitLength: 11 },
  { code: '+33', name: 'France', flag: '🇫🇷', digitLength: 9 },
  { code: '+39', name: 'Italy', flag: '🇮🇹', digitLength: 10 },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱', digitLength: 9 },
  { code: '+974', name: 'Qatar', flag: '🇶🇦', digitLength: 8 },
  { code: '+968', name: 'Oman', flag: '🇴🇲', digitLength: 8 },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭', digitLength: 8 },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼', digitLength: 8 },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩', digitLength: 10 },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', digitLength: 9 },
  { code: '+977', name: 'Nepal', flag: '🇳🇵', digitLength: 10 }
];

export const getAllCountryCodes = (settings?: { customCountryCodes?: CountryCodeConfig[]; removedCountryCodes?: string[] }): CountryCodeConfig[] => {
  const removedSet = new Set(settings?.removedCountryCodes || []);
  const standard = STANDARD_COUNTRY_CODES.filter(c => !removedSet.has(c.code));
  const custom = (settings?.customCountryCodes || []).filter(c => !removedSet.has(c.code));
  
  // Merge, prioritizing custom if code conflicts
  const map = new Map<string, CountryCodeConfig>();
  standard.forEach(c => map.set(c.code, c));
  custom.forEach(c => map.set(c.code, { ...c, isCustom: true }));
  return Array.from(map.values());
};

export const getCountryFromCode = (code: string, settings?: { customCountryCodes?: CountryCodeConfig[]; removedCountryCodes?: string[] } | CountryCodeConfig[]): CountryCodeConfig => {
  let list: CountryCodeConfig[];
  if (Array.isArray(settings)) {
    list = settings;
  } else if (settings) {
    list = getAllCountryCodes(settings);
  } else {
    list = STANDARD_COUNTRY_CODES;
  }
  const found = list.find(c => c.code === code);
  return found || { code, name: code, flag: '🌐', digitLength: 10 };
};

/**
 * Normalizes a phone number to its last 10 digits (or clean digits if fewer).
 * Strips all spaces, brackets, hyphens, and leading country codes / zeros.
 */
export const normalizePhoneNumber = (rawPhone?: string | null): string => {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

/**
 * Normalizes a company / account name by stripping common corporate suffixes,
 * punctuation, and whitespace so "DHL Limited", "DHL Private Limited", and "DHL Pvt Ltd"
 * all normalize to the base keyword "dhl".
 */
export const normalizeCompanyName = (rawName?: string | null): string => {
  if (!rawName) return '';
  let cleaned = rawName.toLowerCase().trim();
  
  // Replace punctuation with spaces
  cleaned = cleaned.replace(/[\.\,\-\_\&\/\(\)\'\"]/g, ' ');
  
  // Common corporate suffixes to strip
  const suffixes = [
    'private limited',
    'pvt limited',
    'pvt ltd',
    'pvt. ltd.',
    'pvt.ltd',
    'pvtltd',
    'private ltd',
    'limited',
    'ltd',
    'llp',
    'inc',
    'incorporated',
    'corp',
    'corporation',
    'co',
    'company',
    'enterprises',
    'enterprise',
    'industries',
    'industry',
    'technologies',
    'tech',
    'solutions',
    'services',
    'holdings',
    'group',
    'intl',
    'international'
  ];

  // Tokenize and clean
  for (const suffix of suffixes) {
    const regex = new RegExp(`\\b${suffix}\\b`, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  }

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};

/**
 * Parses a combined phone string like "+91 94426 20075" or "9442620075"
 * into countryCode and localNumber.
 */
export const parsePhoneNumber = (fullPhone?: string | null, defaultCode = '+91'): { countryCode: string; localNumber: string } => {
  if (!fullPhone) return { countryCode: defaultCode, localNumber: '' };
  const trimmed = fullPhone.trim();
  
  // Check if starts with a known country code
  for (const c of STANDARD_COUNTRY_CODES) {
    if (trimmed.startsWith(c.code)) {
      const rest = trimmed.slice(c.code.length).trim();
      return { countryCode: c.code, localNumber: rest };
    }
  }

  if (trimmed.startsWith('+')) {
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex !== -1) {
      return { countryCode: trimmed.slice(0, spaceIndex), localNumber: trimmed.slice(spaceIndex + 1).trim() };
    }
  }

  return { countryCode: defaultCode, localNumber: trimmed };
};

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
  defaultCountryCode?: string;
  allowedCountryCodes?: string[];
  recentCountryCodes?: string[];
  customCountryCodes?: CountryCodeConfig[];
  removedCountryCodes?: string[];
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
  defaultCountryCode: '+91',
  allowedCountryCodes: ['+91', '+971', '+1', '+44', '+65', '+49', '+966', '+60', '+61'],
  recentCountryCodes: ['+91'],
  customCountryCodes: [],
  removedCountryCodes: []
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
