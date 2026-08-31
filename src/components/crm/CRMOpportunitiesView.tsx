import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  Building2, 
  Users, 
  X, 
  AlertTriangle,
  Layers,
  Tag,
  Package,
  UserCheck,
  Filter,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Percent,
  DollarSign,
  Eye,
  History,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Briefcase,
  CheckCircle2,
  MessageSquare,
  Send,
  Clock,
  ShieldCheck,
  Check,
  Activity
} from 'lucide-react';
import { 
  CRMOpportunity, 
  CRMAccount, 
  CRMContact, 
  CRMSettings, 
  OpportunityStage, 
  OpportunityEditHistoryEntry,
  OpportunityStageNote,
  ContactStatus,
  CRM_SALUTATIONS,
  formatCRMIDate, 
  formatCRMIDateTime,
  normalizeCompanyName,
  normalizePhoneNumber,
  DEFAULT_CRM_SETTINGS 
} from '../../crm/types';
import { User, AppSettings } from '../../types';
import { MOCK_USERS } from '../../data';
import CountryPhoneInput from './CountryPhoneInput';

interface CRMOpportunitiesViewProps {
  opportunities: CRMOpportunity[];
  accounts: CRMAccount[];
  contacts: CRMContact[];
  crmSettings: CRMSettings;
  currentUser: User;
  users?: User[];
  appSettings?: AppSettings;
  onAddOpportunity: (opp: Omit<CRMOpportunity, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateOpportunity: (opp: CRMOpportunity) => Promise<void>;
  onDeleteOpportunity: (id: string) => Promise<void>;
  onAddAccount?: (acc: Omit<CRMAccount, 'id' | 'createdAt'>) => Promise<CRMAccount | void> | CRMAccount | void;
  onAddContact?: (con: Omit<CRMContact, 'id' | 'createdAt'>) => Promise<CRMContact | void> | CRMContact | void;
}

export default function CRMOpportunitiesView({
  opportunities,
  accounts,
  contacts,
  crmSettings,
  currentUser,
  users = [],
  appSettings,
  onAddOpportunity,
  onUpdateOpportunity,
  onDeleteOpportunity,
  onAddAccount,
  onAddContact
}: CRMOpportunitiesViewProps) {
  const currencySymbol = appSettings?.currencySymbol || crmSettings?.defaultCurrency || '₹';

  // Dynamic Lists derived from Admin CRM App Settings
  const pipelineStagesList = useMemo(() => {
    return crmSettings?.pipelineStages?.length 
      ? crmSettings.pipelineStages 
      : DEFAULT_CRM_SETTINGS.pipelineStages;
  }, [crmSettings]);

  const leadSourcesList = useMemo(() => {
    return crmSettings?.leadSources?.length 
      ? crmSettings.leadSources 
      : DEFAULT_CRM_SETTINGS.leadSources;
  }, [crmSettings]);

  const productsAndServicesList = useMemo(() => {
    return crmSettings?.productsAndServices?.length
      ? crmSettings.productsAndServices
      : (DEFAULT_CRM_SETTINGS.productsAndServices || ['Safety Products', 'Residential Solar', 'Commercial Solar', 'Industrial HT Panels', 'EPC Turnkey', 'Maintenance AMC']);
  }, [crmSettings]);

  const businessCategoriesList = useMemo(() => {
    return crmSettings?.businessCategories?.length
      ? crmSettings.businessCategories
      : (DEFAULT_CRM_SETTINGS.businessCategories || ['Distributor', 'Manufacturer', 'Direct Customer', 'Consultant', 'Contractor', 'Government / PSU']);
  }, [crmSettings]);

  const industriesList = useMemo(() => {
    return crmSettings?.industries?.length
      ? crmSettings.industries
      : (DEFAULT_CRM_SETTINGS.industries || ['Electrical & Electronics', 'Solar Energy', 'Renewable Energy', 'Manufacturing & Heavy Industry', 'Infrastructure & Construction', 'Textiles', 'Information Technology', 'Healthcare & Pharmaceuticals', 'Education & Institutional']);
  }, [crmSettings]);

  // Available Users List for Assignment & Filters
  const availableUsersList = useMemo(() => {
    return users && users.length > 0 ? users : MOCK_USERS;
  }, [users]);

  // RBAC permissions
  const isAdmin = currentUser.role === 'ADMIN' || (currentUser as any).role === 'SUPER_ADMIN';
  const isManager = currentUser.role === 'MANAGER' || currentUser.isManager === true;
  const canChangeAnyStage = isAdmin || isManager;
  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;

  const canChangeStageForOpp = (opp: CRMOpportunity) => {
    if (canChangeAnyStage) return true;
    const userIdentifier = (currentUser.fullName || currentUser.username || '').trim().toLowerCase();
    const oppAssigned = (opp.assignedTo || '').trim().toLowerCase();
    if (!oppAssigned) return true;
    return oppAssigned === userIdentifier || (currentUser.username && oppAssigned === currentUser.username.trim().toLowerCase());
  };

  const handleQuickStageChange = (opp: CRMOpportunity, newStage: OpportunityStage) => {
    if (opp.stage === newStage) return;
    const targetStageConfig = pipelineStagesList.find(s => s.id === newStage) || {
      id: newStage,
      label: newStage,
      probability: 10,
      color: '#64748b'
    };

    setStageTransitionModal({
      opp,
      newStage,
      targetStageConfig,
      notes: '',
      lostReason: newStage === 'CLOSED_LOST' ? '' : undefined
    });
  };

  const handleConfirmStageTransition = async () => {
    if (!stageTransitionModal) return;
    const { opp, newStage, targetStageConfig, notes, lostReason } = stageTransitionModal;
    
    if (!notes.trim()) return;
    if (newStage === 'CLOSED_LOST' && !lostReason?.trim()) return;

    const oldStageConfig = getStageConfig(opp.stage);
    const newProb = targetStageConfig.probability;
    const now = new Date().toISOString();
    const actor = currentUser.fullName || currentUser.username || 'User';

    const changes: { field: string; oldValue: string; newValue: string }[] = [
      { field: 'Pipeline Stage', oldValue: oldStageConfig.label, newValue: targetStageConfig.label },
      { field: 'Win Probability', oldValue: `${opp.probability}%`, newValue: `${newProb}%` },
      { field: `${targetStageConfig.label} Notes`, oldValue: opp.notes || 'None', newValue: notes.trim() }
    ];

    if (newStage === 'CLOSED_LOST' && lostReason?.trim()) {
      changes.push({ field: 'Loss Reason', oldValue: opp.lostReason || 'None', newValue: lostReason.trim() });
    }

    const historyEntry: OpportunityEditHistoryEntry = {
      timestamp: now,
      changedBy: actor,
      action: 'STAGE_CHANGED',
      details: `Stage updated from "${oldStageConfig.label}" to "${targetStageConfig.label}": ${notes.trim()}`,
      oldStage: oldStageConfig.label,
      newStage: targetStageConfig.label,
      changes
    };
    const updatedHistory = opp.editHistory ? [historyEntry, ...opp.editHistory] : [historyEntry];

    const newStageNote: OpportunityStageNote = {
      id: `NOTE-${Date.now()}`,
      stage: newStage,
      stageLabel: targetStageConfig.label,
      note: notes.trim(),
      timestamp: now,
      author: actor
    };
    const updatedStageNotes = opp.stageNotes ? [newStageNote, ...opp.stageNotes] : [newStageNote];

    try {
      const updatedOpp: CRMOpportunity = {
        ...opp,
        stage: newStage,
        probability: newProb,
        notes: notes.trim(),
        ...(newStage === 'CLOSED_LOST' ? { lostReason: lostReason?.trim() } : {}),
        stageNotes: updatedStageNotes,
        updatedAt: now,
        editHistory: updatedHistory
      };

      await onUpdateOpportunity(updatedOpp);
      if (viewingOpp && viewingOpp.id === opp.id) {
        setViewingOpp(updatedOpp);
      }
      if (auditHistoryOpp && auditHistoryOpp.id === opp.id) {
        setAuditHistoryOpp(updatedOpp);
      }
      setStageTransitionModal(null);
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  };

  // ==================== FILTER STATES ====================
  // a. From-To Calendar Filter
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // b. Account Filter (multi-select)
  const [filterAccounts, setFilterAccounts] = useState<string[]>([]);

  // c. Pipeline Stage Filter (multi-select)
  const [filterStages, setFilterStages] = useState<string[]>([]);

  // d. Source Filter (multi-select)
  const [filterSources, setFilterSources] = useState<string[]>([]);

  // e. Portfolio / Products & Services Filter (multi-select)
  const [filterPortfolios, setFilterPortfolios] = useState<string[]>([]);

  // f. Account Owner Filter (multi-select)
  const [filterOwners, setFilterOwners] = useState<string[]>([]);

  // Filter Popover Open State
  const [openFilter, setOpenFilter] = useState<'calendar' | 'account' | 'stage' | 'source' | 'portfolio' | 'owner' | null>(null);

  // Search terms inside filter dropdowns
  const [searchAccountFilter, setSearchAccountFilter] = useState('');
  const [searchSourceFilter, setSearchSourceFilter] = useState('');
  const [searchPortfolioFilter, setSearchPortfolioFilter] = useState('');
  const [searchOwnerFilter, setSearchOwnerFilter] = useState('');

  // Export dropdown state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // ==================== PAGINATION STATE (10 PER PAGE) ====================
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ==================== MODAL STATES ====================
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<CRMOpportunity | null>(null);
  const [viewingOpp, setViewingOpp] = useState<CRMOpportunity | null>(null);
  const [auditHistoryOpp, setAuditHistoryOpp] = useState<CRMOpportunity | null>(null);
  const [deletingOppId, setDeletingOppId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick View Add Stage Note State
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isAddingQuickNote, setIsAddingQuickNote] = useState(false);

  const handleAddStageNote = async () => {
    if (!viewingOpp || !quickNoteText.trim()) return;
    setIsAddingQuickNote(true);
    try {
      const stageConfig = getStageConfig(viewingOpp.stage);
      const now = new Date().toISOString();
      const actor = currentUser.fullName || currentUser.username || 'User';

      const newStageNote: OpportunityStageNote = {
        id: `NOTE-${Date.now()}`,
        stage: viewingOpp.stage,
        stageLabel: stageConfig.label,
        note: quickNoteText.trim(),
        timestamp: now,
        author: actor
      };

      const existingNotes = viewingOpp.stageNotes && viewingOpp.stageNotes.length > 0
        ? viewingOpp.stageNotes
        : (viewingOpp.notes ? [{
            id: `INIT-${Date.now()}`,
            stage: viewingOpp.stage,
            stageLabel: stageConfig.label,
            note: viewingOpp.notes,
            timestamp: viewingOpp.createdAt,
            author: viewingOpp.assignedTo || actor
          }] : []);

      const updatedStageNotes = [newStageNote, ...existingNotes];

      const historyEntry: OpportunityEditHistoryEntry = {
        timestamp: now,
        changedBy: actor,
        action: 'UPDATED',
        details: `Added note in stage [${stageConfig.label}]: ${quickNoteText.trim()}`,
        changes: [{
          field: `${stageConfig.label} Stage Note`,
          oldValue: viewingOpp.notes || 'None',
          newValue: quickNoteText.trim()
        }]
      };

      const updatedOpp: CRMOpportunity = {
        ...viewingOpp,
        notes: quickNoteText.trim(),
        stageNotes: updatedStageNotes,
        updatedAt: now,
        editHistory: viewingOpp.editHistory ? [historyEntry, ...viewingOpp.editHistory] : [historyEntry]
      };

      await onUpdateOpportunity(updatedOpp);
      setViewingOpp(updatedOpp);
      if (auditHistoryOpp && auditHistoryOpp.id === viewingOpp.id) {
        setAuditHistoryOpp(updatedOpp);
      }
      setQuickNoteText('');
    } catch (err) {
      console.error('Error adding stage note:', err);
    } finally {
      setIsAddingQuickNote(false);
    }
  };

  // Stage Transition Modal State
  const [stageTransitionModal, setStageTransitionModal] = useState<{
    opp: CRMOpportunity;
    newStage: OpportunityStage;
    targetStageConfig: { id: string; label: string; probability: number; color: string };
    notes: string;
    lostReason?: string;
  } | null>(null);

  // Form State - Empty strings as placeholders for dropdowns
  const [formData, setFormData] = useState({
    title: '',
    accountId: '',
    accountName: '',
    contactId: '',
    contactName: '',
    amount: '' as unknown as number,
    stage: '' as OpportunityStage,
    probability: 0,
    expectedCloseDate: '',
    leadSource: '',
    portfolio: '',
    assignedTo: currentUser.fullName || currentUser.username,
    notes: ''
  });

  // Dynamic Contact list for Modal based on chosen account
  const availableContactsForOpportunity = useMemo(() => {
    if (!formData.accountId || formData.accountId === 'INDEPENDENT') {
      return contacts.filter(c => 
        !c.accountId || 
        c.accountId === 'INDEPENDENT' || 
        c.accountName === 'Independent / Direct Deal' || 
        c.accountName === 'Independent (Direct Deals)' || 
        c.accountName === 'Independent (Direct Sales)' || 
        c.accountName?.toLowerCase().includes('independent')
      );
    }
    return contacts.filter(c => c.accountId === formData.accountId);
  }, [contacts, formData.accountId]);

  // ==================== GUIDED DEAL WIZARD STATES & LOGIC ====================
  const [wizardStep, setWizardStep] = useState<'NONE' | 'PROMPT_CHOICE' | 'CREATE_ACCOUNT' | 'CREATE_CONTACT'>('NONE');
  const [wizardMode, setWizardMode] = useState<'INDEPENDENT' | 'CORPORATE' | null>(null);
  const [wizardCreatedAccount, setWizardCreatedAccount] = useState<CRMAccount | null>(null);
  const [wizardCreatedContact, setWizardCreatedContact] = useState<CRMContact | null>(null);
  const [isWizardSaving, setIsWizardSaving] = useState(false);

  // Wizard Account Form Data (Matching CRMAccountsView)
  const [wizardAccountFormData, setWizardAccountFormData] = useState({
    name: '',
    businessCategory: '',
    industry: '',
    phone: '',
    altPhone: '',
    email: '',
    website: '',
    address: '',
    billingCity: '',
    billingState: '',
    pincode: '',
    country: 'India',
    status: 'ACTIVE' as 'ACTIVE' | 'PROSPECT' | 'INACTIVE',
    assignedTo: currentUser.fullName || currentUser.username,
    notes: ''
  });
  const [wizardAccountShowTypeahead, setWizardAccountShowTypeahead] = useState(false);
  const [wizardAccountDismissDuplicateWarning, setWizardAccountDismissDuplicateWarning] = useState(false);

  // Live 3-character prefix/substring matching for company name
  const wizardLiveTypeaheadMatches = useMemo(() => {
    const term = wizardAccountFormData.name.trim().toLowerCase();
    if (term.length < 3) return [];
    return accounts.filter(acc => {
      return acc.name.toLowerCase().includes(term);
    }).slice(0, 5);
  }, [wizardAccountFormData.name, accounts]);

  // Exact/Suffix/Normalized duplicate matching
  const wizardDuplicateAccountMatches = useMemo(() => {
    const raw = wizardAccountFormData.name.trim();
    if (!raw) return [];
    const normalized = normalizeCompanyName(raw);
    if (!normalized) return [];

    return accounts.filter(acc => {
      const existingNorm = normalizeCompanyName(acc.name);
      return existingNorm === normalized || acc.name.toLowerCase().trim() === raw.toLowerCase();
    });
  }, [wizardAccountFormData.name, accounts]);

  // Wizard Contact Form Data (Matching CRMContactsView)
  const [wizardContactFormData, setWizardContactFormData] = useState({
    salutation: '',
    name: '',
    accountId: '',
    accountName: '',
    email: '',
    mobile: '',
    altMobile: '',
    designation: '',
    department: '',
    isPrimary: false,
    hasAlternativeAddress: false,
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    status: 'ACTIVE' as ContactStatus,
    assignedTo: currentUser.fullName || currentUser.username,
    notes: ''
  });
  const [wizardContactDismissDuplicateWarning, setWizardContactDismissDuplicateWarning] = useState(false);

  // Duplicate Contact Matching
  const wizardDuplicateContactMatches = useMemo(() => {
    const cleanMobile = normalizePhoneNumber(wizardContactFormData.mobile);
    const rawEmail = wizardContactFormData.email.trim().toLowerCase();
    const rawName = wizardContactFormData.name.trim().toLowerCase();

    if (!cleanMobile && !rawEmail && !rawName) return [];

    const matches: { contact: CRMContact; matchReason: string }[] = [];

    for (const c of contacts) {
      if (cleanMobile && (normalizePhoneNumber(c.mobile) === cleanMobile || normalizePhoneNumber(c.phone) === cleanMobile || normalizePhoneNumber(c.altMobile) === cleanMobile)) {
        matches.push({ contact: c, matchReason: 'Matching Mobile Number' });
        continue;
      }
      if (rawEmail && c.email && c.email.trim().toLowerCase() === rawEmail) {
        matches.push({ contact: c, matchReason: 'Matching Email Address' });
        continue;
      }
      const cName = (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim().toLowerCase();
      if (rawName && cName === rawName && wizardContactFormData.accountId && c.accountId === wizardContactFormData.accountId) {
        matches.push({ contact: c, matchReason: 'Same Full Name in this Account' });
        continue;
      }
    }
    return matches;
  }, [wizardContactFormData.mobile, wizardContactFormData.email, wizardContactFormData.name, wizardContactFormData.accountId, contacts]);

  const handleStartGuidedDealWizard = () => {
    setWizardCreatedAccount(null);
    setWizardCreatedContact(null);
    setWizardStep('PROMPT_CHOICE');
  };

  const handleSelectIndependentFlow = () => {
    setWizardMode('INDEPENDENT');
    setWizardCreatedAccount(null);
    setWizardContactFormData({
      name: '',
      accountId: 'INDEPENDENT',
      accountName: 'Independent (Direct Sales)',
      email: '',
      mobile: '',
      altMobile: '',
      designation: '',
      department: '',
      isPrimary: true,
      hasAlternativeAddress: false,
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      status: 'ACTIVE',
      assignedTo: currentUser.fullName || currentUser.username,
      notes: ''
    });
    setWizardContactDismissDuplicateWarning(false);
    setWizardStep('CREATE_CONTACT');
  };

  const handleSelectCorporateFlow = () => {
    setWizardMode('CORPORATE');
    setWizardCreatedAccount(null);
    setWizardAccountFormData({
      name: '',
      businessCategory: '',
      industry: '',
      phone: '',
      altPhone: '',
      email: '',
      website: '',
      address: '',
      billingCity: '',
      billingState: '',
      pincode: '',
      country: 'India',
      status: 'ACTIVE',
      assignedTo: currentUser.fullName || currentUser.username,
      notes: ''
    });
    setWizardAccountDismissDuplicateWarning(false);
    setWizardAccountShowTypeahead(false);
    setWizardStep('CREATE_ACCOUNT');
  };

  const handleWizardAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !wizardAccountFormData.name.trim() ||
      !wizardAccountFormData.businessCategory ||
      !wizardAccountFormData.industry ||
      !wizardAccountFormData.phone.trim() ||
      !wizardAccountFormData.address.trim() ||
      !wizardAccountFormData.billingCity.trim() ||
      !wizardAccountFormData.billingState.trim() ||
      !wizardAccountFormData.pincode.trim() ||
      !wizardAccountFormData.country.trim() ||
      !wizardAccountFormData.status ||
      !wizardAccountFormData.assignedTo
    ) {
      return;
    }

    setIsWizardSaving(true);
    try {
      let createdAcc: CRMAccount;
      if (onAddAccount) {
        const res = await onAddAccount({
          name: wizardAccountFormData.name.trim(),
          businessCategory: wizardAccountFormData.businessCategory,
          industry: wizardAccountFormData.industry,
          phone: wizardAccountFormData.phone.trim(),
          altPhone: wizardAccountFormData.altPhone.trim() || undefined,
          email: wizardAccountFormData.email.trim() || undefined,
          website: wizardAccountFormData.website.trim() || undefined,
          address: wizardAccountFormData.address.trim(),
          billingCity: wizardAccountFormData.billingCity.trim(),
          billingState: wizardAccountFormData.billingState.trim(),
          pincode: wizardAccountFormData.pincode.trim(),
          country: wizardAccountFormData.country.trim(),
          billingCountry: wizardAccountFormData.country.trim(),
          status: wizardAccountFormData.status,
          assignedTo: wizardAccountFormData.assignedTo,
          notes: wizardAccountFormData.notes.trim() || undefined
        });
        if (res) {
          createdAcc = res;
        } else {
          createdAcc = {
            id: `ACC-${Date.now().toString().slice(-4)}`,
            name: wizardAccountFormData.name.trim(),
            businessCategory: wizardAccountFormData.businessCategory,
            industry: wizardAccountFormData.industry,
            phone: wizardAccountFormData.phone.trim(),
            altPhone: wizardAccountFormData.altPhone.trim() || undefined,
            email: wizardAccountFormData.email.trim() || undefined,
            website: wizardAccountFormData.website.trim() || undefined,
            address: wizardAccountFormData.address.trim(),
            billingCity: wizardAccountFormData.billingCity.trim(),
            billingState: wizardAccountFormData.billingState.trim(),
            pincode: wizardAccountFormData.pincode.trim(),
            country: wizardAccountFormData.country.trim(),
            billingCountry: wizardAccountFormData.country.trim(),
            status: wizardAccountFormData.status,
            assignedTo: wizardAccountFormData.assignedTo,
            notes: wizardAccountFormData.notes.trim() || undefined,
            createdAt: new Date().toISOString()
          };
        }
      } else {
        createdAcc = {
          id: `ACC-${Date.now().toString().slice(-4)}`,
          name: wizardAccountFormData.name.trim(),
          businessCategory: wizardAccountFormData.businessCategory,
          industry: wizardAccountFormData.industry,
          phone: wizardAccountFormData.phone.trim(),
          altPhone: wizardAccountFormData.altPhone.trim() || undefined,
          email: wizardAccountFormData.email.trim() || undefined,
          website: wizardAccountFormData.website.trim() || undefined,
          address: wizardAccountFormData.address.trim(),
          billingCity: wizardAccountFormData.billingCity.trim(),
          billingState: wizardAccountFormData.billingState.trim(),
          pincode: wizardAccountFormData.pincode.trim(),
          country: wizardAccountFormData.country.trim(),
          billingCountry: wizardAccountFormData.country.trim(),
          status: wizardAccountFormData.status,
          assignedTo: wizardAccountFormData.assignedTo,
          notes: wizardAccountFormData.notes.trim() || undefined,
          createdAt: new Date().toISOString()
        };
      }

      setWizardCreatedAccount(createdAcc);
      setWizardContactFormData({
        name: '',
        accountId: createdAcc.id,
        accountName: createdAcc.name,
        email: '',
        mobile: '',
        altMobile: '',
        designation: '',
        department: '',
        isPrimary: true,
        hasAlternativeAddress: false,
        address: createdAcc.address || '',
        city: createdAcc.billingCity || '',
        state: createdAcc.billingState || '',
        pincode: createdAcc.pincode || '',
        country: createdAcc.country || 'India',
        status: 'ACTIVE',
        assignedTo: createdAcc.assignedTo || (currentUser.fullName || currentUser.username),
        notes: ''
      });
      setWizardContactDismissDuplicateWarning(false);
      setWizardStep('CREATE_CONTACT');
    } catch (err) {
      console.error('Failed to create account in wizard:', err);
    } finally {
      setIsWizardSaving(false);
    }
  };

  const handleWizardContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !wizardContactFormData.salutation.trim() ||
      !wizardContactFormData.name.trim() ||
      !wizardContactFormData.accountId ||
      !wizardContactFormData.mobile.trim() ||
      !wizardContactFormData.status ||
      !wizardContactFormData.assignedTo
    ) {
      return;
    }

