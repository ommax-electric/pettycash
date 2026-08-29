import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Mail, 
  Phone, 
  Building2, 
  Edit3, 
  Pencil,
  Trash2, 
  Star, 
  X, 
  AlertTriangle,
  MapPin,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  UserCheck,
  Eye,
  History,
  Briefcase,
  ExternalLink
} from 'lucide-react';
import { 
  CRMContact, 
  CRMAccount, 
  CRMSettings,
  ContactStatus,
  AccountEditHistoryEntry,
  CRM_SALUTATIONS,
  formatCRMIDate,
  formatCRMIDateTime,
  normalizePhoneNumber
} from '../../crm/types';
import { User, AppSettings } from '../../types';
import { MOCK_USERS } from '../../data';
import CountryPhoneInput from './CountryPhoneInput';

interface CRMContactsViewProps {
  contacts: CRMContact[];
  accounts: CRMAccount[];
  crmSettings?: CRMSettings;
  currentUser: User;
  users?: User[];
  appSettings?: AppSettings;
  onAddContact: (contact: Omit<CRMContact, 'id' | 'createdAt'>) => Promise<CRMContact | void>;
  onUpdateContact: (contact: CRMContact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
}

export default function CRMContactsView({
  contacts,
  accounts,
  crmSettings,
  currentUser,
  users = [],
  appSettings,
  onAddContact,
  onUpdateContact,
  onDeleteContact
}: CRMContactsViewProps) {
  // Available users list for assignment
  const availableUsersList = useMemo(() => {
    return users && users.length > 0 ? users : MOCK_USERS;
  }, [users]);

  // RBAC permissions:
  // - Admin: Create, Edit, Delete
  // - Manager: Create, Edit (Delete is Admin only)
  // - Standard User: Create only (Status column editable from data section directly)
  const isAdmin = currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER' || currentUser.isManager === true;
  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;

  // ==================== MULTI-SELECT FILTERS STATE ====================
  const [filterAccounts, setFilterAccounts] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterOwner, setFilterOwner] = useState<string[]>([]);

  // Popover open states
  const [openFilter, setOpenFilter] = useState<'account' | 'status' | 'location' | 'owner' | null>(null);

  // Search terms inside filter dropdowns
  const [searchAccountFilter, setSearchAccountFilter] = useState('');
  const [searchLocationFilter, setSearchLocationFilter] = useState('');
  const [searchOwnerFilter, setSearchOwnerFilter] = useState('');

