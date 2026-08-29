import { SolarQuotation, calculateSolarPricing } from './types';
import { 
  DEFAULT_SUPPLY_INCLUDES, 
  DEFAULT_INSTALLATION_INCLUDES, 
  DEFAULT_TERMS_AND_CONDITIONS,
  DEFAULT_BRAND_DECLARATIONS,
  DEFAULT_TECHNICAL_ASSUMPTIONS,
  DEFAULT_EXCLUSIONS,
  DEFAULT_SAVINGS_BENEFITS
} from './types';

const baseCost = 312018;
const discount = 5000;
const pricing = calculateSolarPricing(baseCost, discount);

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
    opportunityId: 'OPP-001',
    opportunityTitle: '5 kWp Residential Rooftop Solar Plant',
    accountId: 'ACC-001',
    accountName: 'Prakash Residency',
    contactId: 'CON-001',
    contactName: 'Mr Prakash',
    contactPhone: '+91 94876 43434',
    contactEmail: 'prakash@example.com',
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
    supplyIncludes: [...DEFAULT_SUPPLY_INCLUDES],
    installationIncludes: [...DEFAULT_INSTALLATION_INCLUDES],
    boqItems: [
      { id: 'boq-1', slNo: 1, itemDescription: 'SERVOTEC HHV [550 Wp] Mono Perc DCR', quantity: '4.95 kWp' },
      { id: 'boq-2', slNo: 2, itemDescription: 'Nil', quantity: 'Nil' },
      { id: 'boq-3', slNo: 3, itemDescription: 'Table RCC Mounting Structure Elevation for 5 kW', quantity: '7 Feet' },
      { id: 'boq-4', slNo: 4, itemDescription: '5 kVA Single Phase On-Grid Hybrid Inverter – Make: SERVOTEC', quantity: '1 Nos' },
      { id: 'boq-5', slNo: 5, itemDescription: 'DC Cables, Array Junction Boxes & Accessories', quantity: '4.95 kWp' },
      { id: 'boq-6', slNo: 6, itemDescription: 'AC Side Supply (Cables, ACDB, Earthing & Accessories)', quantity: '4.95 kWp' },
      { id: 'boq-7', slNo: 7, itemDescription: 'Installation and Commissioning', quantity: '4.95 kWp' }
    ],
    basicCost: baseCost,
    gstGoodsPercent: 80,
    gstGoodsRate: 5,
    gstGoodsAmount: pricing.gstGoods,
    gstServicesPercent: 20,
    gstServicesRate: 18,
    gstServicesAmount: pricing.gstServices,
    totalGst: pricing.totalGst,
    specialDiscount: discount,
    grandTotal: pricing.grandTotal,
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
    termsAndConditions: [...DEFAULT_TERMS_AND_CONDITIONS],
    moduleWarrantyYears: 25,
    inverterWarrantyYears: 5,
    balanceOfSystemWarrantyYears: 1,
    projectCompletionWeeks: '2 to 3 weeks',
    tariffPerUnit: 8.00,
    benefitsTable: [...DEFAULT_SAVINGS_BENEFITS],
    tariffAssumptions: [
      'Based on actual project performance in Chennai: 3 kW = 800 to 900 units/Bi-month',
      'TNEB electricity tariff considered: ₹8/unit',
      'Future EB tariff increases will further improve the savings and ROI.'
    ],
    brandDeclarations: [...DEFAULT_BRAND_DECLARATIONS],
    brandNotes: [
      'In case of non-availability of any specified brand or model, an equivalent or higher-specification product may be supplied with prior approval from the customer.',
      'Manufacturer warranties shall be applicable as per the respective manufacturer\'s standard warranty terms and conditions.'
    ],
    technicalAssumptions: [...DEFAULT_TECHNICAL_ASSUMPTIONS],
    exclusions: [...DEFAULT_EXCLUSIONS],
    warrantyDisclaimer: 'Warranty does not cover damages due to natural calamities, acts of God, theft, vandalism, third-party servicing, or customer negligence. The equipment manufacturers shall not be liable for any indirect or consequential damages arising from the above.',
    authorizedSignatoryName: 'Authorized Signatory',
    signatoryDesignation: 'OMMAX ELECTRIC PRIVATE LIMITED',
    companyStampEnabled: true,
    letterhead: {
      headerImageUrl: '',
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
      showLetterheadOnAllPages: true
    },
    createdBy: 'Admin Operator',
    createdAt: '2026-07-16T10:00:00Z',
    sentAt: '2026-07-16T11:30:00Z',
    revisionHistory: [
      {
        revisionCode: 'R-0',
        timestamp: '2026-07-15T09:00:00Z',
        author: 'Admin Operator',
        reason: 'Initial proposal draft',
        basicCost: 312018,
        grandTotal: 335000
      },
      {
        revisionCode: 'R-1',
        timestamp: '2026-07-16T10:00:00Z',
        author: 'Admin Operator',
        reason: 'Special Discount ₹5,000 applied as per client discussion',
        basicCost: 312018,
        grandTotal: 330000,
        changesSummary: 'Applied ₹5,000 Special Discount'
      }
    ]
  }
];
