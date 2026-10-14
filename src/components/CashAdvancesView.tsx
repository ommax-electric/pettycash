import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HandCoins, Plus, Filter, CheckCircle2, Clock, XCircle, 
  Eye, Printer, Calendar, FileText, ArrowRight, Wallet, Check, X,
  AlertTriangle, ArrowUpCircle, ArrowDownCircle, User as UserIcon,
  Building, Paperclip, ChevronRight, RefreshCw, ChevronDown,
  ArrowUpRight, ArrowDownRight, Activity, Pencil, Trash2, AlertCircle,
  Info, CheckCircle, ReceiptText, FileSpreadsheet
} from 'lucide-react';
import { 
  CashAdvance, AdvanceStatus, User as UserType, AppSettings, 
  Transaction, formatDateToDMY, formatISTDateTime, IntegrationSettings 
} from '../types';
import { getNextOutwardVoucherNumber, getNextInwardVoucherNumber, isMatchUserIdentifier } from '../utils';
import { uploadFileToCloudinary, deleteFileFromCloudinary } from '../services/fileAttachmentService';

interface CashAdvancesViewProps {
  advances: CashAdvance[];
  currentUser: UserType;
  users: UserType[];
  appSettings?: AppSettings;
  categories?: { name: string; color?: string; type?: string }[];
  transactions?: Transaction[];
  onAddAdvance: (advance: Omit<CashAdvance, 'id' | 'createdAt' | 'updatedAt' | 'settledAmount' | 'remainingAmount'>) => Promise<CashAdvance | void> | void;
  onUpdateAdvance?: (advance: CashAdvance) => Promise<void> | void;
  onDeleteAdvance?: (id: string, reason?: string, permanent?: boolean) => Promise<void> | void;
  onApproveAdvance: (id: string, approverName: string) => Promise<void> | void;
  onRejectAdvance: (id: string, reason: string, rejectedBy: string) => Promise<void> | void;
  onDisburseAdvance: (id: string, paymentType: 'CASH' | 'ONLINE', disbursedDate?: string) => Promise<void> | void;
  onSettleAdvance: (
    advanceId: string, 
    settlement: {
      amount: number;
      category: string;
      particulars: string;
      date: string;
      receiptName?: string | null;
      receiptUrl?: string | null;
      isFinalSettlement?: boolean;
      returnCashAmount?: number;
      reimburseAmount?: number;
    }
  ) => Promise<void> | void;
  onAddTransaction?: (transaction: Omit<Transaction, 'id' | 'recordedBy'>) => Promise<Transaction | void> | void;
  integrationSettings?: IntegrationSettings;
  autoOpenSettleModal?: boolean;
  onResetAutoOpenSettle?: () => void;
}

