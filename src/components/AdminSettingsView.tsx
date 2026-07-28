import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, 
  Users, 
  History, 
  Database, 
  Plus, 
  Pencil, 
  Trash2, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  Tag, 
  Globe, 
  UserPlus, 
  X, 
  Save,
  Lock,
  Shield,
  Activity,
  Key,
  FileSpreadsheet,
  Info,
  Server,
  Terminal,
  Layers,
  RefreshCw,
  Check
} from 'lucide-react';
import { User, CategoryLimit, ActivityLog, AppSettings, UserRole, Transaction } from '../types';
import { formatTimestampInTimezone } from '../utils';

interface AdminSettingsViewProps {
  currentUser: User;
  appSettings: AppSettings;
  onUpdateAppSettings: (newSettings: AppSettings) => void;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (username: string) => void;
  categories: CategoryLimit[];
  onAddCategory: (cat: CategoryLimit) => void;
  onUpdateCategory: (cat: CategoryLimit) => void;
  onDeleteCategory: (catName: string) => void;
  logs: ActivityLog[];
  transactions: Transaction[];
  onBackupData: () => void;
  onRestoreData: (jsonContent: string) => boolean | Promise<boolean>;
  onWipeAllData: () => void | Promise<void>;
}

type AdminTab = 'APP_SETTINGS' | 'USER_MGMT' | 'SYSTEM_AUDIT' | 'SYSTEM_OPERATIONS';

