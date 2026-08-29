import React, { useState } from 'react';
import { 
  SolarQuotation, 
  BOQItem, 
  DEFAULT_SUPPLY_INCLUDES, 
  DEFAULT_INSTALLATION_INCLUDES, 
  DEFAULT_TERMS_AND_CONDITIONS,
  DEFAULT_BRAND_DECLARATIONS,
  DEFAULT_TECHNICAL_ASSUMPTIONS,
  DEFAULT_EXCLUSIONS,
  DEFAULT_SAVINGS_BENEFITS,
  calculateSolarPricing,
  getNextOfferNumber,
  LetterheadConfig,
  buildDefaultBOQItems
} from '../../quotation/types';
import { CRMOpportunity, CRMAccount, CRMContact } from '../../crm/types';
import { User, AppSettings } from '../../types';
import { 
  Sun, 
  Save, 
  Eye, 
  CheckCircle, 
  History, 
  Plus, 
  Trash2, 
  GripVertical, 
  Image as ImageIcon, 
  Sliders, 
  Calculator, 
  FileText, 
  ArrowLeft, 
  RefreshCw, 
  Layers, 
  DollarSign, 
  ShieldCheck, 
  Building2, 
  Percent, 
  Sparkles,
  Link2,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import Quotation5PagePrintView from './Quotation5PagePrintView';

interface SolarQuotationBuilderProps {
  initialQuotation?: SolarQuotation;
  opportunities: CRMOpportunity[];
  accounts: CRMAccount[];
  contacts: CRMContact[];
  currentUser: User | null;
  appSettings: AppSettings;
  onSave: (quotation: SolarQuotation, isSubmit?: boolean) => void;
  onCancel?: () => void;
}

export default function SolarQuotationBuilder({
  initialQuotation,
  opportunities,
  accounts,
  contacts,
  currentUser,
  appSettings,
  onSave,
  onCancel
}: SolarQuotationBuilderProps) {
  // Active Builder Step / Tab
  const [activeSubTab, setActiveSubTab] = useState<'DETAILS' | 'BOQ' | 'COSTING' | 'LETTERHEAD' | 'TERMS' | 'REVISIONS'>('DETAILS');

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Revision Modal
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  // Main Quotation State
  const [formData, setFormData] = useState<SolarQuotation>(() => {
    if (initialQuotation) return initialQuotation;

    const baseCost = 312018;
    const discount = 5000;
    const pricing = calculateSolarPricing(baseCost, discount);

    return {
      id: `QUO-${Date.now()}`,
      quotationNo: `QUO-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      offerNo: getNextOfferNumber(1, 0),
      revisionIndex: 0,
      revisionCode: 'R-0',
      title: '4.95 kWp Rooftop Solar PV Power Plant Proposal',
      type: 'SOLAR_EPC',
      status: 'DRAFT',
      projectName: 'Mr Prakash',
      clientName: 'Mr Prakash',
      location: 'Sathambadi, Ariyalur',
      state: 'Tamil Nadu',
      scheme: 'PM Surya Ghar: Muft Bijli Yojana',
      subject: 'Proposal for 4.95 kWp Roof top Solar',
      salutation: 'Dear Valued Customer,',
      date: new Date().toISOString().split('T')[0],
      priceValidityDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      capacityKw: 4.95,
      capacityKwp: 4.95,
      systemType: 'ON_GRID',
      gridEvacuationVoltage: '230V Single Phase',
      supplyIncludes: [...DEFAULT_SUPPLY_INCLUDES],
      installationIncludes: [...DEFAULT_INSTALLATION_INCLUDES],
      boqItems: [
        { id: 'boq-1', slNo: 1, itemDescription: 'SERVOTEC HHV [550 Wp] Mono Perc DCR', quantity: '4.95 kWp' },
        { id: 'boq-2', slNo: 2, itemDescription: '5 kVA Single Phase On-Grid Inverter Make: SERVOTEC', quantity: '1 Nos' },
        { id: 'boq-3', slNo: 3, itemDescription: 'Nil', quantity: 'Nil' },
        { id: 'boq-4', slNo: 4, itemDescription: 'Table RCC Structure', quantity: '7 Feet' },
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
      createdBy: currentUser?.fullName || 'Admin Operator',
      createdAt: new Date().toISOString(),
      revisionHistory: [
        {
          revisionCode: 'R-0',
          timestamp: new Date().toISOString(),
          author: currentUser?.fullName || 'Admin Operator',
          reason: 'Initial proposal draft',
          basicCost: baseCost,
          grandTotal: pricing.grandTotal
        }
      ]
    };
  });

  // Re-calculate cost & GST automatically whenever basicCost or specialDiscount changes
  const handleCostChange = (basic: number, discount: number) => {
    const pricing = calculateSolarPricing(basic, discount);
    setFormData(prev => ({
      ...prev,
      basicCost: basic,
      specialDiscount: discount,
      gstGoodsAmount: pricing.gstGoods,
      gstServicesAmount: pricing.gstServices,
      totalGst: pricing.totalGst,
      grandTotal: pricing.grandTotal
    }));
  };

  // Opportunity Selection Handler - Auto populates Customer & Project details
  const handleSelectOpportunity = (oppId: string) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp) return;

    const acc = accounts.find(a => a.id === opp.accountId);
    const con = contacts.find(c => c.id === opp.contactId);

    let clientName = opp.title || 'Valued Client';
    if (con) {
      const rawName = (con.name || [con.firstName, con.lastName].filter(Boolean).join(' ') || '').trim();
      const sal = (con.salutation || '').trim();
      if (sal && rawName && !rawName.toLowerCase().startsWith(sal.toLowerCase())) {
        clientName = `${sal} ${rawName}`;
      } else {
        clientName = rawName || acc?.name || opp.title || 'Valued Client';
      }
    } else {
      clientName = acc?.name || opp.title || 'Valued Client';
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
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      accountId: opp.accountId,
      accountName: '', // Remove account name from To section
      contactId: opp.contactId,
      contactName: con?.name || '',
      contactPhone: con?.phone || con?.mobile || acc?.phone || '',
      contactEmail: con?.email || acc?.email || '',
      projectName: clientName,
      clientName: clientName,
      location: fullAddressStr,
      subject: `Proposal for ${prev.capacityKw} kWp Rooftop Solar - ${opp.title}`
    }));
  };

  // BOQ Drag & Re-order simulation
  const handleMoveBOQItem = (index: number, direction: 'UP' | 'DOWN') => {
    const newItems = [...formData.boqItems];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    // Re-index slNo
    const reindexed = newItems.map((it, idx) => ({ ...it, slNo: idx + 1 }));
    setFormData(prev => ({ ...prev, boqItems: reindexed }));
  };

  const handleAddBOQItem = () => {
    const newItem: BOQItem = {
      id: `boq-${Date.now()}`,
      slNo: formData.boqItems.length + 1,
      itemDescription: 'New Solar Component / Supply Item',
      quantity: '1 Set'
    };
    setFormData(prev => ({ ...prev, boqItems: [...prev.boqItems, newItem] }));
  };

  const handleDeleteBOQItem = (id: string) => {
    const filtered = formData.boqItems.filter(item => item.id !== id);
    const reindexed = filtered.map((it, idx) => ({ ...it, slNo: idx + 1 }));
    setFormData(prev => ({ ...prev, boqItems: reindexed }));
  };

  const handleUpdateBOQItem = (id: string, field: keyof BOQItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      boqItems: prev.boqItems.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  // Letterhead Configuration Update Helper
  const handleLetterheadChange = (field: keyof LetterheadConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      letterhead: {
        ...prev.letterhead,
        [field]: value
      }
    }));
  };

  // Create Revision (R-0 -> R-1 -> R-2)
  const handleCreateRevision = () => {
    if (!revisionReason.trim()) {
      alert('Please provide a reason for the revision (e.g., Price negotiation, Scope adjustment).');
      return;
    }

    const nextRevIndex = formData.revisionIndex + 1;
    const nextRevCode = `R-${nextRevIndex}`;
    const baseOffer = formData.offerNo.replace(/R\d+$/, '');
    const newOfferNo = `${baseOffer}R${nextRevIndex}`;

    const newRevisionEntry = {
      revisionCode: nextRevCode,
      timestamp: new Date().toISOString(),
      author: currentUser?.fullName || 'Admin Operator',
      reason: revisionReason.trim(),
      basicCost: formData.basicCost,
      grandTotal: formData.grandTotal,
      changesSummary: `Revision ${nextRevCode} created: ${revisionReason.trim()}`
    };

    setFormData(prev => ({
      ...prev,
      revisionIndex: nextRevIndex,
      revisionCode: nextRevCode,
      offerNo: newOfferNo,
      status: 'UNDER_REVISION',
      updatedAt: new Date().toISOString(),
      revisionHistory: [newRevisionEntry, ...(prev.revisionHistory || [])]
    }));

    setIsRevisionModalOpen(false);
    setRevisionReason('');
  };

  // Quick Capacity Change (Recalculates units and subsidy recommendation)
  const handleCapacityChange = (kw: number) => {
    let subsidyText = '';
    if (kw <= 1) {
      subsidyText = 'Subsidy of Rs. 30,000 for 1kW will be credited to the customer\'s account after uploading required documents on the portal.';
    } else if (kw <= 2) {
      subsidyText = 'Subsidy of Rs. 60,000 for 2kW and Rs. 30,000 for 1kW will be credited to the customer\'s account after uploading required documents on the portal.';
    } else {
      subsidyText = 'Subsidy of Rs. 78,000 for 3kW, Rs. 60,000 for 2kW and Rs. 30,000 for 1kW will be credited to the customer\'s account after uploading required documents on the portal.';
    }

    // Auto-update BOQ items reflecting new capacity
    const updatedBOQ = formData.boqItems.map(item => {
      if (item.slNo === 1) return { ...item, quantity: `${kw} kWp` };
      if (item.slNo === 3) return { ...item, itemDescription: `Table RCC Mounting Structure Elevation for ${Math.ceil(kw)} kW` };
      if (item.slNo === 4) return { ...item, itemDescription: `${Math.ceil(kw)} kVA Single Phase On-Grid Hybrid Inverter – Make: SERVOTEC` };
      if (item.slNo === 5 || item.slNo === 6 || item.slNo === 7) return { ...item, quantity: `${kw} kWp` };
      return item;
    });

    setFormData(prev => ({
      ...prev,
      capacityKw: kw,
      capacityKwp: kw,
      subject: `Proposal for ${kw} kWp Roof top Solar`,
      subsidyNote: subsidyText,
      boqItems: updatedBOQ
    }));
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('DETAILS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'DETAILS'
              ? 'bg-[#f7b944] text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>1. Customer & Project Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('BOQ')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'BOQ'
              ? 'bg-[#f7b944] text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Bill of Quantities (BOQ)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('COSTING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'COSTING'
              ? 'bg-[#f7b944] text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>3. Costing & Dual GST (80:20)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('LETTERHEAD')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'LETTERHEAD'
              ? 'bg-[#f7b944] text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>4. Letterhead & Format Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('TERMS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'TERMS'
              ? 'bg-[#f7b944] text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>5. Bank, Warranty & Terms</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('REVISIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'REVISIONS'
              ? 'bg-[#f7b944] text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Revision History ({formData.revisionHistory?.length || 1})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CUSTOMER & PROJECT INFO                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'DETAILS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CRM Opportunity Linker */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Link2 className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Link CRM Opportunity
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Opportunity (Auto-Fill)
              </label>
              <select
                value={formData.opportunityId || ''}
                onChange={(e) => handleSelectOpportunity(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
              >
                <option value="">-- Choose Opportunity --</option>
                {opportunities.map(opp => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title} ({opp.accountName} - ₹{opp.amount.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Selecting an opportunity instantly populates customer contact, billing address, and project title.
              </p>
            </div>

            {/* Capacity Dropdown & Quick Presets */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Capacity (kWp) *
                </label>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-mono">
                  {formData.capacityKwp || formData.capacityKw} kWp
                </span>
              </div>
              
              <select
                value={formData.capacityKwp || formData.capacityKw}
                onChange={(e) => handleCapacityChange(parseFloat(e.target.value) || 4.95)}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
              >
                <option value={2.22}>2.22 kWp (4 x 550 Wp Panels)</option>
                <option value={3.33}>3.33 kWp (6 x 550 Wp Panels)</option>
                <option value={4.95}>4.95 kWp (9 x 550 Wp Panels - 5 kW Class)</option>
                <option value={5.00}>5.00 kWp (Standard 5 kW System)</option>
                <option value={5.50}>5.50 kWp (10 x 550 Wp Panels)</option>
                <option value={10.00}>10.00 kWp (Commercial Three Phase)</option>
                <option value={15.00}>15.00 kWp (Commercial 15 kWp)</option>
                <option value={20.00}>20.00 kWp (Industrial 20 kWp)</option>
                {![2.22, 3.33, 4.95, 5.00, 5.50, 10.00, 15.00, 20.00].includes(formData.capacityKwp || formData.capacityKw) && (
                  <option value={formData.capacityKwp || formData.capacityKw}>Custom: {formData.capacityKwp || formData.capacityKw} kWp</option>
                )}
              </select>

              <div className="grid grid-cols-4 gap-1 pt-1">
                {[2.22, 3.33, 4.95, 5.00, 5.50, 10.00, 15.00, 20.00].map(kw => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleCapacityChange(kw)}
                    className={`py-1 px-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer text-center ${
                      (formData.capacityKwp === kw || formData.capacityKw === kw)
                        ? 'bg-[#f7b944] text-slate-950 border-amber-500 shadow-2xs font-extrabold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {kw.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Scheme Selector */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Solar Government Scheme
              </label>
              <input
                type="text"
                value={formData.scheme}
                onChange={(e) => setFormData(prev => ({ ...prev, scheme: e.target.value }))}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                placeholder="PM Surya Ghar: Muft Bijli Yojana"
              />
            </div>
          </div>

          {/* Project & Client Address Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Proposal Metadata & Client Address
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client / Beneficiary Name *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value, projectName: e.target.value }))}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  placeholder="Mr Prakash"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Offer Number (with Revision)
                </label>
                <input
                  type="text"
                  value={formData.offerNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, offerNo: e.target.value }))}
                  className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-slate-50"
                  placeholder="SP26270024R1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Site Location (City / District) *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  placeholder="Sathambadi, Ariyalur"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State / Jurisdiction
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  placeholder="Tamil Nadu"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quotation Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Price Validity Date (Page 2)
                </label>
                <input
                  type="date"
                  value={formData.priceValidityDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, priceValidityDate: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject Line (Page 1)
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  placeholder="Proposal for 4.95 kWp Roof top Solar"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Customer Segment
                </label>
                <select
                  value={formData.targetSegment || 'RESIDENTIAL_VILLA'}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetSegment: e.target.value as any }))}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                >
                  <option value="RESIDENTIAL_VILLA">Residential Individual / Villa</option>
                  <option value="RESIDENTIAL_APARTMENTS">Apartments & Gated Communities</option>
                  <option value="COMMERCIAL_INSTITUTIONAL">Commercial / Industrial / Institutional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Salutation</label>
                <input
                  type="text"
                  value={formData.salutation || 'Dear Sir / Madam,'}
                  onChange={(e) => setFormData(prev => ({ ...prev, salutation: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  placeholder="Dear Sir / Madam,"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Introductory Opening Paragraph
                </label>
                <textarea
                  rows={4}
                  value={formData.introOpeningText || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, introOpeningText: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944] font-sans"
                  placeholder="Leave empty to use master config default intro text, or customize here..."
                />
                <div className="mt-1.5 p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-snug">
                  <span className="font-bold block text-xs mb-0.5">Supports dynamic placeholders:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['{Connection Type}', '{Target Segment}', '{Scheme}', '{Capacity}'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentText = formData.introOpeningText || '';
                          setFormData(prev => ({ ...prev, introOpeningText: (currentText ? currentText + ' ' : '') + tag }));
                        }}
                        className="bg-white hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg text-amber-900 font-mono text-[10.5px] font-bold cursor-pointer transition-colors shadow-2xs"
                        title="Click to append placeholder"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    Tip: Use <strong className="font-bold">*text*</strong> for bold and press <strong>Enter</strong> for new lines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: BILL OF QUANTITIES (BOQ) WITH DRAG / RE-ORDER                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'BOQ' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Bill of Quantities (BOQ Items - Page 2)
              </h3>
              <p className="text-[11px] text-slate-500">
                Drag, reorder, or edit scope items matching the official Ommax Electric Annexure format.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddBOQItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-bold shadow-2xs hover:bg-amber-400 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center">Order</th>
                  <th className="py-2.5 px-3 w-14 text-center">SL No</th>
                  <th className="py-2.5 px-4 text-left">Item Description</th>
                  <th className="py-2.5 px-4 w-36 text-center">Quantity / Spec</th>
                  <th className="py-2.5 px-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.boqItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Reorder Buttons */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveBOQItem(index, 'UP')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={index === formData.boqItems.length - 1}
                          onClick={() => handleMoveBOQItem(index, 'DOWN')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-center font-bold text-slate-700">
                      {item.slNo}
                    </td>

                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.itemDescription}
                        onChange={(e) => handleUpdateBOQItem(item.id, 'itemDescription', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#f7b944]"
                      />
                    </td>

                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) => handleUpdateBOQItem(item.id, 'quantity', e.target.value)}
                        className="w-full text-xs text-center font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#f7b944]"
                      />
                    </td>

                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteBOQItem(item.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: COSTING & DUAL GST FORMULA (80:20)                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'COSTING' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs Panel */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Pricing & Discount Factors
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Basic EPC Project Cost (Rs.) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={formData.basicCost}
                  onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0, formData.specialDiscount)}
                  className="w-full text-sm font-bold pl-7 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  step="1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Special Discount (Rs.)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={formData.specialDiscount}
                  onChange={(e) => handleCostChange(formData.basicCost, parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-bold pl-7 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  step="500"
                />
              </div>
            </div>

            {/* Subsidy Callout Editor */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Government Subsidy Callout Note
              </label>
              <textarea
                rows={3}
                value={formData.subsidyNote}
                onChange={(e) => setFormData(prev => ({ ...prev, subsidyNote: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
              />
            </div>
          </div>

          {/* Statutory 80:20 GST Split & Grand Total Calculation Output */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Automated Statutory GST Calculation (80:20 Rule)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20">
                Official Solar EPC Norm
              </span>
            </div>

            {/* Live Calculation Table matching Annexure A */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <th className="py-2.5 px-4 text-left">Component Item</th>
                    <th className="py-2.5 px-3 text-center">Split %</th>
                    <th className="py-2.5 px-3 text-center">GST Rate</th>
                    <th className="py-2.5 px-4 text-right">Tax Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      Goods Portion (80% of Basic Cost)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">80%</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">5%</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹ {formData.gstGoodsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      Services / Installation (20% of Basic Cost)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">20%</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">18%</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹ {formData.gstServicesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                    <td colSpan={3} className="py-2 px-4 uppercase text-slate-700">
                      Total GST (B)
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-black text-slate-950">
                      ₹ {formData.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {formData.specialDiscount > 0 && (
                    <tr className="bg-rose-50/50 font-bold text-rose-800">
                      <td colSpan={3} className="py-2 px-4 uppercase">
                        Less: Special Discount (C)
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-black">
                        - ₹ {formData.specialDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Net Payable Grand Total Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#f7b944]">
                  {formData.specialDiscount > 0 ? 'D = A + B - C' : 'C = A + B'}
                </span>
                <h4 className="text-sm font-black tracking-wide">
                  Grand Total (EPC) – Inclusive of Taxes, To Pay Amount
                </h4>
              </div>
              <div className="text-2xl font-black text-[#f7b944] font-mono">
                ₹ {formData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: LETTERHEAD & IMAGE TRANSFORMS                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'LETTERHEAD' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Header Image Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Top Header Image & Scaling
                </h3>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Header Image URL (Official Letterhead)
              </label>
              <input
                type="url"
                value={formData.letterhead.headerImageUrl}
                onChange={(e) => handleLetterheadChange('headerImageUrl', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                placeholder="Leave blank for built-in high-precision vector header, or enter image URL"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                If blank, the system automatically uses the official Ommax Electric ISO 9001:2015 vector header.
              </p>
            </div>

            {/* Sliders: Scale, Offset Y, Offset X, Height */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Zoom / Enlarge Scale</span>
                  <span className="font-mono text-amber-700">{Math.round((formData.letterhead.headerScale || 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={formData.letterhead.headerScale || 1.0}
                  onChange={(e) => handleLetterheadChange('headerScale', parseFloat(e.target.value))}
                  className="w-full accent-[#f7b944] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Vertical Offset Y</span>
                    <span className="font-mono">{formData.letterhead.headerOffsetY || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={formData.letterhead.headerOffsetY || 0}
                    onChange={(e) => handleLetterheadChange('headerOffsetY', parseInt(e.target.value))}
                    className="w-full accent-slate-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Horizontal Offset X</span>
                    <span className="font-mono">{formData.letterhead.headerOffsetX || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={formData.letterhead.headerOffsetX || 0}
                    onChange={(e) => handleLetterheadChange('headerOffsetX', parseInt(e.target.value))}
                    className="w-full accent-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Image Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Bottom Footer Image & Alignment
                </h3>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Footer Image URL (CIN & Address Banner)
              </label>
              <input
                type="url"
                value={formData.letterhead.footerImageUrl}
                onChange={(e) => handleLetterheadChange('footerImageUrl', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                placeholder="Leave blank for built-in QR Code + Corporate Address footer, or enter image URL"
              />
            </div>

            {/* Sliders: Scale, Offset Y, Offset X */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Zoom / Enlarge Scale</span>
                  <span className="font-mono text-indigo-700">{Math.round((formData.letterhead.footerScale || 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={formData.letterhead.footerScale || 1.0}
                  onChange={(e) => handleLetterheadChange('footerScale', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Vertical Offset Y</span>
                    <span className="font-mono">{formData.letterhead.footerOffsetY || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={formData.letterhead.footerOffsetY || 0}
                    onChange={(e) => handleLetterheadChange('footerOffsetY', parseInt(e.target.value))}
                    className="w-full accent-slate-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Horizontal Offset X</span>
                    <span className="font-mono">{formData.letterhead.footerOffsetX || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={formData.letterhead.footerOffsetX || 0}
                    onChange={(e) => handleLetterheadChange('footerOffsetX', parseInt(e.target.value))}
                    className="w-full accent-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stamp & Authorized Signature Seal Customization */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Page 5 Official Stamp & Signature Sizing
                </h3>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Stamp / Authorized Seal URL
              </label>
              <input
                type="url"
                value={formData.companyStampUrl || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, companyStampUrl: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                placeholder="Leave blank to use default Master Stamp or italic signatory name"
              />
            </div>

            {/* Sliders: Stamp Width, Rotation, Opacity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Stamp Width</span>
                  <span className="font-mono text-emerald-700">{formData.companyStampWidth || 120}px</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="280"
                  step="5"
                  value={formData.companyStampWidth || 120}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyStampWidth: parseInt(e.target.value) }))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Rotation Angle</span>
                  <span className="font-mono">{formData.companyStampRotate || 0}°</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={formData.companyStampRotate || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyStampRotate: parseInt(e.target.value) }))}
                  className="w-full accent-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Stamp Opacity</span>
                  <span className="font-mono">{Math.round((formData.companyStampOpacity ?? 0.95) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.0"
                  step="0.05"
                  value={formData.companyStampOpacity ?? 0.95}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyStampOpacity: parseFloat(e.target.value) }))}
                  className="w-full accent-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: BANKING, WARRANTY & COMMERCIAL TERMS                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'TERMS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Banking Details Form (Page 3) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Corporate Bank Account Details (Page 3)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Beneficiary Name</label>
                <input
                  type="text"
                  value={formData.beneficiaryName}
                  onChange={(e) => setFormData(prev => ({ ...prev, beneficiaryName: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value }))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">MICR Code</label>
                  <input
                    type="text"
                    value={formData.micrNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, micrNumber: e.target.value }))}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Warranty & Project Completion */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Warranty & Completion Timeline
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Modules (Yrs)</label>
                  <input
                    type="number"
                    value={formData.moduleWarrantyYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, moduleWarrantyYears: parseInt(e.target.value) || 25 }))}
                    className="w-full text-xs font-bold text-center px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inverter (Yrs)</label>
                  <input
                    type="number"
                    value={formData.inverterWarrantyYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, inverterWarrantyYears: parseInt(e.target.value) || 5 }))}
                    className="w-full text-xs font-bold text-center px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">BOS (Yrs)</label>
                  <input
                    type="number"
                    value={formData.balanceOfSystemWarrantyYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, balanceOfSystemWarrantyYears: parseInt(e.target.value) || 1 }))}
                    className="w-full text-xs font-bold text-center px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Completion Timeline</label>
                <input
                  type="text"
                  value={formData.projectCompletionWeeks}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectCompletionWeeks: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                  placeholder="2 to 3 weeks"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: REVISION HISTORY                                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'REVISIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Chronological Revision Audit Trail
            </h3>
            <button
              type="button"
              onClick={() => setIsRevisionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Create Revision ({formData.revisionCode} → R-{formData.revisionIndex + 1})</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {formData.revisionHistory?.map((rev, idx) => (
              <div key={idx} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 font-mono font-bold text-xs flex items-center justify-center">
                    {rev.revisionCode}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{rev.reason || 'Proposal Revision'}</h4>
                    <p className="text-[11px] text-slate-500">
                      By {rev.author} • {new Date(rev.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-900">
                    ₹ {rev.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5-Page Live Preview Modal */}
      {isPreviewOpen && (
        <Quotation5PagePrintView
          quotation={formData}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* Create Revision Dialog */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Create Revision R-{formData.revisionIndex + 1}
                </h3>
                <p className="text-xs text-slate-500">
                  Clones current proposal into version R-{formData.revisionIndex + 1}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Revision *
              </label>
              <textarea
                rows={3}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="e.g. Applied ₹5,000 Special Discount after client price negotiation, or updated structure to 7 feet."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRevision}
                className="px-4 py-2 bg-[#f7b944] hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                Confirm Revision R-{formData.revisionIndex + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
