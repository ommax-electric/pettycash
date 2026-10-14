import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, XCircle, IndianRupee, Clock,
  Eye, FileText, Check, X, Paperclip, ExternalLink, ArrowRightLeft,
  HelpCircle, MessageSquareQuote
} from 'lucide-react';
import { Transaction, CategoryLimit, User as UserType, AppSettings, formatDateToDMY, formatISTDateTime, CashAdvance } from '../types';
import { openAttachmentInNewTab, sortTransactionsByIdDesc, isAssignedManagerForTxn, isMatchUserIdentifier } from '../utils';

export type ApprovalItemType = 'EXPENSE' | 'ADVANCE';

export interface UnifiedApprovalItem {
  id: string;
  itemType: ApprovalItemType;
  reference: string;
  date: string;
  claimant: string;
  category: string;
  particulars: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  approverTarget?: string;
  rawTxn?: Transaction;
  rawAdv?: CashAdvance;
}

interface ApprovalsViewProps {
  transactions: Transaction[];
  categories: CategoryLimit[];
  currentUser: UserType;
  users: UserType[];
  advances?: CashAdvance[];
  onApproveRequest: (id: string, approverName: string) => void;
  onPayRequest: (id: string, paidBy: string) => void;
  onRejectRequest: (id: string, reason: string, rejectedBy: string) => void;
  onReRouteRequest?: (id: string, targetManagerName: string, reason: string, reRoutedBy: string) => void;
  onRaiseQuery?: (txn: Transaction, initialMessage: string) => Promise<void> | void;
  onApproveAdvance?: (id: string, approverName: string) => Promise<void> | void;
  onRejectAdvance?: (id: string, reason: string, rejectedBy: string) => Promise<void> | void;
  onDisburseAdvance?: (id: string, paymentType: 'CASH' | 'ONLINE', disbursedDate?: string) => Promise<void> | void;
  onReRouteAdvance?: (id: string, targetManagerName: string, reason: string, reRoutedBy: string) => Promise<void> | void;
  onRaiseAdvanceQuery?: (adv: CashAdvance, initialMessage: string) => Promise<void> | void;
  onCollectAdvanceSettlementCash?: (txnId: string, collectorName: string) => Promise<void> | void;
  appSettings?: AppSettings;
}

