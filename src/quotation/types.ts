import React from 'react';

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
  contactSalutation?: string;
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
  'ACDB & DCDB: IP65 Enclosures with Type-II Surge Protection Devices (SPD) & MCBs',
  'Cables & Balance of System (BOS): 4/6 sq.mm UV resistant DC solar cables & multi-core AC cables',
  'Earthing & Lightning Protection: Dedicated copper-bonded chemical earthing electrodes with pits & lightning arrestor',
  'Bi-Directional Net Metering: TANGEDCO / DISCOM liaisoning & generation meter support'
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
  capacityOptions?: number[];

  // 3. Scope of Work
  supplyDropdownOptions: {
    moduleOptions: string[];
    inverterOptions: string[];
    batteryOptions: string[];
    structureOptions: string[];
    protectionOptions: string[];
    cablingOptions: string[];
  };
  starredSupplySections?: {
    module?: boolean;
    inverter?: boolean;
    battery?: boolean;
    structure?: boolean;
  };
  starredSupplyOptions?: string[];
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
  defaultBoqItems: DefaultBoqItemConfig[];
}

export interface DefaultBoqItemConfig {
  id: string;
  itemKey?: string;
  label: string;
  itemDescription: string;
  brand?: string;
  defaultUnit: string;
  defaultQtyType: 'CAPACITY_KWP' | 'FIXED' | 'NOS';
  defaultQtyValue?: string;
  defaultUnitPrice: number;
  warrantyPeriod?: string;
  isEnabled: boolean;
}

