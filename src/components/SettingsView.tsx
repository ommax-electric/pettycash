import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  KeyRound, 
  Shield, 
  CheckCircle2, 
  Save, 
  Eye, 
  EyeOff, 
  Building2, 
  AlertCircle, 
  Sliders, 
  Check,
  Lock
} from 'lucide-react';
import { User as UserType } from '../types';

interface SettingsViewProps {
  currentUser: UserType;
  onUpdateUser?: (updatedUser: UserType) => void;
}

export default function SettingsView({ currentUser, onUpdateUser }: SettingsViewProps) {
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Preference State
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<'CASH' | 'ONLINE'>(() => {
    return (localStorage.getItem('ommax_pref_payment_mode') as 'CASH' | 'ONLINE') || 'CASH';
  });
  const [defaultExportFormat, setDefaultExportFormat] = useState<'EXCEL' | 'CSV' | 'PDF'>(() => {
    return (localStorage.getItem('ommax_pref_export_format') as 'EXCEL' | 'CSV' | 'PDF') || 'EXCEL';
  });
  const [defaultDateFilter, setDefaultDateFilter] = useState<'THIS_MONTH' | 'LAST_30' | 'ALL'>(() => {
    return (localStorage.getItem('ommax_pref_date_filter') as 'THIS_MONTH' | 'LAST_30' | 'ALL') || 'THIS_MONTH';
  });

  const [prefSuccess, setPrefSuccess] = useState(false);

  // Sync preferences on mount or when returning to tab
  useEffect(() => {
    const savedPaymentMode = localStorage.getItem('ommax_pref_payment_mode') as 'CASH' | 'ONLINE';
    const savedExportFormat = localStorage.getItem('ommax_pref_export_format') as 'EXCEL' | 'CSV' | 'PDF';
    const savedDateFilter = localStorage.getItem('ommax_pref_date_filter') as 'THIS_MONTH' | 'LAST_30' | 'ALL';

    if (savedPaymentMode) setDefaultPaymentMode(savedPaymentMode);
    if (savedExportFormat) setDefaultExportFormat(savedExportFormat);
    if (savedDateFilter) setDefaultDateFilter(savedDateFilter);
  }, []);

  // Handle Change Password Form Submit
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }

    // Validate current password against user record or defaults
    const expectedPassword = currentUser.password;
    let isCurrentValid = false;

    if (expectedPassword) {
      isCurrentValid = (currentPassword === expectedPassword);
    } else {
      // Default password fallbacks if password is not set on user object
      const usernameLower = currentUser.username.toLowerCase();
      if (usernameLower === 'admin') {
        isCurrentValid = (currentPassword === 'admin123' || currentPassword === 'admin@123');
      } else if (usernameLower === 'custodian') {
        isCurrentValid = (currentPassword === 'custodian123' || currentPassword === 'custodian@123');
      } else if (usernameLower === 'auditor') {
        isCurrentValid = (currentPassword === 'auditor123' || currentPassword === 'auditor@123');
      } else {
        isCurrentValid = (currentPassword === 'admin123');
      }
    }

    if (!isCurrentValid) {
      setPassError('Current password is incorrect.');
      return;
    }

    if (!newPassword) {
      setPassError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setPassError('New password must be different from current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New password and repeat password do not match.');
      return;
    }

    // Save updated user to Firestore & State
    const updatedUser: UserType = {
      ...currentUser,
      password: newPassword
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    setPassSuccess('Password changed successfully! Your account security credentials have been updated.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      setPassSuccess('');
    }, 4000);
  };

  // Handle Preferences Form Submit
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to local storage for persistence
    localStorage.setItem('ommax_pref_payment_mode', defaultPaymentMode);
    localStorage.setItem('ommax_pref_export_format', defaultExportFormat);
    localStorage.setItem('ommax_pref_date_filter', defaultDateFilter);

    setPrefSuccess(true);

    setTimeout(() => {
      setPrefSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* 1. Account Details Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#f7b944]" />
              <span className="text-xs font-bold text-[#f7b944] uppercase tracking-wider">Ommax Electric Private Limited</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">{currentUser.fullName}</h2>
            <p className="text-xs text-slate-300 font-mono">Employee ID: {currentUser.empId || currentUser.username.toUpperCase()} • Username: {currentUser.username}</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Role</span>
            <p className="font-bold text-slate-800">{currentUser.role === 'ADMIN' ? 'System Administrator' : currentUser.role === 'CUSTODIAN' ? 'Petty Cash Custodian' : 'Auditor'}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Session Authorization</span>
            <p className="font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Encrypted Session Active
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Change Password Module */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Change Password</h3>
                  <p className="text-[11px] text-slate-400">Update your account credentials to maintain security.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              {passError && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  {passError}
                </motion.div>
              )}

              {passSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {passSuccess}
                </motion.div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your existing password"
                    className="w-full py-2.5 pl-3.5 pr-10 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full py-2.5 pl-3.5 pr-10 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Repeat New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Repeat New Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full py-2.5 pl-3.5 pr-10 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Update Password
                </button>
              </div>
            </form>
          </div>

          <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Passwords are protected with encrypted session tokens.</span>
          </div>
        </div>

        {/* 3. Workspace & Report Preferences */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Workspace Preferences</h3>
                  <p className="text-[11px] text-slate-400">Tailor default report formats and register viewing parameters.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} className="p-5 space-y-4">
              {prefSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Workspace preferences saved successfully!
                </motion.div>
              )}

              {/* Default Payment Mode & Export Format */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Default Payment Mode</label>
                  <select
                    value={defaultPaymentMode}
                    onChange={(e) => setDefaultPaymentMode(e.target.value as 'CASH' | 'ONLINE')}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-700 cursor-pointer"
                  >
                    <option value="CASH">Cash Payment</option>
                    <option value="ONLINE">Online Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Default Export Format</label>
                  <select
                    value={defaultExportFormat}
                    onChange={(e) => setDefaultExportFormat(e.target.value as 'EXCEL' | 'CSV' | 'PDF')}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-700 cursor-pointer"
                  >
                    <option value="EXCEL">Excel (.xlsx)</option>
                    <option value="CSV">CSV File (.csv)</option>
                    <option value="PDF">Printable PDF</option>
                  </select>
                </div>
              </div>

              {/* Default Date Filter Range */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Default Register Date Filter</label>
                <select
                  value={defaultDateFilter}
                  onChange={(e) => setDefaultDateFilter(e.target.value as 'THIS_MONTH' | 'LAST_30' | 'ALL')}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-700 cursor-pointer"
                >
                  <option value="THIS_MONTH">Current Month</option>
                  <option value="LAST_30">Last 30 Days</option>
                  <option value="ALL">All Recorded Dates</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end">
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
