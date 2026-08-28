export type QuotationStatus = 'DRAFT' | 'SENT' | 'UNDER_REVISION' | 'WON' | 'LOST' | 'EXPIRED';

export type QuotationType = 'SOLAR_EPC' | 'STANDARD_BOQ';

export type SolarSystemType = 'ON_GRID' | 'HYBRID' | 'OFF_GRID';

export type SolarScheme = 'PM_SURYA_GHAR' | 'COMMERCIAL_NON_SUBSIDY' | 'CUSTOM';

export interface QuotationRevision {
  revisionCode: string; // e.g. 'R-0', 'R-1', 'R-2'
  timestamp: string;
  author: string;
  reason?: string;
  basicCost: number;
  grandTotal: number;
  changesSummary?: string;
}

export interface BOQItem {
  id: string;
  slNo: number;
  itemDescription: string;
  quantity: string;
  unitPrice?: number;
  totalPrice?: number;
  brand?: string;
  notes?: string;
}

export interface BrandDeclarationItem {
  slNo: number;
  description: string;
  brand: string;
  warrantySpec: string;
}

export interface SolarBenefitRow {
  solarSystem: string;
  biMonthlyGenerationUnits: string;
  biMonthlyEbSavings: string;
  annualSavings: string;
  fiveYearsSavings: string;
  tenYearsSavings: string;
}

export interface LetterheadConfig {
  headerImageUrl: string;
  footerImageUrl: string;
  headerScale: number; // 0.5 to 1.5 (default 1.0)
  headerOffsetX: number; // -100 to 100 px
  headerOffsetY: number; // -100 to 100 px
  headerHeight: number; // px
  footerScale: number; // 0.5 to 1.5 (default 1.0)
  footerOffsetX: number; // -100 to 100 px
  footerOffsetY: number; // -100 to 100 px
  footerHeight: number; // px
  marginTopMm: number; // padding in mm
  marginBottomMm: number; // padding in mm
  showLetterheadOnAllPages: boolean;
}

export interface SolarQuotation {
  id: string;
  quotationNo: string; // e.g. "QUO-2026-0024"
  offerNo: string; // e.g. "SP26270024R1"
  revisionIndex: number; // 0 for R-0, 1 for R-1, etc.
  revisionCode: string; // "R-0", "R-1", "R-2"
  title: string;
  type: QuotationType;
  status: QuotationStatus;
  
  // Link to CRM
  opportunityId?: string;
  opportunityTitle?: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  // Project Info (Page 1)
  projectName: string;
  clientName: string;
  location: string;
  state: string;
  scheme: string;
  targetSegment?: string;
  connectionType?: string;
  subject: string;
  salutation: string;
  introOpeningText?: string;
  date: string; // YYYY-MM-DD
  priceValidityDate: string; // YYYY-MM-DD
  
  // Solar Technical Specs
  capacityKw: number; // e.g. 4.95
  capacityKwp: number; // e.g. 4.95
  systemType: SolarSystemType;
  gridEvacuationVoltage: string; // e.g. "415V / 230V"
  
  // Scope of Work
  supplyIncludes: string[];
  installationIncludes: string[];
  
  // Costing & BOQ (Page 2)
  boqItems: BOQItem[];
  basicCost: number; // e.g. 312018.00
  gstGoodsPercent: number; // default 80%
  gstGoodsRate: number; // default 5%
  gstGoodsAmount: number; // calculated e.g. 12762.00
  gstServicesPercent: number; // default 20%
  gstServicesRate: number; // default 18%
  gstServicesAmount: number; // calculated e.g. 10220.00
  totalGst: number; // 22982.00
  specialDiscount: number; // e.g. 5000.00
  grandTotal: number; // e.g. 330000.00
  
  // Subsidy & Payment Terms
  subsidyNote: string;
  advancePaymentPercent: number; // 50
  deliveryPaymentPercent: number; // 40
  installationPaymentPercent: number; // 10
  
  // Banking & Terms (Page 3)
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  ifscCode: string;
  micrNumber: string;
  bankAddress: string;
  termsAndConditions: string[];
  moduleWarrantyYears: number; // 25
  inverterWarrantyYears: number; // 5
  balanceOfSystemWarrantyYears: number; // 1
  projectCompletionWeeks: string; // "2 to 3 weeks"
  
