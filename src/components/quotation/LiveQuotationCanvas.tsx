import React, { useState, useMemo } from 'react';
import { 
  SolarQuotation, 
  BOQItem, 
  QuotationMasterConfig, 
  DEFAULT_QUOTATION_MASTER_CONFIG,
  calculateSolarPricing,
  formatCurrencyINR,
  DEFAULT_SUPPLY_INCLUDES,
  DEFAULT_INSTALLATION_INCLUDES,
  DEFAULT_TERMS_AND_CONDITIONS,
  DEFAULT_BRAND_DECLARATIONS,
  DEFAULT_BRAND_NOTES,
  DEFAULT_TECHNICAL_ASSUMPTIONS,
  DEFAULT_EXCLUSIONS,
  DEFAULT_SAVINGS_BENEFITS,
  SolarBenefitRow,
  renderFormattedText,
  interpolateOpeningText,
  interpolateSubject,
  deriveAcCapacityKw,
  deriveDcCapacityKwp
} from '../../quotation/types';
import { CRMOpportunity, CRMAccount, CRMContact } from '../../crm/types';
import { User, AppSettings, formatDateToDMY } from '../../types';
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  CheckCircle, 
  Plus, 
  Trash2, 
  Sliders, 
  FileText, 
  CheckSquare, 
  CreditCard, 
  Landmark, 
  ShieldAlert, 
  ShieldCheck, 
  CalendarClock, 
  TrendingUp, 
  Award, 
  FileCode2, 
  MinusCircle, 
  AlertTriangle, 
  Sparkles,
  Phone,
  MapPin,
  Upload,
  RotateCcw,
  Check,
  Zap,
  Info
} from 'lucide-react';
import Quotation5PagePrintView from './Quotation5PagePrintView';

const MASTER_CONFIG_STORAGE_KEY = 'ommax_solar_quotation_master_config';

const CAPACITY_PRESETS = [1, 2, 3, 4, 5, 10, 15, 20] as const;

interface LiveQuotationCanvasProps {
  initialQuotation?: SolarQuotation | null;
  opportunities: CRMOpportunity[];
  accounts: CRMAccount[];
  contacts: CRMContact[];
  currentUser: User | null;
  appSettings: AppSettings;
  onSave: (quotation: SolarQuotation, isSubmit?: boolean) => void;
  onCancel: () => void;
}

type SectionKey = 
  | 'HEADER_TO'
  | 'INTRO'
  | 'SCOPE_OF_WORK'
  | 'PAYMENT_TERMS'
  | 'BANKING_DETAILS'
  | 'TERMS_AND_CONDITIONS'
  | 'WARRANTY'
  | 'PROJECT_COMPLETION'
  | 'ESTIMATED_SOLAR_BENEFITS'
  | 'BRAND_DECLARATION'
  | 'TECHNICAL_ASSUMPTIONS'
  | 'EXCLUSIONS'
  | 'DISCLAIMER'
  | 'ANNEXURE_A_COSTING';