export const DEFAULT_BOQ_ITEMS_CONFIG: DefaultBoqItemConfig[] = [
  {
    id: 'def-boq-5',
    itemKey: 'dc_cables',
    label: 'e. DC Cables, Array Junction Boxes & Accessories',
    itemDescription: 'DC Cables, Array Junction Boxes & Accessories',
    brand: 'Polycab / Hensel',
    defaultUnit: 'kWp',
    defaultQtyType: 'CAPACITY_KWP',
    defaultUnitPrice: 3800,
    warrantyPeriod: '5 Years Manufacturer Warranty',
    isEnabled: true
  },
  {
    id: 'def-boq-6',
    itemKey: 'ac_supply',
    label: 'f. AC Side Supply (Cables, ACDB, Earthing & Accessories)',
    itemDescription: 'AC Side Supply (Cables, ACDB, Earthing & Accessories)',
    brand: 'Polycab / Havells',
    defaultUnit: 'kWp',
    defaultQtyType: 'CAPACITY_KWP',
    defaultUnitPrice: 3200,
    warrantyPeriod: '5 Years Manufacturer Warranty',
    isEnabled: true
  },
  {
    id: 'def-boq-7',
    itemKey: 'installation',
    label: 'g. Installation and Commissioning',
    itemDescription: 'Installation and Commissioning',
    brand: 'OMMAX Engineering Team',
    defaultUnit: 'kWp',
    defaultQtyType: 'CAPACITY_KWP',
    defaultUnitPrice: 4500,
    warrantyPeriod: '1 Year Free O&M Workmanship',
    isEnabled: true
  }
];

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
    defaultUnit: 'Feet',
    defaultUnitPrice: 6500,
    warrantyPeriod: '10 Years Structural Integrity',
    isDefaultBOQ: true
  },
  {
    id: 'prod-5',
    category: 'ELECTRICAL',
    name: 'DC Cables, Array Junction Boxes & Accessories',
    brand: 'Polycab / Hensel',
    modelSpec: '6 sq.mm XLPO UV Solar Cable + IP65 Array Junction Box with SPD & Fuses',
    defaultUnit: 'kWp',
    defaultUnitPrice: 3800,
    warrantyPeriod: '5 Years Manufacturer Warranty',
    isDefaultBOQ: true
  },
  {
    id: 'prod-6',
    category: 'ELECTRICAL',
    name: 'AC Side Supply (Cables, ACDB, Earthing & Accessories)',
    brand: 'Polycab / Havells',
    modelSpec: '4 Core Cu Armoured AC Cable + ACDB with Type-2 SPD + Chemical Earthing System',
    defaultUnit: 'kWp',
    defaultUnitPrice: 3200,
    warrantyPeriod: '5 Years Manufacturer Warranty',
    isDefaultBOQ: true
  },
  {
    id: 'prod-7',
    category: 'SERVICES',
    name: 'Installation and Commissioning',
    brand: 'OMMAX Engineering Team',
    modelSpec: 'Turnkey Mechanical Erection, Civil Foundations, Electrical Integration & Net-Metering Liaison',
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

  introOpeningText: 'In support of your Green Energy initiatives, we at Ommax Electric are pleased to submit our offer for the supply, installation, testing, and commissioning of a {Connection Type} Solar PV Power Plant at your {Target Segment} under the {Scheme}.',
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
  capacityOptions: [1, 2, 2.22, 3, 3.33, 4, 4.95, 5, 5.50, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 100],

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
      'Nil (On-Grid Direct Net-Metering)',
      'Servotec 48V 100Ah Lithium Ferro Phosphate (LFP) Battery',
      'Exide Tubular Solar C10 Heavy-Duty Battery Bank',
      'Luminous 150Ah / 200Ah Solar Tall Tubular Battery Bank'
    ],
    structureOptions: [
      'Nil (No Mounting Structure / Customer Scope)',
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
  starredSupplyOptions: [
    'SERVOTEC HHV [550 Wp] Mono Perc DCR – Made in India',
    'Waaree 540-550 Wp Bi-facial Dual Glass TopCon DCR',
    'Adani Solar 545 Wp Mono PERC High Efficiency DCR',
    'Vikram Solar 550 Wp Half-Cut DCR Modules',
    'Tata Power Solar 540 Wp Mono Crystalline DCR',
    'SERVOTEC Single / Three Phase On-Grid MPPT Inverter',
    'Growatt On-Grid Smart Inverter with WiFi & Mobile App Monitoring',
    'Solis High-Efficiency Dual MPPT Grid Tied Inverter',
    'Sungrow Commercial Three Phase Inverter',
    'Deye / GoodWe Hybrid Inverter with Battery Port',
    'Servotec 48V 100Ah Lithium Ferro Phosphate (LFP) Battery',
    'Exide Tubular Solar C10 Heavy-Duty Battery Bank',
    'Luminous 150Ah / 200Ah Solar Tall Tubular Battery Bank',
    'Table RCC Mounting Structure Elevation 7 to 10 Feet (Walkable Roof)',
    'Flush Mount Aluminium Rails for Metal Sheet Industrial Roof',
    'Super High-Rise Elevated Heavy Duty HDG Structure (12+ Feet)',
    'Ground Mounted Galvanized Steel Structure with Concrete Ballast'
  ],
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
  productsCatalog: DEFAULT_MASTER_CATALOG_PRODUCTS,
  defaultBoqItems: DEFAULT_BOQ_ITEMS_CONFIG,
  starredSupplySections: {
    module: true,
    inverter: true,
    battery: false,
    structure: true
  }
};

/**
 * Parses markdown-like *bold* or **bold** syntax and renders with font-bold,
 * preserving newlines (\n) with <br /> elements.
 * Example: "Aadhaar-linked bank account after commissioning and *National Portal* inspection."
 * -> "National Portal" will be rendered inside <strong className="font-bold">
 */
export function renderFormattedText(text: string | undefined | null): React.ReactNode {
  if (!text) return null;

  // Handle multi-line strings (newlines created when user presses Enter)
  if (text.includes('\n')) {
    const lines = text.split('\n');
    return React.createElement(
      React.Fragment,
      null,
      lines.map((line, lIdx) =>
        React.createElement(
          React.Fragment,
          { key: lIdx },
          lIdx > 0 ? React.createElement('br') : null,
          renderFormattedText(line)
        )
      )
    );
  }

  if (!text.includes('*')) return text;

  const parts: React.ReactNode[] = [];
  const regex = /(\*\*|\*)([^*]+)\1/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      React.createElement(
        'strong',
        { key: match.index, className: 'font-bold text-slate-950' },
        match[2]
      )
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return React.createElement(React.Fragment, null, ...parts);
}

