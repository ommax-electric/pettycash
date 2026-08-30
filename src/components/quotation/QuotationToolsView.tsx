import React, { useState, useEffect } from 'react';
import { 
  QuotationMasterConfig, 
  DEFAULT_QUOTATION_MASTER_CONFIG, 
  MasterCatalogProduct,
  DefaultBoqItemConfig,
  DEFAULT_BOQ_ITEMS_CONFIG,
  BrandDeclarationItem,
  SolarBenefitRow,
  SolarQuotation,
  interpolateOpeningText,
  renderFormattedText
} from '../../quotation/types';
import { CRMOpportunity, CRMAccount, CRMContact } from '../../crm/types';
import { User, AppSettings } from '../../types';
import { 
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
  Plus, 
  Trash2, 
  Edit2,
  Save, 
  RotateCcw, 
  Check, 
  Layers, 
  HelpCircle,
  Eye,
  IndianRupee,
  Building2,
  Cpu,
  Zap,
  BatteryCharging,
  Package,
  Sun,
  Battery,
  Settings2,
  FileCheck2,
  Upload,
  X,
  Star
} from 'lucide-react';

const STORAGE_KEY = 'ommax_solar_quotation_master_config';

interface QuotationToolsViewProps {
  opportunities?: CRMOpportunity[];
  accounts?: CRMAccount[];
  contacts?: CRMContact[];
  currentUser: User | null;
  appSettings: AppSettings;
  masterConfig?: QuotationMasterConfig;
  onUpdateMasterConfig?: (config: QuotationMasterConfig) => void;
  onSaveQuotation?: (quotation: SolarQuotation, isSubmit?: boolean) => void;
  activeEditingQuotation?: SolarQuotation | null;
  onClearActiveQuotation?: () => void;
}

export type MasterConfigTab = 
  | 'GENERAL'
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
  | 'ADDON_PRICING';