    if (wizardContactFormData.accountId === 'INDEPENDENT') {
      if (
        !wizardContactFormData.address.trim() ||
        !wizardContactFormData.city.trim() ||
        !wizardContactFormData.state.trim() ||
        !wizardContactFormData.pincode.trim() ||
        !wizardContactFormData.country.trim()
      ) {
        return;
      }
    }

    setIsWizardSaving(true);
    try {
      const isIndep = wizardContactFormData.accountId === 'INDEPENDENT';
      const targetAcc = isIndep ? null : (wizardCreatedAccount || accounts.find(a => a.id === wizardContactFormData.accountId));
      const accId = isIndep ? 'INDEPENDENT' : (targetAcc?.id || wizardContactFormData.accountId);
      const accName = isIndep ? 'Independent (Direct Sales)' : (targetAcc?.name || wizardContactFormData.accountName);

      const nameParts = wizardContactFormData.name.trim().split(' ');
      const firstName = nameParts[0] || wizardContactFormData.name.trim();
      const lastName = nameParts.slice(1).join(' ');

      let createdCon: CRMContact;
      if (onAddContact) {
        const res = await onAddContact({
          salutation: wizardContactFormData.salutation.trim() || undefined,
          name: wizardContactFormData.name.trim(),
          firstName,
          lastName,
          accountId: accId,
          accountName: accName,
          email: wizardContactFormData.email.trim(),
          phone: wizardContactFormData.mobile.trim(),
          mobile: wizardContactFormData.mobile.trim(),
          altMobile: wizardContactFormData.altMobile.trim() || undefined,
          designation: wizardContactFormData.designation.trim() || undefined,
          department: wizardContactFormData.department.trim() || undefined,
          isPrimary: wizardContactFormData.isPrimary,
          hasAlternativeAddress: wizardContactFormData.hasAlternativeAddress,
          address: wizardContactFormData.address.trim() || undefined,
          city: wizardContactFormData.city.trim() || undefined,
          state: wizardContactFormData.state.trim() || undefined,
          pincode: wizardContactFormData.pincode.trim() || undefined,
          country: wizardContactFormData.country.trim() || undefined,
          status: wizardContactFormData.status,
          assignedTo: wizardContactFormData.assignedTo,
          notes: wizardContactFormData.notes.trim() || undefined
        });
        if (res) {
          createdCon = res;
        } else {
          createdCon = {
            id: `CON-${Date.now().toString().slice(-4)}`,
            salutation: wizardContactFormData.salutation.trim() || undefined,
            name: wizardContactFormData.name.trim(),
            firstName,
            lastName,
            accountId: accId,
            accountName: accName,
            email: wizardContactFormData.email.trim(),
            phone: wizardContactFormData.mobile.trim(),
            mobile: wizardContactFormData.mobile.trim(),
            altMobile: wizardContactFormData.altMobile.trim() || undefined,
            designation: wizardContactFormData.designation.trim() || undefined,
            department: wizardContactFormData.department.trim() || undefined,
            isPrimary: wizardContactFormData.isPrimary,
            hasAlternativeAddress: wizardContactFormData.hasAlternativeAddress,
            address: wizardContactFormData.address.trim() || undefined,
            city: wizardContactFormData.city.trim() || undefined,
            state: wizardContactFormData.state.trim() || undefined,
            pincode: wizardContactFormData.pincode.trim() || undefined,
            country: wizardContactFormData.country.trim() || undefined,
            status: wizardContactFormData.status,
            assignedTo: wizardContactFormData.assignedTo,
            notes: wizardContactFormData.notes.trim() || undefined,
            createdAt: new Date().toISOString()
          };
        }
      } else {
        createdCon = {
          id: `CON-${Date.now().toString().slice(-4)}`,
          salutation: wizardContactFormData.salutation.trim() || undefined,
          name: wizardContactFormData.name.trim(),
          firstName,
          lastName,
          accountId: accId,
          accountName: accName,
          email: wizardContactFormData.email.trim(),
          phone: wizardContactFormData.mobile.trim(),
          mobile: wizardContactFormData.mobile.trim(),
          altMobile: wizardContactFormData.altMobile.trim() || undefined,
          designation: wizardContactFormData.designation.trim() || undefined,
          department: wizardContactFormData.department.trim() || undefined,
          isPrimary: wizardContactFormData.isPrimary,
          hasAlternativeAddress: wizardContactFormData.hasAlternativeAddress,
          address: wizardContactFormData.address.trim() || undefined,
          city: wizardContactFormData.city.trim() || undefined,
          state: wizardContactFormData.state.trim() || undefined,
          pincode: wizardContactFormData.pincode.trim() || undefined,
          country: wizardContactFormData.country.trim() || undefined,
          status: wizardContactFormData.status,
          assignedTo: wizardContactFormData.assignedTo,
          notes: wizardContactFormData.notes.trim() || undefined,
          createdAt: new Date().toISOString()
        };
      }

      setWizardCreatedContact(createdCon);
      setWizardStep('NONE');

      const defaultTargetCloseDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
      })();

      const contactDisplayName = wizardContactFormData.name.trim();
      const oppTitle = isIndep
        ? `${contactDisplayName} - Direct Deal`
        : `${accName} - Project Supply`;

      setFormData({
        title: oppTitle,
        accountId: accId,
        accountName: accName,
        contactId: createdCon.id,
        contactName: contactDisplayName,
        amount: '' as unknown as number,
        stage: (pipelineStagesList[0]?.id as OpportunityStage) || 'PROPOSAL',
        probability: pipelineStagesList[0]?.probability || 10,
        expectedCloseDate: defaultTargetCloseDate,
        leadSource: leadSourcesList[0] || 'Direct Referral',
        portfolio: productsAndServicesList[0] || 'Safety Products',
        assignedTo: wizardContactFormData.assignedTo || (currentUser.fullName || currentUser.username),
        notes: ''
      });
      setEditingOpp(null);
      setIsAddModalOpen(true);
    } catch (err) {
      console.error('Failed to create contact in wizard:', err);
    } finally {
      setIsWizardSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      accountId: '',
      accountName: '',
      contactId: '',
      contactName: '',
      amount: '' as unknown as number,
      stage: '' as OpportunityStage,
      probability: 0,
      expectedCloseDate: '',
      leadSource: '',
      portfolio: '',
      assignedTo: currentUser.fullName || currentUser.username,
      notes: ''
    });
    setEditingOpp(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (opp: CRMOpportunity) => {
    setEditingOpp(opp);
    setFormData({
      title: opp.title || '',
      accountId: opp.accountId || '',
      accountName: opp.accountName || '',
      contactId: opp.contactId || '',
      contactName: opp.contactName || '',
      amount: opp.amount,
      stage: opp.stage,
      probability: opp.probability,
      expectedCloseDate: opp.expectedCloseDate || '',
      leadSource: opp.leadSource || '',
      portfolio: opp.portfolio || '',
      assignedTo: opp.assignedTo || currentUser.fullName || currentUser.username,
      notes: opp.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleStageChange = (newStage: OpportunityStage) => {
    const stageConfig = pipelineStagesList.find(s => s.id === newStage);
    setFormData(prev => ({
      ...prev,
      stage: newStage,
      probability: stageConfig ? stageConfig.probability : 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.title.trim() || 
      !formData.accountId || 
      !formData.contactId || 
      !formData.amount || 
      !formData.expectedCloseDate || 
      !formData.stage || 
      !formData.portfolio || 
      !formData.leadSource || 
      !formData.assignedTo ||
      !formData.notes.trim()
    ) {
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const actor = currentUser.fullName || currentUser.username || 'User';

    try {
      let accName = formData.accountName;
      if (formData.accountId === 'INDEPENDENT') {
        accName = 'Independent (Direct Deals)';
      } else {
        const selectedAcc = accounts.find(a => a.id === formData.accountId);
        if (selectedAcc) accName = selectedAcc.name;
      }

      const selectedCon = contacts.find(c => c.id === formData.contactId);
      const conName = selectedCon ? `${selectedCon.firstName} ${selectedCon.lastName}`.trim() : formData.contactName;

      if (editingOpp) {
        const changes: { field: string; oldValue: string; newValue: string }[] = [];

        if ((editingOpp.title || '').trim() !== formData.title.trim()) {
          changes.push({ field: 'Deal Title', oldValue: editingOpp.title || '(Blank)', newValue: formData.title.trim() });
        }
        if ((editingOpp.accountId || '') !== formData.accountId) {
          changes.push({ field: 'Client Account', oldValue: editingOpp.accountName || '(Blank)', newValue: accName });
        }
        if ((editingOpp.contactId || '') !== formData.contactId) {
          changes.push({ field: 'Contact Person', oldValue: editingOpp.contactName || '(Blank)', newValue: conName || '(Blank)' });
        }
        if (Number(editingOpp.amount || 0) !== Number(formData.amount || 0)) {
          changes.push({ 
            field: 'Commercial Value', 
            oldValue: `${currencySymbol}${Number(editingOpp.amount || 0).toLocaleString('en-IN')}`, 
            newValue: `${currencySymbol}${Number(formData.amount || 0).toLocaleString('en-IN')}` 
          });
        }
        if ((editingOpp.expectedCloseDate || '') !== (formData.expectedCloseDate || '')) {
          changes.push({ 
            field: 'Target Close Date', 
            oldValue: editingOpp.expectedCloseDate ? formatCRMIDate(editingOpp.expectedCloseDate) : '(Blank)', 
            newValue: formData.expectedCloseDate ? formatCRMIDate(formData.expectedCloseDate) : '(Blank)' 
          });
        }
        if (editingOpp.stage !== formData.stage) {
          const oldStageLabel = getStageConfig(editingOpp.stage).label;
          const newStageLabel = getStageConfig(formData.stage).label;
          changes.push({ field: 'Pipeline Stage', oldValue: oldStageLabel, newValue: newStageLabel });
        }
        if (editingOpp.probability !== formData.probability) {
          changes.push({ field: 'Win Probability', oldValue: `${editingOpp.probability}%`, newValue: `${formData.probability}%` });
        }
        if ((editingOpp.portfolio || '').trim() !== (formData.portfolio || '').trim()) {
          changes.push({ field: 'Portfolio', oldValue: editingOpp.portfolio || '(Blank)', newValue: formData.portfolio || '(Blank)' });
        }
        if ((editingOpp.leadSource || '').trim() !== (formData.leadSource || '').trim()) {
          changes.push({ field: 'Lead Source', oldValue: editingOpp.leadSource || '(Blank)', newValue: formData.leadSource || '(Blank)' });
        }
        if ((editingOpp.assignedTo || '').trim() !== (formData.assignedTo || '').trim()) {
          changes.push({ field: 'Assigned Account', oldValue: editingOpp.assignedTo || '(Blank)', newValue: formData.assignedTo || '(Blank)' });
        }
        if ((editingOpp.notes || '').trim() !== (formData.notes || '').trim()) {
          changes.push({ field: 'Scope & Notes', oldValue: editingOpp.notes || '(Blank)', newValue: formData.notes || '(Blank)' });
        }

        let actionType: 'UPDATED' | 'STAGE_CHANGED' | 'OWNER_REASSIGNED' = 'UPDATED';
        if (editingOpp.stage !== formData.stage) {
          actionType = 'STAGE_CHANGED';
        } else if ((editingOpp.assignedTo || '').trim() !== (formData.assignedTo || '').trim()) {
          actionType = 'OWNER_REASSIGNED';
        }

        const detailsText = changes.length > 0
          ? `Updated ${changes.length} field${changes.length > 1 ? 's' : ''}: ${changes.map(c => c.field).join(', ')}`
          : 'Opportunity details saved without modifications';

        const historyEntry: OpportunityEditHistoryEntry = {
          timestamp: now,
          changedBy: actor,
          action: actionType,
          details: detailsText,
          changes: changes.length > 0 ? changes : undefined
        };
        const updatedHistory = editingOpp.editHistory ? [historyEntry, ...editingOpp.editHistory] : [historyEntry];

        let updatedStageNotes = editingOpp.stageNotes || [];
        const isNoteChanged = (editingOpp.notes || '').trim() !== (formData.notes || '').trim();
        const isStageChanged = editingOpp.stage !== formData.stage;
        const currentStageConfig = getStageConfig(formData.stage);

        if ((isNoteChanged && formData.notes.trim()) || isStageChanged) {
          const newStageNote: OpportunityStageNote = {
            id: `NOTE-${Date.now()}`,
            stage: formData.stage,
            stageLabel: currentStageConfig.label,
            note: formData.notes.trim(),
            timestamp: now,
            author: actor
          };
          updatedStageNotes = [newStageNote, ...updatedStageNotes];
        }

        const updatedOpportunity: CRMOpportunity = {
          ...editingOpp,
          ...formData,
          amount: Number(formData.amount) || 0,
          accountName: accName,
          contactName: conName,
          stageNotes: updatedStageNotes,
          updatedAt: now,
          editHistory: updatedHistory
        };

        await onUpdateOpportunity(updatedOpportunity);
        if (viewingOpp && viewingOpp.id === editingOpp.id) {
          setViewingOpp(updatedOpportunity);
        }
        if (auditHistoryOpp && auditHistoryOpp.id === editingOpp.id) {
          setAuditHistoryOpp(updatedOpportunity);
        }
      } else {
        const historyEntry: OpportunityEditHistoryEntry = {
          timestamp: now,
          changedBy: actor,
          action: 'CREATED',
          details: 'Initial opportunity created in sales pipeline'
        };

        const currentStageConfig = getStageConfig(formData.stage);
        const initialStageNote: OpportunityStageNote | null = formData.notes.trim() ? {
          id: `NOTE-${Date.now()}`,
          stage: formData.stage,
          stageLabel: currentStageConfig.label,
          note: formData.notes.trim(),
          timestamp: now,
          author: actor
        } : null;

        await onAddOpportunity({
          ...formData,
          amount: Number(formData.amount) || 0,
          accountName: accName,
          contactName: conName,
          stageNotes: initialStageNote ? [initialStageNote] : [],
          editHistory: [historyEntry]
        });
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving deal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    setIsSaving(true);
    try {
      await onDeleteOpportunity(id);
      setDeletingOppId(null);
      if (viewingOpp && viewingOpp.id === id) {
        setViewingOpp(null);
      }
    } catch (err) {
      console.error('Error deleting deal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== UNIQUE FILTER LISTS ====================
  const uniqueAccounts = useMemo(() => {
    const accMap = new Map<string, string>();
    // Always include Independent Account option
    accMap.set('INDEPENDENT', '-- Independent / Direct --');
    accounts.forEach(a => {
      if (a.id && a.name && a.id !== 'INDEPENDENT') accMap.set(a.id, a.name);
    });
    opportunities.forEach(o => {
      if (o.accountId && o.accountName && o.accountId !== 'INDEPENDENT') accMap.set(o.accountId, o.accountName);
    });
    return Array.from(accMap.entries()).map(([id, name]) => ({ id, name }));
  }, [accounts, opportunities]);

  const uniquePortfolios = useMemo(() => {
    const pSet = new Set<string>(productsAndServicesList);
    opportunities.forEach(o => {
      if (o.portfolio && o.portfolio.trim()) pSet.add(o.portfolio.trim());
    });
    return Array.from(pSet).sort();
  }, [productsAndServicesList, opportunities]);

  const uniqueOwners = useMemo(() => {
    const ownerSet = new Set<string>();
    opportunities.forEach(o => {
      if (o.assignedTo && o.assignedTo.trim()) ownerSet.add(o.assignedTo.trim());
    });
    availableUsersList.forEach(u => {
      const name = u.fullName || u.username;
      if (name && name.trim()) ownerSet.add(name.trim());
    });
    if (currentUser.fullName) ownerSet.add(currentUser.fullName);
    return Array.from(ownerSet).sort();
  }, [opportunities, availableUsersList, currentUser]);

  // ==================== FILTERING LOGIC ====================
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      // a. Calendar Date Filter (Filtering by Opportunity Generated / Created Date)
      const generatedDate = opp.createdAt ? (opp.createdAt.includes('T') ? opp.createdAt.split('T')[0] : opp.createdAt.slice(0, 10)) : '';
      if (fromDate && generatedDate && generatedDate < fromDate) {
        return false;
      }
      if (toDate && generatedDate && generatedDate > toDate) {
        return false;
      }
      if ((fromDate || toDate) && !generatedDate) {
        return false;
      }

      // b. Account Filter (supports INDEPENDENT accounts)
      if (filterAccounts.length > 0) {
        const isOppIndependent = !opp.accountId || opp.accountId === 'INDEPENDENT' || opp.accountName?.toLowerCase().includes('independent');
        const matchesAccount = filterAccounts.some(accId => {
          if (accId === 'INDEPENDENT') {
            return isOppIndependent;
          }
          return opp.accountId === accId || opp.accountName === accId;
        });
        if (!matchesAccount) {
          return false;
        }
      }

      // c. Pipeline Stage Filter
      if (filterStages.length > 0) {
        if (!filterStages.includes(opp.stage)) {
          return false;
        }
      }

      // d. Source Filter
      if (filterSources.length > 0) {
        const source = opp.leadSource || 'Direct Referral';
        if (!filterSources.includes(source)) {
          return false;
        }
      }

      // e. Portfolio / Products & Services Filter
      if (filterPortfolios.length > 0) {
        const port = opp.portfolio || 'General / Unspecified';
        if (!filterPortfolios.includes(port)) {
          return false;
        }
      }

      // f. Owner Filter
      if (filterOwners.length > 0) {
        const owner = opp.assignedTo?.trim() || 'Admin Operator';
        if (!filterOwners.includes(owner)) {
          return false;
        }
      }

      return true;
    });
  }, [opportunities, fromDate, toDate, filterAccounts, filterStages, filterSources, filterPortfolios, filterOwners]);

  // Filter Active Check
  const isFilterActive = 
    Boolean(fromDate) || 
    Boolean(toDate) || 
    filterAccounts.length > 0 || 
    filterStages.length > 0 || 
    filterSources.length > 0 || 
    filterPortfolios.length > 0 ||
    filterOwners.length > 0;

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setFilterAccounts([]);
    setFilterStages([]);
    setFilterSources([]);
    setFilterPortfolios([]);
    setFilterOwners([]);
    setSearchAccountFilter('');
    setSearchSourceFilter('');
    setSearchPortfolioFilter('');
    setSearchOwnerFilter('');
    setCurrentPage(1);
  };

  // ==================== PAGINATION CALCULATIONS ====================
  const totalItems = filteredOpportunities.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOpportunities = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredOpportunities.slice(startIndex, startIndex + pageSize);
  }, [filteredOpportunities, validCurrentPage, pageSize]);

  // Stage Config Helper
  const getStageConfig = (stageId: OpportunityStage) => {
    return pipelineStagesList.find(s => s.id === stageId) || {
      id: stageId,
      label: stageId,
      probability: 10,
      color: '#64748b'
    };
  };

  // Date Presets Helper (Generated Date Presets)
  const applyDatePreset = (preset: 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CLEAR') => {
    if (preset === 'CLEAR') {
      setFromDate('');
      setToDate('');
      setCurrentPage(1);
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const formatDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'TODAY') {
      const todayStr = formatDateStr(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = formatDateStr(new Date(year, month, 1));
      const lastDay = formatDateStr(new Date(year, month + 1, 0));
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'LAST_MONTH') {
      const firstDay = formatDateStr(new Date(year, month - 1, 1));
      const lastDay = formatDateStr(new Date(year, month, 0));
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'THIS_QUARTER') {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const firstDay = formatDateStr(new Date(year, quarterStartMonth, 1));
      const lastDay = formatDateStr(new Date(year, quarterStartMonth + 3, 0));
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'THIS_YEAR') {
      setFromDate(`${year}-01-01`);
      setToDate(`${year}-12-31`);
    }
    setCurrentPage(1);
  };

  // ==================== EXPORT REPORT HANDLERS ====================
  const handleExportCSV = () => {
    const headers = [
      'Opportunity ID',
      'Deal Title',
      'Contact Person',
      'Client Account',
      'Portfolio / Product',
      `Commercial Deal Value (${currencySymbol})`,
      'Pipeline Stage',
      'Win Probability (%)',
      'Expected Close Date',
      'Lead Source',
      'Assigned Account',
      'Created Date (IST)',
      'Notes'
    ];

    const rows = filteredOpportunities.map(opp => {
      const stage = getStageConfig(opp.stage);
      return [
        `"${opp.id}"`,
        `"${(opp.title || '').replace(/"/g, '""')}"`,
        `"${(opp.contactName || 'Direct Account').replace(/"/g, '""')}"`,
        `"${(opp.accountName || '').replace(/"/g, '""')}"`,
        `"${(opp.portfolio || 'General').replace(/"/g, '""')}"`,
        `"${Number(opp.amount) || 0}"`,
        `"${stage.label}"`,
        `"${opp.probability}%"`,
        `"${opp.expectedCloseDate ? formatCRMIDate(opp.expectedCloseDate) : ''}"`,
        `"${(opp.leadSource || '').replace(/"/g, '""')}"`,
        `"${(opp.assignedTo || '').replace(/"/g, '""')}"`,
        `"${formatCRMIDate(opp.createdAt)}"`,
        `"${(opp.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `crm_opportunities_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    const rowsHTML = filteredOpportunities.map(opp => {
      const stage = getStageConfig(opp.stage);
      return `
      <tr>
        <td style="font-family: monospace; font-weight: bold;">${opp.id}</td>
        <td style="font-weight: bold;">${opp.title}</td>
        <td style="font-weight: bold;">${opp.contactName || 'Direct Account'}</td>
        <td>${opp.accountName}</td>
        <td style="font-weight: bold; color: #0284c7;">${opp.portfolio || '—'}</td>
        <td style="font-family: monospace; font-weight: bold; text-align: right;">${currencySymbol}${Number(opp.amount).toLocaleString('en-IN')}</td>
        <td style="font-weight: bold;">${stage.label}</td>
        <td style="text-align: center;">${opp.probability}%</td>
        <td>${opp.expectedCloseDate ? formatCRMIDate(opp.expectedCloseDate) : '—'}</td>
        <td>${opp.leadSource || '—'}</td>
        <td>${opp.assignedTo || '—'}</td>
        <td>${formatCRMIDate(opp.createdAt)}</td>
        <td>${(opp.notes || '').replace(/</g, '&lt;')}</td>
      </tr>
    `;
    }).join('');

    const totalValue = filteredOpportunities.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    const xlsContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        </head>
        <body>
          <table border="1">
            <thead>
              <tr style="background-color: #f7b944; color: #000; font-weight: bold;">
                <th>ID</th>
                <th>Opportunity Title</th>
                <th>Contact Person</th>
                <th>Client Account</th>
                <th>Portfolio / Solution</th>
                <th>Commercial Value (${currencySymbol})</th>
                <th>Pipeline Stage</th>
                <th>Win Prob.</th>
                <th>Expected Close</th>
                <th>Lead Source</th>
                <th>Assigned Account</th>
                <th>Created Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="5" style="text-align: right;">Total Commercial Value:</td>
                <td style="font-family: monospace; text-align: right;">${currencySymbol}${totalValue.toLocaleString('en-IN')}</td>
                <td colspan="7"></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `crm_opportunities_report_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalValue = filteredOpportunities.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    const rowsHTML = filteredOpportunities.map(opp => {
      const stage = getStageConfig(opp.stage);
      return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
        <td style="padding: 6px; font-family: monospace; font-weight: bold; white-space: nowrap;">${opp.id}</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">
          ${opp.title}
          <div style="font-size: 9px; color: #0f172a; font-weight: bold; margin-top: 2px;">
            ${opp.contactName ? opp.contactName : 'Direct Account'}
          </div>
          <div style="font-size: 8.5px; color: #64748b; font-weight: normal;">${opp.accountName}</div>
        </td>
        <td style="padding: 6px; color: #0369a1; font-weight: bold; white-space: nowrap;">
          ${opp.portfolio || '—'}
        </td>
        <td style="padding: 6px; white-space: nowrap;">
          <span style="background-color: ${stage.color}15; color: ${stage.color}; border: 1px solid ${stage.color}40; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">
            ${stage.label}
          </span>
        </td>
        <td style="padding: 6px; text-align: right; font-family: monospace; font-weight: bold; white-space: nowrap;">
          ${currencySymbol}${Number(opp.amount).toLocaleString('en-IN')}
        </td>
        <td style="padding: 6px; text-align: center; white-space: nowrap;">
          ${opp.probability}%
        </td>
        <td style="padding: 6px; white-space: nowrap;">${opp.expectedCloseDate ? formatCRMIDate(opp.expectedCloseDate) : '—'}</td>
        <td style="padding: 6px; color: #475569; white-space: nowrap;">${opp.leadSource || '—'}</td>
        <td style="padding: 6px; color: #475569; white-space: nowrap;">${opp.assignedTo || '—'}</td>
      </tr>
    `;
    }).join('');

    const nowIST = formatCRMIDateTime(new Date().toISOString());

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CRM Opportunities Pipeline Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; background-color: #f8fafc; color: #475569; font-size: 9.5px; text-transform: uppercase; padding: 8px 6px; border-bottom: 2px solid #cbd5e1; }
            @media print {
              body { margin: 10mm; }
              @page { size: landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f7b944; padding-bottom: 12px;">
            <div>
              <h2 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 800;">CRM Sales Opportunities Pipeline Report</h2>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">Generated on: ${nowIST} (IST) | Total Filtered Opportunities: <strong>${filteredOpportunities.length}</strong></p>
            </div>
            <div style="text-align: right;">
              <span style="background: linear-gradient(135deg, #ec003f, #f7b944); color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 900; letter-spacing: 1px; display: inline-block;">
                CONNECT
              </span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 75px;">ID</th>
                <th>Opportunity & Contact / Client</th>
                <th>Portfolio</th>
                <th>Stage</th>
                <th style="text-align: right;">Commercial Value</th>
                <th style="text-align: center;">Prob.</th>
                <th>Expected Close</th>
                <th>Lead Source</th>
                <th>Assigned Account</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; font-size: 10px;">
                <td colspan="4" style="padding: 8px 6px; text-align: right;">Total Commercial Value:</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace;">${currencySymbol}${totalValue.toLocaleString('en-IN')}</td>
                <td colspan="4" style="padding: 8px 6px;"></td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #475569; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div><strong>Generated On:</strong> ${nowIST} (IST)</div>
            </div>
            <div>
              <strong>Generated By:</strong> ${currentUser.fullName || currentUser.username}
            </div>
          </div>

        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-4">
      
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Sales Opportunities & Pipeline
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredOpportunities.length} of {opportunities.length} opportunities
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
          {/* Export Report Dropdown */}
          <div className="relative flex-1 sm:flex-initial">
            <button 
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="w-full sm:w-auto py-2.5 px-3 sm:px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 transition-all text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Export Report</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5 shrink-0" />
            </button>
            {isExportDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsExportDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    Export Options
                  </div>
                  <button
                    onClick={() => {
                      handleExportCSV();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Export as CSV
                  </button>
                  <button
                    onClick={() => {
                      handleExportXLSX();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Export as Excel (.xls)
                  </button>
                  <button
                    onClick={() => {
                      handleExportPDF();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Print / Export PDF
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-extrabold shadow-xs hover:bg-[#e5aa3b] transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {/* 2. FILTERS TOOLBAR (One Row / Multi-Select: Calendar, Account, Stage, Source, Portfolio, Owner) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full flex-1">
            {/* Filter a: From - To Calendar Filter (Opportunity Generated Date) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'calendar' ? null : 'calendar')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  (fromDate || toDate) ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
                title="Filter by Opportunity Generated Date"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">
                    {fromDate && toDate
                      ? `${fromDate} → ${toDate}`
                      : fromDate
                      ? `From: ${fromDate}`
                      : toDate
                      ? `To: ${toDate}`
                      : 'Generated Date'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'calendar' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3.5 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                      <div>
                        <span className="font-extrabold text-slate-800 text-[11px] block">Generated Date Filter</span>
                        <span className="text-[9.5px] text-slate-400">Filter by deal creation date</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('CLEAR')}
                        className="text-[10px] font-bold text-slate-500 hover:text-amber-600 cursor-pointer"
                      >
                        Clear Range
                      </button>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      <button
                        type="button"
                        onClick={() => applyDatePreset('TODAY')}
                        className="px-2 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 rounded-lg text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('THIS_MONTH')}
                        className="px-2 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 rounded-lg text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        This Month
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('LAST_MONTH')}
                        className="px-2 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 rounded-lg text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        Last Month
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('THIS_QUARTER')}
                        className="px-2 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 rounded-lg text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        This Quarter
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('THIS_YEAR')}
                        className="col-span-2 px-2 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 rounded-lg text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer text-center"
                      >
                        This Year
                      </button>
                    </div>

                    {/* From and To Date Inputs */}
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">From Date:</label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={e => {
                            setFromDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">To Date:</label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={e => {
                            setToDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setOpenFilter(null)}
                        className="px-3 py-1 bg-[#f7b944] text-slate-950 font-bold rounded-lg text-xs hover:bg-[#e0a330] cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter b: Account Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'account' ? null : 'account')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterAccounts.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {filterAccounts.length === 0
                      ? 'All Accounts'
                      : filterAccounts.length === 1
                      ? uniqueAccounts.find(a => a.id === filterAccounts[0] || a.name === filterAccounts[0])?.name || filterAccounts[0]
                      : `${filterAccounts.length} Accounts`}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'account' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Account</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterAccounts(uniqueAccounts.map(a => a.id))}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterAccounts([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchAccountFilter}
                      onChange={e => setSearchAccountFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {uniqueAccounts
                        .filter(acc => acc.name.toLowerCase().includes(searchAccountFilter.toLowerCase()))
                        .map(acc => {
                          const isChecked = filterAccounts.includes(acc.id) || filterAccounts.includes(acc.name);
                          return (
                            <label
                              key={acc.id}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterAccounts(prev => 
                                    prev.includes(acc.id) ? prev.filter(x => x !== acc.id && x !== acc.name) : [...prev, acc.id]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="truncate">{acc.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter c: Pipeline Stage Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'stage' ? null : 'stage')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterStages.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {filterStages.length === 0
                      ? 'All Stages'
                      : filterStages.length === 1
                      ? pipelineStagesList.find(s => s.id === filterStages[0])?.label || filterStages[0]
                      : `${filterStages.length} Stages`}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'stage' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Pipeline Stage</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterStages(pipelineStagesList.map(s => s.id))}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterStages([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {pipelineStagesList.map(stage => {
                        const isChecked = filterStages.includes(stage.id);
                        return (
                          <label
                            key={stage.id}
                            className="flex items-center justify-between px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterStages(prev => 
                                    prev.includes(stage.id) ? prev.filter(x => x !== stage.id) : [...prev, stage.id]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                              <span className="truncate">{stage.label}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">{stage.probability}%</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter d: Source Filter (from Admin CRM App Settings) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'source' ? null : 'source')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterSources.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {filterSources.length === 0
                      ? 'All Sources'
                      : filterSources.length === 1
                      ? filterSources[0]
                      : `${filterSources.length} Sources`}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'source' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Lead Source</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterSources([...leadSourcesList])}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterSources([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search sources..."
                      value={searchSourceFilter}
                      onChange={e => setSearchSourceFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {leadSourcesList
                        .filter(src => src.toLowerCase().includes(searchSourceFilter.toLowerCase()))
                        .map(src => {
                          const isChecked = filterSources.includes(src);
                          return (
                            <label
                              key={src}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterSources(prev => 
                                    prev.includes(src) ? prev.filter(x => x !== src) : [...prev, src]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="truncate">{src}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter e: Portfolio / Products & Services Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'portfolio' ? null : 'portfolio')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterPortfolios.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {filterPortfolios.length === 0
                      ? 'All Portfolios'
                      : filterPortfolios.length === 1
                      ? filterPortfolios[0]
                      : `${filterPortfolios.length} Portfolios`}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'portfolio' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Portfolio</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterPortfolios([...uniquePortfolios])}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterPortfolios([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search products/services..."
                      value={searchPortfolioFilter}
                      onChange={e => setSearchPortfolioFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {uniquePortfolios
                        .filter(p => p.toLowerCase().includes(searchPortfolioFilter.toLowerCase()))
                        .map(p => {
                          const isChecked = filterPortfolios.includes(p);
                          return (
                            <label
                              key={p}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterPortfolios(prev => 
                                    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="truncate">{p}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter f: Account Owner Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'owner' ? null : 'owner')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterOwners.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {filterOwners.length === 0
                      ? 'All Owners'
                      : filterOwners.length === 1
                      ? filterOwners[0]
                      : `${filterOwners.length} Owners`}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'owner' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Account Owner</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterOwners([...uniqueOwners])}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterOwners([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search owners..."
                      value={searchOwnerFilter}
                      onChange={e => setSearchOwnerFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {uniqueOwners
                        .filter(own => own.toLowerCase().includes(searchOwnerFilter.toLowerCase()))
                        .map(own => {
                          const isChecked = filterOwners.includes(own);
                          return (
                            <label
                              key={own}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterOwners(prev => 
                                    prev.includes(own) ? prev.filter(x => x !== own) : [...prev, own]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="truncate">{own}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Reset Filters Action Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. OPPORTUNITY LIST VIEW */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Opportunity & ID</th>
                <th className="py-3 px-4">Contact & Client Account</th>
                <th className="py-3 px-3">Pipeline Stage</th>
                <th className="py-3 px-3 text-right">Deal Value ({currencySymbol})</th>
                <th className="py-3 px-3 text-center">Win Prob.</th>
                <th className="py-3 px-3">Expected Close</th>
                <th className="py-3 px-3">Lead Source</th>
                <th className="py-3 px-3">Assigned Account</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOpportunities.map(opp => {
                const stage = getStageConfig(opp.stage);
                const canChangeStage = canChangeStageForOpp(opp);

                return (
                  <tr key={opp.id} className="hover:bg-slate-50/90 transition-colors group">
                    {/* Opportunity Title & ID - Clicking shows Audit History */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <button
                        type="button"
                        onClick={() => setAuditHistoryOpp(opp)}
                        className="font-extrabold text-slate-900 leading-snug truncate text-left block w-full hover:text-amber-700 hover:underline cursor-pointer"
                        title="Click Title to view Audit & Field History"
                      >
                        {opp.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditHistoryOpp(opp)}
                        className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200/80 transition-colors cursor-pointer hover:underline inline-flex items-center gap-1 mt-0.5"
                        title="Click ID to view Audit & Field History"
                      >
                        <span>{opp.id}</span>
                        <History className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </td>

                    {/* Contact & Client Account (Contact Person is Primary & Visible) */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <p className="font-extrabold text-slate-900 truncate" title={opp.contactName || 'Direct Account'}>
                        {opp.contactName ? opp.contactName : 'Direct Account'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5" title={opp.accountName}>
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0 inline" />
                        <span className="truncate">{opp.accountName}</span>
                      </p>
                    </td>

                    {/* Pipeline Stage Dropdown for Authorized Users & Managers / Badge for others */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {canChangeStage ? (
                        <div className="relative inline-block">
                          <select
                            value={opp.stage}
                            onChange={(e) => handleQuickStageChange(opp, e.target.value as OpportunityStage)}
                            className="appearance-none font-extrabold font-mono text-[10px] pl-2.5 pr-6 py-1 rounded-lg border cursor-pointer focus:outline-none transition-all shadow-2xs hover:opacity-90"
                            style={{
                              backgroundColor: `${stage.color}15`,
                              color: stage.color,
                              borderColor: `${stage.color}40`,
                            }}
                            title="Click to update pipeline stage"
                          >
                            {pipelineStagesList.map(s => (
                              <option key={s.id} value={s.id} className="bg-white text-slate-900 font-sans font-medium text-xs">
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown 
                            className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" 
                            style={{ color: stage.color }} 
                          />
                        </div>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold font-mono"
                          style={{ 
                            backgroundColor: `${stage.color}15`,
                            color: stage.color,
                            border: `1px solid ${stage.color}35`
                          }}
                          title="Stage view only (assigned to other user)"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stage.label}
                        </span>
                      )}
                    </td>

                    {/* Commercial Deal Value */}
                    <td className="py-3.5 px-3 text-right font-black text-slate-900 font-mono whitespace-nowrap">
                      {currencySymbol}{Number(opp.amount).toLocaleString('en-IN')}
                    </td>

                    {/* Win Probability with mini bar */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-bold text-xs text-slate-800">{opp.probability}%</span>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${opp.probability}%`,
                              backgroundColor: stage.color 
                            }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Expected Close Date */}
                    <td className="py-3.5 px-3 text-slate-600 font-medium whitespace-nowrap font-mono text-[11px]">
                      {opp.expectedCloseDate ? formatCRMIDate(opp.expectedCloseDate) : '—'}
                    </td>

                    {/* Lead Source */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold">
                        {opp.leadSource || 'Direct'}
                      </span>
                    </td>

                    {/* Assigned Account */}
                    <td className="py-3.5 px-3 text-slate-600 text-[11px] whitespace-nowrap truncate max-w-[120px]" title={opp.assignedTo}>
                      {opp.assignedTo || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingOpp(opp)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                          title="Quick View Opportunity & Stage Notes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(opp)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Edit Opportunity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeletingOppId(opp.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Opportunity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedOpportunities.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Target className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-xs text-slate-600">No opportunities match the selected filters</p>
                      {isFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE RESPONSIVE STACKED CARDS VIEW (No horizontal scrolling) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedOpportunities.map(opp => {
            const stage = getStageConfig(opp.stage);
            const canChangeStage = canChangeStageForOpp(opp);

            return (
              <div key={opp.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors">
                
                {/* Header: Title, ID & Pipeline Stage Dropdown */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAuditHistoryOpp(opp)}
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 cursor-pointer flex items-center gap-1"
                        title="Click ID to view Audit & Field History"
                      >
                        <span>{opp.id}</span>
                        <History className="w-2.5 h-2.5 opacity-60" />
                      </button>
                      {canChangeStage ? (
                        <div className="relative inline-block">
                          <select
                            value={opp.stage}
                            onChange={(e) => handleQuickStageChange(opp, e.target.value as OpportunityStage)}
                            className="appearance-none font-extrabold font-mono text-[10px] pl-2 pr-5 py-0.5 rounded-md border cursor-pointer focus:outline-none"
                            style={{
                              backgroundColor: `${stage.color}15`,
                              color: stage.color,
                              borderColor: `${stage.color}40`,
                            }}
                          >
                            {pipelineStagesList.map(s => (
                              <option key={s.id} value={s.id} className="bg-white text-slate-900 font-sans font-medium text-xs">
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown 
                            className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" 
                            style={{ color: stage.color }} 
                          />
                        </div>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold font-mono"
                          style={{ 
                            backgroundColor: `${stage.color}15`,
                            color: stage.color,
                            border: `1px solid ${stage.color}35`
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stage.label}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuditHistoryOpp(opp)}
                      className="font-extrabold text-xs text-slate-900 mt-1 leading-snug text-left hover:text-amber-700 hover:underline cursor-pointer block w-full"
                      title="Click Title to view Audit & Field History"
                    >
                      {opp.title}
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setViewingOpp(opp)}
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg cursor-pointer"
                      title="Quick View Opportunity & Stage Notes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(opp)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
                      title="Edit Opportunity"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setDeletingOppId(opp.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                        title="Delete Opportunity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact & Client Account Info (Contact Person is prominent) */}
                <div className="space-y-1 text-[11px] bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900 truncate">
                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{opp.contactName ? opp.contactName : 'Direct Account'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-500 truncate text-[10px]">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{opp.accountName}</span>
                  </div>
                </div>

                {/* Commercial Deal Value & Probability (No Weighted Forecast) */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Commercial Value</span>
                    <span className="font-black text-xs text-slate-900 font-mono">
                      {currencySymbol}{Number(opp.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Win Prob.</span>
                    <span className="font-bold text-xs text-slate-700">
                      {opp.probability}%
                    </span>
                  </div>
                </div>

                {/* Footer: Close Date, Source & Assigned Account */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Close: <strong>{opp.expectedCloseDate ? formatCRMIDate(opp.expectedCloseDate) : 'TBD'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                      {opp.leadSource || 'Direct'}
                    </span>
                    <span>• {opp.assignedTo || 'Unassigned'}</span>
                  </div>
                </div>

              </div>
            );
          })}

          {paginatedOpportunities.length === 0 && (
            <div className="py-10 text-center text-slate-400 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                <Target className="w-5 h-5" />
              </div>
              <p className="font-bold text-xs text-slate-600">No opportunities match the selected filters</p>
              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-amber-600 font-bold hover:underline cursor-pointer mt-1"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. PAGINATION FOOTER (10 ITEMS PER PAGE) */}
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 text-[11px] font-medium text-center sm:text-left">
            Showing <strong className="text-slate-800">{totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-800">{Math.min(validCurrentPage * pageSize, totalItems)}</strong> of{' '}
            <strong className="text-slate-800">{totalItems}</strong> opportunities
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
              .map((p, idx, arr) => {
                const prevP = arr[idx - 1];
                const showEllipsis = prevP && p - prevP > 1;

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-[30px] h-[30px] px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        validCurrentPage === p
                          ? 'bg-[#f7b944] text-slate-950 shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 5. ADD / EDIT OPPORTUNITY MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#f7b944]/20 border border-[#f7b944]/40 flex items-center justify-center text-[#f7b944] shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                      {editingOpp ? 'Edit Opportunity' : 'Create New Opportunity'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {!editingOpp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddModalOpen(false);
                          handleStartGuidedDealWizard();
                        }}
                        className="hidden sm:flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        <UserPlus className="w-4 h-4 text-[#f7b944] shrink-0" />
                        <span>Opportunity for New Contact</span>
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile view dedicated full-width action button */}
                {!editingOpp && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 sm:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        handleStartGuidedDealWizard();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-[#f7b944] shrink-0" />
                      <span>Opportunity for New Contact</span>
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                
                {/* Deal / Project Title */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deal / Project Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500kVA Transformer & HT Panel Supply"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Client Account & Contact Person */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client Account *</label>
                    <select
                      required
                      value={formData.accountId}
                      onChange={e => {
                        const val = e.target.value;
                        if (!val) {
                          setFormData({ 
                            ...formData, 
                            accountId: '',
                            accountName: '',
                            contactId: '',
                            contactName: ''
                          });
                        } else if (val === 'INDEPENDENT') {
                          setFormData({ 
                            ...formData, 
                            accountId: 'INDEPENDENT',
                            accountName: 'Independent (Direct Sales)',
                            contactId: '',
                            contactName: ''
                          });
                        } else {
                          const acc = accounts.find(a => a.id === val);
                          setFormData({ 
                            ...formData, 
                            accountId: val,
                            accountName: acc ? acc.name : '',
                            contactId: '',
                            contactName: ''
                          });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Client Account</option>
                      <option value="INDEPENDENT">Independent (Direct Sales)</option>
                      {accounts
                        .filter(acc => acc.id !== 'INDEPENDENT')
                        .map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Person *</label>
                    <select
                      required
                      value={formData.contactId}
                      onChange={e => {
                        const con = contacts.find(c => c.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          contactId: e.target.value,
                          contactName: con ? `${con.firstName} ${con.lastName}`.trim() : ''
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Contact Person</option>
                      {availableContactsForOpportunity.map(con => (
                        <option key={con.id} value={con.id}>
                          {con.firstName} {con.lastName} {con.designation ? `(${con.designation})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Commercial Value & Target Close Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Commercial Value ({currencySymbol}) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1850000"
                      value={formData.amount || ''}
                      onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Close Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.expectedCloseDate}
                      onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Pipeline Stage & Probability (Auto-assigned & Read-only) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pipeline Stage *</label>
                    <select
                      required
                      value={formData.stage}
                      onChange={e => handleStageChange(e.target.value as OpportunityStage)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Pipeline Stage</option>
                      {pipelineStagesList.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Probability (%) <span className="text-[10px] font-normal text-slate-400">(Auto-assigned)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        readOnly
                        disabled
                        value={formData.probability}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-not-allowed select-none focus:outline-none"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Portfolio & Lead Source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Portfolio (Product / Service) *</label>
                    <select
                      required
                      value={formData.portfolio}
                      onChange={e => setFormData({ ...formData, portfolio: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Portfolio</option>
                      {productsAndServicesList.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lead Source *</label>
                    <select
                      required
                      value={formData.leadSource}
                      onChange={e => setFormData({ ...formData, leadSource: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Lead Source</option>
                      {leadSourcesList.map(src => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assigned Account (User dropdown showing ONLY names for Admin, auto-assigned for others) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Account *</label>
                  {isAdmin ? (
                    <select
                      required
                      value={formData.assignedTo}
                      onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Assigned Account</option>
                      {availableUsersList.map(u => {
                        const uName = u.fullName || u.username;
                        return (
                          <option key={u.id || u.username} value={uName}>
                            {uName}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 flex items-center justify-between">
                      <span>{currentUser.fullName || currentUser.username}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                        Auto-assigned
                      </span>
                    </div>
                  )}
                </div>

                {/* Commercial Scope & Notes (Required) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Commercial Scope & Notes *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Project delivery milestones, quotation revisions, payment schedule..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-center cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-[#f7b944] text-slate-950 font-extrabold hover:bg-[#e5aa3b] transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : editingOpp ? 'Save Changes' : 'Create Opportunity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. OPPORTUNITY QUICK VIEW & STAGE NOTES MODAL */}
      <AnimatePresence>
        {viewingOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingOpp(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        {viewingOpp.id}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 truncate max-w-[240px] sm:max-w-md">
                        {viewingOpp.title}
                      </h3>
                      {(() => {
                        const st = getStageConfig(viewingOpp.stage);
                        return (
                          <span 
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold font-mono"
                            style={{
                              backgroundColor: `${st.color}15`,
                              color: st.color,
                              border: `1px solid ${st.color}35`
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                            {st.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Created on {formatCRMIDateTime(viewingOpp.createdAt)} | Assigned to {viewingOpp.assignedTo || 'Unassigned'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingOpp(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs">
                
                {/* Pipeline Stages Progress Stepper */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Pipeline Progression
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      Win Probability: {viewingOpp.probability}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto py-1">
                    {pipelineStagesList.map((st, idx) => {
                      const currentStageIdx = pipelineStagesList.findIndex(s => s.id === viewingOpp.stage);
                      const isPast = idx < currentStageIdx;
                      const isCurrent = idx === currentStageIdx;

                      return (
                        <div key={st.id} className="flex-1 min-w-[75px] flex flex-col items-center text-center">
                          <div className="w-full flex items-center mb-1">
                            <div className={`h-1 flex-1 ${idx === 0 ? 'invisible' : isPast || isCurrent ? 'bg-amber-400' : 'bg-slate-200'}`} />
                            <div 
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                                isCurrent 
                                  ? 'ring-2 ring-amber-400 ring-offset-2 text-white font-extrabold shadow-xs' 
                                  : isPast 
                                  ? 'bg-amber-500 text-white' 
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                              style={{ backgroundColor: isCurrent || isPast ? st.color : undefined }}
                            >
                              {isPast ? <Check className="w-3 h-3" /> : idx + 1}
                            </div>
                            <div className={`h-1 flex-1 ${idx === pipelineStagesList.length - 1 ? 'invisible' : isPast ? 'bg-amber-400' : 'bg-slate-200'}`} />
                          </div>
                          <span className={`text-[10px] font-bold truncate max-w-full block ${isCurrent ? 'text-slate-900 font-extrabold' : 'text-slate-500'}`}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/40 p-3.5 rounded-2xl border border-amber-100/70">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Commercial Value</span>
                    <span className="font-mono font-black text-slate-900 text-sm sm:text-base block mt-0.5">
                      {currencySymbol}{Number(viewingOpp.amount).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Win Probability</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-xs text-slate-800">{viewingOpp.probability}%</span>
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full" 
                          style={{ width: `${viewingOpp.probability}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Target Close</span>
                    <span className="font-mono text-slate-700 font-semibold block mt-1">
                      {viewingOpp.expectedCloseDate ? formatCRMIDate(viewingOpp.expectedCloseDate) : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Portfolio / Scope</span>
                    <span className="text-slate-700 font-semibold truncate block mt-1" title={viewingOpp.portfolio}>
                      {viewingOpp.portfolio || '—'}
                    </span>
                  </div>
                </div>

                {/* 2-Column Split: Deal Attributes vs Stage Notes History */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Deal Corporate Attributes (5 Cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>Corporate & Deal Details</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Contact Person</span>
                        <div className="flex items-center gap-2 font-bold text-slate-900 mt-1">
                          <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{viewingOpp.contactName ? viewingOpp.contactName : 'Direct Account'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Client Account</span>
                        <div className="flex items-center gap-2 font-bold text-slate-900 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{viewingOpp.accountName}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                        <div>
                          <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Lead Source</span>
                          <span className="text-slate-700 font-semibold block mt-0.5">{viewingOpp.leadSource || 'Direct'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Assigned Owner</span>
                          <span className="text-slate-700 font-semibold block mt-0.5">{viewingOpp.assignedTo || '—'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Last Modified (IST)</span>
                        <span className="font-mono text-slate-600 text-[11px] block mt-0.5">
                          {formatCRMIDateTime(viewingOpp.updatedAt || viewingOpp.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Loss Reason Alert (if Closed Lost) */}
                    {viewingOpp.stage === 'CLOSED_LOST' && viewingOpp.lostReason && (
                      <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Reason for Deal Loss</span>
                        </div>
                        <p className="text-rose-900 text-xs font-semibold leading-relaxed">
                          {viewingOpp.lostReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Stage Notes & Activity Feed (7 Cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span>Stage Notes & Deal Log</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Recorded at each stage</span>
                    </div>

                    {/* Add Stage Note Input Box for Current Stage */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: getStageConfig(viewingOpp.stage).color }} 
                          />
                          Add note for <strong className="text-slate-900">[{getStageConfig(viewingOpp.stage).label}]</strong>
                        </span>
                        <span className="text-[10px] text-slate-400">Current Stage</span>
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          rows={2}
                          value={quickNoteText}
                          onChange={(e) => setQuickNoteText(e.target.value)}
                          placeholder="Add progress note, client discussion, meeting summary, or next action..."
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleAddStageNote}
                          disabled={isAddingQuickNote || !quickNoteText.trim()}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 self-end"
                          title="Save Stage Note"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-xs">{isAddingQuickNote ? 'Saving...' : 'Post Note'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Stage Notes Timeline */}
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {(() => {
                        const notesToDisplay: OpportunityStageNote[] = viewingOpp.stageNotes && viewingOpp.stageNotes.length > 0
                          ? viewingOpp.stageNotes
                          : (viewingOpp.notes ? [{
                              id: 'INITIAL_NOTE',
                              stage: viewingOpp.stage,
                              stageLabel: getStageConfig(viewingOpp.stage).label,
                              note: viewingOpp.notes,
                              timestamp: viewingOpp.createdAt,
                              author: viewingOpp.assignedTo || 'Deal Creator'
                            }] : []);

                        if (notesToDisplay.length === 0) {
                          return (
                            <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-400 border border-slate-100">
                              <MessageSquare className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                              <p className="text-xs font-semibold text-slate-600">No stage notes recorded yet</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Use the box above to post the first update for this stage.</p>
                            </div>
                          );
                        }

                        return notesToDisplay.map((sn, snIdx) => {
                          const noteStageCfg = getStageConfig(sn.stage);
                          return (
                            <div 
                              key={sn.id || snIdx} 
                              className="relative pl-4 border-l-2 py-1 space-y-1 text-xs"
                              style={{ borderColor: noteStageCfg.color }}
                            >
                              <div 
                                className="absolute -left-[5px] top-2 w-2 h-2 rounded-full border border-white"
                                style={{ backgroundColor: noteStageCfg.color }}
                              />
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span 
                                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md"
                                    style={{
                                      backgroundColor: `${noteStageCfg.color}15`,
                                      color: noteStageCfg.color,
                                      border: `1px solid ${noteStageCfg.color}35`
                                    }}
                                  >
                                    {sn.stageLabel || noteStageCfg.label}
                                  </span>
                                  <span className="font-bold text-slate-800 text-[11px]">{sn.author}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {formatCRMIDateTime(sn.timestamp)}
                                </span>
                              </div>
                              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-slate-800 text-xs whitespace-pre-wrap leading-relaxed">
                                {sn.note}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const current = viewingOpp;
                    setViewingOpp(null);
                    setAuditHistoryOpp(current);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                  title="View full audit trail and field change log"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Audit History</span>
                </button>

                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        const opp = viewingOpp;
                        setViewingOpp(null);
                        handleOpenEdit(opp);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Opportunity</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingOpp(null)}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DEDICATED OPPORTUNITY AUDIT & FIELD HISTORY MODAL (Opened on Title / ID Click) */}
      <AnimatePresence>
        {auditHistoryOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuditHistoryOpp(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        {auditHistoryOpp.id}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 truncate max-w-[260px] sm:max-w-md">
                        {auditHistoryOpp.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Field change history & modification audit trail (IST)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditHistoryOpp(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Full Audit Log */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                {!auditHistoryOpp.editHistory || auditHistoryOpp.editHistory.length === 0 ? (
                  <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-400 border border-slate-100">
                    <History className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-700">Initial Opportunity Record</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Created on {formatCRMIDateTime(auditHistoryOpp.createdAt)} by {auditHistoryOpp.assignedTo || 'Admin'}. No edits or stage transitions have been recorded yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {auditHistoryOpp.editHistory.map((entry, eIdx) => (
                      <div key={eIdx} className="relative pl-5 border-l-2 border-amber-200 py-0.5 text-[11px] sm:text-xs">
                        {/* Timeline dot */}
                        <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white"></div>
                        
                        {/* Log Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] mb-1.5">
                          <span className="font-bold text-slate-800">
                            <span className={`inline-block mr-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                              entry.action === 'CREATED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : entry.action === 'STAGE_CHANGED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {entry.action.replace('_', ' ')}
                            </span>
                            by <span className="text-amber-700 font-semibold">{entry.changedBy}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-semibold">
                            {formatCRMIDateTime(entry.timestamp)}
                          </span>
                        </div>

                        {/* Details Box / Granular Changes */}
                        {entry.changes && entry.changes.length > 0 ? (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                            {entry.changes.map((change, cIdx) => {
                              const displayOld = (!change.oldValue || change.oldValue === 'None') ? '(Blank)' : change.oldValue;
                              const displayNew = (!change.newValue || change.newValue === 'None') ? '(Blank)' : change.newValue;
                              return (
                                <div key={cIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider truncate">
                                    {change.field}
                                  </span>
                                  <span className="sm:col-span-2 text-slate-700 flex flex-wrap items-center gap-1.5 break-all">
                                    <span className="font-medium bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md text-[10px] line-through decoration-red-400">
                                      {displayOld}
                                    </span>
                                    <span className="text-slate-400 text-[10px] font-bold">→</span>
                                    <span className="font-extrabold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md text-[10px]">
                                      {displayNew}
                                    </span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                            <p className="text-slate-700 font-medium text-[11px] leading-relaxed">
                              {entry.details || 'Opportunity details modified'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const opp = auditHistoryOpp;
                    setAuditHistoryOpp(null);
                    setViewingOpp(opp);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Quick View & Stage Notes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuditHistoryOpp(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-xs cursor-pointer ml-auto"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== GUIDED DEAL WIZARD MODALS ==================== */}
      {/* 1. SELECTION PROMPT MODAL */}
      <AnimatePresence>
        {wizardStep === 'PROMPT_CHOICE' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWizardStep('NONE')}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 p-6 space-y-5 text-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      Opportunity for New Contact
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Select client account type to proceed
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWizardStep('NONE')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 pt-1">
                {/* Option A: Independent Account */}
                <button
                  type="button"
                  onClick={handleSelectIndependentFlow}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all group cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-100/60 group-hover:bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 text-xs">
                        Option A: Independent Account
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        (Direct individual)
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* Option B: Other Account */}
                <button
                  type="button"
                  onClick={handleSelectCorporateFlow}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all group cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100/60 group-hover:bg-indigo-200/80 text-indigo-900 flex items-center justify-center shrink-0 transition-colors">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 text-xs">
                        Option B: Other Account
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        (New company or organization)
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWizardStep('NONE')}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-bold hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. WIZARD STEP: CREATE ACCOUNT (FOR OTHER ACCOUNT FLOW) */}
      <AnimatePresence>
        {wizardStep === 'CREATE_ACCOUNT' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWizardStep('NONE')}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                        Step 1 of 2
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Create Account
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Enter company details for this new corporate opportunity.
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setWizardStep('NONE')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleWizardAccountSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                
                {/* Company Name with Live 3-Char Typeahead & Duplicate Warning */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Company Name *</label>
                    {wizardAccountFormData.name.trim().length >= 3 && wizardLiveTypeaheadMatches.length > 0 && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {wizardLiveTypeaheadMatches.length} existing match{wizardLiveTypeaheadMatches.length > 1 ? 'es' : ''} found
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ommax Electric Private Limited"
                    value={wizardAccountFormData.name}
                    onChange={e => {
                      setWizardAccountFormData({ ...wizardAccountFormData, name: e.target.value });
                      setWizardAccountDismissDuplicateWarning(false);
                      setWizardAccountShowTypeahead(true);
                    }}
                    onFocus={() => setWizardAccountShowTypeahead(true)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />

                  {/* Typeahead Suggestions Dropdown */}
                  {wizardAccountShowTypeahead && wizardAccountFormData.name.trim().length >= 3 && wizardLiveTypeaheadMatches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 overflow-hidden text-xs">
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <span>Matching Existing Accounts</span>
                        <button
                          type="button"
                          onClick={() => setWizardAccountShowTypeahead(false)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {wizardLiveTypeaheadMatches.map(acc => (
                          <div
                            key={acc.id}
                            className="p-2.5 hover:bg-amber-50/50 flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                                <span>{acc.name}</span>
                                <span className="font-mono text-[10px] text-slate-400 font-semibold shrink-0">({acc.id})</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                                  acc.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                                  acc.status === 'PROSPECT' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {acc.status === 'ACTIVE' ? 'Active' : acc.status === 'PROSPECT' ? 'Prospect' : 'Inactive'}
                                </span>
                                <span>Owner: {acc.assignedTo || 'Admin'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warning Banner */}
                  {!wizardAccountDismissDuplicateWarning && wizardDuplicateAccountMatches.length > 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start justify-between gap-2.5 text-xs">
                      <div className="flex items-start gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-extrabold text-amber-900 text-xs">Potential Duplicate Account Detected</p>
                          <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                            An existing account <strong className="font-bold text-amber-950">"{wizardDuplicateAccountMatches[0].name}"</strong> ({wizardDuplicateAccountMatches[0].id}) was found matching this company name.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardAccountDismissDuplicateWarning(true)}
                        className="p-1 text-amber-700 hover:text-amber-950 rounded-md cursor-pointer shrink-0"
                        title="Dismiss warning"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Business Category & Industry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Business Category *</label>
                    <select
                      required
                      value={wizardAccountFormData.businessCategory}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, businessCategory: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Business Category</option>
                      {businessCategoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Industry *</label>
                    <select
                      required
                      value={wizardAccountFormData.industry}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, industry: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Industry</option>
                      {industriesList.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Office Phone & Alternative Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Office Phone *</label>
                    <CountryPhoneInput
                      id="wizard-acc-office-phone"
                      required
                      value={wizardAccountFormData.phone}
                      onChange={val => setWizardAccountFormData({ ...wizardAccountFormData, phone: val })}
                      placeholder="90259 76761"
                      defaultCountryCode={crmSettings?.defaultCountryCode || '+91'}
                      allowedCountryCodes={crmSettings?.allowedCountryCodes}
                      customCountryCodes={crmSettings?.customCountryCodes}
                      recentCountryCodes={crmSettings?.recentCountryCodes}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Alternative Phone</label>
                    <CountryPhoneInput
                      id="wizard-acc-alt-phone"
                      value={wizardAccountFormData.altPhone}
                      onChange={val => setWizardAccountFormData({ ...wizardAccountFormData, altPhone: val })}
                      placeholder="4329 220075"
                      defaultCountryCode={crmSettings?.defaultCountryCode || '+91'}
                      allowedCountryCodes={crmSettings?.allowedCountryCodes}
                      customCountryCodes={crmSettings?.customCountryCodes}
                      recentCountryCodes={crmSettings?.recentCountryCodes}
                    />
                  </div>
                </div>

                {/* Official Email & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      placeholder="hello@oepl.com"
                      value={wizardAccountFormData.email}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Website</label>
                    <input
                      type="text"
                      placeholder="https://company.com"
                      value={wizardAccountFormData.website}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, website: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Plot / Door No, Street, Landmark, Industrial Area"
                    value={wizardAccountFormData.address}
                    onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* City, State, Pin code, Country */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ariyalur"
                      value={wizardAccountFormData.billingCity}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, billingCity: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="Tamil Nadu"
                      value={wizardAccountFormData.billingState}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, billingState: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pin code *</label>
                    <input
                      type="text"
                      required
                      placeholder="621704"
                      value={wizardAccountFormData.pincode}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, pincode: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Country *</label>
                    <input
                      type="text"
                      required
                      placeholder="India"
                      value={wizardAccountFormData.country}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, country: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Account Status & Account Owner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Account Status *</label>
                    <select
                      required
                      value={wizardAccountFormData.status}
                      onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="ACTIVE">Active Client</option>
                      <option value="PROSPECT">Prospect / Lead</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Account Owner * {!isAdmin && <span className="text-[10px] font-normal text-slate-400">(Auto-assigned)</span>}
                    </label>
                    {isAdmin ? (
                      <select
                        required
                        value={wizardAccountFormData.assignedTo}
                        onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, assignedTo: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors cursor-pointer"
                      >
                        {availableUsersList.map(u => {
                          const displayName = u.fullName || u.username;
                          return (
                            <option key={u.id || u.username} value={displayName}>
                              {displayName}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        readOnly
                        disabled
                        value={wizardAccountFormData.assignedTo}
                        className="w-full px-3.5 py-2.5 rounded-xl font-semibold text-slate-500 bg-slate-100/80 border border-slate-200 cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Background</label>
                  <textarea
                    rows={2}
                    placeholder="Brief background or notes about this client account..."
                    value={wizardAccountFormData.notes}
                    onChange={e => setWizardAccountFormData({ ...wizardAccountFormData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep('PROMPT_CHOICE')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWizardStep('NONE')}
                      className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-bold hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isWizardSaving}
                      className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      {isWizardSaving ? (
                        <span>Saving Account...</span>
                      ) : (
                        <>
                          <span>Next: Add Contact</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. WIZARD STEP: CREATE CONTACT (FOR INDEPENDENT & CORPORATE FLOWS) */}
      <AnimatePresence>
        {wizardStep === 'CREATE_CONTACT' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWizardStep('NONE')}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                        {wizardMode === 'INDEPENDENT' ? 'Step 1 of 2' : 'Step 2 of 2'}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Create Contact
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {wizardMode === 'INDEPENDENT'
                        ? 'Enter details for the direct individual contact.'
                        : `Enter contact details for ${wizardCreatedAccount?.name || wizardContactFormData.accountName || 'this account'}.`}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setWizardStep('NONE')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleWizardContactSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                
                {/* Full Name & Salutation */}
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Salutation *</label>
                    <select
                      required
                      value={wizardContactFormData.salutation}
                      onChange={e => setWizardContactFormData({ ...wizardContactFormData, salutation: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="">Select...</option>
                      {CRM_SALUTATIONS.map(sal => (
                        <option key={sal} value={sal}>{sal}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={wizardContactFormData.name}
                      onChange={e => {
                        setWizardContactFormData({ ...wizardContactFormData, name: e.target.value });
                        setWizardContactDismissDuplicateWarning(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Associated Account & Contact Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Associated Account *</label>
                    <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 flex items-center justify-between">
                      <span className="truncate">
                        {wizardMode === 'INDEPENDENT'
                          ? 'Independent (Direct Sales)'
                          : (wizardCreatedAccount?.name || wizardContactFormData.accountName || 'Selected Account')}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 shrink-0 ml-2">
                        {wizardMode === 'INDEPENDENT' ? 'Direct Deal' : 'Linked Account'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Status *</label>
                    <select
                      required
                      value={wizardContactFormData.status}
                      onChange={e => setWizardContactFormData({ ...wizardContactFormData, status: e.target.value as ContactStatus })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="LEFT_COMPANY">Left Company</option>
                      <option value="DO_NOT_CONTACT">Do Not Contact</option>
                    </select>
                  </div>
                </div>

                {/* Email Address & Mobile Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="hello@domain.com"
                      value={wizardContactFormData.email}
                      onChange={e => {
                        setWizardContactFormData({ ...wizardContactFormData, email: e.target.value });
                        setWizardContactDismissDuplicateWarning(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <CountryPhoneInput
                      id="wizard-con-mobile-number"
                      required
                      value={wizardContactFormData.mobile}
                      onChange={val => {
                        setWizardContactFormData({ ...wizardContactFormData, mobile: val });
                        setWizardContactDismissDuplicateWarning(false);
                      }}
                      placeholder="90259 76761"
                      defaultCountryCode={crmSettings?.defaultCountryCode || '+91'}
                      allowedCountryCodes={crmSettings?.allowedCountryCodes}
                      customCountryCodes={crmSettings?.customCountryCodes}
                      recentCountryCodes={crmSettings?.recentCountryCodes}
                    />
                  </div>
                </div>

                {/* Duplicate Contact Warning Banner */}
                {!wizardContactDismissDuplicateWarning && wizardDuplicateContactMatches.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start justify-between gap-2.5 text-xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-amber-900 text-xs">Potential Duplicate Contact Detected</p>
                        <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                          A contact <strong className="font-bold text-amber-950">"{wizardDuplicateContactMatches[0].contact.name || wizardDuplicateContactMatches[0].contact.firstName}"</strong> ({wizardDuplicateContactMatches[0].contact.id} • {wizardDuplicateContactMatches[0].contact.mobile || wizardDuplicateContactMatches[0].contact.phone}) already exists with {wizardDuplicateContactMatches[0].matchReason.toLowerCase()}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardContactDismissDuplicateWarning(true)}
                      className="p-1 text-amber-700 hover:text-amber-950 rounded-md cursor-pointer shrink-0"
                      title="Dismiss warning"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Alternative Mobile Number & Contact Owner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Alternative Mobile Number</label>
                    <CountryPhoneInput
                      id="wizard-con-alt-mobile-number"
                      value={wizardContactFormData.altMobile}
                      onChange={val => setWizardContactFormData({ ...wizardContactFormData, altMobile: val })}
                      placeholder="4329 220075"
                      defaultCountryCode={crmSettings?.defaultCountryCode || '+91'}
                      allowedCountryCodes={crmSettings?.allowedCountryCodes}
                      customCountryCodes={crmSettings?.customCountryCodes}
                      recentCountryCodes={crmSettings?.recentCountryCodes}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Contact Owner * {!isAdmin && <span className="text-[10px] font-normal text-slate-400">(Auto-assigned)</span>}
                    </label>
                    {isAdmin ? (
                      <select
                        required
                        value={wizardContactFormData.assignedTo}
                        onChange={e => setWizardContactFormData({ ...wizardContactFormData, assignedTo: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors cursor-pointer"
                      >
                        {availableUsersList.map(u => {
                          const displayName = u.fullName || u.username;
                          return (
                            <option key={u.id || u.username} value={displayName}>
                              {displayName}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        readOnly
                        disabled
                        value={wizardContactFormData.assignedTo}
                        className="w-full px-3.5 py-2.5 rounded-xl font-semibold text-slate-500 bg-slate-100/80 border border-slate-200 cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>

                {/* Department & Job Designation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="Supply Chain & Contracts"
                      value={wizardContactFormData.department}
                      onChange={e => setWizardContactFormData({ ...wizardContactFormData, department: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Job Designation</label>
                    <input
                      type="text"
                      placeholder="Head of Procurement"
                      value={wizardContactFormData.designation}
                      onChange={e => setWizardContactFormData({ ...wizardContactFormData, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Primary Key Contact & Optional Alternative Address Option */}
                {wizardMode !== 'INDEPENDENT' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="wizardPrimaryKeyContactCheckbox"
                        checked={wizardContactFormData.isPrimary}
                        onChange={e => setWizardContactFormData({ ...wizardContactFormData, isPrimary: e.target.checked })}
                        className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
                      />
                      <label htmlFor="wizardPrimaryKeyContactCheckbox" className="font-bold text-slate-800 text-xs flex items-center gap-1.5 cursor-pointer select-none">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                        <span>Primary Key Contact for this Account</span>
                      </label>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5 hover:bg-slate-100/60 transition-colors">
                      <input
                        type="checkbox"
                        id="wizardRequireAltAddressCheckbox"
                        checked={wizardContactFormData.hasAlternativeAddress}
                        onChange={e => setWizardContactFormData({ ...wizardContactFormData, hasAlternativeAddress: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
                      />
                      <label htmlFor="wizardRequireAltAddressCheckbox" className="font-bold text-slate-800 text-xs flex items-center gap-1.5 cursor-pointer select-none">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Do you require alternative address for this contact?</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="wizardPrimaryKeyContactCheckbox"
                      checked={wizardContactFormData.isPrimary}
                      onChange={e => setWizardContactFormData({ ...wizardContactFormData, isPrimary: e.target.checked })}
                      className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
                    />
                    <label htmlFor="wizardPrimaryKeyContactCheckbox" className="font-bold text-slate-800 text-xs flex items-center gap-1.5 cursor-pointer select-none">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      <span>Primary Key Contact for this Account</span>
                    </label>
                  </div>
                )}

                {/* Alternative Address Fields (when alternative address is checked) */}
                {wizardMode !== 'INDEPENDENT' && wizardContactFormData.hasAlternativeAddress && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span>Alternative / Specific Contact Address</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Optional address specific to this contact</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="Specific Office, Branch, Site, Floor No, Street Address"
                        value={wizardContactFormData.address}
                        onChange={e => setWizardContactFormData({ ...wizardContactFormData, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">City</label>
                        <input
                          type="text"
                          placeholder="City"
                          value={wizardContactFormData.city}
                          onChange={e => setWizardContactFormData({ ...wizardContactFormData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">State</label>
                        <input
                          type="text"
                          placeholder="State"
                          value={wizardContactFormData.state}
                          onChange={e => setWizardContactFormData({ ...wizardContactFormData, state: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Pin code</label>
                        <input
                          type="text"
                          placeholder="Pin code"
                          value={wizardContactFormData.pincode}
                          onChange={e => setWizardContactFormData({ ...wizardContactFormData, pincode: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Country</label>
                        <input
                          type="text"
                          placeholder="India"
                          value={wizardContactFormData.country}
                          onChange={e => setWizardContactFormData({ ...wizardContactFormData, country: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Independent Contact Address Fields (REQUIRED when Independent) */}
                {wizardMode === 'INDEPENDENT' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Independent Contact Address *</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        placeholder="Plot / Door No, Street, Landmark, Industrial Area"
                        value={wizardContactFormData.address}
                        onChange={e => setWizardContactFormData({ ...wizardContactFormData, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ariyalur"
                          value={wizardContactFormData.city}
                          onChange={e => setWizardContactFormData({ ...wizardContactFormData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">State *</label>
                        <input
                          type="text"
                          required
                          placeholder="Tamil Nadu"
                          value={wizardContactFormData.state}
                          onChange={e => setWizardContactFormData({ ...wizardContactFormData, state: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Pin code *</label>
                        <input
                          type="text"
                          required
                          placeholder="621704"
                          value={wizardContactFormData.pincode}
                          onChange={e => setWizardContactFormData({ ...wizardContactFormData, pincode: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Country *</label>
                        <input
                          type="text"
                          required
                          placeholder="India"
                          value={wizardContactFormData.country}
                          onChange={e => setWizardContactFormData({ ...wizardContactFormData, country: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Preferences</label>
                  <textarea
                    rows={2}
                    placeholder="Preferred contact hours, direct assistant contact..."
                    value={wizardContactFormData.notes}
                    onChange={e => setWizardContactFormData({ ...wizardContactFormData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardMode === 'INDEPENDENT') {
                        setWizardStep('PROMPT_CHOICE');
                      } else {
                        setWizardStep('CREATE_ACCOUNT');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWizardStep('NONE')}
                      className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-bold hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isWizardSaving}
                      className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      {isWizardSaving ? (
                        <span>Saving Contact...</span>
                      ) : (
                        <>
                          <span>Continue to Opportunity</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STAGE TRANSITION REQUIRED NOTES MODAL */}
      <AnimatePresence>
        {stageTransitionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStageTransitionModal(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 text-xs"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm"
                    style={{ 
                      backgroundColor: `${stageTransitionModal.targetStageConfig.color}20`,
                      color: stageTransitionModal.targetStageConfig.color 
                    }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Update Stage: {stageTransitionModal.targetStageConfig.label}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {stageTransitionModal.opp.title} ({stageTransitionModal.opp.accountName})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStageTransitionModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirmStageTransition();
                }}
                className="p-6 space-y-4"
              >
                {/* Stage Badge & Probability Summary */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Stage:</span>
                    <span 
                      className="px-2.5 py-0.5 rounded-md font-extrabold font-mono text-[11px]"
                      style={{ 
                        backgroundColor: `${stageTransitionModal.targetStageConfig.color}20`,
                        color: stageTransitionModal.targetStageConfig.color 
                      }}
                    >
                      {stageTransitionModal.targetStageConfig.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Win Probability:</span>
                    <span className="font-black text-slate-900 font-mono text-xs">
                      {stageTransitionModal.targetStageConfig.probability}%
                    </span>
                  </div>
                </div>

                {/* Reason for Loss (If Closed Lost) */}
                {stageTransitionModal.newStage === 'CLOSED_LOST' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                      Reason for Loss *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Budget constraints, Competitor chosen, Project deferred..."
                      value={stageTransitionModal.lostReason || ''}
                      onChange={(e) => setStageTransitionModal({
                        ...stageTransitionModal,
                        lostReason: e.target.value
                      })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white transition-colors text-xs"
                    />
                  </div>
                )}

                {/* Dynamic Notes Field with Dynamic Heading */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                    {stageTransitionModal.targetStageConfig.label} Notes *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={`Enter key notes, strategy update, or summary for ${stageTransitionModal.targetStageConfig.label.toLowerCase()}...`}
                    value={stageTransitionModal.notes}
                    onChange={(e) => setStageTransitionModal({
                      ...stageTransitionModal,
                      notes: e.target.value
                    })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Notes will be logged to the opportunity audit history and CRM notifications.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStageTransitionModal(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!stageTransitionModal.notes.trim() || (stageTransitionModal.newStage === 'CLOSED_LOST' && !stageTransitionModal.lostReason?.trim())}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-slate-800 transition-all shadow-xs cursor-pointer text-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>Confirm Stage Update</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingOppId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingOppId(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-10 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Delete Opportunity?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this deal from your sales pipeline?
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingOppId(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deletingOppId)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-700 transition-all shadow-xs cursor-pointer"
                >
                  {isSaving ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