  // Savings & Brand Matrix (Page 4)
  tariffPerUnit: number; // e.g. 8.00 (TNEB)
  benefitsTable: SolarBenefitRow[];
  tariffAssumptions: string[];
  brandDeclarations: BrandDeclarationItem[];
  brandNotes: string[];
  
  // Assumptions & Exclusions (Page 5)
  technicalAssumptions: string[];
  exclusions: string[];
  warrantyDisclaimer: string;
  authorizedSignatoryName: string;
  signatoryDesignation: string;
  companyStampEnabled: boolean;
  companyStampUrl?: string;
  companyStampWidth?: number;
  companyStampRotate?: number;
  companyStampOpacity?: number;
  
  // Letterhead config
  letterhead: LetterheadConfig;
  
  // Audit & Revisions
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
  revisionHistory: QuotationRevision[];
  notes?: string;
}

export const DEFAULT_LETTERHEAD_CONFIG: LetterheadConfig = {
  headerImageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
  footerImageUrl: '',
  headerScale: 1.0,
  headerOffsetX: 0,
  headerOffsetY: 0,
  headerHeight: 80,
  footerScale: 1.0,
  footerOffsetX: 0,
  footerOffsetY: 0,
  footerHeight: 70,
  marginTopMm: 12,
  marginBottomMm: 12,
  showLetterheadOnAllPages: true,
};

export const DEFAULT_SUPPLY_INCLUDES = [
  'Solar PV Modules (SERVOTEC – Made in India)',
  'Solar hybrid Inverter Servotec',
  'Battery (Optional / As per requirement)',
  'Module Mounting Structures (Hot-Dip Galvanized / Anodized)',
  'ACDB / DCDB with complete protection & surge arrestors',
  'DC & AC cables, earthing materials, conduits, breakers, and accessories'
];

export const DEFAULT_INSTALLATION_INCLUDES = [
  'Module installation and structural alignment',
  'Inverter installation and electrical interconnection',
  'AC/DC cabling and precision termination',
  'Earthing and lightning protection system deployment',
  'Testing, pre-commissioning checks, and final grid synchronization',
  'Support for TN / State DISCOM Net Metering application (Net meter payment and statutory fees are in client\'s scope)'
];

export const DEFAULT_TERMS_AND_CONDITIONS = [
  'Prices quoted are subject to applicable statutory duties at the time of work order.',
  'GST rates are as per current government notifications. Any changes will be borne by the customer.',
  'Packing & Forwarding: Included.',
  'Installation & Commissioning: Included.',
  'Net Metering and EB approvals payment is not included and shall be paid by the customer.',
  'DCDB, Inverter, and ACDB shall be installed near the customer LT panel. Solar Generation Meter shall be near the LT panel.',
  'Any additional scope beyond this offer will be charged extra on actuals.',
  'Price Validity: 4 weeks from the date of quotation.'
];

export const DEFAULT_BRAND_DECLARATIONS: BrandDeclarationItem[] = [
  { slNo: 1, description: 'Solar Panels', brand: 'Servotec', warrantySpec: '25 Years Performance Warranty' },
  { slNo: 2, description: 'On-Grid Solar Inverter', brand: 'Servotec', warrantySpec: '10/5 Years Manufacturer Warranty' },
  { slNo: 3, description: 'Solar Mounting Structure – Low Height', brand: 'JSW', warrantySpec: 'Hot-Dip Galvanized (HDG) Steel Structure' },
  { slNo: 4, description: 'AC Distribution Box (ACDB)', brand: 'MCB: C&S, SPD: Finder', warrantySpec: 'Complete AC Protection' },
  { slNo: 5, description: 'DC Distribution Box (DCDB)', brand: 'MCB: C&S, SPD: Finder', warrantySpec: 'Complete DC Protection' },
  { slNo: 6, description: 'MC4 Solar Connector', brand: 'Ninbo', warrantySpec: 'IP67 Rated, UV Resistant' },
  { slNo: 7, description: '6 Sq.mm Solar DC Cable (Panels to Inverter)', brand: 'Polycab', warrantySpec: 'UV Resistant Solar Cable' },
  { slNo: 8, description: '6 Sq.mm Aluminium Green Earthing Cable (Structure to Inverter)', brand: 'Polycab', warrantySpec: 'IS Standard' },
  { slNo: 9, description: '6 Sq.mm Copper Armoured Earth Cable (Inverter to Earth Pit)', brand: 'Polycab', warrantySpec: 'IS Standard' },
  { slNo: 10, description: 'AC Power Aluminium Armoured Cable (Inverter to EB Meter)', brand: 'Polycab', warrantySpec: 'IS Standard' },
  { slNo: 11, description: '1 Meter Earth Rod with Earth Enhancing Compound', brand: 'Reputed', warrantySpec: 'Complete Earthing Kit' }
];