export default function CashAdvancesView({
  advances = [],
  currentUser,
  users = [],
  appSettings,
  categories = [],
  transactions = [],
  onAddAdvance,
  onUpdateAdvance,
  onDeleteAdvance,
  onApproveAdvance,
  onRejectAdvance,
  onDisburseAdvance,
  onSettleAdvance,
  onAddTransaction,
  integrationSettings,
  autoOpenSettleModal,
  onResetAutoOpenSettle
}: CashAdvancesViewProps) {
  const currencySymbol = appSettings?.currencySymbol || '₹';
  const isUserAdmin = currentUser.role === 'ADMIN';
  const isUserManager = currentUser.role === 'MANAGER' || isUserAdmin;
  const isUserCustodian = currentUser.role === 'CUSTODIAN' || isUserAdmin;

  // Categories helper - exactly matching Expense module (RegisterView)
  const expenseCategories = useMemo(() => {
    return (categories || []).filter(c => (c as any).type !== 'IN' && c.name !== 'Cash Source');
  }, [categories]);

  // Date Filter Helpers (matching Expense module)
  const getCurrentMonthDates = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return {
      firstDay: `${y}-${m}-01`,
      today: d.toISOString().split('T')[0]
    };
  };

  // Filter states
  const [fromDate, setFromDate] = useState(() => getCurrentMonthDates().firstDay);
  const [toDate, setToDate] = useState(() => getCurrentMonthDates().today);
  const [isAllTime, setIsAllTime] = useState(false);
  const [filterPaidTo, setFilterPaidTo] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Popover toggle states
  const [isPaidToFilterOpen, setIsPaidToFilterOpen] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [paidToSearch, setPaidToSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Pagination State (per page maximum 5 advances)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [viewingAdvance, setViewingAdvance] = useState<CashAdvance | null>(null);
  const [approvingAdvance, setApprovingAdvance] = useState<CashAdvance | null>(null);
  const [rejectingAdvance, setRejectingAdvance] = useState<CashAdvance | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [disbursingAdvance, setDisbursingAdvance] = useState<CashAdvance | null>(null);
  const [disbursalPaymentType, setDisbursalPaymentType] = useState<'CASH' | 'ONLINE'>('CASH');
  const [settlingAdvance, setSettlingAdvance] = useState<CashAdvance | null>(null);

  // Edit Modal state
  const [editingAdvance, setEditingAdvance] = useState<CashAdvance | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editRequester, setEditRequester] = useState('');
  const [editProjectRef, setEditProjectRef] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Modal state
  const [deletingAdvance, setDeletingAdvance] = useState<CashAdvance | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Request Form state
  const [reqAmount, setReqAmount] = useState('');
  const [reqCategory, setReqCategory] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqProjectRef, setReqProjectRef] = useState('');
  const [reqRequester, setReqRequester] = useState(() => currentUser.fullName || currentUser.username || '');
  const [reqNotes, setReqNotes] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  // User Active Disbursed / Approved advances with remaining balance > 0 (available for settlement)
  const userDisbursedAdvances = useMemo(() => {
    const myName = (currentUser.fullName || '').trim().toLowerCase();
    const myUser = (currentUser.username || '').trim().toLowerCase();
    const myEmpId = (currentUser.empId || '').trim().toLowerCase();
    const myEmail = (currentUser.email || '').trim().toLowerCase();
    return advances.filter(adv => {
      // Advance is settlable only after cash has been issued (DISBURSED, PARTIALLY_SETTLED, or SETTLEMENT_PENDING)
      // Cannot settle before manager approval (PENDING_APPROVAL) or before cash issue (APPROVED)
      const isCashIssued = adv.status === 'DISBURSED' || adv.status === 'PARTIALLY_SETTLED' || adv.status === 'SETTLEMENT_PENDING';
      if (!isCashIssued) return false;
      const rem = adv.remainingAmount ?? (adv.amount - (adv.settledAmount || 0));
      if (rem <= 0) return false;
      if (isUserAdmin) return true;
      const req = (adv.requestedBy || '').trim().toLowerCase();
      if (adv.requesterEmpId && myEmpId && adv.requesterEmpId.toLowerCase() === myEmpId) return true;
      if (adv.requesterEmail && myEmail && adv.requesterEmail.toLowerCase() === myEmail) return true;
      if (myName && req === myName) return true;
      if (myUser && req === myUser) return true;
      return (
        isMatchUserIdentifier(adv.requestedBy, currentUser.fullName) ||
        isMatchUserIdentifier(adv.requestedBy, currentUser.username) ||
        isMatchUserIdentifier(adv.requestedBy, currentUser.email) ||
        isMatchUserIdentifier(adv.requesterEmpId, currentUser.empId) ||
        isMatchUserIdentifier(adv.requesterEmail, currentUser.email)
      );
    });
  }, [advances, isUserAdmin, currentUser]);

  // Settle Advance Modal State (Multi-advance selection + expense entry)
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([]);
  const [settleFormReference, setSettleFormReference] = useState('');
  const [settleFormDate, setSettleFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [settleFormAmount, setSettleFormAmount] = useState('');
  const [settleFormCategory, setSettleFormCategory] = useState('');
  const [settleFormMerchant, setSettleFormMerchant] = useState(() => currentUser.fullName || currentUser.username || '');
  const [settleFormParticulars, setSettleFormParticulars] = useState('');
  const [settleFormProjectRefNo, setSettleFormProjectRefNo] = useState('');
  const [settleFormRemarks, setSettleFormRemarks] = useState('');
  const [settleFormPaymentType, setSettleFormPaymentType] = useState<'CASH' | 'ONLINE'>('CASH');
  const [isFinalSettlementBatch, setIsFinalSettlementBatch] = useState(false);
  const [settleReceiptFile, setSettleReceiptFile] = useState<{
    name: string;
    size: string;
    dataUrl?: string | null;
    cloudinaryUrl?: string | null;
    isUploading?: boolean;
    uploadError?: string | null;
  } | null>(null);
  const [settleDragActive, setSettleDragActive] = useState(false);
  const [settleFormError, setSettleFormError] = useState('');
  const [isSubmittingSettleBatch, setIsSubmittingSettleBatch] = useState(false);

  // Computed values for Settle Modal live calculations
  const selectedAdvances = useMemo(() => {
    return userDisbursedAdvances.filter(a => selectedAdvanceIds.includes(a.id));
  }, [userDisbursedAdvances, selectedAdvanceIds]);

  const totalSelectedAdvanceBalance = useMemo(() => {
    return selectedAdvances.reduce((sum, a) => {
      const rem = a.remainingAmount ?? (a.amount - (a.settledAmount || 0));
      return sum + Math.max(0, rem);
    }, 0);
  }, [selectedAdvances]);

  const parsedEnteredExpenseAmount = useMemo(() => {
    const val = parseFloat(settleFormAmount);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [settleFormAmount]);

  const liveRemainingAdvanceBalance = useMemo(() => {
    return totalSelectedAdvanceBalance - parsedEnteredExpenseAmount;
  }, [totalSelectedAdvanceBalance, parsedEnteredExpenseAmount]);

  const isExcessClaim = liveRemainingAdvanceBalance < 0;
  const excessReimburseAmt = isExcessClaim ? Math.abs(liveRemainingAdvanceBalance) : 0;

  // Manual voucher editable permission check (matching Expense module)
  const isVoucherEditable = currentUser.role !== 'AUDITOR' && (
    Boolean(appSettings?.allowManualVoucherNumbering) || currentUser.role === 'ADMIN'
  );

  // Scope: Only admin can view all users' advances in one place.
  // Other users can only view their respective advances.
  const userVisibleAdvances = useMemo(() => {
    if (isUserAdmin) return advances;
    const myName = (currentUser.fullName || '').trim().toLowerCase();
    const myUser = (currentUser.username || '').trim().toLowerCase();
    const myEmpId = (currentUser.empId || '').trim().toLowerCase();
    const myEmail = (currentUser.email || '').trim().toLowerCase();
    return advances.filter(adv => {
      if (adv.requesterEmpId && myEmpId && adv.requesterEmpId.toLowerCase() === myEmpId) return true;
      if (adv.requesterEmail && myEmail && adv.requesterEmail.toLowerCase() === myEmail) return true;
      const req = (adv.requestedBy || '').trim().toLowerCase();
      if (myName && req === myName) return true;
      if (myUser && req === myUser) return true;
      return (
        isMatchUserIdentifier(adv.requestedBy, currentUser.fullName) ||
        isMatchUserIdentifier(adv.requestedBy, currentUser.username) ||
        isMatchUserIdentifier(adv.requestedBy, currentUser.email) ||
        isMatchUserIdentifier(adv.requesterEmpId, currentUser.empId) ||
        isMatchUserIdentifier(adv.requesterEmail, currentUser.email)
      );
    });
  }, [advances, isUserAdmin, currentUser]);

  // KPI card metrics: computed strictly based on userVisibleAdvances!
  const metrics = useMemo(() => {
    const active = userVisibleAdvances.filter(a => 
      a.status === 'APPROVED' || 
      a.status === 'DISBURSED' || 
      a.status === 'PARTIALLY_SETTLED' || 
      a.status === 'SETTLEMENT_PENDING'
    );
    const pendingApproval = userVisibleAdvances.filter(a => a.status === 'PENDING_APPROVAL');
    const pendingDisburse = userVisibleAdvances.filter(a => a.status === 'APPROVED');
    const settled = userVisibleAdvances.filter(a => a.status === 'SETTLED');

    const totalActiveBalance = active.reduce((sum, a) => {
      const rem = a.remainingAmount ?? (a.amount - (a.settledAmount || 0));
      return sum + Math.max(0, rem);
    }, 0);
    const totalDisbursedAmt = userVisibleAdvances
      .filter(a => a.status === 'APPROVED' || a.status === 'DISBURSED' || a.status === 'SETTLED' || a.status === 'PARTIALLY_SETTLED' || a.status === 'SETTLEMENT_PENDING')
      .reduce((sum, a) => sum + a.amount, 0);
    const totalSettledAmt = userVisibleAdvances.reduce((sum, a) => {
      if (a.status === 'SETTLED') {
        return sum + Math.max(a.amount, (a.settledAmount || 0) + (a.returnedCashAmount || 0));
      }
      return sum + ((a.settledAmount || 0) + (a.returnedCashAmount || 0));
    }, 0);

    return {
      activeCount: active.filter(a => (a.remainingAmount ?? (a.amount - (a.settledAmount || 0))) > 0).length,
      activeBalance: totalActiveBalance,
      pendingCount: pendingApproval.length,
      pendingApprovalCount: pendingApproval.length,
      pendingDisburseCount: pendingDisburse.length,
      settledCount: settled.length,
      totalDisbursed: totalDisbursedAmt,
      totalSettled: totalSettledAmt
    };
  }, [userVisibleAdvances]);

  // Unique Payees list for the Paid To filter
  const uniquePayees = useMemo(() => {
    const set = new Set<string>();
    userVisibleAdvances.forEach(adv => {
      if (adv.requestedBy && adv.requestedBy.trim()) {
        set.add(adv.requestedBy.trim());
      }
    });
    return Array.from(set).sort();
  }, [userVisibleAdvances]);

  // Filtered Advances according to toolbar filter controls
  const filteredAdvances = useMemo(() => {
    return userVisibleAdvances.filter(adv => {
      // 1. Date Range Filter
      if (!isAllTime) {
        const advDate = adv.requestDate || (adv.createdAt ? adv.createdAt.split('T')[0] : '');
        if (fromDate && advDate < fromDate) return false;
        if (toDate && advDate > toDate) return false;
      }

      // 2. Paid To Filter
      if (filterPaidTo.length > 0 && !filterPaidTo.includes('ALL')) {
        const req = (adv.requestedBy || '').trim();
        if (!filterPaidTo.includes(req)) return false;
      }

      // 3. Category Filter
      if (filterCategory.length > 0 && !filterCategory.includes('ALL')) {
        const cat = adv.category || 'General';
        if (!filterCategory.includes(cat)) return false;
      }

      // 4. Status Filter
      if (filterStatus.length > 0 && !filterStatus.includes('ALL')) {
        if (!filterStatus.includes(adv.status)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.requestDate || b.createdAt).getTime() - new Date(a.requestDate || a.createdAt).getTime());
  }, [userVisibleAdvances, fromDate, toDate, isAllTime, filterPaidTo, filterCategory, filterStatus]);

  // Pagination Slicing
  const totalPages = Math.ceil(filteredAdvances.length / itemsPerPage) || 1;
  const paginatedAdvances = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAdvances.slice(start, start + itemsPerPage);
  }, [filteredAdvances, currentPage, itemsPerPage]);

  // Permissions helpers for Edit & Delete
  const canUserEditAdvance = (adv: CashAdvance) => {
    if (adv.status === 'VOID' || adv.status === 'DELETED') return false;
    // Once manager approves, edit option is disabled for advance module
    if (adv.status !== 'PENDING_APPROVAL') return false;
    if (isUserAdmin) return true;
    const myName = (currentUser.fullName || '').trim().toLowerCase();
    const myUser = (currentUser.username || '').trim().toLowerCase();
    const myEmpId = (currentUser.empId || '').trim().toLowerCase();
    const myEmail = (currentUser.email || '').trim().toLowerCase();
    const req = (adv.requestedBy || '').trim().toLowerCase();
    const isOwner = (
      (adv.requesterEmpId && myEmpId && adv.requesterEmpId.toLowerCase() === myEmpId) ||
      (adv.requesterEmail && myEmail && adv.requesterEmail.toLowerCase() === myEmail) ||
      (myName && req === myName) ||
      (myUser && req === myUser)
    );
    // Till approval users able to see the edit option
    return isOwner && adv.status === 'PENDING_APPROVAL';
  };

  const canUserDeleteAdvance = (adv: CashAdvance) => {
    if (adv.status === 'VOID' || adv.status === 'DELETED') return false;
    // Delete option only available with admin
    return isUserAdmin;
  };

  // Company Stamp Settings for Advance Cash Voucher
  const companyStampUrl = appSettings?.companyStampUrl || '';
  const companyStampEnabled = appSettings?.companyStampEnabled !== false && !!companyStampUrl;
  const companyStampRotate = appSettings?.companyStampRotate ?? -12;
  const companyStampOpacity = appSettings?.companyStampOpacity ?? 0.85;
  const companyStampWidth = appSettings?.companyStampWidth ?? 85;

  const isPrintableAdvance = (adv: CashAdvance | null | undefined): boolean => {
    if (!adv) return false;
    if (adv.status === 'VOID' || adv.status === 'DELETED') return true;
    return (
      adv.status === 'APPROVED' ||
      adv.status === 'DISBURSED' ||
      adv.status === 'PARTIALLY_SETTLED' ||
      adv.status === 'SETTLEMENT_PENDING' ||
      adv.status === 'SETTLED'
    );
  };

  const formatVoidDateTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    const d = new Date(str);
    if (isNaN(d.getTime())) return dateStr;
    try {
      const formatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const parts = formatter.formatToParts(d);
      const partMap: Record<string, string> = {};
      parts.forEach(p => { partMap[p.type] = p.value; });
      const dd = partMap.day || '01';
      const mm = partMap.month || '01';
      const yyyy = partMap.year || '2026';
      const hh = partMap.hour || '12';
      const minutes = partMap.minute || '00';
      const dayPeriod = (partMap.dayPeriod || 'AM').toUpperCase();
      const hasTime = str.includes(':') || str.includes('T') || (str.includes(' ') && str.length > 10);
      if (hasTime) {
        return `${dd}-${mm}-${yyyy} | ${hh}:${minutes} ${dayPeriod}`;
      }
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  const numberToWordsINR = (amount: number): string => {
    if (isNaN(amount) || amount <= 0) return 'Zero Rupees Only';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                   'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertChunk = (num: number): string => {
      let str = '';
      if (num >= 100) {
        str += units[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        str += tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + units[num % 10] : '');
      } else if (num > 0) {
        str += units[num];
      }
      return str.trim();
    };

    const integerPart = Math.floor(Math.abs(amount));
    const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

    let num = integerPart;
    if (num === 0) return 'Zero Rupees Only';

    let result = '';

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;

    if (crore > 0) result += convertChunk(crore) + ' Crore ';
    if (lakh > 0) result += convertChunk(lakh) + ' Lakh ';
    if (thousand > 0) result += convertChunk(thousand) + ' Thousand ';
    if (num > 0) result += convertChunk(num);

    result = result.trim() + ' Rupees';

    if (decimalPart > 0) {
      result += ' and ' + convertChunk(decimalPart) + ' Paise';
    }

    return result + ' Only';
  };

  const handlePrintAdvanceVoucher = (adv: CashAdvance) => {
    if (!isPrintableAdvance(adv)) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isVoided = adv.status === 'VOID' || adv.status === 'DELETED';
    const amountInWords = numberToWordsINR(adv.amount);
    const formattedAmount = `${currencySymbol} ${adv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Advance Cash Voucher - ${adv.id}${isVoided ? ' (VOIDED)' : ''}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            @media print {
              html, body {
                width: 100%;
                height: auto;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body {
                padding: 0 !important;
                background: #ffffff !important;
              }
              .voucher-page {
                box-sizing: border-box;
                width: 180mm;
                height: 88mm;
                margin: 0 auto 4mm auto;
                padding: 3mm;
                page-break-inside: avoid;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #1e3a8a;
              background-color: #ffffff;
              padding: 10px;
            }
            .voucher-page {
              width: 180mm;
              height: 88mm;
              background: #ffffff;
              margin: 0 auto;
              padding: 3mm;
              box-shadow: none;
              border-radius: 0;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .voucher-border {
              border: 1.5px solid #2563eb;
              height: 100%;
              padding: 4mm 6mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              overflow: hidden;
            }

            /* Void Watermark Stamp Overlay */
            .void-stamp-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              pointer-events: none;
              z-index: 25;
            }
            .void-stamp-banner {
              transform: rotate(-35deg);
              font-size: 56px;
              font-weight: 900;
              color: rgba(225, 29, 72, 0.28);
              border: 6px solid rgba(225, 29, 72, 0.4);
              padding: 6px 40px;
              border-radius: 12px;
              letter-spacing: 14px;
              text-transform: uppercase;
              text-align: center;
              white-space: nowrap;
              box-shadow: inset 0 0 0 2px rgba(225, 29, 72, 0.2);
            }
            
            /* Header Section */
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 3mm;
              position: relative;
              min-height: 20mm;
            }
            .header-stamp-box {
              display: flex;
              align-items: center;
              justify-content: center;
              flex: 1;
              padding: 0 4mm;
              pointer-events: none;
            }
            .company-stamp-img {
              width: ${companyStampWidth}px;
              height: auto;
              max-width: 100%;
              object-fit: contain;
              transform: rotate(${companyStampRotate}deg);
              opacity: ${companyStampOpacity};
            }
            .meta-table {
              border-collapse: collapse;
              border: 1.5px solid #2563eb;
              width: 42mm;
            }
            .meta-table td {
              border: 1px solid #2563eb;
              padding: 3.5px 5px;
              vertical-align: middle;
            }
            .meta-label {
              font-weight: bold;
              color: #1e40af;
              width: 11mm;
              font-size: 11px;
              background-color: #f0f7ff;
            }
            .meta-value {
              font-weight: bold;
              color: #0f172a;
              font-family: 'Outfit', monospace;
              font-size: 12px;
            }
            .header-right {
              text-align: right;
            }
            .company-name {
              font-size: 10px;
              font-weight: bold;
              color: #1e40af;
              text-transform: uppercase;
              letter-spacing: 0.6px;
            }
            .voucher-title {
              font-size: 20px;
              font-weight: 900;
              color: #1d4ed8;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              margin-top: 1px;
            }
            .voucher-project-ref {
              font-size: 11px;
              color: #0f172a;
              letter-spacing: 0.5px;
              margin-top: 5px;
              line-height: 1.3;
            }
            .voucher-project-ref-label {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              font-weight: 400;
              font-size: 11px;
            }
            .voucher-project-ref-value {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              font-weight: 300;
              font-size: 11px;
            }

            /* Line Rows (Underlined, no boxes) */
            .line-row {
              display: flex;
              align-items: flex-end;
              margin-bottom: 2.5mm;
            }
            .line-label {
              font-weight: 700;
              font-size: 12px;
              color: #1e40af;
              width: 25mm;
              flex-shrink: 0;
            }
            .line-content {
              flex: 1;
              border-bottom: 1.5px solid #2563eb;
              padding-bottom: 1.5px;
              font-size: 12px;
              font-weight: 600;
              color: #0f172a;
              min-height: 16px;
            }

            /* Bottom Area */
            .bottom-area {
              margin-top: auto;
            }
            .recd-row {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              font-size: 11px;
              font-weight: 700;
              color: #1e40af;
              position: relative;
              top: 3px;
              margin-top: 2mm;
            }
            .recd-blank {
              border-bottom: 1.5px solid #2563eb;
              width: 48mm;
              display: inline-block;
              height: 14px;
              margin-left: 6px;
            }

            /* Audit Metadata Stamp above signature block */
            .void-audit-stamp {
              border: 1.5px dashed #dc2626;
              background-color: #fef2f2;
              padding: 3.5px 8px;
              margin-top: 2.5mm;
              margin-bottom: 2mm;
              border-radius: 4px;
              color: #991b1b;
              font-size: 9.5px;
            }
            .void-audit-title {
              font-size: 9px;
              font-weight: 800;
              color: #dc2626;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
              border-bottom: 1px dashed #fecdd3;
              padding-bottom: 1.5px;
            }
            .void-audit-body {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9.5px;
              color: #7f1d1d;
            }

            .sig-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 1mm;
            }
            .sig-table td {
              vertical-align: bottom;
              text-align: center;
              padding: 0 4px;
            }
            .sig-line {
              border-top: 1.5px dashed #2563eb;
              width: 80%;
              margin: 0 auto 3px auto;
            }
            .sig-title {
              font-size: 10.5px;
              font-weight: bold;
              color: #1e40af;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="voucher-page">
            <div class="voucher-border">
              
              ${isVoided ? `
                <div class="void-stamp-overlay">
                  <div class="void-stamp-banner">VOID</div>
                </div>
              ` : ''}

              <!-- Header -->
              <div class="header-row">
                <table class="meta-table">
                  <tr>
                    <td class="meta-label">No.</td>
                    <td class="meta-value">${adv.id}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Date</td>
                    <td class="meta-value">${formatDateToDMY(adv.disbursedAt || adv.approvedAt || adv.requestDate)}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Rs.</td>
                    <td class="meta-value">${formattedAmount}</td>
                  </tr>
                </table>

                ${companyStampEnabled ? `
                  <div class="header-stamp-box">
                    <img src="${companyStampUrl}" class="company-stamp-img" alt="Company Seal" />
                  </div>
                ` : ''}

                <div class="header-right">
                  <div class="company-name">Ommax Electric Private Limited</div>
                  <div class="voucher-title">ADVANCE CASH VOUCHER${isVoided ? ' (VOID)' : ''}</div>
                  ${adv.projectRefNo ? `<div class="voucher-project-ref"><span class="voucher-project-ref-label">Ref. No:</span> <span class="voucher-project-ref-value">${adv.projectRefNo}</span></div>` : ''}
                </div>
              </div>

              <!-- Pay to (Underlined) -->
              <div class="line-row">
                <div class="line-label">Pay to</div>
                <div class="line-content">${adv.requestedBy || 'Cash'}</div>
              </div>

              <!-- Rs. in Words (Underlined) -->
              <div class="line-row">
                <div class="line-label">Rs. in Words</div>
                <div class="line-content">${amountInWords}</div>
              </div>

              <!-- being (Purpose / Description) -->
              <div class="line-row">
                <div class="line-label">being</div>
                <div class="line-content">${adv.purpose || 'Cash Advance'}</div>
              </div>

              <!-- and debit (Category) -->
              <div class="line-row">
                <div class="line-label">and debit</div>
                <div class="line-content">${adv.category || 'Advance'}</div>
              </div>

              <!-- Bottom Signature & Recd Area -->
              <div class="bottom-area">
                <div class="recd-row" style="margin-bottom: ${isVoided ? 'calc(3mm - 3px)' : 'calc(14mm - 3px)'};">
                  Recd. above sum of Rs. <span class="recd-blank"></span>
                </div>

                ${isVoided ? `
                  <div class="void-audit-stamp">
                    <div class="void-audit-title">VOUCHER HAS BEEN VOIDED</div>
                    <div class="void-audit-body">
                      <span><strong>Reason:</strong> ${adv.deleteReason || 'Cancelled / Voided by user'}</span>
                      <span><strong>Date:</strong> ${formatVoidDateTime(adv.deletedAt || adv.updatedAt || adv.requestDate)}</span>
                    </div>
                  </div>
                ` : ''}

                <table class="sig-table">
                  <tr>
                    <td style="width: 33.33%;">
                      <div class="sig-line"></div>
                      <div class="sig-title">PREPARED BY</div>
                    </td>
                    <td style="width: 33.33%;">
                      <div class="sig-line"></div>
                      <div class="sig-title">AUTHORISED BY</div>
                    </td>
                    <td style="width: 33.33%;">
                      <div class="sig-line"></div>
                      <div class="sig-title">RECEIVER'S SIGNATURE</div>
                    </td>
                  </tr>
                </table>
              </div>

            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Open Edit Modal
  const handleOpenEditModal = (adv: CashAdvance) => {
    setEditingAdvance(adv);
    setEditAmount(String(adv.amount));
    setEditCategory(adv.category || (expenseCategories[0]?.name || 'General'));
    setEditPurpose(adv.purpose);
    setEditRequester(adv.requestedBy);
    setEditProjectRef(adv.projectRefNo || '');
    setEditNotes(adv.notes || '');
  };

  // Submit Edit Modal
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdvance) return;
    const numAmt = parseFloat(editAmount);
    if (isNaN(numAmt) || numAmt <= 0) return;
    if (!editPurpose.trim()) return;

    setIsSubmittingEdit(true);
    try {
      const updated: CashAdvance = {
        ...editingAdvance,
        amount: numAmt,
        remainingAmount: editingAdvance.status === 'DISBURSED' 
          ? Math.max(0, numAmt - (editingAdvance.settledAmount || 0))
          : (editingAdvance.status === 'SETTLED' ? 0 : numAmt),
        category: editCategory || 'General',
        purpose: editPurpose.trim(),
        requestedBy: editRequester,
        projectRefNo: editProjectRef.trim() || undefined,
        notes: editNotes.trim() || undefined,
        updatedAt: new Date().toISOString()
      };
      if (onUpdateAdvance) {
        await onUpdateAdvance(updated);
      }
      setEditingAdvance(null);
    } catch (err) {
      console.error('Error updating advance:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (adv: CashAdvance) => {
    if (!isUserAdmin) return;
    setDeletingAdvance(adv);
    setDeleteReason('');
    setDeleteError('');
  };

  // Confirm Delete (Permanent vs Void)
  const handleConfirmDelete = async (permanent: boolean = false) => {
    if (!deletingAdvance) return;
    if (!permanent && !deleteReason.trim()) {
      setDeleteError('Reason is required when voiding an advance.');
      return;
    }
    setIsSubmittingDelete(true);
    try {
      if (onDeleteAdvance) {
        await onDeleteAdvance(deletingAdvance.id, deleteReason.trim() || undefined, permanent);
      }
      setDeletingAdvance(null);
      setDeleteReason('');
      setDeleteError('');
    } catch (err) {
      console.error('Error deleting advance:', err);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Handle Request Submit
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(reqAmount);
    if (isNaN(numAmt) || numAmt <= 0) return;
    if (!reqPurpose.trim()) return;

    // Resolve target requester user
    const targetUser = users.find(u => 
      (u.fullName && u.fullName.trim().toLowerCase() === reqRequester.trim().toLowerCase()) ||
      (u.username && u.username.trim().toLowerCase() === reqRequester.trim().toLowerCase())
    ) || currentUser;

    // Follow the expense request flow manager hierarchy
    const repTo = (targetUser.reportingTo || '').trim();
    const hasReportingManager = repTo.length > 0;
    const isTopAdminOrCustodian = (targetUser.role === 'ADMIN' || targetUser.role === 'CUSTODIAN') && !hasReportingManager;

    const targetApprover = hasReportingManager 
      ? repTo 
      : (isTopAdminOrCustodian ? (targetUser.fullName || targetUser.username) : 'Manager');

    setIsSubmittingReq(true);
    try {
      await onAddAdvance({
        requestDate: new Date().toISOString().split('T')[0],
        requestedBy: targetUser.fullName || targetUser.username,
        requesterEmpId: targetUser.empId,
        requesterEmail: targetUser.email,
        amount: numAmt,
        category: reqCategory || (expenseCategories[0]?.name || 'General'),
        purpose: reqPurpose.trim(),
        projectRefNo: reqProjectRef.trim() || undefined,
        notes: reqNotes.trim() || undefined,
        status: 'PENDING_APPROVAL',
        approverName: targetApprover
      });

      // Reset
      setReqAmount('');
      setReqCategory('');
      setReqPurpose('');
      setReqProjectRef('');
      setReqRequester(currentUser.fullName || currentUser.username || '');
      setReqNotes('');
      setIsRequestModalOpen(false);
    } catch (err) {
      console.error('Error submitting advance request:', err);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // Open Settle Modal (preselect specific advance if clicked, or default to first/all)
  const handleOpenSettleModal = (initialAdvId?: string) => {
    const candidateAdvances = userDisbursedAdvances;
    if (candidateAdvances.length === 0) return;

    if (initialAdvId && candidateAdvances.some(a => a.id === initialAdvId)) {
      setSelectedAdvanceIds([initialAdvId]);
    } else {
      setSelectedAdvanceIds([candidateAdvances[0].id]);
    }
    const targetAdv = initialAdvId ? candidateAdvances.find(a => a.id === initialAdvId) : candidateAdvances[0];
    setSettleFormProjectRefNo(targetAdv?.projectRefNo || '');

    const nextNum = getNextOutwardVoucherNumber(transactions || []);
    setSettleFormReference(String(nextNum));
    setSettleFormDate(new Date().toISOString().split('T')[0]);
    setSettleFormAmount('');
    setSettleFormCategory('');
    setSettleFormMerchant(currentUser.fullName || currentUser.username || '');
    setSettleFormParticulars('');
    setSettleFormRemarks('');
    setSettleFormPaymentType('CASH');
    setIsFinalSettlementBatch(false);
    setSettleReceiptFile(null);
    setSettleFormError('');
    setIsSettleModalOpen(true);
  };

  // Auto-open settle modal when navigated from Expense module
  useEffect(() => {
    if (autoOpenSettleModal) {
      handleOpenSettleModal();
      setIsSettleModalOpen(true);
      onResetAutoOpenSettle?.();
    }
  }, [autoOpenSettleModal]);

  // Toggle selection of an advance for batch settlement
  const toggleAdvanceSelection = (advId: string) => {
    setSelectedAdvanceIds(prev => {
      if (prev.includes(advId)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter(id => id !== advId);
      }
      return [...prev, advId];
    });
  };

  // Receipt drag & drop file handlers
  const handleSettleReceiptFile = (file: File) => {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setSettleFormError('Unsupported format. Only JPG, PNG, and PDF files are allowed.');
      return;
    }
    const isPdf = ext === '.pdf' || file.type === 'application/pdf';
    const maxSize = isPdf ? 250 * 1024 : 150 * 1024;
    if (file.size > maxSize) {
      setSettleFormError(`File size exceeds limit (${isPdf ? '250KB for PDF' : '150KB for images'}).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const formattedSize = file.size > 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`;
      setSettleReceiptFile({
        name: file.name,
        size: formattedSize,
        dataUrl,
        cloudinaryUrl: null,
        isUploading: false,
        uploadError: null
      });
      setSettleFormError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSettleReceiptDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSettleDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSettleReceiptFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Settle Advance Batch Submit (Posts to Expense Registry & updates Advances)
  const handleSettleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAdvances.length === 0) {
      setSettleFormError('Please select at least one advance to settle.');
      return;
    }
    const numAmt = parseFloat(settleFormAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setSettleFormError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!settleFormCategory) {
      setSettleFormError('Please choose an Expense Category.');
      return;
    }
    if (!settleFormParticulars.trim()) {
      setSettleFormError('Particulars (Purpose) is required.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (settleFormDate > today) {
      setSettleFormError('Future dates cannot be selected for posting entries.');
      return;
    }

    setIsSubmittingSettleBatch(true);
    setSettleFormError('');

    try {
      let finalReceiptUrl: string | null = null;
      if (settleReceiptFile) {
        if (settleReceiptFile.cloudinaryUrl) {
          finalReceiptUrl = settleReceiptFile.cloudinaryUrl;
        } else if (settleReceiptFile.dataUrl) {
          finalReceiptUrl = settleReceiptFile.dataUrl;
        }
      }

      // Resolve manager hierarchy matching expense register
      const repTo = (currentUser.reportingTo || '').trim();
      const hasReportingManager = repTo.length > 0;
      const isTopAdminOrCustodian = (currentUser.role === 'ADMIN' || currentUser.role === 'CUSTODIAN') && !hasReportingManager;
      const initialStatus = isTopAdminOrCustodian ? 'PAID' : 'PENDING';
      const targetApprover = hasReportingManager ? repTo : (isTopAdminOrCustodian ? (currentUser.fullName || currentUser.username) : 'Manager');

      const linkedAdvIdsStr = selectedAdvances.map(a => a.id).join(', ');
      const voucherRef = settleFormReference.trim() || String(getNextOutwardVoucherNumber(transactions || []));
      const categoryName = settleFormCategory;
      const merchantName = settleFormMerchant.trim() || currentUser.fullName || currentUser.username;
      const particulars = settleFormParticulars.trim();
      const unspentToCollect = isFinalSettlementBatch && liveRemainingAdvanceBalance > 0 ? liveRemainingAdvanceBalance : 0;

      // 1. Post to Expense Registry (transactions)
      if (onAddTransaction) {
        await onAddTransaction({
          date: settleFormDate,
          type: 'OUT',
          amount: numAmt,
          category: categoryName,
          merchant: merchantName,
          reference: voucherRef,
          status: initialStatus,
          requestedBy: currentUser.fullName || currentUser.username,
          approverName: targetApprover,
          description: particulars,
          receiptName: settleReceiptFile?.name || null,
          receiptSize: settleReceiptFile?.size || null,
          receiptUrl: finalReceiptUrl,
          remarks: settleFormRemarks.trim(),
          projectRefNo: settleFormProjectRefNo.trim() || selectedAdvances[0]?.projectRefNo || undefined,
          paymentType: 'CASH',
          advanceId: linkedAdvIdsStr,
          isAdvanceSettlement: true,
          unspentCashToCollect: unspentToCollect,
          excessReimburseAmount: excessReimburseAmt > 0 ? excessReimburseAmt : undefined,
          isFinalSettlement: isFinalSettlementBatch || isExcessClaim
        });
      }

      // 2. Sequentially distribute the settled amount across selected advances
      let remainingToSettle = numAmt;
      const now = new Date().toISOString();

      for (let i = 0; i < selectedAdvances.length; i++) {
        const adv = selectedAdvances[i];
        const advRemaining = adv.remainingAmount ?? (adv.amount - (adv.settledAmount || 0));

        let settleThisAdv = 0;
        if (i === selectedAdvances.length - 1) {
          settleThisAdv = remainingToSettle;
        } else {
          settleThisAdv = Math.min(advRemaining, remainingToSettle);
        }
        remainingToSettle = Math.max(0, remainingToSettle - settleThisAdv);

        const newSettledAmount = (adv.settledAmount || 0) + settleThisAdv;
        const newAdvRemaining = Math.max(0, adv.amount - newSettledAmount);
        const isThisAdvFullySettled = isFinalSettlementBatch || newAdvRemaining <= 0;

        const settlementEntry = {
          id: `SETTLE-${Date.now().toString().slice(-4)}-${i + 1}`,
          voucherNo: voucherRef,
          date: settleFormDate,
          amount: settleThisAdv,
          category: categoryName,
          particulars: particulars,
          receiptName: settleReceiptFile?.name || null,
          receiptUrl: finalReceiptUrl,
          recordedBy: currentUser.fullName || currentUser.username,
          settledAt: now
        };

        const updatedSettlements = [...(adv.settlements || []), settlementEntry];

        if (initialStatus === 'PAID') {
          // Instant direct settlement by Top Admin / Custodian
          let calculatedReturnedCash = adv.returnedCashAmount;
          if (isTopAdminOrCustodian && isFinalSettlementBatch && newAdvRemaining > 0 && i === selectedAdvances.length - 1) {
            calculatedReturnedCash = (calculatedReturnedCash || 0) + newAdvRemaining;
          }

          const settlementStatus: AdvanceStatus = isThisAdvFullySettled ? 'SETTLED' : 'PARTIALLY_SETTLED';

          const updatedAdv: CashAdvance = {
            ...adv,
            settledAmount: newSettledAmount,
            remainingAmount: isFinalSettlementBatch ? 0 : newAdvRemaining,
            settlements: updatedSettlements,
            status: settlementStatus,
            settledAt: isThisAdvFullySettled ? now : adv.settledAt,
            settledBy: isThisAdvFullySettled ? (currentUser.fullName || currentUser.username) : adv.settledBy,
            returnedCashAmount: calculatedReturnedCash,
            reimbursedAmount: (excessReimburseAmt > 0 && i === selectedAdvances.length - 1) ? ((adv.reimbursedAmount || 0) + excessReimburseAmt) : adv.reimbursedAmount,
            updatedAt: now
          };

          if (onUpdateAdvance) {
            await onUpdateAdvance(updatedAdv);
          }
        } else {
          // Regular user submission (requires manager approval)
          // If partial settlement and remaining balance > 0: mark as PARTIALLY_SETTLED with remaining balance available
          // If full settlement or remaining is 0: mark as SETTLEMENT_PENDING awaiting manager approval
          const settlementStatus: AdvanceStatus = isThisAdvFullySettled ? 'SETTLEMENT_PENDING' : 'PARTIALLY_SETTLED';
          const updatedAdv: CashAdvance = {
            ...adv,
            settledAmount: newSettledAmount,
            remainingAmount: isFinalSettlementBatch ? 0 : newAdvRemaining,
            settlements: updatedSettlements,
            status: settlementStatus,
            pendingSettlementAmount: Math.min(advRemaining, settleThisAdv),
            pendingExcessAmount: (excessReimburseAmt > 0 && i === selectedAdvances.length - 1) ? excessReimburseAmt : undefined,
            updatedAt: now
          };

          if (onUpdateAdvance) {
            await onUpdateAdvance(updatedAdv);
          }
        }
      }

      // Reset & close modal
      setIsSettleModalOpen(false);
      setSelectedAdvanceIds([]);
      setSettleFormAmount('');
      setSettleFormParticulars('');
      setSettleFormProjectRefNo('');
      setSettleFormRemarks('');
      setSettleReceiptFile(null);
    } catch (err: any) {
      console.error('Error settling advance batch:', err);
      setSettleFormError(err?.message || 'Failed to submit settlement.');
    } finally {
      setIsSubmittingSettleBatch(false);
    }
  };

  // Helper for status badge styling (matching Expense module UI)
  const renderStatusBadge = (status: AdvanceStatus, adv?: CashAdvance) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Pending Approval</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>Approved</span>
          </span>
        );
      case 'DISBURSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Disbursed</span>
          </span>
        );
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>Partially Settled</span>
          </span>
        );
      case 'SETTLEMENT_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Pending Settlement</span>
          </span>
        );
      case 'SETTLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span>Settled</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Rejected</span>
          </span>
        );
      case 'VOID':
      case 'DELETED':
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs cursor-help"
            title={`Voided by ${adv?.deletedBy || 'Admin'}: ${adv?.deleteReason || 'No reason provided'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            <span>Voided</span>
          </span>
        );
      default:
        return <span className="text-[10px] font-bold text-slate-500">{status}</span>;
    }
  };

  const renderPagination = () => {
    if (filteredAdvances.length <= itemsPerPage) return null;
    return (
      <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="text-[11px] text-slate-500">
          Showing <span className="font-bold text-slate-800">{Math.min(filteredAdvances.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
          <span className="font-bold text-slate-800">{Math.min(filteredAdvances.length, currentPage * itemsPerPage)}</span> of{' '}
          <span className="font-bold text-slate-800">{filteredAdvances.length}</span> entries
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Prev
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === page
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const getReportTitle = () => 'Cash Advances & Settlements Report';

  const getPeriodText = () => {
    if (isAllTime) {
      return 'Period: ALL';
    }
    if (fromDate && toDate) {
      return `Period: ${formatDateToDMY(fromDate)} to ${formatDateToDMY(toDate)}`;
    }
    if (fromDate) {
      return `Period: From ${formatDateToDMY(fromDate)}`;
    }
    if (toDate) {
      return `Period: Up to ${formatDateToDMY(toDate)}`;
    }
    return 'Period: ALL';
  };

  const getStatusLabel = (status: AdvanceStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL': return 'Pending Approval';
      case 'APPROVED': return 'Approved (Pending Disbursal)';
      case 'DISBURSED': return 'Disbursed (Active)';
      case 'PARTIALLY_SETTLED': return 'Partially Settled';
      case 'SETTLEMENT_PENDING': return 'Pending Settlement';
      case 'SETTLED': return 'Settled & Closed';
      case 'REJECTED': return 'Rejected';
      case 'VOID': return 'Voided';
      default: return status;
    }
  };

  const handleExportCSV = () => {
    const reportTitle = getReportTitle();
    const periodText = getPeriodText();
    const totalAdvanceAmount = filteredAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalSettledAmount = filteredAdvances.reduce((sum, a) => sum + (a.settledAmount || 0), 0);
    const totalRemainingBalance = filteredAdvances.reduce((sum, a) => {
      const rem = a.remainingAmount ?? Math.max(0, a.amount - (a.settledAmount || 0));
      return sum + Math.max(0, rem);
    }, 0);

    let csvRows: any[][] = [];
    csvRows.push(['Ommax Electric Private Limited']);
    csvRows.push([reportTitle]);
    csvRows.push([periodText]);
    csvRows.push([`Total Advances: ${filteredAdvances.length}`]);
    csvRows.push([]);

    csvRows.push([
      'Date',
      'Advance ID',
      'Project Ref. No.',
      'Paid To',
      'Particulars',
      'Category',
      'Advance Amount',
      'Settled Amount',
      'Balance Amount',
      'Payment Mode',
      'Status',
      'Remarks'
    ]);

    filteredAdvances.forEach(a => {
      const rem = a.remainingAmount ?? Math.max(0, a.amount - (a.settledAmount || 0));
      csvRows.push([
        formatDateToDMY(a.requestDate || a.createdAt),
        a.referenceNo || a.id,
        (a.projectRefNo || '-').replace(/"/g, '""'),
        (a.requestedBy || '-').replace(/"/g, '""'),
        (a.purpose || '-').replace(/"/g, '""'),
        a.category || 'General',
        a.amount.toFixed(2),
        (a.settledAmount || 0).toFixed(2),
        Math.max(0, rem).toFixed(2),
        a.paymentType === 'ONLINE' ? 'Online' : (a.disbursedDate ? 'Cash' : '-'),
        getStatusLabel(a.status),
        (a.remarks || 'N/A').replace(/"/g, '""')
      ]);
    });

    const cashTotal = filteredAdvances.filter(a => a.paymentType !== 'ONLINE' && a.disbursedDate).reduce((sum, a) => sum + a.amount, 0);
    const onlineTotal = filteredAdvances.filter(a => a.paymentType === 'ONLINE').reduce((sum, a) => sum + a.amount, 0);

    csvRows.push([]);
    csvRows.push([
      'Totals',
      '',
      '',
      '',
      '',
      '',
      totalAdvanceAmount.toFixed(2),
      totalSettledAmount.toFixed(2),
      totalRemainingBalance.toFixed(2),
      '',
      '',
      ''
    ]);
    csvRows.push([
      'Disbursal Mode Breakup',
      '',
      '',
      '',
      '',
      '',
      `Cash: ${cashTotal.toFixed(2)} | Online: ${onlineTotal.toFixed(2)}`,
      '',
      '',
      '',
      '',
      ''
    ]);
    csvRows.push([]);
    csvRows.push([
      `Generated On: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      '',
      '',
      '',
      '',
      '',
      `Generated By: ${currentUser.fullName || currentUser.username} (${currentUser.role})`
    ]);

    const csvContent = '\uFEFF' + csvRows.map(row => 
      row.map(cell => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cash_advances_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    const reportTitle = getReportTitle();
    const periodText = getPeriodText();
    const totalAdvanceAmount = filteredAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalSettledAmount = filteredAdvances.reduce((sum, a) => sum + (a.settledAmount || 0), 0);
    const totalRemainingBalance = filteredAdvances.reduce((sum, a) => {
      const rem = a.remainingAmount ?? Math.max(0, a.amount - (a.settledAmount || 0));
      return sum + Math.max(0, rem);
    }, 0);
    const cashTotal = filteredAdvances.filter(a => a.paymentType !== 'ONLINE' && a.disbursedDate).reduce((sum, a) => sum + a.amount, 0);
    const onlineTotal = filteredAdvances.filter(a => a.paymentType === 'ONLINE').reduce((sum, a) => sum + a.amount, 0);
    const colCount = 12;

    const header = ['Date', 'Advance ID', 'Project Ref. No.', 'Paid To', 'Particulars', 'Category', 'Advance Amount', 'Settled Amount', 'Balance Amount', 'Payment Mode', 'Status', 'Remarks'];
    const rows = filteredAdvances.map(a => {
      const rem = a.remainingAmount ?? Math.max(0, a.amount - (a.settledAmount || 0));
      return [
        formatDateToDMY(a.requestDate || a.createdAt),
        a.referenceNo || a.id,
        a.projectRefNo || '-',
        a.requestedBy || '-',
        a.purpose || '-',
        a.category || 'General',
        a.amount.toFixed(2),
        (a.settledAmount || 0).toFixed(2),
        Math.max(0, rem).toFixed(2),
        a.paymentType === 'ONLINE' ? 'Online' : (a.disbursedDate ? 'Cash' : '-'),
        getStatusLabel(a.status),
        a.remarks || 'N/A'
      ];
    });

    let xlsxContent = '<table>';
    xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 16px; font-weight: bold; color: #0f172a;">Ommax Electric Private Limited</td></tr>`;
    xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 13px; font-weight: bold; color: #d97706;">${reportTitle}</td></tr>`;
    xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 11px; font-weight: bold; color: #475569;">${periodText}</td></tr>`;
    xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 10px; color: #64748b;">Total Advances: ${filteredAdvances.length}</td></tr>`;
    xlsxContent += `<tr><td colspan="${colCount}"></td></tr>`;

    xlsxContent += '<tr>' + header.map(h => `<th style="background-color: #d97706; color: white; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1; white-space: nowrap;">${h}</th>`).join('') + '</tr>';
    
    rows.forEach(row => {
      xlsxContent += '<tr>' + row.map((cell, idx) => {
        const isParticulars = idx === 4;
        const style = isParticulars 
          ? 'padding: 6px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 500;'
          : `padding: 6px; border: 1px solid #e2e8f0; ${idx === 0 || idx === 1 || idx === 6 || idx === 7 || idx === 8 || idx === 9 ? 'white-space: nowrap;' : ''}`;
        return `<td style="${style}">${cell}</td>`;
      }).join('') + '</tr>';
    });

    // Add total row at bottom
    xlsxContent += `<tr style="font-weight: bold; background-color: #f8fafc;">
      <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;" colspan="6">
        Totals<br/><span style="font-size: 10px; font-weight: normal; color: #475569;">(Disbursal: Cash: ${cashTotal.toFixed(2)} + Online: ${onlineTotal.toFixed(2)})</span>
      </td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #d97706; white-space: nowrap; vertical-align: top;">${totalAdvanceAmount.toFixed(2)}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #059669; white-space: nowrap; vertical-align: top;">${totalSettledAmount.toFixed(2)}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #2563eb; white-space: nowrap; vertical-align: top;">${totalRemainingBalance.toFixed(2)}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1;" colspan="3"></td>
    </tr>`;

    xlsxContent += `<tr><td colspan="${colCount}"></td></tr>`;
    xlsxContent += `<tr><td colspan="4" style="font-size: 10px; color: #64748b;">Generated On: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td><td colspan="${colCount - 4}" style="font-size: 10px; color: #64748b; text-align: right;">Generated By: ${currentUser.fullName || currentUser.username}</td></tr>`;

    xlsxContent += '</table>';

    const blob = new Blob([xlsxContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cash_advances_report_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please enable pop-ups to export PDF.');
      return;
    }

    const reportTitle = getReportTitle();
    const periodText = getPeriodText();
    const totalAdvanceAmount = filteredAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalSettledAmount = filteredAdvances.reduce((sum, a) => sum + (a.settledAmount || 0), 0);
    const totalRemainingBalance = filteredAdvances.reduce((sum, a) => {
      const rem = a.remainingAmount ?? Math.max(0, a.amount - (a.settledAmount || 0));
      return sum + Math.max(0, rem);
    }, 0);
    const cashTotal = filteredAdvances.filter(a => a.paymentType !== 'ONLINE' && a.disbursedDate).reduce((sum, a) => sum + a.amount, 0);
    const onlineTotal = filteredAdvances.filter(a => a.paymentType === 'ONLINE').reduce((sum, a) => sum + a.amount, 0);

    const headerHTML = `
      <tr>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Date</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Advance ID</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Paid To</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left;">Particulars</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; min-width: 90px;">Project Ref</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Category</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: right; white-space: nowrap;">Advance Amt</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: right; white-space: nowrap;">Settled Amt</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: right; white-space: nowrap;">Balance</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: center; white-space: nowrap;">Mode</th>
        <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: center; white-space: nowrap;">Status</th>
      </tr>
    `;

    const getStatusStyle = (st: AdvanceStatus) => {
      switch (st) {
        case 'PENDING_APPROVAL': return 'background-color: #fef3c7; color: #92400e;';
        case 'APPROVED': return 'background-color: #dbeafe; color: #1e40af;';
        case 'DISBURSED': return 'background-color: #dcfce7; color: #166534;';
        case 'PARTIALLY_SETTLED': return 'background-color: #e0e7ff; color: #3730a3;';
        case 'SETTLEMENT_PENDING': return 'background-color: #fef9c3; color: #854d0e;';
        case 'SETTLED': return 'background-color: #f1f5f9; color: #475569;';
        case 'REJECTED': return 'background-color: #fee2e2; color: #991b1b;';
        case 'VOID': return 'background-color: #f3f4f6; color: #6b7280;';
        default: return 'background-color: #f1f5f9; color: #334155;';
      }
    };

    const rowsHTML = filteredAdvances.map(a => {
      const rem = a.remainingAmount ?? Math.max(0, a.amount - (a.settledAmount || 0));
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 9.5px;">
          <td style="padding: 5px; white-space: nowrap;">${formatDateToDMY(a.requestDate || a.createdAt)}</td>
          <td style="padding: 5px; font-family: monospace; font-weight: bold; white-space: nowrap;">${a.referenceNo || a.id}</td>
          <td style="padding: 5px; font-weight: bold; color: #0f172a; white-space: nowrap;">${a.requestedBy || '-'}</td>
          <td style="padding: 5px; color: #1e293b; font-size: 10px; font-weight: 500; line-height: 1.3;">${a.purpose || '-'}</td>
          <td style="padding: 5px 6px; font-family: monospace; font-size: 9px; color: #475569; white-space: nowrap;">${a.projectRefNo || '-'}</td>
          <td style="padding: 5px; white-space: nowrap;"><span style="background-color: #f1f5f9; color: #334155; padding: 2px 5px; border-radius: 4px; font-size: 8.5px; font-weight: bold;">${a.category || 'General'}</span></td>
          <td style="padding: 5px; font-weight: bold; color: #d97706; text-align: right; white-space: nowrap;">${currencySymbol}${a.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px; font-weight: bold; color: #059669; text-align: right; white-space: nowrap;">${currencySymbol}${(a.settledAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px; font-weight: bold; color: #2563eb; text-align: right; white-space: nowrap;">${currencySymbol}${Math.max(0, rem).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px; text-align: center; white-space: nowrap;">${a.paymentType === 'ONLINE' ? 'Online' : (a.disbursedDate ? 'Cash' : '-')}</td>
          <td style="padding: 5px; text-align: center; white-space: nowrap;"><span style="${getStatusStyle(a.status)} padding: 2px 5px; border-radius: 4px; font-size: 8.5px; font-weight: bold;">${getStatusLabel(a.status)}</span></td>
        </tr>
      `;
    }).join('');

    const totalsHTML = `
      <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; font-size: 10px;">
        <td style="padding: 8px 5px;" colspan="6">
          Totals
          <span style="font-size: 9px; font-weight: normal; color: #475569; margin-left: 8px;">
            (Disbursed via Cash: ${currencySymbol}${cashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Online: ${currencySymbol}${onlineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </span>
        </td>
        <td style="padding: 8px 5px; font-weight: bold; color: #d97706; text-align: right; white-space: nowrap;">${currencySymbol}${totalAdvanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 8px 5px; font-weight: bold; color: #059669; text-align: right; white-space: nowrap;">${currencySymbol}${totalSettledAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 8px 5px; font-weight: bold; color: #2563eb; text-align: right; white-space: nowrap;">${currencySymbol}${totalRemainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 8px 5px;" colspan="2"></td>
      </tr>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - ${periodText}</title>
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
              <h2 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 800;">${reportTitle}</h2>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">${periodText} | Generated on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} | Total Filtered Advances: <strong>${filteredAdvances.length}</strong></p>
            </div>
            <div style="text-align: right;">
              <span style="background: linear-gradient(135deg, #ec003f, #f7b944); color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 900; letter-spacing: 1px; display: inline-block;">
                CONNECT
              </span>
            </div>
          </div>
          <table>
            <thead>
              ${headerHTML}
            </thead>
            <tbody>
              ${rowsHTML}
              ${totalsHTML}
            </tbody>
          </table>
          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #475569; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div><strong>Generated On:</strong> ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div><strong>Generated By:</strong> ${currentUser.fullName || currentUser.username} (${currentUser.role})</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Bar with Stats & Action */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#f7b944] flex items-center justify-center font-bold shrink-0 shadow-xs">
            <HandCoins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Cash Advance & Settlements
              </h1>
              {metrics.activeCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {metrics.activeCount} Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Manage employee advances, cash disbursals and expense settlements.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          {/* Export Report Dropdown */}
          <div className="relative col-span-1 sm:col-span-auto">
            <button 
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              style={{ backgroundColor: '#f7b944' }}
              className="w-full sm:w-auto py-2 px-3.5 hover:opacity-90 text-amber-950 rounded-xl border border-amber-300/30 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs h-[36px] shrink-0 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-900 shrink-0" />
              <span>Export Report</span>
            </button>
            {isExportDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsExportDropdownOpen(false)}></div>
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSV();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Export as CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportXLSX();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Export as XLSX
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportPDF();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Export as PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settle Advance Button */}
          <button
            type="button"
            disabled={userDisbursedAdvances.length === 0}
            onClick={() => handleOpenSettleModal()}
            className={
              userDisbursedAdvances.length === 0
                ? "col-span-1 sm:col-span-auto w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed select-none transition-all h-[36px] shrink-0 whitespace-nowrap"
                : "col-span-1 sm:col-span-auto w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer h-[36px] shrink-0 whitespace-nowrap"
            }
            title={userDisbursedAdvances.length === 0 ? "No active advance balance on your account to settle" : "Settle Expense against Cash Advance"}
          >
            <Wallet className="w-4 h-4 stroke-[2.5]" />
            <span className="truncate">Settle Advance</span>
            {userDisbursedAdvances.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                {userDisbursedAdvances.length}
              </span>
            )}
          </button>

          {/* Request Advance Button */}
          <button
            type="button"
            onClick={() => {
              setReqRequester(currentUser.fullName || currentUser.username || '');
              setIsRequestModalOpen(true);
            }}
            style={{ backgroundColor: '#155dfc' }}
            className="col-span-2 sm:col-span-auto w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 hover:opacity-90 active:opacity-80 text-white font-extrabold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer h-[36px] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-white" />
            <span>Request Advance</span>
          </button>
        </div>
      </div>

      {/* 4 STATS CARDS GRID - 2x2 on mobile, 4 columns on desktop (Matching Cashbook Dashboard KPI UI) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CARD 1: ACTIVE ADVANCES HELD */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Active Advances Held
            </span>
            <span className="text-amber-600 bg-amber-50 p-1.5 rounded-lg shrink-0">
              <HandCoins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {currencySymbol}{metrics.activeBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="text-amber-600 font-bold">{metrics.activeCount} open</span> active advance{metrics.activeCount === 1 ? '' : 's'}
            </p>
          </div>
        </motion.div>

        {/* CARD 2: TOTAL DISBURSED */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Total Disbursed
            </span>
            <span className="text-emerald-600 bg-emerald-50 p-1.5 rounded-lg shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-none">
              {currencySymbol}{metrics.totalDisbursed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" />
              Paid outward cash advances
            </p>
          </div>
        </motion.div>

        {/* CARD 3: TOTAL SETTLED */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Total Settled
            </span>
            <span className="text-blue-600 bg-blue-50 p-1.5 rounded-lg shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight leading-none">
              {currencySymbol}{metrics.totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-500 shrink-0" />
              <span className="text-blue-600 font-bold">{metrics.settledCount} closed</span> advances
            </p>
          </div>
        </motion.div>

        {/* CARD 4: PENDING ACTIONS */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Pending Actions
            </span>
            <span className="text-amber-600 bg-amber-50 p-1.5 rounded-lg shrink-0 font-bold text-xs">
              {metrics.pendingCount}
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight leading-none">
              {metrics.pendingCount} <span className="text-xs font-bold text-slate-400">Actions</span>
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              {metrics.pendingApprovalCount} approval • {metrics.pendingDisburseCount} disburse
            </p>
          </div>
        </motion.div>
      </div>

      {/* 2. Advances List / Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter Controls Toolbar - Matching Expense Module Filter UI */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 lg:hidden">
            Filter Advances
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-2.5">
            {/* From Date */}
            <div className="col-span-1 sm:w-[130px]">
              <label htmlFor="adv-from" className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                From Date
              </label>
              <input 
                id="adv-from"
                type="date" 
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setIsAllTime(false);
                  setCurrentPage(1);
                }}
                disabled={isAllTime}
                className={`w-full py-1.5 px-2.5 bg-white border border-slate-200 focus:border-amber-500 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] ${isAllTime ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* To Date */}
            <div className="col-span-1 sm:w-[130px]">
              <label htmlFor="adv-to" className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                To Date
              </label>
              <input 
                id="adv-to"
                type="date" 
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setIsAllTime(false);
                  setCurrentPage(1);
                }}
                disabled={isAllTime}
                className={`w-full py-1.5 px-2.5 bg-white border border-slate-200 focus:border-amber-500 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] ${isAllTime ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* All time / Reset Button */}
            <div className="col-span-1 sm:w-[85px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                Period
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isAllTime) {
                    const d = new Date();
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    setFromDate(`${y}-${m}-01`);
                    setToDate(d.toISOString().split('T')[0]);
                    setIsAllTime(false);
                  } else {
                    setIsAllTime(true);
                    setFilterCategory([]);
                    setFilterPaidTo([]);
                    setFilterStatus([]);
                  }
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs h-[36px]"
              >
                {isAllTime ? 'Reset' : 'All time'}
              </button>
            </div>

            {/* Paid To Multi-Select Filter */}
            <div className="relative col-span-1 sm:w-[150px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                Paid to {filterPaidTo.length > 0 && <span className="text-amber-600 font-extrabold">({filterPaidTo.length})</span>}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsPaidToFilterOpen(!isPaidToFilterOpen);
                  setIsCategoryFilterOpen(false);
                  setIsStatusFilterOpen(false);
                }}
                className={`w-full py-1.5 px-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterPaidTo.length > 0 ? 'border-amber-400 bg-amber-50/20 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterPaidTo.length === 0
                    ? 'All Payees'
                    : filterPaidTo.length === 1
                    ? filterPaidTo[0]
                    : `${filterPaidTo.length} Selected`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {isPaidToFilterOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsPaidToFilterOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Paid To</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterPaidTo(uniquePayees);
                            setCurrentPage(1);
                          }}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterPaidTo([]);
                            setCurrentPage(1);
                          }}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search payees..."
                      value={paidToSearch}
                      onChange={(e) => setPaidToSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {uniquePayees
                        .filter(p => p.toLowerCase().includes(paidToSearch.toLowerCase()))
                        .map((payee, idx) => {
                          const isChecked = filterPaidTo.includes(payee);
                          return (
                            <label
                              key={idx}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterPaidTo(prev => 
                                    prev.includes(payee) ? prev.filter(p => p !== payee) : [...prev, payee]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="truncate">{payee}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Category Multi-Select Filter */}
            <div className="relative col-span-1 sm:w-[150px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                Category {filterCategory.length > 0 && <span className="text-amber-600 font-extrabold">({filterCategory.length})</span>}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryFilterOpen(!isCategoryFilterOpen);
                  setIsPaidToFilterOpen(false);
                  setIsStatusFilterOpen(false);
                }}
                className={`w-full py-1.5 px-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterCategory.length > 0 ? 'border-amber-400 bg-amber-50/20 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterCategory.length === 0
                    ? 'All Categories'
                    : filterCategory.length === 1
                    ? filterCategory[0]
                    : `${filterCategory.length} Selected`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {isCategoryFilterOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsCategoryFilterOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Category</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterCategory(expenseCategories.map(c => c.name));
                            setCurrentPage(1);
                          }}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterCategory([]);
                            setCurrentPage(1);
                          }}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {expenseCategories
                        .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map((cat, idx) => {
                          const isChecked = filterCategory.includes(cat.name);
                          return (
                            <label
                              key={idx}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterCategory(prev => 
                                    prev.includes(cat.name) ? prev.filter(c => c !== cat.name) : [...prev, cat.name]
                                  );
                                  setCurrentPage(1);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-600"
                              />
                              <span className="truncate">{cat.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Status Multi-Select Filter */}
            <div className="relative col-span-1 sm:w-[140px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                Status {filterStatus.length > 0 && <span className="text-amber-600 font-extrabold">({filterStatus.length})</span>}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsStatusFilterOpen(!isStatusFilterOpen);
                  setIsCategoryFilterOpen(false);
                  setIsPaidToFilterOpen(false);
                }}
                className={`w-full py-1.5 px-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                  filterStatus.length > 0 ? 'border-amber-400 bg-amber-50/20 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {filterStatus.length === 0
                    ? 'All Statuses'
                    : filterStatus.length === 1
                    ? (filterStatus[0] === 'PENDING_APPROVAL' ? 'Pending Approval' : filterStatus[0] === 'APPROVED' ? 'Approved' : filterStatus[0] === 'DISBURSED' ? 'Disbursed' : filterStatus[0] === 'PARTIALLY_SETTLED' ? 'Partially Settled' : filterStatus[0] === 'SETTLEMENT_PENDING' ? 'Pending Settlement' : filterStatus[0] === 'SETTLED' ? 'Settled' : 'Rejected')
                    : `${filterStatus.length} Selected`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {isStatusFilterOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsStatusFilterOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter Status</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterStatus(['PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'PARTIALLY_SETTLED', 'SETTLEMENT_PENDING', 'SETTLED', 'REJECTED']);
                            setCurrentPage(1);
                          }}
                          className="text-amber-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterStatus([]);
                            setCurrentPage(1);
                          }}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {[
                        { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
                        { id: 'APPROVED', label: 'Approved (Pending Disbursal)' },
                        { id: 'DISBURSED', label: 'Disbursed (Active)' },
                        { id: 'PARTIALLY_SETTLED', label: 'Partially Settled' },
                        { id: 'SETTLEMENT_PENDING', label: 'Pending Settlement' },
                        { id: 'SETTLED', label: 'Settled & Closed' },
                        { id: 'REJECTED', label: 'Rejected' },
                        { id: 'VOID', label: 'Voided' }
                      ].map((st, idx) => {
                        const isChecked = filterStatus.includes(st.id);
                        return (
                          <label
                            key={idx}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setFilterStatus(prev =>
                                  prev.includes(st.id) ? prev.filter(s => s !== st.id) : [...prev, st.id]
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
          </div>
        </div>

        {/* Advances Table / Cards */}
        {filteredAdvances.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HandCoins className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-xs font-bold text-slate-600">No cash advances found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;Request Advance&quot; to submit a new cash advance.
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View - 8 Columns matching Expense Module */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs relative">
                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs z-10 border-b border-slate-100">
                  <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-6 whitespace-nowrap">Date</th>
                    <th className="py-3.5 px-6 whitespace-nowrap">ID</th>
                    <th className="py-3.5 px-6">Paid To</th>
                    <th className="py-3.5 px-6">Particulars</th>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6">Advance Amount</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {paginatedAdvances.map(adv => (
                    <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* 1. Date */}
                      <td className="py-4 px-6 text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDateToDMY(adv.requestDate || adv.createdAt)}
                      </td>

                      {/* 2. ID */}
                      <td className="py-4 px-6 font-bold text-[11px] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingAdvance(adv)}
                          className="cursor-pointer focus:outline-hidden font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {adv.id}
                        </button>
                      </td>

                      {/* 3. Paid To */}
                      <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                        {adv.requestedBy}
                      </td>

                      {/* 4. Particulars */}
                      <td className="py-4 px-6 max-w-xs break-words text-slate-600">
                        <span className="font-medium text-slate-800">{adv.purpose}</span>
                        {adv.projectRefNo && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Ref: {adv.projectRefNo}
                          </div>
                        )}
                      </td>

                      {/* 5. Category */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-700 whitespace-nowrap">
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: categories.find(c => c.name === adv.category)?.color || '#f59e0b' }}
                          />
                          {adv.category || 'General'}
                        </span>
                      </td>

                      {/* 6. Advance Amount */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-bold text-sm text-slate-900">
                          {currencySymbol}{adv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {adv.status === 'DISBURSED' && (
                          <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                            Rem: {currencySymbol}{(adv.remainingAmount ?? (adv.amount - (adv.settledAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                        {adv.status === 'PARTIALLY_SETTLED' && (
                          <>
                            <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                              Settled: {currencySymbol}{(adv.settledAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                              Rem: {currencySymbol}{(adv.remainingAmount ?? (adv.amount - (adv.settledAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </>
                        )}
                        {adv.status === 'SETTLEMENT_PENDING' && (
                          <>
                            <div className="text-[10px] font-bold text-amber-600 mt-0.5">
                              Claim: {currencySymbol}{(adv.pendingSettlementAmount || adv.settledAmount || adv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Pending)
                            </div>
                            {Boolean(adv.pendingExcessAmount && adv.pendingExcessAmount > 0) && (
                              <div className="text-[10px] font-black text-rose-600 mt-0.5">
                                Extra Cash Due: {currencySymbol}{adv.pendingExcessAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </>
                        )}
                        {adv.status === 'SETTLED' && (
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            Settled: {currencySymbol}{Math.max(adv.amount, (adv.settledAmount || 0) + (adv.returnedCashAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {renderStatusBadge(adv.status, adv)}
                      </td>

                      {/* 8. Actions (Eye, Print, Edit, Delete) */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick View (Eye Icon) */}
                          <button
                            type="button"
                            onClick={() => setViewingAdvance(adv)}
                            className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                            title="View Advance Details & Slip"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Advance Cash Voucher */}
                          <button
                            type="button"
                            disabled={!isPrintableAdvance(adv)}
                            onClick={() => handlePrintAdvanceVoucher(adv)}
                            className={`p-1.5 rounded-lg transition-all ${
                              !isPrintableAdvance(adv)
                                ? 'opacity-30 cursor-not-allowed text-slate-300'
                                : 'hover:bg-slate-100 text-slate-400 hover:text-indigo-600 cursor-pointer'
                            }`}
                            title={!isPrintableAdvance(adv) ? "Print available after manager approval / disbursal" : "Print Advance Cash Voucher"}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {adv.status === 'VOID' || adv.status === 'DELETED' ? (
                            <span 
                              className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md" 
                              title={`Voided by ${adv.deletedBy || 'Admin'}: ${adv.deleteReason || ''}`}
                            >
                              Voided
                            </span>
                          ) : (
                            <>
                              {/* Edit Entry (Pencil Icon) - Till approval for users */}
                              {canUserEditAdvance(adv) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(adv)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                                  title="Edit Advance"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Entry (Trash2 Icon) - Only Admin */}
                              {canUserDeleteAdvance(adv) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(adv)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                                  title="Delete / Void Advance"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedAdvances.map(adv => (
                <div key={adv.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          {adv.id}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDateToDMY(adv.requestDate || adv.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-xs mt-1.5">
                        {adv.purpose}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Paid to: <strong className="text-slate-800">{adv.requestedBy}</strong>
                      </p>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-600">
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: categories.find(c => c.name === adv.category)?.color || '#f59e0b' }}
                          />
                          {adv.category || 'General'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block">
                        {currencySymbol}{adv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {adv.status === 'PARTIALLY_SETTLED' && (
                        <>
                          <span className="text-[10px] font-semibold text-emerald-700 block mt-0.5">
                            Settled: {currencySymbol}{(adv.settledAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 block mt-0.5">
                            Rem: {currencySymbol}{(adv.remainingAmount ?? (adv.amount - (adv.settledAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </>
                      )}
                      {adv.status === 'SETTLEMENT_PENDING' && (
                        <>
                          <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                            Claim: {currencySymbol}{(adv.pendingSettlementAmount || adv.settledAmount || adv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Pending)
                          </span>
                          {Boolean(adv.pendingExcessAmount && adv.pendingExcessAmount > 0) && (
                            <span className="text-[10px] font-black text-rose-600 block mt-0.5">
                              Extra Cash Due: {currencySymbol}{adv.pendingExcessAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </>
                      )}
                      {adv.status === 'SETTLED' && (
                        <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                          Settled: {currencySymbol}{Math.max(adv.amount, (adv.settledAmount || 0) + (adv.returnedCashAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      {adv.status === 'DISBURSED' && (
                        <span className="text-[10px] font-bold text-amber-700 block mt-0.5">
                          Rem: {currencySymbol}{(adv.remainingAmount ?? (adv.amount - (adv.settledAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      <div className="mt-1">
                        {renderStatusBadge(adv.status, adv)}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions: Eye, Print, Edit, Delete */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setViewingAdvance(adv)}
                      className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={!isPrintableAdvance(adv)}
                      onClick={() => handlePrintAdvanceVoucher(adv)}
                      className={`p-1.5 rounded-lg transition-all ${
                        !isPrintableAdvance(adv)
                          ? 'opacity-30 cursor-not-allowed text-slate-300'
                          : 'hover:bg-slate-100 text-slate-400 hover:text-indigo-600 cursor-pointer'
                      }`}
                      title={!isPrintableAdvance(adv) ? "Print available after manager approval / disbursal" : "Print Advance Cash Voucher"}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {adv.status === 'VOID' || adv.status === 'DELETED' ? (
                      <span 
                        className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md" 
                        title={`Voided by ${adv.deletedBy || 'Admin'}: ${adv.deleteReason || ''}`}
                      >
                        Voided
                      </span>
                    ) : (
                      <>
                        {canUserEditAdvance(adv) && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(adv)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                            title="Edit Advance"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canUserDeleteAdvance(adv) && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(adv)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                            title="Delete / Void Advance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls - Max 5 entries per page */}
            {renderPagination()}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Request Advance Modal                                           */}
      {/* ========================================================================= */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Request Cash Advance</h3>
                  <p className="text-[11px] text-slate-400 font-medium">For travel, site installation, or company expenses</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Advance Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Advance Amount ({currencySymbol}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      autoFocus
                      placeholder="e.g. 10000"
                      value={reqAmount}
                      onChange={e => setReqAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Request Category (same as expense module Category) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Request Category *
                  </label>
                  <select
                    required
                    value={reqCategory}
                    onChange={e => setReqCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors cursor-pointer h-[42px]"
                  >
                    <option value="" disabled>Select category...</option>
                    {expenseCategories.map((c, idx) => (
                      <option key={idx} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {expenseCategories.length === 0 && (
                      <option value="General">General</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Purpose / Description *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Travel and site installation expenses for Chennai client"
                  value={reqPurpose}
                  onChange={e => setReqPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Requester Name *
                  </label>
                  {isUserAdmin ? (
                    <select
                      required
                      value={reqRequester}
                      onChange={e => setReqRequester(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors cursor-pointer"
                    >
                      {users.map(u => {
                        const name = u.fullName || u.username;
                        return (
                          <option key={u.id || u.username} value={name}>
                            {name}
                          </option>
                        );
                      })}
                      {users.length === 0 && (
                        <option value={currentUser.fullName || currentUser.username}>
                          {currentUser.fullName || currentUser.username}
                        </option>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={currentUser.fullName || currentUser.username}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 cursor-not-allowed select-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRJ-2026-08"
                    value={reqProjectRef}
                    onChange={e => setReqProjectRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Any details for the cashier or approver"
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="px-5 py-2.5 bg-[#f7b944] hover:bg-[#f5ad25] text-slate-950 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReq ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Disburse Cash Modal                                             */}
      {/* ========================================================================= */}
      {disbursingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-amber-700" />
                <h3 className="font-extrabold text-sm text-slate-900">Disburse Cash Advance</h3>
              </div>
              <button 
                onClick={() => setDisbursingAdvance(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Advance ID:</span>
                  <span className="font-bold text-slate-900">{disbursingAdvance.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Employee:</span>
                  <span className="font-bold text-slate-900">{disbursingAdvance.requestedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Purpose:</span>
                  <span className="text-slate-800 text-right max-w-[200px] truncate">{disbursingAdvance.purpose}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Amount to Hand Over:</span>
                  <span className="font-black text-amber-900 text-sm">
                    {currencySymbol}{disbursingAdvance.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDisbursalPaymentType('CASH')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      disbursalPaymentType === 'CASH'
                        ? 'bg-amber-100/70 border-amber-400 text-amber-950'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Physical Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisbursalPaymentType('ONLINE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      disbursalPaymentType === 'ONLINE'
                        ? 'bg-amber-100/70 border-amber-400 text-amber-950'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Online / Bank Transfer</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                💡 <strong>Cash Book Note:</strong> Confirming this disbursal will automatically create a 
                <strong> Payment Voucher (Outward)</strong> in the Cash Book, reducing drawer cash by {currencySymbol}{disbursingAdvance.amount.toLocaleString('en-IN')}.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDisbursingAdvance(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onDisburseAdvance(disbursingAdvance.id, disbursalPaymentType);
                    setDisbursingAdvance(null);
                  }}
                  className="px-4 py-2 bg-[#f7b944] hover:bg-[#f5ad25] text-slate-950 font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer"
                >
                  Confirm & Disburse Cash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Settle Advance Modal (Multi-Advance Selection + Expense Entry)   */}
      {/* ========================================================================= */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-emerald-50/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Settle Cash Advance</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Record expense voucher against active advance balance</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSettleBatchSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs">
              
              {settleFormError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <div>{settleFormError}</div>
                </div>
              )}

              {/* 1. TOP LIVE ADVANCE BALANCE BANNER */}
              <div className="bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70 border border-amber-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Selected Advance ({selectedAdvances.length})
                    </span>
                    <span className="text-sm sm:text-base font-black font-outfit text-slate-900 block mt-0.5">
                      {currencySymbol}{totalSelectedAdvanceBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Expense Amount
                    </span>
                    <span className="text-sm sm:text-base font-black font-outfit text-rose-600 block mt-0.5">
                      {currencySymbol}{parsedEnteredExpenseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    isExcessClaim 
                      ? 'bg-rose-50/90 border-rose-200 text-rose-900' 
                      : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                  }`}>
                    <span className="text-[10px] uppercase font-bold block tracking-wider">
                      {isExcessClaim ? 'Excess to Reimburse' : 'Remaining Balance'}
                    </span>
                    <span className="text-sm sm:text-base font-black font-outfit block mt-0.5">
                      {currencySymbol}{Math.abs(liveRemainingAdvanceBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Coverage bar */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>Advance Coverage:</span>
                    <span className="font-outfit font-bold">
                      {totalSelectedAdvanceBalance > 0
                        ? `${Math.min(100, Math.round((parsedEnteredExpenseAmount / totalSelectedAdvanceBalance) * 100))}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200/70 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${isExcessClaim ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ 
                        width: totalSelectedAdvanceBalance > 0 
                          ? `${Math.min(100, (parsedEnteredExpenseAmount / totalSelectedAdvanceBalance) * 100)}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. CHOOSE ADVANCE(S) TO SETTLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <HandCoins className="w-4 h-4 text-amber-600" />
                    <span>Choose Advance(s) to Settle:</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    {selectedAdvances.length} of {userDisbursedAdvances.length} selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {userDisbursedAdvances.map(adv => {
                    const isChecked = selectedAdvanceIds.includes(adv.id);
                    const rem = adv.remainingAmount ?? (adv.amount - (adv.settledAmount || 0));
                    return (
                      <div
                        key={adv.id}
                        onClick={() => toggleAdvanceSelection(adv.id)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'border-amber-400 bg-amber-50/50 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 opacity-75'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 mt-0.5 cursor-pointer pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-outfit font-black text-xs text-indigo-700">
                              {adv.id}
                            </span>
                            <span className="font-outfit text-[10px] text-slate-400">
                              {formatDateToDMY(adv.requestDate || adv.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate mt-0.5" title={adv.purpose}>
                            {adv.purpose}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[11px]">
                            <span className="text-slate-500 font-medium font-outfit">Orig: {currencySymbol}{adv.amount.toLocaleString('en-IN')}</span>
                            <span className="font-outfit font-bold text-amber-800">
                              Rem: {currencySymbol}{rem.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. EXPENSE FORM INPUTS (matching RegisterView Outward Entry Window) */}
              {/* Row 1: Voucher No. & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Voucher No.
                  </label>
                  <input
                    type="text"
                    value={settleFormReference}
                    onChange={e => {
                      if (isVoucherEditable) setSettleFormReference(e.target.value);
                    }}
                    readOnly={!isVoucherEditable}
                    placeholder="e.g. 28"
                    required
                    className={`w-full py-2.5 px-3.5 border rounded-xl text-xs transition-all font-outfit font-bold ${
                      !isVoucherEditable
                        ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-50/50 border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={settleFormDate}
                    onChange={e => setSettleFormDate(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Row 2: Expense Amount & Request Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Expense Amount ({currencySymbol}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={settleFormAmount}
                      onChange={e => setSettleFormAmount(e.target.value)}
                      className="w-full py-2.5 pl-8 pr-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all font-outfit font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Payment Type
                  </label>
                  <div className="w-full py-2.5 px-3.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Cash (Advance Settlement)</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                </div>
              </div>

              {/* Row 3: Expense Category & Paid To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Expense Category *
                  </label>
                  <select
                    required
                    value={settleFormCategory}
                    onChange={e => setSettleFormCategory(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-600 transition-all cursor-pointer font-semibold"
                  >
                    <option value="">Choose Category</option>
                    {expenseCategories.map((cat, idx) => (
                      <option key={idx} value={cat.name}>{cat.name}</option>
                    ))}
                    {expenseCategories.length === 0 && (
                      <option value="General">General</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Paid To *
                  </label>
                  <input
                    type="text"
                    required
                    value={settleFormMerchant}
                    onChange={e => {
                      if (isUserAdmin) setSettleFormMerchant(e.target.value);
                    }}
                    readOnly={!isUserAdmin}
                    placeholder="Name of payee"
                    className={`w-full py-2.5 px-3.5 border rounded-xl text-xs transition-all font-semibold ${
                      !isUserAdmin
                        ? 'bg-slate-100/80 border-slate-200 cursor-not-allowed text-slate-700 font-bold'
                        : 'bg-slate-50/50 border-slate-200 focus:border-rose-500 focus:bg-white text-slate-700'
                    }`}
                  />
                </div>
              </div>

              {/* Row 4: Particulars (Purpose) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                  Particulars (Purpose) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={settleFormParticulars}
                  onChange={e => setSettleFormParticulars(e.target.value)}
                  placeholder="e.g. Travel tickets, Site lodging, Material purchase expenses..."
                  className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700"
                />
              </div>

              {/* Row 5: Project Ref & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Project Ref. No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={settleFormProjectRefNo}
                    onChange={e => setSettleFormProjectRefNo(e.target.value)}
                    placeholder="e.g. PRJ-2026-001 or Site Ref"
                    className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700 font-outfit font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Remarks / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={settleFormRemarks}
                    onChange={e => setSettleFormRemarks(e.target.value)}
                    placeholder="Provide any remarks or audit notes..."
                    className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700"
                  />
                </div>
              </div>

              {/* Row 6: Upload Receipt Document (Optional) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                  Upload Receipt Document (Optional)
                </label>
                <div 
                  onDragEnter={() => setSettleDragActive(true)}
                  onDragOver={(e) => { e.preventDefault(); setSettleDragActive(true); }}
                  onDragLeave={() => setSettleDragActive(false)}
                  onDrop={handleSettleReceiptDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                    settleDragActive ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200 bg-slate-50/30'
                  }`}
                >
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleSettleReceiptFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {settleReceiptFile ? (
                    <div className="space-y-1 relative z-10">
                      <FileText className="w-7 h-7 text-rose-600 mx-auto" />
                      <p className="text-[11px] font-bold text-slate-800 break-all">{settleReceiptFile.name}</p>
                      <p className="text-[9px] text-slate-400 font-outfit">{settleReceiptFile.size}</p>

                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Attachment Ready
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setSettleReceiptFile(null);
                          }}
                          className="mt-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                        >
                          Remove file
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Paperclip className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-[11px] font-bold text-slate-600">Drag & drop receipt here, or <span className="text-slate-900 underline">browse</span></p>
                      <p className="text-[9px] text-slate-400">PNG, JPG, JPEG (&lt;150KB) or PDF (&lt;250KB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 7: Final Settlement Checkbox & Audit Notes */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {!isExcessClaim && (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFinalSettlementBatch}
                      onChange={e => setIsFinalSettlementBatch(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">
                        Mark as Final Settlement (Close Selected Advance)
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Check this if this is the final expense bill for the selected advance(s).
                      </span>
                    </div>
                  </label>
                )}

                {isExcessClaim && (
                  <div className="text-[11px] p-2.5 bg-rose-50 rounded-xl text-rose-950 font-medium border border-rose-200">
                    <span>
                      ⚠️ Expense exceeds advance by <strong className="font-outfit font-black">{currencySymbol}{excessReimburseAmt.toFixed(2)}</strong>. Once approved by Manager, Admin will issue <strong className="font-outfit font-black">{currencySymbol}{excessReimburseAmt.toFixed(2)}</strong> extra cash to employee.
                    </span>
                  </div>
                )}

                {!isExcessClaim && isFinalSettlementBatch && (
                  <div className="text-[11px] p-2.5 bg-amber-50 rounded-xl text-amber-950 font-medium border border-amber-200">
                    {liveRemainingAdvanceBalance > 0 ? (
                      <span>
                        Unspent cash of <strong className="font-outfit font-black">{currencySymbol}{liveRemainingAdvanceBalance.toFixed(2)}</strong> will be returned to Cash Admin.
                      </span>
                    ) : (
                      <span>Advance balance will be zero and marked as fully settled.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettleBatch}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-900/10 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSubmittingSettleBatch ? 'Posting Settlement...' : 'Record Settlement & Post to Expense Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Reject Modal with Reason                                        */}
      {/* ========================================================================= */}
      {rejectingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-sm">Reject Advance Request</h3>
            </div>
            <p className="text-xs text-slate-600">
              Please enter the reason for rejecting request <strong>{rejectingAdvance.id}</strong>:
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Budget limit exceeded / Provide more details"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingAdvance(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={async () => {
                  await onRejectAdvance(rejectingAdvance.id, rejectionReason.trim(), currentUser.fullName || currentUser.username);
                  setRejectingAdvance(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-2xs disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Viewing Advance Details & Printable Slip                         */}
      {/* ========================================================================= */}
      {viewingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-amber-700" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Advance Summary Slip: {viewingAdvance.id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const isCashIssued = viewingAdvance.status === 'DISBURSED' || viewingAdvance.status === 'PARTIALLY_SETTLED' || viewingAdvance.status === 'SETTLEMENT_PENDING';
                  const rem = viewingAdvance.remainingAmount ?? (viewingAdvance.amount - (viewingAdvance.settledAmount || 0));
                  const canSettle = isCashIssued && rem > 0;
                  return (
                    <button
                      type="button"
                      disabled={!canSettle}
                      onClick={() => {
                        if (!canSettle) return;
                        const id = viewingAdvance.id;
                        setViewingAdvance(null);
                        handleOpenSettleModal(id);
                      }}
                      className={`px-3 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all ${
                        !canSettle
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none opacity-60'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs'
                      }`}
                      title={!canSettle ? "Settlement available only after cash is issued" : "Settle this Advance"}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Settle Advance</span>
                    </button>
                  );
                })()}
                <button
                  type="button"
                  disabled={!isPrintableAdvance(viewingAdvance)}
                  onClick={() => handlePrintAdvanceVoucher(viewingAdvance)}
                  className={`px-3 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all ${
                    !isPrintableAdvance(viewingAdvance)
                      ? 'bg-slate-100 text-slate-400 opacity-40 cursor-not-allowed'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer'
                  }`}
                  title={!isPrintableAdvance(viewingAdvance) ? "Print available after manager approval / disbursal" : "Print Advance Cash Voucher"}
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Print Advance Voucher</span>
                </button>
                <button 
                  onClick={() => setViewingAdvance(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Slip Header Box */}
              <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                      Advance Request Record
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {viewingAdvance.id}
                    </span>
                  </div>
                  <div>
                    {renderStatusBadge(viewingAdvance.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Requested By:</span>
                    <strong className="text-slate-900">{viewingAdvance.requestedBy}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Request Date:</span>
                    <strong className="text-slate-900">{formatDateToDMY(viewingAdvance.requestDate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Advance Amount:</span>
                    <strong className="text-amber-900">{currencySymbol}{viewingAdvance.amount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Project Ref:</span>
                    <strong className="text-slate-900">{viewingAdvance.projectRefNo || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Purpose & Notes */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Purpose / Justification
                </span>
                <p className="text-slate-800 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {viewingAdvance.purpose}
                </p>
              </div>

              {/* Workflow Audit Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-bold">1. Manager Approval:</span>
                  {viewingAdvance.approvedBy ? (
                    <span className="text-emerald-700 font-semibold">
                      Approved by {viewingAdvance.approvedBy} on {formatDateToDMY(viewingAdvance.approvedAt)}
                    </span>
                  ) : viewingAdvance.status === 'REJECTED' ? (
                    <span className="text-rose-700 font-semibold">
                      Rejected by {viewingAdvance.rejectedBy} ({viewingAdvance.rejectionReason})
                    </span>
                  ) : (
                    <span className="text-amber-700">Pending approval by {viewingAdvance.approverName || 'Manager'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-bold">2. Cash Disbursal:</span>
                  {viewingAdvance.disbursedBy ? (
                    <span className="text-blue-700 font-semibold">
                      Disbursed by {viewingAdvance.disbursedBy} ({viewingAdvance.paymentType || 'CASH'}) 
                      {viewingAdvance.disbursalVoucherNo && ` • Voucher: ${viewingAdvance.disbursalVoucherNo}`}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not yet disbursed</span>
                  )}
                </div>
              </div>

              {/* Settlement History List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Settlement Bills Submitted ({viewingAdvance.settlements?.length || 0})
                  </span>
                  <span className="text-[11px] font-bold text-slate-700">
                    Total: {currencySymbol}{(viewingAdvance.settledAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {(!viewingAdvance.settlements || viewingAdvance.settlements.length === 0) ? (
                  <p className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded-lg text-center">
                    No expense bills submitted against this advance yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {viewingAdvance.settlements.map((s, idx) => (
                      <div key={s.id || idx} className="p-2.5 bg-white flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{s.particulars}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{s.category}</span>
                            <span>•</span>
                            <span>{formatDateToDMY(s.date)}</span>
                            {s.voucherNo && <span>• Vch: {s.voucherNo}</span>}
                          </div>
                        </div>
                        <div className="font-bold text-slate-900 text-right">
                          {currencySymbol}{s.amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Final Balance Box */}
              {viewingAdvance.returnedCashAmount && viewingAdvance.returnedCashAmount > 0 ? (
                <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800 border border-emerald-200">
                  <span className="font-bold">Unspent Cash Returned:</span>
                  <span className="font-black text-sm">{currencySymbol}{viewingAdvance.returnedCashAmount.toLocaleString('en-IN')}</span>
                </div>
              ) : null}
              <div className="p-3.5 bg-slate-100/80 rounded-xl flex items-center justify-between font-bold text-xs">
                <span>Unspent Cash Balance Remaining:</span>
                <span className={viewingAdvance.remainingAmount === 0 ? 'text-emerald-700' : 'text-amber-800 text-sm'}>
                  {currencySymbol}{(viewingAdvance.remainingAmount ?? (viewingAdvance.amount - (viewingAdvance.settledAmount || 0))).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewingAdvance(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: Edit Advance Modal                                               */}
      {/* ========================================================================= */}
      {editingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Edit Advance ({editingAdvance.id})</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Update cash advance details</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingAdvance(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Advance Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Advance Amount ({currencySymbol}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer h-[42px]"
                  >
                    {expenseCategories.map((c, idx) => (
                      <option key={idx} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {expenseCategories.length === 0 && (
                      <option value="General">General</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Purpose / Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editPurpose}
                  onChange={e => setEditPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Requester Name *
                  </label>
                  {isUserAdmin ? (
                    <select
                      required
                      value={editRequester}
                      onChange={e => setEditRequester(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer"
                    >
                      {users.map(u => {
                        const name = u.fullName || u.username;
                        return (
                          <option key={u.id || u.username} value={name}>
                            {name}
                          </option>
                        );
                      })}
                      {users.length === 0 && (
                        <option value={editingAdvance.requestedBy}>
                          {editingAdvance.requestedBy}
                        </option>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={editingAdvance.requestedBy}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 cursor-not-allowed select-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={editProjectRef}
                    onChange={e => setEditProjectRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdvance(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: Delete / Void Confirmation Modal (Matching Expense Module)      */}
      {/* ========================================================================= */}
      {deletingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Delete / Void Cash Advance</h3>
                  <p className="text-[11px] text-rose-700 font-semibold">
                    {deletingAdvance.id}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setDeletingAdvance(null)}
                className="p-1 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Advance ID:</span>
                  <span className="font-bold text-slate-800">{deletingAdvance.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Amount:</span>
                  <span className="font-bold text-slate-900">{currencySymbol}{deletingAdvance.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Paid To / Requester:</span>
                  <span className="font-semibold text-slate-700">{deletingAdvance.requestedBy}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Voiding / Deletion <span className="text-amber-700 font-semibold ml-0.5">(Required for Voiding)</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={e => {
                    setDeleteReason(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  placeholder="e.g. Cancelled request, Duplicate entry, Created by mistake..."
                  rows={2}
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden transition-all ${
                    deleteError ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 focus:border-rose-500'
                  }`}
                />
                {deleteError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {deleteError}
                  </p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">Deletion Options:</p>
                <ul className="list-disc pl-4 space-y-0.5 font-medium text-amber-800">
                  <li><strong className="text-rose-700">Void Advance:</strong> Keeps record with strikeout line for audit trace.</li>
                  <li><strong className="text-rose-700">Permanently Delete:</strong> Completely purges entry from database and releases ID to use again.</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingAdvance(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDelete}
                  onClick={() => handleConfirmDelete(true)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  title="Completely remove record from database and release ID"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Permanently Delete
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDelete}
                  onClick={() => handleConfirmDelete(false)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/10 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  Void Advance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