export default function QuotationToolsView({
  currentUser,
  appSettings,
  masterConfig,
  onUpdateMasterConfig
}: QuotationToolsViewProps) {
  // Master Config State
  const [config, setConfig] = useState<QuotationMasterConfig>(() => {
    if (masterConfig) return masterConfig;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_QUOTATION_MASTER_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_QUOTATION_MASTER_CONFIG;
  });

  // Sync state if masterConfig prop changes from Firestore
  useEffect(() => {
    if (masterConfig) {
      setConfig(masterConfig);
    }
  }, [masterConfig]);

  const [activeTab, setActiveTab] = useState<MasterConfigTab>('GENERAL');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Temporary item add states
  const [newSupplyItem, setNewSupplyItem] = useState('');
  const [newInstallItem, setNewInstallItem] = useState('');
  const [newTcClause, setNewTcClause] = useState('');
  const [newTechAssumption, setNewTechAssumption] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [newMilestone, setNewMilestone] = useState('');

  // Dropdown option temp states
  const [newSystemTypeLabel, setNewSystemTypeLabel] = useState('');
  const [newSystemTypeDesc, setNewSystemTypeDesc] = useState('');
  const [newSegmentLabel, setNewSegmentLabel] = useState('');
  const [newSegmentDesc, setNewSegmentDesc] = useState('');
  const [newSchemeLabel, setNewSchemeLabel] = useState('');
  const [newSchemeDesc, setNewSchemeDesc] = useState('');
  const [newCapacityVal, setNewCapacityVal] = useState('');
  const [newModuleOption, setNewModuleOption] = useState('');
  const [newInverterOption, setNewInverterOption] = useState('');
  const [newBatteryOption, setNewBatteryOption] = useState('');
  const [newStructureOption, setNewStructureOption] = useState('');
  const [newInverterWarranty, setNewInverterWarranty] = useState('');
  const [newBosWarranty, setNewBosWarranty] = useState('');

  // Dropdown option edit states
  const [editingSystemTypeId, setEditingSystemTypeId] = useState<string | null>(null);
  const [editingSystemTypeLabel, setEditingSystemTypeLabel] = useState('');
  const [editingSystemTypeDesc, setEditingSystemTypeDesc] = useState('');

  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentLabel, setEditingSegmentLabel] = useState('');
  const [editingSegmentDesc, setEditingSegmentDesc] = useState('');

  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [editingSchemeLabel, setEditingSchemeLabel] = useState('');
  const [editingSchemeDesc, setEditingSchemeDesc] = useState('');

  const [editingCapacityIdx, setEditingCapacityIdx] = useState<number | null>(null);
  const [editingCapacityVal, setEditingCapacityVal] = useState('');

  const [editingModuleIdx, setEditingModuleIdx] = useState<number | null>(null);
  const [editingModuleVal, setEditingModuleVal] = useState('');

  const [editingInverterIdx, setEditingInverterIdx] = useState<number | null>(null);
  const [editingInverterVal, setEditingInverterVal] = useState('');

  const [editingBatteryIdx, setEditingBatteryIdx] = useState<number | null>(null);
  const [editingBatteryVal, setEditingBatteryVal] = useState('');

  const [editingStructureIdx, setEditingStructureIdx] = useState<number | null>(null);
  const [editingStructureVal, setEditingStructureVal] = useState('');

  const [editingInverterWarrantyIdx, setEditingInverterWarrantyIdx] = useState<number | null>(null);
  const [editingInverterWarrantyVal, setEditingInverterWarrantyVal] = useState('');

  const [editingBosWarrantyIdx, setEditingBosWarrantyIdx] = useState<number | null>(null);
  const [editingBosWarrantyVal, setEditingBosWarrantyVal] = useState('');

  const [editingSupplyIdx, setEditingSupplyIdx] = useState<number | null>(null);
  const [editingSupplyVal, setEditingSupplyVal] = useState('');

  const [editingInstallIdx, setEditingInstallIdx] = useState<number | null>(null);
  const [editingInstallVal, setEditingInstallVal] = useState('');

  const [editingExclusionIdx, setEditingExclusionIdx] = useState<number | null>(null);
  const [editingExclusionVal, setEditingExclusionVal] = useState('');

  const [editingTechAssumptionIdx, setEditingTechAssumptionIdx] = useState<number | null>(null);
  const [editingTechAssumptionVal, setEditingTechAssumptionVal] = useState('');

  const [editingTcIdx, setEditingTcIdx] = useState<number | null>(null);
  const [editingTcVal, setEditingTcVal] = useState('');

  const [newBrandNote, setNewBrandNote] = useState('');
  const [editingBrandNoteIdx, setEditingBrandNoteIdx] = useState<number | null>(null);
  const [editingBrandNoteVal, setEditingBrandNoteVal] = useState('');

  // New Catalog Product State
  const [newProduct, setNewProduct] = useState<Partial<MasterCatalogProduct>>({
    category: 'MODULE',
    name: '',
    brand: '',
    modelSpec: '',
    defaultUnit: 'Nos',
    defaultUnitPrice: 0,
    warrantyPeriod: 'Standard Warranty',
    isDefaultBOQ: true
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // New Default BOQ Item State (for Items e, f, g & additional defaults)
  const [isAddingDefaultBoq, setIsAddingDefaultBoq] = useState(false);
  const [newDefaultBoq, setNewDefaultBoq] = useState<Partial<DefaultBoqItemConfig>>({
    label: '',
    itemDescription: '',
    brand: '',
    defaultUnit: 'kWp',
    defaultQtyType: 'CAPACITY_KWP',
    defaultQtyValue: '',
    defaultUnitPrice: 0,
    warrantyPeriod: 'Standard Warranty',
    isEnabled: true
  });

  const handleSaveConfig = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      if (onUpdateMasterConfig) {
        onUpdateMasterConfig(config);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save master config', err);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all master configuration templates, dropdowns, and pricing to default values?')) {
      setConfig(DEFAULT_QUOTATION_MASTER_CONFIG);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_QUOTATION_MASTER_CONFIG));
      if (onUpdateMasterConfig) {
        onUpdateMasterConfig(DEFAULT_QUOTATION_MASTER_CONFIG);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  // Tab definitions (Strictly without a., b., c. prefixes)
  const tabs: { id: MasterConfigTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'GENERAL', label: 'General', icon: Sliders },
    { id: 'INTRO', label: 'Intro', icon: FileText },
    { id: 'SCOPE_OF_WORK', label: 'Scope of Work', icon: CheckSquare },
    { id: 'ADDON_PRICING', label: 'Pricing', icon: Sparkles },
    { id: 'PAYMENT_TERMS', label: 'Payment Terms', icon: CreditCard },
    { id: 'BANKING_DETAILS', label: 'Banking Details', icon: Landmark },
    { id: 'TERMS_AND_CONDITIONS', label: 'Terms & Conditions', icon: ShieldAlert },
    { id: 'WARRANTY', label: 'Warranty', icon: ShieldCheck },
    { id: 'PROJECT_COMPLETION', label: 'Project Completion', icon: CalendarClock },
    { id: 'ESTIMATED_SOLAR_BENEFITS', label: 'Estimated Solar Benefits', icon: TrendingUp },
    { id: 'BRAND_DECLARATION', label: 'Brand Declaration', icon: Award },
    { id: 'TECHNICAL_ASSUMPTIONS', label: 'Technical Assumptions', icon: FileCode2 },
    { id: 'EXCLUSIONS', label: 'Exclusions', icon: MinusCircle },
    { id: 'DISCLAIMER', label: 'Disclaimer', icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      {/* Master Configuration Hub Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900">
                Solar Quotation Master Configuration
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Studio Templates
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Set predefined dropdown lists, master clauses, rate libraries, banking details, and letterhead assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Reset to factory defaults (Admin Only)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Defaults</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveConfig}
            className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#f7b944] hover:bg-amber-400 text-slate-950'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved Successfully</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 14 Tabs Navigation Bar (Single line horizontal scroll, no a., b., c. prefixes) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-[#f7b944] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#f7b944]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: General */}
      {activeTab === 'GENERAL' && (
        <div className="space-y-6">
          {/* Card 1: General Document & Header Rules */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200/80 pb-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>General Document & Header Rules</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure standard reference prefixes, sequence starting numbers, validity rules, and To/Subject formatting.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Offer Prefix
                </label>
                <input
                  type="text"
                  value={config.offerPrefix}
                  onChange={(e) => setConfig({ ...config, offerPrefix: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="SP"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. SP for Solar Proposal</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Financial Year Code
                </label>
                <input
                  type="text"
                  value={config.offerYearCode}
                  onChange={(e) => setConfig({ ...config, offerYearCode: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="2627"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. 2627 for FY 2026-27</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Starting Sequence Number
                </label>
                <input
                  type="number"
                  value={config.offerStartingSeq}
                  onChange={(e) => setConfig({ ...config, offerStartingSeq: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Generates {config.offerPrefix}{config.offerYearCode}{String(config.offerStartingSeq).padStart(4, '0')}R0</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Price Validity (Weeks)
                </label>
                <input
                  type="number"
                  value={config.defaultPriceValidityWeeks}
                  onChange={(e) => setConfig({ ...config, defaultPriceValidityWeeks: parseInt(e.target.value) || 4 })}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Auto-calculates Price Validity Date</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default "To" Salutation
                </label>
                <input
                  type="text"
                  value={config.defaultToSalutation}
                  onChange={(e) => setConfig({ ...config, defaultToSalutation: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default greeting on Proposal Page 1</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Subject Line Template
                </label>
                <input
                  type="text"
                  value={config.defaultSubjectTemplate}
                  onChange={(e) => setConfig({ ...config, defaultSubjectTemplate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Supports tags: {'{capacityKwp}'}, {'{location}'}, {'{clientName}'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Letterhead Header & Footer Banner Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200/80 pb-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Letterhead Header & Footer Banner Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload or specify high-resolution company letterhead header and footer images for A4 proposals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Header Image Configuration */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-extrabold text-slate-900">Header Letterhead Banner</span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Header Image URL
                  </label>
                  <input
                    type="text"
                    value={config.letterhead.headerImageUrl}
                    onChange={(e) => setConfig({
                      ...config,
                      letterhead: { ...config.letterhead, headerImageUrl: e.target.value }
                    })}
                    placeholder="https://.../header-banner.png"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Height ({config.letterhead.headerHeight}px)
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="150"
                      value={config.letterhead.headerHeight}
                      onChange={(e) => setConfig({
                        ...config,
                        letterhead: { ...config.letterhead, headerHeight: parseInt(e.target.value) }
                      })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Scale ({config.letterhead.headerScale}x)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={config.letterhead.headerScale}
                      onChange={(e) => setConfig({
                        ...config,
                        letterhead: { ...config.letterhead, headerScale: parseFloat(e.target.value) }
                      })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500">
                        Vertical Offset Y (px)
                      </label>
                      <input
                        type="number"
                        min="-150"
                        max="150"
                        value={config.letterhead.headerOffsetY || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          letterhead: { ...config.letterhead, headerOffsetY: parseInt(e.target.value) || 0 }
                        })}
                        className="w-14 px-1.5 py-0.5 text-right font-mono text-[10px] bg-white border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={config.letterhead.headerOffsetY || 0}
                      onChange={(e) => setConfig({
                        ...config,
                        letterhead: { ...config.letterhead, headerOffsetY: parseInt(e.target.value) }
                      })}
                      className="w-full accent-slate-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500">
                        Horizontal Offset X (px)
                      </label>
                      <input
                        type="number"
                        min="-150"
                        max="150"
                        value={config.letterhead.headerOffsetX || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          letterhead: { ...config.letterhead, headerOffsetX: parseInt(e.target.value) || 0 }
                        })}
                        className="w-14 px-1.5 py-0.5 text-right font-mono text-[10px] bg-white border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={config.letterhead.headerOffsetX || 0}
                      onChange={(e) => setConfig({
                        ...config,
                        letterhead: { ...config.letterhead, headerOffsetX: parseInt(e.target.value) }
                      })}
                      className="w-full accent-slate-700 cursor-pointer"
                    />
                  </div>
                </div>

                {config.letterhead.headerImageUrl && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white p-2 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1 font-bold">Header Preview</span>
                    <img
                      src={config.letterhead.headerImageUrl}
                      alt="Header Letterhead"
                      className="max-h-16 mx-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* Footer Image Configuration */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-extrabold text-slate-900">Footer Letterhead Strip</span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Footer Image URL
                  </label>
                  <input
                    type="text"
                    value={config.letterhead.footerImageUrl}
                    onChange={(e) => setConfig({
                      ...config,
                      letterhead: { ...config.letterhead, footerImageUrl: e.target.value }
                    })}
                    placeholder="https://.../footer-strip.png"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Height ({config.letterhead.footerHeight}px)
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="140"
                      value={config.letterhead.footerHeight}
                      onChange={(e) => setConfig({
                        ...config,
                        letterhead: { ...config.letterhead, footerHeight: parseInt(e.target.value) }
                      })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Scale ({config.letterhead.footerScale}x)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={config.letterhead.footerScale}
                      onChange={(e) => setConfig({
                        ...config,
                        letterhead: { ...config.letterhead, footerScale: parseFloat(e.target.value) }
                      })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500">
                        Vertical Offset Y (px)
                      </label>
                      <input
                        type="number"
                        min="-150"
                        max="150"
                        value={config.letterhead.footerOffsetY || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          letterhead: { ...config.letterhead, footerOffsetY: parseInt(e.target.value) || 0 }
                        })}
                        className="w-14 px-1.5 py-0.5 text-right font-mono text-[10px] bg-white border border-slate-200 rounded font-bold text-amber-900 bg-amber-50/50"
                      />
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={config.letterhead.footerOffsetY || 0}
                      onChange={(e) => setConfig({
                        ...config,
                        letterhead: { ...config.letterhead, footerOffsetY: parseInt(e.target.value) }
                      })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500">
                        Horizontal Offset X (px)
                      </label>
                      <input
                        type="number"
                        min="-150"
                        max="150"
                        value={config.letterhead.footerOffsetX || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          letterhead: { ...config.letterhead, footerOffsetX: parseInt(e.target.value) || 0 }
                        })}
                        className="w-14 px-1.5 py-0.5 text-right font-mono text-[10px] bg-white border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={config.letterhead.footerOffsetX || 0}
                      onChange={(e) => setConfig({
                        ...config,
                        letterhead: { ...config.letterhead, footerOffsetX: parseInt(e.target.value) }
                      })}
                      className="w-full accent-slate-700 cursor-pointer"
                    />
                  </div>
                </div>

                {config.letterhead.footerImageUrl && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white p-2 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1 font-bold">Footer Preview</span>
                    <img
                      src={config.letterhead.footerImageUrl}
                      alt="Footer Letterhead"
                      className="max-h-16 mx-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Intro */}
      {activeTab === 'INTRO' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Intro Letter & Pre-Defined Dropdowns</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure the opening letter template and manage the dropdown lists for System Connection Types, Application Segments, and Government Schemes.
            </p>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-bold text-slate-700">
                Opening Paragraph Template ("Dear Valued Customer, ...")
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-amber-800">Dynamic placeholders:</span>
                {['{Connection Type}', '{Target Segment}', '{Scheme}', '{Capacity}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setConfig(prev => ({ ...prev, introOpeningText: prev.introOpeningText + ' ' + tag }));
                    }}
                    className="bg-amber-100/70 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded text-amber-900 font-mono text-[10.5px] font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Click to insert placeholder"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={4}
              value={config.introOpeningText}
              onChange={(e) => setConfig({ ...config, introOpeningText: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed font-sans"
              placeholder="Enter intro opening paragraph template..."
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Tip: Use <strong className="font-bold">*text*</strong> for bold and press <strong>Enter</strong> for new lines/paragraphs.
            </p>

            {/* Live Rendered Preview in Master Config */}
            <div className="mt-3 p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Live Formatted Output Preview
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Renders bold (*text*), dynamic values & multi-line paragraphs
                </span>
              </div>
              <div className="text-slate-800 text-xs leading-relaxed space-y-2 bg-white p-3.5 rounded-xl border border-amber-100 shadow-2xs">
                {(() => {
                  const sampleInterpolated = interpolateOpeningText(config.introOpeningText, {
                    connectionType: 'On-Grid Solar PV Plant',
                    targetSegment: 'Residential Villa',
                    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
                    capacityKw: 5,
                    clientName: 'Mr Prakash',
                    projectName: 'Mr Prakash'
                  });
                  const paragraphs = sampleInterpolated.split(/\r?\n\r?\n+/).map(p => p.trim()).filter(Boolean);
                  if (paragraphs.length === 0) return <p className="italic text-slate-400">Empty template</p>;
                  return paragraphs.map((para, idx) => (
                    <p key={idx} className="whitespace-pre-line">{renderFormattedText(para)}</p>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Grid of 4 Pre-Defined Dropdown Configurations */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-2">
            {/* Dropdown 1: System Connection Types */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Plant Connection Types</span>
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {config.availableSystemTypes.length} Options
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Available in quotation dropdown (On-Grid / Off-Grid / Hybrid)
              </p>
              <div className="space-y-2">
                {config.availableSystemTypes.map((st, idx) => {
                  const isEditing = editingSystemTypeId === st.id;
                  return (
                    <div key={st.id} className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingSystemTypeLabel}
                            onChange={(e) => setEditingSystemTypeLabel(e.target.value)}
                            placeholder="Option label"
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-bold"
                          />
                          <input
                            type="text"
                            value={editingSystemTypeDesc}
                            onChange={(e) => setEditingSystemTypeDesc(e.target.value)}
                            placeholder="Description / notes (optional)"
                            className="w-full text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          />
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSystemTypeId(null);
                                setEditingSystemTypeLabel('');
                                setEditingSystemTypeDesc('');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingSystemTypeLabel.trim()) return;
                                const updated = config.availableSystemTypes.map((item, i) =>
                                  i === idx ? { ...item, label: editingSystemTypeLabel.trim(), description: editingSystemTypeDesc.trim() } : item
                                );
                                setConfig({ ...config, availableSystemTypes: updated });
                                setEditingSystemTypeId(null);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate">{st.label}</div>
                            {st.description && <div className="text-[10px] text-slate-400 mt-0.5">{st.description}</div>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSystemTypeId(st.id);
                                setEditingSystemTypeLabel(st.label);
                                setEditingSystemTypeDesc(st.description || '');
                              }}
                              className="text-slate-400 hover:text-amber-600 p-1 cursor-pointer"
                              title="Edit option"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {config.availableSystemTypes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.availableSystemTypes.filter((_, i) => i !== idx);
                                  setConfig({ ...config, availableSystemTypes: updated });
                                }}
                                className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add System Type */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <input
                  type="text"
                  placeholder="New connection type label..."
                  value={newSystemTypeLabel}
                  onChange={(e) => setNewSystemTypeLabel(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Description / subtitle (optional)"
                    value={newSystemTypeDesc}
                    onChange={(e) => setNewSystemTypeDesc(e.target.value)}
                    className="flex-1 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSystemTypeLabel.trim()) return;
                      const newId = newSystemTypeLabel.trim().toUpperCase().replace(/\s+/g, '_');
                      setConfig({
                        ...config,
                        availableSystemTypes: [
                          ...config.availableSystemTypes,
                          { id: newId, label: newSystemTypeLabel.trim(), description: newSystemTypeDesc.trim() || undefined }
                        ]
                      });
                      setNewSystemTypeLabel('');
                      setNewSystemTypeDesc('');
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dropdown 2: Application Segments */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Target Segments</span>
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {config.availableSegments.length} Options
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Available in quotation dropdown (Residential / Commercial / Industrial)
              </p>
              <div className="space-y-2">
                {config.availableSegments.map((seg, idx) => {
                  const isEditing = editingSegmentId === seg.id;
                  return (
                    <div key={seg.id} className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingSegmentLabel}
                            onChange={(e) => setEditingSegmentLabel(e.target.value)}
                            placeholder="Segment name"
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-bold"
                          />
                          <input
                            type="text"
                            value={editingSegmentDesc}
                            onChange={(e) => setEditingSegmentDesc(e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSegmentId(null);
                                setEditingSegmentLabel('');
                                setEditingSegmentDesc('');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingSegmentLabel.trim()) return;
                                const updated = config.availableSegments.map((item, i) =>
                                  i === idx ? { ...item, label: editingSegmentLabel.trim(), description: editingSegmentDesc.trim() } : item
                                );
                                setConfig({ ...config, availableSegments: updated });
                                setEditingSegmentId(null);
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate">{seg.label}</div>
                            {seg.description && <div className="text-[10px] text-slate-400 mt-0.5">{seg.description}</div>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSegmentId(seg.id);
                                setEditingSegmentLabel(seg.label);
                                setEditingSegmentDesc(seg.description || '');
                              }}
                              className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                              title="Edit option"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {config.availableSegments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.availableSegments.filter((_, i) => i !== idx);
                                  setConfig({ ...config, availableSegments: updated });
                                }}
                                className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Target Segment */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <input
                  type="text"
                  placeholder="New segment name (e.g. Agricultural)..."
                  value={newSegmentLabel}
                  onChange={(e) => setNewSegmentLabel(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newSegmentDesc}
                    onChange={(e) => setNewSegmentDesc(e.target.value)}
                    className="flex-1 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSegmentLabel.trim()) return;
                      const newId = newSegmentLabel.trim().toUpperCase().replace(/\s+/g, '_');
                      setConfig({
                        ...config,
                        availableSegments: [
                          ...config.availableSegments,
                          { id: newId, label: newSegmentLabel.trim(), description: newSegmentDesc.trim() || undefined }
                        ]
                      });
                      setNewSegmentLabel('');
                      setNewSegmentDesc('');
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dropdown 3: Schemes */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Schemes & Subsidies</span>
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {config.availableSchemes.length} Options
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Available in quotation dropdown (PM Surya Ghar / Non Subsidy / State)
              </p>
              <div className="space-y-2">
                {config.availableSchemes.map((scm, idx) => {
                  const isEditing = editingSchemeId === scm.id;
                  return (
                    <div key={scm.id} className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingSchemeLabel}
                            onChange={(e) => setEditingSchemeLabel(e.target.value)}
                            placeholder="Scheme name"
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-bold"
                          />
                          <input
                            type="text"
                            value={editingSchemeDesc}
                            onChange={(e) => setEditingSchemeDesc(e.target.value)}
                            placeholder="Subsidy details / notes"
                            className="w-full text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSchemeId(null);
                                setEditingSchemeLabel('');
                                setEditingSchemeDesc('');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingSchemeLabel.trim()) return;
                                const updated = config.availableSchemes.map((item, i) =>
                                  i === idx ? { ...item, label: editingSchemeLabel.trim(), description: editingSchemeDesc.trim() } : item
                                );
                                setConfig({ ...config, availableSchemes: updated });
                                setEditingSchemeId(null);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate">{scm.label}</div>
                            {scm.description && <div className="text-[10px] text-slate-400 mt-0.5">{scm.description}</div>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSchemeId(scm.id);
                                setEditingSchemeLabel(scm.label);
                                setEditingSchemeDesc(scm.description || '');
                              }}
                              className="text-slate-400 hover:text-emerald-600 p-1 cursor-pointer"
                              title="Edit option"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {config.availableSchemes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.availableSchemes.filter((_, i) => i !== idx);
                                  setConfig({ ...config, availableSchemes: updated });
                                }}
                                className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Scheme */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <input
                  type="text"
                  placeholder="New scheme name (e.g. PM Surya Ghar)..."
                  value={newSchemeLabel}
                  onChange={(e) => setNewSchemeLabel(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Subsidy / financial notes (optional)"
                    value={newSchemeDesc}
                    onChange={(e) => setNewSchemeDesc(e.target.value)}
                    className="flex-1 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSchemeLabel.trim()) return;
                      const newId = newSchemeLabel.trim().toUpperCase().replace(/\s+/g, '_');
                      setConfig({
                        ...config,
                        availableSchemes: [
                          ...config.availableSchemes,
                          { id: newId, label: newSchemeLabel.trim(), description: newSchemeDesc.trim() || undefined }
                        ]
                      });
                      setNewSchemeLabel('');
                      setNewSchemeDesc('');
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dropdown 4: Project Capacity Options */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span>Project Capacity Options (kWp)</span>
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {(config.capacityOptions || []).length} Options
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Populates the Project Capacity dropdown in Prepare Solar Quotation modal
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(config.capacityOptions || []).map((cap, idx) => {
                  const isEditing = editingCapacityIdx === idx;
                  return (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            value={editingCapacityVal}
                            onChange={(e) => setEditingCapacityVal(e.target.value)}
                            placeholder="Capacity in kWp (e.g. 5.5)"
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-bold"
                          />
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCapacityIdx(null);
                                setEditingCapacityVal('');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const parsed = parseFloat(editingCapacityVal);
                                if (isNaN(parsed) || parsed <= 0) return;
                                const updated = [...(config.capacityOptions || [])];
                                updated[idx] = parsed;
                                updated.sort((a, b) => a - b);
                                setConfig({ ...config, capacityOptions: updated });
                                setEditingCapacityIdx(null);
                                setEditingCapacityVal('');
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 font-mono flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-md bg-amber-100/70 text-amber-900 font-bold">{cap} kWp</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCapacityIdx(idx);
                                setEditingCapacityVal(String(cap));
                              }}
                              className="text-slate-400 hover:text-amber-600 p-1 cursor-pointer"
                              title="Edit capacity"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {(config.capacityOptions || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (config.capacityOptions || []).filter((_, i) => i !== idx);
                                  setConfig({ ...config, capacityOptions: updated });
                                }}
                                className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                                title="Delete capacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Capacity */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="New capacity (kWp)... e.g. 7.5"
                    value={newCapacityVal}
                    onChange={(e) => setNewCapacityVal(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseFloat(newCapacityVal);
                      if (isNaN(parsed) || parsed <= 0) return;
                      const current = config.capacityOptions || [];
                      if (!current.includes(parsed)) {
                        const updated = [...current, parsed].sort((a, b) => a - b);
                        setConfig({ ...config, capacityOptions: updated });
                      }
                      setNewCapacityVal('');
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Scope of Work */}
      {activeTab === 'SCOPE_OF_WORK' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-8">
          <div className="border-b border-slate-200/80 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-600" />
              <span>Scope of Work Master Configuration</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure dropdown catalogs for Supply equipment (Modules, Inverters, Battery, Structures) and default checklist items for Installation.
            </p>
          </div>

          {/* Sub-Section 1: Supply Includes Dropdowns */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-600" />
                  <span>Supply Includes – Predefined Dropdown Catalogs</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dropdown options are linked to the Pricing & Component Catalog. Manage new products from the Pricing tab.
                </p>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                Equipment Dropdowns
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Modules Dropdown Options */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">Solar PV Module Options</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = config.starredSupplySections?.module !== false;
                        setConfig({
                          ...config,
                          starredSupplySections: {
                            ...(config.starredSupplySections || { module: true, inverter: true, battery: false, structure: true }),
                            module: !current
                          }
                        });
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        config.starredSupplySections?.module !== false
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={config.starredSupplySections?.module !== false ? "Starred: Included in Supply Scope Preview" : "Unstarred: Omitted from Supply Scope Preview"}
                    >
                      <Star className={`w-3 h-3 ${config.starredSupplySections?.module !== false ? 'fill-amber-500 text-amber-600' : 'text-slate-400'}`} />
                      <span>{config.starredSupplySections?.module !== false ? 'In Scope' : 'Omitted'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{config.supplyDropdownOptions.moduleOptions.length} items</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {config.supplyDropdownOptions.moduleOptions.map((opt, i) => {
                    const isEditing = editingModuleIdx === i;
                    return (
                      <div key={i} className="text-xs bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingModuleVal}
                              onChange={(e) => setEditingModuleVal(e.target.value)}
                              className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingModuleVal.trim()) return;
                                const updated = [...config.supplyDropdownOptions.moduleOptions];
                                updated[i] = editingModuleVal.trim();
                                setConfig({
                                  ...config,
                                  supplyDropdownOptions: { ...config.supplyDropdownOptions, moduleOptions: updated }
                                });
                                setEditingModuleIdx(null);
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingModuleIdx(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              <span className="truncate text-slate-800 font-medium">{opt}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingModuleIdx(i);
                                  setEditingModuleVal(opt);
                                }}
                                className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                                title="Edit option"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.supplyDropdownOptions.moduleOptions.filter((_, idx) => idx !== i);
                                  const optNormalized = opt.trim().toLowerCase();
                                  const updatedCatalog = (config.productsCatalog || []).filter(p => {
                                    const pName = p.name.trim().toLowerCase();
                                    const pBrandAndName = `${p.brand} ${p.name}`.trim().toLowerCase();
                                    return pName !== optNormalized && pBrandAndName !== optNormalized && !optNormalized.includes(pName);
                                  });
                                  setConfig({
                                    ...config,
                                    supplyDropdownOptions: { ...config.supplyDropdownOptions, moduleOptions: updated },
                                    productsCatalog: updatedCatalog
                                  });
                                }}
                                className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inverter Dropdown Options */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">Solar Inverter Options</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = config.starredSupplySections?.inverter !== false;
                        setConfig({
                          ...config,
                          starredSupplySections: {
                            ...(config.starredSupplySections || { module: true, inverter: true, battery: false, structure: true }),
                            inverter: !current
                          }
                        });
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        config.starredSupplySections?.inverter !== false
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={config.starredSupplySections?.inverter !== false ? "Starred: Included in Supply Scope Preview" : "Unstarred: Omitted from Supply Scope Preview"}
                    >
                      <Star className={`w-3 h-3 ${config.starredSupplySections?.inverter !== false ? 'fill-amber-500 text-amber-600' : 'text-slate-400'}`} />
                      <span>{config.starredSupplySections?.inverter !== false ? 'In Scope' : 'Omitted'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{config.supplyDropdownOptions.inverterOptions.length} items</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {config.supplyDropdownOptions.inverterOptions.map((opt, i) => {
                    const isEditing = editingInverterIdx === i;
                    return (
                      <div key={i} className="text-xs bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingInverterVal}
                              onChange={(e) => setEditingInverterVal(e.target.value)}
                              className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingInverterVal.trim()) return;
                                const updated = [...config.supplyDropdownOptions.inverterOptions];
                                updated[i] = editingInverterVal.trim();
                                setConfig({
                                  ...config,
                                  supplyDropdownOptions: { ...config.supplyDropdownOptions, inverterOptions: updated }
                                });
                                setEditingInverterIdx(null);
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingInverterIdx(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              <span className="truncate text-slate-800 font-medium">{opt}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingInverterIdx(i);
                                  setEditingInverterVal(opt);
                                }}
                                className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                                title="Edit option"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.supplyDropdownOptions.inverterOptions.filter((_, idx) => idx !== i);
                                  const optNormalized = opt.trim().toLowerCase();
                                  const updatedCatalog = (config.productsCatalog || []).filter(p => {
                                    const pName = p.name.trim().toLowerCase();
                                    const pBrandAndName = `${p.brand} ${p.name}`.trim().toLowerCase();
                                    return pName !== optNormalized && pBrandAndName !== optNormalized && !optNormalized.includes(pName);
                                  });
                                  setConfig({
                                    ...config,
                                    supplyDropdownOptions: { ...config.supplyDropdownOptions, inverterOptions: updated },
                                    productsCatalog: updatedCatalog
                                  });
                                }}
                                className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Battery Dropdown Options */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">Battery Storage Options</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = !!config.starredSupplySections?.battery;
                        setConfig({
                          ...config,
                          starredSupplySections: {
                            ...(config.starredSupplySections || { module: true, inverter: true, battery: false, structure: true }),
                            battery: !current
                          }
                        });
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        config.starredSupplySections?.battery
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={config.starredSupplySections?.battery ? "Starred: Included in Supply Scope Preview" : "Unstarred: Omitted from Supply Scope Preview"}
                    >
                      <Star className={`w-3 h-3 ${config.starredSupplySections?.battery ? 'fill-amber-500 text-amber-600' : 'text-slate-400'}`} />
                      <span>{config.starredSupplySections?.battery ? 'In Scope' : 'Omitted'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{config.supplyDropdownOptions.batteryOptions.length} items</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {config.supplyDropdownOptions.batteryOptions.map((opt, i) => {
                    const isEditing = editingBatteryIdx === i;
                    return (
                      <div key={i} className="text-xs bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingBatteryVal}
                              onChange={(e) => setEditingBatteryVal(e.target.value)}
                              className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingBatteryVal.trim()) return;
                                const updated = [...config.supplyDropdownOptions.batteryOptions];
                                updated[i] = editingBatteryVal.trim();
                                setConfig({
                                  ...config,
                                  supplyDropdownOptions: { ...config.supplyDropdownOptions, batteryOptions: updated }
                                });
                                setEditingBatteryIdx(null);
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBatteryIdx(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              <span className="truncate text-slate-800 font-medium">{opt}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBatteryIdx(i);
                                  setEditingBatteryVal(opt);
                                }}
                                className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                                title="Edit option"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.supplyDropdownOptions.batteryOptions.filter((_, idx) => idx !== i);
                                  const optNormalized = opt.trim().toLowerCase();
                                  const updatedCatalog = (config.productsCatalog || []).filter(p => {
                                    const pName = p.name.trim().toLowerCase();
                                    const pBrandAndName = `${p.brand} ${p.name}`.trim().toLowerCase();
                                    return pName !== optNormalized && pBrandAndName !== optNormalized && !optNormalized.includes(pName);
                                  });
                                  setConfig({
                                    ...config,
                                    supplyDropdownOptions: { ...config.supplyDropdownOptions, batteryOptions: updated },
                                    productsCatalog: updatedCatalog
                                  });
                                }}
                                className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Structure Options */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">Mounting Structure Options</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = config.starredSupplySections?.structure !== false;
                        setConfig({
                          ...config,
                          starredSupplySections: {
                            ...(config.starredSupplySections || { module: true, inverter: true, battery: false, structure: true }),
                            structure: !current
                          }
                        });
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        config.starredSupplySections?.structure !== false
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={config.starredSupplySections?.structure !== false ? "Starred: Included in Supply Scope Preview" : "Unstarred: Omitted from Supply Scope Preview"}
                    >
                      <Star className={`w-3 h-3 ${config.starredSupplySections?.structure !== false ? 'fill-amber-500 text-amber-600' : 'text-slate-400'}`} />
                      <span>{config.starredSupplySections?.structure !== false ? 'In Scope' : 'Omitted'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{config.supplyDropdownOptions.structureOptions.length} items</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {config.supplyDropdownOptions.structureOptions.map((opt, i) => {
                    const isEditing = editingStructureIdx === i;
                    return (
                      <div key={i} className="text-xs bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingStructureVal}
                              onChange={(e) => setEditingStructureVal(e.target.value)}
                              className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingStructureVal.trim()) return;
                                const updated = [...config.supplyDropdownOptions.structureOptions];
                                updated[i] = editingStructureVal.trim();
                                setConfig({
                                  ...config,
                                  supplyDropdownOptions: { ...config.supplyDropdownOptions, structureOptions: updated }
                                });
                                setEditingStructureIdx(null);
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStructureIdx(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              <span className="truncate text-slate-800 font-medium">{opt}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStructureIdx(i);
                                  setEditingStructureVal(opt);
                                }}
                                className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                                title="Edit option"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.supplyDropdownOptions.structureOptions.filter((_, idx) => idx !== i);
                                  const optNormalized = opt.trim().toLowerCase();
                                  const updatedCatalog = (config.productsCatalog || []).filter(p => {
                                    const pName = p.name.trim().toLowerCase();
                                    const pBrandAndName = `${p.brand} ${p.name}`.trim().toLowerCase();
                                    return pName !== optNormalized && pBrandAndName !== optNormalized && !optNormalized.includes(pName);
                                  });
                                  setConfig({
                                    ...config,
                                    supplyDropdownOptions: { ...config.supplyDropdownOptions, structureOptions: updated },
                                    productsCatalog: updatedCatalog
                                  });
                                }}
                                className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Section 2: Supply Includes Defaults Section (Checklist) */}
          <div className="space-y-3 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  <span>Supply Includes – Defaults Section (Checklist)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Standard supply items added automatically to Supply Includes in proposals and preview.
                </p>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                {config.defaultSupplyIncludes.length} items
              </span>
            </div>

            <div className="space-y-2">
              {config.defaultSupplyIncludes.map((item, index) => {
                const isEditing = editingSupplyIdx === index;
                return (
                  <div key={index} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 transition-all">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={editingSupplyVal}
                          onChange={(e) => setEditingSupplyVal(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-slate-900 font-medium"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingSupplyVal.trim()) return;
                            const updated = [...config.defaultSupplyIncludes];
                            updated[index] = editingSupplyVal.trim();
                            setConfig({ ...config, defaultSupplyIncludes: updated });
                            setEditingSupplyIdx(null);
                          }}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSupplyIdx(null)}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs text-slate-800 font-medium leading-relaxed">
                            {item}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSupplyIdx(index);
                              setEditingSupplyVal(item);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                            title="Edit item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = config.defaultSupplyIncludes.filter((_, idx) => idx !== index);
                              setConfig({ ...config, defaultSupplyIncludes: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add New Supply Item Form */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add new custom supply item (e.g. Solar Generation Meter, Lightning Arrestor, AC/DC Disconnects)..."
                value={newSupplyItem}
                onChange={(e) => setNewSupplyItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSupplyItem.trim()) {
                    e.preventDefault();
                    setConfig({
                      ...config,
                      defaultSupplyIncludes: [...config.defaultSupplyIncludes, newSupplyItem.trim()]
                    });
                    setNewSupplyItem('');
                  }
                }}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newSupplyItem.trim()) return;
                  setConfig({
                    ...config,
                    defaultSupplyIncludes: [...config.defaultSupplyIncludes, newSupplyItem.trim()]
                  });
                  setNewSupplyItem('');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Supply Item</span>
              </button>
            </div>
          </div>

          {/* Sub-Section 3: Installation Includes Checklist */}
          <div className="space-y-3 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Installation Includes – Default Checklist</span>
              </h4>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                {config.defaultInstallationIncludes.length} clauses
              </span>
            </div>

            <div className="space-y-2">
              {config.defaultInstallationIncludes.map((item, index) => {
                const isEditing = editingInstallIdx === index;
                return (
                  <div key={index} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 transition-all">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={editingInstallVal}
                          onChange={(e) => setEditingInstallVal(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-slate-900 font-medium"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingInstallVal.trim()) return;
                            const updated = [...config.defaultInstallationIncludes];
                            updated[index] = editingInstallVal.trim();
                            setConfig({ ...config, defaultInstallationIncludes: updated });
                            setEditingInstallIdx(null);
                          }}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingInstallIdx(null)}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs text-slate-800 font-medium">{item}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingInstallIdx(index);
                              setEditingInstallVal(item);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Edit clause"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = config.defaultInstallationIncludes.filter((_, i) => i !== index);
                              setConfig({ ...config, defaultInstallationIncludes: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete clause"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add installation scope item (e.g. Net-Metering liaisoning)..."
                value={newInstallItem}
                onChange={(e) => setNewInstallItem(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newInstallItem.trim()) return;
                  setConfig({
                    ...config,
                    defaultInstallationIncludes: [...config.defaultInstallationIncludes, newInstallItem.trim()]
                  });
                  setNewInstallItem('');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Payment Terms */}
      {activeTab === 'PAYMENT_TERMS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Payment Milestones & Subsidy Terms</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set default stage percentages (Advance, Dispatch, Commissioning) and standard subsidy disclaimer text.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Advance Payment Milestone (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.defaultAdvancePercent}
                  onChange={(e) => setConfig({ ...config, defaultAdvancePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Along with confirmed Purchase Order</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Material Delivery Milestone (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.defaultDeliveryPercent}
                  onChange={(e) => setConfig({ ...config, defaultDeliveryPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Against material delivery at site</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Installation / Net-Meter (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.defaultInstallationPercent}
                  onChange={(e) => setConfig({ ...config, defaultInstallationPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Before installation & grid sync</span>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Standard PM Surya Ghar / Subsidy Note
            </label>
            <textarea
              rows={3}
              value={config.defaultSubsidyNote}
              onChange={(e) => setConfig({ ...config, defaultSubsidyNote: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Tab 5: Banking Details */}
      {activeTab === 'BANKING_DETAILS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-amber-600" />
              <span>Corporate Banking & Remittance Details</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configures official company bank account details printed on Page 3 of the proposal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Beneficiary Name
              </label>
              <input
                type="text"
                value={config.beneficiaryName}
                onChange={(e) => setConfig({ ...config, beneficiaryName: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={config.bankName}
                onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={config.accountNumber}
                onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Type
              </label>
              <input
                type="text"
                value={config.accountType}
                onChange={(e) => setConfig({ ...config, accountType: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={config.ifscCode}
                onChange={(e) => setConfig({ ...config, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                MICR Number
              </label>
              <input
                type="text"
                value={config.micrNumber}
                onChange={(e) => setConfig({ ...config, micrNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                UPI ID / VPA (Optional)
              </label>
              <input
                type="text"
                value={config.upiId || ''}
                onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="company@hdfcbank"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Branch Address
              </label>
              <input
                type="text"
                value={config.bankAddress}
                onChange={(e) => setConfig({ ...config, bankAddress: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Terms & Conditions */}
      {activeTab === 'TERMS_AND_CONDITIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Standard Commercial Terms & Conditions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Master clauses printed on Page 3. Edit text directly or add/remove clauses.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {config.termsAndConditions.length} Clauses
            </span>
          </div>

          <div className="space-y-2.5">
            {config.termsAndConditions.map((clause, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={clause}
                    onChange={(e) => {
                      const updated = [...config.termsAndConditions];
                      updated[index] = e.target.value;
                      setConfig({ ...config, termsAndConditions: updated });
                    }}
                    className="flex-1 text-xs bg-transparent border-none focus:outline-hidden focus:ring-0 text-slate-800 font-medium leading-relaxed resize-y"
                    placeholder="Enter terms clause (use *bold* for emphasis)..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = config.termsAndConditions.filter((_, i) => i !== index);
                      setConfig({ ...config, termsAndConditions: updated });
                    }}
                    className="text-slate-400 hover:text-red-600 p-1 cursor-pointer shrink-0 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {(clause.includes('*') || clause.includes('\n')) && (
                  <div className="ml-9 text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-bold text-amber-800 uppercase block mb-0.5">Formatted Preview:</span>
                    <span className="whitespace-pre-line">{renderFormattedText(clause)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add new terms & condition clause..."
              value={newTcClause}
              onChange={(e) => setNewTcClause(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!newTcClause.trim()) return;
                setConfig({
                  ...config,
                  termsAndConditions: [...config.termsAndConditions, newTcClause.trim()]
                });
                setNewTcClause('');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Clause</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 7: Warranty */}
      {activeTab === 'WARRANTY' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Warranty Matrix & Dropdown Options</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure standard warranty durations and dropdown choices for Inverters and Balance of System (BOS).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standard Durations */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-900">Standard Warranty Defaults</h4>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Solar PV Module Warranty (Years)
                </label>
                <input
                  type="number"
                  value={config.moduleWarrantyYears}
                  onChange={(e) => setConfig({ ...config, moduleWarrantyYears: parseInt(e.target.value) || 25 })}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default: 25 Years Performance Warranty</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Workmanship / Free O&M (Years)
                </label>
                <input
                  type="number"
                  value={config.workmanshipWarrantyYears}
                  onChange={(e) => setConfig({ ...config, workmanshipWarrantyYears: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default: 1 Year Free Comprehensive Maintenance</span>
              </div>
            </div>

            {/* Inverter & BOS Dropdowns */}
            <div className="space-y-4">
              {/* Inverter Warranty Dropdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">Grid Tied Inverter Warranty Dropdown Choices</span>
                  <span className="text-[10px] font-mono text-slate-500">{config.inverterWarrantyOptions.length} choices</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {config.inverterWarrantyOptions.map((opt, i) => {
                    const isEditing = editingInverterWarrantyIdx === i;
                    return (
                      <div key={i} className="text-xs bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingInverterWarrantyVal}
                              onChange={(e) => setEditingInverterWarrantyVal(e.target.value)}
                              className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingInverterWarrantyVal.trim()) return;
                                const updated = [...config.inverterWarrantyOptions];
                                updated[i] = editingInverterWarrantyVal.trim();
                                setConfig({ ...config, inverterWarrantyOptions: updated });
                                setEditingInverterWarrantyIdx(null);
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingInverterWarrantyIdx(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="truncate pr-2">{opt}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingInverterWarrantyIdx(i);
                                  setEditingInverterWarrantyVal(opt);
                                }}
                                className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                                title="Edit option"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.inverterWarrantyOptions.filter((_, idx) => idx !== i);
                                  setConfig({ ...config, inverterWarrantyOptions: updated });
                                }}
                                className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add warranty option (e.g. 10 Years Extended)..."
                    value={newInverterWarranty}
                    onChange={(e) => setNewInverterWarranty(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newInverterWarranty.trim()) return;
                      setConfig({
                        ...config,
                        inverterWarrantyOptions: [...config.inverterWarrantyOptions, newInverterWarranty.trim()]
                      });
                      setNewInverterWarranty('');
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* BOS Warranty Dropdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">Balance of System (BOS) Warranty Dropdown Choices</span>
                  <span className="text-[10px] font-mono text-slate-500">{config.bosWarrantyOptions.length} choices</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {config.bosWarrantyOptions.map((opt, i) => {
                    const isEditing = editingBosWarrantyIdx === i;
                    return (
                      <div key={i} className="text-xs bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingBosWarrantyVal}
                              onChange={(e) => setEditingBosWarrantyVal(e.target.value)}
                              className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingBosWarrantyVal.trim()) return;
                                const updated = [...config.bosWarrantyOptions];
                                updated[i] = editingBosWarrantyVal.trim();
                                setConfig({ ...config, bosWarrantyOptions: updated });
                                setEditingBosWarrantyIdx(null);
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBosWarrantyIdx(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="truncate pr-2">{opt}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBosWarrantyIdx(i);
                                  setEditingBosWarrantyVal(opt);
                                }}
                                className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                                title="Edit option"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.bosWarrantyOptions.filter((_, idx) => idx !== i);
                                  setConfig({ ...config, bosWarrantyOptions: updated });
                                }}
                                className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add BOS warranty choice..."
                    value={newBosWarranty}
                    onChange={(e) => setNewBosWarranty(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newBosWarranty.trim()) return;
                      setConfig({
                        ...config,
                        bosWarrantyOptions: [...config.bosWarrantyOptions, newBosWarranty.trim()]
                      });
                      setNewBosWarranty('');
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Project Completion */}
      {activeTab === 'PROJECT_COMPLETION' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-600" />
              <span>Project Completion & Milestone Timelines</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard execution duration and phase-wise delivery milestone descriptions.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Project Completion Timeline
            </label>
            <input
              type="text"
              value={config.defaultCompletionWeeks}
              onChange={(e) => setConfig({ ...config, defaultCompletionWeeks: e.target.value })}
              className="w-full max-w-md px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              placeholder="2 to 3 weeks"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">e.g. 2 to 3 weeks from receipt of advance and site clearance</span>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-900">Standard Execution Milestones</h4>
              <span className="text-[10px] font-mono font-bold text-slate-500">{config.completionMilestones.length} Phases</span>
            </div>

            <div className="space-y-2">
              {config.completionMilestones.map((ms, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={ms}
                    onChange={(e) => {
                      const updated = [...config.completionMilestones];
                      updated[idx] = e.target.value;
                      setConfig({ ...config, completionMilestones: updated });
                    }}
                    className="flex-1 text-xs bg-transparent border-none focus:outline-hidden focus:ring-0 text-slate-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = config.completionMilestones.filter((_, i) => i !== idx);
                      setConfig({ ...config, completionMilestones: updated });
                    }}
                    className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add execution phase milestone..."
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newMilestone.trim()) return;
                  setConfig({
                    ...config,
                    completionMilestones: [...config.completionMilestones, newMilestone.trim()]
                  });
                  setNewMilestone('');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Phase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 9: Estimated Solar Benefits */}
      {activeTab === 'ESTIMATED_SOLAR_BENEFITS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Estimated Solar Financial Benefits & Generation Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure default electricity tariff rate (₹/unit) and master reference savings table printed on Page 4.
            </p>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Electricity Tariff Considered (₹/Unit)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.5"
                value={config.defaultTariffPerUnit}
                onChange={(e) => setConfig({ ...config, defaultTariffPerUnit: parseFloat(e.target.value) || 8 })}
                className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Standard TNEB / Discom commercial tariff</span>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase text-slate-900">Reference Solar Benefits Table</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[11px]">
                  <tr>
                    <th className="p-2.5 border-r border-slate-800">System Capacity</th>
                    <th className="p-2.5 border-r border-slate-800">Bi-Monthly Units</th>
                    <th className="p-2.5 border-r border-slate-800">Bi-Monthly Savings</th>
                    <th className="p-2.5 border-r border-slate-800">Annual Savings</th>
                    <th className="p-2.5 border-r border-slate-800">5 Years Savings</th>
                    <th className="p-2.5">10 Years Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {config.benefitsTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/50">
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                        <input
                          type="text"
                          value={row.solarSystem}
                          onChange={(e) => {
                            const updated = [...config.benefitsTable];
                            updated[idx].solarSystem = e.target.value;
                            setConfig({ ...config, benefitsTable: updated });
                          }}
                          className="w-full bg-transparent text-xs font-bold"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.biMonthlyGenerationUnits}
                          onChange={(e) => {
                            const updated = [...config.benefitsTable];
                            updated[idx].biMonthlyGenerationUnits = e.target.value;
                            setConfig({ ...config, benefitsTable: updated });
                          }}
                          className="w-full bg-transparent text-xs"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.biMonthlyEbSavings}
                          onChange={(e) => {
                            const updated = [...config.benefitsTable];
                            updated[idx].biMonthlyEbSavings = e.target.value;
                            setConfig({ ...config, benefitsTable: updated });
                          }}
                          className="w-full bg-transparent text-xs"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-emerald-700">
                        <input
                          type="text"
                          value={row.annualSavings}
                          onChange={(e) => {
                            const updated = [...config.benefitsTable];
                            updated[idx].annualSavings = e.target.value;
                            setConfig({ ...config, benefitsTable: updated });
                          }}
                          className="w-full bg-transparent text-xs font-semibold text-emerald-700"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.fiveYearsSavings}
                          onChange={(e) => {
                            const updated = [...config.benefitsTable];
                            updated[idx].fiveYearsSavings = e.target.value;
                            setConfig({ ...config, benefitsTable: updated });
                          }}
                          className="w-full bg-transparent text-xs"
                        />
                      </td>
                      <td className="p-2 font-bold text-slate-900">
                        <input
                          type="text"
                          value={row.tenYearsSavings}
                          onChange={(e) => {
                            const updated = [...config.benefitsTable];
                            updated[idx].tenYearsSavings = e.target.value;
                            setConfig({ ...config, benefitsTable: updated });
                          }}
                          className="w-full bg-transparent text-xs font-bold text-slate-900"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 10: Brand Declaration */}
      {activeTab === 'BRAND_DECLARATION' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Tier-1 Approved Brand Declaration Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-defined equipment makes, brands, and manufacturer warranty declarations printed on Page 4.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {config.brandDeclarations.length} Items
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[11px]">
                <tr>
                  <th className="p-2.5 w-12 text-center border-r border-slate-800">#</th>
                  <th className="p-2.5 border-r border-slate-800">Equipment Description</th>
                  <th className="p-2.5 border-r border-slate-800">Approved Brand / Make</th>
                  <th className="p-2.5 border-r border-slate-800">Warranty / Standard</th>
                  <th className="p-2.5 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {config.brandDeclarations.map((item, index) => (
                  <tr key={index} className="hover:bg-amber-50/40">
                    <td className="p-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                      {index + 1}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-800">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...config.brandDeclarations];
                          updated[index].description = e.target.value;
                          setConfig({ ...config, brandDeclarations: updated });
                        }}
                        className="w-full bg-transparent text-xs font-bold text-slate-800"
                      />
                    </td>
                    <td className="p-2 border-r border-slate-200 font-semibold text-amber-800">
                      <input
                        type="text"
                        value={item.brand}
                        onChange={(e) => {
                          const updated = [...config.brandDeclarations];
                          updated[index].brand = e.target.value;
                          setConfig({ ...config, brandDeclarations: updated });
                        }}
                        className="w-full bg-transparent text-xs font-semibold text-amber-800"
                      />
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-600">
                      <input
                        type="text"
                        value={item.warrantySpec}
                        onChange={(e) => {
                          const updated = [...config.brandDeclarations];
                          updated[index].warrantySpec = e.target.value;
                          setConfig({ ...config, brandDeclarations: updated });
                        }}
                        className="w-full bg-transparent text-xs text-slate-600"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = config.brandDeclarations.filter((_, i) => i !== index);
                          setConfig({ ...config, brandDeclarations: updated });
                        }}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                const nextNo = config.brandDeclarations.length + 1;
                const newItem: BrandDeclarationItem = {
                  slNo: nextNo,
                  description: 'New Solar Component',
                  brand: 'Reputed / Tier-1',
                  warrantySpec: 'Standard Warranty'
                };
                setConfig({
                  ...config,
                  brandDeclarations: [...config.brandDeclarations, newItem]
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Add Brand Declaration Row</span>
            </button>
          </div>

          {/* Brand Declaration Notes Section */}
          <div className="pt-4 border-t border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Brand Declaration Notes & Special Clauses (Printed on Page 4)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bulleted notes displayed beneath the Tier-1 Brand Declaration matrix.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {(config.brandNotes || []).length} Notes
              </span>
            </div>

            <div className="space-y-2.5">
              {(config.brandNotes || []).map((note, index) => (
                <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {editingBrandNoteIdx === index ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingBrandNoteVal}
                        onChange={(e) => setEditingBrandNoteVal(e.target.value)}
                        className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingBrandNoteVal.trim()) {
                            const updated = [...(config.brandNotes || [])];
                            updated[index] = editingBrandNoteVal.trim();
                            setConfig({ ...config, brandNotes: updated });
                          }
                          setEditingBrandNoteIdx(null);
                        }}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBrandNoteIdx(null)}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-xs text-slate-800 font-medium leading-relaxed">{note}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBrandNoteIdx(index);
                            setEditingBrandNoteVal(note);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                          title="Edit note"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (config.brandNotes || []).filter((_, i) => i !== index);
                            setConfig({ ...config, brandNotes: updated });
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add new Brand Declaration note or substitution clause..."
                value={newBrandNote}
                onChange={(e) => setNewBrandNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBrandNote.trim()) {
                    e.preventDefault();
                    setConfig({
                      ...config,
                      brandNotes: [...(config.brandNotes || []), newBrandNote.trim()]
                    });
                    setNewBrandNote('');
                  }
                }}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBrandNote.trim()) return;
                  setConfig({
                    ...config,
                    brandNotes: [...(config.brandNotes || []), newBrandNote.trim()]
                  });
                  setNewBrandNote('');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#f7b944]" />
                <span>Add Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 11: Technical Assumptions */}
      {activeTab === 'TECHNICAL_ASSUMPTIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-amber-600" />
                <span>Technical Assumptions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard engineering assumptions (e.g. shadow-free roof area, standard cabling lengths) printed on Page 5.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {config.technicalAssumptions.length} Items
            </span>
          </div>

          <div className="space-y-2.5">
            {config.technicalAssumptions.map((item, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={item}
                    onChange={(e) => {
                      const updated = [...config.technicalAssumptions];
                      updated[index] = e.target.value;
                      setConfig({ ...config, technicalAssumptions: updated });
                    }}
                    className="flex-1 text-xs bg-transparent border-none focus:outline-hidden focus:ring-0 text-slate-800 font-medium leading-relaxed resize-y"
                    placeholder="Enter assumption (use *bold* for emphasis)..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = config.technicalAssumptions.filter((_, i) => i !== index);
                      setConfig({ ...config, technicalAssumptions: updated });
                    }}
                    className="text-slate-400 hover:text-red-600 p-1 cursor-pointer shrink-0 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {(item.includes('*') || item.includes('\n')) && (
                  <div className="ml-9 text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-bold text-amber-800 uppercase block mb-0.5">Formatted Preview:</span>
                    <span className="whitespace-pre-line">{renderFormattedText(item)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add technical assumption clause..."
              value={newTechAssumption}
              onChange={(e) => setNewTechAssumption(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!newTechAssumption.trim()) return;
                setConfig({
                  ...config,
                  technicalAssumptions: [...config.technicalAssumptions, newTechAssumption.trim()]
                });
                setNewTechAssumption('');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 12: Exclusions */}
      {activeTab === 'EXCLUSIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200/80 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-red-600" />
                <span>Scope Exclusions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard client exclusions (e.g. roof strengthening, DISCOM net-meter statutory fees) printed on Page 5.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {config.exclusions.length} Items
            </span>
          </div>

          <div className="space-y-2">
            {config.exclusions.map((item, index) => {
              const isEditing = editingExclusionIdx === index;
              return (
                <div key={index} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 transition-all">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-red-500/10 text-red-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={editingExclusionVal}
                        onChange={(e) => setEditingExclusionVal(e.target.value)}
                        className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-slate-900 font-medium"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingExclusionVal.trim()) return;
                          const updated = [...config.exclusions];
                          updated[index] = editingExclusionVal.trim();
                          setConfig({ ...config, exclusions: updated });
                          setEditingExclusionIdx(null);
                        }}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingExclusionIdx(null)}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-red-500/10 text-red-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-xs text-slate-800 font-medium">{renderFormattedText(item)}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExclusionIdx(index);
                            setEditingExclusionVal(item);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                          title="Edit exclusion"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = config.exclusions.filter((_, i) => i !== index);
                            setConfig({ ...config, exclusions: updated });
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete exclusion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add scope exclusion item..."
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!newExclusion.trim()) return;
                setConfig({
                  ...config,
                  exclusions: [...config.exclusions, newExclusion.trim()]
                });
                setNewExclusion('');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Exclusion</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 13: Disclaimer */}
      {activeTab === 'DISCLAIMER' && (
        <div className="space-y-6">
          {/* Card 1: Legal Disclaimer & Warranty Limits */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200/80 pb-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Legal Disclaimer & Warranty Limits</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard company legal liability, force majeure, and warranty exclusion disclaimer printed on Page 5.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Standard Warranty & Legal Disclaimer Text
              </label>
              <textarea
                rows={4}
                value={config.warrantyDisclaimer}
                onChange={(e) => setConfig({ ...config, warrantyDisclaimer: e.target.value })}
                className="w-full px-3.5 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Card 2: Authorized Signatory & Corporate Stamp */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200/80 pb-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Authorized Signatory & Corporate Stamp</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure signatory designations and official company seal graphic.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Authorized Signatory Name
                </label>
                <input
                  type="text"
                  value={config.authorizedSignatoryName}
                  onChange={(e) => setConfig({ ...config, authorizedSignatoryName: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Designation / Company Title
                </label>
                <input
                  type="text"
                  value={config.signatoryDesignation}
                  onChange={(e) => setConfig({ ...config, signatoryDesignation: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Official Stamp / Authorized Signature Seal
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#f7b944]" />
                    <span>Upload Stamp / Signature Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (uploadEvent) => {
                          const base64 = uploadEvent.target?.result as string;
                          if (base64) {
                            setConfig({ ...config, companyStampUrl: base64, companyStampEnabled: true });
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={config.companyStampUrl || ''}
                      onChange={(e) => setConfig({ ...config, companyStampUrl: e.target.value, companyStampEnabled: Boolean(e.target.value) })}
                      placeholder="Or paste direct image URL (https://.../stamp.png)"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  {config.companyStampUrl && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, companyStampUrl: '' })}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                      title="Remove signature stamp"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {config.companyStampUrl && (
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        <img 
                          src={config.companyStampUrl} 
                          alt="Stamp Preview" 
                          className="max-h-full max-w-full object-contain"
                          style={{
                            transform: `rotate(${config.companyStampRotate || 0}deg)`,
                            opacity: config.companyStampOpacity ?? 0.95
                          }}
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Default Master Stamp & Signature Active</span>
                        <span className="text-[10px] text-slate-500">Will automatically load on Page 5 of all newly created quotations with configured size.</span>
                      </div>
                    </div>

                    {/* Stamp Custom Sizing & Adjustment Controls */}
                    <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>Stamp Width / Size</span>
                          <span className="font-mono text-amber-700">{config.companyStampWidth || 120}px</span>
                        </div>
                        <input
                          type="range"
                          min="60"
                          max="280"
                          step="5"
                          value={config.companyStampWidth || 120}
                          onChange={(e) => setConfig({ ...config, companyStampWidth: parseInt(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>Stamp Rotation</span>
                          <span className="font-mono text-slate-700">{config.companyStampRotate || 0}°</span>
                        </div>
                        <input
                          type="range"
                          min="-30"
                          max="30"
                          step="1"
                          value={config.companyStampRotate || 0}
                          onChange={(e) => setConfig({ ...config, companyStampRotate: parseInt(e.target.value) })}
                          className="w-full accent-slate-700 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>Opacity</span>
                          <span className="font-mono text-slate-700">{Math.round((config.companyStampOpacity ?? 0.95) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="1.0"
                          step="0.05"
                          value={config.companyStampOpacity ?? 0.95}
                          onChange={(e) => setConfig({ ...config, companyStampOpacity: parseFloat(e.target.value) })}
                          className="w-full accent-slate-700 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 14: Pricing */}
      {activeTab === 'ADDON_PRICING' && (
        <div className="space-y-6">
          {/* Card: Products, Brand & Master Pricing Catalog for ANNEXURE A – PROJECT COST */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-amber-600" />
                  <span>ANNEXURE A – Master Component & Pricing Catalog</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Products with brands, specifications, and unit rates used for automated BOQ cost calculations & dual GST.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingProduct(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs self-start"
              >
                <Plus className="w-3.5 h-3.5 text-[#f7b944]" />
                <span>Add Product to Catalog</span>
              </button>
            </div>

            {/* Proposal Dropdown Master Selectors (Modules, Inverters, Battery, Structure) */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="border-b border-slate-200/80 pb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Proposal Equipment Dropdown Options (Used in New Quotation Wizard)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure the pre-populated choices for Solar Modules, Inverters, Battery Storage, and Structure Elevations when creating quotations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Solar PV Modules Dropdown */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-600" />
                      Solar PV Module Choices
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                      {config.supplyDropdownOptions.moduleOptions.length} options
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {config.supplyDropdownOptions.moduleOptions.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                        <span className="truncate pr-2 font-medium text-slate-800">{opt}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = config.supplyDropdownOptions.moduleOptions.filter((_, idx) => idx !== i);
                            const optNormalized = opt.trim().toLowerCase();
                            const updatedCatalog = (config.productsCatalog || []).filter(p => {
                              const pName = p.name.trim().toLowerCase();
                              const pBrandAndName = `${p.brand} ${p.name}`.trim().toLowerCase();
                              return pName !== optNormalized && pBrandAndName !== optNormalized && !optNormalized.includes(pName);
                            });
                            const updatedStarred = (config.starredSupplyOptions || []).filter(item => item !== opt);
                            setConfig({
                              ...config,
                              supplyDropdownOptions: { ...config.supplyDropdownOptions, moduleOptions: updated },
                              productsCatalog: updatedCatalog,
                              starredSupplyOptions: updatedStarred
                            });
                          }}
                          className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
                          title="Delete option and remove from catalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Inverter Dropdown */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      Inverter Choices
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full">
                      {config.supplyDropdownOptions.inverterOptions.length} options
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {config.supplyDropdownOptions.inverterOptions.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                        <span className="truncate pr-2 font-medium text-slate-800">{opt}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = config.supplyDropdownOptions.inverterOptions.filter((_, idx) => idx !== i);
                            const optNormalized = opt.trim().toLowerCase();
                            const updatedCatalog = (config.productsCatalog || []).filter(p => {
                              const pName = p.name.trim().toLowerCase();
                              const pBrandAndName = `${p.brand} ${p.name}`.trim().toLowerCase();
                              return pName !== optNormalized && pBrandAndName !== optNormalized && !optNormalized.includes(pName);
                            });
                            const updatedStarred = (config.starredSupplyOptions || []).filter(item => item !== opt);
                            setConfig({
                              ...config,
                              supplyDropdownOptions: { ...config.supplyDropdownOptions, inverterOptions: updated },
                              productsCatalog: updatedCatalog,
                              starredSupplyOptions: updatedStarred
                            });
                          }}
                          className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
                          title="Delete option and remove from catalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Battery Storage Dropdown */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-emerald-600" />
                      Battery Storage Choices
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                      {config.supplyDropdownOptions.batteryOptions.length} options
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {config.supplyDropdownOptions.batteryOptions.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                        <span className="truncate pr-2 font-medium text-slate-800">{opt}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = config.supplyDropdownOptions.batteryOptions.filter((_, idx) => idx !== i);
                            const optNormalized = opt.trim().toLowerCase();
                            const updatedCatalog = (config.productsCatalog || []).filter(p => {
                              const pName = p.name.trim().toLowerCase();
                              const pBrandAndName = `${p.brand} ${p.name}`.trim().toLowerCase();
                              return pName !== optNormalized && pBrandAndName !== optNormalized && !optNormalized.includes(pName);
                            });
                            const updatedStarred = (config.starredSupplyOptions || []).filter(item => item !== opt);
                            setConfig({
                              ...config,
                              supplyDropdownOptions: { ...config.supplyDropdownOptions, batteryOptions: updated },
                              productsCatalog: updatedCatalog,
                              starredSupplyOptions: updatedStarred
                            });
                          }}
                          className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
                          title="Delete option and remove from catalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Structure Elevation Dropdown */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Structure Elevation Choices
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-full">
                      {config.supplyDropdownOptions.structureOptions.length} options
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {config.supplyDropdownOptions.structureOptions.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                        <span className="truncate pr-2 font-medium text-slate-800">{opt}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = config.supplyDropdownOptions.structureOptions.filter((_, idx) => idx !== i);
                            const optNormalized = opt.trim().toLowerCase();
                            const updatedCatalog = (config.productsCatalog || []).filter(p => {
                              const pName = p.name.trim().toLowerCase();
                              const pBrandAndName = `${p.brand} ${p.name}`.trim().toLowerCase();
                              return pName !== optNormalized && pBrandAndName !== optNormalized && !optNormalized.includes(pName);
                            });
                            const updatedStarred = (config.starredSupplyOptions || []).filter(item => item !== opt);
                            setConfig({
                              ...config,
                              supplyDropdownOptions: { ...config.supplyDropdownOptions, structureOptions: updated },
                              productsCatalog: updatedCatalog,
                              starredSupplyOptions: updatedStarred
                            });
                          }}
                          className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
                          title="Delete option and remove from catalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Defaults Section (BOQ Items e, f, g & Additional Standard Scope) */}
            <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Defaults (BOQ Items e, f, g & Standard Supply/Installation)</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Configure default items e, f, g (Cables, AC Side Supply, Installation & Commissioning) and additional scopes. You can edit descriptions, brands, unit rates, toggle items, or add new default rows.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingDefaultBoq(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs self-start shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Default Item</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-amber-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-900 text-white font-bold text-[11px]">
                    <tr>
                      <th className="p-2.5 border-r border-slate-800 w-12 text-center">Item</th>
                      <th className="p-2.5 border-r border-slate-800">Item Description (Preview & Proposal)</th>
                      <th className="p-2.5 border-r border-slate-800 w-36">Brand / Spec</th>
                      <th className="p-2.5 border-r border-slate-800 w-24 text-center">Unit</th>
                      <th className="p-2.5 border-r border-slate-800 w-32 text-center">Qty Basis</th>
                      <th className="p-2.5 border-r border-slate-800 w-28 text-right">Unit Rate (₹)</th>
                      <th className="p-2.5 border-r border-slate-800 w-20 text-center">Status</th>
                      <th className="p-2.5 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {(config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG).map((item, idx) => {
                      const letter = String.fromCharCode(101 + idx); // e, f, g, h, i...
                      return (
                        <tr key={item.id || idx} className={item.isEnabled === false ? 'bg-slate-50/70 opacity-60' : 'hover:bg-amber-50/20'}>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold font-mono text-amber-700">
                            {letter}.
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.itemDescription}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = (config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG).map((cur, cIdx) => 
                                  cIdx === idx ? { ...cur, itemDescription: val } : cur
                                );
                                setConfig({ ...config, defaultBoqItems: updated });
                              }}
                              className="w-full text-xs font-semibold text-slate-900 bg-transparent border-0 border-b border-transparent focus:border-amber-500 focus:bg-amber-50/30 px-1 py-0.5 rounded focus:outline-hidden"
                            />
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.brand || ''}
                              placeholder="e.g. Polycab"
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = (config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG).map((cur, cIdx) => 
                                  cIdx === idx ? { ...cur, brand: val } : cur
                                );
                                setConfig({ ...config, defaultBoqItems: updated });
                              }}
                              className="w-full text-xs text-slate-700 bg-transparent border-0 border-b border-transparent focus:border-amber-500 focus:bg-amber-50/30 px-1 py-0.5 rounded focus:outline-hidden"
                            />
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <select
                              value={item.defaultUnit || 'kWp'}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = (config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG).map((cur, cIdx) => 
                                  cIdx === idx ? { ...cur, defaultUnit: val } : cur
                                );
                                setConfig({ ...config, defaultBoqItems: updated });
                              }}
                              className="text-xs font-mono font-medium p-1 rounded border border-slate-200 bg-white cursor-pointer"
                            >
                              <option value="kWp">kWp</option>
                              <option value="Nos">Nos</option>
                              <option value="Lot">Lot</option>
                              <option value="Set">Set</option>
                              <option value="Feet">Feet</option>
                            </select>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <select
                              value={item.defaultQtyType || 'CAPACITY_KWP'}
                              onChange={(e) => {
                                const val = e.target.value as 'CAPACITY_KWP' | 'FIXED' | 'NOS';
                                const updated = (config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG).map((cur, cIdx) => 
                                  cIdx === idx ? { ...cur, defaultQtyType: val } : cur
                                );
                                setConfig({ ...config, defaultBoqItems: updated });
                              }}
                              className="text-xs font-medium p-1 rounded border border-slate-200 bg-white cursor-pointer"
                            >
                              <option value="CAPACITY_KWP">As per kWp</option>
                              <option value="FIXED">Fixed</option>
                              <option value="NOS">Nos Qty</option>
                            </select>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-right">
                            <div className="relative">
                              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">₹</span>
                              <input
                                type="number"
                                value={item.defaultUnitPrice || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const updated = (config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG).map((cur, cIdx) => 
                                    cIdx === idx ? { ...cur, defaultUnitPrice: val } : cur
                                  );
                                  setConfig({ ...config, defaultBoqItems: updated });
                                }}
                                className="w-20 pl-4 pr-1 py-0.5 text-xs text-right font-mono font-bold text-slate-900 bg-transparent border-0 border-b border-transparent focus:border-amber-500 focus:bg-amber-50/30 rounded focus:outline-hidden"
                              />
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG).map((cur, cIdx) => 
                                  cIdx === idx ? { ...cur, isEnabled: cur.isEnabled === false ? true : false } : cur
                                );
                                setConfig({ ...config, defaultBoqItems: updated });
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                item.isEnabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {item.isEnabled !== false ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG).filter((_, cIdx) => cIdx !== idx);
                                setConfig({ ...config, defaultBoqItems: updated });
                              }}
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                              title="Delete default item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Master Product Catalog Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[11px]">
                  <tr>
                    <th className="p-2.5 border-r border-slate-800">Category</th>
                    <th className="p-2.5 border-r border-slate-800">Product Name & Model</th>
                    <th className="p-2.5 border-r border-slate-800">Brand</th>
                    <th className="p-2.5 border-r border-slate-800">Unit</th>
                    <th className="p-2.5 border-r border-slate-800 text-right">Default Rate (₹)</th>
                    <th className="p-2.5 border-r border-slate-800">Warranty Spec</th>
                    <th className="p-2.5 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {config.productsCatalog.map((prod, idx) => (
                    <tr key={prod.id} className="hover:bg-amber-50/40">
                      <td className="p-2.5 border-r border-slate-200">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                          {prod.category === 'MODULE' ? 'PV MODULE' : prod.category}
                        </span>
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                        <input
                          type="text"
                          value={prod.name}
                          onChange={(e) => {
                            const updated = [...config.productsCatalog];
                            updated[idx].name = e.target.value;
                            setConfig({ ...config, productsCatalog: updated });
                          }}
                          className="w-full bg-transparent text-xs font-bold text-slate-900"
                        />
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          <input
                            type="text"
                            value={prod.modelSpec}
                            onChange={(e) => {
                              const updated = [...config.productsCatalog];
                              updated[idx].modelSpec = e.target.value;
                              setConfig({ ...config, productsCatalog: updated });
                            }}
                            className="w-full bg-transparent text-[10px] text-slate-400"
                          />
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-amber-800">
                        <input
                          type="text"
                          value={prod.brand}
                          onChange={(e) => {
                            const updated = [...config.productsCatalog];
                            updated[idx].brand = e.target.value;
                            setConfig({ ...config, productsCatalog: updated });
                          }}
                          className="w-full bg-transparent text-xs font-semibold text-amber-800"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono text-slate-600">
                        <input
                          type="text"
                          value={prod.defaultUnit}
                          onChange={(e) => {
                            const updated = [...config.productsCatalog];
                            updated[idx].defaultUnit = e.target.value;
                            setConfig({ ...config, productsCatalog: updated });
                          }}
                          className="w-16 bg-transparent text-xs font-mono text-slate-600"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                        <input
                          type="number"
                          value={prod.defaultUnitPrice}
                          onChange={(e) => {
                            const updated = [...config.productsCatalog];
                            updated[idx].defaultUnitPrice = parseFloat(e.target.value) || 0;
                            setConfig({ ...config, productsCatalog: updated });
                          }}
                          className="w-24 text-right bg-transparent text-xs font-mono font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">
                        <input
                          type="text"
                          value={prod.warrantyPeriod}
                          onChange={(e) => {
                            const updated = [...config.productsCatalog];
                            updated[idx].warrantyPeriod = e.target.value;
                            setConfig({ ...config, productsCatalog: updated });
                          }}
                          className="w-full bg-transparent text-xs text-slate-600"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = config.productsCatalog.filter((_, i) => i !== idx);
                            setConfig({ ...config, productsCatalog: updated });
                          }}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add New Product Modal Window */}
            {isAddingProduct && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Modal Header */}
                  <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Add Product to Catalog</h4>
                        <p className="text-[11px] text-slate-400">Add equipment and sync automatically to quotation dropdowns</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingProduct(false);
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body Form */}
                  <div className="p-6 space-y-4">
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newProduct.category || 'MODULE'}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                      >
                        <option value="MODULE">PV Module</option>
                        <option value="BATTERY">Battery</option>
                        <option value="INVERTER">Inverter</option>
                        <option value="STRUCTURE">Structure</option>
                        <option value="ELECTRICAL">Electrical</option>
                        <option value="SERVICES">Services</option>
                        <option value="OTHER">Others</option>
                      </select>
                      {['MODULE', 'BATTERY', 'INVERTER', 'STRUCTURE'].includes(newProduct.category || 'MODULE') && (
                        <p className="text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 mt-1.5 flex items-center gap-1.5 font-medium">
                          <Check className="w-3 h-3 text-amber-600 shrink-0" />
                          This product will automatically sync to Proposal Equipment Dropdown Options.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Product Name */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 550Wp Bi-facial DCR Solar Panel"
                          value={newProduct.name || ''}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                          autoFocus
                        />
                      </div>

                      {/* Brand */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Brand
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Servotec / Waaree"
                          value={newProduct.brand || ''}
                          onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newProduct.defaultUnit || 'Nos'}
                          onChange={(e) => setNewProduct({ ...newProduct, defaultUnit: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-mono"
                        >
                          <option value="Nos">Nos</option>
                          <option value="kWp">kWp</option>
                          <option value="Feet">Feet</option>
                          <option value="Box">Box</option>
                          <option value="Pcs">Pcs</option>
                        </select>
                      </div>

                      {/* Default Unit Rate */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Default Unit Rate (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            placeholder="e.g. 24500"
                            value={newProduct.defaultUnitPrice || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, defaultUnitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingProduct(false)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newProduct.name?.trim()}
                      onClick={() => {
                        if (!newProduct.name?.trim()) return;
                        const prodCategory = newProduct.category || 'MODULE';
                        const prodName = newProduct.name.trim();
                        const prodBrand = newProduct.brand?.trim() || '';
                        const prodUnit = newProduct.defaultUnit || 'Nos';
                        const prodPrice = Number(newProduct.defaultUnitPrice) || 0;

                        const productToAdd: MasterCatalogProduct = {
                          id: `prod-${Date.now()}`,
                          category: prodCategory,
                          name: prodName,
                          brand: prodBrand || 'Standard',
                          modelSpec: newProduct.modelSpec?.trim() || '',
                          defaultUnit: prodUnit,
                          defaultUnitPrice: prodPrice,
                          warrantyPeriod: newProduct.warrantyPeriod || 'Standard Warranty',
                          isDefaultBOQ: true
                        };

                        // Sync automatically to Proposal Equipment Dropdown Options for PV Module, Battery, Inverter, Structure
                        const updatedSupplyDropdownOptions = { ...config.supplyDropdownOptions };
                        const optionText = prodBrand && !prodName.toLowerCase().includes(prodBrand.toLowerCase())
                          ? `${prodBrand} ${prodName}`
                          : prodName;

                        if (prodCategory === 'MODULE') {
                          if (!updatedSupplyDropdownOptions.moduleOptions.includes(optionText)) {
                            updatedSupplyDropdownOptions.moduleOptions = [...updatedSupplyDropdownOptions.moduleOptions, optionText];
                          }
                        } else if (prodCategory === 'INVERTER') {
                          if (!updatedSupplyDropdownOptions.inverterOptions.includes(optionText)) {
                            updatedSupplyDropdownOptions.inverterOptions = [...updatedSupplyDropdownOptions.inverterOptions, optionText];
                          }
                        } else if (prodCategory === 'BATTERY') {
                          if (!updatedSupplyDropdownOptions.batteryOptions.includes(optionText)) {
                            updatedSupplyDropdownOptions.batteryOptions = [...updatedSupplyDropdownOptions.batteryOptions, optionText];
                          }
                        } else if (prodCategory === 'STRUCTURE') {
                          if (!updatedSupplyDropdownOptions.structureOptions.includes(optionText)) {
                            updatedSupplyDropdownOptions.structureOptions = [...updatedSupplyDropdownOptions.structureOptions, optionText];
                          }
                        }

                        setConfig({
                          ...config,
                          supplyDropdownOptions: updatedSupplyDropdownOptions,
                          productsCatalog: [...config.productsCatalog, productToAdd]
                        });
                        setIsAddingProduct(false);
                        setNewProduct({
                          category: 'MODULE',
                          name: '',
                          brand: '',
                          modelSpec: '',
                          defaultUnit: 'Nos',
                          defaultUnitPrice: 0,
                          warrantyPeriod: 'Standard Warranty',
                          isDefaultBOQ: true
                        });
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Save Product to Catalog
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Add New Default BOQ Item Modal */}
            {isAddingDefaultBoq && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Modal Header */}
                  <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Add Default BOQ Item</h4>
                        <p className="text-[11px] text-amber-100">Add a default item to the proposal bill of quantities</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingDefaultBoq(false)}
                      className="text-amber-100 hover:text-white p-1 rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body Form */}
                  <div className="p-6 space-y-4">
                    {/* Item Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Item Description (Preview & Proposal) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Remote Monitoring Unit & Data Logger"
                        value={newDefaultBoq.itemDescription || ''}
                        onChange={(e) => setNewDefaultBoq({ ...newDefaultBoq, itemDescription: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Brand */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Brand / Specification
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SolarEdge / Schneider"
                          value={newDefaultBoq.brand || ''}
                          onChange={(e) => setNewDefaultBoq({ ...newDefaultBoq, brand: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newDefaultBoq.defaultUnit || 'kWp'}
                          onChange={(e) => setNewDefaultBoq({ ...newDefaultBoq, defaultUnit: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-mono"
                        >
                          <option value="kWp">kWp</option>
                          <option value="Nos">Nos</option>
                          <option value="Lot">Lot</option>
                          <option value="Set">Set</option>
                          <option value="Feet">Feet</option>
                        </select>
                      </div>

                      {/* Quantity Type */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Quantity Calculation Rule
                        </label>
                        <select
                          value={newDefaultBoq.defaultQtyType || 'CAPACITY_KWP'}
                          onChange={(e) => setNewDefaultBoq({ ...newDefaultBoq, defaultQtyType: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                        >
                          <option value="CAPACITY_KWP">As per Project Capacity (kWp)</option>
                          <option value="FIXED">Fixed Quantity</option>
                          <option value="NOS">Nos Count</option>
                        </select>
                      </div>

                      {/* Default Unit Rate */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Default Unit Rate (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            placeholder="e.g. 1500"
                            value={newDefaultBoq.defaultUnitPrice || ''}
                            onChange={(e) => setNewDefaultBoq({ ...newDefaultBoq, defaultUnitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingDefaultBoq(false)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newDefaultBoq.itemDescription?.trim()}
                      onClick={() => {
                        if (!newDefaultBoq.itemDescription?.trim()) return;
                        const currentList = config.defaultBoqItems || DEFAULT_BOQ_ITEMS_CONFIG;
                        const nextLetter = String.fromCharCode(101 + currentList.length);
                        const itemToAdd: DefaultBoqItemConfig = {
                          id: `def-boq-${Date.now()}`,
                          label: `${nextLetter}. ${newDefaultBoq.itemDescription.trim()}`,
                          itemDescription: newDefaultBoq.itemDescription.trim(),
                          brand: newDefaultBoq.brand?.trim() || '',
                          defaultUnit: newDefaultBoq.defaultUnit || 'kWp',
                          defaultQtyType: newDefaultBoq.defaultQtyType || 'CAPACITY_KWP',
                          defaultUnitPrice: Number(newDefaultBoq.defaultUnitPrice) || 0,
                          warrantyPeriod: newDefaultBoq.warrantyPeriod || 'Standard Warranty',
                          isEnabled: true
                        };

                        setConfig({
                          ...config,
                          defaultBoqItems: [...currentList, itemToAdd]
                        });
                        setIsAddingDefaultBoq(false);
                        setNewDefaultBoq({
                          label: '',
                          itemDescription: '',
                          brand: '',
                          defaultUnit: 'kWp',
                          defaultQtyType: 'CAPACITY_KWP',
                          defaultQtyValue: '',
                          defaultUnitPrice: 0,
                          warrantyPeriod: 'Standard Warranty',
                          isEnabled: true
                        });
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Add to Defaults
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