export const DEFAULT_BRAND_NOTES = [
  'In case of non-availability of any specified brand or model, an equivalent or higher-specification product may be supplied with prior approval from the customer.',
  'Manufacturer warranties shall be applicable as per the respective manufacturer\'s standard warranty terms and conditions.'
];

export const DEFAULT_TECHNICAL_ASSUMPTIONS = [
  'Shadow-free roof space to be provided by the customer.',
  'Approximate standard cable lengths considered:\n  • DC Cable: 10 meters per run\n  • AC Cable: 40 meters (Inverter to ACDB to LT Panel)\n  • Earthing Cable: 40 meters',
  'Additional cable or trenching requirements beyond standard allowance will be charged extra.'
];

export const DEFAULT_EXCLUSIONS = [
  'Structural stability of roof/building.',
  'Roof strengthening or additional civil infrastructure, if required.',
  'All statutory permits, approvals, and official DISCOM application fees.',
  'System security & on-site guarding.',
  'Reverse Power Relay.',
  'External specialized Lightning Arrestor mast, if requested beyond standard kit.',
  'Erection insurance during installation.',
  'Any item or service not specifically mentioned in this quotation.',
  'Additional statutory taxes/duties imposed after contract signing.',
  'Environmental sensors, internet connection, and computer for monitoring.'
];

export const DEFAULT_SAVINGS_BENEFITS: SolarBenefitRow[] = [
  {
    solarSystem: '3 kW',
    biMonthlyGenerationUnits: '800 Units',
    biMonthlyEbSavings: '₹ 6,400',
    annualSavings: '₹ 38,400',
    fiveYearsSavings: '₹ 1,92,000',
    tenYearsSavings: '₹ 3,84,000'
  },
  {
    solarSystem: '5 kW',
    biMonthlyGenerationUnits: '1,334 Units',
    biMonthlyEbSavings: '₹ 10,672',
    annualSavings: '₹ 64,032',
    fiveYearsSavings: '₹ 3,20,160',
    tenYearsSavings: '₹ 6,40,320'
  },
  {
    solarSystem: '10 kW',
    biMonthlyGenerationUnits: '2,666 Units',
    biMonthlyEbSavings: '₹ 21,328',
    annualSavings: '₹ 1,27,968',
    fiveYearsSavings: '₹ 6,39,840',
    tenYearsSavings: '₹ 12,79,680'
  }
];

