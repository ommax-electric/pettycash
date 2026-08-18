import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  Edit3, 
  Trash2, 
  Star, 
  X, 
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import { CRMContact, CRMAccount } from '../../crm/types';
import { User, AppSettings } from '../../types';

interface CRMContactsViewProps {
  contacts: CRMContact[];
  accounts: CRMAccount[];
  currentUser: User;
  appSettings?: AppSettings;
  onAddContact: (contact: Omit<CRMContact, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateContact: (contact: CRMContact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
}

export default function CRMContactsView({
  contacts,
  accounts,
  currentUser,
  appSettings,
  onAddContact,
  onUpdateContact,
  onDeleteContact
}: CRMContactsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    accountId: accounts[0]?.id || '',
    accountName: accounts[0]?.name || '',
    designation: '',
    department: '',
    isPrimary: false,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
      accountId: accounts[0]?.id || '',
      accountName: accounts[0]?.name || '',
      designation: '',
      department: '',
      isPrimary: false,
      status: 'ACTIVE',
      notes: ''
    });
    setEditingContact(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (con: CRMContact) => {
    setEditingContact(con);
    setFormData({
      firstName: con.firstName,
      lastName: con.lastName,
      email: con.email,
      phone: con.phone || '',
      mobile: con.mobile || '',
      accountId: con.accountId || '',
      accountName: con.accountName || '',
      designation: con.designation || '',
      department: con.department || '',
      isPrimary: !!con.isPrimary,
      status: con.status,
      notes: con.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.email.trim()) return;

    setIsSaving(true);
    try {
      const selectedAcc = accounts.find(a => a.id === formData.accountId);
      const accName = selectedAcc ? selectedAcc.name : formData.accountName;

      if (editingContact) {
        await onUpdateContact({
          ...editingContact,
          ...formData,
          accountName: accName,
          updatedAt: new Date().toISOString()
        });
      } else {
        await onAddContact({
          ...formData,
          accountName: accName
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
    } catch (err) {
      console.error('Error deleting contact:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(con => {
      const fullName = `${con.firstName} ${con.lastName}`.toLowerCase();
      const matchesSearch = 
        fullName.includes(searchTerm.toLowerCase()) ||
        con.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (con.phone && con.phone.includes(searchTerm)) ||
        (con.designation && con.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (con.accountName && con.accountName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesAccount = selectedAccountId === 'ALL' || con.accountId === selectedAccountId;

      return matchesSearch && matchesAccount;
    });
  }, [contacts, searchTerm, selectedAccountId]);

  return (
    <div className="space-y-6">
      
      {/* 1. CONTROLS HEADER */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        
        {/* Search & Account Filter */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
          <div className="relative flex-1 min-w-0 sm:min-w-[220px] max-w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, role, or company..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]/50 focus:border-[#f7b944]"
            />
          </div>

          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className="py-2.5 sm:py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f7b944]/50 w-full sm:w-auto"
          >
            <option value="ALL">All Accounts / Organizations</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* Add Contact Button */}
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-extrabold shadow-sm hover:bg-[#e5aa3b] transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          New Contact
        </button>
      </div>

      {/* 2. CONTACTS TABLE / GRID */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Contact Stakeholder</th>
                <th className="py-3.5 px-4">Organization / Account</th>
                <th className="py-3.5 px-4">Designation & Dept</th>
                <th className="py-3.5 px-4">Direct Contact</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.map(con => (
                <tr key={con.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Name + Primary Star */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                        {con.firstName.charAt(0)}{con.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-slate-900 text-xs">
                            {con.firstName} {con.lastName}
                          </p>
                          {con.isPrimary && (
                            <span className="p-0.5 rounded-full bg-amber-100 text-amber-700" title="Primary Account Contact">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{con.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Account */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{con.accountName || 'Independent'}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-800">{con.designation || 'Specialist'}</p>
                    <p className="text-[10px] text-slate-400">{con.department || 'General'}</p>
                  </td>

                  {/* Contact Info */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-mono">{con.email}</span>
                      </div>
                      {(con.phone || con.mobile) && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono">{con.mobile || con.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                      con.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {con.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(con)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Edit Contact"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingContactId(con.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContacts.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-extrabold text-slate-700">No contacts found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add stakeholder contacts associated with your enterprise accounts.
            </p>
          </div>
        )}
      </div>

      {/* 3. ADD / EDIT CONTACT MODAL */}
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#f7b944]/20 border border-[#f7b944]/40 flex items-center justify-center text-[#f7b944]">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingContact ? 'Edit Contact' : 'Create New Contact'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Rajesh"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Sharma"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Associated Account / Company</label>
                  <select
                    value={formData.accountId}
                    onChange={e => {
                      const acc = accounts.find(a => a.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        accountId: e.target.value,
                        accountName: acc ? acc.name : ''
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                  >
                    <option value="">-- Independent / None --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="rajesh.sharma@company.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile / Direct Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98201 12345"
                      value={formData.mobile}
                      onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Job Designation</label>
                    <input
                      type="text"
                      placeholder="Head of Procurement"
                      value={formData.designation}
                      onChange={e => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="Supply Chain & Contracts"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPrimary}
                      onChange={e => setFormData({ ...formData, isPrimary: e.target.checked })}
                      className="w-4 h-4 rounded text-[#f7b944] focus:ring-[#f7b944]"
                    />
                    <span className="font-bold text-slate-700">Primary Key Contact for this Account</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Preferences</label>
                  <textarea
                    rows={2}
                    placeholder="Preferred contact hours, direct assistant contact..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-[#f7b944] text-slate-950 font-extrabold hover:bg-[#e5aa3b] transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Saving...' : editingContact ? 'Save Changes' : 'Create Contact'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. DELETE CONFIRMATION MODAL */}
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
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deletingContactId)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 transition-all shadow-xs"
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
