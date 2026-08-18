import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Building2, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  X, 
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { CRMOpportunity, CRMAccount, CRMContact, CRMSettings, OpportunityStage, formatCRMIDate } from '../../crm/types';
import { User, AppSettings } from '../../types';

interface CRMOpportunitiesViewProps {
  opportunities: CRMOpportunity[];
  accounts: CRMAccount[];
  contacts: CRMContact[];
  crmSettings: CRMSettings;
  currentUser: User;
  appSettings?: AppSettings;
  onAddOpportunity: (opp: Omit<CRMOpportunity, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateOpportunity: (opp: CRMOpportunity) => Promise<void>;
  onDeleteOpportunity: (id: string) => Promise<void>;
}

export default function CRMOpportunitiesView({
  opportunities,
  accounts,
  contacts,
  crmSettings,
  currentUser,
  appSettings,
  onAddOpportunity,
  onUpdateOpportunity,
  onDeleteOpportunity
}: CRMOpportunitiesViewProps) {
  const currencySymbol = appSettings?.currencySymbol || crmSettings.defaultCurrency || '₹';

  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<CRMOpportunity | null>(null);
  const [deletingOppId, setDeletingOppId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    accountId: accounts[0]?.id || '',
    accountName: accounts[0]?.name || '',
    contactId: '',
    contactName: '',
    amount: 0,
    stage: 'PROSPECTING' as OpportunityStage,
    probability: 10,
    expectedCloseDate: '',
    leadSource: crmSettings.leadSources[0] || 'Direct Referral',
    assignedTo: currentUser.fullName,
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      accountId: accounts[0]?.id || '',
      accountName: accounts[0]?.name || '',
      contactId: '',
      contactName: '',
      amount: 0,
      stage: 'PROSPECTING',
      probability: 10,
      expectedCloseDate: '',
      leadSource: crmSettings.leadSources[0] || 'Direct Referral',
      assignedTo: currentUser.fullName,
      notes: ''
    });
    setEditingOpp(null);
  };

  const handleOpenAdd = (defaultStage?: OpportunityStage) => {
    resetForm();
    if (defaultStage) {
      const stageConfig = crmSettings.pipelineStages.find(s => s.id === defaultStage);
      setFormData(prev => ({
        ...prev,
        stage: defaultStage,
        probability: stageConfig?.probability || 10
      }));
    }
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (opp: CRMOpportunity) => {
    setEditingOpp(opp);
    setFormData({
      title: opp.title,
      accountId: opp.accountId,
      accountName: opp.accountName,
      contactId: opp.contactId || '',
      contactName: opp.contactName || '',
      amount: opp.amount,
      stage: opp.stage,
      probability: opp.probability,
      expectedCloseDate: opp.expectedCloseDate || '',
      leadSource: opp.leadSource || crmSettings.leadSources[0] || 'Direct Referral',
      assignedTo: opp.assignedTo || currentUser.fullName,
      notes: opp.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleStageChange = (newStage: OpportunityStage) => {
    const stageConfig = crmSettings.pipelineStages.find(s => s.id === newStage);
    setFormData(prev => ({
      ...prev,
      stage: newStage,
      probability: stageConfig ? stageConfig.probability : prev.probability
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.accountId) return;

    setIsSaving(true);
    try {
      const selectedAcc = accounts.find(a => a.id === formData.accountId);
      const accName = selectedAcc ? selectedAcc.name : formData.accountName;

      const selectedCon = contacts.find(c => c.id === formData.contactId);
      const conName = selectedCon ? `${selectedCon.firstName} ${selectedCon.lastName}` : formData.contactName;

      if (editingOpp) {
        await onUpdateOpportunity({
          ...editingOpp,
          ...formData,
          accountName: accName,
          contactName: conName,
          updatedAt: new Date().toISOString()
        });
      } else {
        await onAddOpportunity({
          ...formData,
          accountName: accName,
          contactName: conName
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

  const handleQuickMoveStage = async (opp: CRMOpportunity, nextStage: OpportunityStage) => {
    const stageConfig = crmSettings.pipelineStages.find(s => s.id === nextStage);
    try {
      await onUpdateOpportunity({
        ...opp,
        stage: nextStage,
        probability: stageConfig ? stageConfig.probability : opp.probability,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error moving stage:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      await onDeleteOpportunity(id);
      setDeletingOppId(null);
    } catch (err) {
      console.error('Error deleting deal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const matchesSearch = 
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.contactName && opp.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        opp.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStage = selectedStageFilter === 'ALL' || opp.stage === selectedStageFilter;

      return matchesSearch && matchesStage;
    });
  }, [opportunities, searchTerm, selectedStageFilter]);

  // Group by stage for Kanban
  const kanbanColumns = useMemo(() => {
    return crmSettings.pipelineStages.map(stage => {
      const items = filteredOpportunities.filter(o => o.stage === stage.id);
      const totalVal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      return {
        ...stage,
        items,
        totalVal
      };
    });
  }, [crmSettings, filteredOpportunities]);

  return (
    <div className="space-y-6">
      
      {/* 1. CONTROLS HEADER */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        
        {/* Search, Filter & View Toggle */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
          <div className="relative flex-1 min-w-0 sm:min-w-[220px] max-w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals by title, company, or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]/50 focus:border-[#f7b944]"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
            <select
              value={selectedStageFilter}
              onChange={e => setSelectedStageFilter(e.target.value)}
              className="py-2.5 sm:py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f7b944]/50 w-full"
            >
              <option value="ALL">All Stages</option>
              {crmSettings.pipelineStages.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setViewMode('KANBAN')}
                className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'KANBAN' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'LIST' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Create Deal Button */}
        <button
          onClick={() => handleOpenAdd()}
          className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-extrabold shadow-sm hover:bg-[#e5aa3b] transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          New Opportunity
        </button>
      </div>

      {/* 2. KANBAN PIPELINE BOARD */}
      {viewMode === 'KANBAN' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
          {kanbanColumns.map(column => (
            <div 
              key={column.id} 
              className="w-80 shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col max-h-[85vh]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }}></span>
                  <h4 className="font-extrabold text-xs text-slate-900">{column.label}</h4>
                  <span className="px-1.5 py-0.2 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">
                    {column.items.length}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenAdd(column.id)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                  title={`Add deal to ${column.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Total Column Amount Banner */}
              <div className="bg-white/80 border border-slate-200/50 rounded-xl py-1 px-2.5 mb-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Stage Value:</span>
                <span className="font-extrabold text-slate-900 font-mono">
                  {currencySymbol}{column.totalVal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {column.items.map(opp => (
                  <div
                    key={opp.id}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                        {opp.title}
                      </h5>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(opp)}
                          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeletingOppId(opp.id)}
                          className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1 text-[11px]">
                      <p className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{opp.accountName}</span>
                      </p>
                      {opp.contactName && (
                        <p className="text-slate-400 flex items-center gap-1.5 truncate text-[10px]">
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{opp.contactName}</span>
                        </p>
                      )}
                    </div>

                    {/* Commercial Value & Probability */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Deal Amount</span>
                        <span className="font-black text-xs text-slate-900 font-mono">
                          {currencySymbol}{Number(opp.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Prob.</span>
                        <span className="font-bold text-xs text-slate-700">
                          {opp.probability}%
                        </span>
                      </div>
                    </div>

                    {/* Stage quick advance buttons */}
                    <div className="mt-3 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono">{opp.expectedCloseDate ? formatCRMIDate(opp.expectedCloseDate) : 'No close date'}</span>
                      
                      <div className="flex items-center gap-1">
                        {column.id !== 'CLOSED_WON' && (
                          <button
                            onClick={() => handleQuickMoveStage(opp, 'CLOSED_WON')}
                            className="p-1 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Mark Won"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {column.id !== 'CLOSED_LOST' && (
                          <button
                            onClick={() => handleQuickMoveStage(opp, 'CLOSED_LOST')}
                            className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Mark Lost"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                ))}

                {column.items.length === 0 && (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-[11px] text-slate-400">
                    No deals in this stage
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 3. LIST VIEW */}
      {viewMode === 'LIST' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Opportunity Title</th>
                  <th className="py-3.5 px-4">Client Account</th>
                  <th className="py-3.5 px-4">Pipeline Stage</th>
                  <th className="py-3.5 px-4 text-right">Value ({currencySymbol})</th>
                  <th className="py-3.5 px-4 text-center">Probability</th>
                  <th className="py-3.5 px-4">Expected Close</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOpportunities.map(opp => {
                  const stageConfig = crmSettings.pipelineStages.find(s => s.id === opp.stage);
                  return (
                    <tr key={opp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900">{opp.title}</p>
                        <span className="text-[10px] font-mono text-slate-400">{opp.id}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{opp.accountName}</p>
                        <p className="text-[10px] text-slate-400">{opp.contactName || 'Direct'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono"
                          style={{ 
                            backgroundColor: `${stageConfig?.color || '#64748b'}15`,
                            color: stageConfig?.color || '#64748b',
                            border: `1px solid ${stageConfig?.color || '#64748b'}30`
                          }}
                        >
                          {stageConfig?.label || opp.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        {currencySymbol}{Number(opp.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {opp.probability}%
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {opp.expectedCloseDate ? formatCRMIDate(opp.expectedCloseDate) : 'TBD'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(opp)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit Deal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingOppId(opp.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Deal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ADD / EDIT OPPORTUNITY MODAL */}
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
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#f7b944]/20 border border-[#f7b944]/40 flex items-center justify-center text-[#f7b944]">
                    <Target className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingOpp ? 'Edit Opportunity' : 'Create New Opportunity'}
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
                
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deal / Project Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500kVA Transformer & HT Panel Supply"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client Account *</label>
                    <select
                      required
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
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Stakeholder Contact</label>
                    <select
                      value={formData.contactId}
                      onChange={e => {
                        const con = contacts.find(c => c.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          contactId: e.target.value,
                          contactName: con ? `${con.firstName} ${con.lastName}` : ''
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    >
                      <option value="">-- Direct Account --</option>
                      {contacts
                        .filter(c => !formData.accountId || c.accountId === formData.accountId)
                        .map(con => (
                          <option key={con.id} value={con.id}>{con.firstName} {con.lastName} ({con.designation || 'Contact'})</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Commercial Value ({currencySymbol}) *</label>
                    <input
                      type="number"
                      required
                      placeholder="1850000"
                      value={formData.amount || ''}
                      onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Close Date</label>
                    <input
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pipeline Stage</label>
                    <select
                      value={formData.stage}
                      onChange={e => handleStageChange(e.target.value as OpportunityStage)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    >
                      {crmSettings.pipelineStages.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Probability (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={e => setFormData({ ...formData, probability: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lead Source</label>
                    <select
                      value={formData.leadSource}
                      onChange={e => setFormData({ ...formData, leadSource: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    >
                      {crmSettings.leadSources.map(src => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Account Executive</label>
                    <input
                      type="text"
                      value={formData.assignedTo}
                      onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Commercial Scope & Scope Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Project delivery milestones, quotation revisions, payment schedule..."
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
                    {isSaving ? 'Saving...' : editingOpp ? 'Save Changes' : 'Create Opportunity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. DELETE CONFIRMATION MODAL */}
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
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
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
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deletingOppId)}
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