export const INITIAL_SOLAR_QUOTATIONS: SolarQuotation[] = [
  {
    id: 'QUO-2026-001',
    quotationNo: 'QUO-2026-001',
    offerNo: 'SP26270024R1',
    revisionIndex: 1,
    revisionCode: 'R-1',
    title: '4.95 kWp Rooftop Solar PV Power Plant Proposal',
    type: 'SOLAR_EPC',
    status: 'SENT',
    opportunityId: 'DEAL - 001',
    opportunityTitle: '500kVA Transformer & HT Panel Supply - Phase 2',
    accountId: 'ACC - 001',
    accountName: 'Tata Power Solar Systems Ltd',
    contactId: 'CON - 001',
    contactName: 'Mr Prakash',
    contactPhone: '+91 98400 12345',
    contactEmail: 'prakash@tatapower.com',
    projectName: 'Mr Prakash',
    clientName: 'Mr Prakash',
    location: 'Sathambadi, Ariyalur',
    state: 'Tamil Nadu',
    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
    subject: 'Proposal for 4.95 kWp Roof top Solar',
    salutation: 'Dear Valued Customer,',
    date: '2026-07-16',
    priceValidityDate: '2026-08-31',
    capacityKw: 4.95,
    capacityKwp: 4.95,
    systemType: 'ON_GRID',
    gridEvacuationVoltage: '230V Single Phase',
    supplyIncludes: DEFAULT_SUPPLY_INCLUDES,
    installationIncludes: DEFAULT_INSTALLATION_INCLUDES,
    boqItems: [
      { id: 'boq-1', slNo: 1, itemDescription: 'SERVOTEC HHV [550 Wp] Mono Perc DCR', quantity: '4.95 kWp' },
      { id: 'boq-2', slNo: 2, itemDescription: 'Battery', quantity: 'Nill' },
      { id: 'boq-3', slNo: 3, itemDescription: 'Table RCC Mounting Structure Elevation for 5 kW', quantity: '7 Feet' },
      { id: 'boq-4', slNo: 4, itemDescription: '5 kVA Single Phase On-Grid Hybrid Inverter – Make: SERVOTEC', quantity: '1 Nos' },
      { id: 'boq-5', slNo: 5, itemDescription: 'DC Cables, Array Junction Boxes & Accessories', quantity: '4.95 kWp' },
      { id: 'boq-6', slNo: 6, itemDescription: 'AC Side Supply (Cables, ACDB, Earthing & Accessories)', quantity: '4.95 kWp' },
      { id: 'boq-7', slNo: 7, itemDescription: 'Installation and Commissioning', quantity: '4.95 kWp' }
    ],
    basicCost: 312018.00,
    gstGoodsPercent: 80,
    gstGoodsRate: 5,
    gstGoodsAmount: 12762.00,
    gstServicesPercent: 20,
    gstServicesRate: 18,
    gstServicesAmount: 10220.00,
    totalGst: 22982.00,
    specialDiscount: 5000.00,
    grandTotal: 330000.00,
    subsidyNote: 'Subsidy of Rs. 78,000 for 3kW, Rs. 60,000 for 2kW and Rs. 30,000 for 1kW will be credited to the customer\'s account after uploading required documents on the portal.',
    advancePaymentPercent: 50,
    deliveryPaymentPercent: 40,
    installationPaymentPercent: 10,
    beneficiaryName: 'OMMAX ELECTRIC PRIVATE LIMITED',
    bankName: 'HDFC BANK LIMITED',
    accountNumber: '50200062048510',
    accountType: 'Current Account',
    ifscCode: 'HDFC0008818',
    micrNumber: '600240154',
    bankAddress: 'HDFC BANK LIMITED, Chrompet, Chennai, Tamil Nadu. Pin Code: 600044',
    termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
    moduleWarrantyYears: 25,
    inverterWarrantyYears: 5,
    balanceOfSystemWarrantyYears: 1,
    projectCompletionWeeks: '2 to 3 weeks',
    tariffPerUnit: 8.00,
    benefitsTable: DEFAULT_SAVINGS_BENEFITS,
    tariffAssumptions: [
      'Based on actual project performance in Chennai: 3 kW = 800 to 900 units/Bi-month',
      'TNEB electricity tariff considered: ₹8/unit',
      'Future EB tariff increases will further improve the savings and ROI.'
    ],
    brandDeclarations: DEFAULT_BRAND_DECLARATIONS,
    brandNotes: [
      'In case of non-availability of any specified brand or model, an equivalent or higher-specification product may be supplied with prior approval from the customer.',
      'Manufacturer warranties shall be applicable as per the respective manufacturer\'s standard warranty terms and conditions.'
    ],
    technicalAssumptions: DEFAULT_TECHNICAL_ASSUMPTIONS,
    exclusions: DEFAULT_EXCLUSIONS,
    warrantyDisclaimer: 'Warranty does not cover damages due to natural calamities, acts of God, theft, vandalism, third-party servicing, or customer negligence. The equipment manufacturers shall not be liable for any indirect or consequential damages arising from the above.',
    authorizedSignatoryName: 'Authorized Signatory',
    signatoryDesignation: 'OMMAX ELECTRIC PRIVATE LIMITED',
    companyStampEnabled: true,
    letterhead: DEFAULT_LETTERHEAD_CONFIG,
    createdBy: 'Admin Operator',
    createdAt: '2026-07-16T10:30:00Z',
    updatedAt: '2026-07-16T14:15:00Z',
    sentAt: '2026-07-16T14:20:00Z',
    revisionHistory: [
      {
        revisionCode: 'R-0',
        timestamp: '2026-07-15T09:00:00Z',
        author: 'Admin Operator',
        reason: 'Initial proposal draft',
        basicCost: 317018.00,
        grandTotal: 335000.00,
        changesSummary: 'Initial proposal prepared without special discount.'
      },
      {
        revisionCode: 'R-1',
        timestamp: '2026-07-16T14:15:00Z',
        author: 'Admin Operator',
        reason: 'Applied ₹5,000 Special Discount after client negotiation',
        basicCost: 312018.00,
        grandTotal: 330000.00,
        changesSummary: 'Added ₹5,000 special discount; revised net payable to ₹3,30,000.'
      }
    ],
    notes: 'Client requested elevated structure of 7 feet.'
  }
];