/**
 * Cleans the Mounting Structure description by stripping any redundant elevation feet text
 * so that elevation feet only appears in the Quantity column and only the chosen item is shown.
 */
export function cleanStructureDescription(rawText?: string): string {
  if (!rawText || !rawText.trim() || rawText.toLowerCase().includes('nil')) return 'Mounting Structure';
  let text = rawText.trim();
  text = text.replace(/^mounting\s*structure\s*[-–:]\s*/i, '');
  text = text.replace(/^module\s*mounting\s*structure\s*[-–:]\s*/i, '');
  text = text.replace(/\s*\((?:elevated\s*)?\d+(?:\s*(?:to|-)\s*\d+)?\+?\s*(?:feet|ft|height)\)/gi, '');
  text = text.replace(/\s*elevation\s*\d+(?:\s*(?:to|-)\s*\d+)?\+?\s*(?:feet|ft)/gi, '');
  text = text.replace(/\s*\d+(?:\s*(?:to|-)\s*\d+)?\+?\s*(?:feet|ft)\s*(?:height)?/gi, '');
  text = text.replace(/\s*\(\s*\)/g, '').trim();
  text = text.replace(/\s{2,}/g, ' ').trim();
  if (!text || text.toLowerCase() === 'mounting structure' || text.toLowerCase().includes('nil')) {
    return 'Mounting Structure';
  }
  return text;
}

/**
 * Cleans the Battery description by stripping redundant prefixes and quantity annotations
 * so that the quantity appears only in the Quantity column and only the chosen item is shown.
 */
export function cleanBatteryDescription(rawText?: string, isBatteryActive?: boolean): string {
  if (!isBatteryActive || !rawText || rawText.toLowerCase().includes('nil')) {
    return 'Battery';
  }
  let text = rawText.trim();
  text = text.replace(/^battery(?:\s*energy)?(?:\s*storage)?(?:\s*bank)?\s*[-–:]\s*/i, '');
  text = text.replace(/\s*\((?:qty:\s*)?\d+\s*nos\)/gi, '');
  text = text.replace(/\s*\(\s*nill?[^)]*\)/gi, '');
  text = text.replace(/\s{2,}/g, ' ').trim();
  if (!text || text.toLowerCase() === 'battery' || text.toLowerCase().includes('nil')) {
    return 'Battery';
  }
  return text;
}

/**
 * Dynamically replaces placeholders like {Connection Type}, {Target Segment}, {Scheme}
 * from Prepare Solar Quotation dropdown choices.
 */