export default function AdminSettingsView({
  currentUser,
  appSettings,
  onUpdateAppSettings,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  logs,
  transactions,
  onBackupData,
  onRestoreData,
  onWipeAllData
}: AdminSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('APP_SETTINGS');

  // --- 1. App Settings Form State ---
  const [formCurrency, setFormCurrency] = useState(appSettings.currencySymbol);
  const [formDateFormat, setFormDateFormat] = useState(appSettings.dateFormat);
  const [formTimezone, setFormTimezone] = useState(appSettings.timezone);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    setFormCurrency(appSettings.currencySymbol);
    setFormDateFormat(appSettings.dateFormat);
    setFormTimezone(appSettings.timezone);
  }, [appSettings]);

  // Category Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryLimit | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'IN' | 'OUT' | 'BOTH'>('OUT');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catError, setCatError] = useState('');
  const [catDeleteError, setCatDeleteError] = useState('');
  const [deleteConfirmCatName, setDeleteConfirmCatName] = useState<string | null>(null);

  // --- 2. User Management State ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const [userEmpId, setUserEmpId] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('CUSTODIAN');
  const [userError, setUserError] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<{ [username: string]: boolean }>({});

  // --- 3. System Audit Filter State ---
  const [auditFilterAction, setAuditFilterAction] = useState<string>('ALL');

  // --- 4. System Operations State ---
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');

  // ----------------------------------------------------
  // Handlers for App Settings
  // ----------------------------------------------------
  const handleSaveAppSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAppSettings({
      currencySymbol: formCurrency.trim() || '₹',
      dateFormat: formDateFormat,
      timezone: formTimezone
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType('OUT');
    setCatColor('#3b82f6');
    setCatError('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CategoryLimit) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type || 'OUT');
    setCatColor(cat.color || '#3b82f6');
    setCatError('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: catName.trim(),
        type: catType,
        color: catColor,
      });
    } else {
      onAddCategory({
        id: `CAT-${Date.now().toString().slice(-4)}`,
        name: catName.trim(),
        type: catType,
        color: catColor,
        budget: 0,
        spent: 0
      });
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategoryDirect = (categoryName: string) => {
    setCatDeleteError('');
    // Check if category is involved in any inward or outward transactions
    const isUsed = transactions.some(
      t => t.category.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );

    if (isUsed) {
      setCatDeleteError(`Cannot delete category "${categoryName}" as it is involved in recorded inward/outward vouchers.`);
      setTimeout(() => setCatDeleteError(''), 6000);
      return;
    }

    // Require user confirmation modal before deleting
    setDeleteConfirmCatName(categoryName);
  };

  // ----------------------------------------------------
  // Handlers for User Management
  // ----------------------------------------------------
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserFullName('');
    setUserEmpId('');
    setUserUsername('');
    setUserPassword('');
    setShowModalPassword(false);
    setUserRole('CUSTODIAN');
    setUserError('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setUserFullName(u.fullName);
    setUserEmpId(u.empId || '');
    setUserUsername(u.username);
    setUserPassword(u.password || '');
    setShowModalPassword(false);
    setUserRole(u.role);
    setUserError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!userFullName.trim()) {
      setUserError('Full Name is required.');
      return;
    }

    if (!userEmpId.trim()) {
      setUserError('Employee ID is required.');
      return;
    }

    if (!userUsername.trim()) {
      setUserError('Username / Login ID is required.');
      return;
    }

    if (!editingUser && !userPassword.trim()) {
      setUserError('Password is required for new user creation.');
      return;
    }

    const trimmedEmpId = userEmpId.trim();
    const trimmedUsername = userUsername.trim().toLowerCase();

    if (!editingUser) {
      const usernameExists = users.some(u => u.username.toLowerCase() === trimmedUsername);
      if (usernameExists) {
        setUserError(`Username "${trimmedUsername}" is already taken.`);
        return;
      }

      const empIdExists = users.some(u => u.empId && u.empId.toLowerCase() === trimmedEmpId.toLowerCase());
      if (empIdExists) {
        setUserError(`Employee ID "${trimmedEmpId}" is already assigned to another user.`);
        return;
      }

      onAddUser({
        username: trimmedUsername,
        empId: trimmedEmpId,
        fullName: userFullName.trim(),
        role: userRole,
        password: userPassword.trim() || 'user123',
      });
    } else {
      onUpdateUser({
        ...editingUser,
        fullName: userFullName.trim(),
        empId: trimmedEmpId,
        role: userRole,
        password: userPassword.trim() || editingUser.password
      });
    }

    setIsUserModalOpen(false);
  };

  const toggleShowPassword = (username: string) => {
    setShowPasswords(prev => ({ ...prev, [username]: !prev[username] }));
  };

  // ----------------------------------------------------
  // Handlers for Export Audit Report
  // ----------------------------------------------------
  const handleExportAuditReport = () => {
    const csvRows: string[][] = [];
    csvRows.push(['Ommax Electric Private Limited - System Audit Report']);
    csvRows.push([`Generated On: ${new Date().toLocaleString()}`, `Generated By: ${currentUser.fullName}`]);
    csvRows.push([]);
    csvRows.push(['Log ID', 'Timestamp', 'User Name', 'Role', 'IP Address', 'Action Code', 'Activity Details']);

    filteredLogs.forEach(log => {
      csvRows.push([
        log.id,
        formatTimestampInTimezone(log.timestamp, appSettings.timezone, appSettings.dateFormat),
        log.user.replace(/"/g, '""'),
        log.role,
        log.ipAddress,
        log.action,
        log.details.replace(/"/g, '""')
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_audit_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // Handlers for Restore & Wipe
  // ----------------------------------------------------
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreSuccess('');
    setRestoreError('');

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const success = await onRestoreData(content);
        if (success) {
          setRestoreSuccess('System state successfully restored from backup package!');
          setTimeout(() => setRestoreSuccess(''), 4000);
        } else {
          setRestoreError('Invalid backup file format or structure.');
        }
      } catch (err) {
        setRestoreError('Error parsing backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  };

  const handleWipeDataConfirm = async () => {
    if (wipeConfirmInput.trim().toUpperCase() === 'WIPE') {
      await onWipeAllData();
      setIsWipeModalOpen(false);
      setWipeConfirmInput('');
    }
  };

  // Filter audit logs
  const filteredLogs = logs.filter(log => {
    if (auditFilterAction === 'ALL') return true;
    if (auditFilterAction === 'LOGIN') return log.action === 'LOGIN_SUCCESS' || log.action === 'LOGOUT';
    if (auditFilterAction === 'LEDGER') return log.action.startsWith('TXN_');
    if (auditFilterAction === 'USER_ADMIN') return log.action.startsWith('USER_');
    if (auditFilterAction === 'SYSTEM') return log.action.startsWith('SYSTEM_') || log.action.startsWith('APP_') || log.action.startsWith('CATEGORY_');
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Primary Subtab Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 shadow-xs grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('APP_SETTINGS')}
          className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'APP_SETTINGS'
              ? 'bg-[#f7b944] text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">App Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('USER_MGMT')}
          className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'USER_MGMT'
              ? 'bg-[#f7b944] text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Users ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM_AUDIT')}
          className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'SYSTEM_AUDIT'
              ? 'bg-[#f7b944] text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Audit Trail ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM_OPERATIONS')}
          className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'SYSTEM_OPERATIONS'
              ? 'bg-[#f7b944] text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">System Ops</span>
        </button>
      </div>

      {/* Viewport Content */}
      <AnimatePresence mode="wait">
        
        {/* ======================================================== */}
        {/* TAB 1: APP SETTINGS & CATEGORIES                         */}
        {/* ======================================================== */}
        {activeTab === 'APP_SETTINGS' && (
          <motion.div
            key="APP_SETTINGS"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Global Formatting & Preferences */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
              <div>
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#f7b944]" />
                  Global Localization & Display Standards
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Changes made here instantly format amounts, dates, and time stamps across all views, reports, and vouchers.
                </p>
              </div>

              {settingsSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  App settings updated successfully! Reflecting across entire workspace.
                </div>
              )}

              <form onSubmit={handleSaveAppSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Currency Symbol */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Currency / Amount Symbol</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="₹">₹ - Indian Rupee (INR)</option>
                    <option value="$">$ - US Dollar (USD)</option>
                    <option value="€">€ - Euro (EUR)</option>
                    <option value="£">£ - British Pound (GBP)</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="S$">S$ - Singapore Dollar</option>
                  </select>
                </div>

                {/* Date Format */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Date Format Standard</label>
                  <select
                    value={formDateFormat}
                    onChange={(e) => setFormDateFormat(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/07/2026)</option>
                    <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 15-07-2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-15)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/15/2026)</option>
                    <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 15-Jul-2026)</option>
                  </select>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">System Timezone</label>
                  <select
                    value={formTimezone}
                    onChange={(e) => setFormTimezone(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="Asia/Kolkata (IST, UTC+05:30)">Asia/Kolkata (IST, UTC+05:30)</option>
                    <option value="UTC (Coordinated Universal Time)">UTC (Universal Time)</option>
                    <option value="America/New_York (EST, UTC-05:00)">America/New_York (EST, UTC-05:00)</option>
                    <option value="Europe/London (GMT, UTC+00:00)">Europe/London (GMT, UTC+00:00)</option>
                    <option value="Asia/Dubai (GST, UTC+04:00)">Asia/Dubai (GST, UTC+04:00)</option>
                    <option value="Asia/Singapore (SGT, UTC+08:00)">Asia/Singapore (SGT, UTC+08:00)</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    Save System Settings
                  </button>
                </div>
              </form>
            </div>

            {/* Category Management */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#f7b944]" />
                    Inward & Outward Register Categories
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure categories for deposits and petty cash disbursements.
                  </p>
                </div>

                <button
                  onClick={openAddCategoryModal}
                  className="bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Category
                </button>
              </div>

              {catDeleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{catDeleteError}</span>
                  </div>
                  <button onClick={() => setCatDeleteError('')} className="p-1 text-rose-400 hover:text-rose-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {categories.map((cat, idx) => (
                  <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 truncate block">{cat.name}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                          cat.type === 'IN' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {cat.type === 'IN' ? 'INWARD' : 'OUTWARD'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        className="p-1.5 hover:bg-white text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategoryDirect(cat.name)}
                        className="p-1.5 hover:bg-white text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: USER MANAGEMENT                                   */}
        {/* ======================================================== */}
        {activeTab === 'USER_MGMT' && (
          <motion.div
            key="USER_MGMT"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#f7b944]" />
                    Authorized System Users
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage system credentials, employee IDs, and access roles (Admin, Custodian, Auditor).
                  </p>
                </div>

                <button
                  onClick={openAddUserModal}
                  className="bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Create New User
                </button>
              </div>

              {/* Users Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {users.map((u, idx) => {
                  const isCurrent = u.username.toLowerCase() === currentUser.username.toLowerCase();
                  const initials = u.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || u.username.slice(0, 2).toUpperCase();

                  return (
                    <div key={idx} className="bg-slate-50/70 rounded-2xl border border-slate-100 p-5 space-y-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#f7b944] text-slate-950 font-black flex items-center justify-center text-xs tracking-wider uppercase shadow-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                              {u.fullName}
                              {isCurrent && (
                                <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-md">You</span>
                              )}
                            </h4>
                            <p className="text-xs font-mono text-slate-700 font-bold">Emp ID: {u.empId || u.username.toUpperCase()}</p>
                            <p className="text-[11px] font-mono text-slate-400">Username: {u.username}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : u.role === 'CUSTODIAN'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {u.role === 'CUSTODIAN' ? 'USER' : u.role}
                        </span>
                      </div>

                      {/* Password Field */}
                      <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">
                            {showPasswords[u.username] ? (u.password || '••••••••') : '••••••••'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(u.username)}
                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showPasswords[u.username] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => openEditUserModal(u)}
                          className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-slate-500" />
                          Edit
                        </button>

                        {!isCurrent && (
                          <button
                            onClick={() => setDeleteConfirmUser(u.username)}
                            className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition-colors border border-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SYSTEM AUDIT TIMELINE                             */}
        {/* ======================================================== */}
        {activeTab === 'SYSTEM_AUDIT' && (
          <motion.div
            key="SYSTEM_AUDIT"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
              
              {/* Header & Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#f7b944]" />
                    Complete User Movement & Audit Trail
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Continuous timeline monitoring of logins, register modifications, user management, and system operations.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter category */}
                  <select
                    value={auditFilterAction}
                    onChange={(e) => setAuditFilterAction(e.target.value)}
                    className="py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="LOGIN">Security & Auth</option>
                    <option value="LEDGER">Ledger Movements</option>
                    <option value="USER_ADMIN">User Management</option>
                    <option value="SYSTEM">System Operations</option>
                  </select>

                  {/* Export Report Button */}
                  <button
                    onClick={handleExportAuditReport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Report
                  </button>
                </div>
              </div>

              {/* Timeline Stream */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {filteredLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">
                    No recorded movements matching the current filter criteria.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isAuth = log.action === 'LOGIN_SUCCESS' || log.action === 'LOGOUT';
                    const isTxn = log.action.startsWith('TXN_');
                    const isUserAction = log.action.startsWith('USER_');

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline Bullet Dot */}
                        <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white shadow-xs ${
                          isAuth
                            ? 'bg-emerald-500'
                            : isTxn
                            ? 'bg-blue-500'
                            : isUserAction
                            ? 'bg-amber-500'
                            : 'bg-[#f7b944]'
                        }`}>
                          {isAuth ? <Key className="w-2.5 h-2.5" /> : isTxn ? <Tag className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                        </div>

                        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800">{log.user}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                log.role === 'ADMIN' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {log.role}
                              </span>
                              <span className="text-slate-400 text-[11px] font-mono">• {log.ipAddress}</span>
                            </div>

                            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestampInTimezone(log.timestamp, appSettings.timezone, appSettings.dateFormat)} ({appSettings.timezone.split(' ')[0]})
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-slate-100">
                            {log.details}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SYSTEM OPERATIONS (BACKUP, RESTORE, WIPE)        */}
        {/* ======================================================== */}
        {activeTab === 'SYSTEM_OPERATIONS' && (
          <motion.div
            key="SYSTEM_OPERATIONS"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 1. Backup Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Download className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800">Export Complete Backup</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Download a full system JSON package containing all registered vouchers, user lists, categories, app settings, and audit logs for safekeeping.
                  </p>
                </div>

                <button
                  onClick={onBackupData}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  Download Complete System Backup (.json)
                </button>
              </div>

              {/* 2. Restore Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#f7b944] flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800">Restore System Backup</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Upload a previously generated system backup JSON file to restore all vouchers, users, and workspace configurations.
                  </p>

                  {restoreSuccess && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {restoreSuccess}
                    </div>
                  )}

                  {restoreError && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      {restoreError}
                    </div>
                  )}
                </div>

                <label className="w-full bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4" />
                  Upload & Restore Backup JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileRestore}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

            {/* 3. Wipe All Data Card */}
            <div className="bg-rose-50/60 rounded-2xl border border-rose-200 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-rose-900">Danger Zone: Wipe All Financial Data</h3>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    Permanently clear all recorded inward & outward vouchers, reset categories to clean defaults, and erase history. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsWipeModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  Wipe All Register Data
                </button>
              </div>
            </div>

          </motion.div>
        )}



      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT CATEGORY                               */}
      {/* ======================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {catError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  {catError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Travel & Site Visits"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Register Type</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as 'IN' | 'OUT' | 'BOTH')}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] rounded-xl text-xs cursor-pointer font-semibold"
                >
                  <option value="OUT">Outward Expense</option>
                  <option value="IN">Inward Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color Tag Accent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-xs font-mono text-slate-600">{catColor}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT USER                                   */}
      {/* ======================================================== */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800">
                {editingUser ? 'Edit System User' : 'Create New System User'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {userError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  {userError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={userEmpId}
                  onChange={(e) => setUserEmpId(e.target.value)}
                  placeholder="e.g. OEPL-104"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username / Login Identifier</label>
                <input
                  type="text"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  disabled={!!editingUser}
                  placeholder="e.g. ramesh"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showModalPassword ? "text" : "password"}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                    className="w-full py-2.5 pl-3 pr-10 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                    title={showModalPassword ? "Hide Password" : "Show Password"}
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Access Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] rounded-xl text-xs cursor-pointer font-semibold"
                >
                  <option value="CUSTODIAN">User / Petty Cash Custodian</option>
                  <option value="ADMIN">System Administrator</option>
                  <option value="AUDITOR">Auditor</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  Save User
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRM DELETE USER                               */}
      {/* ======================================================== */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-bold text-sm text-slate-800">Confirm User Deletion</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to revoke and delete user <strong className="text-slate-800 font-mono">{deleteConfirmUser}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteUser(deleteConfirmUser);
                  setDeleteConfirmUser(null);
                }}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Delete User
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CATEGORY DELETE CONFIRMATION                      */}
      {/* ======================================================== */}
      {deleteConfirmCatName && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4"
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Category Deletion</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete the category <span className="font-bold text-slate-800">"{deleteConfirmCatName}"</span>?
                This category is not involved in any recorded transactions and will be removed permanently.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCatName(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(deleteConfirmCatName);
                  setDeleteConfirmCatName(null);
                }}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: WIPE ALL DATA CONFIRMATION                        */}
      {/* ======================================================== */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-rose-200 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">Security Check: Wipe Data</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete all inward/outward vouchers and reset financial registers.
              To confirm, type <strong className="text-rose-600 font-mono select-all">WIPE</strong> in the box below:
            </p>

            <input
              type="text"
              value={wipeConfirmInput}
              onChange={(e) => setWipeConfirmInput(e.target.value)}
              placeholder="Type WIPE here"
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 focus:border-rose-500 rounded-xl text-xs font-mono uppercase tracking-widest font-bold"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsWipeModalOpen(false)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={wipeConfirmInput.trim().toUpperCase() !== 'WIPE'}
                onClick={handleWipeDataConfirm}
                className="py-2 px-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
              >
                Confirm Data Wipe
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