export default function LiveQuotationCanvas({
  initialQuotation,
  opportunities,
  accounts,
  contacts,
  currentUser,
  appSettings,
  onSave,
  onCancel
}: LiveQuotationCanvasProps) {
  // 1. Load Master Configuration from Tools Studio
  const masterConfig: QuotationMasterConfig = useMemo(() => {
    try {
      const saved = localStorage.getItem(MASTER_CONFIG_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_QUOTATION_MASTER_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_QUOTATION_MASTER_CONFIG;
  }, []);

  // 2. Initialize Quotation State with conformant SolarQuotation schema
  const [formData, setFormData] = useState<SolarQuotation>(() => {
    if (initialQuotation && initialQuotation.id && initialQuotation.quotationNo) {
      return initialQuotation;
    }

    const defaultCapacity = 4.95;
    const baseCost = Math.round(defaultCapacity * 63000);
    const pricing = calculateSolarPricing(baseCost, 0);

    const generatedOfferNo = `${masterConfig.offerPrefix}${masterConfig.offerYearCode}${String(masterConfig.offerStartingSeq || 24).padStart(4, '0')}R0`;

    const boq: BOQItem[] = [
      { id: 'boq-1', slNo: 1, itemDescription: `SERVOTEC HHV [550 Wp] Mono Perc DCR Panels`, quantity: `${defaultCapacity} kWp` },
      { id: 'boq-2', slNo: 2, itemDescription: '5 kVA Single Phase On-Grid Inverter Make: SERVOTEC', quantity: '1 Nos' },
      { id: 'boq-3', slNo: 3, itemDescription: 'Nil', quantity: 'Nil' },
      { id: 'boq-4', slNo: 4, itemDescription: 'Table RCC Elevated Structure', quantity: '7 Feet' },
      { id: 'boq-5', slNo: 5, itemDescription: 'DC Cables, Array Junction Boxes & Accessories', quantity: `${defaultCapacity} kWp` },
      { id: 'boq-6', slNo: 6, itemDescription: 'AC Side Supply (Cables, ACDB, Earthing & Accessories)', quantity: `${defaultCapacity} kWp` },
      { id: 'boq-7', slNo: 7, itemDescription: 'Installation and Commissioning', quantity: `${defaultCapacity} kWp` }
    ];

    return {
      id: `QUO-${Date.now()}`,
      quotationNo: generatedOfferNo,
      offerNo: generatedOfferNo,
      revisionIndex: 0,
      revisionCode: 'R-0',
      title: `${defaultCapacity} kWp Rooftop Solar PV Power Plant Proposal`,
      type: 'SOLAR_EPC',
      status: 'DRAFT',
      opportunityId: initialQuotation?.opportunityId || '',
      opportunityTitle: initialQuotation?.opportunityTitle || '',
      accountId: initialQuotation?.accountId || '',
      accountName: initialQuotation?.accountName || '',
      contactId: initialQuotation?.contactId || '',
      contactName: initialQuotation?.contactName || '',
      contactPhone: initialQuotation?.contactPhone || '',
      contactEmail: initialQuotation?.contactEmail || '',
      projectName: initialQuotation?.projectName || 'Rooftop Solar PV Plant',
      clientName: initialQuotation?.clientName || 'Valued Client',
      location: initialQuotation?.location || 'Chennai, Tamil Nadu',
      state: 'Tamil Nadu',
      scheme: masterConfig.availableSchemes[0]?.label || 'PM Surya Ghar: Muft Bijli Yojana',
      subject: `Proposal for ${defaultCapacity} kWp Roof top Solar`,
      salutation: masterConfig.defaultToSalutation || 'Dear Valued Customer,',
      date: new Date().toISOString().split('T')[0],
      priceValidityDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      capacityKw: deriveAcCapacityKw(undefined, defaultCapacity),
      capacityKwp: defaultCapacity,
      systemType: 'ON_GRID',
      gridEvacuationVoltage: '230V Single Phase / 415V Three Phase',
      
      supplyIncludes: masterConfig.defaultSupplyIncludes || DEFAULT_SUPPLY_INCLUDES,
      installationIncludes: masterConfig.defaultInstallationIncludes || DEFAULT_INSTALLATION_INCLUDES,
      
      boqItems: boq,
      basicCost: baseCost,
      gstGoodsPercent: 80,
      gstGoodsRate: 5,
      gstGoodsAmount: pricing.gstGoods,
      gstServicesPercent: 20,
      gstServicesRate: 18,
      gstServicesAmount: pricing.gstServices,
      totalGst: pricing.totalGst,
      specialDiscount: 0,
      grandTotal: pricing.grandTotal,

      subsidyNote: masterConfig.defaultSubsidyNote || 'Subsidy of Rs. 78,000 for 3kW, Rs. 60,000 for 2kW and Rs. 30,000 for 1kW will be credited to the customer\'s account after uploading required documents on the portal.',
      advancePaymentPercent: masterConfig.defaultAdvancePercent || 50,
      deliveryPaymentPercent: masterConfig.defaultDeliveryPercent || 40,
      installationPaymentPercent: masterConfig.defaultInstallationPercent || 10,

      beneficiaryName: masterConfig.beneficiaryName || 'OMMAX ELECTRIC PRIVATE LIMITED',
      bankName: masterConfig.bankName || 'HDFC BANK LIMITED',
      accountNumber: masterConfig.accountNumber || '50200062048510',
      accountType: masterConfig.accountType || 'Current Account',
      ifscCode: masterConfig.ifscCode || 'HDFC0008818',
      micrNumber: masterConfig.micrNumber || '600240154',
      bankAddress: masterConfig.bankAddress || 'HDFC BANK LIMITED, Chrompet, Chennai, Tamil Nadu. Pin Code: 600044',
      termsAndConditions: masterConfig.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS,
      moduleWarrantyYears: masterConfig.moduleWarrantyYears || 25,
      inverterWarrantyYears: 5,
      balanceOfSystemWarrantyYears: 1,
      projectCompletionWeeks: masterConfig.defaultCompletionWeeks || '2 to 3 weeks',

      tariffPerUnit: masterConfig.defaultTariffPerUnit || 8.0,
      benefitsTable: masterConfig.benefitsTable || DEFAULT_SAVINGS_BENEFITS,
      tariffAssumptions: [
        'Based on actual project performance in Chennai: 3 kW = 800 to 900 units/Bi-month',
        'TNEB electricity tariff considered: ₹8/unit',
        'Future EB tariff increases will further improve the savings and ROI.'
      ],
      brandDeclarations: masterConfig.brandDeclarations || DEFAULT_BRAND_DECLARATIONS,
      brandNotes: masterConfig.brandNotes || DEFAULT_BRAND_NOTES,

      technicalAssumptions: masterConfig.technicalAssumptions || DEFAULT_TECHNICAL_ASSUMPTIONS,
      exclusions: masterConfig.exclusions || DEFAULT_EXCLUSIONS,
      warrantyDisclaimer: masterConfig.warrantyDisclaimer || 'Warranty does not cover damages due to natural calamities, acts of God, theft, vandalism, third-party servicing, or customer negligence. The equipment manufacturers shall not be liable for any indirect or consequential damages arising from the above.',
      authorizedSignatoryName: masterConfig.authorizedSignatoryName || 'Authorized Signatory',
      signatoryDesignation: masterConfig.signatoryDesignation || 'OMMAX ELECTRIC PRIVATE LIMITED',
      companyStampEnabled: true,
      companyStampUrl: '',

      letterhead: masterConfig.letterhead,
      createdBy: currentUser?.fullName || 'OMMAX Team',
      createdAt: new Date().toISOString(),
      revisionHistory: []
    };
  });

  // Active section highlighted
  const [activeSection, setActiveSection] = useState<SectionKey>('HEADER_TO');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string>(formData.opportunityId || '');

  // Helper getters for Scope Quantities (a: Modules, b: Inverter, c: Battery, d: Structure)
  const moduleItem = formData.boqItems.find(i => i.slNo === 1);
  const inverterItem = formData.boqItems.find(i => i.slNo === 2);
  const batteryItem = formData.boqItems.find(i => i.slNo === 3);
  const structureItem = formData.boqItems.find(i => i.slNo === 4);

  // Quick update helpers for BOQ item quantities and descriptions
  const updateBoqQuantity = (slNo: number, newQty: string) => {
    setFormData(prev => ({
      ...prev,
      boqItems: prev.boqItems.map(item => item.slNo === slNo ? { ...item, quantity: newQty } : item)
    }));
  };

  const updateBoqDescription = (slNo: number, newDesc: string) => {
    setFormData(prev => ({
      ...prev,
      boqItems: prev.boqItems.map(item => item.slNo === slNo ? { ...item, itemDescription: newDesc } : item)
    }));
  };

  // Handle Opportunity Selection from CRM
  const handleOpportunityChange = (oppId: string) => {
    setSelectedOppId(oppId);
    if (!oppId) return;

    const opp = opportunities.find(o => o.id === oppId);
    const acc = accounts.find(a => a.id === opp?.accountId);
    const con = contacts.find(c => c.id === opp?.contactId);

    let clientName = 'Valued Client';
    if (con) {
      const rawName = (con.name || [con.firstName, con.lastName].filter(Boolean).join(' ') || '').trim();
      const sal = (con.salutation || '').trim();
      if (sal && rawName && !rawName.toLowerCase().startsWith(sal.toLowerCase())) {
        clientName = `${sal} ${rawName}`;
      } else {
        clientName = rawName || acc?.name || opp?.title || 'Valued Client';
      }
    } else {
      clientName = acc?.name || opp?.title || 'Valued Client';
    }

    // Construct full comprehensive postal address
    const addressParts: string[] = [];
    const street = (con?.address || acc?.address || '').trim();
    if (street) addressParts.push(street);

    const city = (con?.city || acc?.billingCity || '').trim();
    const state = (con?.state || acc?.billingState || 'Tamil Nadu').trim();
    const pincode = (con?.pincode || acc?.pincode || '').trim();

    let cityStatePin = '';
    if (city && state) cityStatePin = `${city}, ${state}`;
    else if (city) cityStatePin = city;
    else if (state) cityStatePin = state;

    if (pincode) {
      cityStatePin = cityStatePin ? `${cityStatePin} - ${pincode}` : pincode;
    }
    if (cityStatePin) addressParts.push(cityStatePin);

    const fullAddressStr = addressParts.join(', ') || 'Chennai, Tamil Nadu';

    setFormData(prev => ({
      ...prev,
      opportunityId: opp?.id || '',
      opportunityTitle: opp?.title || '',
      accountId: opp?.accountId || '',
      accountName: '', // Remove account name from To section
      contactId: opp?.contactId || '',
      contactName: con?.name || '',
      contactPhone: con?.phone || con?.mobile || acc?.phone || '',
      contactEmail: con?.email || acc?.email || '',
      clientName: clientName,
      projectName: `${clientName} Rooftop Solar Plant`,
      location: fullAddressStr,
      state: state || 'Tamil Nadu',
      subject: `Proposal for ${prev.capacityKwp || 4.95} kWp Roof top Solar`
    }));
  };

  // Recalculate BOQ & Pricing when capacity or basic cost changes
  const handleCapacityChange = (newCapacity: number) => {
    const validCap = Math.max(0.5, newCapacity || 1);
    const dcKwp = deriveDcCapacityKwp(validCap);
    const newBasic = Math.round(validCap * 63000);
    const pricing = calculateSolarPricing(newBasic, formData.specialDiscount || 0);

    const updatedBOQ: BOQItem[] = formData.boqItems.map(item => {
      if (item.slNo === 1 || item.slNo === 5 || item.slNo === 6 || item.slNo === 7) {
        return { ...item, quantity: `${dcKwp} kWp` };
      }
      if (item.slNo === 2 && item.itemDescription.includes('kVA')) {
        return { ...item, itemDescription: `Solar Inverter – ${Math.ceil(validCap)} kVA Single Phase On-Grid Inverter Make: SERVOTEC` };
      }
      return item;
    });

    setFormData(prev => ({
      ...prev,
      capacityKw: validCap,
      capacityKwp: dcKwp,
      title: `${validCap} kW Rooftop Solar PV Power Plant Proposal`,
      subject: `Proposal for ${validCap} kW Roof top Solar`,
      boqItems: updatedBOQ,
      basicCost: newBasic,
      gstGoodsAmount: pricing.gstGoods,
      gstServicesAmount: pricing.gstServices,
      totalGst: pricing.totalGst,
      grandTotal: pricing.grandTotal
    }));
  };

  const handleBasicCostChange = (newBasic: number) => {
    const pricing = calculateSolarPricing(newBasic, formData.specialDiscount || 0);
    setFormData(prev => ({
      ...prev,
      basicCost: newBasic,
      gstGoodsAmount: pricing.gstGoods,
      gstServicesAmount: pricing.gstServices,
      totalGst: pricing.totalGst,
      grandTotal: pricing.grandTotal
    }));
  };

  const handleDiscountChange = (newDiscount: number) => {
    const validDiscount = Math.max(0, newDiscount || 0);
    const pricing = calculateSolarPricing(formData.basicCost, validDiscount);
    setFormData(prev => ({
      ...prev,
      specialDiscount: validDiscount,
      gstGoodsAmount: pricing.gstGoods,
      gstServicesAmount: pricing.gstServices,
      totalGst: pricing.totalGst,
      grandTotal: pricing.grandTotal
    }));
  };

  // Image Upload handler for authorized signature / stamp
  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormData(prev => ({
          ...prev,
          companyStampUrl: base64,
          companyStampEnabled: true
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Section List for Top Navigation
  const sectionList: { id: SectionKey; label: string; pageNum: number; icon: any }[] = [
    { id: 'HEADER_TO', label: 'To & Subject', pageNum: 1, icon: Sliders },
    { id: 'INTRO', label: 'Intro Letter', pageNum: 1, icon: FileText },
    { id: 'SCOPE_OF_WORK', label: 'Scope of Work & Qty', pageNum: 2, icon: CheckSquare },
    { id: 'ANNEXURE_A_COSTING', label: 'Annexure A – Costing', pageNum: 2, icon: Sparkles },
    { id: 'PAYMENT_TERMS', label: 'Payment Terms', pageNum: 3, icon: CreditCard },
    { id: 'BANKING_DETAILS', label: 'Banking Details', pageNum: 3, icon: Landmark },
    { id: 'TERMS_AND_CONDITIONS', label: 'Terms & Conditions', pageNum: 3, icon: ShieldAlert },
    { id: 'WARRANTY', label: 'Warranty & Specs', pageNum: 4, icon: ShieldCheck },
    { id: 'PROJECT_COMPLETION', label: 'Project Completion', pageNum: 4, icon: CalendarClock },
    { id: 'ESTIMATED_SOLAR_BENEFITS', label: 'Estimated Solar Benefits', pageNum: 4, icon: TrendingUp },
    { id: 'BRAND_DECLARATION', label: 'Brand Declaration', pageNum: 4, icon: Award },
    { id: 'TECHNICAL_ASSUMPTIONS', label: 'Technical Assumptions', pageNum: 5, icon: FileCode2 },
    { id: 'EXCLUSIONS', label: 'Exclusions', pageNum: 5, icon: MinusCircle },
    { id: 'DISCLAIMER', label: 'Signatory & Stamp', pageNum: 5, icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & WORKSPACE TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer"
            title="Back to Quotations List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                {formData.offerNo}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                {formData.revisionCode}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Live Full-Document Studio
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive 5-Page Solar Quotation Editor • All changes update preview in real-time
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Full 5-Page PDF View</span>
          </button>

          <button
            type="button"
            onClick={() => onSave(formData, false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4 text-[#f7b944]" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => onSave(formData, true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f7b944] hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finalize & Issue Offer</span>
          </button>
        </div>
      </div>

      {/* 2. SECTION TABS SCROLLER */}
      <div className="bg-slate-900/90 text-white p-2 rounded-2xl overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
        {sectionList.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#f7b944] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                P{sec.pageNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN WORKSPACE: CONFIGURATION PANEL (LEFT) + REAL-TIME PREVIEW (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: ACTIVE SECTION CONFIGURATION PANEL (4 Cols) */}
        <div 
          id="active-editor-panel"
          className="lg:col-span-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5 scrollbar-thin"
        >
          <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Configure: {sectionList.find(s => s.id === activeSection)?.label}</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
              Live Sync
            </span>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: HEADER & TO DETAILS (Capacity dropdown & client details)       */}
          {/* ========================================================================= */}
          {activeSection === 'HEADER_TO' && (
            <div className="space-y-4">
              {/* Opportunity Linker */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Link CRM Opportunity</label>
                <select
                  value={selectedOppId}
                  onChange={(e) => handleOpportunityChange(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                >
                  <option value="">-- Manual Client Entry --</option>
                  {opportunities.map(opp => (
                    <option key={opp.id} value={opp.id}>
                      {opp.title} ({opp.accountName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Client Name</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value, projectName: `${e.target.value} Rooftop Solar Plant` })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Postal / Site Address (Door No, Street, Area, City, State, PIN)
                </label>
                <textarea
                  rows={3}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. No. 12, Main Road, Chrompet, Chennai - 600044"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 leading-relaxed font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail || ''}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="e.g. client@example.com"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* CAPACITY (kW) DROPDOWN SELECTOR & QUICK BUTTONS */}
              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>System Capacity (kW) *</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md font-mono">
                    {formData.capacityKw || 5} kW ({formData.capacityKwp || deriveDcCapacityKwp(formData.capacityKw || 5)} kWp)
                  </span>
                </div>

                {/* Dropdown with kW values */}
                <select
                  value={formData.capacityKw || 5}
                  onChange={(e) => handleCapacityChange(parseFloat(e.target.value) || 5)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 cursor-pointer text-slate-900 shadow-2xs"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30].map(kw => (
                    <option key={kw} value={kw}>
                      {kw} kW ({Math.round(kw * 2)} Panels / {deriveDcCapacityKwp(kw)} kWp)
                    </option>
                  ))}
                  {![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30].includes(formData.capacityKw) && (
                    <option value={formData.capacityKw}>Custom: {formData.capacityKw} kW</option>
                  )}
                </select>

                {/* 1-Click Quick Preset Pills */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block mb-1">Quick Select Presets:</span>
                  <div className="grid grid-cols-4 gap-1">
                    {CAPACITY_PRESETS.map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => handleCapacityChange(cap)}
                        className={`text-[10.5px] py-1 px-1 rounded-lg font-bold transition-all text-center cursor-pointer ${
                          formData.capacityKw === cap
                            ? 'bg-slate-900 text-[#f7b944] shadow-xs ring-1 ring-amber-400 font-black'
                            : 'bg-white text-slate-700 hover:bg-amber-100 border border-amber-200/80'
                        }`}
                      >
                        {cap} kW
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Offer Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Validity (4 Wks)</label>
                  <input
                    type="date"
                    value={formData.priceValidityDate}
                    onChange={(e) => setFormData({ ...formData, priceValidityDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Subject Line</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: INTRO LETTER & DROPDOWNS                                       */}
          {/* ========================================================================= */}
          {activeSection === 'INTRO' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Plant Connection Type
                </label>
                <select
                  value={formData.systemType}
                  onChange={(e) => setFormData({ ...formData, systemType: e.target.value as any, connectionType: e.target.value as any })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white cursor-pointer"
                >
                  {masterConfig.availableSystemTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Customer Segment
                </label>
                <select
                  value={formData.targetSegment}
                  onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value as any })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white cursor-pointer"
                >
                  {masterConfig.availableSegments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Scheme / Subsidy (Dropdown)
                </label>
                <select
                  value={formData.scheme}
                  onChange={(e) => setFormData({ ...formData, scheme: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white cursor-pointer"
                >
                  {masterConfig.availableSchemes.map((scm) => (
                    <option key={scm.id} value={scm.label}>
                      {scm.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Salutation</label>
                <input
                  type="text"
                  value={formData.salutation}
                  onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Dear Sir / Madam,"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Introductory Opening Paragraph
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, introOpeningText: masterConfig.introOpeningText })}
                    className="text-[10px] text-amber-700 hover:text-amber-800 font-bold cursor-pointer"
                  >
                    Reset to Master Template
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={formData.introOpeningText !== undefined ? formData.introOpeningText : masterConfig.introOpeningText}
                  onChange={(e) => setFormData({ ...formData, introOpeningText: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-sans focus:bg-white focus:ring-2 focus:ring-[#f7b944]"
                  placeholder="Enter custom intro text..."
                />
                <div className="mt-1.5 p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-[10.5px] text-amber-900 leading-snug">
                  <span className="font-bold block text-[11px] mb-0.5">Supports dynamic placeholders:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['{Connection Type}', '{Target Segment}', '{Scheme}', '{Capacity}'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentText = formData.introOpeningText !== undefined ? formData.introOpeningText : masterConfig.introOpeningText;
                          setFormData({ ...formData, introOpeningText: currentText + ' ' + tag });
                        }}
                        className="bg-white hover:bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-amber-900 font-mono text-[10px] font-bold cursor-pointer transition-colors"
                        title="Click to append placeholder"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tip: Use <strong className="font-bold">*text*</strong> for bold and press <strong>Enter</strong> for new lines.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: SCOPE OF WORK & QUANTITY CONTROLS (Item 3 in User Request)     */}
          {/* ========================================================================= */}
          {activeSection === 'SCOPE_OF_WORK' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold block text-xs mb-0.5">Scope of Work & Item Quantities</span>
                Customize the equipment specifications and explicit quantities for Solar Modules, Inverters, Battery storage, and Structures.
              </div>

              {/* 1. Solar PV Modules (Brand, Description & Qty) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-900">
                    1. Solar PV Modules
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Item 1
                  </span>
                </div>
                
                {/* Brand Quick Selector */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Servotec', full: 'SERVOTEC HHV [550 Wp] Mono Perc DCR Panels', brandName: 'Servotec' },
                    { label: 'Waaree', full: 'Waaree 540-550 Wp Bi-facial Dual Glass TopCon DCR Solar Panels', brandName: 'Waaree' },
                    { label: 'Adani', full: 'Adani Solar 545 Wp Mono PERC High Efficiency DCR Modules', brandName: 'Adani Solar' },
                    { label: 'Vikram', full: 'Vikram Solar 550 Wp Half-Cut Mono PERC DCR Panels', brandName: 'Vikram Solar' },
                    { label: 'Tata Power', full: 'Tata Power Solar 540 Wp Mono Crystalline DCR Panels', brandName: 'Tata Power Solar' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        updateBoqDescription(1, p.full);
                        setFormData(prev => ({
                          ...prev,
                          brandDeclarations: prev.brandDeclarations.map(b => 
                            b.slNo === 1 || b.description.toLowerCase().includes('module')
                              ? { ...b, brand: p.brandName, description: `Solar PV Modules (${p.brandName})` }
                              : b
                          )
                        }));
                      }}
                      className={`text-[9.5px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        (moduleItem?.itemDescription || '').toLowerCase().includes(p.brandName.toLowerCase())
                          ? 'bg-slate-900 text-[#f7b944]'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="text"
                    value={moduleItem?.itemDescription || ''}
                    onChange={(e) => updateBoqDescription(1, e.target.value)}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    placeholder="Module description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Module Qty / Rating</label>
                    <input
                      type="text"
                      value={moduleItem?.quantity || `${formData.capacityKwp} kWp`}
                      onChange={(e) => updateBoqQuantity(1, e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      placeholder="e.g. 4.95 kWp or 9 Nos"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Warranty Spec</label>
                    <input
                      type="text"
                      value={formData.brandDeclarations.find(b => b.slNo === 1)?.warrantySpec || '25 Years Performance'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          brandDeclarations: prev.brandDeclarations.map(b => b.slNo === 1 ? { ...b, warrantySpec: val } : b)
                        }));
                      }}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Solar Inverter (With Inverter Quantity Field) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-900">
                    2. Solar Inverter (Invertor Field)
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Item 2
                  </span>
                </div>

                {/* Brand Quick Selector */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Servotec', full: 'On-Grid Solar Inverter Make: SERVOTEC', brandName: 'Servotec' },
                    { label: 'Growatt', full: 'Growatt On-Grid Smart Inverter with Dual MPPT & WiFi Monitoring', brandName: 'Growatt' },
                    { label: 'Solis', full: 'Solis High-Efficiency Dual MPPT Grid-Tie Solar Inverter', brandName: 'Solis' },
                    { label: 'Sungrow', full: 'Sungrow Commercial Three Phase Inverter with AFCI Protection', brandName: 'Sungrow' },
                    { label: 'Deye', full: 'Deye Hybrid Energy Storage Inverter with Smart Load Control', brandName: 'Deye' }
                  ].map((inv, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        updateBoqDescription(2, inv.full);
                        setFormData(prev => ({
                          ...prev,
                          brandDeclarations: prev.brandDeclarations.map(b => 
                            b.slNo === 2 || b.description.toLowerCase().includes('inverter')
                              ? { ...b, brand: inv.brandName, description: `Solar Grid Inverter (${inv.brandName})` }
                              : b
                          )
                        }));
                      }}
                      className={`text-[9.5px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        (inverterItem?.itemDescription || '').toLowerCase().includes(inv.brandName.toLowerCase())
                          ? 'bg-slate-900 text-[#f7b944]'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {inv.label}
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="text"
                    value={inverterItem?.itemDescription || ''}
                    onChange={(e) => updateBoqDescription(2, e.target.value)}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    placeholder="Inverter description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 uppercase">Inverter Quantity (Qty) *</label>
                    <input
                      type="text"
                      value={inverterItem?.quantity || '1 Nos'}
                      onChange={(e) => updateBoqQuantity(2, e.target.value)}
                      className="w-full text-xs font-mono font-black px-2.5 py-1.5 bg-white border-2 border-amber-400 rounded-lg text-slate-900"
                      placeholder="e.g. 1 Nos, 2 Nos"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Inverter Warranty</label>
                    <input
                      type="text"
                      value={formData.brandDeclarations.find(b => b.slNo === 2)?.warrantySpec || '5 to 10 Years'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          brandDeclarations: prev.brandDeclarations.map(b => b.slNo === 2 ? { ...b, warrantySpec: val } : b)
                        }));
                      }}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Battery Storage (With Battery Quantity Field) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-900">
                    3. Battery Storage (Battery Field)
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Item 3
                  </span>
                </div>

                <select
                  value={batteryItem?.itemDescription || 'Nil'}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateBoqDescription(3, val);
                    if (val === 'Nil' || val.toLowerCase().includes('nil')) {
                      updateBoqQuantity(3, 'Nil');
                    } else if (batteryItem?.quantity === 'Nil' || !batteryItem?.quantity) {
                      updateBoqQuantity(3, '1 Nos');
                    }
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
                >
                  <option value="Nil">Nil (Direct Net-Metering On-Grid)</option>
                  <option value="5.12 kWh LiFePO4 Lithium Solar Battery Pack">5.12 kWh LiFePO4 Lithium Solar Battery Pack</option>
                  <option value="10.24 kWh High-Capacity Lithium Iron Phosphate (LFP) Battery">10.24 kWh High-Capacity Lithium Iron Phosphate (LFP) Battery</option>
                  <option value="Tubular C10 Solar Deep-Cycle Lead Acid Batteries (48V Bank)">Tubular C10 Solar Deep-Cycle Lead Acid Batteries (48V Bank)</option>
                  <option value="Custom Battery Storage System">Custom Battery Storage System</option>
                </select>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 uppercase">Battery Quantity (Qty) *</label>
                    <input
                      type="text"
                      value={batteryItem?.quantity || 'Nil'}
                      onChange={(e) => updateBoqQuantity(3, e.target.value)}
                      className="w-full text-xs font-mono font-black px-2.5 py-1.5 bg-white border-2 border-amber-400 rounded-lg text-slate-900"
                      placeholder="e.g. Nil, 1 Nos, 2 Nos"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Battery Status</label>
                    <span className="block text-xs font-bold text-slate-700 py-1.5 px-2 bg-slate-100 rounded-lg">
                      {batteryItem?.quantity?.toLowerCase().includes('nil') || batteryItem?.itemDescription?.toLowerCase().includes('nil') ? 'On-Grid (No Battery)' : 'Hybrid / Storage Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Mounting Structure */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-900">
                    4. Mounting Structure & Elevation
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Item 4
                  </span>
                </div>

                <input
                  type="text"
                  value={structureItem?.itemDescription || ''}
                  onChange={(e) => updateBoqDescription(4, e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                  placeholder="Mounting structure description..."
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Elevation / Qty</label>
                    <input
                      type="text"
                      value={structureItem?.quantity || '7 Feet'}
                      onChange={(e) => updateBoqQuantity(4, e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      placeholder="e.g. 7 Feet or 7 to 10 Feet"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Structure Type</label>
                    <input
                      type="text"
                      value={formData.brandDeclarations.find(b => b.slNo === 3)?.brand || 'Hot-Dip Galvanized'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          brandDeclarations: prev.brandDeclarations.map(b => b.slNo === 3 ? { ...b, brand: val } : b)
                        }));
                      }}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Supply & Installation Checklists Editor */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-800">
                    Supply Includes Checklist ({formData.supplyIncludes.length} items)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, supplyIncludes: [...prev.supplyIncludes, 'New supply equipment item...'] }))}
                    className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {formData.supplyIncludes.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            supplyIncludes: prev.supplyIncludes.map((s, i) => i === idx ? val : s)
                          }));
                        }}
                        className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, supplyIncludes: prev.supplyIncludes.filter((_, i) => i !== idx) }))}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: ANNEXURE A COSTING & DUAL GST                                  */}
          {/* ========================================================================= */}
          {activeSection === 'ANNEXURE_A_COSTING' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Base System Cost (₹)</label>
                <input
                  type="number"
                  value={formData.basicCost}
                  onChange={(e) => handleBasicCostChange(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Special Discount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.specialDiscount || 0}
                    onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-xs font-bold font-mono text-rose-700 bg-rose-50/40 border border-rose-200 rounded-xl focus:bg-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Base System Cost:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrencyINR(formData.basicCost)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Goods (80% @ 5%):</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrencyINR(formData.gstGoodsAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Services (20% @ 18%):</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrencyINR(formData.gstServicesAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total GST:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrencyINR(formData.totalGst)}</span>
                </div>
                {(formData.specialDiscount || 0) > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Special Discount:</span>
                    <span className="font-mono">- {formatCurrencyINR(formData.specialDiscount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-950 text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-[#f7b944] bg-slate-900 px-2 py-0.5 rounded">{formatCurrencyINR(formData.grandTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: PAYMENT TERMS                                                  */}
          {/* ========================================================================= */}
          {activeSection === 'PAYMENT_TERMS' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Advance %</label>
                  <input
                    type="number"
                    value={formData.advancePaymentPercent}
                    onChange={(e) => setFormData({ ...formData, advancePaymentPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Delivery %</label>
                  <input
                    type="number"
                    value={formData.deliveryPaymentPercent}
                    onChange={(e) => setFormData({ ...formData, deliveryPaymentPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Install %</label>
                  <input
                    type="number"
                    value={formData.installationPaymentPercent}
                    onChange={(e) => setFormData({ ...formData, installationPaymentPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Subsidy Guidance Note</label>
                <textarea
                  rows={3}
                  value={formData.subsidyNote}
                  onChange={(e) => setFormData({ ...formData, subsidyNote: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: BANKING DETAILS                                                */}
          {/* ========================================================================= */}
          {activeSection === 'BANKING_DETAILS' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Beneficiary Name</label>
                <input
                  type="text"
                  value={formData.beneficiaryName}
                  onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Account Type</label>
                  <input
                    type="text"
                    value={formData.accountType}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 7: TERMS AND CONDITIONS                                           */}
          {/* ========================================================================= */}
          {activeSection === 'TERMS_AND_CONDITIONS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-800">
                  Commercial Terms ({formData.termsAndConditions.length} points)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS }))}
                    className="text-[9.5px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, termsAndConditions: [...prev.termsAndConditions, 'New commercial term...'] }))}
                    className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded cursor-pointer"
                  >
                    + Add Term
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {formData.termsAndConditions.map((term, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 mt-1">{idx + 1}.</span>
                    <textarea
                      rows={2}
                      value={term}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          termsAndConditions: prev.termsAndConditions.map((t, i) => i === idx ? val : t)
                        }));
                      }}
                      className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg leading-snug"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, termsAndConditions: prev.termsAndConditions.filter((_, i) => i !== idx) }))}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 8: WARRANTY                                                       */}
          {/* ========================================================================= */}
          {activeSection === 'WARRANTY' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Solar PV Module Warranty (Years)</label>
                <input
                  type="number"
                  value={formData.moduleWarrantyYears}
                  onChange={(e) => setFormData({ ...formData, moduleWarrantyYears: parseInt(e.target.value) || 25 })}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Solar Inverter Warranty (Years)</label>
                <input
                  type="number"
                  value={formData.inverterWarrantyYears}
                  onChange={(e) => setFormData({ ...formData, inverterWarrantyYears: parseInt(e.target.value) || 5 })}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">BOS / System Warranty (Years)</label>
                <input
                  type="number"
                  value={formData.balanceOfSystemWarrantyYears}
                  onChange={(e) => setFormData({ ...formData, balanceOfSystemWarrantyYears: parseInt(e.target.value) || 1 })}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 9: PROJECT COMPLETION                                             */}
          {/* ========================================================================= */}
          {activeSection === 'PROJECT_COMPLETION' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Completion Timeline</label>
                <input
                  type="text"
                  value={formData.projectCompletionWeeks}
                  onChange={(e) => setFormData({ ...formData, projectCompletionWeeks: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. 2 to 3 weeks"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Standard execution milestone timelines are calculated from the receipt of purchase order and advance payment.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 10: ESTIMATED SOLAR BENEFITS                                      */}
          {/* ========================================================================= */}
          {activeSection === 'ESTIMATED_SOLAR_BENEFITS' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Reference Tariff (₹/Unit)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.tariffPerUnit}
                  onChange={(e) => setFormData({ ...formData, tariffPerUnit: parseFloat(e.target.value) || 8.0 })}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-2">
                <label className="block text-[11px] font-bold text-slate-800">Generation & Savings Assumptions</label>
                {(formData.tariffAssumptions || []).map((assump, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={assump}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          tariffAssumptions: (prev.tariffAssumptions || []).map((a, i) => i === idx ? val : a)
                        }));
                      }}
                      className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 11: BRAND DECLARATION & NOTES                                     */}
          {/* ========================================================================= */}
          {activeSection === 'BRAND_DECLARATION' && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-600 leading-relaxed">
                Brand matching table displayed on Page 4. Edit makes and warranties:
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {formData.brandDeclarations.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-800">{item.description}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Brand</span>
                        <input
                          type="text"
                          value={item.brand}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              brandDeclarations: prev.brandDeclarations.map((b, i) => i === idx ? { ...b, brand: val } : b)
                            }));
                          }}
                          className="w-full text-xs font-bold px-2 py-1 bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Warranty</span>
                        <input
                          type="text"
                          value={item.warrantySpec}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              brandDeclarations: prev.brandDeclarations.map((b, i) => i === idx ? { ...b, warrantySpec: val } : b)
                            }));
                          }}
                          className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 12: TECHNICAL ASSUMPTIONS                                         */}
          {/* ========================================================================= */}
          {activeSection === 'TECHNICAL_ASSUMPTIONS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-800">
                  Technical Assumptions ({formData.technicalAssumptions.length} items)
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, technicalAssumptions: [...prev.technicalAssumptions, 'New technical assumption...'] }))}
                  className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded cursor-pointer"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {formData.technicalAssumptions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 mt-1">{idx + 1}.</span>
                    <textarea
                      rows={2}
                      value={item}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          technicalAssumptions: prev.technicalAssumptions.map((a, i) => i === idx ? val : a)
                        }));
                      }}
                      className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg leading-snug"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, technicalAssumptions: prev.technicalAssumptions.filter((_, i) => i !== idx) }))}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 13: EXCLUSIONS                                                    */}
          {/* ========================================================================= */}
          {activeSection === 'EXCLUSIONS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-800">
                  Scope Exclusions ({formData.exclusions.length} items)
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, exclusions: [...prev.exclusions, 'New exclusion item...'] }))}
                  className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded cursor-pointer"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {formData.exclusions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 mt-1">{idx + 1}.</span>
                    <textarea
                      rows={2}
                      value={item}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          exclusions: prev.exclusions.map((ex, i) => i === idx ? val : ex)
                        }));
                      }}
                      className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg leading-snug"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, exclusions: prev.exclusions.filter((_, i) => i !== idx) }))}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 14: AUTHORIZED SIGNATURE & STAMP (Item 5 in User Request)         */}
          {/* ========================================================================= */}
          {activeSection === 'DISCLAIMER' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Warranty & Legal Disclaimer</label>
                <textarea
                  rows={3}
                  value={formData.warrantyDisclaimer}
                  onChange={(e) => setFormData({ ...formData, warrantyDisclaimer: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>Authorized Signatory & Stamp</span>
                  </h4>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Signatory Name</label>
                  <input
                    type="text"
                    value={formData.authorizedSignatoryName}
                    onChange={(e) => setFormData({ ...formData, authorizedSignatoryName: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. Authorized Signatory / S. Prakash"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Designation</label>
                  <input
                    type="text"
                    value={formData.signatoryDesignation}
                    onChange={(e) => setFormData({ ...formData, signatoryDesignation: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. OMMAX ELECTRIC PRIVATE LIMITED"
                  />
                </div>

                {/* SIGNATURE / STAMP IMAGE UPLOAD & VISIBILITY CONTROLS */}
                <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-2.5">
                  <label className="block text-[11px] font-bold text-amber-950">
                    Authorized Signature / Stamp Graphic (Image)
                  </label>

                  {/* Upload from device */}
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 hover:bg-amber-100 cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-amber-700" />
                      <span>Upload Signature / Seal Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureFileUpload}
                        className="hidden"
                      />
                    </label>

                    {formData.companyStampUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, companyStampUrl: '' }))}
                        className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer"
                        title="Remove Signature Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Direct Image URL input */}
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Or Paste Direct Image URL:</span>
                    <input
                      type="text"
                      value={formData.companyStampUrl || ''}
                      onChange={(e) => setFormData({ ...formData, companyStampUrl: e.target.value, companyStampEnabled: true })}
                      placeholder="https://.../signature_seal.png"
                      className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* Live Thumbnail Preview */}
                  {formData.companyStampUrl ? (
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-300 flex items-center gap-3">
                      <div className="w-16 h-12 bg-slate-50 border border-slate-200 rounded flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={formData.companyStampUrl}
                          alt="Signature Preview"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Custom Signature Active</span>
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          Replaces default seal in preview & print
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-slate-500 bg-white/70 p-2 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>No custom image uploaded. Clean signatory typography will be used.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: REAL-TIME FULL 5-PAGE A4 PREVIEW (Item 1 & 2 in User Request)*/}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Quick Jump Page Navigation Bar */}
          <div className="sticky top-2 z-20 bg-slate-900/95 backdrop-blur-xs text-white p-2.5 rounded-2xl shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-[#f7b944] tracking-wider">Quick Page Jump:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5">
              {[
                { page: 1, label: 'Page 1 : Cover & Intro', section: 'HEADER_TO', id: 'preview-page-1' },
                { page: 2, label: 'Page 2 : Scope & Costing', section: 'SCOPE_OF_WORK', id: 'preview-page-2' },
                { page: 3, label: 'Page 3 : Payment & Bank', section: 'PAYMENT_TERMS', id: 'preview-page-3' },
                { page: 4, label: 'Page 4 : Warranties & Matrix', section: 'WARRANTY', id: 'preview-page-4' },
                { page: 5, label: 'Page 5 : Signatures & Stamp', section: 'DISCLAIMER', id: 'preview-page-5' },
              ].map((btn) => (
                <button
                  key={btn.page}
                  type="button"
                  onClick={() => {
                    setActiveSection(btn.section as SectionKey);
                    document.getElementById(btn.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    document.getElementById('active-editor-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-[#f7b944] hover:text-slate-950 text-slate-200 transition-all whitespace-nowrap cursor-pointer border border-slate-700 hover:border-[#f7b944]"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Continuous A4 Document Container */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xl overflow-hidden max-w-[840px] mx-auto text-slate-800 text-xs divide-y-2 divide-slate-200">
            
            {/* ===================================================================== */}
            {/* PAGE 1 CONTENT BLOCK                                                  */}
            {/* ===================================================================== */}
            <div id="preview-page-1" className="p-6 sm:p-8 space-y-5 bg-white relative">
              <div className="absolute top-3 right-3 bg-slate-900 text-[#f7b944] text-[9px] font-black px-2 py-0.5 rounded shadow-xs">
                PAGE 1 : COVER & PROPOSAL
              </div>

              {/* 1. Letterhead Banner */}
              {formData.letterhead?.headerImageUrl ? (
                <div 
                  className="w-full overflow-hidden bg-white border-b border-slate-200 flex items-center justify-center mb-2"
                  style={{ height: `${formData.letterhead.headerHeight || 80}px` }}
                >
                  <img 
                    src={formData.letterhead.headerImageUrl} 
                    alt="Company Letterhead Header" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="p-5 bg-slate-900 text-white border-b-4 border-[#f7b944] rounded-xl flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-[#f7b944]">
                      OMMAX ELECTRIC PRIVATE LIMITED
                    </h1>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Rooftop Solar EPC • Industrial & Domestic Power Plants • Net-Metering Solutions
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-mono">
                    <div>GSTIN: 33AAFCO8735C1ZX</div>
                    <div>CIN: U31909TN2021PTC146782</div>
                  </div>
                </div>
              )}

              {/* Reference & Date Block */}
              <div 
                onClick={() => setActiveSection('HEADER_TO')}
                className={`group relative cursor-pointer rounded-xl p-3 transition-all border ${
                  activeSection === 'HEADER_TO' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit Reference
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[9.5px] font-black uppercase text-slate-400 block">Offer Reference No.</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {formData.offerNo} <span className="text-amber-700">({formData.revisionCode})</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] font-black uppercase text-slate-400 block">Date & Validity</span>
                    <span className="font-bold text-slate-800">
                      {formatDateToDMY(formData.date)} • 4 Weeks Validity
                    </span>
                  </div>
                </div>
              </div>

              {/* To & Subject Block */}
              <div 
                onClick={() => setActiveSection('HEADER_TO')}
                className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                  activeSection === 'HEADER_TO' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit Client & Subject
                </span>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">To:</span>
                  <div className="font-extrabold text-slate-900 text-sm">{formData.clientName}</div>
                  <div className="text-slate-600 text-xs flex items-start gap-1 mt-0.5 whitespace-pre-line">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{formData.location}</span>
                  </div>
                  {formData.contactPhone && (
                    <div className="text-slate-600 text-xs flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formData.contactPhone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 mt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Subject:</span>
                  <span className="text-slate-900 font-normal">
                    {renderFormattedText(
                      interpolateSubject(formData.subject, {
                        capacityKw: formData.capacityKw,
                        capacityKwp: formData.capacityKwp || formData.capacityKw,
                        connectionType: formData.connectionType || formData.systemType,
                        scheme: formData.scheme,
                        clientName: formData.clientName,
                        projectName: formData.projectName,
                        location: formData.location
                      })
                    )}
                  </span>
                </div>
              </div>

              {/* Intro Letter Text */}
              <div 
                onClick={() => setActiveSection('INTRO')}
                className={`group relative cursor-pointer rounded-xl p-3 transition-all border ${
                  activeSection === 'INTRO' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit Intro
                </span>
                <div className="font-bold text-slate-900 mb-1">{formData.salutation}</div>
                <div className="text-slate-700 leading-relaxed text-justify space-y-2">
                  {(() => {
                    const rawIntro = formData.introOpeningText || masterConfig.introOpeningText;
                    const interpolated = interpolateOpeningText(rawIntro, {
                      connectionType: formData.connectionType,
                      targetSegment: formData.targetSegment,
                      scheme: formData.scheme,
                      capacityKw: formData.capacityKw,
                      clientName: formData.clientName,
                      projectName: formData.projectName
                    });
                    const paragraphs = interpolated.split(/\r?\n\r?\n+/).map(p => p.trim()).filter(Boolean);
                    return paragraphs.map((para, pIdx) => (
                      <p key={pIdx} className="whitespace-pre-line">{renderFormattedText(para)}</p>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* PAGE 2 CONTENT BLOCK : SCOPE OF WORK & ANNEXURE A COSTING             */}
            {/* ===================================================================== */}
            <div id="preview-page-2" className="p-6 sm:p-8 space-y-5 bg-white relative">
              <div className="absolute top-3 right-3 bg-slate-900 text-[#f7b944] text-[9px] font-black px-2 py-0.5 rounded shadow-xs">
                PAGE 2 : SCOPE OF WORK & COSTING
              </div>

              {/* Scope of Work Technical Cards with Quantities */}
              <div 
                onClick={() => {
                  setActiveSection('SCOPE_OF_WORK');
                  document.getElementById('active-editor-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                  activeSection === 'SCOPE_OF_WORK' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit Scope & Quantities
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  <span>Scope of Work & Technical Bill of Materials</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Module */}
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-amber-900">Solar PV Module</span>
                      <span className="text-[10px] font-mono font-black text-amber-950 bg-amber-200/80 px-1.5 py-0.2 rounded">
                        Qty: {moduleItem?.quantity || `${formData.capacityKwp} kWp`}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 mt-1 block">
                      {moduleItem?.itemDescription || 'Solar PV Modules – 550 Wp Mono Perc DCR'}
                    </span>
                  </div>

                  {/* Inverter */}
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-amber-900">Solar Inverter</span>
                      <span className="text-[10px] font-mono font-black text-amber-950 bg-amber-200/80 px-1.5 py-0.2 rounded">
                        Qty: {inverterItem?.quantity || '1 Set'}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 mt-1 block">
                      {inverterItem?.itemDescription || 'Solar Inverter – On-Grid Inverter'}
                    </span>
                  </div>

                  {/* Battery */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-600">Battery</span>
                      <span className="text-[10px] font-mono font-black text-slate-800 bg-slate-200 px-1.5 py-0.2 rounded">
                        Qty: {batteryItem?.quantity || 'Nil'}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 mt-1 block">
                      {batteryItem?.itemDescription && batteryItem.itemDescription !== 'Nil' ? batteryItem.itemDescription : 'Battery'}
                    </span>
                  </div>

                  {/* Structure */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-600">Mounting Structure</span>
                      <span className="text-[10px] font-mono font-black text-slate-800 bg-slate-200 px-1.5 py-0.2 rounded">
                        Qty: {structureItem?.quantity || '7 Feet'}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 mt-1 block">
                      {structureItem?.itemDescription || 'Mounting Structure – Table RCC Structure'}
                    </span>
                  </div>
                </div>

                {/* Detailed Checklists */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 mt-3 text-[11px]">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Supply Includes ({formData.supplyIncludes.length}):</span>
                    <ul className="space-y-0.5 text-slate-600 pl-3 list-disc">
                      {formData.supplyIncludes.slice(0, 4).map((s, i) => (
                        <li key={i} className="truncate">{renderFormattedText(s)}</li>
                      ))}
                      {formData.supplyIncludes.length > 4 && (
                        <li className="text-[10px] text-amber-700 font-semibold">+ {formData.supplyIncludes.length - 4} more items</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Installation Includes ({formData.installationIncludes.length}):</span>
                    <ul className="space-y-0.5 text-slate-600 pl-3 list-disc">
                      {formData.installationIncludes.slice(0, 4).map((inst, i) => (
                        <li key={i} className="truncate">{renderFormattedText(inst)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Annexure A Commercial Costing Table */}
              <div 
                onClick={() => setActiveSection('ANNEXURE_A_COSTING')}
                className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                  activeSection === 'ANNEXURE_A_COSTING' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit Costing
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Annexure A – Project Cost Summary (Dual GST 80:20 Split)</span>
                  </span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2.5 font-semibold">Turnkey Solar PV System ({formData.capacityKwp} kWp)</td>
                        <td className="p-2.5 text-center font-mono">{formData.capacityKwp} kWp</td>
                        <td className="p-2.5 text-right font-mono font-bold">{formatCurrencyINR(formData.basicCost)}</td>
                      </tr>
                      <tr className="bg-slate-50/60 text-[11px] text-slate-600">
                        <td colSpan={2} className="p-2 pl-4">• GST on Goods (80% value @ 5% GST):</td>
                        <td className="p-2 text-right font-mono font-bold">{formatCurrencyINR(formData.gstGoodsAmount)}</td>
                      </tr>
                      <tr className="bg-slate-50/60 text-[11px] text-slate-600">
                        <td colSpan={2} className="p-2 pl-4">• GST on Services (20% value @ 18% GST):</td>
                        <td className="p-2 text-right font-mono font-bold">{formatCurrencyINR(formData.gstServicesAmount)}</td>
                      </tr>
                      {(formData.specialDiscount || 0) > 0 && (
                        <tr className="bg-rose-50 text-rose-800 font-bold text-[11px]">
                          <td colSpan={2} className="p-2 pl-4">• Special Commercial Discount:</td>
                          <td className="p-2 text-right font-mono">- {formatCurrencyINR(formData.specialDiscount || 0)}</td>
                        </tr>
                      )}
                      <tr className="bg-[#f7b944]/20 border-t-2 border-slate-900 font-black">
                        <td colSpan={2} className="p-3 text-slate-950 text-sm uppercase">Total Net Payable (Incl. Dual GST):</td>
                        <td className="p-3 text-right font-mono text-base text-slate-950">{formatCurrencyINR(formData.grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* PAGE 3 CONTENT BLOCK : PAYMENT TERMS, BANKING & TERMS & CONDITIONS   */}
            {/* ===================================================================== */}
            <div id="preview-page-3" className="p-6 sm:p-8 space-y-5 bg-white relative">
              <div className="absolute top-3 right-3 bg-slate-900 text-[#f7b944] text-[9px] font-black px-2 py-0.5 rounded shadow-xs">
                PAGE 3 : PAYMENT & TERMS
              </div>

              {/* Payment & Banking Split */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => {
                    setActiveSection('PAYMENT_TERMS');
                    document.getElementById('active-editor-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                    activeSection === 'PAYMENT_TERMS' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                    Click to Edit
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Commercial Payment Terms</span>
                  <div className="text-xs font-bold text-slate-800 mt-1 space-y-0.5">
                    <div>• {formData.advancePaymentPercent}% Advance with Work Order</div>
                    <div>• {formData.deliveryPaymentPercent}% on Material Delivery at Site</div>
                    <div>• {formData.installationPaymentPercent}% on Grid Synchronization</div>
                  </div>
                  <div className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200/60 mt-2">
                    {formData.subsidyNote}
                  </div>
                </div>

                <div 
                  onClick={() => {
                    setActiveSection('BANKING_DETAILS');
                    document.getElementById('active-editor-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                    activeSection === 'BANKING_DETAILS' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                    Click to Edit
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Corporate Bank Account</span>
                  <div className="text-xs font-bold text-slate-900 mt-1">{formData.beneficiaryName}</div>
                  <div className="text-xs text-slate-700">{formData.bankName}</div>
                  <div className="text-[11px] font-mono text-slate-600 mt-1">A/C: {formData.accountNumber}</div>
                  <div className="text-[11px] font-mono text-slate-600">IFSC: {formData.ifscCode}</div>
                </div>
              </div>

              {/* Standard Terms and Conditions */}
              <div 
                onClick={() => {
                  setActiveSection('TERMS_AND_CONDITIONS');
                  document.getElementById('active-editor-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                  activeSection === 'TERMS_AND_CONDITIONS' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit Terms
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Standard Commercial Terms & Conditions</span>
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-slate-700 text-[11px] leading-relaxed">
                  {formData.termsAndConditions.slice(0, 5).map((term, i) => (
                    <li key={i}>{renderFormattedText(term)}</li>
                  ))}
                  {formData.termsAndConditions.length > 5 && (
                    <li className="text-amber-800 font-bold list-none">+ {formData.termsAndConditions.length - 5} more standard clauses</li>
                  )}
                </ol>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* PAGE 4 CONTENT BLOCK : WARRANTIES, TIMELINE, SAVINGS & BRANDS        */}
            {/* ===================================================================== */}
            <div id="preview-page-4" className="p-6 sm:p-8 space-y-5 bg-white relative">
              <div className="absolute top-3 right-3 bg-slate-900 text-[#f7b944] text-[9px] font-black px-2 py-0.5 rounded shadow-xs">
                PAGE 4 : WARRANTIES & SAVINGS MATRIX
              </div>

              {/* Warranties & Timeline Badges */}
              <div 
                onClick={() => {
                  setActiveSection('WARRANTY');
                  document.getElementById('active-editor-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                  activeSection === 'WARRANTY' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Equipment Warranties & Project Execution Timeline</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-800 uppercase block font-bold">Solar Modules</span>
                    <span className="text-sm font-black text-amber-950">{formData.moduleWarrantyYears} Years</span>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-800 uppercase block font-bold">Inverter</span>
                    <span className="text-sm font-black text-amber-950">{formData.inverterWarrantyYears} Years</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-600 uppercase block font-bold">BOS / System</span>
                    <span className="text-sm font-black text-slate-900">{formData.balanceOfSystemWarrantyYears} Year</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-600 uppercase block font-bold">Execution</span>
                    <span className="text-xs font-black text-slate-900 pt-1 block">{formData.projectCompletionWeeks}</span>
                  </div>
                </div>
              </div>

              {/* Estimated Solar Benefits Matrix */}
              <div 
                onClick={() => {
                  setActiveSection('ESTIMATED_SOLAR_BENEFITS');
                  document.getElementById('active-editor-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                  activeSection === 'ESTIMATED_SOLAR_BENEFITS' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Estimated Solar Generation & Electricity Bill Savings Matrix</span>
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-[10.5px] text-left border-collapse">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="p-2">System</th>
                        <th className="p-2">Bi-Monthly Units</th>
                        <th className="p-2">Bi-Monthly Savings</th>
                        <th className="p-2">Annual Savings</th>
                        <th className="p-2">10-Yr Cumulative</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {formData.benefitsTable.map((row, idx) => (
                        <tr key={idx} className={row.solarSystem.includes(String(Math.round(formData.capacityKwp))) ? 'bg-amber-50 font-bold' : ''}>
                          <td className="p-2 font-mono">{row.solarSystem}</td>
                          <td className="p-2 font-mono">{row.biMonthlyGenerationUnits}</td>
                          <td className="p-2 font-mono text-emerald-700">{row.biMonthlyEbSavings}</td>
                          <td className="p-2 font-mono text-emerald-800 font-bold">{row.annualSavings}</td>
                          <td className="p-2 font-mono text-slate-900 font-bold">{row.tenYearsSavings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Brand Declaration Table */}
              <div 
                onClick={() => {
                  setActiveSection('BRAND_DECLARATION');
                  document.getElementById('active-editor-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group relative cursor-pointer rounded-xl p-3.5 transition-all border ${
                  activeSection === 'BRAND_DECLARATION' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Brand Declaration & Specification Matrix</span>
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-[10.5px] text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2 w-8">Sl</th>
                        <th className="p-2">Component</th>
                        <th className="p-2">Brand / Make</th>
                        <th className="p-2">Warranty Spec</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {formData.brandDeclarations.map((b) => (
                        <tr key={b.slNo}>
                          <td className="p-1.5 font-mono text-slate-400">{b.slNo}</td>
                          <td className="p-1.5 font-bold text-slate-800">{renderFormattedText(b.description)}</td>
                          <td className="p-1.5 text-amber-800 font-bold">{renderFormattedText(b.brand)}</td>
                          <td className="p-1.5 text-slate-600">{renderFormattedText(b.warrantySpec)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* PAGE 5 CONTENT BLOCK : ASSUMPTIONS, EXCLUSIONS, SIGNATORY & STAMP     */}
            {/* ===================================================================== */}
            <div id="preview-page-5" className="p-6 sm:p-8 space-y-5 bg-white relative">
              <div className="absolute top-3 right-3 bg-slate-900 text-[#f7b944] text-[9px] font-black px-2 py-0.5 rounded shadow-xs">
                PAGE 5 : DISCLAIMER & SIGNATORY
              </div>

              {/* Assumptions & Exclusions 2-Column */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setActiveSection('TECHNICAL_ASSUMPTIONS')}
                  className={`group relative cursor-pointer rounded-xl p-3 transition-all border ${
                    activeSection === 'TECHNICAL_ASSUMPTIONS' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                    Click to Edit
                  </span>
                  <h5 className="text-[11px] font-black uppercase text-slate-800 mb-1.5">Technical Assumptions</h5>
                  <ul className="space-y-1 text-[10.5px] text-slate-600 list-disc pl-3">
                    {formData.technicalAssumptions.slice(0, 4).map((a, i) => (
                      <li key={i} className="whitespace-pre-line">{renderFormattedText(a)}</li>
                    ))}
                  </ul>
                </div>

                <div 
                  onClick={() => setActiveSection('EXCLUSIONS')}
                  className={`group relative cursor-pointer rounded-xl p-3 transition-all border ${
                    activeSection === 'EXCLUSIONS' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                    Click to Edit
                  </span>
                  <h5 className="text-[11px] font-black uppercase text-slate-800 mb-1.5">Scope Exclusions</h5>
                  <ul className="space-y-1 text-[10.5px] text-slate-600 list-disc pl-3">
                    {formData.exclusions.slice(0, 4).map((ex, i) => (
                      <li key={i}>{renderFormattedText(ex)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Warranty Disclaimer */}
              <div 
                onClick={() => setActiveSection('DISCLAIMER')}
                className={`group relative cursor-pointer rounded-xl p-3 transition-all border ${
                  activeSection === 'DISCLAIMER' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Edit
                </span>
                <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Legal Disclaimer</span>
                <p className="text-[10.5px] text-slate-600 leading-relaxed text-justify">
                  {renderFormattedText(formData.warrantyDisclaimer)}
                </p>
              </div>

              {/* Official Signatory & Stamp Block (Item 5 in User Request) */}
              <div 
                onClick={() => setActiveSection('DISCLAIMER')}
                className={`group relative cursor-pointer rounded-xl p-4 transition-all border-2 ${
                  activeSection === 'DISCLAIMER' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-400' : 'hover:bg-slate-50 border-slate-200'
                } flex flex-wrap items-end justify-between gap-4`}
              >
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-[#f7b944] text-[8px] font-black px-1.5 py-0.5 rounded transition-opacity">
                  Click to Upload Stamp / Signatory
                </span>

                {/* Left: Client Acceptance endorsement line */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Accepted & Confirmed By Client</span>
                  <div className="w-48 h-12 border-b border-slate-400 flex items-end">
                    <span className="text-[9.5px] text-slate-400 pb-0.5">Signature & Date</span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold">{formData.clientName}</div>
                </div>

                {/* Right: Company Official Signatory Frame */}
                <div className="text-right flex flex-col items-end space-y-1">
                  <div className="text-xs font-black text-slate-950 uppercase tracking-wide">
                    For {formData.signatoryDesignation || 'OMMAX ELECTRIC PRIVATE LIMITED'}
                  </div>

                  {/* Stamp / Signature Frame: displays uploaded image or clean signature */}
                  <div className="relative w-44 h-16 flex items-center justify-end my-0.5">
                    {formData.companyStampUrl ? (
                      <img 
                        src={formData.companyStampUrl} 
                        alt="Authorized Signatory Stamp" 
                        className="max-h-16 max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-36 h-14 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-1 text-slate-500 bg-slate-50">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600">[Authorized Seal & Sign]</span>
                        <span className="text-[9px] font-serif italic text-slate-700 font-bold">{formData.authorizedSignatoryName}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-800 border-t border-slate-400 pt-1 w-44 text-center">
                    {formData.authorizedSignatoryName || 'Authorized Signatory'}
                  </div>
                </div>
              </div>

              {/* Letterhead Footer */}
              {formData.letterhead?.footerImageUrl ? (
                <div 
                  className="w-full overflow-hidden bg-white border-t border-slate-200 flex items-center justify-center pt-2"
                  style={{ height: `${formData.letterhead.footerHeight || 60}px` }}
                >
                  <img 
                    src={formData.letterhead.footerImageUrl} 
                    alt="Company Letterhead Footer" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-[10px] text-slate-500 rounded-lg">
                  Corporate Office: Chrompet, Chennai, Tamil Nadu - 600044 • www.ommaxelectric.com • info@ommaxelectric.com
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* 5-Page Live Print View Modal */}
      {showPrintModal && (
        <Quotation5PagePrintView
          quotation={formData}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