export function interpolateOpeningText(
  template: string | undefined | null,
  params: {
    connectionType?: string;
    targetSegment?: string;
    scheme?: string;
    capacityKw?: number;
    clientName?: string;
    projectName?: string;
  }
): string {
  if (!template || !template.trim()) {
    return 'In support of your Green Energy initiatives, we at Ommax Electric are pleased to submit our offer for the supply, installation, testing, and commissioning of an On Grid-Connected Solar PV Power Plant at your residence under the PM Surya Ghar: Muft Bijli Yojana.';
  }

  let conn = params.connectionType || 'On-Grid';
  const cleanConn = conn
    .replace(/\s*(Solar\s*PV\s*Power\s*Plant|Solar\s*Power\s*Plant|Power\s*Plant)\s*$/i, '')
    .trim() || conn;

  let seg = params.targetSegment || 'Residence';
  const cleanSeg = seg.replace(/^Solar\s+for\s+/i, '').trim() || seg;

  const scheme = params.scheme || 'PM Surya Ghar: Muft Bijli Yojana';
  const capacity = params.capacityKw ? `${params.capacityKw} kWp` : '';
  const clientName = params.clientName || '';
  const projectName = params.projectName || '';

  let result = template
    .replace(/\{(\s*Connection\s*Type\s*|\s*connectionType\s*|\s*System\s*Type\s*|\s*systemType\s*)\}/gi, cleanConn)
    .replace(/\{\{(\s*Connection\s*Type\s*|\s*connectionType\s*|\s*System\s*Type\s*|\s*systemType\s*)\}\}/gi, cleanConn)
    .replace(/\{(\s*Target\s*Segment\s*|\s*targetSegment\s*|\s*Segment\s*|\s*segment\s*)\}/gi, cleanSeg)
    .replace(/\{\{(\s*Target\s*Segment\s*|\s*targetSegment\s*|\s*Segment\s*|\s*segment\s*)\}\}/gi, cleanSeg)
    .replace(/\{(\s*Scheme\s*|\s*scheme\s*)[\}\)]/gi, scheme)
    .replace(/\{\{(\s*Scheme\s*|\s*scheme\s*)\}\}/gi, scheme)
    .replace(/\{(\s*Capacity\s*|\s*capacity\s*|\s*capacityKw\s*|\s*capacityKwp\s*)\}/gi, capacity)
    .replace(/\{\{(\s*Capacity\s*|\s*capacity\s*|\s*capacityKw\s*|\s*capacityKwp\s*)\}\}/gi, capacity)
    .replace(/\{(\s*Client\s*Name\s*|\s*clientName\s*)\}/gi, clientName)
    .replace(/\{\{(\s*Client\s*Name\s*|\s*clientName\s*)\}\}/gi, clientName)
    .replace(/\{(\s*Project\s*Name\s*|\s*projectName\s*)\}/gi, projectName)
    .replace(/\{\{(\s*Project\s*Name\s*|\s*projectName\s*)\}\}/gi, projectName);

  // Fix grammar "a [Vowel]" -> "an [Vowel]" e.g. "a On Grid-Connected" -> "an On Grid-Connected"
  result = result.replace(/\ba\s+([AEIOUaeiou])/g, 'an $1');

  return result;
}

/**
 * Dynamically replaces placeholders like {capacityKwp}, {capacityKw}, {capacity}, {location}, {clientName}, {projectName}, {connectionType}, {scheme}
 * in quotation subject templates or custom subject lines.
 */
export function interpolateSubject(
  template: string | undefined | null,
  params: {
    capacityKw?: number;
    capacityKwp?: number;
    systemType?: string;
    connectionType?: string;
    targetSegment?: string;
    scheme?: string;
    clientName?: string;
    projectName?: string;
    location?: string;
  }
): string {
  if (!template || !template.trim()) {
    const cap = params.capacityKwp || params.capacityKw;
    return cap ? `Proposal for ${cap} kWp Roof top Solar Power Plant` : 'Proposal for Roof top Solar Power Plant';
  }

  const capNum = params.capacityKwp || params.capacityKw;
  const capStr = (capNum !== undefined && capNum !== null && capNum > 0) ? `${capNum}` : '';
  const clientName = params.clientName || '';
  const projectName = params.projectName || clientName;
  const location = params.location || '';
  const conn = params.connectionType || params.systemType || '';
  const scheme = params.scheme || '';

  return template
    .replace(/\{{1,2}\s*(?:capacityKwp|capacityKw|capacity|capacity\s*kwp|capacity\s*kw)\s*\}{1,2}/gi, capStr)
    .replace(/\{{1,2}\s*(?:client\s*name|clientname)\s*\}{1,2}/gi, clientName)
    .replace(/\{{1,2}\s*(?:project\s*name|projectname)\s*\}{1,2}/gi, projectName)
    .replace(/\{{1,2}\s*(?:location|site\s*location)\s*\}{1,2}/gi, location)
    .replace(/\{{1,2}\s*(?:connection\s*type|connectiontype|system\s*type|systemtype)\s*\}{1,2}/gi, conn)
    .replace(/\{{1,2}\s*scheme\s*\}{1,2}/gi, scheme);
}