export default function ApprovalsView({
  transactions,
  currentUser,
  users = [],
  advances = [],
  onApproveRequest,
  onPayRequest,
  onRejectRequest,
  onReRouteRequest,
  onRaiseQuery,
  onApproveAdvance,
  onRejectAdvance,
  onDisburseAdvance,
  onReRouteAdvance,
  onRaiseAdvanceQuery,
  onCollectAdvanceSettlementCash,
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

  const getAssignedManagerName = (claimant: string, approverExplicit?: string) => {
    if (approverExplicit && !isGenericRoleName(approverExplicit)) {
      return approverExplicit;
    }
    const reqStr = (claimant || '').trim();
    const reqUser = users.find(u => 
      isMatchUserIdentifier(u.fullName, reqStr) ||
      isMatchUserIdentifier(u.username, reqStr) ||
      isMatchUserIdentifier(u.email, reqStr) ||
      isMatchUserIdentifier(u.empId, reqStr)
    );
    if (reqUser?.reportingTo) {
      return reqUser.reportingTo;
    }
    return 'Manager';
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
  const [selectedItem, setSelectedItem] = useState<UnifiedApprovalItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<UnifiedApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Re-Route Modal state (Expenses & Advances)
  const [reRoutingItem, setReRoutingItem] = useState<UnifiedApprovalItem | null>(null);
  const [targetManager, setTargetManager] = useState<string>('');
  const [reRouteReasonInput, setReRouteReasonInput] = useState<string>('');
  const [reRouteError, setReRouteError] = useState<string>('');

  // Query Modal state (Expenses & Advances)
  const [queryingItem, setQueryingItem] = useState<UnifiedApprovalItem | null>(null);
  const [queryInputText, setQueryInputText] = useState<string>('');
  const [queryError, setQueryError] = useState<string>('');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);

  // Dynamic Confirmation Popup State
  const [confirmApprovalPopup, setConfirmApprovalPopup] = useState<{
    type: 'APPROVE' | 'PAY' | 'COLLECT' | 'COMPLETE_SETTLEMENT' | 'ISSUE_EXCESS_CASH';
    item: UnifiedApprovalItem;
    userName: string;
    activeColorBorderClass: string;
    onConfirm: () => void;
  } | null>(null);

  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Check user role privileges
  const isAdminOrCustodian = currentUser.role === 'ADMIN' || currentUser.role === 'CUSTODIAN';
  const isManagerRole = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN'; // Manager and Admin have approval and query/reroute rights

  // Helper to determine if a date or timestamp string falls within the current calendar month
  const isDateInCurrentMonth = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const raw = dateStr.split('T')[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m] = raw.split('-').map(Number);
      return y === curYear && m === curMonth;
    }
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(raw)) {
      const parts = raw.split(/[-/]/).map(Number);
      return parts[2] === curYear && parts[1] === curMonth;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() === curYear && (d.getMonth() + 1) === curMonth;
    }
    return false;
  };

  // 1. Pending Approvals queue (Expenses + Advances)
  const pendingApprovalExpenses: UnifiedApprovalItem[] = transactions
    .filter(t => t.type === 'OUT' && t.status === 'PENDING' && isAssignedManagerForTxn(t, currentUser, users))
    .map(t => ({
      id: t.id,
      itemType: 'EXPENSE',
      reference: t.reference || t.id,
      date: t.date,
      claimant: t.merchant || t.requestedBy || 'Unknown',
      category: t.category,
      particulars: t.description || 'N/A',
      amount: t.amount,
      status: 'PENDING',
      approverTarget: t.approverName,
      rawTxn: t
    }));

  const pendingApprovalAdvances: UnifiedApprovalItem[] = advances
    .filter(a => a.status === 'PENDING_APPROVAL' && isAssignedManagerForTxn(a, currentUser, users))
    .map(a => ({
      id: a.id,
      itemType: 'ADVANCE',
      reference: a.id,
      date: a.requestDate || a.createdAt,
      claimant: a.requestedBy,
      category: a.category || 'Advance',
      particulars: a.purpose,
      amount: a.amount,
      status: 'PENDING',
      approverTarget: a.approverName,
      rawAdv: a
    }));

  const pendingApprovalItems: UnifiedApprovalItem[] = [...pendingApprovalExpenses, ...pendingApprovalAdvances];

  // 2. Pending Payment queue (Approved Expenses + Approved Advances ready for cash issue)
  const pendingPaymentExpenses: UnifiedApprovalItem[] = transactions
    .filter(t => {
      if (t.type !== 'OUT' || t.status !== 'APPROVED') return false;
      const isAdv = t.isAdvanceSettlement || Boolean(t.advanceId);
      const excess = t.excessReimburseAmount || 0;
      const unspent = t.unspentCashToCollect || 0;
      // Advance settlement with no excess cash to disburse and no unspent cash to collect
      // was already paid via advance cash and does not require cash admin payout
      if (isAdv && excess <= 0 && unspent <= 0) return false;
      return true;
    })
    .map(t => ({
      id: t.id,
      itemType: 'EXPENSE',
      reference: t.reference || t.id,
      date: t.date,
      claimant: t.merchant || t.requestedBy || 'Unknown',
      category: t.category,
      particulars: t.description || 'N/A',
      amount: t.amount,
      status: 'APPROVED',
      rawTxn: t
    }));

  const pendingPaymentAdvances: UnifiedApprovalItem[] = advances
    .filter(a => a.status === 'APPROVED')
    .map(a => ({
      id: a.id,
      itemType: 'ADVANCE',
      reference: a.id,
      date: a.requestDate || a.createdAt,
      claimant: a.requestedBy,
      category: a.category || 'Advance',
      particulars: a.purpose,
      amount: a.amount,
      status: 'APPROVED',
      rawAdv: a
    }));

  const pendingPaymentItems: UnifiedApprovalItem[] = [...pendingPaymentExpenses, ...pendingPaymentAdvances];

  // 3. Completed / History queue (Current month)
  const historyExpenses: UnifiedApprovalItem[] = transactions
    .filter(t => 
      t.type === 'OUT' && 
      (t.status === 'PAID' || t.status === 'REJECTED') &&
      (isDateInCurrentMonth(t.paidAt) || isDateInCurrentMonth(t.rejectedAt) || isDateInCurrentMonth(t.date))
    )
    .map(t => ({
      id: t.id,
      itemType: 'EXPENSE',
      reference: t.reference || t.id,
      date: t.date,
      claimant: t.merchant || t.requestedBy || 'Unknown',
      category: t.category,
      particulars: t.description || 'N/A',
      amount: t.amount,
      status: t.status as 'PAID' | 'REJECTED',
      rawTxn: t
    }));

  const historyAdvances: UnifiedApprovalItem[] = advances
    .filter(a => 
      (a.status === 'DISBURSED' || a.status === 'SETTLED' || a.status === 'REJECTED') &&
      (isDateInCurrentMonth(a.disbursedAt) || isDateInCurrentMonth(a.rejectedAt) || isDateInCurrentMonth(a.requestDate))
    )
    .map(a => ({
      id: a.id,
      itemType: 'ADVANCE',
      reference: a.id,
      date: a.requestDate || a.createdAt,
      claimant: a.requestedBy,
      category: a.category || 'Advance',
      particulars: a.purpose,
      amount: a.amount,
      status: a.status === 'REJECTED' ? 'REJECTED' : 'PAID',
      rawAdv: a
    }));

  const historyItems: UnifiedApprovalItem[] = [...historyExpenses, ...historyAdvances];

  // Active list sorted descending
  const currentList = React.useMemo(() => {
    let list: UnifiedApprovalItem[] = [];
    if (activeTab === 'PENDING_APPROVAL') list = pendingApprovalItems;
    else if (activeTab === 'PENDING_PAYMENT') list = pendingPaymentItems;
    else list = historyItems;

    return [...list].sort((a, b) => {
      const d1 = new Date(b.date).getTime() || 0;
      const d2 = new Date(a.date).getTime() || 0;
      if (d1 !== d2) return d1 - d2;
      return b.reference.localeCompare(a.reference);
    });
  }, [activeTab, pendingApprovalItems, pendingPaymentItems, historyItems]);

  const triggerSuccessAlert = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleConfirmApprove = (item: UnifiedApprovalItem) => {
    const userName = getEffectiveUserFullName();
    setConfirmApprovalPopup({
      type: 'APPROVE',
      item,
      userName,
      activeColorBorderClass: 'border-amber-500',
      onConfirm: async () => {
        if (item.itemType === 'ADVANCE' && item.rawAdv) {
          if (onApproveAdvance) await onApproveAdvance(item.rawAdv.id, userName);
          triggerSuccessAlert(`Cash Advance ${item.reference} successfully APPROVED! Ready for cash disbursal.`);
        } else if (item.rawTxn) {
          onApproveRequest(item.rawTxn.id, userName);
          const isAdv = item.rawTxn.isAdvanceSettlement || Boolean(item.rawTxn.advanceId);
          const excess = item.rawTxn.excessReimburseAmount || 0;
          const unspent = item.rawTxn.unspentCashToCollect || 0;
          if (isAdv && excess <= 0 && unspent <= 0) {
            triggerSuccessAlert(`Voucher #${item.reference} APPROVED and SETTLED against Advance! No cash disbursement required.`);
          } else {
            triggerSuccessAlert(`Voucher #${item.reference} successfully APPROVED! Sent for cash disbursement.`);
          }
        }
        setConfirmApprovalPopup(null);
      }
    });
  };

  const handleConfirmPay = (item: UnifiedApprovalItem) => {
    const userName = getEffectiveUserFullName();
    const isAdvSettlement = item.itemType === 'EXPENSE' && (item.rawTxn?.isAdvanceSettlement || Boolean(item.rawTxn?.advanceId));
    const unspentCashToCollect = item.rawTxn?.unspentCashToCollect || 0;
    const excessReimburseAmount = item.rawTxn?.excessReimburseAmount || 0;

    if (isAdvSettlement) {
      if (excessReimburseAmount > 0) {
        setConfirmApprovalPopup({
          type: 'ISSUE_EXCESS_CASH',
          item,
          userName,
          activeColorBorderClass: 'border-amber-600',
          onConfirm: async () => {
            if (onCollectAdvanceSettlementCash && item.rawTxn) {
              await onCollectAdvanceSettlementCash(item.rawTxn.id, userName);
              triggerSuccessAlert(`Disbursed ${currencySymbol}${excessReimburseAmount.toFixed(2)} extra cash reimbursement to ${item.claimant} for Advance #${item.rawTxn.advanceId}! Advance settlement completed.`);
            } else if (item.rawTxn) {
              onPayRequest(item.rawTxn.id, userName);
              triggerSuccessAlert(`Advance settlement for Voucher #${item.reference} recorded with ${currencySymbol}${excessReimburseAmount.toFixed(2)} extra cash paid!`);
            }
            setConfirmApprovalPopup(null);
          }
        });
        return;
      } else if (unspentCashToCollect > 0) {
        setConfirmApprovalPopup({
          type: 'COLLECT',
          item,
          userName,
          activeColorBorderClass: 'border-emerald-600',
          onConfirm: async () => {
            if (onCollectAdvanceSettlementCash && item.rawTxn) {
              await onCollectAdvanceSettlementCash(item.rawTxn.id, userName);
              triggerSuccessAlert(`Collected ${currencySymbol}${unspentCashToCollect.toFixed(2)} unspent cash from ${item.claimant} for Advance #${item.rawTxn.advanceId}! Cash on hand revised.`);
            } else if (item.rawTxn) {
              onPayRequest(item.rawTxn.id, userName);
              triggerSuccessAlert(`Advance settlement for Voucher #${item.reference} recorded as collected!`);
            }
            setConfirmApprovalPopup(null);
          }
        });
        return;
      } else {
        setConfirmApprovalPopup({
          type: 'COMPLETE_SETTLEMENT',
          item,
          userName,
          activeColorBorderClass: 'border-indigo-600',
          onConfirm: async () => {
            if (onCollectAdvanceSettlementCash && item.rawTxn) {
              await onCollectAdvanceSettlementCash(item.rawTxn.id, userName);
              triggerSuccessAlert(`Voucher #${item.reference} settlement completed! No cash disbursed.`);
            } else if (item.rawTxn) {
              onPayRequest(item.rawTxn.id, userName);
              triggerSuccessAlert(`Voucher #${item.reference} settlement completed!`);
            }
            setConfirmApprovalPopup(null);
          }
        });
        return;
      }
    }

    setConfirmApprovalPopup({
      type: 'PAY',
      item,
      userName,
      activeColorBorderClass: 'border-blue-600',
      onConfirm: async () => {
        if (item.itemType === 'ADVANCE' && item.rawAdv) {
          if (onDisburseAdvance) await onDisburseAdvance(item.rawAdv.id, 'CASH');
          triggerSuccessAlert(`Cash Advance ${item.reference} successfully DISBURSED!`);
        } else if (item.rawTxn) {
          onPayRequest(item.rawTxn.id, userName);
          triggerSuccessAlert(`Voucher #${item.reference} successfully DISBURSED & MARKED AS PAID!`);
        }
        setConfirmApprovalPopup(null);
      }
    });
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      setRejectError(`Please enter a reason for rejecting this ${rejectingItem.itemType === 'ADVANCE' ? 'cash advance' : 'petty cash claim'}.`);
      return;
    }

    const userName = getEffectiveUserFullName();
    if (rejectingItem.itemType === 'ADVANCE' && rejectingItem.rawAdv) {
      if (onRejectAdvance) await onRejectAdvance(rejectingItem.rawAdv.id, rejectionReason.trim(), userName);
      triggerSuccessAlert(`Cash Advance ${rejectingItem.reference} successfully REJECTED.`);
    } else if (rejectingItem.rawTxn) {
      onRejectRequest(rejectingItem.rawTxn.id, rejectionReason.trim(), userName);
      triggerSuccessAlert(`Petty cash claim #${rejectingItem.reference} successfully REJECTED.`);
    }

    setRejectingItem(null);
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
              {pendingApprovalItems.length}
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
              {pendingPaymentItems.length}
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
            <span>Completed / History (This Month)</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'HISTORY'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-700 text-white'
            }`}>
              {historyItems.length}
            </span>
          </button>
        </div>

        {/* CONTENT QUEUE */}
        {currentList.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {activeTab === 'HISTORY' ? 'No completed requests this month' : 'No requests in this queue'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {activeTab === 'HISTORY'
                ? 'There are currently no paid, disbursed, or rejected claims recorded for the current month.'
                : 'There are currently no expense or advance items waiting for action in this category.'}
            </p>
          </div>
        ) : (
          <div>
            {/* 1. DESKTOP RESPONSIVE TABLE (MD & UP) */}
            <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full min-w-[850px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-2.5 sm:px-3">Voucher #</th>
                    <th className="py-3 px-2.5 sm:px-3">Type</th>
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
                  {currentList.map((item) => {
                    const isPending = item.status === 'PENDING';
                    const isApproved = item.status === 'APPROVED';
                    const isPaid = item.status === 'PAID';
                    const isRejected = item.status === 'REJECTED';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-2.5 sm:px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {item.itemType === 'EXPENSE' && item.rawTxn?.advanceId ? (
                            <span>{item.rawTxn.advanceId}</span>
                          ) : (
                            <div>#{item.reference || item.id}</div>
                          )}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                          {item.itemType === 'ADVANCE' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              Advance
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                Expense
                              </span>
                              {item.rawTxn?.advanceId && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                  Adv Settlement
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                          {formatDateToDMY(item.date)}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{item.claimant}</span>
                          {isPending && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate mt-0.5">
                              Approver: {getAssignedManagerName(item.claimant, item.approverTarget)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 text-slate-600 dark:text-slate-400 max-w-[200px]" title={item.particulars}>
                          <p className="truncate">{item.particulars || 'N/A'}</p>
                          {isApproved && item.rawTxn?.advanceId && (
                            item.rawTxn.excessReimburseAmount && item.rawTxn.excessReimburseAmount > 0 ? (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300/70">
                                Intimation: Issue {currencySymbol}{item.rawTxn.excessReimburseAmount.toFixed(2)} extra cash to employee
                              </span>
                            ) : item.rawTxn.unspentCashToCollect && item.rawTxn.unspentCashToCollect > 0 ? (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/70">
                                Intimation: Collect {currencySymbol}{item.rawTxn.unspentCashToCollect.toFixed(2)} unspent cash
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                Against Advance {item.rawTxn.advanceId} • No cash issue needed
                              </span>
                            )
                          )}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 text-right font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {currencySymbol}{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                          {isPending && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              Pending Approval
                            </span>
                          )}
                          {isApproved && (
                            item.rawTxn?.advanceId ? (
                              item.rawTxn.excessReimburseAmount && item.rawTxn.excessReimburseAmount > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  <IndianRupee className="w-3 h-3 mr-1" />
                                  Issue Extra Cash
                                </span>
                              ) : item.rawTxn.unspentCashToCollect && item.rawTxn.unspentCashToCollect > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Collect Unspent Cash
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {item.rawTxn?.isFinalSettlement ? 'Settled (Ready to Close)' : 'Partially Settled (Approved)'}
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Approved (Unpaid)
                              </span>
                            )
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {item.itemType === 'ADVANCE' ? 'Disbursed' : 'Paid'}
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
                              onClick={() => setSelectedItem(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Pending Manager Approval Actions */}
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleConfirmApprove(item)}
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs cursor-pointer"
                                  title={`Approve ${item.itemType === 'ADVANCE' ? 'Advance' : 'Request'}`}
                                >
                                  <Check className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    setRejectingItem(item);
                                    setRejectionReason('');
                                    setRejectError('');
                                  }}
                                  className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-xs cursor-pointer"
                                  title={`Reject ${item.itemType === 'ADVANCE' ? 'Advance' : 'Request'}`}
                                >
                                  <X className="w-4 h-4" />
                                </button>

                                {isManagerRole && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setQueryingItem(item);
                                        setQueryInputText('');
                                        setQueryError('');
                                      }}
                                      className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold transition-colors shadow-xs cursor-pointer"
                                      title="Raise Query / Clarification to Submitter"
                                    >
                                      <HelpCircle className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() => {
                                        setReRoutingItem(item);
                                        setTargetManager('');
                                        setReRouteReasonInput('');
                                        setReRouteError('');
                                      }}
                                      className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors shadow-xs cursor-pointer"
                                      title="Re-Route Request to Another Manager"
                                    >
                                      <ArrowRightLeft className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}

                            {/* Payment Issue / Advance Collection Action for Admin / Custodian */}
                            {isApproved && isAdminOrCustodian && (() => {
                              const isAdv = item.itemType === 'EXPENSE' && Boolean(item.rawTxn?.advanceId);
                              const unspent = item.rawTxn?.unspentCashToCollect || 0;
                              const excess = item.rawTxn?.excessReimburseAmount || 0;

                              if (isAdv) {
                                if (excess > 0) {
                                  return (
                                    <button
                                      onClick={() => handleConfirmPay(item)}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                                      title={`Issue ${currencySymbol}${excess.toFixed(2)} extra cash reimbursement to ${item.claimant}`}
                                    >
                                      <IndianRupee className="w-3.5 h-3.5" />
                                      <span>Issue Extra Cash ({currencySymbol}{excess.toLocaleString('en-IN')})</span>
                                    </button>
                                  );
                                }
                                if (unspent > 0) {
                                  return (
                                    <button
                                      onClick={() => handleConfirmPay(item)}
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                                      title={`Collect ${currencySymbol}${unspent.toFixed(2)} unspent cash from ${item.claimant}`}
                                    >
                                      <IndianRupee className="w-3.5 h-3.5" />
                                      <span>Collect Cash ({currencySymbol}{unspent.toLocaleString('en-IN')})</span>
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    onClick={() => handleConfirmPay(item)}
                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                                    title={item.rawTxn?.isFinalSettlement ? "Complete advance settlement (No cash payout required)" : "Confirm partial settlement (No cash payout required)"}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{item.rawTxn?.isFinalSettlement ? "Complete Settlement" : "Confirm Settlement"}</span>
                                  </button>
                                );
                              }

                              return (
                                <button
                                  onClick={() => handleConfirmPay(item)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                                >
                                  <IndianRupee className="w-3.5 h-3.5" />
                                  <span>Issue Cash</span>
                                </button>
                              );
                            })()}
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
              {currentList.map((item) => {
                const isPending = item.status === 'PENDING';
                const isApproved = item.status === 'APPROVED';
                const isPaid = item.status === 'PAID';
                const isRejected = item.status === 'REJECTED';

                return (
                  <div 
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    {/* CARD HEADER */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.itemType === 'EXPENSE' && item.rawTxn?.advanceId ? (
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {item.rawTxn.advanceId}
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            #{item.reference || item.id}
                          </span>
                        )}
                        {item.itemType === 'ADVANCE' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            Advance
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                            Expense
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatDateToDMY(item.date)}
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
                            {item.itemType === 'ADVANCE' ? 'Disbursed' : 'Paid'}
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
                          {item.claimant}
                        </h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-black text-slate-900 dark:text-slate-100 block">
                          {currencySymbol}{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {item.particulars && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg leading-relaxed">
                        {item.particulars}
                      </p>
                    )}

                    {isApproved && item.rawTxn?.advanceId && (
                      item.rawTxn.excessReimburseAmount && item.rawTxn.excessReimburseAmount > 0 ? (
                        <div className="text-[11px] font-black text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5">
                          <span>⚠️ Excess Claim: Issue {currencySymbol}{item.rawTxn.excessReimburseAmount.toFixed(2)} extra cash to {item.claimant} for Advance #{item.rawTxn.advanceId}.</span>
                        </div>
                      ) : item.rawTxn.unspentCashToCollect && item.rawTxn.unspentCashToCollect > 0 ? (
                        <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-center gap-1.5">
                          <span>⚠️ Intimation: Collect {currencySymbol}{item.rawTxn.unspentCashToCollect.toFixed(2)} unspent cash from {item.claimant} for Advance #{item.rawTxn.advanceId}.</span>
                        </div>
                      ) : (
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                          ℹ️ Settled against Advance #{item.rawTxn.advanceId}. No cash issue required.
                        </div>
                      )
                    )}

                    {/* CARD ACTION FOOTER */}
                    <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-2 rounded-lg text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isPending && (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => handleConfirmApprove(item)}
                            className="flex-1 py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                            title="Approve Request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setRejectingItem(item);
                              setRejectionReason('');
                              setRejectError('');
                            }}
                            className="flex-1 py-2 px-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                            title="Reject Request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {isManagerRole && (
                            <>
                              <button
                                onClick={() => {
                                  setQueryingItem(item);
                                  setQueryInputText('');
                                  setQueryError('');
                                }}
                                className="flex-1 py-2 px-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                                title="Raise Query"
                              >
                                <HelpCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setReRoutingItem(item);
                                  setTargetManager('');
                                  setReRouteReasonInput('');
                                  setReRouteError('');
                                }}
                                className="flex-1 py-2 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                                title="Re-Route Request to Another Manager"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {isApproved && isAdminOrCustodian && (() => {
                        const isAdv = item.itemType === 'EXPENSE' && Boolean(item.rawTxn?.advanceId);
                        const unspent = item.rawTxn?.unspentCashToCollect || 0;
                        const excess = item.rawTxn?.excessReimburseAmount || 0;

                        if (isAdv) {
                          if (excess > 0) {
                            return (
                              <button
                                onClick={() => handleConfirmPay(item)}
                                className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <IndianRupee className="w-4 h-4" />
                                <span>Issue Extra Cash ({currencySymbol}{excess.toLocaleString('en-IN')})</span>
                              </button>
                            );
                          }
                          if (unspent > 0) {
                            return (
                              <button
                                onClick={() => handleConfirmPay(item)}
                                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <IndianRupee className="w-4 h-4" />
                                <span>Collect Cash ({currencySymbol}{unspent.toLocaleString('en-IN')})</span>
                              </button>
                            );
                          }
                          return (
                            <button
                              onClick={() => handleConfirmPay(item)}
                              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Complete Settlement</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={() => handleConfirmPay(item)}
                            className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <IndianRupee className="w-4 h-4" />
                            <span>Issue Cash</span>
                          </button>
                        );
                      })()}
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
        {rejectingItem && (
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
                  <span>Reject {rejectingItem.itemType === 'ADVANCE' ? 'Cash Advance' : 'Petty Cash Claim'}</span>
                </h3>
                <button onClick={() => setRejectingItem(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
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
                    placeholder={`Enter reason for rejecting this ${rejectingItem.itemType === 'ADVANCE' ? 'cash advance' : 'claim'}...`}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingItem(null)}
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

      {/* Details View Modal (Expense or Advance) */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      {selectedItem.itemType === 'ADVANCE' ? 'Cash Advance Details' : 'Voucher Details'}
                    </p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedItem.itemType === 'ADVANCE'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                    }`}>
                      {selectedItem.itemType === 'ADVANCE' ? 'Advance' : 'Expense'}
                    </span>
                    {selectedItem.itemType === 'EXPENSE' && selectedItem.rawTxn?.advanceId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        This Voucher against the advance ({selectedItem.rawTxn.advanceId})
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                    #{selectedItem.reference || selectedItem.id}
                  </h3>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* BODY: ADVANCE DETAILS */}
              {selectedItem.itemType === 'ADVANCE' && (
                <div className="space-y-4 my-4 text-sm">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 block">Requester / Employee</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.claimant}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Advance Amount</span>
                      <span className="font-black text-amber-600 dark:text-amber-400 text-base">
                        {currencySymbol}{selectedItem.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Date</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDateToDMY(selectedItem.date)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Category</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedItem.category}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Status</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.rawAdv?.status || selectedItem.status}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Project Ref. No.</span>
                      {selectedItem.rawAdv?.projectRefNo ? (
                        <span className="font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 px-2 py-0.5 rounded text-xs inline-block">
                          {selectedItem.rawAdv.projectRefNo}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block font-semibold mb-1">Purpose / Particulars</span>
                    <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs leading-relaxed border border-slate-100 dark:border-slate-800">
                      {selectedItem.particulars || 'No purpose recorded.'}
                    </p>
                  </div>

                  {selectedItem.rawAdv?.notes && (
                    <div>
                      <span className="text-xs text-slate-400 block font-semibold mb-1">Notes</span>
                      <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs leading-relaxed border border-slate-100 dark:border-slate-800">
                        {selectedItem.rawAdv.notes}
                      </p>
                    </div>
                  )}

                  {/* Advance Settlement Info if applicable */}
                  {selectedItem.rawAdv && (selectedItem.rawAdv.status === 'DISBURSED' || selectedItem.rawAdv.status === 'SETTLED') && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Settled Amount:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {currencySymbol}{(selectedItem.rawAdv.settledAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Remaining Balance:</span>
                        <span className="font-extrabold text-amber-700 dark:text-amber-400">
                          {currencySymbol}{(selectedItem.rawAdv.remainingAmount ?? (selectedItem.rawAdv.amount - (selectedItem.rawAdv.settledAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rejection reason if rejected */}
                  {selectedItem.rawAdv?.status === 'REJECTED' && selectedItem.rawAdv.rejectedReason && (
                    <div className="bg-red-50 dark:bg-red-950/30 p-3.5 rounded-xl border border-red-200 dark:border-red-900/40 space-y-1 text-xs">
                      <span className="font-bold text-red-700 dark:text-red-400">Rejection Reason:</span>
                      <p className="text-slate-700 dark:text-slate-300 italic">"{selectedItem.rawAdv.rejectedReason}"</p>
                      {selectedItem.rawAdv.rejectedBy && (
                        <p className="text-[11px] text-red-600 dark:text-red-400">By: {selectedItem.rawAdv.rejectedBy}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* BODY: EXPENSE VOUCHER DETAILS */}
              {selectedItem.itemType === 'EXPENSE' && selectedItem.rawTxn && (() => {
                const selectedTxn = selectedItem.rawTxn;
                return (
                  <div className="space-y-4 my-4 text-sm">
                    {/* Advance Settlement Notice */}
                    {selectedTxn.advanceId && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-extrabold flex items-center gap-1.5">
                            📌 This Voucher is against Cash Advance #{selectedTxn.advanceId}
                          </span>
                          {selectedTxn.unspentCashToCollect && selectedTxn.unspentCashToCollect > 0 ? (
                            <span className="font-black text-amber-800 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 rounded text-xs">
                              Unspent Cash to Collect: {currencySymbol}{selectedTxn.unspentCashToCollect.toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                          This voucher is submitted to settle Cash Advance #{selectedTxn.advanceId}. Cash was previously issued on this advance.
                          {selectedTxn.unspentCashToCollect && selectedTxn.unspentCashToCollect > 0
                            ? ` Upon final settlement approval, collect ${currencySymbol}${selectedTxn.unspentCashToCollect.toFixed(2)} unspent cash back from ${selectedTxn.merchant || selectedTxn.requestedBy}.`
                            : ' No cash disbursal is required.'}
                        </p>
                      </div>
                    )}
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
                      <div>
                        <span className="text-xs text-slate-400 block">Payment Mode</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {selectedTxn.paymentType || 'CASH'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Project Ref. No.</span>
                        {selectedTxn.projectRefNo && selectedTxn.projectRefNo.trim() ? (
                          <span className="font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded text-xs inline-block">
                            {selectedTxn.projectRefNo.trim()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block font-semibold mb-1">Particulars / Description</span>
                      <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs leading-relaxed border border-slate-100 dark:border-slate-800">
                        {selectedTxn.description || 'No particulars recorded.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block font-semibold mb-1">Remarks</span>
                      <p className={`p-3 rounded-lg text-xs border ${selectedTxn.remarks && selectedTxn.remarks.trim() ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                        {selectedTxn.remarks && selectedTxn.remarks.trim() ? selectedTxn.remarks.trim() : 'N/A'}
                      </p>
                    </div>

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

                        {selectedTxn.workflowHistory && selectedTxn.workflowHistory.length > 0 ? (
                          selectedTxn.workflowHistory
                            .filter(step => step.action === 'RE_ROUTED')
                            .map((step, sIdx) => (
                              <div key={step.id || sIdx} className="pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    <span>Re-Routed to {step.target}:</span>
                                  </span>
                                  <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                                    {formatISTDateTime(step.timestamp)}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium pl-4">
                                  By: <span className="font-bold">{step.actor}</span>
                                </div>
                                {step.reason && (
                                  <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40 italic ml-4">
                                    "{step.reason}"
                                  </div>
                                )}
                              </div>
                            ))
                        ) : (
                          selectedTxn.reRoutedBy && (
                            <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Re-Routed to {selectedTxn.approverName}:</span>
                                </span>
                                {selectedTxn.reRoutedAt && (
                                  <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                                    {formatISTDateTime(selectedTxn.reRoutedAt)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium pl-4">
                                By: <span className="font-bold">{selectedTxn.reRoutedBy}</span>
                              </div>
                              {selectedTxn.reRouteReason && (
                                <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40 italic ml-4">
                                  "{selectedTxn.reRouteReason}"
                                </div>
                              )}
                            </div>
                          )
                        )}

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
                );
              })()}

              {/* ACTION FOOTER OF DETAILS MODAL */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {selectedItem.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const item = selectedItem;
                          setSelectedItem(null);
                          handleConfirmApprove(item);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const item = selectedItem;
                          setSelectedItem(null);
                          setRejectingItem(item);
                          setRejectionReason('');
                          setRejectError('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      {isManagerRole && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const itm = selectedItem;
                              setSelectedItem(null);
                              setQueryingItem(itm);
                              setQueryInputText('');
                              setQueryError('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Raise Query / Clarification"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Query</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const itm = selectedItem;
                              setSelectedItem(null);
                              setReRoutingItem(itm);
                              setTargetManager('');
                              setReRouteReasonInput('');
                              setReRouteError('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Re-Route Request to Another Manager"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Re-Route</span>
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {selectedItem.status === 'APPROVED' && isAdminOrCustodian && (() => {
                    const isAdv = selectedItem.itemType === 'EXPENSE' && Boolean(selectedItem.rawTxn?.advanceId);
                    const unspent = selectedItem.rawTxn?.unspentCashToCollect || 0;
                    const excess = selectedItem.rawTxn?.excessReimburseAmount || 0;

                    if (isAdv) {
                      if (excess > 0) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              const item = selectedItem;
                              setSelectedItem(null);
                              handleConfirmPay(item);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <IndianRupee className="w-3.5 h-3.5" />
                            <span>Issue Extra Cash ({currencySymbol}{excess.toLocaleString('en-IN')})</span>
                          </button>
                        );
                      }
                      if (unspent > 0) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              const item = selectedItem;
                              setSelectedItem(null);
                              handleConfirmPay(item);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <IndianRupee className="w-3.5 h-3.5" />
                            <span>Collect Cash ({currencySymbol}{unspent.toLocaleString('en-IN')})</span>
                          </button>
                        );
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const item = selectedItem;
                            setSelectedItem(null);
                            handleConfirmPay(item);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Complete Settlement</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const item = selectedItem;
                          setSelectedItem(null);
                          handleConfirmPay(item);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>Issue Cash</span>
                      </button>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Confirmation Popup for Approvals / Cash Issue / Cash Collection */}
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
                    {confirmApprovalPopup.type === 'APPROVE' 
                      ? `Confirm Approval (${confirmApprovalPopup.item.itemType === 'ADVANCE' ? 'Cash Advance' : 'Expense Claim'})` 
                      : confirmApprovalPopup.type === 'ISSUE_EXCESS_CASH'
                      ? `Confirm Extra Cash Payout (${confirmApprovalPopup.item.rawTxn?.advanceId || 'Advance Settlement'})`
                      : confirmApprovalPopup.type === 'COLLECT'
                      ? `Confirm Cash Collection (${confirmApprovalPopup.item.rawTxn?.advanceId})`
                      : confirmApprovalPopup.type === 'COMPLETE_SETTLEMENT'
                      ? `Confirm Settlement Completion (${confirmApprovalPopup.item.rawTxn?.advanceId})`
                      : `Confirm Cash Disbursement (${confirmApprovalPopup.item.itemType === 'ADVANCE' ? 'Cash Advance' : 'Expense Claim'})`}
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
                    Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.userName}</strong>, you are about to approve {confirmApprovalPopup.item.itemType === 'ADVANCE' ? 'Cash Advance' : 'Voucher'}{' '}
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">#{confirmApprovalPopup.item.reference || confirmApprovalPopup.item.id}</strong> for{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{confirmApprovalPopup.item.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> requested by{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.item.claimant || 'User'}</strong> for{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.item.category}</strong>.
                    {confirmApprovalPopup.item.rawTxn?.advanceId && (
                      <p className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 text-[11px]">
                        Note: This expense settles Advance {confirmApprovalPopup.item.rawTxn.advanceId}.
                      </p>
                    )}
                  </>
                ) : confirmApprovalPopup.type === 'ISSUE_EXCESS_CASH' ? (
                  <>
                    Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.userName}</strong>, you are about to issue extra cash reimbursement of{' '}
                    <strong className="font-extrabold text-amber-700 dark:text-amber-400">{currencySymbol}{(confirmApprovalPopup.item.rawTxn?.excessReimburseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> to{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.item.claimant || 'Employee'}</strong> for Advance{' '}
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">{confirmApprovalPopup.item.rawTxn?.advanceId}</strong>.
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 text-[11px] leading-relaxed">
                      Expense Voucher #{confirmApprovalPopup.item.reference} is for <strong>{currencySymbol}{confirmApprovalPopup.item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>, exceeding the advance amount. Please hand over <strong>{currencySymbol}{(confirmApprovalPopup.item.rawTxn?.excessReimburseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> extra cash to complete settlement.
                    </div>
                  </>
                ) : confirmApprovalPopup.type === 'COLLECT' ? (
                  <>
                    Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.userName}</strong>, you are about to confirm physical collection of{' '}
                    <strong className="font-extrabold text-emerald-700 dark:text-emerald-400">{currencySymbol}{(confirmApprovalPopup.item.rawTxn?.unspentCashToCollect || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> unspent cash from{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.item.claimant || 'Employee'}</strong> for Advance{' '}
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">{confirmApprovalPopup.item.rawTxn?.advanceId}</strong>.
                  </>
                ) : confirmApprovalPopup.type === 'COMPLETE_SETTLEMENT' ? (
                  <>
                    Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.userName}</strong>, you are about to complete and close settlement for Voucher{' '}
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">#{confirmApprovalPopup.item.reference || confirmApprovalPopup.item.id}</strong> of{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{confirmApprovalPopup.item.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> against Advance{' '}
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">{confirmApprovalPopup.item.rawTxn?.advanceId}</strong>.
                    <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 text-[11px] leading-relaxed">
                      ✓ Cash was already disbursed when the advance was issued. No further cash will be paid out.
                    </div>
                  </>
                ) : (
                  <>
                    Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmApprovalPopup.userName}</strong>, you are about to issue cash of{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{confirmApprovalPopup.item.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> for {confirmApprovalPopup.item.itemType === 'ADVANCE' ? 'Cash Advance' : 'Voucher'}{' '}
                    <strong className="font-mono font-bold text-slate-900 dark:text-white">#{confirmApprovalPopup.item.reference || confirmApprovalPopup.item.id}</strong> ({confirmApprovalPopup.item.category}).
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
                  className={`px-4 py-2 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer ${
                    confirmApprovalPopup.type === 'ISSUE_EXCESS_CASH'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : confirmApprovalPopup.type === 'COLLECT'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : confirmApprovalPopup.type === 'COMPLETE_SETTLEMENT'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
                  }`}
                >
                  {confirmApprovalPopup.type === 'APPROVE' 
                    ? 'Submit & Confirm' 
                    : confirmApprovalPopup.type === 'ISSUE_EXCESS_CASH'
                    ? 'Confirm Extra Cash Issue'
                    : confirmApprovalPopup.type === 'COLLECT'
                    ? 'Confirm Cash Collected'
                    : confirmApprovalPopup.type === 'COMPLETE_SETTLEMENT'
                    ? 'Confirm & Complete'
                    : 'Confirm Cash Issue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Re-Route Request Modal Dialog */}
      <AnimatePresence>
        {reRoutingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Re-Route Approval Request</h3>
                    <p className="text-xs text-slate-500">Transfer approval responsibility to another Manager</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReRoutingItem(null);
                    setTargetManager('');
                    setReRouteReasonInput('');
                    setReRouteError('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Summary */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{reRoutingItem.itemType === 'ADVANCE' ? 'Advance ID:' : 'Voucher Reference:'}</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    {reRoutingItem.itemType === 'ADVANCE' ? reRoutingItem.id : `#${reRoutingItem.reference || reRoutingItem.id}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Claimant / Paid To:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{reRoutingItem.claimant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-extrabold text-amber-700 dark:text-amber-400">{currencySymbol}{reRoutingItem.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {reRouteError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold border border-red-100">
                  {reRouteError}
                </div>
              )}

              {/* Select Target Manager */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Target Manager <span className="text-red-500">*</span>
                </label>
                {(() => {
                  const availableManagers = users.filter(u => 
                    u.role?.toUpperCase() === 'MANAGER' && 
                    u.role !== 'ADMIN' &&
                    u.role !== 'CUSTODIAN' &&
                    u.role !== 'AUDITOR' &&
                    u.role !== 'USER' &&
                    u.fullName &&
                    !isMatchUserIdentifier(u.username, currentUser.username) &&
                    !isMatchUserIdentifier(u.fullName, currentUser.fullName)
                  );

                  if (availableManagers.length === 0) {
                    return (
                      <div className="p-3 bg-slate-50 text-slate-500 text-xs rounded-xl border border-slate-200">
                        No other manager accounts found in system. Please configure manager users in Admin Settings.
                      </div>
                    );
                  }

                  return (
                    <select
                      value={targetManager}
                      onChange={(e) => setTargetManager(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="">-- Choose Manager --</option>
                      {availableManagers.map((mgr, idx) => (
                        <option key={mgr.id || idx} value={mgr.fullName || mgr.username}>
                          {mgr.fullName} ({mgr.empId || mgr.username})
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* Re-Route Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Re-Route Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reRouteReasonInput}
                  onChange={(e) => setReRouteReasonInput(e.target.value)}
                  placeholder="State reason for re-routing (e.g., Claim amount exceeds threshold, department scope change, etc.)"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setReRoutingItem(null);
                    setTargetManager('');
                    setReRouteReasonInput('');
                    setReRouteError('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!targetManager) {
                      setReRouteError('Please select a manager to re-route this approval request to.');
                      return;
                    }
                    if (!reRouteReasonInput.trim()) {
                      setReRouteError('Please provide a reason for re-routing this request.');
                      return;
                    }
                    if (reRoutingItem) {
                      if (reRoutingItem.itemType === 'EXPENSE' && onReRouteRequest) {
                        onReRouteRequest(
                          reRoutingItem.id, 
                          targetManager, 
                          reRouteReasonInput.trim(), 
                          getEffectiveUserFullName()
                        );
                        triggerSuccessAlert(`Voucher #${reRoutingItem.reference || reRoutingItem.id} successfully re-routed to ${targetManager}!`);
                      } else if (reRoutingItem.itemType === 'ADVANCE' && onReRouteAdvance) {
                        onReRouteAdvance(
                          reRoutingItem.id,
                          targetManager,
                          reRouteReasonInput.trim(),
                          getEffectiveUserFullName()
                        );
                        triggerSuccessAlert(`Advance ${reRoutingItem.id} successfully re-routed to ${targetManager}!`);
                      }
                      setReRoutingItem(null);
                      setTargetManager('');
                      setReRouteReasonInput('');
                      setReRouteError('');
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Confirm Re-Route</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Raise Query Modal Dialog */}
      <AnimatePresence>
        {queryingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-600">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">
                      Raise Clarification Query
                    </h3>
                    <p className="text-xs text-slate-500">
                      Submit a question or request for additional documentation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQueryingItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {queryingItem.itemType === 'ADVANCE' ? queryingItem.id : `#${queryingItem.reference || queryingItem.id}`}
                  </span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">
                    {currencySymbol}{queryingItem.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-semibold">{queryingItem.particulars}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                  <span>Claimant: <strong className="text-slate-700 dark:text-slate-300">{queryingItem.claimant}</strong></span>
                  <span>•</span>
                  <span>Category: <strong className="text-slate-700 dark:text-slate-300">{queryingItem.category}</strong></span>
                </div>
              </div>

              {/* Message input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Clarification Required / Query Note: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={queryInputText}
                  onChange={(e) => {
                    setQueryInputText(e.target.value);
                    if (queryError) setQueryError('');
                  }}
                  placeholder="e.g. Please provide GST tax breakdown or specify project site details..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-900 dark:text-slate-100"
                />
                {queryError && (
                  <p className="text-xs font-semibold text-rose-600">{queryError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQueryingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingQuery}
                  onClick={async () => {
                    if (!queryInputText.trim()) {
                      setQueryError('Please enter what clarification is needed.');
                      return;
                    }
                    if (queryingItem) {
                      setIsSubmittingQuery(true);
                      try {
                        if (queryingItem.itemType === 'EXPENSE' && onRaiseQuery && queryingItem.rawTxn) {
                          await onRaiseQuery(queryingItem.rawTxn, queryInputText.trim());
                          triggerSuccessAlert(`Query sent to ${queryingItem.claimant} for voucher #${queryingItem.reference || queryingItem.id}!`);
                        } else if (queryingItem.itemType === 'ADVANCE' && onRaiseAdvanceQuery && queryingItem.rawAdv) {
                          await onRaiseAdvanceQuery(queryingItem.rawAdv, queryInputText.trim());
                          triggerSuccessAlert(`Query sent to ${queryingItem.claimant} for advance ${queryingItem.id}!`);
                        }
                        setQueryingItem(null);
                        setQueryInputText('');
                      } finally {
                        setIsSubmittingQuery(false);
                      }
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Send Query to Submitter</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