export const calculateSolarPricing = (basicCost: number, specialDiscount: number = 0) => {
  const goodsPortion = basicCost * 0.80;
  const gstGoods = goodsPortion * 0.05;
  const servicesPortion = basicCost * 0.20;
  const gstServices = servicesPortion * 0.18;
  const totalGst = gstGoods + gstServices;
  const grandTotal = Math.round((basicCost + totalGst - specialDiscount) * 100) / 100;

  return {
    goodsPortion,
    gstGoods,
    servicesPortion,
    gstServices,
    totalGst,
    grandTotal
  };
};

export const getNextOfferNumber = (existingCount: number = 1, revisionIdx: number = 0): string => {
  const yy = '26';
  const nextSeq = String(270024 + existingCount).padStart(6, '0');
  return `SP${yy}${nextSeq}R${revisionIdx}`;
};

export const formatCurrencyINR = (amount: number, symbol: string = '₹'): string => {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export interface MasterCatalogProduct {
  id: string;
  category: 'MODULE' | 'INVERTER' | 'BATTERY' | 'STRUCTURE' | 'ELECTRICAL' | 'SERVICES' | 'OTHER';
  name: string;
  brand: string;
  modelSpec: string;
  defaultUnit: string;
  defaultUnitPrice: number;
  warrantyPeriod: string;
  isDefaultBOQ: boolean;
}

export interface QuotationMasterConfig {
  // 1. General
  offerPrefix: string;
  offerYearCode: string;
  offerStartingSeq: number;
  defaultPriceValidityWeeks: number;
  defaultSubjectTemplate: string;
  defaultToSalutation: string;

  // 2. Intro
  introOpeningText: string;
  availableSystemTypes: { id: string; label: string; description?: string }[];
  availableSegments: { id: string; label: string; description?: string }[];
  availableSchemes: { id: string; label: string; description?: string }[];

  // 3. Scope of Work
  supplyDropdownOptions: {
    moduleOptions: string[];
    inverterOptions: string[];
    batteryOptions: string[];
    structureOptions: string[];
    protectionOptions: string[];
    cablingOptions: string[];
  };
  defaultSupplyIncludes: string[];
  defaultInstallationIncludes: string[];

  // 4. Payment Terms
  defaultAdvancePercent: number;
  defaultDeliveryPercent: number;
  defaultInstallationPercent: number;
  defaultSubsidyNote: string;

  // 5. Banking Details
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  ifscCode: string;
  micrNumber: string;
  bankAddress: string;
  upiId?: string;

  // 6. Terms & Conditions
  termsAndConditions: string[];

  // 7. Warranty
  moduleWarrantyYears: number;
  inverterWarrantyOptions: string[];
  defaultInverterWarranty: string;
  bosWarrantyOptions: string[];
  defaultBosWarranty: string;
  workmanshipWarrantyYears: number;

  // 8. Project Completion
  defaultCompletionWeeks: string;
  completionMilestones: string[];

  // 9. Estimated Solar Benefits
  defaultTariffPerUnit: number;
  benefitsTable: SolarBenefitRow[];
  tariffAssumptions: string[];

  // 10. Brand Declaration
  brandDeclarations: BrandDeclarationItem[];
  brandNotes: string[];

  // 11. Technical Assumptions
  technicalAssumptions: string[];

  // 12. Exclusions
  exclusions: string[];

  // 13. Disclaimer
  warrantyDisclaimer: string;

  // 14. Add-on & Pricing
  letterhead: LetterheadConfig;
  authorizedSignatoryName: string;
  signatoryDesignation: string;
  companyStampEnabled: boolean;
  companyStampUrl?: string;
  companyStampRotate?: number;
  companyStampOpacity?: number;
  companyStampWidth?: number;
  gstGoodsPercent: number;
  gstGoodsRate: number;
  gstServicesPercent: number;
  gstServicesRate: number;
  productsCatalog: MasterCatalogProduct[];
}

export const DEFAULT_MASTER_CATALOG_PRODUCTS: MasterCatalogProduct[] = [
  {
    id: 'prod-1',
    category: 'MODULE',
    name: 'SERVOTEC HHV Mono Perc DCR Solar Panel',
    brand: 'Servotec',
    modelSpec: '550 Wp TopCon / Mono Perc DCR High Efficiency',
    defaultUnit: 'kWp',
    defaultUnitPrice: 24500,
    warrantyPeriod: '25 Years Performance / 12 Years Product',
    isDefaultBOQ: true
  },
  {
    id: 'prod-2',
    category: 'INVERTER',
    name: 'Servotec On-Grid / Hybrid Solar Inverter',
    brand: 'Servotec',
    modelSpec: 'Single Phase / Three Phase MPPT Grid-Tied Inverter',
    defaultUnit: 'Nos',
    defaultUnitPrice: 38000,
    warrantyPeriod: '5 Years / 10 Years Manufacturer Warranty',
    isDefaultBOQ: true
  },
  {
    id: 'prod-3',
    category: 'BATTERY',
    name: 'Lithium Ferro Phosphate (LFP) Solar Battery',
    brand: 'Servotec / Exide',
    modelSpec: '48V 100Ah 4.8kWh Wall Mount LFP Battery',
    defaultUnit: 'Nos',
    defaultUnitPrice: 95000,
    warrantyPeriod: '5 Years Warranty',
    isDefaultBOQ: false
  },
  {
    id: 'prod-4',
    category: 'STRUCTURE',
    name: 'Table RCC Mounting Structure (Elevated 7-10 Ft)',
    brand: 'JSW HDG Steel',
    modelSpec: 'Hot-Dip Galvanized 80 Micron Elevated Structure',
    defaultUnit: 'kWp',
    defaultUnitPrice: 6500,
    warrantyPeriod: '10 Years Structural Integrity',
    isDefaultBOQ: true
  },
  {
    id: 'prod-5',
    category: 'ELECTRICAL',
    name: 'ACDB & DCDB Surge Protection Boxes with Enclosure',
    brand: 'C&S / Finder / Hensel',
    modelSpec: 'IP65 Enclosure, Type II SPD, Dual Pole MCB/Isolator',
    defaultUnit: 'Set',
    defaultUnitPrice: 8500,
    warrantyPeriod: '2 Years Replacement Warranty',
    isDefaultBOQ: true
  },
  {
    id: 'prod-6',
    category: 'ELECTRICAL',
    name: 'Solar DC & AC Armoured Cables & Earthing System',
    brand: 'Polycab / Havells',
    modelSpec: '6 sq.mm XLPO UV Solar Cable + 4 Core Cu Armoured + 3 Pit Earth Rods',
    defaultUnit: 'Lot',
    defaultUnitPrice: 14500,
    warrantyPeriod: '5 Years Manufacturer Warranty',
    isDefaultBOQ: true
  },
  {
    id: 'prod-7',
    category: 'SERVICES',
    name: 'Installation, Testing & Grid Commissioning',
    brand: 'OMMAX Engineering Team',
    modelSpec: 'Turnkey Mechanical, Civil, Electrical & Discom Net-Metering Liaison',
    defaultUnit: 'kWp',
    defaultUnitPrice: 4500,
    warrantyPeriod: '1 Year Free O&M Workmanship',
    isDefaultBOQ: true
  }
];

export const DEFAULT_QUOTATION_MASTER_CONFIG: QuotationMasterConfig = {
  offerPrefix: 'SP',
  offerYearCode: '2627',
  offerStartingSeq: 24,
  defaultPriceValidityWeeks: 4,
  defaultSubjectTemplate: 'Proposal for {capacityKwp} kWp Roof top Solar Power Plant',
  defaultToSalutation: 'Dear Valued Customer,',

  introOpeningText: 'We thank you for giving us an opportunity to submit our Techno-Commercial Proposal for Design, Engineering, Supply, Installation, Testing & Commissioning of Rooftop Solar PV Power Plant.',
  availableSystemTypes: [
    { id: 'ON_GRID', label: 'On Grid-Connected Solar PV Power Plant', description: 'Synchronized with DISCOM Grid with Bi-directional Net Metering' },
    { id: 'OFF_GRID', label: 'Off Grid-Connected Solar PV Power Plant', description: 'Standalone battery storage system for zero-grid reliance' },
    { id: 'HYBRID', label: 'Hybrid Solar PV Power Plant with Battery Backup', description: 'Grid synchronized with critical load emergency battery backup' }
  ],
  availableSegments: [
    { id: 'RESIDENCE', label: 'Solar for Residence / Villa', description: 'Domestic rooftop consumer application' },
    { id: 'INDUSTRY', label: 'Solar for Industry & Commercial', description: 'Industrial, factory, warehouse, and commercial rooftop installations' },
    { id: 'INSTITUTION', label: 'Solar for Educational & Healthcare Institutions', description: 'Colleges, schools, hospitals, and trusts' },
    { id: 'AGRICULTURE', label: 'Solar for Agricultural Pumps & Farms', description: 'KUSUM scheme and farm power' }
  ],
  availableSchemes: [
    { id: 'PM_SURYA_GHAR', label: 'PM Surya Ghar: Muft Bijli Yojana (Central Subsidy)', description: 'Direct DBT subsidy credited up to ₹78,000 for residential 1-3 kW' },
    { id: 'NON_SUBSIDY', label: 'Commercial Non-Subsidy Scheme (Accelerated Depreciation / Capex)', description: '40% Accelerated Depreciation tax benefit under Section 32' },
    { id: 'STATE_SUBSIDY', label: 'State Renewable Energy Incentive Scheme', description: 'State Nodal Agency specific incentive' },
    { id: 'OPEX_PPA', label: 'RESCO / OPEX / PPA Model', description: 'Zero upfront Capex - Tariff per unit basis' }
  ],

  supplyDropdownOptions: {
    moduleOptions: [
      'SERVOTEC HHV [550 Wp] Mono Perc DCR – Made in India',
      'Waaree 540-550 Wp Bi-facial Dual Glass TopCon DCR',
      'Adani Solar 545 Wp Mono PERC High Efficiency DCR',
      'Vikram Solar 550 Wp Half-Cut DCR Modules',
      'Tata Power Solar 540 Wp Mono Crystalline DCR'
    ],
    inverterOptions: [
      'SERVOTEC Single / Three Phase On-Grid MPPT Inverter',
      'Growatt On-Grid Smart Inverter with WiFi & Mobile App Monitoring',
      'Solis High-Efficiency Dual MPPT Grid Tied Inverter',
      'Sungrow Commercial Three Phase Inverter',
      'Deye / GoodWe Hybrid Inverter with Battery Port'
    ],
    batteryOptions: [
      'Nill (On-Grid Direct Net-Metering)',
      'Servotec 48V 100Ah Lithium Ferro Phosphate (LFP) Battery',
      'Exide Tubular Solar C10 Heavy-Duty Battery Bank',
      'Luminous 150Ah / 200Ah Solar Tall Tubular Battery Bank'
    ],
    structureOptions: [
      'Table RCC Mounting Structure Elevation 7 to 10 Feet (Walkable Roof)',
      'Flush Mount Aluminium Rails for Metal Sheet Industrial Roof',
      'Super High-Rise Elevated Heavy Duty HDG Structure (12+ Feet)',
      'Ground Mounted Galvanized Steel Structure with Concrete Ballast'
    ],
    protectionOptions: [
      'ACDB & DCDB with C&S MCB, Finder Type-2 Surge Arrestor & IP65 Box',
      'Dual MPPT DCDB with Hensel Enclosure + ACDB with Phoenix Contact SPD',
      'Custom IP66 Distribution Panel with Voltage/Current Digital Meter'
    ],
    cablingOptions: [
      'Polycab 6 Sq.mm Solar DC Cable, 4-Core Armoured AC Cable & Complete Earthing Kit',
      'Havells Solar Photovoltaic Cable + Cu Earthing Electrodes',
      'Finolex UV Stabilized DC Cable + Heavy GI Earthing Rods & Compound'
    ]
  },
  defaultSupplyIncludes: DEFAULT_SUPPLY_INCLUDES,
  defaultInstallationIncludes: DEFAULT_INSTALLATION_INCLUDES,

  defaultAdvancePercent: 50,
  defaultDeliveryPercent: 40,
  defaultInstallationPercent: 10,
  defaultSubsidyNote: 'Subsidy of Rs. 78,000 for 3kW, Rs. 60,000 for 2kW and Rs. 30,000 for 1kW will be credited directly to the customer\'s Aadhaar-linked bank account after commissioning and National Portal inspection.',

  beneficiaryName: 'OMMAX ELECTRIC PRIVATE LIMITED',
  bankName: 'HDFC BANK LIMITED',
  accountNumber: '50200062048510',
  accountType: 'Current Account',
  ifscCode: 'HDFC0008818',
  micrNumber: '600240154',
  bankAddress: 'HDFC BANK LIMITED, Chrompet, Chennai, Tamil Nadu. Pin Code: 600044',
  upiId: 'ommaxelectric@hdfcbank',

  termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,

  moduleWarrantyYears: 25,
  inverterWarrantyOptions: [
    '5 Years Standard Manufacturer Warranty',
    '8 Years Extended Comprehensive Warranty',
    '10 Years High Performance Manufacturer Warranty',
    '12 Years Premium Protection Warranty'
  ],
  defaultInverterWarranty: '5 Years Standard Manufacturer Warranty',
  bosWarrantyOptions: [
    '1 Year Workmanship & Balance of System Warranty',
    '2 Years Balance of System Warranty',
    '5 Years Comprehensive Balance of System Warranty'
  ],
  defaultBosWarranty: '1 Year Workmanship & Balance of System Warranty',
  workmanshipWarrantyYears: 1,

  defaultCompletionWeeks: '2 to 3 weeks',
  completionMilestones: [
    'Order Confirmation & Site Engineering Survey: 2 to 3 Days',
    'Equipment Procurement & Material Dispatch to Site: 5 to 7 Days',
    'Structural & Mechanical Module Installation: 3 to 4 Days',
    'Electrical Cabling, Inverter Mounting & Earthing: 2 to 3 Days',
    'Testing, Pre-Commissioning & DISCOM Net-Meter Inspection: 5 to 7 Days'
  ],

  defaultTariffPerUnit: 8.00,
  benefitsTable: DEFAULT_SAVINGS_BENEFITS,
  tariffAssumptions: [
    'Based on actual project performance in Chennai: 3 kW = 800 to 900 units/Bi-month',
    'TNEB electricity tariff considered: ₹8/unit',
    'Future EB tariff increases will further improve the savings and ROI.'
  ],

  brandDeclarations: DEFAULT_BRAND_DECLARATIONS,
  brandNotes: [
    'In case of non-availability of any specified brand or model, an equivalent or higher-specification product may be supplied with prior approval from the customer.',
    'Manufacturer warranties shall be applicable as per the respective manufacturer\'s standard warranty terms and conditions.'
  ],

  technicalAssumptions: DEFAULT_TECHNICAL_ASSUMPTIONS,
  exclusions: DEFAULT_EXCLUSIONS,
  warrantyDisclaimer: 'Warranty does not cover damages due to natural calamities, acts of God, theft, vandalism, third-party servicing, or customer negligence. The equipment manufacturers shall not be liable for any indirect or consequential damages arising from the above.',

  letterhead: DEFAULT_LETTERHEAD_CONFIG,
  authorizedSignatoryName: 'Authorized Signatory',
  signatoryDesignation: 'OMMAX ELECTRIC PRIVATE LIMITED',
  companyStampEnabled: true,
  companyStampUrl: '',
  companyStampRotate: 0,
  companyStampOpacity: 0.9,
  companyStampWidth: 95,

  gstGoodsPercent: 80,
  gstGoodsRate: 5,
  gstServicesPercent: 20,
  gstServicesRate: 18,
  productsCatalog: DEFAULT_MASTER_CATALOG_PRODUCTS
};