/**
 * Derives the Structure Elevation feet quantity string from the dropdown label or custom numeric feet.
 */
export function getStructureFeet(structureElevation?: string, structureFeet?: number): string {
  if (structureFeet !== undefined && structureFeet !== null) {
    if (structureFeet <= 0) return 'Nil';
    return `${structureFeet} Feet`;
  }
  if (!structureElevation || structureElevation.toLowerCase().includes('nil')) return 'Nil';
  if (structureElevation.match(/\b0\s*(?:feet|ft)\b/i)) return 'Nil';
  
  const feetMatch = structureElevation.match(/(\d+\s*(?:to|-)\s*\d+\s*(?:Feet|Ft|feet|ft)|\d+\+?\s*(?:Feet|Ft|feet|ft))/i);
  if (feetMatch) {
    let matched = feetMatch[0].replace(/ft/i, 'Feet');
    if (!matched.toLowerCase().includes('feet')) matched += ' Feet';
    return matched;
  }
  
  if (structureElevation.toLowerCase().includes('flush')) {
    return 'Flush Mount';
  }
  if (structureElevation.toLowerCase().includes('ground')) {
    return 'Ground Mount';
  }
  return '7 to 10 Feet';
}

export interface BuildBOQParams {
  capacityKw: number;
  capacityKwp?: number;
  solarModule?: string;
  inverter?: string;
  inverterQty?: number;
  inverterUnit?: string;
  battery?: string;
  batteryQty?: number;
  isBatteryActive?: boolean;
  structureElevation?: string;
  structureFeet?: number;
  basicCost?: number;
  defaultBoqItems?: DefaultBoqItemConfig[];
  dcCablesText?: string;
  acSideSupplyText?: string;
  installationText?: string;
}

/**
 * Standardizes the BOQ items for preview and quotation generation:
 * a. Solar PV Modules (Quantity: Project Capacity kWp)
 * b. Solar Inverter (Quantity: 1 Nos)
 * c. Battery (Quantity: Chosen Nos / Nil)
 * d. Mounting Structure (Quantity: Elevation feet from dropdown / input)
 * e, f, g & onwards: Defaults dynamically configured in the Pricing Defaults section.
 */
