import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, XCircle, IndianRupee, Clock,
  Eye, FileText, Check, X, Paperclip, ExternalLink
} from 'lucide-react';
import { Transaction, CategoryLimit, User as UserType, AppSettings, formatDateToDMY, formatISTDateTime } from '../types';
import { openAttachmentInNewTab, sortTransactionsByIdDesc, isAssignedManagerForTxn, isMatchUserIdentifier } from '../utils';

interface ApprovalsViewProps {
  transactions: Transaction[];
  categories: CategoryLimit[];
  currentUser: UserType;
  users: UserType[];
  onApproveRequest: (id: string, approverName: string) => void;
  onPayRequest: (id: string, paidBy: string) => void;
  onRejectRequest: (id: string, reason: string, rejectedBy: string) => void;
  appSettings?: AppSettings;
}

export default function ApprovalsView({
  transactions,
  currentUser,
  users = [],
  onApproveRequest,
  onPayRequest,
  onRejectRequest,
  appSettings
}: ApprovalsViewProps) {
  const currencySymbol = appSettings?.currencySymbol || '₹';

  // Helper resolvers to convert generic role fallbacks to real user names
  const isGenericRoleName = (str: string | undefined | null): boolean => {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    const genericTerms = [
      'administrator', 'admin', 'manager', 'custodian', 'auditor', 'user',
      'administrator / manager', 'manager / admin', 'custodian / admin',
      'admin user', 'manager user', 'custodian user', 'auditor user', 'role'
    ];
    return genericTerms.some(term => s === term || s === term + 's');
  };

  const resolveApproverName = (txn: Transaction) => {
    const raw = txn.approvedBy || txn.approverName;
    if (raw && !isGenericRoleName(raw)) {
      return raw;
    }
    const mgr = users.find(u => (u.role === 'MANAGER' || u.role === 'ADMIN') && u.fullName && !isGenericRoleName(u.fullName));
    if (mgr?.fullName) return mgr.fullName;
    return 'Mohan';
  };

  const resolvePayerName = (txn: Transaction) => {
    const raw = txn.paidBy;
    if (raw && !isGenericRoleName(raw)) {
      return raw;
    }
    const custodian = users.find(u => (u.role === 'CUSTODIAN' || u.role === 'ADMIN') && u.fullName && !isGenericRoleName(u.fullName));
    if (custodian?.fullName) return custodian.fullName;
    return 'David Vance';
  };

  const resolveRejecterName = (txn: Transaction) => {
    const raw = txn.rejectedBy;
    if (raw && !isGenericRoleName(raw)) {
      return raw;
    }
    const mgr = users.find(u => (u.role === 'MANAGER' || u.role === 'ADMIN') && u.fullName && !isGenericRoleName(u.fullName));
    if (mgr?.fullName) return mgr.fullName;
    return 'Mohan';
  };

  const getAssignedManagerName = (txn: Transaction) => {
    const reqStr = (txn.requestedBy || txn.merchant || '').trim();
    const reqUser = users.find(u => 
      isMatchUserIdentifier(u.fullName, reqStr) ||
      isMatchUserIdentifier(u.username, reqStr) ||
      isMatchUserIdentifier(u.email, reqStr) ||
      isMatchUserIdentifier(u.empId, reqStr)
    );
    if (reqUser?.reportingTo) {
      return reqUser.reportingTo;
    }
    if (txn.approverName && !isGenericRoleName(txn.approverName)) {
      return txn.approverName;
    }
    return 'Admin';
  };

  const getEffectiveUserFullName = () => {
    if (currentUser?.fullName && !isGenericRoleName(currentUser.fullName)) {
      return currentUser.fullName;
    }
    const mgr = users.find(u => u.role === 'MANAGER' && u.fullName);
    if (currentUser?.role === 'ADMIN') return 'Administrator';
    if (currentUser?.role === 'CUSTODIAN') return 'David Vance';
    if (currentUser?.role === 'MANAGER') return mgr?.fullName || 'Mohan';
    return mgr?.fullName || 'Mohan';
  };

  const [activeTab, setActiveTab] = useState<'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'HISTORY'>('PENDING_APPROVAL');
  
  // Modals state
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [rejectingTxnId, setRejectingTxnId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Dynamic Confirmation Popup State
  const [confirmApprovalPopup, setConfirmApprovalPopup] = useState<{
    type: 'APPROVE' | 'PAY';
    txn: Transaction;
    userName: string;
    activeColorBorderClass: string;
    onConfirm: () => void;
  } | null>(null);

  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Check user role privileges
  const isAdminOrCustodian = currentUser.role === 'ADMIN' || currentUser.role === 'CUSTODIAN';

  // Count items per queue
  const pendingApprovalTxns = transactions.filter(t => 
    t.type === 'OUT' && 
    t.status === 'PENDING' && 
    isAssignedManagerForTxn(t, currentUser, users)
  );
  const pendingPaymentTxns = transactions.filter(t => t.type === 'OUT' && t.status === 'APPROVED');
  const historyTxns = transactions.filter(t => t.type === 'OUT' && (t.status === 'PAID' || t.status === 'REJECTED'));

  // Get current active tab list
  const getTabTransactions = () => {
    if (activeTab === 'PENDING_APPROVAL') return pendingApprovalTxns;
    if (activeTab === 'PENDING_PAYMENT') return pendingPaymentTxns;
    return historyTxns;
  };

  const currentList = sortTransactionsByIdDesc(getTabTransactions());

  const triggerSuccessAlert = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleConfirmApprove = (txn: Transaction) => {
    const userName = getEffectiveUserFullName();
    setConfirmApprovalPopup({
      type: 'APPROVE',
      txn,
      userName,
      activeColorBorderClass: 'border-amber-500',
      onConfirm: () => {
        onApproveRequest(txn.id, userName);
        triggerSuccessAlert(`Voucher #${txn.reference || txn.id} successfully APPROVED! Sent for cash disbursement.`);
        setConfirmApprovalPopup(null);
      }
    });
  };

  const handleConfirmPay = (txn: Transaction) => {
    const userName = getEffectiveUserFullName();
    setConfirmApprovalPopup({
      type: 'PAY',
      txn,
      userName,
      activeColorBorderClass: 'border-blue-600',
      onConfirm: () => {
        onPayRequest(txn.id, userName);
        triggerSuccessAlert(`Voucher #${txn.reference || txn.id} successfully DISBURSED & MARKED AS PAID!`);
        setConfirmApprovalPopup(null);
      }
    });
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTxnId) return;
    if (!rejectionReason.trim()) {
      setRejectError('Please enter a reason for rejecting this petty cash claim.');
      return;
    }

    onRejectRequest(rejectingTxnId, rejectionReason.trim(), getEffectiveUserFullName());
    triggerSuccessAlert(`Petty cash claim successfully REJECTED.`);
    setRejectingTxnId(null);
    setRejectionReason('');
    setRejectError('');
  };

  return (
    <div className="space-y-5">
      {/* Success Notification Alert */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold">{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg('')} className="p-1 hover:bg-emerald-500/20 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNIFIED CONTAINER CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-6">
        
        {/* SUB-TABS WITH UNIFORM FONT WEIGHT & SIZE */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('PENDING_APPROVAL')}
            className={`flex items-center space-x-2 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl font-medium text-xs transition-all cursor-pointer ${
              activeTab === 'PENDING_APPROVAL'
                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Pending Manager Approval</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'PENDING_APPROVAL' 
                ? 'bg-white text-amber-600' 
                : 'bg-amber-500 text-white'
            }`}>
              {pendingApprovalTxns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING_PAYMENT')}
            className={`flex items-center space-x-2 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl font-medium text-xs transition-all cursor-pointer ${
              activeTab === 'PENDING_PAYMENT'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5 shrink-0" />
            <span>Approved - Ready for Cash Issue</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'PENDING_PAYMENT' 
                ? 'bg-white text-blue-600' 
                : 'bg-blue-600 text-white'
            }`}>
              {pendingPaymentTxns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center space-x-2 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl font-medium text-xs transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Completed / History</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'HISTORY'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-700 text-white'
            }`}>
              {historyTxns.length}
            </span>
          </button>
        </div>

        {/* CONTENT QUEUE */}
        {currentList.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No requests in this queue</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              There are currently no petty cash items waiting for action in this category.
            </p>
          </div>
        ) : (
          <div>
            {/* 1. DESKTOP RESPONSIVE TABLE (MD & UP) */}
            <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full min-w-[820px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-2.5 sm:px-3">Voucher #</th>
                    <th className="py-3 px-2.5 sm:px-3">Date</th>
                    <th className="py-3 px-2.5 sm:px-3">Claimant / Paid To</th>
                    <th className="py-3 px-2.5 sm:px-3">Category</th>
                    <th className="py-3 px-2.5 sm:px-3">Particulars</th>
                    <th className="py-3 px-2.5 sm:px-3 text-right">Amount</th>
                    <th className="py-3 px-2.5 sm:px-3">Status</th>
                    <th className="py-3 px-2.5 sm:px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {currentList.map((txn) => {
                    const isPending = txn.status === 'PENDING';
                    const isApproved = txn.status === 'APPROVED';
                    const isPaid = txn.status === 'PAID';
                    const isRejected = txn.status === 'REJECTED';

                    return (
                      <tr key={txn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-2.5 sm:px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          #{txn.reference || txn.id}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                          {formatDateToDMY(txn.date)}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{txn.merchant || txn.requestedBy}</span>
                          {isPending && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate mt-0.5">
                              Approver: {getAssignedManagerName(txn)}
                            </span>
                          )}
                          {!isPending && txn.requestedBy && txn.requestedBy !== txn.merchant && (
                            <span className="block text-[10px] text-slate-400 font-normal truncate">Req: {txn.requestedBy}</span>
                          )}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {txn.category}
                          </span>
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={txn.description}>
                          {txn.description || 'N/A'}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 text-right font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {currencySymbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                          {isPending && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              Pending Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Approved (Unpaid)
                            </span>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Paid
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedTxn(txn)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>                             {/* Pending Manager Approval Actions */}
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleConfirmApprove(txn)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>

                                <button
                                  onClick={() => setRejectingTxnId(txn.id)}
                                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* Payment Issue Action for Admin / Custodian */}
                            {isApproved && isAdminOrCustodian && (
                              <button
                                onClick={() => handleConfirmPay(txn)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <IndianRupee className="w-3.5 h-3.5" />
                                <span>Issue Cash</span>
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

            {/* 2. MOBILE RESPONSIVE CARDS LAYOUT (SM & BELOW) */}
            <div className="block md:hidden space-y-3">
              {currentList.map((txn) => {
                const isPending = txn.status === 'PENDING';
                const isApproved = txn.status === 'APPROVED';
                const isPaid = txn.status === 'PAID';
                const isRejected = txn.status === 'REJECTED';

                return (
                  <div 
                    key={txn.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    {/* CARD HEADER */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          #{txn.reference || txn.id}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatDateToDMY(txn.date)}
                        </span>
                      </div>

                      {/* STATUS BADGE */}
                      <div>
                        {isPending && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            Pending
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                            Approved
                          </span>
                        )}
                        {isPaid && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Paid
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CARD BODY */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {txn.merchant}
                        </h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {txn.category}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-black text-slate-900 dark:text-slate-100 block">
                          {currencySymbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {txn.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg leading-relaxed">
                        {txn.description}
                      </p>
                    )}

                    {/* CARD ACTION FOOTER */}
                    <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="p-2 rounded-lg text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isPending && (
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button
                            onClick={() => handleConfirmApprove(txn)}
                            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => setRejectingTxnId(txn.id)}
                            className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {isApproved && isAdminOrCustodian && (
                        <button
                          onClick={() => handleConfirmPay(txn)}
                          className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <IndianRupee className="w-4 h-4" />
                          <span>Issue Cash</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectingTxnId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span>Reject Petty Cash Claim</span>
                </h3>
                <button onClick={() => setRejectingTxnId(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleConfirmReject} className="space-y-4 mt-4">
                {rejectError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold">
                    {rejectError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Rejection Reason / Comments <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for rejecting this claim..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingTxnId(null)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition-colors cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voucher Details View Modal */}
      <AnimatePresence>
        {selectedTxn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Voucher Details</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                    #{selectedTxn.reference || selectedTxn.id}
                  </h3>
                </div>
                <button onClick={() => setSelectedTxn(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 my-4 text-sm">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block">Claimant / Paid To</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTxn.merchant}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Amount</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 text-base">
                      {currencySymbol}{selectedTxn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDateToDMY(selectedTxn.date)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Category</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTxn.category}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-semibold mb-1">Particulars / Description</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs leading-relaxed border border-slate-100 dark:border-slate-800">
                    {selectedTxn.description || 'No particulars recorded.'}
                  </p>
                </div>

                {selectedTxn.remarks && (
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold mb-1">Remarks</span>
                    <p className="p-3 bg-amber-500/10 rounded-lg text-amber-800 dark:text-amber-300 text-xs border border-amber-500/20">
                      {selectedTxn.remarks}
                    </p>
                  </div>
                )}

                {/* Attachment Section */}
                {(selectedTxn.receiptUrl || selectedTxn.receiptName) && (
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Attachment / Receipt</span>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <Paperclip className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {selectedTxn.receiptName || 'Attached Receipt File'}
                        </span>
                      </div>
                      {selectedTxn.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => openAttachmentInNewTab(selectedTxn.receiptUrl, selectedTxn.receiptName || undefined)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center space-x-1 shrink-0 shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Attachment</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic shrink-0">Attached</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Detailed Workflow Status Timeline */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Workflow Status</span>
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Requested By:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedTxn.requestedBy || selectedTxn.recordedBy}
                      </span>
                    </div>

                    {(selectedTxn.approvedBy || selectedTxn.approverName || selectedTxn.approvedAt || selectedTxn.status === 'APPROVED' || selectedTxn.status === 'PAID') && (
                      <>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-slate-500 font-medium">Approved By:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {resolveApproverName(selectedTxn)}
                          </span>
                        </div>
                        {selectedTxn.approvedAt && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Approved At:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatISTDateTime(selectedTxn.approvedAt)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {(selectedTxn.paidBy || selectedTxn.paidAt || selectedTxn.status === 'PAID') && (
                      <>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-slate-500 font-medium">Issued / Paid By:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {resolvePayerName(selectedTxn)}
                          </span>
                        </div>
                        {selectedTxn.paidAt && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Issued / Paid At:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                              {formatISTDateTime(selectedTxn.paidAt)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {(selectedTxn.rejectedBy || selectedTxn.rejectedAt || selectedTxn.status === 'REJECTED') && (
                      <>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-slate-500 font-medium">Rejected By:</span>
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {resolveRejecterName(selectedTxn)}
                          </span>
                        </div>
                        {selectedTxn.rejectedAt && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Rejected At:</span>
                            <span className="font-semibold text-red-600 dark:text-red-400 font-mono">
                              {formatISTDateTime(selectedTxn.rejectedAt)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {selectedTxn.status === 'PENDING' && isAssignedManagerForTxn(selectedTxn, currentUser, users) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const t = selectedTxn;
                          setSelectedTxn(null);
                          handleConfirmApprove(t);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const id = selectedTxn.id;
                          setSelectedTxn(null);
                          setRejectingTxnId(id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                  {selectedTxn.status === 'APPROVED' && isAdminOrCustodian && (
                    <button
                      type="button"
                      onClick={() => {
                        const t = selectedTxn;
                        setSelectedTxn(null);
                        handleConfirmPay(t);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Issue Cash</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Confirmation Popup for Approvals / Cash Issue */}
      <AnimatePresence>
        {confirmApprovalPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md bg-white dark:bg-slate-900 border-[1.5px] ${confirmApprovalPopup.activeColorBorderClass} rounded-2xl shadow-2xl p-5 space-y-4`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  <span>
                    {confirmApprovalPopup.type === 'APPROVE' ? 'Confirm Approval' : 'Confirm Cash Disbursement'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setConfirmApprovalPopup(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed py-1">
                {confirmApprovalPopup.type === 'APPROVE' ? (
                  <>
                    Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.userName}</strong>, you are about to approve Voucher{' '}
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">#{confirmApprovalPopup.txn.reference || confirmApprovalPopup.txn.id}</strong> for{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{confirmApprovalPopup.txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> requested by{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.txn.requestedBy || confirmApprovalPopup.txn.merchant || 'User'}</strong> for{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.txn.category}</strong>.
                  </>
                ) : (
                  <>
                    Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.userName}</strong>, you are about to issue cash of{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{confirmApprovalPopup.txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> for Voucher{' '}
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">#{confirmApprovalPopup.txn.reference || confirmApprovalPopup.txn.id}</strong> ({confirmApprovalPopup.txn.category}).
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmApprovalPopup(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmApprovalPopup.onConfirm()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  {confirmApprovalPopup.type === 'APPROVE' ? 'Submit & Confirm' : 'Confirm Cash Issue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
