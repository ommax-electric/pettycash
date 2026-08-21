import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Plus, 
  Eye,
  Pencil, 
  Trash2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  X, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Briefcase,
  FileText,
  UserCheck,
  Filter,
  FileSpreadsheet,
  RotateCcw,
  Clock,
  History,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { 
  CRMAccount, 
  CRMSettings, 
  DEFAULT_CRM_SETTINGS, 
  AccountEditHistoryEntry,
  formatCRMIDate,
  formatCRMIDateTime,
  normalizeCompanyName,
  normalizePhoneNumber
} from '../../crm/types';
import { User, AppSettings } from '../../types';
import { MOCK_USERS } from '../../data';
import CountryPhoneInput from './CountryPhoneInput';

interface CRMAccountsViewProps {
  accounts: CRMAccount[];
  crmSettings: CRMSettings;
  currentUser: User;
  users?: User[];
  appSettings?: AppSettings;
  onAddAccount: (acc: Omit<CRMAccount, 'id' | 'createdAt'>) => Promise<CRMAccount | void>;
  onUpdateAccount: (acc: CRMAccount) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
}

export default function CRMAccountsView({
  accounts,
  crmSettings,
  currentUser,
  users = [],
  appSettings,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount
}: CRMAccountsViewProps) {
  const industriesList = crmSettings?.industries?.length ? crmSettings.industries : DEFAULT_CRM_SETTINGS.industries;
  const businessCategoriesList = crmSettings?.businessCategories?.length ? crmSettings.businessCategories : DEFAULT_CRM_SETTINGS.businessCategories;

  // Available Users List for Admin Assignment
  const availableUsersList = useMemo(() => {
    return users && users.length > 0 ? users : MOCK_USERS;
  }, [users]);

  // RBAC permissions
  const isAdmin = currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER' || currentUser.isManager === true;
  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;

  // Multi-Select Filter states (Industry, Status, Category, Location, Account Owner)
  const [filterIndustry, setFilterIndustry] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterOwner, setFilterOwner] = useState<string[]>([]);

  // Popover open state
  const [openFilter, setOpenFilter] = useState<'industry' | 'status' | 'category' | 'location' | 'owner' | null>(null);

  // Search terms inside filter dropdowns
  const [searchIndustryFilter, setSearchIndustryFilter] = useState('');
  const [searchCategoryFilter, setSearchCategoryFilter] = useState('');
  const [searchLocationFilter, setSearchLocationFilter] = useState('');
  const [searchOwnerFilter, setSearchOwnerFilter] = useState('');

  // Export dropdown state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Pagination state (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<CRMAccount | null>(null);
  const [showAccountHistory, setShowAccountHistory] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CRMAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [statusChangePrompt, setStatusChangePrompt] = useState<{
    account: CRMAccount;
    newStatus: 'ACTIVE' | 'PROSPECT' | 'INACTIVE';
    oldStatus: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
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
    status: '' as '' | 'ACTIVE' | 'PROSPECT' | 'INACTIVE',
    assignedTo: currentUser.fullName || currentUser.username,
    notes: ''
  });

  // Deduplication state
  const [dismissDuplicateWarning, setDismissDuplicateWarning] = useState(false);
  const [showTypeaheadSuggestions, setShowTypeaheadSuggestions] = useState(true);

  // 1. Live 3-character matching suggestion list
  const liveTypeaheadMatches = useMemo(() => {
    const term = formData.name.trim().toLowerCase();
    if (term.length < 3) return [];
    return accounts.filter(acc => {
      if (editingAccount && acc.id === editingAccount.id) return false;
      const accName = (acc.name || '').toLowerCase();
      const accId = (acc.id || '').toLowerCase();
      return accName.includes(term) || accId.includes(term);
    }).slice(0, 5);
  }, [formData.name, accounts, editingAccount]);

  // 2. Smart Suffix Deduplication matching (e.g. DHL Ltd vs DHL Private Limited)
  const duplicateAccountMatches = useMemo(() => {
    if (!formData.name || formData.name.trim().length < 2) return [];
    const normalizedInput = normalizeCompanyName(formData.name);
    if (!normalizedInput || normalizedInput.length < 2) return [];

    return accounts.filter(acc => {
      if (editingAccount && acc.id === editingAccount.id) return false;
      const accNorm = normalizeCompanyName(acc.name);
      if (!accNorm) return false;

      // Exact normalized match or strong prefix/token match
      if (accNorm === normalizedInput) return true;
      if (accNorm.length >= 3 && normalizedInput.length >= 3) {
        if (accNorm === normalizedInput || accNorm.startsWith(normalizedInput) || normalizedInput.startsWith(accNorm)) {
          return true;
        }
      }
      return false;
    });
  }, [formData.name, accounts, editingAccount]);

  const resetForm = () => {
    setFormData({
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
      status: '',
      assignedTo: currentUser.fullName || currentUser.username,
      notes: ''
    });
    setEditingAccount(null);
    setDismissDuplicateWarning(false);
    setShowTypeaheadSuggestions(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (acc: CRMAccount) => {
    if (!canEdit) return;
    setEditingAccount(acc);
    setFormData({
      name: acc.name || '',
      businessCategory: acc.businessCategory || '',
      industry: acc.industry || '',
      phone: acc.phone || '',
      altPhone: acc.altPhone || '',
      email: acc.email || '',
      website: acc.website || '',
      address: acc.address || '',
      billingCity: acc.billingCity || '',
      billingState: acc.billingState || '',
      pincode: acc.pincode || '',
      country: acc.country || acc.billingCountry || 'India',
      status: (acc.status as any) || '',
      assignedTo: acc.assignedTo || currentUser.fullName || currentUser.username,
      notes: acc.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.businessCategory ||
      !formData.industry ||
      !formData.status ||
      !formData.phone.trim() ||
      !formData.address.trim() ||
      !formData.billingCity.trim() ||
      !formData.billingState.trim() ||
      !formData.pincode.trim() ||
      !formData.country.trim()
    ) {
      return;
    }

    const payloadStatus = formData.status as 'ACTIVE' | 'PROSPECT' | 'INACTIVE';
    const payloadOwner = isAdmin ? formData.assignedTo : (currentUser.fullName || currentUser.username);
    const now = new Date().toISOString();
    const actor = currentUser.fullName || currentUser.username || 'User';

    setIsSaving(true);
    try {
      if (editingAccount) {
        const changes: { field: string; oldValue: string; newValue: string }[] = [];

        if ((editingAccount.name || '').trim() !== formData.name.trim()) {
          changes.push({ field: 'Company Name', oldValue: editingAccount.name || '(Blank)', newValue: formData.name.trim() });
        }
        if ((editingAccount.businessCategory || '').trim() !== formData.businessCategory.trim()) {
          changes.push({ field: 'Business Category', oldValue: editingAccount.businessCategory || '(Blank)', newValue: formData.businessCategory.trim() });
        }
        if ((editingAccount.industry || '').trim() !== formData.industry.trim()) {
          changes.push({ field: 'Industry', oldValue: editingAccount.industry || '(Blank)', newValue: formData.industry.trim() });
        }
        if ((editingAccount.status || 'ACTIVE') !== payloadStatus) {
          changes.push({ field: 'Account Status', oldValue: getStatusDisplay(editingAccount.status || 'ACTIVE'), newValue: getStatusDisplay(payloadStatus) });
        }
        if ((editingAccount.phone || '').trim() !== formData.phone.trim()) {
          changes.push({ field: 'Office Phone', oldValue: editingAccount.phone || '(Blank)', newValue: formData.phone.trim() || '(Blank)' });
        }
        if ((editingAccount.altPhone || '').trim() !== formData.altPhone.trim()) {
          changes.push({ field: 'Alternative Phone', oldValue: editingAccount.altPhone || '(Blank)', newValue: formData.altPhone.trim() || '(Blank)' });
        }
        if ((editingAccount.email || '').trim() !== formData.email.trim()) {
          changes.push({ field: 'Official Email', oldValue: editingAccount.email || '(Blank)', newValue: formData.email.trim() || '(Blank)' });
        }
        if ((editingAccount.website || '').trim() !== formData.website.trim()) {
          changes.push({ field: 'Website', oldValue: editingAccount.website || '(Blank)', newValue: formData.website.trim() || '(Blank)' });
        }
        if ((editingAccount.assignedTo || '').trim() !== (payloadOwner || '').trim()) {
          changes.push({ field: 'Account Owner', oldValue: editingAccount.assignedTo || '(Blank)', newValue: payloadOwner || '(Blank)' });
        }
        if ((editingAccount.address || '').trim() !== formData.address.trim()) {
          changes.push({ field: 'Street Address', oldValue: editingAccount.address || '(Blank)', newValue: formData.address.trim() || '(Blank)' });
        }
        if ((editingAccount.billingCity || '').trim() !== formData.billingCity.trim()) {
          changes.push({ field: 'City', oldValue: editingAccount.billingCity || '(Blank)', newValue: formData.billingCity.trim() || '(Blank)' });
        }
        if ((editingAccount.billingState || '').trim() !== formData.billingState.trim()) {
          changes.push({ field: 'State', oldValue: editingAccount.billingState || '(Blank)', newValue: formData.billingState.trim() || '(Blank)' });
        }
        if ((editingAccount.pincode || '').trim() !== formData.pincode.trim()) {
          changes.push({ field: 'Pin Code', oldValue: editingAccount.pincode || '(Blank)', newValue: formData.pincode.trim() || '(Blank)' });
        }
        const oldCountry = editingAccount.country || editingAccount.billingCountry || 'India';
        if (oldCountry.trim() !== (formData.country || 'India').trim()) {
          changes.push({ field: 'Country', oldValue: oldCountry, newValue: formData.country || 'India' });
        }
        if ((editingAccount.notes || '').trim() !== formData.notes.trim()) {
          changes.push({ field: 'Notes', oldValue: editingAccount.notes || '(Blank)', newValue: formData.notes.trim() || '(Blank)' });
        }

        const detailsText = changes.length > 0
          ? `Updated ${changes.length} field${changes.length > 1 ? 's' : ''}: ${changes.map(c => c.field).join(', ')}`
          : 'Account profile saved without modifications';

        const historyEntry: AccountEditHistoryEntry = {
          timestamp: now,
          changedBy: actor,
          action: 'UPDATED',
          details: detailsText,
          changes: changes.length > 0 ? changes : undefined
        };
        const updatedHistory = editingAccount.editHistory ? [historyEntry, ...editingAccount.editHistory] : [historyEntry];

        await onUpdateAccount({
          ...editingAccount,
          ...formData,
          status: payloadStatus,
          assignedTo: payloadOwner,
          billingCountry: formData.country,
          updatedAt: now,
          editHistory: updatedHistory
        });
      } else {
        const historyEntry: AccountEditHistoryEntry = {
          timestamp: now,
          changedBy: actor,
          action: 'CREATED',
          details: `Account created with status "${payloadStatus === 'ACTIVE' ? 'Active Client' : payloadStatus === 'PROSPECT' ? 'Prospect / Lead' : 'Inactive'}"`
        };

        await onAddAccount({
          ...formData,
          status: payloadStatus,
          assignedTo: payloadOwner,
          billingCountry: formData.country,
          editHistory: [historyEntry]
        });
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving account:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    setIsSaving(true);
    try {
      await onDeleteAccount(id);
      setDeletingAccountId(null);
    } catch (err) {
      console.error('Error deleting account:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Status Change Prompt Handler
  const handleStatusSelect = (account: CRMAccount, newStatus: 'ACTIVE' | 'PROSPECT' | 'INACTIVE') => {
    if (account.status === newStatus) return;
    setStatusChangePrompt({
      account,
      newStatus,
      oldStatus: account.status
    });
  };

  const confirmStatusChange = async () => {
    if (!statusChangePrompt) return;
    const { account, newStatus, oldStatus } = statusChangePrompt;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const actor = currentUser.fullName || currentUser.username || 'User';
      const oldStatusLabel = oldStatus === 'ACTIVE' ? 'Active Client' : oldStatus === 'PROSPECT' ? 'Prospect / Lead' : 'Inactive';
      const newStatusLabel = newStatus === 'ACTIVE' ? 'Active Client' : newStatus === 'PROSPECT' ? 'Prospect / Lead' : 'Inactive';
      
      const newHistoryEntry: AccountEditHistoryEntry = {
        timestamp: now,
        changedBy: actor,
        action: 'STATUS_CHANGED',
        oldStatus,
        newStatus,
        details: `Changed account status from "${oldStatusLabel}" to "${newStatusLabel}"`,
        changes: [
          { field: 'Account Status', oldValue: oldStatusLabel, newValue: newStatusLabel }
        ]
      };

      const updatedHistory = account.editHistory ? [newHistoryEntry, ...account.editHistory] : [newHistoryEntry];

      await onUpdateAccount({
        ...account,
        status: newStatus,
        updatedAt: now,
        editHistory: updatedHistory
      });

      // Update viewing account if open
      if (viewingAccount && viewingAccount.id === account.id) {
        setViewingAccount({
          ...viewingAccount,
          status: newStatus,
          updatedAt: now,
          editHistory: updatedHistory
        });
      }

      setStatusChangePrompt(null);
    } catch (err) {
      console.error('Error changing account status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const availableStatuses = [
    { value: 'ACTIVE', label: 'Active Client' },
    { value: 'PROSPECT', label: 'Prospect / Lead' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];

  // Distinct locations list for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    accounts.forEach(a => {
      if (a.billingCity && a.billingCity.trim()) {
        locSet.add(a.billingCity.trim());
      }
    });
    return Array.from(locSet).sort();
  }, [accounts]);

  // Distinct owners list for filter dropdown
  const uniqueOwners = useMemo(() => {
    const ownerSet = new Set<string>();
    accounts.forEach(a => {
      if (a.assignedTo && a.assignedTo.trim()) {
        ownerSet.add(a.assignedTo.trim());
      }
    });
    availableUsersList.forEach(u => {
      const name = u.fullName || u.username;
      if (name && name.trim()) {
        ownerSet.add(name.trim());
      }
    });
    return Array.from(ownerSet).sort();
  }, [accounts, availableUsersList]);

  // Filtering calculation
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      // 1. Industry filter
      if (filterIndustry.length > 0) {
        if (!acc.industry || !filterIndustry.includes(acc.industry)) return false;
      }
      // 2. Status filter
      if (filterStatus.length > 0) {
        const st = acc.status || 'ACTIVE';
        if (!filterStatus.includes(st)) return false;
      }
      // 3. Category filter
      if (filterCategory.length > 0) {
        if (!acc.businessCategory || !filterCategory.includes(acc.businessCategory)) return false;
      }
      // 4. Location filter
      if (filterLocation.length > 0) {
        const loc = acc.billingCity?.trim() || '';
        if (!loc || !filterLocation.includes(loc)) return false;
      }
      // 5. Owner filter
      if (filterOwner.length > 0) {
        const owner = acc.assignedTo?.trim() || 'Admin Operator';
        if (!filterOwner.includes(owner)) return false;
      }
      return true;
    });
  }, [accounts, filterIndustry, filterStatus, filterCategory, filterLocation, filterOwner]);

  const isFilterActive = 
    filterIndustry.length > 0 || 
    filterStatus.length > 0 || 
    filterCategory.length > 0 || 
    filterLocation.length > 0 || 
    filterOwner.length > 0;

  const handleResetFilters = () => {
    setFilterIndustry([]);
    setFilterStatus([]);
    setFilterCategory([]);
    setFilterLocation([]);
    setFilterOwner([]);
    setSearchIndustryFilter('');
    setSearchCategoryFilter('');
    setSearchLocationFilter('');
    setSearchOwnerFilter('');
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalItems = filteredAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedAccounts = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredAccounts.slice(startIndex, startIndex + pageSize);
  }, [filteredAccounts, validCurrentPage, pageSize]);

  // ==================== EXPORT REPORT HANDLERS ====================
  const getStatusDisplay = (status: string) => {
    if (status === 'ACTIVE') return 'Active Client';
    if (status === 'PROSPECT') return 'Prospect / Lead';
    if (status === 'INACTIVE') return 'Inactive';
    return status;
  };

  const handleExportCSV = () => {
    const headers = [
      'Account ID',
      'Company Name',
      'Business Category',
      'Industry',
      'Office Phone',
      'Alt Phone',
      'Official Email',
      'Website',
      'Address',
      'City',
      'State',
      'Pin Code',
      'Country',
      'Account Status',
      'Account Owner',
      'Created Date (IST)',
      'Notes'
    ];

    const rows = filteredAccounts.map(a => [
      `"${a.id}"`,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      `"${(a.businessCategory || '').replace(/"/g, '""')}"`,
      `"${(a.industry || '').replace(/"/g, '""')}"`,
      `"${(a.phone || '').replace(/"/g, '""')}"`,
      `"${(a.altPhone || '').replace(/"/g, '""')}"`,
      `"${(a.email || '').replace(/"/g, '""')}"`,
      `"${(a.website || '').replace(/"/g, '""')}"`,
      `"${(a.address || '').replace(/"/g, '""')}"`,
      `"${(a.billingCity || '').replace(/"/g, '""')}"`,
      `"${(a.billingState || '').replace(/"/g, '""')}"`,
      `"${(a.pincode || '').replace(/"/g, '""')}"`,
      `"${(a.country || a.billingCountry || 'India').replace(/"/g, '""')}"`,
      `"${getStatusDisplay(a.status)}"`,
      `"${(a.assignedTo || '').replace(/"/g, '""')}"`,
      `"${formatCRMIDate(a.createdAt)}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `crm_accounts_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    let rowsHTML = filteredAccounts.map(a => `
      <tr>
        <td style="font-family: monospace; font-weight: bold;">${a.id}</td>
        <td style="font-weight: bold;">${a.name}</td>
        <td>${a.businessCategory || ''}</td>
        <td>${a.industry || ''}</td>
        <td>${a.phone || ''}</td>
        <td>${a.altPhone || ''}</td>
        <td>${a.email || ''}</td>
        <td>${a.billingCity || ''}</td>
        <td>${a.billingState || ''}</td>
        <td>${a.pincode || ''}</td>
        <td>${a.country || a.billingCountry || 'India'}</td>
        <td style="font-weight: bold;">${getStatusDisplay(a.status)}</td>
        <td>${a.assignedTo || ''}</td>
        <td>${formatCRMIDate(a.createdAt)}</td>
        <td>${(a.notes || '').replace(/</g, '&lt;')}</td>
      </tr>
    `).join('');

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
                <th>Company Name</th>
                <th>Business Category</th>
                <th>Industry</th>
                <th>Office Phone</th>
                <th>Alt Phone</th>
                <th>Official Email</th>
                <th>City</th>
                <th>State</th>
                <th>Pin Code</th>
                <th>Country</th>
                <th>Account Status</th>
                <th>Account Owner</th>
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
    link.setAttribute('download', `crm_accounts_report_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    const rowsHTML = filteredAccounts.map(a => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
        <td style="padding: 6px; font-family: monospace; font-weight: bold; white-space: nowrap;">${a.id}</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">
          ${a.name}
          ${a.businessCategory ? `<div style="font-size: 8.5px; color: #64748b; font-weight: normal;">${a.businessCategory}</div>` : ''}
        </td>
        <td style="padding: 6px; white-space: nowrap;">${a.phone || '—'}</td>
        <td style="padding: 6px; white-space: nowrap;">${a.billingCity ? `${a.billingCity}${a.billingState ? `, ${a.billingState}` : ''}` : '—'}</td>
        <td style="padding: 6px; white-space: nowrap;"><span style="background-color: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">${a.industry || '—'}</span></td>
        <td style="padding: 6px; text-align: center; white-space: nowrap;">
          <span style="background-color: ${a.status === 'ACTIVE' ? '#dcfce7' : a.status === 'PROSPECT' ? '#fef3c7' : '#f1f5f9'}; color: ${a.status === 'ACTIVE' ? '#166534' : a.status === 'PROSPECT' ? '#92400e' : '#475569'}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">
            ${getStatusDisplay(a.status)}
          </span>
        </td>
        <td style="padding: 6px; color: #475569; white-space: nowrap;">${a.assignedTo || '—'}</td>
      </tr>
    `).join('');

    const nowIST = formatCRMIDateTime(new Date().toISOString());

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CRM Accounts Directory Report</title>
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
              <h2 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 800;">CRM Accounts & Client Directory Report</h2>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">Generated on: ${nowIST} (IST) | Total Filtered Accounts: <strong>${filteredAccounts.length}</strong></p>
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
                <th>Company Name</th>
                <th>Phone</th>
                <th>Location (City)</th>
                <th>Industry</th>
                <th style="text-align: center;">Account Status</th>
                <th>Account Owner</th>
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
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Accounts & Client Directory
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredAccounts.length} of {accounts.length} registered accounts
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

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-extrabold shadow-xs hover:bg-[#e5aa3b] transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Account
          </button>
        </div>
      </div>

      {/* 2. FILTERS TOOLBAR (Multi-Select: Industry, Status, Category, Location, Account Owner) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters:</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full flex-1">
            {/* Filter 1: Industry */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'industry' ? null : 'industry')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterIndustry.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterIndustry.length === 0
                    ? 'All Industries'
                    : filterIndustry.length === 1
                    ? filterIndustry[0]
                    : `${filterIndustry.length} Industries`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'industry' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Industry</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterIndustry([...industriesList])}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterIndustry([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search industries..."
                      value={searchIndustryFilter}
                      onChange={e => setSearchIndustryFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {industriesList
                        .filter(ind => ind.toLowerCase().includes(searchIndustryFilter.toLowerCase()))
                        .map(ind => {
                          const isChecked = filterIndustry.includes(ind);
                          return (
                            <label
                              key={ind}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterIndustry(prev => 
                                    prev.includes(ind) ? prev.filter(x => x !== ind) : [...prev, ind]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="truncate">{ind}</span>
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
                    ? availableStatuses.find(s => s.value === filterStatus[0])?.label || filterStatus[0]
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

            {/* Filter 3: Category */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'category' ? null : 'category')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterCategory.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterCategory.length === 0
                    ? 'All Categories'
                    : filterCategory.length === 1
                    ? filterCategory[0]
                    : `${filterCategory.length} Categories`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {openFilter === 'category' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Category</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterCategory([...businessCategoriesList])}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFilterCategory([])}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={searchCategoryFilter}
                      onChange={e => setSearchCategoryFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {businessCategoriesList
                        .filter(cat => cat.toLowerCase().includes(searchCategoryFilter.toLowerCase()))
                        .map(cat => {
                          const isChecked = filterCategory.includes(cat);
                          return (
                            <label
                              key={cat}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterCategory(prev => 
                                    prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="truncate">{cat}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter 4: Location */}
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
                          onClick={() => setFilterLocation([...uniqueLocations])}
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
                      {uniqueLocations.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">No locations recorded</p>
                      ) : (
                        uniqueLocations
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

            {/* Filter 5: Account Owner */}
            <div className="col-span-2 md:col-span-1 relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'owner' ? null : 'owner')}
                className={`w-full py-1.5 px-2.5 bg-slate-50 border rounded-xl text-[11px] md:text-xs font-semibold text-slate-800 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterOwner.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterOwner.length === 0
                    ? 'All Owners'
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
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Account Owner</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterOwner([...uniqueOwners])}
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
                      {uniqueOwners.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">No account owners recorded</p>
                      ) : (
                        uniqueOwners
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

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] md:text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap"
              title="Clear all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. ACCOUNTS DATA TABLE (List View with Max 10 per page) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4 w-28">ID</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Location (city)</th>
                <th className="py-3 px-4">Industry</th>
                <th className="py-3 px-4 w-36">Account Status</th>
                <th className="py-3 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedAccounts.length > 0 ? (
                paginatedAccounts.map(account => (
                  <tr key={account.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Clickable ID */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingAccount(account);
                          setShowAccountHistory(true);
                        }}
                        className="font-mono font-extrabold text-blue-600 hover:text-blue-800 hover:underline text-[11px] cursor-pointer text-left focus:outline-none"
                        title="Click to view full details & edit history"
                      >
                        {account.id}
                      </button>
                    </td>

                    {/* Company Name */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-xs">{account.name}</span>
                        {account.businessCategory && (
                          <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {account.businessCategory}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{account.phone || '—'}</span>
                        {account.altPhone && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            Alt: {account.altPhone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location (city) */}
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {account.billingCity ? (
                        <span>{account.billingCity}{account.billingState ? `, ${account.billingState}` : ''}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Industry */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {account.industry ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {account.industry}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Account Status (Interactive Dropdown for changing status directly from list) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="relative inline-block w-full max-w-[130px]">
                        <select
                          value={account.status}
                          onChange={e => handleStatusSelect(account, e.target.value as any)}
                          className={`w-full appearance-none pl-2.5 pr-6 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer focus:outline-none ${
                            account.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : account.status === 'PROSPECT'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <option value="ACTIVE">Active Client</option>
                          <option value="PROSPECT">Prospect / Lead</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>

                    {/* Action (View, edit, delete icons with strict RBAC) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setViewingAccount(account);
                            setShowAccountHistory(false);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>

                        {/* Edit Icon: Only Admin & Manager */}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(account)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-700 transition-colors cursor-pointer"
                            title="Edit Account"
                          >
                            <Pencil className="w-4 h-4 text-amber-600" />
                          </button>
                        )}

                        {/* Delete Icon: Only Admin */}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingAccountId(account.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Account (Admin Only)"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No matching accounts found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isFilterActive ? 'Try adjusting your filter criteria.' : 'Click "New Account" to add your first customer company.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View (Visible on mobile screens, no horizontal scroll) */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedAccounts.length > 0 ? (
            paginatedAccounts.map(account => (
              <div key={account.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                {/* Top Row: Account ID & Status Selector */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingAccount(account);
                      setShowAccountHistory(true);
                    }}
                    className="font-mono font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-xs border border-blue-100 cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Click to view full details & edit history"
                  >
                    <span>{account.id}</span>
                  </button>

                  <div className="relative inline-block">
                    <select
                      value={account.status}
                      onChange={e => handleStatusSelect(account, e.target.value as any)}
                      className={`appearance-none pl-2.5 pr-6 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer focus:outline-none ${
                        account.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : account.status === 'PROSPECT'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="ACTIVE">Active Client</option>
                      <option value="PROSPECT">Prospect / Lead</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                  </div>
                </div>

                {/* Company Name & Business Category */}
                <div>
                  <h4 
                    onClick={() => {
                      setViewingAccount(account);
                      setShowAccountHistory(false);
                    }}
                    className="font-extrabold text-slate-900 text-sm cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {account.name}
                  </h4>
                  {account.businessCategory && (
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                      {account.businessCategory}
                    </span>
                  )}
                </div>

                {/* Info Grid: Industry, Phone, Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{account.industry || '—'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {account.phone ? (
                      <a href={`tel:${account.phone}`} className="hover:underline text-slate-700 font-medium truncate">
                        {account.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {account.billingCity ? `${account.billingCity}${account.billingState ? `, ${account.billingState}` : ''}` : '—'}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Assigned Owner & Action Buttons */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
                  <div className="text-[11px] text-slate-500 truncate flex-1 min-w-0">
                    Owner: <span className="font-semibold text-slate-800">{account.assignedTo || 'Unassigned'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingAccount(account);
                        setShowAccountHistory(false);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(account)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg transition-all cursor-pointer"
                        title="Edit Account"
                      >
                        <Pencil className="w-4 h-4 text-amber-600" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeletingAccountId(account.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg transition-all cursor-pointer"
                        title="Delete Account"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 p-4">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">No matching accounts found</p>
              <p className="text-xs text-slate-400 mt-1">
                {isFilterActive ? 'Try adjusting your filter criteria.' : 'Click "New Account" to add your first customer company.'}
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION CONTROLS (Max 10 per page) */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <div>
              Showing <span className="font-bold text-slate-800">{Math.min(totalItems, (validCurrentPage - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(totalItems, validCurrentPage * pageSize)}</span> of{' '}
              <span className="font-bold text-slate-800">{totalItems}</span> accounts
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      validCurrentPage === pageNum
                        ? 'bg-[#f7b944] text-slate-950 shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. STATUS CHANGE CONFIRMATION / WARNING MODAL */}
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-10 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Change Account Status?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Changing account status for <strong className="text-slate-900">"{statusChangePrompt.account.name}"</strong> ({statusChangePrompt.account.id}) from{' '}
                <span className="font-bold text-amber-700">{getStatusDisplay(statusChangePrompt.oldStatus)}</span> to{' '}
                <span className="font-bold text-emerald-700">{getStatusDisplay(statusChangePrompt.newStatus)}</span>.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                This modification will be recorded in the account audit and edit history with an IST timestamp.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
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
                  className="px-5 py-2.5 rounded-xl bg-[#f7b944] text-slate-950 text-xs font-extrabold hover:bg-[#e5aa3b] transition-all shadow-xs cursor-pointer"
                >
                  {isSaving ? 'Updating...' : 'Confirm Change'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. VIEW ACCOUNT DETAILS & EDIT HISTORY MODAL */}
      <AnimatePresence>
        {viewingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingAccount(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                      {viewingAccount.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {viewingAccount.id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Created: {formatCRMIDateTime(viewingAccount.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingAccount(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* Status & Categories */}
                <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Industry</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{viewingAccount.industry || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Business Category</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{viewingAccount.businessCategory || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Account Status</span>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      viewingAccount.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : viewingAccount.status === 'PROSPECT'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {getStatusDisplay(viewingAccount.status)}
                    </span>
                  </div>
                </div>

                {/* Communication details */}
                <div className="space-y-2.5">
                  <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-1 text-xs flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    Contact & Communication
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Office Phone</span>
                      <span className="font-semibold text-slate-800">{viewingAccount.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Alternative Phone</span>
                      <span className="font-semibold text-slate-800">{viewingAccount.altPhone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Official Email</span>
                      <span className="font-semibold text-slate-800">{viewingAccount.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Website</span>
                      {viewingAccount.website ? (
                        <a 
                          href={viewingAccount.website.startsWith('http') ? viewingAccount.website : `https://${viewingAccount.website}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-semibold text-sky-600 hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{viewingAccount.website}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location details */}
                <div className="space-y-2.5">
                  <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-1 text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Address & Location
                  </h4>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px] block">Street Address</span>
                    <span className="font-semibold text-slate-800 block">{viewingAccount.address || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px] block">City</span>
                      <span className="font-semibold text-slate-800">{viewingAccount.billingCity || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">State</span>
                      <span className="font-semibold text-slate-800">{viewingAccount.billingState || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Pin code</span>
                      <span className="font-semibold text-slate-800">{viewingAccount.pincode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Country</span>
                      <span className="font-semibold text-slate-800">{viewingAccount.country || viewingAccount.billingCountry || 'India'}</span>
                    </div>
                  </div>
                </div>

                {/* Account Owner */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Assigned Account Owner</span>
                    <span className="font-semibold text-slate-800">{viewingAccount.assignedTo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Last Updated (IST)</span>
                    <span className="font-semibold text-slate-800">{formatCRMIDateTime(viewingAccount.updatedAt || viewingAccount.createdAt)}</span>
                  </div>
                </div>

                {/* Notes */}
                {viewingAccount.notes && (
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <span className="text-slate-400 text-[11px] block font-bold">Notes</span>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                      {viewingAccount.notes}
                    </p>
                  </div>
                )}

                {/* 6. EDIT HISTORY & AUDIT TRAIL AT THE BOTTOM (Only shown when ID is clicked) */}
                {showAccountHistory && (
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600">
                        <History className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                          Account Edit & Activity History
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">All timestamps in IST</span>
                    </div>

                    {!viewingAccount.editHistory || viewingAccount.editHistory.length === 0 ? (
                      <div className="bg-slate-50 p-4 rounded-2xl text-center text-slate-400 border border-slate-100">
                        <span className="text-[11px] font-medium italic">
                          Original account entry created on {formatCRMIDateTime(viewingAccount.createdAt)} by {viewingAccount.assignedTo || 'Admin'}. No edits or status changes have been performed yet.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
                        {viewingAccount.editHistory.map((entry, eIdx) => (
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
                                  {entry.details || 'Account details or status modified'}
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
                      const acc = viewingAccount;
                      setViewingAccount(null);
                      handleOpenEdit(acc);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Account
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingAccount(null)}
                  className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 transition-all text-xs ml-auto cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. ADD / EDIT MODAL (Clean 1px Border, Responsive, Role Protected) */}
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
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#f7b944]/20 border border-[#f7b944]/40 flex items-center justify-center text-amber-900">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {editingAccount ? `Edit Account: ${editingAccount.name}` : 'New Account'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Fill in customer company details and enterprise classification.
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

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                
                {/* Company Name with Live 3-Char Typeahead & Duplicate Warning */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Company Name *</label>
                    {formData.name.trim().length >= 3 && liveTypeaheadMatches.length > 0 && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {liveTypeaheadMatches.length} existing match{liveTypeaheadMatches.length > 1 ? 'es' : ''} found
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ommax Electric Private Limited"
                    value={formData.name}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                      setDismissDuplicateWarning(false);
                      setShowTypeaheadSuggestions(true);
                    }}
                    onFocus={() => setShowTypeaheadSuggestions(true)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />

                  {/* 1. Live 3-Character Matching Suggestions Dropdown */}
                  {showTypeaheadSuggestions && formData.name.trim().length >= 3 && liveTypeaheadMatches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 overflow-hidden text-xs">
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <span>Matching Existing Accounts</span>
                        <button
                          type="button"
                          onClick={() => setShowTypeaheadSuggestions(false)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {liveTypeaheadMatches.map(acc => (
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
                                {acc.billingCity && <span>• {acc.billingCity}</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setViewingAccount(acc);
                                setIsAddModalOpen(false);
                              }}
                              className="px-2 py-1 bg-white hover:bg-amber-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors shrink-0 cursor-pointer"
                            >
                              View Account
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Soft Warning Banner for Suffix / Normalized Duplicates */}
                  {!dismissDuplicateWarning && duplicateAccountMatches.length > 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start justify-between gap-2.5 text-xs">
                      <div className="flex items-start gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-extrabold text-amber-900 text-xs">Potential Duplicate Account Detected</p>
                          <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                            An existing account <strong className="font-bold text-amber-950">"{duplicateAccountMatches[0].name}"</strong> ({duplicateAccountMatches[0].id} • {duplicateAccountMatches[0].status === 'ACTIVE' ? 'Active Client' : duplicateAccountMatches[0].status === 'PROSPECT' ? 'Prospect' : 'Inactive'} • Owner: {duplicateAccountMatches[0].assignedTo || 'Admin'}) was found matching this company name.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingAccount(duplicateAccountMatches[0]);
                            setIsAddModalOpen(false);
                          }}
                          className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          View Account
                        </button>
                        <button
                          type="button"
                          onClick={() => setDismissDuplicateWarning(true)}
                          className="p-1 text-amber-700 hover:text-amber-950 rounded-md cursor-pointer"
                          title="Dismiss warning"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Business Category & Industry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Business Category *</label>
                    <select
                      required
                      value={formData.businessCategory}
                      onChange={e => setFormData({ ...formData, businessCategory: e.target.value })}
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
                      value={formData.industry}
                      onChange={e => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Industry</option>
                      {industriesList.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Phones with Country Code Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Office Phone *</label>
                    <CountryPhoneInput
                      id="acc-office-phone"
                      required
                      value={formData.phone}
                      onChange={val => setFormData({ ...formData, phone: val })}
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
                      id="acc-alt-phone"
                      value={formData.altPhone}
                      onChange={val => setFormData({ ...formData, altPhone: val })}
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
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Website</label>
                    <input
                      type="text"
                      placeholder="https://company.com"
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Plot / Door No, Street, Landmark, Industrial Area"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
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
                      value={formData.billingCity}
                      onChange={e => setFormData({ ...formData, billingCity: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="Tamil Nadu"
                      value={formData.billingState}
                      onChange={e => setFormData({ ...formData, billingState: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
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
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
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
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Status & Account Owner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Account Status *</label>
                    <select
                      required
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    >
                      <option value="">Choose Status</option>
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
                        value={formData.assignedTo}
                        onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors cursor-pointer"
                      >
                        <option value="">Select Account Owner</option>
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

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Key client background, procurement preferences, historical terms..."
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
                    {isSaving ? 'Saving...' : editingAccount ? 'Save Changes' : 'Create Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DELETE CONFIRMATION MODAL (Admin Only) */}
      <AnimatePresence>
        {deletingAccountId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingAccountId(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-10 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Delete Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this account ({deletingAccountId}) from your CRM directory? Its ID will be made available for reuse.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingAccountId(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deletingAccountId)}
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