export function buildDefaultBOQItems(params: BuildBOQParams): BOQItem[] {
  const cap = params.capacityKwp || params.capacityKw || 4.95;
  const basicCost = params.basicCost || Math.round(cap * 63000);
  
  let moduleDesc = params.solarModule?.trim() || '550 Wp Mono Perc DCR Panels';
  moduleDesc = moduleDesc.replace(/^solar\s*pv\s*modules?\s*[-–:]\s*/i, '').trim();
  if (!moduleDesc) moduleDesc = '550 Wp Mono Perc DCR Panels';
    
  let inverterDesc = params.inverter?.trim() || 'On-Grid MPPT Grid-Tied Inverter';
  inverterDesc = inverterDesc.replace(/^(?:grid-tied\s*\/\s*hybrid\s*)?solar\s*inverter\s*[-–:]\s*/i, '').trim();
  if (!inverterDesc) inverterDesc = 'On-Grid MPPT Grid-Tied Inverter';
    
  const hasBattery = Boolean(
    (params.isBatteryActive ?? (params.batteryQty !== undefined ? params.batteryQty > 0 : false)) &&
    params.battery &&
    !params.battery.toLowerCase().includes('nil') &&
    (params.batteryQty === undefined || params.batteryQty > 0)
  );
  const batteryDesc = hasBattery ? cleanBatteryDescription(params.battery, true) : 'Battery';
  const batteryQty = hasBattery ? (params.batteryQty && params.batteryQty > 0 ? `${params.batteryQty} Nos` : '1 Nos') : 'Nil';

  const hasStructure = Boolean(
    params.structureElevation &&
    !params.structureElevation.toLowerCase().includes('nil') &&
    (params.structureFeet === undefined || params.structureFeet > 0)
  );
  const structureFeetStr = getStructureFeet(params.structureElevation, params.structureFeet);
  const structureDesc = hasStructure ? cleanStructureDescription(params.structureElevation) : 'Mounting Structure';

  const inverterUnit = params.inverterUnit || 'Nos';
  const inverterQtyStr = params.inverterQty ? `${params.inverterQty} ${inverterUnit}` : `1 ${inverterUnit}`;

  const baseItems: BOQItem[] = [
    {
      id: 'boq-1',
      slNo: 1,
      itemDescription: moduleDesc,
      quantity: `${cap} kWp`,
      unitPrice: Math.round((basicCost * 0.45) / cap),
      totalPrice: Math.round(basicCost * 0.45),
      brand: params.solarModule?.split(' ')[0] || 'Tier-1'
    },
    {
      id: 'boq-2',
      slNo: 2,
      itemDescription: inverterDesc,
      quantity: inverterQtyStr,
      unitPrice: Math.round(basicCost * 0.22),
      totalPrice: Math.round(basicCost * 0.22),
      brand: params.inverter?.split(' ')[0] || 'Servotec'
    },
    {
      id: 'boq-3',
      slNo: 3,
      itemDescription: batteryDesc,
      quantity: batteryQty,
      unitPrice: hasBattery ? 95000 : 0,
      totalPrice: hasBattery ? (params.batteryQty || 1) * 95000 : 0,
      brand: hasBattery ? 'LFP Battery' : 'N/A'
    },
    {
      id: 'boq-4',
      slNo: 4,
      itemDescription: structureDesc,
      quantity: structureFeetStr,
      unitPrice: Math.round((basicCost * 0.12) / cap),
      totalPrice: Math.round(basicCost * 0.12),
      brand: 'HDG Galvanized'
    }
  ];

  // Dynamic default items e, f, g + any additional custom items from Pricing Defaults
  const defaultItemsConfig = (params.defaultBoqItems && params.defaultBoqItems.length > 0)
    ? params.defaultBoqItems
    : DEFAULT_BOQ_ITEMS_CONFIG;

  const extraItems: BOQItem[] = defaultItemsConfig
    .filter(item => item.isEnabled !== false)
    .map((item, index) => {
      let qtyStr = `${cap} kWp`;
      if (item.defaultQtyType === 'FIXED' && item.defaultQtyValue) {
        qtyStr = item.defaultQtyValue;
      } else if (item.defaultQtyType === 'NOS') {
        qtyStr = item.defaultQtyValue ? `${item.defaultQtyValue} Nos` : '1 Nos';
      } else if (item.defaultUnit && item.defaultUnit !== 'kWp') {
        qtyStr = item.defaultQtyValue ? `${item.defaultQtyValue} ${item.defaultUnit}` : `${cap} ${item.defaultUnit}`;
      }

      // If custom overrides were passed in params
      let desc = item.itemDescription;
      if (item.itemKey === 'dc_cables' && params.dcCablesText) desc = params.dcCablesText;
      if (item.itemKey === 'ac_supply' && params.acSideSupplyText) desc = params.acSideSupplyText;
      if (item.itemKey === 'installation' && params.installationText) desc = params.installationText;

      const unitRate = item.defaultUnitPrice || 0;
      const calculatedPrice = item.defaultQtyType === 'CAPACITY_KWP' || item.defaultUnit === 'kWp'
        ? Math.round(unitRate * cap)
        : unitRate;

      return {
        id: item.id || `boq-${index + 5}`,
        slNo: index + 5,
        itemDescription: desc,
        quantity: qtyStr,
        unitPrice: unitRate,
        totalPrice: calculatedPrice,
        brand: item.brand || ''
      };
    });

  return [...baseItems, ...extraItems];
}