  // Export report dropdown
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingContact, setViewingContact] = useState<CRMContact | null>(null);
  const [showContactHistory, setShowContactHistory] = useState(false);
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [statusChangePrompt, setStatusChangePrompt] = useState<{
    contact: CRMContact;
    newStatus: ContactStatus;
    oldStatus: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    salutation: '',
    name: '',
    email: '',
    mobile: '',
    altMobile: '',
    accountId: '',
    accountName: '',
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

  // Deduplication state
  const [dismissDuplicateContactWarning, setDismissDuplicateContactWarning] = useState(false);

  // Smart Contact Deduplication (10-Digit Phone Normalization + Email + Account Name checks)
  const duplicateContactMatches = useMemo(() => {
    const inputMobileNorm = normalizePhoneNumber(formData.mobile);
    const inputEmailNorm = formData.email.trim().toLowerCase();
    const inputNameNorm = formData.name.trim().toLowerCase();
    const currentAccId = formData.accountId;

    if (!inputMobileNorm && !inputEmailNorm && inputNameNorm.length < 3) return [];

    const matches: { contact: CRMContact; matchReason: string }[] = [];

    contacts.forEach(c => {
      if (editingContact && c.id === editingContact.id) return;

      // 1. Primary Check: 10-Digit Normalization Check on Mobile / Alt Mobile
      if (inputMobileNorm && inputMobileNorm.length >= 10) {
        const cMobileNorm = normalizePhoneNumber(c.mobile || c.phone);
        const cAltNorm = normalizePhoneNumber(c.altMobile);
        if ((cMobileNorm && cMobileNorm === inputMobileNorm) || (cAltNorm && cAltNorm === inputMobileNorm)) {
          matches.push({ contact: c, matchReason: `Same mobile number (${c.mobile || c.phone})` });
          return;
        }
      }

      // 2. Email Address Check
      if (inputEmailNorm && c.email && c.email.trim().toLowerCase() === inputEmailNorm) {
        matches.push({ contact: c, matchReason: `Same email address (${c.email})` });
        return;
      }

      // 3. Name + Same Account Check
      if (inputNameNorm && inputNameNorm.length >= 3 && currentAccId) {
        const cNameNorm = (c.name || [c.firstName, c.lastName].filter(Boolean).join(' ')).trim().toLowerCase();
        if (cNameNorm === inputNameNorm && c.accountId === currentAccId) {
          matches.push({ contact: c, matchReason: `Same name in this account (${c.accountName || 'Account'})` });
          return;
        }
      }
    });

    return matches;
  }, [formData.mobile, formData.email, formData.name, formData.accountId, contacts, editingContact]);

  // Helpers
  const getContactName = (con: CRMContact) => {
    const raw = (con.name || [con.firstName, con.lastName].filter(Boolean).join(' ') || '').trim();
    if (!raw) return 'Unnamed Contact';
    if (con.salutation && con.salutation.trim() && !raw.toLowerCase().startsWith(con.salutation.toLowerCase())) {
      return `${con.salutation.trim()} ${raw}`;
    }
    return raw;
  };

  const getContactInitials = (con: CRMContact) => {
    const name = getContactName(con);
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'CT';
  };

  const getContactResolvedAddress = (con: CRMContact) => {
    const isIndependent = !con.accountId || con.accountId === 'INDEPENDENT';
    if (isIndependent || con.hasAlternativeAddress) {
      return {
        address: con.address || '',
        city: con.city || '',
        state: con.state || '',
        pincode: con.pincode || '',
        country: con.country || 'India',
        isFromAccount: false,
        accountName: ''
      };
    }
    const acc = accounts.find(a => a.id === con.accountId);
    if (acc) {
      return {
        address: acc.address || '',
        city: acc.billingCity || '',
        state: acc.billingState || '',
        pincode: acc.pincode || '',
        country: acc.country || acc.billingCountry || 'India',
        isFromAccount: true,
        accountName: acc.name
      };
    }
    return {
      address: con.address || '',
      city: con.city || '',
      state: con.state || '',
      pincode: con.pincode || '',
      country: con.country || 'India',
      isFromAccount: false,
      accountName: ''
    };
  };

  const getContactLocation = (con: CRMContact) => {
    const resolved = getContactResolvedAddress(con);
    if (resolved.city && resolved.city.trim()) {
      return [resolved.city.trim(), resolved.state?.trim()].filter(Boolean).join(', ');
    }
    return '—';
  };

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'INACTIVE': return 'Inactive';
      case 'LEFT_COMPANY': return 'Left Company';
      case 'DO_NOT_CONTACT': return 'Do Not Contact';
      default: return 'Active';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
      case 'INACTIVE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Inactive</span>;
      case 'LEFT_COMPANY':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Left Company</span>;
      case 'DO_NOT_CONTACT':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Do Not Contact</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
    }
  };

  // ==================== UNIQUE FILTER OPTIONS ====================
  const availableAccounts = useMemo(() => {
    const list: { id: string; name: string }[] = [{ id: 'INDEPENDENT', name: '-- Independent --' }];
    accounts.forEach(a => {
      if (a.id && a.name) {
        list.push({ id: a.id, name: a.name });
      }
    });
    return list;
  }, [accounts]);

  const availableStatuses = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'LEFT_COMPANY', label: 'Left Company' },
    { value: 'DO_NOT_CONTACT', label: 'Do Not Contact' }
  ];

  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach(c => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
      else if (c.accountId && c.accountId !== 'INDEPENDENT') {
        const acc = accounts.find(a => a.id === c.accountId);
        if (acc?.billingCity && acc.billingCity.trim()) set.add(acc.billingCity.trim());
      }
    });
    return Array.from(set).sort();
  }, [contacts, accounts]);

  const availableOwners = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach(c => {
      if (c.assignedTo && c.assignedTo.trim()) {
        set.add(c.assignedTo.trim());
      }
    });
    availableUsersList.forEach(u => {
      const name = u.fullName || u.username;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [contacts, availableUsersList]);

  // ==================== FILTERING CALCULATION ====================
  const filteredContacts = useMemo(() => {
    return contacts.filter(con => {
      // 1. Account Filter
      if (filterAccounts.length > 0) {
        const isIndependent = !con.accountId || con.accountId === 'INDEPENDENT';
        const match = filterAccounts.some(accId => {
          if (accId === 'INDEPENDENT') return isIndependent;
          return con.accountId === accId;
        });
        if (!match) return false;
      }

      // 2. Status Filter
      if (filterStatus.length > 0) {
        const status = con.status || 'ACTIVE';
        if (!filterStatus.includes(status)) return false;
      }

      // 3. Location Filter
      if (filterLocation.length > 0) {
        let loc = con.city?.trim() || '';
        if (!loc && con.accountId && con.accountId !== 'INDEPENDENT') {
          const acc = accounts.find(a => a.id === con.accountId);
          loc = acc?.billingCity?.trim() || '';
        }
        if (!loc || !filterLocation.includes(loc)) return false;
      }

      // 4. Contact Owner Filter
      if (filterOwner.length > 0) {
        const owner = con.assignedTo || 'Admin Operator';
        if (!filterOwner.includes(owner)) return false;
      }

      return true;
    });
  }, [contacts, accounts, filterAccounts, filterStatus, filterLocation, filterOwner]);

  const isFilterActive = 
    filterAccounts.length > 0 || 
    filterStatus.length > 0 || 
    filterLocation.length > 0 || 
    filterOwner.length > 0;

  const handleResetFilters = () => {
    setFilterAccounts([]);
    setFilterStatus([]);
    setFilterLocation([]);
    setFilterOwner([]);
    setCurrentPage(1);
  };

  // Pagination
  const totalItems = filteredContacts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedContacts = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredContacts.slice(startIndex, startIndex + pageSize);
  }, [filteredContacts, validCurrentPage, pageSize]);

  // ==================== FORM HANDLERS ====================
  const resetForm = () => {
    setFormData({
      salutation: '',
      name: '',
      email: '',
      mobile: '',
      altMobile: '',
      accountId: '',
      accountName: '',
      designation: '',
      department: '',
      isPrimary: false,
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
    setEditingContact(null);
    setDismissDuplicateContactWarning(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (con: CRMContact) => {
    if (!canEdit) return;
    setEditingContact(con);
    setDismissDuplicateContactWarning(false);
    const rawName = (con.name || [con.firstName, con.lastName].filter(Boolean).join(' ') || '').trim();
    let cleanName = rawName;
    const sal = con.salutation || '';
    if (sal && cleanName.toLowerCase().startsWith(sal.toLowerCase())) {
      cleanName = cleanName.slice(sal.length).trim();
    }
    const currentAccId = con.accountId && con.accountId !== 'INDEPENDENT' ? con.accountId : 'INDEPENDENT';
    const isIndep = currentAccId === 'INDEPENDENT';
    const hasAltAddr = !isIndep && Boolean(con.hasAlternativeAddress);
    setFormData({
      salutation: sal,
      name: cleanName,
      email: con.email || '',
      mobile: con.mobile || con.phone || '',
      altMobile: con.altMobile || '',
      accountId: currentAccId,
      accountName: con.accountName || '',
      designation: con.designation || '',
      department: con.department || '',
      isPrimary: !!con.isPrimary,
      hasAlternativeAddress: hasAltAddr,
      address: con.address || '',
      city: con.city || '',
      state: con.state || '',
      pincode: con.pincode || '',
      country: con.country || 'India',
      status: (con.status as ContactStatus) || 'ACTIVE',
      assignedTo: con.assignedTo || currentUser.fullName || currentUser.username,
      notes: con.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleStatusSelect = (contact: CRMContact, newStatus: ContactStatus) => {
    if (contact.status === newStatus) return;
    setStatusChangePrompt({
      contact,
      newStatus,
      oldStatus: contact.status || 'ACTIVE'
    });
  };

  const confirmStatusChange = async () => {
    if (!statusChangePrompt) return;
    const { contact, newStatus, oldStatus } = statusChangePrompt;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const actor = currentUser.fullName || currentUser.username || 'User';
      const oldStatusLabel = getStatusDisplay(oldStatus);
      const newStatusLabel = getStatusDisplay(newStatus);

      const newHistoryEntry: AccountEditHistoryEntry = {
        timestamp: now,
        changedBy: actor,
        action: 'STATUS_CHANGED',
        oldStatus,
        newStatus,
        details: `Changed contact status from "${oldStatusLabel}" to "${newStatusLabel}"`,
        changes: [
          { field: 'Contact Status', oldValue: oldStatusLabel, newValue: newStatusLabel }
        ]
      };

      const updatedHistory = contact.editHistory ? [newHistoryEntry, ...contact.editHistory] : [newHistoryEntry];

      const updatedContact: CRMContact = {
        ...contact,
        status: newStatus,
        updatedAt: now,
        editHistory: updatedHistory
      };

      await onUpdateContact(updatedContact);

      if (viewingContact && viewingContact.id === contact.id) {
        setViewingContact(updatedContact);
      }

      setStatusChangePrompt(null);
    } catch (err) {
      console.error('Error changing contact status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const contactName = formData.name.trim();
    const mobile = formData.mobile.trim();
    const accountId = formData.accountId;

    if (!formData.salutation.trim() || !contactName || !mobile || !accountId) return;

    const isIndependent = accountId === 'INDEPENDENT' || !accountId;
    if (isIndependent) {
      if (
        !formData.address.trim() ||
        !formData.city.trim() ||
        !formData.state.trim() ||
        !formData.pincode.trim() ||
        !formData.country.trim()
      ) {
        return;
      }
    }

    const payloadOwner = isAdmin ? formData.assignedTo : (currentUser.fullName || currentUser.username);

    setIsSaving(true);
    try {
      const isIndependent = accountId === 'INDEPENDENT' || !accountId;
      const selectedAcc = isIndependent ? null : accounts.find(a => a.id === accountId);
      const accName = selectedAcc ? selectedAcc.name : '';
      const hasAlt = !isIndependent && Boolean(formData.hasAlternativeAddress);

      const payload = {
        ...formData,
        salutation: formData.salutation.trim() || undefined,
        name: contactName,
        firstName: contactName,
        lastName: '',
        accountId: isIndependent ? 'INDEPENDENT' : accountId,
        accountName: accName,
        address: isIndependent || hasAlt ? formData.address : '',
        city: isIndependent || hasAlt ? formData.city : '',
        state: isIndependent || hasAlt ? formData.state : '',
        pincode: isIndependent || hasAlt ? formData.pincode : '',
        country: isIndependent || hasAlt ? (formData.country || 'India') : 'India',
        hasAlternativeAddress: hasAlt,
        isPrimary: isIndependent ? false : formData.isPrimary,
        assignedTo: payloadOwner
      };

      const now = new Date().toISOString();
      const actor = currentUser.fullName || currentUser.username || 'User';

      if (editingContact) {
        const changes: { field: string; oldValue: string; newValue: string }[] = [];

        if ((editingContact.salutation || '').trim() !== formData.salutation.trim()) {
          changes.push({ field: 'Salutation', oldValue: editingContact.salutation || '(None)', newValue: formData.salutation || '(None)' });
        }

        const oldName = (editingContact.name || [editingContact.firstName, editingContact.lastName].filter(Boolean).join(' ') || '').trim();
        const newName = contactName;
        if (oldName !== newName) {
          changes.push({ field: 'Full Name', oldValue: oldName || '(Blank)', newValue: newName });
        }

        const oldAccDisplay = editingContact.accountName || (editingContact.accountId === 'INDEPENDENT' || !editingContact.accountId ? 'Independent' : editingContact.accountId);
        const newAccDisplay = isIndependent ? 'Independent' : (accName || accountId);
        if (oldAccDisplay !== newAccDisplay) {
          changes.push({ field: 'Associated Account', oldValue: oldAccDisplay, newValue: newAccDisplay });
        }

        if ((editingContact.status || 'ACTIVE') !== formData.status) {
          changes.push({ field: 'Contact Status', oldValue: getStatusDisplay(editingContact.status || 'ACTIVE'), newValue: getStatusDisplay(formData.status) });
        }

        if ((editingContact.email || '').trim() !== formData.email.trim()) {
          changes.push({ field: 'Official Email', oldValue: editingContact.email || '(Blank)', newValue: formData.email.trim() || '(Blank)' });
        }

        const oldMobile = (editingContact.mobile || editingContact.phone || '').trim();
        if (oldMobile !== mobile) {
          changes.push({ field: 'Mobile Number', oldValue: oldMobile || '(Blank)', newValue: mobile });
        }

        if ((editingContact.altMobile || '').trim() !== formData.altMobile.trim()) {
          changes.push({ field: 'Alternative Mobile', oldValue: editingContact.altMobile || '(Blank)', newValue: formData.altMobile.trim() || '(Blank)' });
        }

        if ((editingContact.assignedTo || '').trim() !== (payloadOwner || '').trim()) {
          changes.push({ field: 'Contact Owner', oldValue: editingContact.assignedTo || '(Blank)', newValue: payloadOwner || '(Blank)' });
        }

        if ((editingContact.department || '').trim() !== formData.department.trim()) {
          changes.push({ field: 'Department', oldValue: editingContact.department || '(Blank)', newValue: formData.department.trim() || '(Blank)' });
        }

        if ((editingContact.designation || '').trim() !== formData.designation.trim()) {
          changes.push({ field: 'Job Designation', oldValue: editingContact.designation || '(Blank)', newValue: formData.designation.trim() || '(Blank)' });
        }

        const oldIsPrimary = Boolean(editingContact.isPrimary);
        const newIsPrimary = Boolean(payload.isPrimary);
        if (oldIsPrimary !== newIsPrimary) {
          changes.push({ field: 'Primary Key Contact', oldValue: oldIsPrimary ? 'Yes' : 'No', newValue: newIsPrimary ? 'Yes' : 'No' });
        }

        const oldHasAlt = Boolean(editingContact.hasAlternativeAddress);
        const newHasAlt = Boolean(payload.hasAlternativeAddress);
        if (oldHasAlt !== newHasAlt && !isIndependent) {
          changes.push({ field: 'Alternative Address', oldValue: oldHasAlt ? 'Enabled' : 'Disabled', newValue: newHasAlt ? 'Enabled' : 'Disabled' });
        }

        if (isIndependent || hasAlt || oldHasAlt) {
          if ((editingContact.address || '').trim() !== (payload.address || '').trim()) {
            changes.push({ field: 'Street Address', oldValue: editingContact.address || '(Blank)', newValue: payload.address || '(Blank)' });
          }
          if ((editingContact.city || '').trim() !== (payload.city || '').trim()) {
            changes.push({ field: 'City', oldValue: editingContact.city || '(Blank)', newValue: payload.city || '(Blank)' });
          }
          if ((editingContact.state || '').trim() !== (payload.state || '').trim()) {
            changes.push({ field: 'State', oldValue: editingContact.state || '(Blank)', newValue: payload.state || '(Blank)' });
          }
          if ((editingContact.pincode || '').trim() !== (payload.pincode || '').trim()) {
            changes.push({ field: 'Pin Code', oldValue: editingContact.pincode || '(Blank)', newValue: payload.pincode || '(Blank)' });
          }
          if ((editingContact.country || 'India').trim() !== (payload.country || 'India').trim()) {
            changes.push({ field: 'Country', oldValue: editingContact.country || 'India', newValue: payload.country || 'India' });
          }
        }

        if ((editingContact.notes || '').trim() !== formData.notes.trim()) {
          changes.push({ field: 'Notes', oldValue: editingContact.notes || '(Blank)', newValue: formData.notes.trim() || '(Blank)' });
        }

        const detailsText = changes.length > 0
          ? `Updated ${changes.length} field${changes.length > 1 ? 's' : ''}: ${changes.map(c => c.field).join(', ')}`
          : 'Contact profile saved without modifications';

        const newHistoryEntry: AccountEditHistoryEntry = {
          timestamp: now,
          changedBy: actor,
          action: 'UPDATED',
          details: detailsText,
          changes: changes.length > 0 ? changes : undefined
        };
        const updatedHistory = editingContact.editHistory ? [newHistoryEntry, ...editingContact.editHistory] : [newHistoryEntry];

        const updatedContact: CRMContact = {
          ...editingContact,
          ...payload,
          updatedAt: now,
          editHistory: updatedHistory
        };

        await onUpdateContact(updatedContact);

        if (viewingContact && viewingContact.id === editingContact.id) {
          setViewingContact(updatedContact);
        }
      } else {
        const statusLabel = getStatusDisplay(formData.status);
        const newHistoryEntry: AccountEditHistoryEntry = {
          timestamp: now,
          changedBy: actor,
          action: 'CREATED',
          details: `Contact created with status "${statusLabel}"`
        };

        await onAddContact({
          ...payload,
          editHistory: [newHistoryEntry]
        });
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving contact:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      await onDeleteContact(id);
      setDeletingContactId(null);
      if (viewingContact && viewingContact.id === id) {
        setViewingContact(null);
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== EXPORT REPORT HANDLERS (EXACTLY MATCHING CRM ACCOUNTS MODULE) ====================
  const handleExportCSV = () => {
    const headers = [
      'Contact ID',
      'Full Name',
      'Associated Account',
      'Mobile Number',
      'Alternative Mobile',
      'Official Email',
      'Location / City',
      'State',
      'Country',
      'Street Address',
      'Pin Code',
      'Contact Status',
      'Contact Owner',
      'Designation',
      'Department',
      'Primary Contact',
      'Created Date (IST)',
      'Notes'
    ];

    const rows = filteredContacts.map(c => {
      const resolvedAddr = getContactResolvedAddress(c);
      return [
        `"${c.id}"`,
        `"${getContactName(c).replace(/"/g, '""')}"`,
        `"${(c.accountName || (c.accountId === 'INDEPENDENT' ? 'Independent' : '')).replace(/"/g, '""')}"`,
        `"${(c.mobile || c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.altMobile || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${getContactLocation(c).replace(/"/g, '""')}"`,
        `"${(resolvedAddr.state || '').replace(/"/g, '""')}"`,
        `"${(resolvedAddr.country || 'India').replace(/"/g, '""')}"`,
        `"${(resolvedAddr.address || '').replace(/"/g, '""')}"`,
        `"${(resolvedAddr.pincode || '').replace(/"/g, '""')}"`,
        `"${getStatusDisplay(c.status)}"`,
        `"${(c.assignedTo || '—').replace(/"/g, '""')}"`,
        `"${(c.designation || '').replace(/"/g, '""')}"`,
        `"${(c.department || '').replace(/"/g, '""')}"`,
        `"${c.isPrimary ? 'Yes' : 'No'}"`,
        `"${formatCRMIDate(c.createdAt)}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `crm_contacts_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    const rowsHTML = filteredContacts.map(c => {
      const resolvedAddr = getContactResolvedAddress(c);
      return `
      <tr>
        <td style="font-family: monospace; font-weight: bold;">${c.id}</td>
        <td style="font-weight: bold;">${getContactName(c)}</td>
        <td>${c.accountName || (c.accountId === 'INDEPENDENT' ? 'Independent' : '—')}</td>
        <td>${c.mobile || c.phone || ''}</td>
        <td>${c.altMobile || ''}</td>
        <td>${c.email || ''}</td>
        <td>${getContactLocation(c)}</td>
        <td>${resolvedAddr.state || ''}</td>
        <td>${resolvedAddr.country || 'India'}</td>
        <td>${resolvedAddr.address || ''}</td>
        <td>${resolvedAddr.pincode || ''}</td>
        <td style="font-weight: bold;">${getStatusDisplay(c.status)}</td>
        <td>${c.assignedTo || '—'}</td>
        <td>${c.designation || ''}</td>
        <td>${c.department || ''}</td>
        <td>${c.isPrimary ? 'Yes' : 'No'}</td>
        <td>${formatCRMIDate(c.createdAt)}</td>
        <td>${(c.notes || '').replace(/</g, '&lt;')}</td>
      </tr>
    `;
    }).join('');

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
                <th>Full Name</th>
                <th>Associated Account</th>
                <th>Mobile Number</th>
                <th>Alternative Mobile</th>
                <th>Email</th>
                <th>Location</th>
                <th>State</th>
                <th>Country</th>
                <th>Address</th>
                <th>Pin code</th>
                <th>Status</th>
                <th>Contact Owner</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Primary Contact</th>
                <th>Created Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `crm_contacts_report_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHTML = filteredContacts.map(c => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
        <td style="padding: 6px; font-family: monospace; font-weight: bold; white-space: nowrap;">${c.id}</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">
          ${getContactName(c)}
          ${c.isPrimary ? '<span style="color: #f59e0b; font-size: 9px; margin-left: 4px;">★ Primary</span>' : ''}
          ${c.designation ? `<div style="font-size: 8.5px; color: #64748b; font-weight: normal;">${c.designation}</div>` : ''}
        </td>
        <td style="padding: 6px; color: #334155;">${c.accountName || (c.accountId === 'INDEPENDENT' ? 'Independent' : '—')}</td>
        <td style="padding: 6px; white-space: nowrap;">${getContactLocation(c)}</td>
        <td style="padding: 6px; white-space: nowrap; font-family: monospace;">${c.mobile || c.phone || '—'}</td>
        <td style="padding: 6px; font-family: monospace; color: #475569;">${c.email || '—'}</td>
        <td style="padding: 6px; text-align: center; white-space: nowrap;">
          <span style="background-color: ${c.status === 'ACTIVE' ? '#dcfce7' : c.status === 'INACTIVE' ? '#f1f5f9' : c.status === 'LEFT_COMPANY' ? '#fef3c7' : '#fee2e2'}; color: ${c.status === 'ACTIVE' ? '#166534' : c.status === 'INACTIVE' ? '#475569' : c.status === 'LEFT_COMPANY' ? '#92400e' : '#991b1b'}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">
            ${getStatusDisplay(c.status)}
          </span>
        </td>
        <td style="padding: 6px; color: #475569; white-space: nowrap;">${c.assignedTo || '—'}</td>
      </tr>
    `).join('');

    const nowIST = formatCRMIDateTime(new Date().toISOString());

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CRM Contact Directory Report</title>
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
              <h2 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 800;">CRM Contact Directory Report</h2>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">Generated on: ${nowIST} (IST) | Total Filtered Contacts: <strong>${filteredContacts.length}</strong></p>
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
                <th style="width: 80px;">ID</th>
                <th>Name</th>
                <th>Account</th>
                <th>Location</th>
                <th>Mobile</th>
                <th>Email</th>
                <th style="text-align: center;">Status</th>
                <th>Contact Owner</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #475569; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div><strong>Generated On:</strong> ${nowIST} (IST)</div>
            </div>
            <div>
              <strong>Generated By:</strong> ${currentUser.fullName || currentUser.username}
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Contact Directory
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredContacts.length} of {contacts.length} registered contacts
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Export Report Dropdown */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 transition-all text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Report</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
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

          {/* New Contact Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-extrabold shadow-xs hover:bg-[#e5aa3b] transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Contact
          </button>
        </div>
      </div>

      {/* 2. MULTI-SELECT FILTERS TOOLBAR (Account, Status, Location, Contact Owner) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters:</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full flex-1">
            
            {/* Filter 1: Account */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'account' ? null : 'account')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterAccounts.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterAccounts.length === 0
                    ? 'All Accounts'
                    : filterAccounts.length === 1
                    ? availableAccounts.find(a => a.id === filterAccounts[0])?.name || '1 Account'
                    : `${filterAccounts.length} Accounts`}
                </span>
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
                          onClick={() => setFilterAccounts(availableAccounts.map(a => a.id))}
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
                      {availableAccounts
                        .filter(a => a.name.toLowerCase().includes(searchAccountFilter.toLowerCase()))
                        .map(acc => {
                          const isChecked = filterAccounts.includes(acc.id);
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
                                    prev.includes(acc.id) ? prev.filter(x => x !== acc.id) : [...prev, acc.id]
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

            {/* Filter 2: Status */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterStatus.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterStatus.length === 0
                    ? 'All Statuses'
                    : filterStatus.length === 1
                    ? availableStatuses.find(s => s.value === filterStatus[0])?.label || '1 Status'
                    : `${filterStatus.length} Statuses`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'status' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Status</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterStatus(availableStatuses.map(s => s.value))}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterStatus([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {availableStatuses.map(st => {
                        const isChecked = filterStatus.includes(st.value);
                        return (
                          <label
                            key={st.value}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setFilterStatus(prev => 
                                  prev.includes(st.value) ? prev.filter(x => x !== st.value) : [...prev, st.value]
                                );
                                setCurrentPage(1);
                              }}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                            />
                            <span className="truncate">{st.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter 3: Location */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'location' ? null : 'location')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterLocation.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterLocation.length === 0
                    ? 'All Locations'
                    : filterLocation.length === 1
                    ? filterLocation[0]
                    : `${filterLocation.length} Locations`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'location' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Location</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterLocation([...availableLocations])}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterLocation([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search locations..."
                      value={searchLocationFilter}
                      onChange={e => setSearchLocationFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {availableLocations.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">No locations recorded</p>
                      ) : (
                        availableLocations
                          .filter(l => l.toLowerCase().includes(searchLocationFilter.toLowerCase()))
                          .map((loc, idx) => {
                            const isChecked = filterLocation.includes(loc);
                            return (
                              <label
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setFilterLocation(prev => 
                                      prev.includes(loc) ? prev.filter(x => x !== loc) : [...prev, loc]
                                    );
                                    setCurrentPage(1);
                                  }}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                                />
                                <span className="truncate">{loc}</span>
                              </label>
                            );
                          })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter 4: Contact Owner */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'owner' ? null : 'owner')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterOwner.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterOwner.length === 0
                    ? 'All Contact Owners'
                    : filterOwner.length === 1
                    ? filterOwner[0]
                    : `${filterOwner.length} Owners`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'owner' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Contact Owner</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterOwner([...availableOwners])}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterOwner([])}
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
                      {availableOwners.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">No contact owners recorded</p>
                      ) : (
                        availableOwners
                          .filter(o => o.toLowerCase().includes(searchOwnerFilter.toLowerCase()))
                          .map((owner, idx) => {
                            const isChecked = filterOwner.includes(owner);
                            return (
                              <label
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setFilterOwner(prev => 
                                      prev.includes(owner) ? prev.filter(x => x !== owner) : [...prev, owner]
                                    );
                                    setCurrentPage(1);
                                  }}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                                />
                                <span className="truncate">{owner}</span>
                              </label>
                            );
                          })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Reset Filters */}
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] md:text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. CONTACTS DATA TABLE & RESPONSIVE LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10.5px] tracking-wider">
                <th className="py-3 px-4 font-bold">ID</th>
                <th className="py-3 px-4 font-bold">Name</th>
                <th className="py-3 px-4 font-bold">Account</th>
                <th className="py-3 px-4 font-bold">Location</th>
                <th className="py-3 px-4 font-bold">Contacts</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Contact Owner</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContacts.map(con => {
                const contactName = getContactName(con);
                const initials = getContactInitials(con);
                const locationStr = getContactLocation(con);
                const isIndependent = !con.accountId || con.accountId === 'INDEPENDENT';

                return (
                  <tr key={con.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* 1. ID Column (Clickable to view details & audit history) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingContact(con);
                          setShowContactHistory(true);
                        }}
                        className="font-mono font-extrabold text-blue-600 hover:text-blue-800 hover:underline text-[11px] cursor-pointer text-left focus:outline-none"
                        title="Click to view full details & edit history"
                      >
                        {con.id}
                      </button>
                    </td>

                    {/* 2. Name Column */}
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="flex items-center gap-2.5">
                        <div 
                          onClick={() => {
                            setViewingContact(con);
                            setShowContactHistory(false);
                          }}
                          className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-xs text-amber-800 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p 
                              onClick={() => {
                                setViewingContact(con);
                                setShowContactHistory(false);
                              }}
                              className="font-extrabold text-slate-900 text-xs truncate cursor-pointer hover:text-blue-600 transition-colors"
                            >
                              {contactName}
                            </p>
                            {con.isPrimary && !isIndependent && (
                              <span className="p-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0" title="Primary Key Contact for this Account">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              </span>
                            )}
                          </div>
                          {con.designation && (
                            <span className="text-[10px] text-slate-400 truncate block">
                              {con.designation}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Account Column */}
                    <td className="py-3.5 px-4 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={`font-semibold text-xs ${isIndependent ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                          {con.accountName || (isIndependent ? 'Independent' : '—')}
                        </span>
                      </div>
                    </td>

                    {/* 4. Location Column */}
                    <td className="py-3.5 px-4 min-w-[130px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-xs text-slate-700">
                          {locationStr}
                        </span>
                      </div>
                    </td>

                    {/* 5. Contacts Column */}
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="space-y-1">
                        {con.email && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px] truncate max-w-[170px]" title={con.email}>
                              {con.email}
                            </span>
                          </div>
                        )}
                        {(con.mobile || con.phone) && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px]">
                              {con.mobile || con.phone}
                            </span>
                          </div>
                        )}
                        {con.altMobile && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone className="w-3 h-3 text-slate-300 shrink-0" />
                            <span className="font-mono text-[10px]">
                              {con.altMobile}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 6. Status Column (Editable inline dropdown for everyone) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="relative inline-block">
                        <select
                          value={con.status || 'ACTIVE'}
                          onChange={e => handleStatusSelect(con, e.target.value as ContactStatus)}
                          className={`appearance-none pl-2.5 pr-6 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer focus:outline-hidden ${
                            con.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
                              : con.status === 'INACTIVE'
                              ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                              : con.status === 'LEFT_COMPANY'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'
                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/70'
                          }`}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="LEFT_COMPANY">Left Company</option>
                          <option value="DO_NOT_CONTACT">Do Not Contact</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>

                    {/* 7. Contact Owner Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{con.assignedTo || 'Admin Operator'}</span>
                      </div>
                    </td>

                    {/* 8. Actions Column */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingContact(con);
                            setShowContactHistory(false);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(con)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit Contact"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeletingContactId(con.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (Visible on screens < md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedContacts.length > 0 ? (
            paginatedContacts.map(con => {
              const contactName = getContactName(con);
              const initials = getContactInitials(con);
              const locationStr = getContactLocation(con);
              const isIndependent = !con.accountId || con.accountId === 'INDEPENDENT';

              return (
                <div key={con.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  {/* Top Row: Contact ID & Status Selector */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingContact(con);
                        setShowContactHistory(true);
                      }}
                      className="font-mono font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-xs border border-blue-100 cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Click to view full details & edit history"
                    >
                      <span>{con.id}</span>
                    </button>

                    <div className="relative inline-block">
                      <select
                        value={con.status || 'ACTIVE'}
                        onChange={e => handleStatusSelect(con, e.target.value as ContactStatus)}
                        className={`appearance-none pl-2.5 pr-6 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer focus:outline-none ${
                          con.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : con.status === 'LEFT_COMPANY'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : con.status === 'DO_NOT_CONTACT'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="LEFT_COMPANY">Left Company</option>
                        <option value="DO_NOT_CONTACT">Do Not Contact</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>
                  </div>

                  {/* Contact Name & Designation */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 
                        onClick={() => {
                          setViewingContact(con);
                          setShowContactHistory(false);
                        }}
                        className="font-extrabold text-slate-900 text-sm cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {contactName}
                      </h4>
                      {con.isPrimary && !isIndependent && (
                        <span className="p-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0" title="Primary Key Contact">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        </span>
                      )}
                    </div>
                    {con.designation && (
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                        {con.designation}
                      </span>
                    )}
                  </div>

                  {/* Info Grid: Account, Phone, Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{con.accountName || (isIndependent ? 'Independent' : '—')}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {(con.mobile || con.phone) ? (
                        <a href={`tel:${con.mobile || con.phone}`} className="hover:underline text-slate-700 font-medium truncate">
                          {con.mobile || con.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {locationStr || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Assigned Owner & Action Buttons */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
                    <div className="text-[11px] text-slate-500 truncate flex-1 min-w-0">
                      Owner: <span className="font-semibold text-slate-800">{con.assignedTo || 'Unassigned'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingContact(con);
                          setShowContactHistory(false);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(con)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg transition-all cursor-pointer"
                          title="Edit Contact"
                        >
                          <Pencil className="w-4 h-4 text-amber-600" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeletingContactId(con.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg transition-all cursor-pointer"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : null}
        </div>

        {/* Empty State */}
        {filteredContacts.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-extrabold text-slate-700">No contacts found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isFilterActive 
                ? 'Try resetting the filters above to see more contacts.' 
                : 'Add stakeholder contacts associated with your enterprise accounts or independent contacts.'}
            </p>
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination Bar (Max 10 contacts per page) */}
        {filteredContacts.length > 0 && (
          <div className="px-4 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-[11px] font-bold text-slate-500">
              Showing {(validCurrentPage - 1) * pageSize + 1} to {Math.min(validCurrentPage * pageSize, totalItems)} of {totalItems} contacts
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-bold flex items-center gap-1 shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                  const isActive = pageNum === validCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#f7b944] text-slate-950 shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-bold flex items-center gap-1 shadow-2xs"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. STATUS CHANGE CONFIRMATION MODAL */}
      <AnimatePresence>
        {statusChangePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatusChangePrompt(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-900">Change Contact Status?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to change the lifecycle status for{' '}
                  <strong className="text-slate-800">
                    {getContactName(statusChangePrompt.contact)} ({statusChangePrompt.contact.id})
                  </strong>.
                </p>
              </div>

              {/* Status Transition Badges */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-center gap-3">
                <span className="text-xs font-bold text-slate-500">
                  {getStatusBadge(statusChangePrompt.oldStatus)}
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span className="text-xs font-bold">
                  {getStatusBadge(statusChangePrompt.newStatus)}
                </span>
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 text-left">
                <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                  <strong>Audit Record:</strong> This status change will be recorded in the contact edit & activity history along with your username and timestamp (IST).
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusChangePrompt(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmStatusChange}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold hover:bg-amber-600 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Updating...' : 'Confirm Change'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. VIEW CONTACT DETAILS & EDIT HISTORY MODAL */}
      <AnimatePresence>
        {viewingContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingContact(null)}
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center font-bold text-amber-900 text-sm">
                    {getContactInitials(viewingContact)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                        {getContactName(viewingContact)}
                      </h3>
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {viewingContact.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Created on {formatCRMIDateTime(viewingContact.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingContact(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs">
                
                {/* 1. Account & Status summary banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                      Associated Account
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-800 text-xs truncate">
                        {viewingContact.accountName || (!viewingContact.accountId || viewingContact.accountId === 'INDEPENDENT' ? 'Independent Contact' : viewingContact.accountId)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                      Lifecycle Status
                    </span>
                    <div className="mt-0.5">
                      {getStatusBadge(viewingContact.status)}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                      Key Stakeholder
                    </span>
                    <div className="mt-0.5">
                      {viewingContact.isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10.5px] font-bold border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          Primary Key Contact
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold text-xs">Regular Contact</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Designation & Department */}
                {(viewingContact.department || viewingContact.designation) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Department</span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                        {viewingContact.department || '—'}
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Job Designation</span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                        {viewingContact.designation || '—'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. Communication Details */}
                <div className="border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Contact & Communication
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Official Email</span>
                      <span className="font-mono text-xs font-semibold text-slate-800 break-all block mt-0.5">
                        {viewingContact.email || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Mobile Number</span>
                      <span className="font-mono text-xs font-semibold text-slate-800 block mt-0.5">
                        {viewingContact.mobile || viewingContact.phone || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Alternative Mobile</span>
                      <span className="font-mono text-xs font-semibold text-slate-800 block mt-0.5">
                        {viewingContact.altMobile || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Address & Location */}
                {(() => {
                  const resolved = getContactResolvedAddress(viewingContact);
                  return (
                    <div className="border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Address & Location
                        </span>
                        {viewingContact.hasAlternativeAddress ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md font-bold">
                            Alternative Contact Address
                          </span>
                        ) : resolved.isFromAccount ? (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md font-bold">
                            Account Default Address ({resolved.accountName || 'Account'})
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold">
                            Independent Address
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {resolved.address ? (
                          <p className="text-slate-800 font-medium text-xs">
                            {resolved.address}
                          </p>
                        ) : (
                          <p className="text-slate-400 font-medium text-xs italic">
                            No street address recorded
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-xs">
                          <span><strong>City:</strong> {resolved.city || '—'}</span>
                          <span><strong>State:</strong> {resolved.state || '—'}</span>
                          <span><strong>Pin code:</strong> {resolved.pincode || '—'}</span>
                          <span><strong>Country:</strong> {resolved.country || 'India'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Contact Owner & Updates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Contact Owner</span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                      {viewingContact.assignedTo || 'Admin Operator'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Last Updated</span>
                    <span className="font-mono font-semibold text-slate-700 text-xs mt-0.5 block">
                      {viewingContact.updatedAt ? formatCRMIDateTime(viewingContact.updatedAt) : 'Never modified'}
                    </span>
                  </div>
                </div>

                {/* 6. Notes / Preferences */}
                {viewingContact.notes && (
                  <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-2xl">
                    <span className="text-[10px] text-amber-900 font-black uppercase tracking-wider block mb-1">
                      Notes / Preferences
                    </span>
                    <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {viewingContact.notes}
                    </p>
                  </div>
                )}

                {/* 7. EDIT HISTORY & AUDIT TRAIL AT THE BOTTOM (Only shown when ID is clicked) */}
                {showContactHistory && (
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600">
                        <History className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                          Contact Edit & Activity History
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">All timestamps in IST</span>
                    </div>

                    {!viewingContact.editHistory || viewingContact.editHistory.length === 0 ? (
                      <div className="bg-slate-50 p-4 rounded-2xl text-center text-slate-400 border border-slate-100">
                        <span className="text-[11px] font-medium italic">
                          Original contact entry created on {formatCRMIDateTime(viewingContact.createdAt)} by {viewingContact.assignedTo || 'Admin'}. No edits or status changes have been performed yet.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
                        {viewingContact.editHistory.map((entry, eIdx) => (
                          <div key={eIdx} className="relative pl-5 border-l-2 border-indigo-100 py-0.5 text-[11px] sm:text-xs">
                            {/* Timeline dot */}
                            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white"></div>
                            
                            {/* Log Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] mb-1.5">
                              <span className="font-bold text-slate-800">
                                <span className={`inline-block mr-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                                  entry.action === 'CREATED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : entry.action === 'STATUS_CHANGED'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {entry.action.replace('_', ' ')}
                                </span>
                                by <span className="text-indigo-600 font-semibold">{entry.changedBy}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono font-semibold">
                                {formatCRMIDateTime(entry.timestamp)}
                              </span>
                            </div>

                            {/* Details Box / Granular Changes (Matching Expense Module RegisterView) */}
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
                                  {entry.details || 'Contact details or status modified'}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const con = viewingContact;
                      setViewingContact(null);
                      handleOpenEdit(con);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Contact
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingContact(null)}
                  className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 transition-all text-xs ml-auto cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. ADD / EDIT CONTACT MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#f7b944]/20 border border-[#f7b944]/40 flex items-center justify-center text-amber-900">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {editingContact ? 'Edit Contact' : 'Create New Contact'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Fill in key stakeholder and representative profile details.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                
                {/* 1. Salutation & Full Name * */}
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Salutation *</label>
                    <select
                      required
                      value={formData.salutation}
                      onChange={e => setFormData({ ...formData, salutation: e.target.value })}
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
                      placeholder="e.g. Rajesh Kumar"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* 2. Associated Account * & Contact Status * */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Associated Account *</label>
                    <select
                      required
                      value={formData.accountId}
                      onChange={e => {
                        const val = e.target.value;
                        const isIndep = val === 'INDEPENDENT';
                        const acc = isIndep ? null : accounts.find(a => a.id === val);
                        setFormData({ 
                          ...formData, 
                          accountId: val,
                          accountName: isIndep ? 'Independent (Direct Sales)' : (acc ? acc.name : '')
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="" disabled>Choose the account</option>
                      <option value="INDEPENDENT">Independent (Direct Sales)</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Status *</label>
                    <select
                      required
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as ContactStatus })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="LEFT_COMPANY">Left Company</option>
                      <option value="DO_NOT_CONTACT">Do Not Contact</option>
                    </select>
                  </div>
                </div>

                {/* 3. Email Address & Mobile Number * (Next to each other) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="hello@oepl.com"
                      value={formData.email}
                      onChange={e => {
                        setFormData({ ...formData, email: e.target.value });
                        setDismissDuplicateContactWarning(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <CountryPhoneInput
                      id="con-mobile-number"
                      required
                      value={formData.mobile}
                      onChange={val => {
                        setFormData({ ...formData, mobile: val });
                        setDismissDuplicateContactWarning(false);
                      }}
                      placeholder="90259 76761"
                      defaultCountryCode={crmSettings?.defaultCountryCode || '+91'}
                      allowedCountryCodes={crmSettings?.allowedCountryCodes}
                      customCountryCodes={crmSettings?.customCountryCodes}
                      recentCountryCodes={crmSettings?.recentCountryCodes}
                    />
                  </div>
                </div>

                {/* Soft Warning Banner for Duplicate Contact Detection (10-digit / Email / Name) */}
                {!dismissDuplicateContactWarning && duplicateContactMatches.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start justify-between gap-2.5 text-xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-amber-900 text-xs">Potential Duplicate Contact Detected</p>
                        <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                          A contact <strong className="font-bold text-amber-950">"{getContactName(duplicateContactMatches[0].contact)}"</strong> ({duplicateContactMatches[0].contact.id} • {duplicateContactMatches[0].contact.accountName || 'Independent'} • {duplicateContactMatches[0].contact.mobile || duplicateContactMatches[0].contact.phone}) already exists with {duplicateContactMatches[0].matchReason.toLowerCase()}.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingContact(duplicateContactMatches[0].contact);
                          setIsAddModalOpen(false);
                        }}
                        className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                      >
                        View Contact
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissDuplicateContactWarning(true)}
                        className="p-1 text-amber-700 hover:text-amber-950 rounded-md cursor-pointer"
                        title="Dismiss warning"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Alternative Mobile Number & Contact Owner * (Next to each other) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Alternative Mobile Number</label>
                    <CountryPhoneInput
                      id="con-alt-mobile-number"
                      value={formData.altMobile}
                      onChange={val => setFormData({ ...formData, altMobile: val })}
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
                        value={formData.assignedTo}
                        onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors cursor-pointer"
                      >
                        <option value="">Select Contact Owner</option>
                        {formData.assignedTo && !availableUsersList.some(u => (u.fullName || u.username) === formData.assignedTo) && (
                          <option value={formData.assignedTo}>{formData.assignedTo}</option>
                        )}
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
                        placeholder="Assigned Staff / Representative"
                        value={formData.assignedTo}
                        className="w-full px-3.5 py-2.5 rounded-xl font-semibold text-slate-500 bg-slate-100/80 border border-slate-200 cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>

                {/* 5. Department & Job Designation (Next to each other) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="Supply Chain & Contracts"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Job Designation</label>
                    <input
                      type="text"
                      placeholder="Head of Procurement"
                      value={formData.designation}
                      onChange={e => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* 6. Primary Key Contact & Optional Alternative Address Option */}
                {formData.accountId && formData.accountId !== 'INDEPENDENT' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Primary Key Contact for this Account */}
                    <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="primaryKeyContactCheckbox"
                        checked={formData.isPrimary}
                        onChange={e => setFormData({ ...formData, isPrimary: e.target.checked })}
                        className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
                      />
                      <label htmlFor="primaryKeyContactCheckbox" className="font-bold text-slate-800 text-xs flex items-center gap-1.5 cursor-pointer select-none">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                        <span>Primary Key Contact for this Account</span>
                      </label>
                    </div>

                    {/* Do you require alternative address for this contact? */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5 hover:bg-slate-100/60 transition-colors">
                      <input
                        type="checkbox"
                        id="requireAltAddressCheckbox"
                        checked={formData.hasAlternativeAddress}
                        onChange={e => setFormData({ ...formData, hasAlternativeAddress: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
                      />
                      <label htmlFor="requireAltAddressCheckbox" className="font-bold text-slate-800 text-xs flex items-center gap-1.5 cursor-pointer select-none">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Do you require alternative address for this contact?</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="primaryKeyContactCheckbox"
                      checked={formData.isPrimary}
                      onChange={e => setFormData({ ...formData, isPrimary: e.target.checked })}
                      className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
                    />
                    <label htmlFor="primaryKeyContactCheckbox" className="font-bold text-slate-800 text-xs flex items-center gap-1.5 cursor-pointer select-none">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      <span>Primary Key Contact for this Account</span>
                    </label>
                  </div>
                )}

                {/* 7. Dynamic Optional Alternative Address Fields (When Alternative Address is checked for an Account) */}
                {formData.accountId && formData.accountId !== 'INDEPENDENT' && formData.hasAlternativeAddress && (
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

                    {/* Street Address */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="Specific Office, Branch, Site, Floor No, Street Address"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    {/* City, State, Pin code, Country */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">City</label>
                        <input
                          type="text"
                          placeholder="City / Location"
                          value={formData.city}
                          onChange={e => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">State</label>
                        <input
                          type="text"
                          placeholder="State"
                          value={formData.state}
                          onChange={e => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Pin code</label>
                        <input
                          type="text"
                          placeholder="Pin code"
                          value={formData.pincode}
                          onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Country</label>
                        <input
                          type="text"
                          placeholder="India"
                          value={formData.country}
                          onChange={e => setFormData({ ...formData, country: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 8. Dynamic Address Fields (Visible & Fully REQUIRED ONLY when Independent is selected) */}
                {formData.accountId === 'INDEPENDENT' && (
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

                    {/* Street Address */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        placeholder="Plot / Door No, Street, Landmark, Industrial Area"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    {/* City, State, Pin code, Country */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ariyalur"
                          value={formData.city}
                          onChange={e => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">State *</label>
                        <input
                          type="text"
                          required
                          placeholder="Tamil Nadu"
                          value={formData.state}
                          onChange={e => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Pin code *</label>
                        <input
                          type="text"
                          required
                          placeholder="621704"
                          value={formData.pincode}
                          onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Country *</label>
                        <input
                          type="text"
                          required
                          placeholder="India"
                          value={formData.country}
                          onChange={e => setFormData({ ...formData, country: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 9. Notes / Preferences */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Preferences</label>
                  <textarea
                    rows={2}
                    placeholder="Preferred contact hours, direct assistant contact..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Action Buttons */}
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
                    {isSaving ? 'Saving...' : editingContact ? 'Save Changes' : 'Create Contact'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingContactId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingContactId(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-10 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Delete Contact?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this contact from your database?
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingContactId(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deletingContactId)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 transition-all shadow-xs cursor-pointer"
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
