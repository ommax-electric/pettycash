import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Filter, FileSpreadsheet, Download, X, Paperclip, AlertCircle, CheckCircle, CheckCircle2, FileText, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Clock, Check, Printer, History, Eye, Info, ExternalLink, RefreshCw, ChevronDown, IndianRupee, Ban, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Transaction, CategoryLimit, User, TransactionType, TransactionStatus, AppSettings, IntegrationSettings } from '../types';
import { openAttachmentInNewTab, sortTransactionsByIdDesc } from '../utils';
import { uploadReceiptToCloudinary, compressAndProcessFile } from '../services/cloudinaryService';
import { convertExternalUrlToDataUrl, uploadFileToCloudinary, deleteFileFromCloudinary } from '../services/fileAttachmentService';
import { uploadToFirebaseStorage } from '../services/firebaseStorageService';
import { db, doc, updateDoc } from '../firebase';

interface RegisterViewProps {
  transactions: Transaction[];
  categories: CategoryLimit[];
  currentUser: User;
  onAddTransaction: (txn: Omit<Transaction, 'id' | 'recordedBy'>) => void;
  onUpdateStatus: (id: string, status: TransactionStatus) => void;
  onUpdateTransaction?: (txn: Transaction) => void;
  onDeleteTransaction?: (id: string, reason?: string, permanent?: boolean) => void;
  forceType?: 'IN' | 'OUT';
  appSettings?: AppSettings;
  integrationSettings?: IntegrationSettings;
}

// Dedicated PDF In-App Previewer Component
function PdfViewerModalContent({
  url,
  attachmentBlobUrl,
  name,
  size,
  openAttachmentInNewTab
}: {
  url: string;
  attachmentBlobUrl: string | null;
  name: string;
  size: string;
  openAttachmentInNewTab: (url: string, name?: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const pdfPage = 1;

  const isCloudinary = url.includes('cloudinary.com');
  
  // Construct Cloudinary page image rendering URL (works for PDFs hosted on Cloudinary)
  let cloudinaryPageImgUrl: string | null = null;
  if (isCloudinary) {
    let cleanUrl = url;
    if (cleanUrl.includes('/image/upload/')) {
      cleanUrl = cleanUrl.replace('/image/upload/', `/image/upload/f_png,pg_${pdfPage},w_1200,c_limit/`);
    } else if (cleanUrl.includes('/raw/upload/')) {
      cleanUrl = cleanUrl.replace('/raw/upload/', `/image/upload/f_png,pg_${pdfPage},w_1200,c_limit/`);
    }
    if (/\.pdf$/i.test(cleanUrl)) {
      cleanUrl = cleanUrl.replace(/\.pdf$/i, '.png');
    } else if (!/\.(png|jpg|jpeg|webp)$/i.test(cleanUrl)) {
      cleanUrl = `${cleanUrl}.png`;
    }
    cloudinaryPageImgUrl = cleanUrl;
  }

  return (
    <div className="w-full bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 min-h-[48vh] flex flex-col items-center justify-center overflow-hidden relative">
      {cloudinaryPageImgUrl && !imgError ? (
        <div className="flex flex-col items-center justify-center w-full">
          <img
            key={`pdf-page-${pdfPage}`}
            src={cloudinaryPageImgUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="max-w-full max-h-[50vh] sm:max-h-[56vh] object-contain rounded-xl border border-slate-100 shadow-xs"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">{name}</h4>
            <p className="text-xs text-slate-400 font-mono mt-1">{size || 'PDF Document'}</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            To view the full interactive PDF document with original formatting, click below to open in browser tab.
          </p>
          <button
            type="button"
            onClick={() => openAttachmentInNewTab(attachmentBlobUrl || url, name)}
            className="px-5 py-2.5 bg-[#f7b944] hover:bg-[#e5a833] text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open PDF in New Window</span>
          </button>
        </div>
      )}
    </div>
  );
}

const formatDateToDMY = (dateStr: string, formatStr: string = 'DD/MM/YYYY') => {
  if (!dateStr) return '';
  const cleanDateStr = dateStr.includes(' ') ? dateStr.split(' ')[0] : (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr);
  const parts = cleanDateStr.split('-');
  if (parts.length === 3) {
    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2];
    if (formatStr === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
    if (formatStr === 'DD-MM-YYYY') return `${dd}-${mm}-${yyyy}`;
    if (formatStr === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
    if (formatStr === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
    if (formatStr === 'DD-MMM-YYYY') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(mm, 10) - 1;
      const mmm = monthNames[monthIdx] || mm;
      return `${dd}-${mmm}-${yyyy}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
};

const formatVoidDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  const str = dateStr.trim();
  if (str.includes('|') || str.includes('AM') || str.includes('PM') || str.includes('am') || str.includes('pm')) {
    return str;
  }

  // Check if string is a local YYYY-MM-DD [T/space] HH:MM:SS string without 'Z' or offset
  const localMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  const isUtcIso = str.endsWith('Z') || str.includes('+') || (str.includes('-') && str.indexOf('-', 8) > 10);

  if (localMatch && !isUtcIso) {
    const [, yyyy, mm, dd, hh, min] = localMatch;
    const formattedDay = dd.padStart(2, '0');
    const formattedMonth = mm.padStart(2, '0');
    const formattedYear = yyyy;

    if (hh !== undefined && hh !== '') {
      let hourNum = parseInt(hh, 10);
      const dayPeriod = hourNum >= 12 ? 'PM' : 'AM';
      hourNum = hourNum % 12 || 12;
      const formattedHour = String(hourNum).padStart(2, '0');
      const formattedMin = (min || '00').padStart(2, '0');
      return `${formattedDay}-${formattedMonth}-${formattedYear} | ${formattedHour}:${formattedMin} ${dayPeriod}`;
    }
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
  }

  // ISO string with UTC 'Z' or offset -> parse and format in Asia/Kolkata (IST)
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

export default function RegisterView({ 
  transactions, 
  categories, 
  currentUser, 
  onAddTransaction, 
  onUpdateStatus, 
  onUpdateTransaction,
  onDeleteTransaction,
  forceType,
  appSettings,
  integrationSettings
}: RegisterViewProps) {
  const currencySymbol = appSettings?.currencySymbol || '₹';
  const dateFormat = appSettings?.dateFormat || 'DD/MM/YYYY';
  const formatDate = (dateStr: string) => formatDateToDMY(dateStr, dateFormat);
  const forceTypeVal: string | undefined = forceType;
  const todayStr = new Date().toISOString().split('T')[0];

  // Company Stamp Settings
  const companyStampUrl = appSettings?.companyStampUrl || '';
  const companyStampEnabled = appSettings?.companyStampEnabled !== false && !!companyStampUrl;
  const companyStampRotate = appSettings?.companyStampRotate ?? -12;
  const companyStampOpacity = appSettings?.companyStampOpacity ?? 0.85;
  const companyStampWidth = appSettings?.companyStampWidth ?? 85;
  // Query Filter States
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterPayee, setFilterPayee] = useState<string[]>([]);
  const [filterPaymentMode, setFilterPaymentMode] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Popover toggle states for multi-select checklist filters
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isPayeeFilterOpen, setIsPayeeFilterOpen] = useState(false);
  const [isPaymentModeFilterOpen, setIsPaymentModeFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [payeeSearch, setPayeeSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Date Filter States (used especially in Inward module)
  const getCurrentMonthDates = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return {
      firstDay: `${y}-${m}-01`,
      today: d.toISOString().split('T')[0]
    };
  };

  const [fromDate, setFromDate] = useState(() => {
    return getCurrentMonthDates().firstDay;
  });
  const [toDate, setToDate] = useState(() => {
    return getCurrentMonthDates().today;
  });
  const [isAllTime, setIsAllTime] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleOpenDeleteModal = (txn: Transaction) => {
    if (currentUser.role !== 'ADMIN') return;
    setDeletingTxn(txn);
    setDeleteReasonInput('');
    setDeleteError('');
  };

  const handleConfirmDeleteWithReason = (permanent = false) => {
    if (!permanent && !deleteReasonInput.trim()) {
      setDeleteError('Reason is required when voiding a voucher.');
      return;
    }
    const reasonStr = deleteReasonInput.trim() || (permanent ? 'Permanently deleted by user' : 'Cancelled / voided by user');
    if (deletingTxn && onDeleteTransaction) {
      onDeleteTransaction(deletingTxn.id, reasonStr, permanent);
    }
    setDeletingTxn(null);
    setDeleteReasonInput('');
    setDeleteError('');
  };

  // Batch Print States
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatchTxnIds, setSelectedBatchTxnIds] = useState<string[]>([]);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');

  const isPrintableVoucher = (txn: Transaction | null | undefined): boolean => {
    if (!txn) return false;
    const s = (txn.status || '').toString().toUpperCase();
    return s === 'PAID' || s === 'VOID' || s === 'DELETED';
  };

  const toggleBatchSelect = (id: string) => {
    setSelectedBatchTxnIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSelectLatest3 = () => {
    const latest3 = filteredTransactions.filter(isPrintableVoucher).slice(0, 3).map(t => t.id);
    setSelectedBatchTxnIds(latest3);
  };

  const handleClearBatchSelection = () => {
    setSelectedBatchTxnIds([]);
  };

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState<TransactionType>(forceType || 'OUT');
  const [formReference, setFormReference] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formMerchant, setFormMerchant] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formProjectRefNo, setFormProjectRefNo] = useState('');
  const [formPaymentType, setFormPaymentType] = useState<'CASH' | 'ONLINE'>('CASH');

  // Dynamic Confirmation Popup State
  const [confirmPopupData, setConfirmPopupData] = useState<{
    isEdit: boolean;
    isInward?: boolean;
    voucherNo: string;
    amount: number;
    category: string;
    userName: string;
    activeColorBorderClass: string;
    onConfirm: () => void;
  } | null>(null);

  // Manual Voucher Entry & Duplicate Check logic
  const isVoucherEditable = currentUser.role !== 'AUDITOR' && (
    Boolean(appSettings?.allowManualVoucherNumbering) || currentUser.role === 'ADMIN'
  );

  const liveRefVal = formReference.trim();
  const getNumericPart = (str: string): number | null => {
    if (!str) return null;
    const match = str.trim().match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  const normalizeVoucherStr = (str: string): string => {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/\d+/g, (m) => String(parseInt(m, 10)));
  };

  const liveRefNum = getNumericPart(liveRefVal);
  const liveRefNorm = normalizeVoucherStr(liveRefVal);
  const liveIsCurrentIn = forceTypeVal === 'IN' || (liveRefVal ? liveRefVal.toUpperCase().startsWith('IW-') : false);

  const duplicateTxnWarning = liveRefVal ? transactions.find(t => {
    if (t.status === 'DELETED') return false;
    if (editingTransaction) {
      if (t.id === editingTransaction.id) return false;
      if (editingTransaction.reference && (
        t.reference === editingTransaction.reference ||
        t.id === editingTransaction.reference ||
        t.reference === editingTransaction.id
      )) {
        return false;
      }
    }
    const isTargetIn = t.type === 'IN' || (t.reference && t.reference.toUpperCase().startsWith('IW-'));
    if (liveIsCurrentIn !== isTargetIn) return false;

    const existingNum = getNumericPart(t.reference);
    const existingNorm = normalizeVoucherStr(t.reference);

    if (liveRefNum !== null && existingNum !== null && liveRefNum === existingNum) {
      return true;
    }
    if (liveRefNorm && existingNorm && liveRefNorm === existingNorm) {
      return true;
    }
    return false;
  }) : undefined;

  React.useEffect(() => {
    if (forceType) {
      setFormType(forceType);
    }
  }, [forceType]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory, filterPayee, filterPaymentMode, filterType, filterStatus, fromDate, toDate, isAllTime]);
  
  // Drag and drop / Receipt File states
  const [dragActive, setDragActive] = useState(false);
  const [receiptFile, setReceiptFile] = useState<{ 
    name: string; 
    size: string; 
    dataUrl?: string | null;
    cloudinaryUrl?: string | null;
    isUploading?: boolean;
    uploadError?: string | null;
  } | null>(null);

  const [selectedDetailTransaction, setSelectedDetailTransaction] = useState<Transaction | null>(null);
  const [viewingQuickViewTxn, setViewingQuickViewTxn] = useState<Transaction | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<Transaction | null>(null);
  const [attachmentBlobUrl, setAttachmentBlobUrl] = useState<string | null>(null);

  // Synchronize detail drawer with latest transaction state
  useEffect(() => {
    if (selectedDetailTransaction) {
      const updated = transactions.find(t => t.id === selectedDetailTransaction.id);
      if (updated) {
        setSelectedDetailTransaction(updated);
      }
    }
  }, [transactions]);

  // Synchronize quick view modal with latest transaction state
  useEffect(() => {
    if (viewingQuickViewTxn) {
      const updated = transactions.find(t => t.id === viewingQuickViewTxn.id);
      if (updated) {
        setViewingQuickViewTxn(updated);
      }
    }
  }, [transactions]);

  const [showMerchantSuggestions, setShowMerchantSuggestions] = useState(false);

  const merchantSuggestions = React.useMemo(() => {
    const query = formMerchant.trim().toLowerCase();
    if (query.length < 2) return [];

    const uniqueMap = new Map<string, string>();
    transactions.forEach(t => {
      if (t.merchant && t.merchant.trim()) {
        const trimmed = t.merchant.trim();
        const lower = trimmed.toLowerCase();
        if (!uniqueMap.has(lower)) {
          uniqueMap.set(lower, trimmed);
        }
      }
    });

    const suggestions: string[] = [];
    uniqueMap.forEach((originalName, lowerName) => {
      if (lowerName.includes(query)) {
        suggestions.push(originalName);
      }
    });

    return suggestions
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query);
        const bStarts = b.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 6);
  }, [formMerchant, transactions]);

  React.useEffect(() => {
    let active = true;

    if (viewingAttachment?.receiptUrl) {
      const url = viewingAttachment.receiptUrl;

      if (url.startsWith('data:')) {
        try {
          const parts = url.split(',');
          if (parts.length >= 2) {
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            const binary = atob(parts[1]);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              array[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([array], { type: mime });
            const bUrl = URL.createObjectURL(blob);
            if (active) setAttachmentBlobUrl(bUrl);
            return () => {
              URL.revokeObjectURL(bUrl);
            };
          }
        } catch (err) {
          console.error('Failed to create Blob URL from Data URL:', err);
          if (active) setAttachmentBlobUrl(null);
        }
      } else if (url.startsWith('http')) {
        if (active) setAttachmentBlobUrl(null);
      } else {
        setAttachmentBlobUrl(null);
      }
    } else {
      setAttachmentBlobUrl(null);
    }

    return () => {
      active = false;
    };
  }, [viewingAttachment?.id, viewingAttachment?.receiptUrl]);


  const [formError, setFormError] = useState('');

  // Unique Payees / Merchants for OUT transactions
  const uniquePayees = Array.from(
    new Set(
      transactions
        .filter(t => t.type === 'OUT' && t.merchant)
        .map(t => t.merchant.trim())
    )
  ).sort((a, b) => a.localeCompare(b));

  const expenseCategories = React.useMemo(() => {
    return categories.filter(c => c.type !== 'IN' && c.name !== 'Cash Source');
  }, [categories]);

  // Apply filters
  const filteredTransactions = sortTransactionsByIdDesc(
    transactions.filter(txn => {
      const matchesType = forceType ? txn.type === forceType : (filterType === 'ALL' || txn.type === filterType);
      
      const txnDateStr = txn.date;
      const matchesDate = isAllTime ? true : ((!fromDate || txnDateStr >= fromDate) && (!toDate || txnDateStr <= toDate));

      if (forceType === 'IN') {
        return matchesType && matchesDate;
      } else if (forceType === 'OUT') {
        const matchesPayee = filterPayee.length === 0 || filterPayee.includes('ALL') || filterPayee.includes(txn.merchant.trim());
        const matchesCategory = filterCategory.length === 0 || filterCategory.includes('ALL') || filterCategory.includes(txn.category);
        const matchesPaymentMode = filterPaymentMode.length === 0 || filterPaymentMode.includes('ALL') || filterPaymentMode.includes(txn.paymentType || 'CASH');
        const matchesStatus = filterStatus.length === 0 || filterStatus.includes('ALL') || filterStatus.includes(txn.status || 'PAID');

        let matchesUser = true;
        if (currentUser.role === 'USER') {
          const uName = (currentUser.fullName || '').toLowerCase();
          const uId = (currentUser.username || '').toLowerCase();
          const recBy = (txn.recordedBy || '').toLowerCase();
          const reqBy = (txn.requestedBy || '').toLowerCase();
          const merch = (txn.merchant || '').toLowerCase();

          matchesUser = recBy === uName || reqBy === uName || merch === uName || reqBy === uId;
        }

        return matchesType && matchesDate && matchesPayee && matchesCategory && matchesPaymentMode && matchesStatus && matchesUser;
      } else {
        const matchesSearch = 
          txn.merchant.toLowerCase().includes(search.toLowerCase()) ||
          txn.reference.toLowerCase().includes(search.toLowerCase()) ||
          txn.description.toLowerCase().includes(search.toLowerCase()) ||
          (txn.projectRefNo || '').toLowerCase().includes(search.toLowerCase());

        const matchesCategory = filterCategory.length === 0 || filterCategory.includes('ALL') || filterCategory.includes(txn.category);
        const matchesStatus = filterStatus.length === 0 || filterStatus.includes('ALL') || filterStatus.includes(txn.status || 'PAID');

        return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesDate;
      }
    })
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Validate and set uploaded file with revised 150KB (images) / 250KB (PDF) size limits & Firebase Storage auto-upload
  const validateAndSetFile = async (file: File) => {
    setFormError('');
    
    // Strictly allowed 4 formats: PNG, JPG, JPEG, PDF
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'pdf'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (!allowedExtensions.includes(extension)) {
      setFormError('Invalid file format. Strictly only PNG, JPG, JPEG, and PDF documents are allowed.');
      setReceiptFile(null);
      return false;
    }
    
    // File size limits: Images < 150 KB, PDF < 250 KB
    const isPdf = extension === 'pdf';
    const maxSizeKB = isPdf ? 250 : 150;
    const maxSizeBytes = maxSizeKB * 1024;

    if (file.size > maxSizeBytes) {
      setFormError(`File size exceeds the ${maxSizeKB} KB limit for ${isPdf ? 'PDF' : 'image'} files. Selected file is ${(file.size / 1024).toFixed(1)} KB.`);
      setReceiptFile(null);
      return false;
    }
    
    try {
      // If there was a previous Cloudinary attachment on the voucher/form, queue it for cleanup
      const prevCloudinaryUrl = receiptFile?.cloudinaryUrl || (editingTransaction?.receiptUrl?.includes('cloudinary.com') ? editingTransaction.receiptUrl : null);

      const processed = await compressAndProcessFile(file);
      
      const cloudName = (integrationSettings?.cloudinaryCloudName || localStorage.getItem('cloudinary_cloud_name') || '').trim();
      const apiKey = (integrationSettings?.cloudinaryApiKey || localStorage.getItem('cloudinary_api_key') || '').trim();
      const apiSecret = (integrationSettings?.cloudinaryApiSecret || localStorage.getItem('cloudinary_api_secret') || '').trim();
      const uploadPreset = (integrationSettings?.cloudinaryUploadPreset || localStorage.getItem('cloudinary_upload_preset') || '').trim();

      let uploadedCloudinaryUrl: string | null = null;
      let uploadedPublicId: string | null = null;
      if (cloudName) {
        setReceiptFile({
          name: processed.name,
          size: processed.size,
          dataUrl: processed.dataUrl,
          cloudinaryUrl: null,
          isUploading: true,
          uploadError: null
        });

        // Generate structured folder path: Petty Cash/YYYY/MM and voucher prefix
        const [yyyy, mm] = (formDate || new Date().toISOString().split('T')[0]).split('-');
        const folderPath = `Petty Cash/${yyyy || '2026'}/${mm || '08'}`;
        const cleanName = processed.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filePublicId = cleanName;

        const cRes = await uploadFileToCloudinary(processed.dataUrl, filePublicId, folderPath, {
          cloudName,
          apiKey,
          apiSecret,
          uploadPreset
        });

        if (cRes.success && cRes.url) {
          uploadedCloudinaryUrl = cRes.url;
          uploadedPublicId = cRes.publicId || null;

          // Delete the previous Cloudinary file if it exists and is different from the newly uploaded URL
          if (prevCloudinaryUrl && prevCloudinaryUrl !== cRes.url) {
            deleteFileFromCloudinary(prevCloudinaryUrl, {
              cloudName,
              apiKey,
              apiSecret
            }).catch(e => console.warn('Cloudinary previous file cleanup error:', e));
          }
        }
      }

      setReceiptFile({
        name: processed.name,
        size: processed.size,
        dataUrl: uploadedCloudinaryUrl || processed.dataUrl,
        cloudinaryUrl: uploadedCloudinaryUrl || null,
        cloudinaryPublicId: uploadedPublicId,
        isUploading: false,
        uploadError: (cloudName && !uploadedCloudinaryUrl)
          ? 'Cloudinary upload could not be completed. Check credentials in Admin Settings.'
          : null
      });

      return true;
    } catch (err) {
      setFormError('Failed to process attachment file.');
      setReceiptFile(null);
      return false;
    }
  };

  // Handle Drag & Drop receipts
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const getNextInwardVoucherNumber = (txns: Transaction[], excludeId?: string): string => {
    const existingNums = new Set<number>();
    txns.forEach(t => {
      if (excludeId && t.id === excludeId) return;
      const isTxnIn = t.type === 'IN' || (t.reference && t.reference.toUpperCase().startsWith('IW-'));
      if (isTxnIn) {
        const match = (t.reference || '').match(/\d+/);
        if (match) {
          existingNums.add(parseInt(match[0], 10));
        }
      }
    });
    let nextNum = 1;
    while (existingNums.has(nextNum)) {
      nextNum++;
    }
    return `IW-${String(nextNum).padStart(3, '0')}`;
  };

  const getNextOutwardVoucherNumber = (txns: Transaction[], excludeId?: string): number => {
    let maxNum = 0; // Starts sequentially from 1 (or next after existing highest outward voucher)
    txns.forEach(t => {
      if (excludeId && t.id === excludeId) return;
      if (t.type === 'IN' || (t.reference && t.reference.toUpperCase().startsWith('IW-'))) return;
      const refStr = (t.reference || '').trim();
      if (refStr) {
        const matches = refStr.match(/\d+/g);
        if (matches) {
          matches.forEach(m => {
            const val = parseInt(m, 10);
            if (val > maxNum && val < 1000) {
              maxNum = val;
            }
          });
        }
      }
    });
    return maxNum + 1;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormType(forceType || 'OUT');
    setFormReference('');
    setFormAmount('');
    setFormCategory('');
    setFormMerchant('');
    setShowMerchantSuggestions(false);
    setFormDescription('');
    setFormRemarks('');
    setFormProjectRefNo('');
    setFormPaymentType('CASH');
    setReceiptFile(null);
    setFormError('');
  };

  const handleOpenAddModal = (overrideType?: TransactionType) => {
    setEditingTransaction(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    const targetType = overrideType || forceType || 'OUT';
    setFormType(targetType);
    if (targetType === 'IN') {
      const nextInRef = getNextInwardVoucherNumber(transactions);
      setFormReference(nextInRef);
      setFormCategory('Cash Source');
      setFormMerchant('Corporate Treasury');
    } else {
      const nextNum = getNextOutwardVoucherNumber(transactions);
      setFormReference(String(nextNum));
      setFormCategory('');
      setFormMerchant(currentUser.fullName || '');
    }
    setShowMerchantSuggestions(false);
    setFormDescription('');
    setFormRemarks('');
    setFormProjectRefNo('');
    setFormPaymentType('CASH');
    setReceiptFile(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEditClick = (txn: Transaction) => {
    if (currentUser.role !== 'ADMIN') return;
    setEditingTransaction(txn);
    setFormDate(txn.date);
    setFormType(txn.type);
    setFormReference(txn.reference);
    setFormAmount(String(txn.amount));
    setFormCategory(txn.category);
    setFormMerchant(txn.merchant);
    setFormDescription(txn.description);
    setFormRemarks(txn.remarks || '');
    setFormProjectRefNo(txn.projectRefNo || '');
    setFormPaymentType(txn.paymentType || 'CASH');
    setReceiptFile(txn.receiptName || txn.receiptUrl ? { 
      name: txn.receiptName || 'Attached Document', 
      size: txn.receiptSize || 'N/A', 
      dataUrl: txn.receiptUrl || null,
      cloudinaryUrl: txn.receiptUrl?.includes('cloudinary.com') ? txn.receiptUrl : null
    } : null);
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (formDate > todayStr) {
      setFormError('Future dates cannot be selected for posting entries.');
      return;
    }

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be a positive number greater than zero.');
      return;
    }

    let refVal = formReference.trim();
    let merchVal = formMerchant.trim();

    // Helper to get numeric value from voucher ID string (e.g. "27", "OW-012" -> 27)
    const getNumericPart = (str: string): number | null => {
      if (!str) return null;
      const match = str.trim().match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };

    const normalizeVoucherStr = (str: string): string => {
      if (!str) return '';
      return str.trim().toLowerCase().replace(/\d+/g, (m) => String(parseInt(m, 10)));
    };

    const effectiveFormType = forceTypeVal || formType;

    if (effectiveFormType === 'IN') {
      if (!refVal || !refVal.toUpperCase().startsWith('IW-')) {
        refVal = getNextInwardVoucherNumber(transactions, editingTransaction?.id);
      }
      if (!merchVal) {
        merchVal = 'Corporate Treasury';
      }
    } else {
      // Outward / Expense: Paid to (merchant), category, particulars (description), amount, and Voucher No. are required.
      if (!merchVal) {
        setFormError('Paid To is required.');
        return;
      }
      if (!formCategory || !formCategory.trim()) {
        setFormError('Please choose an Expense Category.');
        return;
      }
      if (!refVal) {
        const nextNum = getNextOutwardVoucherNumber(transactions, editingTransaction?.id);
        refVal = String(nextNum);
      }
    }

    // Enforce Unique Voucher ID Validation within the same transaction type namespace (IN vs OUT)
    const refValNum = getNumericPart(refVal);
    const refValNorm = normalizeVoucherStr(refVal);
    const isCurrentIn = effectiveFormType === 'IN' || refVal.toUpperCase().startsWith('IW-');

    const duplicateTxn = transactions.find(t => {
      // Exclude the record currently being edited
      if (editingTransaction) {
        if (t.id === editingTransaction.id) return false;
        if (editingTransaction.reference && (
          t.reference === editingTransaction.reference ||
          t.id === editingTransaction.reference ||
          t.reference === editingTransaction.id
        )) {
          return false;
        }

        const isTargetIn = t.type === 'IN' || (t.reference && t.reference.toUpperCase().startsWith('IW-'));
        const isEditingIn = editingTransaction.type === 'IN' || (editingTransaction.reference && editingTransaction.reference.toUpperCase().startsWith('IW-'));

        if (isTargetIn === isEditingIn) {
          const tNum = getNumericPart(t.reference) ?? getNumericPart(t.id);
          const edNum = getNumericPart(editingTransaction.reference) ?? getNumericPart(editingTransaction.id);
          if (tNum !== null && edNum !== null && tNum === edNum) return false;

          const tNorm = normalizeVoucherStr(t.reference) || normalizeVoucherStr(t.id);
          const edNorm = normalizeVoucherStr(editingTransaction.reference) || normalizeVoucherStr(editingTransaction.id);
          if (tNorm && edNorm && tNorm === edNorm) return false;
        }
      }

      const isTargetIn = t.type === 'IN' || (t.reference && t.reference.toUpperCase().startsWith('IW-'));

      // Inward vouchers (IW-xxx) and Outward vouchers operate in separate sequence namespaces!
      if (isCurrentIn !== isTargetIn) {
        return false;
      }

      const existingNum = getNumericPart(t.reference);
      const existingNorm = normalizeVoucherStr(t.reference);

      if (refValNum !== null && existingNum !== null && refValNum === existingNum) {
        return true;
      }
      if (refValNorm && existingNorm && refValNorm === existingNorm) {
        return true;
      }
      return false;
    });

    if (duplicateTxn) {
      setFormError(`Voucher No. "${refVal}" already exists as "${duplicateTxn.reference}". Duplicate Voucher numbers are not allowed.`);
      return;
    }

    let finalDescription = formDescription.trim();
    if (effectiveFormType === 'IN' && !finalDescription) {
      finalDescription = formRemarks.trim() || 'Cash Deposit';
    }

    if (!finalDescription) {
      setFormError('Particulars (Purpose) is required.');
      return;
    }

    // Process Attachment URL (Prioritize Cloudinary CDN URLs to prevent heavy Base64 writes to Firestore)
    let finalReceiptUrl: string | null = null;
    if (receiptFile) {
      if (receiptFile.cloudinaryUrl) {
        finalReceiptUrl = receiptFile.cloudinaryUrl;
      } else if (receiptFile.dataUrl?.startsWith('http')) {
        finalReceiptUrl = receiptFile.dataUrl;
      } else if (receiptFile.dataUrl && receiptFile.dataUrl.startsWith('data:')) {
        // If Cloudinary is configured, upload Base64 attachment to Cloudinary before saving to Firestore
        const cloudName = integrationSettings?.cloudinaryCloudName || localStorage.getItem('cloudinary_cloud_name');
        if (cloudName) {
          const [yyyy, mm] = (formDate || new Date().toISOString().split('T')[0]).split('-');
          const folderPath = `Petty Cash/${yyyy || '2026'}/${mm || '08'}`;
          const cleanName = receiptFile.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const filePublicId = cleanName;

          const cRes = await uploadFileToCloudinary(receiptFile.dataUrl, filePublicId, folderPath, {
            cloudName,
            apiKey: integrationSettings?.cloudinaryApiKey || localStorage.getItem('cloudinary_api_key') || undefined,
            apiSecret: integrationSettings?.cloudinaryApiSecret || localStorage.getItem('cloudinary_api_secret') || undefined,
            uploadPreset: integrationSettings?.cloudinaryUploadPreset || localStorage.getItem('cloudinary_upload_preset') || undefined
          });

          if (cRes.success && cRes.url) {
            finalReceiptUrl = cRes.url;
            setReceiptFile(prev => prev ? { ...prev, dataUrl: cRes.url, cloudinaryUrl: cRes.url, uploadError: null } : null);
          } else {
            setFormError(`Cloudinary Upload Failed: ${cRes.error || 'Check Cloud Name, API Key, or Upload Preset in Admin Settings.'}`);
            return;
          }
        } else {
          finalReceiptUrl = receiptFile.dataUrl;
        }
      } else {
        finalReceiptUrl = receiptFile.dataUrl || null;
      }
    }

    const categoryName = effectiveFormType === 'IN' ? 'Cash Source' : formCategory;
    const isCreditIn = effectiveFormType === 'IN';
    const userName = currentUser.fullName || currentUser.username || 'User';
    const activeColorBorderClass = isCreditIn ? 'border-emerald-500' : 'border-rose-500';

    setConfirmPopupData({
      isEdit: Boolean(editingTransaction),
      isInward: isCreditIn,
      voucherNo: refVal,
      amount: parsedAmount,
      category: categoryName,
      userName: userName,
      activeColorBorderClass: activeColorBorderClass,
      onConfirm: () => {
        try {
          if (editingTransaction) {
            // If the transaction previously had a Cloudinary receipt URL and it was removed or replaced
            if (
              editingTransaction.receiptUrl &&
              editingTransaction.receiptUrl.includes('cloudinary.com') &&
              editingTransaction.receiptUrl !== finalReceiptUrl
            ) {
              deleteFileFromCloudinary(editingTransaction.receiptUrl, {
                cloudName: integrationSettings?.cloudinaryCloudName || localStorage.getItem('cloudinary_cloud_name') || '',
                apiKey: integrationSettings?.cloudinaryApiKey || localStorage.getItem('cloudinary_api_key') || '',
                apiSecret: integrationSettings?.cloudinaryApiSecret || localStorage.getItem('cloudinary_api_secret') || ''
              }).catch(e => console.warn('Cloudinary old file cleanup on edit error:', e));
            }

            const effectivePaymentType = currentUser.role === 'ADMIN' ? (formPaymentType || 'CASH') : 'CASH';

            if (onUpdateTransaction) {
              onUpdateTransaction({
                ...editingTransaction,
                date: formDate,
                type: effectiveFormType,
                amount: parsedAmount,
                category: categoryName,
                merchant: merchVal,
                reference: refVal,
                description: finalDescription,
                receiptName: receiptFile?.name || null,
                receiptSize: receiptFile?.size || null,
                receiptUrl: finalReceiptUrl || null,
                remarks: formRemarks.trim(),
                projectRefNo: formProjectRefNo ? formProjectRefNo.trim() : '',
                paymentType: effectivePaymentType
              });
            }
          } else {
            const repTo = (currentUser.reportingTo || '').trim();
            const hasReportingManager = repTo.length > 0;
            const isTopAdminOrCustodian = (currentUser.role === 'ADMIN' || currentUser.role === 'CUSTODIAN') && !hasReportingManager;

            const initialStatus = isCreditIn
              ? 'APPROVED'
              : (isTopAdminOrCustodian ? 'PAID' : 'PENDING');

            const reqUser = currentUser.fullName || currentUser.username || 'User';
            const targetApprover = hasReportingManager ? repTo : (isTopAdminOrCustodian ? reqUser : 'admin');

            const effectivePaymentType = currentUser.role === 'ADMIN' ? (formPaymentType || 'CASH') : 'CASH';

            onAddTransaction({
              date: formDate,
              type: effectiveFormType,
              amount: parsedAmount,
              category: categoryName,
              merchant: merchVal,
              reference: refVal,
              status: initialStatus,
              requestedBy: reqUser,
              approverName: targetApprover,
              description: finalDescription,
              receiptName: receiptFile?.name || null,
              receiptSize: receiptFile?.size || null,
              receiptUrl: finalReceiptUrl || null,
              remarks: formRemarks.trim(),
              projectRefNo: formProjectRefNo ? formProjectRefNo.trim() : '',
              paymentType: effectivePaymentType
            });
          }
        } catch (err) {
          console.error('Error executing transaction entry:', err);
        } finally {
          setConfirmPopupData(null);
          closeModal();
        }
      }
    });
  };

  const renderPagination = () => {
    if (filteredTransactions.length <= itemsPerPage) return null;
    
    const activeColorClass = forceTypeVal === 'IN' 
      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10' 
      : 'bg-blue-600 text-white shadow-sm shadow-blue-500/10';

    return (
      <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="text-[11px] text-slate-500">
          Showing <span className="font-bold text-slate-800">{Math.min(filteredTransactions.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
          <span className="font-bold text-slate-800">{Math.min(filteredTransactions.length, currentPage * itemsPerPage)}</span> of{' '}
          <span className="font-bold text-slate-800">{filteredTransactions.length}</span> entries
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
                  ? activeColorClass
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

  const getPeriodText = () => {
    if (isAllTime) {
      return 'Period: ALL';
    }
    if (fromDate && toDate) {
      return `Period: ${formatDate(fromDate)} to ${formatDate(toDate)}`;
    }
    if (fromDate) {
      return `Period: From ${formatDate(fromDate)}`;
    }
    if (toDate) {
      return `Period: Up to ${formatDate(toDate)}`;
    }
    return 'Period: ALL';
  };

  const getReportTitle = () => {
    if (forceTypeVal === 'IN') return 'Petty Cash Register - Deposit Report';
    if (forceTypeVal === 'OUT') return 'Petty Cash Register - Expense Report';
    return 'Petty Cash Register Report';
  };

  const handleExportXLSX = () => {
    const reportTitle = getReportTitle();
    const periodText = getPeriodText();
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const colCount = forceTypeVal === 'IN' ? 5 : 10;

    let header: string[] = [];
    let rows: any[][] = [];

    if (forceTypeVal === 'IN') {
      header = ['Date', 'Voucher ID', 'Particulars', 'Credit Amount', 'Category'];
      rows = filteredTransactions.map(t => [
        formatDate(t.date),
        t.reference,
        t.description,
        t.amount.toFixed(2),
        t.category
      ]);
    } else {
      header = ['Date', 'Voucher ID', 'Project Ref. No.', 'Paid To', 'Particulars', 'Debit Amount', 'Payment Mode', 'Category', 'Status', 'Remarks'];
      rows = filteredTransactions.map(t => [
        formatDate(t.date),
        t.reference + (t.receiptName ? ' #' : ''),
        t.projectRefNo || '-',
        t.merchant,
        t.description,
        t.amount.toFixed(2),
        t.paymentType === 'ONLINE' ? 'Online' : 'Cash',
        t.category,
        t.status || 'PAID',
        t.remarks || 'N/A'
      ]);
    }

    let xlsxContent = '<table>';
    xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 16px; font-weight: bold; color: #0f172a;">Ommax Electric Private Limited</td></tr>`;
    xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 13px; font-weight: bold; color: ${forceTypeVal === 'IN' ? '#059669' : '#e11d48'};">${reportTitle}</td></tr>`;
    xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 11px; font-weight: bold; color: #475569;">${periodText}</td></tr>`;
    xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 10px; color: #64748b;">Total Vouchers: ${filteredTransactions.length}</td></tr>`;
    xlsxContent += `<tr><td colspan="${colCount}"></td></tr>`;

    xlsxContent += '<tr>' + header.map(h => `<th style="background-color: ${forceTypeVal === 'IN' ? '#059669' : '#e11d48'}; color: white; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1; white-space: nowrap;">${h}</th>`).join('') + '</tr>';
    
    rows.forEach(row => {
      xlsxContent += '<tr>' + row.map((cell, idx) => {
        const isParticulars = (forceTypeVal === 'IN' && idx === 2) || (forceTypeVal !== 'IN' && idx === 4);
        const style = isParticulars 
          ? 'padding: 6px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 500;'
          : `padding: 6px; border: 1px solid #e2e8f0; ${idx === 0 || idx === 1 || (forceTypeVal === 'IN' ? idx === 3 : idx === 5 || idx === 6) ? 'white-space: nowrap;' : ''}`;
        return `<td style="${style}">${cell}</td>`;
      }).join('') + '</tr>';
    });

    // Add total row at the bottom
    if (forceTypeVal === 'IN') {
      xlsxContent += `<tr style="font-weight: bold; background-color: #f8fafc;"><td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;" colspan="3">Total Credit Amount</td><td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #059669; white-space: nowrap;">${totalAmount.toFixed(2)}</td><td style="padding: 6px; border: 1px solid #cbd5e1;"></td></tr>`;
    } else {
      const cashTotal = filteredTransactions.filter(t => t.paymentType !== 'ONLINE').reduce((sum, t) => sum + t.amount, 0);
      const onlineTotal = filteredTransactions.filter(t => t.paymentType === 'ONLINE').reduce((sum, t) => sum + t.amount, 0);
      xlsxContent += `<tr style="font-weight: bold; background-color: #f8fafc;"><td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;" colspan="5">Total Debit Amount<br/><span style="font-size: 10px; font-weight: normal; color: #475569;">(Cash: ${cashTotal.toFixed(2)} + Online: ${onlineTotal.toFixed(2)})</span></td><td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #e11d48; white-space: nowrap; vertical-align: top;">${totalAmount.toFixed(2)}</td><td style="padding: 6px; border: 1px solid #cbd5e1;" colspan="4"></td></tr>`;
    }

    xlsxContent += `<tr><td colspan="${colCount}"></td></tr>`;
    xlsxContent += `<tr><td colspan="3" style="font-size: 10px; color: #64748b;">Generated On: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td><td colspan="${colCount - 3}" style="font-size: 10px; color: #64748b; text-align: right;">Generated By: ${currentUser.fullName}</td></tr>`;
    if (forceTypeVal !== 'IN') {
      xlsxContent += `<tr><td colspan="${colCount}" style="font-size: 10px; color: #64748b; font-weight: bold; padding-top: 10px;"># Vouchers has supporting documents</td></tr>`;
    }

    xlsxContent += '</table>';

    const blob = new Blob([xlsxContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${forceTypeVal === 'IN' ? 'petty_cash_deposit_report' : 'petty_cash_expense_report'}_${new Date().toISOString().slice(0,10)}.xls`);
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
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

    let headerHTML = '';
    let rowsHTML = '';

    if (forceTypeVal === 'IN') {
      headerHTML = `
        <tr>
          <th style="padding: 8px 6px; font-weight: bold; text-transform: uppercase; font-size: 9.5px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Date</th>
          <th style="padding: 8px 6px; font-weight: bold; text-transform: uppercase; font-size: 9.5px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Voucher ID</th>
          <th style="padding: 8px 6px; font-weight: bold; text-transform: uppercase; font-size: 9.5px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left;">Particulars</th>
          <th style="padding: 8px 6px; font-weight: bold; text-transform: uppercase; font-size: 9.5px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Credit Amount</th>
          <th style="padding: 8px 6px; font-weight: bold; text-transform: uppercase; font-size: 9.5px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Category</th>
        </tr>
      `;
      rowsHTML = filteredTransactions.map(t => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
          <td style="padding: 6px; white-space: nowrap;">${formatDate(t.date)}</td>
          <td style="padding: 6px; font-family: monospace; font-weight: bold; white-space: nowrap;">${t.reference}</td>
          <td style="padding: 6px 8px; color: #1e293b; font-size: 11px; font-weight: 500; line-height: 1.35;">${t.description}</td>
          <td style="padding: 6px; font-weight: bold; color: #059669; white-space: nowrap;">${currencySymbol}${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 6px; white-space: nowrap;"><span style="background-color: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 9999px; font-size: 9.5px; font-weight: bold;">${t.category}</span></td>
        </tr>
      `).join('');
      rowsHTML += `
        <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; font-size: 10.5px;">
          <td style="padding: 8px 6px;" colspan="3">Total Credit Amount</td>
          <td style="padding: 8px 6px; font-weight: bold; color: #059669; white-space: nowrap;">${currencySymbol}${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px 6px;"></td>
        </tr>
      `;
    } else {
      headerHTML = `
        <tr>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Date</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Voucher ID</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left;">Paid To</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; min-width: 130px;">Particulars</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Project Ref</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: right; white-space: nowrap;">Debit Amount</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: center; white-space: nowrap;">Mode</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; white-space: nowrap;">Category</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: center; white-space: nowrap;">Status</th>
          <th style="padding: 7px 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left;">Remarks</th>
        </tr>
      `;
      rowsHTML = filteredTransactions.map(t => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 9.5px;">
          <td style="padding: 5px; white-space: nowrap;">${formatDate(t.date)}</td>
          <td style="padding: 5px; font-family: monospace; font-weight: bold; white-space: nowrap;">${t.reference}${t.receiptName ? ' #' : ''}</td>
          <td style="padding: 5px; font-weight: bold; color: #0f172a;">${t.merchant}</td>
          <td style="padding: 5px 6px; color: #1e293b; font-size: 10px; font-weight: 500; line-height: 1.3;">${t.description}</td>
          <td style="padding: 5px; font-family: monospace; font-size: 9px; color: #475569; white-space: nowrap;">${t.projectRefNo || '-'}</td>
          <td style="padding: 5px; font-weight: bold; color: #e11d48; text-align: right; white-space: nowrap;">${currencySymbol}${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px; text-align: center; white-space: nowrap;">${t.paymentType === 'ONLINE' ? 'Online' : 'Cash'}</td>
          <td style="padding: 5px; white-space: nowrap;"><span style="background-color: #f1f5f9; color: #334155; padding: 2px 5px; border-radius: 4px; font-size: 8.5px; font-weight: bold;">${t.category}</span></td>
          <td style="padding: 5px; text-align: center; white-space: nowrap;"><span style="background-color: ${t.status === 'APPROVED' ? '#dcfce7' : t.status === 'PAID' ? '#e0e7ff' : t.status === 'REJECTED' ? '#fee2e2' : t.status === 'DELETED' ? '#fef2f2' : '#fef3c7'}; color: ${t.status === 'APPROVED' ? '#166534' : t.status === 'PAID' ? '#3730a3' : t.status === 'REJECTED' ? '#991b1b' : t.status === 'DELETED' ? '#9f1239' : '#92400e'}; padding: 2px 5px; border-radius: 4px; font-size: 8.5px; font-weight: bold;">${t.status || 'PAID'}</span></td>
          <td style="padding: 5px; color: #64748b; font-size: 9px;">${t.remarks || 'N/A'}</td>
        </tr>
      `).join('');
      const cashTotal = filteredTransactions.filter(t => t.paymentType !== 'ONLINE').reduce((sum, t) => sum + t.amount, 0);
      const onlineTotal = filteredTransactions.filter(t => t.paymentType === 'ONLINE').reduce((sum, t) => sum + t.amount, 0);
      rowsHTML += `
        <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; font-size: 10px;">
          <td style="padding: 8px 5px;" colspan="5">
            Total Debit Amount
            <span style="font-size: 9px; font-weight: normal; color: #475569; margin-left: 8px;">
              (Cash: ${currencySymbol}${cashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Online: ${currencySymbol}${onlineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </td>
          <td style="padding: 8px 5px; font-weight: bold; color: #e11d48; text-align: right; white-space: nowrap;">${currencySymbol}${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px 5px;" colspan="4"></td>
        </tr>
      `;
    }

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
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">${periodText} | Generated on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} | Total Filtered Vouchers: <strong>${filteredTransactions.length}</strong></p>
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
            </tbody>
          </table>
          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #475569; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div><strong>Generated On:</strong> ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              ${forceTypeVal !== 'IN' ? `<div style="font-size: 9px; color: #64748b; margin-top: 3px;"># Vouchers has supporting documents</div>` : ''}
            </div>
            <div><strong>Generated By:</strong> ${currentUser.fullName || currentUser.username}</div>
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

  const handlePrintSingleVoucher = (txn: Transaction) => {
    if (!isPrintableVoucher(txn)) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isVoided = txn.status === 'DELETED';
    const amountInWords = numberToWordsINR(txn.amount);
    const formattedAmount = `${currencySymbol} ${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cash Voucher - ${txn.reference}${isVoided ? ' (VOIDED)' : ''}</title>
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

            /* Void Watermark Stamp Overlay (45 degree angle bottom-left to top-right) */
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

            /* Full Strikethrough for Voided Text */
            .voided-text {
              text-decoration: line-through !important;
              text-decoration-color: #dc2626 !important;
              text-decoration-thickness: 2.5px !important;
              color: #9f1239 !important;
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
              font-size: 22px;
              font-weight: 900;
              color: #1d4ed8;
              letter-spacing: 1.5px;
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
                    <td class="meta-value">${txn.reference}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Date</td>
                    <td class="meta-value">${formatDate(txn.date)}</td>
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
                  <div class="voucher-title">${txn.type === 'IN' ? 'RECEIPT VOUCHER' : 'CASH VOUCHER'}${isVoided ? ' (VOID)' : ''}</div>
                  ${txn.projectRefNo ? `<div class="voucher-project-ref" style="font-size: 11px; margin-top: 5px; color: #0f172a; letter-spacing: 0.5px;"><span class="voucher-project-ref-label" style="font-family: 'Outfit', sans-serif; font-weight: 400; font-size: 11px;">Ref. No:</span> <span class="voucher-project-ref-value" style="font-family: 'Outfit', sans-serif; font-weight: 300; font-size: 11px;">${txn.projectRefNo}</span></div>` : ''}
                </div>
              </div>

              <!-- Pay to (Underlined) -->
              <div class="line-row">
                <div class="line-label">${txn.type === 'IN' ? 'Received From' : 'Pay to'}</div>
                <div class="line-content">${txn.merchant || 'Cash'}</div>
              </div>

              <!-- Rs. in Words (Underlined) -->
              <div class="line-row">
                <div class="line-label">Rs. in Words</div>
                <div class="line-content">${amountInWords}</div>
              </div>

              <!-- being (Particulars / Description) -->
              <div class="line-row">
                <div class="line-label">being</div>
                <div class="line-content">${txn.description}</div>
              </div>

              <!-- and debit (Category) -->
              <div class="line-row">
                <div class="line-label">${txn.type === 'IN' ? 'Account' : 'and debit'}</div>
                <div class="line-content">${txn.category}</div>
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
                      <span><strong>Reason:</strong> ${txn.deleteReason || 'Cancelled / Voided by user'}</span>
                      <span><strong>Date:</strong> ${formatVoidDateTime(txn.deletedAt || txn.date)}</span>
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

  const handlePrintBatchVouchers = (txnsToPrint: Transaction[]) => {
    const printableOnly = (txnsToPrint || []).filter(isPrintableVoucher);
    if (printableOnly.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const vouchersHTML = printableOnly.map((txn) => {
      const isVoided = txn.status === 'DELETED';
      const amountInWords = numberToWordsINR(txn.amount);
      const formattedAmount = `${currencySymbol} ${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      return `
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
                  <td class="meta-value">${txn.reference}</td>
                </tr>
                <tr>
                  <td class="meta-label">Date</td>
                  <td class="meta-value">${formatDate(txn.date)}</td>
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
                <div class="voucher-title">${txn.type === 'IN' ? 'RECEIPT VOUCHER' : 'CASH VOUCHER'}${isVoided ? ' (VOID)' : ''}</div>
                ${txn.projectRefNo ? `<div class="voucher-project-ref" style="font-size: 10px; margin-top: 4px; color: #0f172a; letter-spacing: 0.5px;"><span class="voucher-project-ref-label" style="font-family: 'Outfit', sans-serif; font-weight: 400; font-size: 10px;">Ref. No:</span> <span class="voucher-project-ref-value" style="font-family: 'Outfit', sans-serif; font-weight: 300; font-size: 10px;">${txn.projectRefNo}</span></div>` : ''}
              </div>
            </div>

            <!-- Pay to -->
            <div class="line-row">
              <div class="line-label">${txn.type === 'IN' ? 'Received From' : 'Pay to'}</div>
              <div class="line-content">${txn.merchant || 'Cash'}</div>
            </div>

            <!-- Rs. in Words -->
            <div class="line-row">
              <div class="line-label">Rs. in Words</div>
              <div class="line-content">${amountInWords}</div>
            </div>

            <!-- being -->
            <div class="line-row">
              <div class="line-label">being</div>
              <div class="line-content">${txn.description}</div>
            </div>

            <!-- and debit -->
            <div class="line-row">
              <div class="line-label">${txn.type === 'IN' ? 'Account' : 'and debit'}</div>
              <div class="line-content">${txn.category}</div>
            </div>

            <!-- Bottom Signature -->
            <div class="bottom-area">
              <div class="recd-row" style="margin-bottom: ${isVoided ? 'calc(2.5mm - 3px)' : 'calc(12mm - 3px)'};">
                Recd. above sum of Rs. <span class="recd-blank"></span>
              </div>

              ${isVoided ? `
                <div class="void-audit-stamp">
                  <div class="void-audit-title">VOUCHER HAS BEEN VOIDED</div>
                  <div class="void-audit-body">
                    <span><strong>Reason:</strong> ${txn.deleteReason || 'Cancelled / Voided by user'}</span>
                    <span><strong>Date:</strong> ${formatVoidDateTime(txn.deletedAt || txn.date)}</span>
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
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch Print (${txnsToPrint.length} Vouchers) - Ommax Electric</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 5mm 8mm;
            }
            @media print {
              html, body {
                width: 100%;
                height: 100%;
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
              padding: 2mm;
            }
            .batch-container {
              width: 185mm;
              margin: 0 auto;
              display: flex;
              flex-direction: column;
            }
            .voucher-page {
              width: 185mm;
              height: 88mm;
              background: #ffffff;
              margin: 0 auto 9.5mm auto;
              padding: 2mm;
              box-shadow: none;
              border-radius: 0;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .voucher-page:nth-child(3n) {
              margin-bottom: 0;
              page-break-after: always;
            }
            .voucher-page:last-child {
              margin-bottom: 0;
              page-break-after: auto;
            }
            .voucher-border {
              border: 1.5px solid #2563eb;
              height: 100%;
              padding: 3.5mm 5mm;
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
              font-size: 52px;
              font-weight: 900;
              color: rgba(225, 29, 72, 0.28);
              border: 5.5px solid rgba(225, 29, 72, 0.4);
              padding: 6px 36px;
              border-radius: 12px;
              letter-spacing: 12px;
              text-transform: uppercase;
              text-align: center;
              white-space: nowrap;
              box-shadow: inset 0 0 0 2px rgba(225, 29, 72, 0.2);
            }

            /* Full Strikethrough for Voided Text */
            .voided-text {
              text-decoration: line-through !important;
              text-decoration-color: #dc2626 !important;
              text-decoration-thickness: 2.5px !important;
              color: #9f1239 !important;
            }
            
            /* Header Section */
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 2.5mm;
              position: relative;
              min-height: 18mm;
            }
            .header-stamp-box {
              display: flex;
              align-items: center;
              justify-content: center;
              flex: 1;
              padding: 0 3mm;
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
              width: 40mm;
            }
            .meta-table td {
              border: 1px solid #2563eb;
              padding: 3px 4px;
              vertical-align: middle;
            }
            .meta-label {
              font-weight: bold;
              color: #1e40af;
              width: 10mm;
              font-size: 10px;
              background-color: #f0f7ff;
            }
            .meta-value {
              font-weight: bold;
              color: #0f172a;
              font-family: 'Outfit', monospace;
              font-size: 11px;
            }
            .header-right {
              text-align: right;
            }
            .company-name {
              font-size: 9.5px;
              font-weight: bold;
              color: #1e40af;
              text-transform: uppercase;
              letter-spacing: 0.5px;
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
              font-size: 10px;
              color: #0f172a;
              letter-spacing: 0.5px;
              margin-top: 4px;
              line-height: 1.3;
            }
            .voucher-project-ref-label {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              font-weight: 400;
              font-size: 10px;
            }
            .voucher-project-ref-value {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              font-weight: 300;
              font-size: 10px;
            }

            /* Line Rows */
            .line-row {
              display: flex;
              align-items: flex-end;
              margin-bottom: 2mm;
            }
            .line-label {
              font-weight: 700;
              font-size: 11px;
              color: #1e40af;
              width: 24mm;
              flex-shrink: 0;
            }
            .line-content {
              flex: 1;
              border-bottom: 1.5px solid #2563eb;
              padding-bottom: 1.5px;
              font-size: 11px;
              font-weight: 600;
              color: #0f172a;
              min-height: 15px;
            }

            /* Bottom Area */
            .bottom-area {
              margin-top: auto;
            }
            .recd-row {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              font-size: 10.5px;
              font-weight: 700;
              color: #1e40af;
              position: relative;
              top: 3px;
              margin-top: 1.5mm;
            }
            .recd-blank {
              border-bottom: 1.5px solid #2563eb;
              width: 42mm;
              display: inline-block;
              height: 13px;
              margin-left: 6px;
            }

            /* Audit Metadata Stamp above signature block */
            .void-audit-stamp {
              border: 1.5px dashed #dc2626;
              background-color: #fef2f2;
              padding: 3px 8px;
              margin-top: 2mm;
              margin-bottom: 1.5mm;
              border-radius: 4px;
              color: #991b1b;
              font-size: 9px;
            }
            .void-audit-title {
              font-size: 8.5px;
              font-weight: 800;
              color: #dc2626;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 1.5px;
              border-bottom: 1px dashed #fecdd3;
              padding-bottom: 1px;
            }
            .void-audit-body {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9px;
              color: #7f1d1d;
            }

            .sig-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 0.5mm;
            }
            .sig-table td {
              vertical-align: bottom;
              text-align: center;
              padding: 0 4px;
            }
            .sig-line {
              border-top: 1.5px dashed #2563eb;
              width: 80%;
              margin: 0 auto 2px auto;
            }
            .sig-title {
              font-size: 9.5px;
              font-weight: bold;
              color: #1e40af;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="batch-container">
            ${vouchersHTML}
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

  const handleExportCSV = () => {
    const reportTitle = getReportTitle();
    const periodText = getPeriodText();
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

    let csvRows: any[][] = [];
    csvRows.push(['Ommax Electric Private Limited']);
    csvRows.push([reportTitle]);
    csvRows.push([periodText]);
    csvRows.push([`Total Vouchers: ${filteredTransactions.length}`]);
    csvRows.push([]);

    if (forceTypeVal === 'IN') {
      csvRows.push(['Date', 'Voucher ID', 'Particulars', 'Credit Amount', 'Category']);
      filteredTransactions.forEach(t => {
        csvRows.push([
          formatDateToDMY(t.date),
          t.reference,
          t.description.replace(/"/g, '""'),
          t.amount.toFixed(2),
          t.category
        ]);
      });
      csvRows.push([]);
      csvRows.push(['Total Credit Amount', '', '', totalAmount.toFixed(2), '']);
      csvRows.push([]);
      csvRows.push([
        `Generated On: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
        '',
        '',
        '',
        `Generated By: ${currentUser.fullName} (${currentUser.role})`
      ]);
    } else {
      csvRows.push(['Date', 'Voucher ID', 'Project Ref. No.', 'Paid To', 'Particulars', 'Debit Amount', 'Payment Mode', 'Category', 'Status', 'Remarks']);
      filteredTransactions.forEach(t => {
        csvRows.push([
          formatDateToDMY(t.date),
          t.reference + (t.receiptName ? ' #' : ''),
          (t.projectRefNo || '-').replace(/"/g, '""'),
          t.merchant.replace(/"/g, '""'),
          t.description.replace(/"/g, '""'),
          t.amount.toFixed(2),
          t.paymentType === 'ONLINE' ? 'Online' : 'Cash',
          t.category,
          t.status || 'PAID',
          (t.remarks || 'N/A').replace(/"/g, '""')
        ]);
      });
      const cashTotal = filteredTransactions.filter(t => t.paymentType !== 'ONLINE').reduce((sum, t) => sum + t.amount, 0);
      const onlineTotal = filteredTransactions.filter(t => t.paymentType === 'ONLINE').reduce((sum, t) => sum + t.amount, 0);
      csvRows.push([]);
      csvRows.push(['Total Debit Amount', '', '', '', '', totalAmount.toFixed(2), '', '', '', '']);
      csvRows.push(['Debit Breakup (Cash / Online)', '', '', '', '', `Cash: ${cashTotal.toFixed(2)} | Online: ${onlineTotal.toFixed(2)}`, '', '', '', '']);
      csvRows.push([]);
      csvRows.push([
        `Generated On: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `Generated By: ${currentUser.fullName} (${currentUser.role})`
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${forceTypeVal === 'IN' ? 'petty_cash_deposit_report' : 'petty_cash_expense_report'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderBatchPrintModal = () => {
    if (!isBatchModalOpen) return null;

    const searchedVouchers = filteredTransactions.filter(txn => {
      if (!batchSearchQuery.trim()) return true;
      const q = batchSearchQuery.toLowerCase();
      return (
        (txn.reference && txn.reference.toLowerCase().includes(q)) ||
        (txn.merchant && txn.merchant.toLowerCase().includes(q)) ||
        (txn.description && txn.description.toLowerCase().includes(q)) ||
        txn.amount.toString().includes(q)
      );
    });

    const selectedTxns = filteredTransactions.filter(t => selectedBatchTxnIds.includes(t.id));
    const totalAmount = selectedTxns.reduce((sum, t) => sum + t.amount, 0);

    return (
      <AnimatePresence>
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-[24px] shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col text-slate-800"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-base">Batch Print Vouchers</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      A4 Sheet • 3 Vouchers/Page
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Combine up to 3 cheque-leaf size vouchers on a single A4 paper to eliminate paper waste (75% savings).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Selection Bar */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectLatest3}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Select Latest 3
                </button>
                <button
                  type="button"
                  onClick={handleClearBatchSelection}
                  disabled={selectedBatchTxnIds.length === 0}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium text-xs">Selection Status:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  selectedBatchTxnIds.length === 3 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : selectedBatchTxnIds.length > 0 
                      ? 'bg-blue-100 text-blue-800 border-blue-300' 
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                }`}>
                  {selectedBatchTxnIds.length} / 3 Vouchers Selected
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-0">
              
              {/* Left Column: Voucher Picker */}
              <div className="md:col-span-7 flex flex-col gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={batchSearchQuery}
                    onChange={(e) => setBatchSearchQuery(e.target.value)}
                    placeholder="Search by Voucher ID, Payee, Purpose, or Amount..."
                    className="w-full py-2 pl-9 pr-3 bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs font-medium text-slate-700"
                  />
                  {batchSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBatchSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Available Vouchers ({searchedVouchers.length})</span>
                  <span className="text-slate-500 font-normal normal-case">Tick checkboxes (Max 3)</span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[320px] md:max-h-[380px] space-y-2 pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                  {searchedVouchers.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No matching vouchers found to add to batch.
                    </div>
                  ) : (
                    searchedVouchers.map((txn) => {
                      const isPrintable = isPrintableVoucher(txn);
                      const isSelected = selectedBatchTxnIds.includes(txn.id);
                      const isDisabled = !isPrintable || (!isSelected && selectedBatchTxnIds.length >= 3);

                      return (
                        <div
                          key={txn.id}
                          onClick={() => {
                            if (!isDisabled) toggleBatchSelect(txn.id);
                          }}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-rose-50/70 border-rose-300 shadow-xs cursor-pointer' 
                              : isDisabled 
                                ? 'bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed' 
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => {}} // Handled by container click
                              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-slate-900">
                                  {txn.reference || txn.id}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {formatDate(txn.date)}
                                </span>
                                {!isPrintable && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    {txn.status || 'Not Paid'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-700 truncate">
                                {txn.merchant}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                {txn.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-xs text-rose-600 font-mono block">
                              {currencySymbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 inline-block mt-0.5">
                              {txn.category}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Live A4 Sheet Preview */}
              <div className="md:col-span-5 flex flex-col gap-2 bg-slate-100/80 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Live A4 Sheet Print Layout
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                    210 x 297 mm
                  </span>
                </div>

                {/* Simulated A4 Paper */}
                <div className="bg-white rounded-xl border border-slate-300 shadow-md p-3 flex-1 flex flex-col gap-2 min-h-[300px] justify-between relative overflow-hidden">
                  {[0, 1, 2].map((slotIndex) => {
                    const slotTxn = selectedTxns[slotIndex];
                    return (
                      <React.Fragment key={slotIndex}>
                        {slotTxn ? (
                          <div className="border-1.5 border-blue-500 rounded-lg p-2.5 bg-blue-50/30 flex flex-col justify-between relative group">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBatchSelect(slotTxn.id);
                              }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-full flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
                              title="Remove from batch"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-blue-900 border-b border-blue-200 pb-1 pr-6">
                              <span>Voucher #{slotIndex + 1}: {slotTxn.reference}</span>
                              <span className="text-slate-600">{formatDate(slotTxn.date)}</span>
                            </div>
                            <div className="my-1">
                              <p className="text-xs font-bold text-slate-900 truncate">Pay to: {slotTxn.merchant}</p>
                              <p className="text-[10px] text-slate-500 truncate">{slotTxn.description}</p>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-blue-100">
                              <span className="text-blue-700">{slotTxn.category}</span>
                              <span className="text-rose-600 font-mono text-xs">{currencySymbol}{slotTxn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center text-center bg-slate-50/50 flex-1">
                            <span className="text-[10px] font-bold text-slate-400">
                              Slot #{slotIndex + 1} Empty
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              Select a voucher from left
                            </span>
                          </div>
                        )}

                        {slotIndex < 2 && (
                          <div className="flex items-center justify-center gap-1 my-0.5 text-[8px] font-mono text-slate-400">
                            <span className="border-t border-dashed border-slate-300 flex-1"></span>
                            <span>✂ - - - ✂</span>
                            <span className="border-t border-dashed border-slate-300 flex-1"></span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="text-[10px] text-slate-500 text-center font-medium">
                  Page efficiency: <span className="font-bold text-emerald-600">{selectedTxns.length === 3 ? '100% (Zero Paper Waste)' : `${Math.round((selectedTxns.length / 3) * 100)}%`}</span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 font-semibold text-center sm:text-left">
                {selectedTxns.length > 0 ? (
                  <>
                    Total Batch Value: <span className="text-rose-600 font-bold font-mono text-sm">{currencySymbol}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ({selectedTxns.length} Vouchers)
                  </>
                ) : (
                  <span className="text-slate-400">Please select at least 1 voucher to print.</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="flex-1 sm:flex-initial bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-200 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedBatchTxnIds.length === 0}
                  onClick={() => handlePrintBatchVouchers(selectedTxns)}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-rose-950/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  Print Batch ({selectedTxns.length} on A4)
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  const renderDeleteModal = () => {
    if (!deletingTxn) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete / Void Voucher</h3>
                <p className="text-[11px] text-rose-700 font-semibold font-mono">
                  {deletingTxn.reference || deletingTxn.id}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeletingTxn(null)}
              className="p-1 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Voucher Number:</span>
                <span className="font-mono font-bold text-slate-800">{deletingTxn.reference || deletingTxn.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount:</span>
                <span className="font-bold text-slate-900">{currencySymbol}{deletingTxn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">{deletingTxn.type === 'IN' ? 'Deposited By:' : 'Paid To:'}</span>
                <span className="font-semibold text-slate-700">{deletingTxn.merchant}</span>
              </div>
            </div>

            <div>
              <label htmlFor="delete-reason-input" className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Voiding / Deletion <span className="text-amber-700 font-semibold ml-0.5">(Required for Voiding)</span>
              </label>
              <textarea
                id="delete-reason-input"
                value={deleteReasonInput}
                onChange={(e) => {
                  setDeleteReasonInput(e.target.value);
                  if (deleteError) setDeleteError('');
                }}
                placeholder="e.g. Duplicate entry, Wrong amount, Cancelled expense..."
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
                <li><strong className="text-rose-700">Void Voucher:</strong> Keeps record with strikeout line for audit trace.</li>
                <li><strong className="text-rose-700">Permanently Remove:</strong> Completely purges entry from database.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTxn(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteWithReason(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Completely remove record from database"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Permanently Delete
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteWithReason(false)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                Void Voucher
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmPopupModal = () => (
    <AnimatePresence>
      {confirmPopupData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`w-full max-w-md bg-white dark:bg-slate-900 border-[1.5px] ${confirmPopupData.activeColorBorderClass} rounded-2xl shadow-2xl p-5 space-y-4`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                <span>Confirm Voucher Entry</span>
              </h3>
              <button
                type="button"
                onClick={() => setConfirmPopupData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed py-1">
              {confirmPopupData.isInward ? (
                <>
                  Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmPopupData.userName}</strong>, you are about to {confirmPopupData.isEdit ? 'update' : 'add'}{' '}
                  <strong className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{confirmPopupData.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> {confirmPopupData.isEdit ? 'deposit entry' : 'as new deposit'} under Voucher{' '}
                  <strong className="font-mono font-bold text-slate-900 dark:text-white">#{confirmPopupData.voucherNo}</strong>.
                </>
              ) : (
                <>
                  Hi <strong className="font-extrabold text-slate-900 dark:text-white">{confirmPopupData.userName}</strong>, you are about to {confirmPopupData.isEdit ? 'update' : 'add'}{' '}
                  <strong className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{confirmPopupData.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> for{' '}
                  <strong className="font-extrabold text-slate-900 dark:text-white">{confirmPopupData.category}</strong> under Voucher{' '}
                  <strong className="font-mono font-bold text-slate-900 dark:text-white">#{confirmPopupData.voucherNo}</strong>.
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmPopupData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmPopupData.onConfirm()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                Submit & Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderDetailModals = () => (
    <>
      {/* 1. Quick View & Workflow Stage Progression Modal (Eye Icon) */}
      <AnimatePresence>
        {viewingQuickViewTxn && (() => {
          const txn = viewingQuickViewTxn;
          const isDeposit = txn.type === 'IN';
          const st = txn.status || 'PAID';

          // Helper to extract sequential workflow steps
          const workflowSteps: Array<{
            id: string;
            stage: 'CREATED' | 'REROUTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'DELETED' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT';
            title: string;
            timestamp?: string;
            actor?: string;
            target?: string;
            reason?: string;
            details?: string;
            isCompleted: boolean;
            isCurrent: boolean;
          }> = [];

          // 1. User / Requester Creation Step
          const creatorName = txn.requestedBy || txn.recordedBy || 'Requester';
          workflowSteps.push({
            id: 'step-creation',
            stage: 'CREATED',
            title: isDeposit ? 'Deposit Cash Inflow Recorded' : 'Expense Request Submitted',
            timestamp: txn.date,
            actor: creatorName,
            target: txn.approverName,
            details: isDeposit 
              ? `Deposit entry logged into cash register by ${creatorName}`
              : (txn.approverName ? `Requested by ${creatorName} & submitted for manager review to ${txn.approverName}` : `Requested and recorded by ${creatorName}`),
            isCompleted: true,
            isCurrent: st === 'PENDING' && (!txn.workflowHistory || txn.workflowHistory.length <= 1) && !txn.reRoutedBy,
          });

          // 2. Chained Manager Re-Route Steps (handles multiple sequential re-routes)
          if (txn.workflowHistory && txn.workflowHistory.length > 0) {
            txn.workflowHistory.forEach((wf, wfIdx) => {
              if (wf.action === 'RE_ROUTED') {
                workflowSteps.push({
                  id: `step-reroute-${wf.id || wfIdx}`,
                  stage: 'REROUTED',
                  title: `Re-Routed to ${wf.target || 'Manager'}`,
                  timestamp: wf.timestamp,
                  actor: wf.actor,
                  target: wf.target,
                  reason: wf.reason,
                  details: `Manager ${wf.actor} re-routed approval responsibility to ${wf.target || 'another manager'}`,
                  isCompleted: true,
                  isCurrent: st === 'PENDING' && wfIdx === (txn.workflowHistory?.length || 0) - 1,
                });
              }
            });
          } else if (txn.reRoutedBy) {
            // Legacy single re-route fallback
            workflowSteps.push({
              id: 'step-reroute-legacy',
              stage: 'REROUTED',
              title: `Re-Routed to ${txn.approverName || 'Manager'}`,
              timestamp: txn.reRoutedAt,
              actor: txn.reRoutedBy,
              target: txn.approverName,
              reason: txn.reRouteReason,
              details: `Manager ${txn.reRoutedBy} re-routed approval responsibility to ${txn.approverName || 'another manager'}`,
              isCompleted: true,
              isCurrent: st === 'PENDING',
            });
          }

          // 3. Manager Review / Decision Step
          if (st === 'REJECTED' || txn.rejectedBy || txn.rejectedAt) {
            workflowSteps.push({
              id: 'step-rejected',
              stage: 'REJECTED',
              title: 'Request Rejected',
              timestamp: txn.rejectedAt,
              actor: txn.rejectedBy || 'Manager / Admin',
              reason: txn.rejectionReason,
              details: `Expense request was rejected by ${txn.rejectedBy || 'Manager / Admin'}`,
              isCompleted: true,
              isCurrent: true,
            });
          } else if (st === 'APPROVED' || st === 'PAID' || txn.approvedBy || txn.approvedAt) {
            const approver = txn.approvedBy || txn.approverName || 'Department Manager';
            workflowSteps.push({
              id: 'step-approved',
              stage: 'APPROVED',
              title: 'Manager Approved',
              timestamp: txn.approvedAt,
              actor: approver,
              details: `Approved by ${approver} for cash voucher disbursement`,
              isCompleted: true,
              isCurrent: st === 'APPROVED',
            });
          } else if (st === 'PENDING') {
            workflowSteps.push({
              id: 'step-pending-approval',
              stage: 'PENDING_APPROVAL',
              title: 'Awaiting Manager Approval',
              actor: txn.approverName || 'Designated Approver',
              details: `Pending review and approval action by ${txn.approverName || 'Designated Approver'}`,
              isCompleted: false,
              isCurrent: true,
            });
          }

          // 4. Cash Issuance / Payment Step (Admin or Custodian)
          if (st === 'PAID' || txn.paidBy || txn.paidAt) {
            workflowSteps.push({
              id: 'step-paid',
              stage: 'PAID',
              title: isDeposit ? 'Cash Received & Reconciled' : 'Cash Issued & Disbursed',
              timestamp: txn.paidAt,
              actor: txn.paidBy || 'Administrator / Custodian',
              details: isDeposit 
                ? `Deposit funds reconciled in register`
                : `Petty cash payment disbursed by ${txn.paidBy || 'Administrator / Custodian'}`,
              isCompleted: true,
              isCurrent: st === 'PAID',
            });
          } else if (st === 'APPROVED') {
            workflowSteps.push({
              id: 'step-pending-payment',
              stage: 'PENDING_PAYMENT',
              title: 'Pending Cash Handover',
              details: `Manager approved; ready for cash disbursement by Administrator / Custodian`,
              isCompleted: false,
              isCurrent: false,
            });
          }

          // 5. Voided / Cancelled (if deleted)
          if (st === 'DELETED' || txn.deletedBy || txn.deletedAt) {
            workflowSteps.push({
              id: 'step-deleted',
              stage: 'DELETED',
              title: 'Voucher Voided / Cancelled',
              timestamp: txn.deletedAt,
              actor: txn.deletedBy || 'Administrator',
              reason: txn.deleteReason,
              details: `Transaction voided by ${txn.deletedBy || 'Administrator'}`,
              isCompleted: true,
              isCurrent: true,
            });
          }

          // Stepper stages
          const isCreationDone = true;
          const isApprovalDone = st === 'APPROVED' || st === 'PAID';
          const isApprovalRejected = st === 'REJECTED';
          const isPaymentDone = st === 'PAID';

          return (
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="bg-white rounded-[24px] shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col text-slate-800 my-auto"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isDeposit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                      {isDeposit ? <ArrowDownLeft className="w-5 h-5 font-bold" /> : <ArrowUpRight className="w-5 h-5 font-bold" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base font-mono tracking-tight">
                          {txn.reference || txn.id}
                        </h3>
                        {/* Live Status Pill */}
                        {st === 'DELETED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                            Voided
                          </span>
                        ) : st === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Pending Approval
                          </span>
                        ) : st === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Approved - Awaiting Cash
                          </span>
                        ) : st === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Paid & Disbursed
                          </span>
                        ) : st === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Rejected
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {isDeposit ? 'Deposit Cash Inflow' : `Paid To: ${txn.merchant}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingQuickViewTxn(null)}
                    className="p-2 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700 focus:outline-hidden"
                    title="Close Quick View"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs sm:text-sm">
                  {/* Stepper Pipeline Banner */}
                  {!isDeposit && (
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Workflow Lifecycle Pipeline</p>
                      <div className="flex items-center justify-between relative">
                        {/* Connecting Line */}
                        <div className="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -z-0"></div>

                        {/* Step 1: Created */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${
                            isCreationDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            <Check className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 mt-1.5">Request Created</span>
                          <span className="text-[10px] text-slate-400">{txn.requestedBy || txn.recordedBy}</span>
                        </div>

                        {/* Step 2: Manager Review */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${
                            isApprovalDone ? 'bg-emerald-600 text-white' : isApprovalRejected ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white animate-pulse'
                          }`}>
                            {isApprovalDone ? <Check className="w-4 h-4" /> : isApprovalRejected ? <Ban className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 mt-1.5">
                            {isApprovalRejected ? 'Rejected' : isApprovalDone ? 'Approved' : 'Manager Review'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {txn.approvedBy || txn.approverName || 'Department Manager'}
                          </span>
                        </div>

                        {/* Step 3: Cash Disbursed */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${
                            isPaymentDone ? 'bg-emerald-600 text-white' : isApprovalDone ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-200 text-slate-400'
                          }`}>
                            {isPaymentDone ? <Check className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 mt-1.5">
                            {isPaymentDone ? 'Cash Issued' : 'Disbursement'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isPaymentDone ? (txn.paidBy || 'Admin') : isApprovalDone ? 'Awaiting Cash' : 'Pending Approval'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top 4 Financial Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {isDeposit ? 'Deposit Amount' : 'Disbursement'}
                      </span>
                      <span className={`text-base sm:text-lg font-black ${isDeposit ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {currencySymbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment Mode</span>
                      <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        (txn.paymentType || 'CASH') === 'ONLINE' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {txn.paymentType || 'CASH'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</span>
                      <span className="text-[11px] font-bold text-slate-800 truncate block" title={txn.category}>
                        {txn.category}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {isDeposit ? 'Deposited By' : 'Paid To'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-800 truncate block" title={txn.merchant}>
                        {txn.merchant}
                      </span>
                    </div>
                  </div>

                  {/* Two-Column Grid: Timeline & Particulars */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Stage Progression & Lifecycle Timeline */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                          Workflow Stage & Progression Timeline
                        </span>
                      </div>

                      <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-2">
                        {workflowSteps.map((step, sIdx) => {
                          const isReroute = step.stage === 'REROUTED';
                          const isApproved = step.stage === 'APPROVED';
                          const isRejected = step.stage === 'REJECTED';
                          const isPaid = step.stage === 'PAID';
                          const isDeleted = step.stage === 'DELETED';
                          const isPending = step.stage === 'PENDING_APPROVAL' || step.stage === 'PENDING_PAYMENT';

                          return (
                            <div key={sIdx} className="relative py-1 text-xs">
                              {/* Dot on timeline */}
                              <div className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                                isApproved || isPaid ? 'bg-emerald-500' : isRejected || isDeleted ? 'bg-rose-500' : isReroute ? 'bg-amber-500' : isPending ? 'bg-blue-400 animate-pulse' : 'bg-indigo-500'
                              }`}></div>

                              <div className={`p-3 rounded-xl border ${
                                isReroute ? 'bg-amber-50/50 border-amber-200' : isApproved ? 'bg-emerald-50/40 border-emerald-200' : isRejected ? 'bg-rose-50/40 border-rose-200' : isPaid ? 'bg-emerald-50/30 border-emerald-100' : isDeleted ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50/70 border-slate-200/80'
                              }`}>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    {isReroute ? (
                                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                                    ) : isApproved || isPaid ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : isRejected ? (
                                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                                    ) : isDeleted ? (
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                    <span className="font-bold text-slate-900 text-xs">{step.title}</span>
                                  </div>
                                  {step.timestamp && (
                                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                                      {formatVoidDateTime(step.timestamp)}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{step.details}</p>

                                {step.actor && (
                                  <div className="mt-1.5 text-[10px] font-semibold text-slate-500">
                                    Action by: <span className="text-slate-800 font-bold">{step.actor}</span>
                                    {step.target && <span> → Assigned to: <span className="text-indigo-600 font-bold">{step.target}</span></span>}
                                  </div>
                                )}

                                {step.reason && (
                                  <div className="mt-2 bg-white/90 p-2 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 italic">
                                    "{step.reason}"
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Particulars & Attachment */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Particulars Card */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Particulars / Purpose</span>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 font-medium text-slate-800 text-xs leading-relaxed">
                          {txn.description}
                        </div>
                      </div>

                      {/* Project Ref No */}
                      {txn.projectRefNo && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Project Ref. No.</span>
                          <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block text-xs">
                            {txn.projectRefNo}
                          </span>
                        </div>
                      )}

                      {/* Remarks */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Remarks / Notes</span>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed min-h-[36px]">
                          {(txn.remarks && txn.remarks.trim()) ? txn.remarks.trim() : <span className="text-slate-400 italic">N/A</span>}
                        </div>
                      </div>

                      {/* Attachment Document Preview Card */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Attachment Receipt</span>
                        {txn.receiptName ? (
                          <div 
                            onClick={() => setViewingAttachment(txn)}
                            className="group border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-800 text-xs truncate" title={txn.receiptName}>
                                  {txn.receiptName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {txn.receiptSize || 'Attachment'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="text-slate-900 font-bold text-xs flex items-center gap-1 shrink-0 bg-[#f7b944] hover:bg-[#e0a330] px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-200 p-3.5 rounded-2xl text-center text-slate-400 bg-slate-50/50">
                            <Paperclip className="w-4 h-4 mx-auto text-slate-300 mb-1" />
                            <p className="text-[11px] font-medium">No attachment uploaded for this voucher.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3 flex-wrap">
                  {/* Switch to detailed Audit Trail & Field History modal */}
                  <button
                    type="button"
                    onClick={() => {
                      const currentTxn = txn;
                      setViewingQuickViewTxn(null);
                      setSelectedDetailTransaction(currentTxn);
                    }}
                    className="inline-flex items-center gap-1.5 font-bold py-2 px-3.5 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                    title="Open Detailed Audit Trail & Field Modification History"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    Audit Trail & Field Edits
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isPrintableVoucher(txn)}
                      onClick={() => handlePrintSingleVoucher(txn)}
                      className={`inline-flex items-center gap-1.5 font-bold py-2 px-3.5 rounded-xl text-xs transition-all ${
                        !isPrintableVoucher(txn)
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 opacity-40 cursor-not-allowed'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer'
                      }`}
                      title={!isPrintableVoucher(txn) ? "Print available only after marked Paid or Void" : "Print Cash Voucher"}
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600" />
                      Print Voucher
                    </button>
                    <button
                      onClick={() => setViewingQuickViewTxn(null)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-md hover:shadow-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 2. Detailed Audit Trail & Field Modification History Modal (Clicking ID link) */}
      <AnimatePresence>
        {selectedDetailTransaction && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-[24px] shadow-2xl border border-slate-100 max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col text-slate-800 my-auto"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    selectedDetailTransaction.type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}>
                    {selectedDetailTransaction.type === 'IN' ? (
                      <ArrowDownLeft className="w-5 h-5 text-emerald-600 font-bold" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-rose-600 font-bold" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base font-mono">
                      {selectedDetailTransaction.reference || selectedDetailTransaction.id}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Voucher Audit Trail & Field Modification History
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDetailTransaction(null)}
                  className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700 focus:outline-hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content - Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs sm:text-sm">
                {selectedDetailTransaction.status === 'DELETED' && (
                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-rose-800 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider text-rose-900">Transaction Voided / Deleted</p>
                      <p className="text-xs font-medium mt-0.5 text-rose-700">
                        Deleted by <span className="font-bold">{selectedDetailTransaction.deletedBy || 'Admin'}</span> {selectedDetailTransaction.deletedAt ? `on ${formatVoidDateTime(selectedDetailTransaction.deletedAt)}` : ''}
                      </p>
                      {selectedDetailTransaction.deleteReason && (
                        <p className="text-xs font-semibold text-rose-900 mt-1.5 bg-white/80 p-2 rounded-xl border border-rose-200">
                          Reason: {selectedDetailTransaction.deleteReason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Main Amount Card */}
                <div className={`p-5 rounded-2xl flex items-center justify-between border ${
                  selectedDetailTransaction.type === 'IN' 
                    ? 'bg-emerald-50/40 border-emerald-100' 
                    : 'bg-rose-50/40 border-rose-100'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                      Transaction Amount
                    </span>
                    <span className={`text-xl sm:text-2xl font-black ${
                      selectedDetailTransaction.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {currencySymbol}{selectedDetailTransaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                      Voucher ID
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                      {selectedDetailTransaction.reference || selectedDetailTransaction.id}
                    </span>
                  </div>
                </div>

                {/* Transaction Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Date</span>
                    <span className="font-bold text-slate-800">{formatDate(selectedDetailTransaction.date)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      {selectedDetailTransaction.type === 'IN' ? 'Deposited By' : 'Paid To'}
                    </span>
                    <span className="font-bold text-slate-800">{selectedDetailTransaction.merchant}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Category</span>
                    <span className="font-bold text-slate-800">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold text-[11px]">
                        {selectedDetailTransaction.category}
                      </span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Payment Mode</span>
                    <span className="font-bold text-slate-800">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        (selectedDetailTransaction.paymentType || 'CASH') === 'ONLINE' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {selectedDetailTransaction.paymentType || 'CASH'}
                      </span>
                    </span>
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Particulars / Purpose</span>
                    <p className="font-semibold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {selectedDetailTransaction.description}
                    </p>
                  </div>
                  {selectedDetailTransaction.projectRefNo && (
                    <div className="col-span-1 sm:col-span-2 space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Project Ref. No.</span>
                      <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 inline-block text-xs">
                        {selectedDetailTransaction.projectRefNo}
                      </span>
                    </div>
                  )}
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Remarks / Notes</span>
                    <p className="font-medium text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 min-h-[36px]">
                      {(selectedDetailTransaction.remarks && selectedDetailTransaction.remarks.trim()) ? selectedDetailTransaction.remarks.trim() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Attachment Card */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Attachment Doc</span>
                  {selectedDetailTransaction.receiptName ? (
                    <div 
                      onClick={() => setViewingAttachment(selectedDetailTransaction)}
                      className="group border border-slate-200 hover:border-indigo-400/50 bg-slate-50 hover:bg-indigo-50/10 p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all gap-2.5 w-full min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-[#f7b944] border border-amber-200/50 flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="font-extrabold text-slate-800 text-xs truncate w-full block" title={selectedDetailTransaction.receiptName}>
                            {selectedDetailTransaction.receiptName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono font-medium truncate block">
                            {selectedDetailTransaction.receiptSize || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-slate-900 group-hover:text-black font-extrabold text-[11px] sm:text-xs flex items-center gap-1 shrink-0 bg-[#f7b944] hover:bg-[#e0a330] shadow-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 p-4 rounded-2xl text-center text-slate-400 bg-slate-50/50">
                      <Paperclip className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                      <p className="text-[11px] font-medium">No attachment uploaded for this voucher.</p>
                    </div>
                  )}
                </div>

                {/* Edit History Section */}
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-600">
                    <History className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      Field Modification History
                    </span>
                  </div>

                  {!selectedDetailTransaction.editHistory || selectedDetailTransaction.editHistory.length === 0 ? (
                    <div className="bg-slate-50 p-4 rounded-2xl text-center text-slate-400 border border-slate-100">
                      <span className="text-[11px] font-medium italic">Original entry. No field modifications have been recorded yet.</span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[180px] overflow-y-auto pr-1">
                      {selectedDetailTransaction.editHistory.map((entry, eIdx) => (
                        <div key={eIdx} className="relative pl-5 border-l-2 border-indigo-100 py-0.5 text-[11px] sm:text-xs">
                          {/* Timeline dot */}
                          <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white"></div>
                          
                          {/* Log Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] mb-2">
                            <span className="font-bold text-slate-800">
                              Edited by <span className="text-indigo-600">{entry.editedBy}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">
                              {formatVoidDateTime(entry.timestamp)}
                            </span>
                          </div>

                          {/* Changes List */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                            {entry.changes
                              .filter(c => {
                                const oldV = (c.oldValue || '').trim();
                                const newV = (c.newValue || '').trim();
                                if (oldV === newV) return false;
                                if ((oldV === 'None' || !oldV) && (newV === 'None' || !newV)) return false;
                                if ((c.field === 'Payment Mode' || c.field === 'paymentType' || c.field === 'Payment Type') && (oldV === '(Blank)' || oldV === 'CASH' || oldV === 'None' || !oldV) && newV === 'CASH') return false;
                                return true;
                              })
                              .map((change, cIdx) => {
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const currentTxn = selectedDetailTransaction;
                    setSelectedDetailTransaction(null);
                    setViewingQuickViewTxn(currentTxn);
                  }}
                  className="inline-flex items-center gap-1.5 font-bold py-2 px-3 rounded-xl text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                  title="View Workflow Stages"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Quick View Stages
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!selectedDetailTransaction || !isPrintableVoucher(selectedDetailTransaction)}
                    onClick={() => selectedDetailTransaction && handlePrintSingleVoucher(selectedDetailTransaction)}
                    className={`inline-flex items-center gap-1.5 font-bold py-2 px-3 rounded-xl text-xs transition-all ${
                      selectedDetailTransaction && !isPrintableVoucher(selectedDetailTransaction)
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 opacity-40 cursor-not-allowed'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer'
                    }`}
                    title={selectedDetailTransaction && !isPrintableVoucher(selectedDetailTransaction) ? "Print available only after marked Paid or Void" : "Print Cash Voucher"}
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    Print Voucher
                  </button>
                  <button
                    onClick={() => setSelectedDetailTransaction(null)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-md hover:shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High-Fidelity Interactive Attachment Viewer Overlay */}
      <AnimatePresence>
        {viewingAttachment && (() => {
          const hasUrl = Boolean(viewingAttachment.receiptUrl);
          const url = viewingAttachment.receiptUrl || '';
          const name = viewingAttachment.receiptName || 'Attachment';
          const size = viewingAttachment.receiptSize || 'Attached File';
          const lowerName = name.toLowerCase();
          const lowerUrl = url.toLowerCase();
          const isPdf = url.startsWith('data:application/pdf') || lowerUrl.includes('.pdf') || lowerName.endsWith('.pdf');
          const isImage = !isPdf && (
            url.startsWith('data:image/') ||
            /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(lowerUrl) ||
            /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lowerName) ||
            lowerUrl.includes('/image/upload/')
          );

          return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[60]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[24px] shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col text-slate-800"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#f7b944] flex items-center justify-center shrink-0 font-bold border border-amber-200/50">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm font-mono truncate block max-w-[220px] sm:max-w-[360px]">
                        {name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Voucher: {viewingAttachment.reference || viewingAttachment.id} • {size}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingAttachment(null)}
                    className="p-2 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] flex-1 bg-slate-100/60 font-sans space-y-4">
                  {hasUrl ? (
                    isImage ? (
                      /* Actual Image Attachment */
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 max-w-full overflow-hidden flex items-center justify-center">
                          <img 
                            src={attachmentBlobUrl || url} 
                            alt={name} 
                            className="max-w-full max-h-[50vh] sm:max-h-[58vh] object-contain rounded-xl shadow-xs" 
                          />
                        </div>
                      </div>
                    ) : isPdf ? (
                      /* Actual PDF Attachment with High-Res In-App Render & Reader */
                      <PdfViewerModalContent
                        url={url}
                        attachmentBlobUrl={attachmentBlobUrl}
                        name={name}
                        size={size}
                        openAttachmentInNewTab={openAttachmentInNewTab}
                      />
                    ) : (
                      /* Generic Document Attachment */
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
                        <FileText className="w-16 h-16 text-[#f7b944] mx-auto" />
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm">{name}</h3>
                          <p className="text-xs text-slate-400 font-mono mt-1">{size}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openAttachmentInNewTab(url, name)}
                          className="px-4 py-2 bg-[#f7b944] hover:bg-[#e5a833] text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-xs mx-auto"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open / Download Attachment
                        </button>
                      </div>
                    )
                  ) : (
                    /* Legacy Entry / Fallback Voucher Copy when raw file URL wasn't provided */
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          Attached File Name: <strong className="font-extrabold">{name}</strong> ({size})
                        </span>
                        <span className="text-[10px] font-bold bg-amber-200/80 px-2 py-0.5 rounded-md uppercase">
                          Voucher Backup Copy
                        </span>
                      </div>

                      {/* System Voucher Copy */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
                        <div className="absolute top-12 right-6 transform rotate-12 border-4 border-emerald-500/30 text-emerald-500/30 font-extrabold text-[10px] sm:text-xs tracking-widest px-3 py-1 rounded-md uppercase select-none pointer-events-none">
                          RECONCILED & AUDITED
                        </div>

                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                          <div>
                            <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">PETTY CASH VOUCHER</h2>
                            <p className="text-[10px] font-mono text-indigo-600 mt-1">{viewingAttachment.reference || viewingAttachment.id}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-400 block">GENERATED ON</span>
                            <span className="text-xs font-bold text-slate-700">{formatDate(viewingAttachment.date)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">
                              {viewingAttachment.type === 'IN' ? 'Deposited By (Source)' : 'Paid To (Merchant/Payee)'}
                            </span>
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{viewingAttachment.merchant}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">Recorded By</span>
                            <span className="font-bold text-slate-700">{viewingAttachment.recordedBy || 'Sarah Jenkins'}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-50 pt-3">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">Particulars / Purpose</span>
                            <p className="text-slate-600 font-medium leading-relaxed">{viewingAttachment.description}</p>
                          </div>
                        </div>

                        <div className="border border-slate-100 rounded-lg overflow-hidden mt-2 text-xs">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-100">
                                <th className="py-2 px-3 text-left">Category</th>
                                <th className="py-2 px-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="py-3 px-3 font-semibold text-slate-700">{viewingAttachment.category}</td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                  {currencySymbol}{viewingAttachment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                          <div>
                            {viewingAttachment.remarks && (
                              <div className="text-[10px] text-slate-500 max-w-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="font-bold block text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">Remarks / Audit Note</span>
                                {viewingAttachment.remarks}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end w-full sm:w-auto">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Voucher Value</span>
                            <span className="text-base sm:text-lg font-black text-slate-900">
                              {currencySymbol}{viewingAttachment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-white">
                  <div className="flex items-center gap-2">
                    {hasUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => openAttachmentInNewTab(attachmentBlobUrl || url, name)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open in New Tab
                        </button>
                        <a
                          href={attachmentBlobUrl || url}
                          download={name}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download File
                        </a>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setViewingAttachment(null)}
                    className="ml-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </>
  );

  if (forceTypeVal === 'IN') {
    return (
      <div className="space-y-6 flex flex-col min-h-0">
        {/* Single Consolidated Inward Section Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
          
          {/* Table Controls & Filtering Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/20 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                Filter deposit
              </h3>
            </div>
            
            {/* Filtering & Action Buttons Row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between xl:justify-end gap-4 flex-wrap">
              {/* Date filters */}
              <div className="grid grid-cols-2 sm:flex sm:items-end gap-3 w-full sm:w-auto">
                <div className="col-span-1 sm:flex-none sm:w-[140px]">
                  <label htmlFor="inward-from" className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">From Date</label>
                  <input 
                    id="inward-from"
                    type="date" 
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setIsAllTime(false);
                    }}
                    disabled={isAllTime}
                    className={`w-full py-1.5 px-3 bg-white border border-slate-200 focus:border-slate-300 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-700 transition-all h-[34px] ${isAllTime ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="col-span-1 sm:flex-none sm:w-[140px]">
                  <label htmlFor="inward-to" className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">To Date</label>
                  <input 
                    id="inward-to"
                    type="date" 
                    value={toDate}
                    max={todayStr}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setIsAllTime(false);
                    }}
                    disabled={isAllTime}
                    className={`w-full py-1.5 px-3 bg-white border border-slate-200 focus:border-slate-300 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-700 transition-all h-[34px] ${isAllTime ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 sm:flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAllTime) {
                        const dates = getCurrentMonthDates();
                        setFromDate(dates.firstDay);
                        setToDate(dates.today);
                        setIsAllTime(false);
                      } else {
                        setIsAllTime(true);
                      }
                    }}
                    className="w-full sm:w-auto py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs h-[34px]"
                  >
                    {isAllTime ? 'Reset' : 'All time'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Export Report Dropdown */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                    style={{ backgroundColor: '#f7b944' }}
                    className="py-2 px-3.5 hover:opacity-90 text-amber-950 rounded-xl border border-amber-300/30 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs h-[34px]"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-900" />
                    Export Report
                  </button>
                  {isExportDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                        <button
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

                {currentUser.role !== 'AUDITOR' && (
                  <button 
                    onClick={() => handleOpenAddModal('IN')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md shadow-emerald-950/15 transition-all flex items-center gap-1.5 cursor-pointer h-[34px] whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    New Deposit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Ledger Table Container */}
          <div className="flex-1 mt-6 overflow-hidden flex flex-col">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-auto flex-1">
              <table className="w-full text-left border-collapse text-xs relative">
                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs z-10 border-b border-slate-100">
                  <tr className="text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6 whitespace-nowrap">Date</th>
                    <th className="py-3.5 px-6 whitespace-nowrap">ID</th>
                    <th className="py-3.5 px-6">Credit Amount</th>
                    <th className="py-3.5 px-6">Remarks</th>
                    <th className="py-3.5 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        No deposits match the given criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((txn, idx) => (
                      <tr key={idx} className={txn.status === 'DELETED' ? "bg-rose-50/20 text-slate-400 opacity-75 transition-colors" : "hover:bg-slate-50/50 transition-colors"}>
                        {/* Date */}
                        <td className={`py-4 px-6 font-mono text-[10px] whitespace-nowrap ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : 'text-slate-400'}`}>
                          {formatDate(txn.date)}
                        </td>

                        {/* ID */}
                        <td className={`py-4 px-6 font-mono font-bold text-[11px] whitespace-nowrap ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : 'text-slate-950'}`}>
                          <button
                            type="button"
                            onClick={() => setSelectedDetailTransaction(txn)}
                            className={`cursor-pointer focus:outline-hidden font-bold text-left ${txn.status === 'DELETED' ? 'text-slate-400 line-through decoration-rose-500/80' : 'text-indigo-600 hover:text-indigo-800 hover:underline'}`}
                          >
                            {txn.reference || txn.id}
                            {txn.receiptName && (
                              <span className="ml-1 text-rose-600 font-extrabold font-mono" title="Has attachment">#</span>
                            )}
                          </button>
                          {txn.status === 'DELETED' && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 text-[9px] font-extrabold text-rose-700 bg-rose-100 border border-rose-200 rounded-md uppercase no-underline shadow-2xs" title={`Deleted by ${txn.deletedBy || 'Admin'}: ${txn.deleteReason || 'No reason provided'}`}>
                              DELETED
                            </span>
                          )}
                        </td>
                        
                        {/* Credit Amount */}
                        <td className={`py-4 px-6 font-bold text-sm ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : 'text-emerald-600'}`}>
                          {currencySymbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Remarks */}
                        <td className="py-4 px-6 max-w-md break-words text-slate-500">
                          <span className={txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : ''}>
                            {txn.description}
                          </span>
                          {txn.status === 'DELETED' && txn.deleteReason && (
                            <div className="text-[10px] text-rose-600 font-semibold italic mt-0.5">
                              Reason: {txn.deleteReason}
                            </div>
                          )}
                        </td>
                        
                        {/* Action */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewingQuickViewTxn(txn)}
                              className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                              title="Quick View Workflow Stage Progression"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {txn.status === 'DELETED' ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md" title={`Deleted by ${txn.deletedBy || 'Admin'}: ${txn.deleteReason || ''}`}>
                                Voided
                              </span>
                            ) : currentUser.role === 'ADMIN' && (
                              <>
                                <button
                                  onClick={() => handleEditClick(txn)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                                  title="Edit Entry"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                
                                <button
                                  onClick={() => handleOpenDeleteModal(txn)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                                  title="Delete Entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="md:hidden overflow-auto flex-1 divide-y divide-slate-100 px-4">
              {filteredTransactions.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  No deposits match the given criteria.
                </div>
              ) : (
                paginatedTransactions.map((txn, idx) => (
                  <div key={idx} className={`py-4 space-y-3 ${txn.status === 'DELETED' ? 'opacity-75 bg-rose-50/10 p-3 rounded-xl border border-rose-100' : ''}`}>
                    {/* Top row: Date & ID */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-mono ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 text-slate-400' : 'text-slate-400'}`}>{formatDate(txn.date)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailTransaction(txn)}
                          className={`font-mono font-bold px-2 py-0.5 rounded-md whitespace-nowrap cursor-pointer focus:outline-hidden ${txn.status === 'DELETED' ? 'text-slate-400 line-through bg-slate-100' : 'text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50/50 hover:bg-indigo-50'}`}
                        >
                          {txn.reference || txn.id}
                          {txn.receiptName && <span className="ml-1 text-rose-600 font-extrabold">#</span>}
                        </button>
                        {txn.status === 'DELETED' && (
                          <span className="px-1.5 py-0.5 text-[9px] font-extrabold text-rose-700 bg-rose-100 border border-rose-200 rounded-md uppercase">
                            DELETED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle row: Particulars & Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className={`font-bold text-xs sm:text-sm ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 text-slate-500' : 'text-slate-900'}`}>Deposit Inflow</h4>
                        <p className={`text-xs mt-1 leading-relaxed ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 text-slate-400' : 'text-slate-500'}`}>{txn.description}</p>
                        {txn.status === 'DELETED' && txn.deleteReason && (
                          <p className="text-[10px] text-rose-600 font-semibold italic mt-1">Reason: {txn.deleteReason}</p>
                        )}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className={`font-bold text-base ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 text-slate-400' : 'text-emerald-600'}`}>
                          {currencySymbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Bottom row: recordedBy & edit actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                      <div className="text-[10px] text-slate-400">
                        Recorded by <span className="font-semibold text-slate-600">{txn.recordedBy}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingQuickViewTxn(txn)}
                          className="inline-flex items-center gap-1 py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer h-7"
                          title="Quick View Stages"
                        >
                          <Eye className="w-3 h-3" />
                          Stages
                        </button>
                        {txn.status === 'DELETED' ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                            Voided
                          </span>
                        ) : currentUser.role === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => handleEditClick(txn)}
                              className="inline-flex items-center gap-1 py-1 px-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer h-7"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                            
                            <button
                              onClick={() => handleOpenDeleteModal(txn)}
                              className="inline-flex items-center gap-1 py-1 px-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer h-7"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {renderPagination()}
        </div>

        {/* Form Dialog modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-[20px] shadow-2xl border border-slate-100 max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto flex flex-col"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ebfbf3] flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="w-5 h-5 text-[#009660] font-bold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0f172a] text-[15px] tracking-tight leading-none">
                        {editingTransaction ? 'Edit Inward Cash' : 'Record Inward Cash'}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-normal mt-1 leading-tight">
                        {editingTransaction ? 'Modify entry in the petty cash ledger' : 'Add new entry to the petty cash ledger'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <div>{formError}</div>
                    </div>
                  )}

                  {/* DATE */}
                  <div>
                    <label htmlFor="form-date-in" className="block text-[10px] font-bold text-[#475569] uppercase mb-1.5 tracking-wider">
                      Date
                    </label>
                    <input 
                      id="form-date-in"
                      type="date" 
                      value={formDate}
                      max={todayStr}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full py-3 px-4 bg-white border border-slate-200 focus:border-[#009660] focus:ring-1 focus:ring-[#009660] focus:outline-hidden rounded-[14px] text-xs font-semibold text-slate-800 transition-all"
                    />
                  </div>

                  {/* AMOUNT */}
                  <div>
                    <label htmlFor="form-amount-in" className="block text-[10px] font-bold text-[#475569] uppercase mb-1.5 tracking-wider">
                      Amount ({currencySymbol})
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{currencySymbol}</span>
                      <input 
                        id="form-amount-in"
                        type="number" 
                        step="0.01"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full py-3 pl-9 pr-4 bg-white border border-slate-200 focus:border-[#009660] focus:ring-1 focus:ring-[#009660] focus:outline-hidden rounded-[14px] text-xs font-bold text-slate-800 transition-all placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* PARTICULARS / PURPOSE */}
                  <div>
                    <label htmlFor="form-desc-in" className="block text-[10px] font-bold text-[#475569] uppercase mb-1.5 tracking-wider">
                      Particulars / Purpose
                    </label>
                    <input 
                      id="form-desc-in"
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="ATM withdraw, Initial Amount etc."
                      required
                      className="w-full py-3 px-4 bg-white border border-slate-200 focus:border-[#009660] focus:ring-1 focus:ring-[#009660] focus:outline-hidden rounded-[14px] text-xs font-semibold text-slate-800 transition-all placeholder-slate-400"
                    />
                  </div>

                  {/* Action buttons matching the Cancel / Confirm layout */}
                  <div className="pt-3 flex gap-3 border-t border-slate-50">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 bg-white hover:bg-slate-50 text-[#0f172a] font-bold py-3 px-4 rounded-[14px] text-xs border border-slate-200 transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-[#009660] hover:bg-[#007d50] text-white font-bold py-3 px-4 rounded-[14px] text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-[#009660]/20"
                    >
                      <Check className="w-4 h-4 font-bold stroke-[3]" />
                      Confirm Entry
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {renderDetailModals()}
        {renderDeleteModal()}
        {renderConfirmPopupModal()}
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col min-h-0">
      
      {/* Single Consolidated Outward Section Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        
        {/* Table Controls & Filtering Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-white space-y-4 shrink-0">
          {/* Top Row: Title & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
                <ArrowUpRight className="w-4.5 h-4.5 text-rose-600 stroke-[2.5]" />
                {forceTypeVal === 'OUT' ? 'Expense Registry' : 'Account Ledger'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Record cash disbursements and track voucher disbursements.
              </p>
            </div>
            
            {/* Top Right Actions */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 w-full sm:w-auto">
              {/* Export Button */}
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
                    <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
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
                        onClick={() => {
                          handleExportPDF();
                          setIsExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Export as PDF
                      </button>
                      <div className="my-1 border-t border-slate-100"></div>
                      <button
                        onClick={() => {
                          setIsExportDropdownOpen(false);
                          handleSelectLatest3();
                          setIsBatchModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                        Batch Print (3/A4)
                      </button>
                    </div>
                  </>
                )}
              </div>

              {currentUser.role !== 'AUDITOR' && (
                <button 
                  onClick={handleOpenAddModal}
                  className="col-span-1 sm:col-span-auto w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md shadow-rose-950/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer h-[36px] shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[3] shrink-0" />
                  <span>New expense</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Filter Controls Toolbar */}
          <div className="pt-3 border-t border-slate-100/80 bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 lg:hidden">
              Filter Expenses
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-2.5">
              {/* From Date */}
              <div className="col-span-1 sm:w-[130px]">
                <label htmlFor="outward-from" className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">From Date</label>
                <input 
                  id="outward-from"
                  type="date" 
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setIsAllTime(false);
                  }}
                  disabled={isAllTime}
                  className={`w-full py-1.5 px-2.5 bg-white border border-slate-200 focus:border-rose-500 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] ${isAllTime ? 'opacity-40 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* To Date */}
              <div className="col-span-1 sm:w-[130px]">
                <label htmlFor="outward-to" className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">To Date</label>
                <input 
                  id="outward-to"
                  type="date" 
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setIsAllTime(false);
                  }}
                  disabled={isAllTime}
                  className={`w-full py-1.5 px-2.5 bg-white border border-slate-200 focus:border-rose-500 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] ${isAllTime ? 'opacity-40 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* All time Reset Button */}
              <div className="col-span-1 sm:w-[85px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">Period</label>
                <button
                  type="button"
                  onClick={() => {
                    if (isAllTime) {
                      const dates = getCurrentMonthDates();
                      setFromDate(dates.firstDay);
                      setToDate(dates.today);
                      setIsAllTime(false);
                    } else {
                      setIsAllTime(true);
                      setFilterCategory([]);
                      setFilterPayee([]);
                      setFilterPaymentMode([]);
                      setFilterStatus([]);
                    }
                  }}
                  className="w-full py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs h-[36px]"
                >
                  {isAllTime ? 'Reset' : 'All time'}
                </button>
              </div>

              {/* Category Multi-Select Filter */}
              <div className="relative col-span-1 sm:w-[150px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                  Category {filterCategory.length > 0 && <span className="text-rose-600 font-extrabold">({filterCategory.length})</span>}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryFilterOpen(!isCategoryFilterOpen);
                    setIsPayeeFilterOpen(false);
                    setIsPaymentModeFilterOpen(false);
                    setIsStatusFilterOpen(false);
                  }}
                  className={`w-full py-1.5 px-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                    filterCategory.length > 0 ? 'border-rose-400 bg-rose-50/20 text-rose-950 font-bold' : 'border-slate-200 hover:border-slate-300'
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
                            onClick={() => setFilterCategory(expenseCategories.map(c => c.name))}
                            className="text-rose-600 hover:underline cursor-pointer"
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
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-rose-400"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                        {expenseCategories
                          .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map((cat, idx) => {
                            const isChecked = filterCategory.includes(cat.name);
                            return (
                              <label
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-rose-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setFilterCategory(prev => 
                                      prev.includes(cat.name) ? prev.filter(c => c !== cat.name) : [...prev, cat.name]
                                    );
                                  }}
                                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer accent-rose-600"
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

              {/* Paid To Multi-Select Filter */}
              <div className="relative col-span-1 sm:w-[150px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                  Paid to {filterPayee.length > 0 && <span className="text-rose-600 font-extrabold">({filterPayee.length})</span>}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsPayeeFilterOpen(!isPayeeFilterOpen);
                    setIsCategoryFilterOpen(false);
                    setIsPaymentModeFilterOpen(false);
                    setIsStatusFilterOpen(false);
                  }}
                  className={`w-full py-1.5 px-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                    filterPayee.length > 0 ? 'border-rose-400 bg-rose-50/20 text-rose-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate">
                    {filterPayee.length === 0
                      ? 'All Payees'
                      : filterPayee.length === 1
                      ? filterPayee[0]
                      : `${filterPayee.length} Selected`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>

                {isPayeeFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsPayeeFilterOpen(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                        <span className="font-extrabold text-slate-800 text-[11px]">Filter Paid To</span>
                        <div className="flex gap-2 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setFilterPayee(uniquePayees)}
                            className="text-rose-600 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setFilterPayee([])}
                            className="text-slate-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Search payees..."
                        value={payeeSearch}
                        onChange={(e) => setPayeeSearch(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2 focus:outline-hidden focus:border-rose-400"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                        {uniquePayees
                          .filter(p => p.toLowerCase().includes(payeeSearch.toLowerCase()))
                          .map((payee, idx) => {
                            const isChecked = filterPayee.includes(payee);
                            return (
                              <label
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-rose-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setFilterPayee(prev => 
                                      prev.includes(payee) ? prev.filter(p => p !== payee) : [...prev, payee]
                                    );
                                  }}
                                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer accent-rose-600"
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

              {/* Type (Cash / Online) Multi-Select Filter */}
              <div className="relative col-span-1 sm:w-[130px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider truncate">
                  Type {filterPaymentMode.length > 0 && <span className="text-rose-600 font-extrabold">({filterPaymentMode.length})</span>}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentModeFilterOpen(!isPaymentModeFilterOpen);
                    setIsCategoryFilterOpen(false);
                    setIsPayeeFilterOpen(false);
                    setIsStatusFilterOpen(false);
                  }}
                  className={`w-full py-1.5 px-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                    filterPaymentMode.length > 0 ? 'border-rose-400 bg-rose-50/20 text-rose-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate">
                    {filterPaymentMode.length === 0
                      ? 'All Types'
                      : filterPaymentMode.length === 1
                      ? (filterPaymentMode[0] === 'ONLINE' ? 'Online' : 'Cash')
                      : `${filterPaymentMode.length} Selected`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>

                {isPaymentModeFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsPaymentModeFilterOpen(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                        <span className="font-extrabold text-slate-800 text-[11px]">Filter Type</span>
                        <div className="flex gap-2 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setFilterPaymentMode(['CASH', 'ONLINE'])}
                            className="text-rose-600 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setFilterPaymentMode([])}
                            className="text-slate-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {[
                          { id: 'CASH', label: 'Cash' },
                          { id: 'ONLINE', label: 'Online' }
                        ].map((mode, idx) => {
                          const isChecked = filterPaymentMode.includes(mode.id);
                          return (
                            <label
                              key={idx}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-rose-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterPaymentMode(prev =>
                                    prev.includes(mode.id) ? prev.filter(m => m !== mode.id) : [...prev, mode.id]
                                  );
                                }}
                                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer accent-rose-600"
                              />
                              <span className="truncate">{mode.label}</span>
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
                  Status {filterStatus.length > 0 && <span className="text-rose-600 font-extrabold">({filterStatus.length})</span>}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsStatusFilterOpen(!isStatusFilterOpen);
                    setIsCategoryFilterOpen(false);
                    setIsPayeeFilterOpen(false);
                    setIsPaymentModeFilterOpen(false);
                  }}
                  className={`w-full py-1.5 px-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-700 transition-all h-[36px] cursor-pointer flex items-center justify-between shadow-2xs ${
                    filterStatus.length > 0 ? 'border-rose-400 bg-rose-50/20 text-rose-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate">
                    {filterStatus.length === 0
                      ? 'All Statuses'
                      : filterStatus.length === 1
                      ? filterStatus[0]
                      : `${filterStatus.length} Selected`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>

                {isStatusFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsStatusFilterOpen(false)} />
                    <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                        <span className="font-extrabold text-slate-800 text-[11px]">Filter Status</span>
                        <div className="flex gap-2 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setFilterStatus(['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'DELETED'])}
                            className="text-rose-600 hover:underline cursor-pointer"
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
                      <div className="space-y-1">
                        {[
                          { id: 'PENDING', label: 'Pending' },
                          { id: 'APPROVED', label: 'Approved' },
                          { id: 'PAID', label: 'Paid' },
                          { id: 'REJECTED', label: 'Rejected' },
                          { id: 'DELETED', label: 'Deleted / Voided' }
                        ].map((st, idx) => {
                          const isChecked = filterStatus.includes(st.id);
                          return (
                            <label
                              key={idx}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-rose-50/50 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterStatus(prev => 
                                    prev.includes(st.id) ? prev.filter(s => s !== st.id) : [...prev, st.id]
                                  );
                                }}
                                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer accent-rose-600"
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
        </div>

        {/* Ledger Table Container */}
        <div className="flex-1 mt-6 overflow-hidden flex flex-col">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-auto flex-1">
            <table className="w-full text-left border-collapse text-xs relative">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs z-10 border-b border-slate-100">
                <tr className="text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6 whitespace-nowrap">Date</th>
                  <th className="py-3.5 px-6 whitespace-nowrap">ID</th>
                  <th className="py-3.5 px-6">Paid To</th>
                  <th className="py-3.5 px-6">Particulars</th>
                  <th className="py-3.5 px-6">Debit Amount</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      No transactions match the given criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((txn, idx) => (
                    <tr key={idx} className={txn.status === 'DELETED' ? "bg-rose-50/20 text-slate-400 opacity-75 transition-colors" : "hover:bg-slate-50/50 transition-colors"}>
                      {/* Date */}
                      <td className={`py-4 px-6 font-mono text-[10px] whitespace-nowrap ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : 'text-slate-400'}`}>{formatDate(txn.date)}</td>
                      
                      {/* ID */}
                      <td className={`py-4 px-6 font-mono font-bold text-[11px] whitespace-nowrap ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : 'text-slate-950'}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedDetailTransaction(txn)}
                          className={`cursor-pointer focus:outline-hidden font-bold text-left ${txn.status === 'DELETED' ? 'text-slate-400 line-through' : 'text-indigo-600 hover:text-indigo-800 hover:underline'}`}
                        >
                          {txn.reference || txn.id}
                          {txn.receiptName && (
                            <span className="ml-1 text-rose-600 font-extrabold font-mono" title="Has attachment">#</span>
                          )}
                        </button>
                      </td>
                      
                      {/* Paid To */}
                      <td className={`py-4 px-6 font-bold ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : 'text-slate-900'}`}>{txn.merchant}</td>
                      
                      {/* Particulars */}
                      <td className="py-4 px-6 max-w-xs break-words text-slate-500">
                        <span className={txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : ''}>
                          {txn.description}
                        </span>
                        {txn.status === 'DELETED' && txn.deleteReason && (
                          <div className="text-[10px] text-rose-600 font-semibold italic mt-0.5">
                            Reason: {txn.deleteReason}
                          </div>
                        )}
                      </td>
                      
                      {/* Debit Amount */}
                      <td className={`py-4 px-6 whitespace-nowrap ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 decoration-2 text-slate-400' : ''}`}>
                        <div className={`font-bold text-sm ${txn.status === 'DELETED' ? 'text-slate-400' : 'text-rose-600'}`}>
                          {currencySymbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {txn.paymentType && (
                          <div className="mt-1">
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              txn.paymentType === 'ONLINE' 
                                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                : 'bg-slate-50 text-slate-500 border border-slate-100'
                            }`}>
                              {txn.paymentType === 'ONLINE' ? 'Online' : 'Cash'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className={`py-4 px-6 ${txn.status === 'DELETED' ? 'opacity-60 line-through' : ''}`}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 whitespace-nowrap">
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: categories.find(c => c.name === txn.category)?.color || '#6b7280' }}
                          ></span>
                          {txn.category}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {(() => {
                          const st = txn.status || 'PAID';
                          if (st === 'DELETED') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs cursor-help" title={`Deleted by ${txn.deletedBy || 'Admin'}: ${txn.deleteReason || 'No reason provided'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                DELETED
                              </span>
                            );
                          }
                          if (st === 'PENDING') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Pending
                              </span>
                            );
                          }
                          if (st === 'APPROVED') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Approved
                              </span>
                            );
                          }
                          if (st === 'PAID') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Paid
                              </span>
                            );
                          }
                          if (st === 'REJECTED') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Rejected
                              </span>
                            );
                          }
                          return <span className="text-[10px] font-bold text-slate-500">{st}</span>;
                        })()}
                      </td>
                      
                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Attachment / Receipt view button */}
                          {(() => {
                            const hasAttachment = Boolean(txn.receiptUrl || txn.receiptName);
                            return (
                              <div className="relative group/att inline-flex">
                                <button
                                  type="button"
                                  disabled={!hasAttachment}
                                  onClick={() => hasAttachment && setViewingAttachment(txn)}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    hasAttachment
                                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 shadow-2xs border border-indigo-200/80 cursor-pointer'
                                      : 'text-slate-300 bg-slate-50/60 border border-slate-100 cursor-not-allowed opacity-50'
                                  }`}
                                  aria-label={hasAttachment ? 'View Attached Receipt Document' : 'This voucher has no attachment'}
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/att:flex flex-col items-center pointer-events-none z-30">
                                  <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap border border-slate-800 tracking-wide">
                                    {hasAttachment ? 'View Attached Receipt Document' : 'This voucher has no attachment'}
                                  </div>
                                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5 border-r border-b border-slate-800"></div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Quick View (Eye Icon) Stage Progression Modal */}
                          <button
                            type="button"
                            onClick={() => setViewingQuickViewTxn(txn)}
                            className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                            title="Quick View Workflow Stage Progression"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print action (accessible to all, including auditors) */}
                          <button
                            type="button"
                            disabled={!isPrintableVoucher(txn)}
                            onClick={() => handlePrintSingleVoucher(txn)}
                            className={`p-1.5 rounded-lg transition-all ${
                              !isPrintableVoucher(txn)
                                ? 'opacity-30 cursor-not-allowed text-slate-300'
                                : 'hover:bg-slate-100 text-slate-400 hover:text-[#009660] cursor-pointer'
                            }`}
                            title={!isPrintableVoucher(txn) ? "Print available only after marked Paid or Void" : "Print Voucher"}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {txn.status === 'DELETED' ? (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md" title={`Deleted by ${txn.deletedBy || 'Admin'}: ${txn.deleteReason || ''}`}>
                              Voided
                            </span>
                          ) : currentUser.role === 'ADMIN' && (
                            <>
                              <button
                                onClick={() => handleEditClick(txn)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                                title="Edit Entry"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => handleOpenDeleteModal(txn)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List View */}
          <div className="md:hidden overflow-auto flex-1 divide-y divide-slate-100 px-4">
            {filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No transactions match the given criteria.
              </div>
            ) : (
              paginatedTransactions.map((txn, idx) => (
                <div key={idx} className={`py-4 space-y-3 ${txn.status === 'DELETED' ? 'opacity-75 bg-rose-50/10 p-3 rounded-xl border border-rose-100' : ''}`}>
                  {/* Top row: Date & ID */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-mono ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 text-slate-400' : 'text-slate-400'}`}>{formatDate(txn.date)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailTransaction(txn)}
                        className={`font-mono font-bold px-2 py-0.5 rounded-md whitespace-nowrap cursor-pointer focus:outline-hidden ${txn.status === 'DELETED' ? 'text-slate-400 line-through bg-slate-100' : 'text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50/50 hover:bg-indigo-50'}`}
                      >
                        {txn.reference || txn.id}
                        {txn.receiptName && <span className="ml-1 text-rose-600 font-extrabold">#</span>}
                      </button>
                      {txn.status === 'DELETED' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold text-rose-700 bg-rose-100 border border-rose-200 rounded-md uppercase">
                          DELETED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle row: Paid To & Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`font-bold text-sm ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 text-slate-500' : 'text-slate-900'}`}>{txn.merchant}</h4>
                      <p className={`text-xs mt-1 leading-relaxed ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 text-slate-400' : 'text-slate-500'}`}>{txn.description}</p>
                      {txn.status === 'DELETED' && txn.deleteReason && (
                        <p className="text-[10px] text-rose-600 font-semibold italic mt-1">Reason: {txn.deleteReason}</p>
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className={`font-bold text-base ${txn.status === 'DELETED' ? 'line-through decoration-rose-500/80 text-slate-400' : 'text-rose-600'}`}>
                        {currencySymbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {txn.paymentType && (
                        <div className="mt-0.5">
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            txn.paymentType === 'ONLINE' 
                              ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {txn.paymentType === 'ONLINE' ? 'Online' : 'Cash'}
                          </span>
                        </div>
                      )}
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-600">
                          <span 
                            className="w-1 h-1 rounded-full" 
                            style={{ backgroundColor: categories.find(c => c.name === txn.category)?.color || '#6b7280' }}
                          ></span>
                          {txn.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setViewingQuickViewTxn(txn)}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all h-8 cursor-pointer"
                      title="Quick View Stages"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Stages
                    </button>

                    <button
                      type="button"
                      disabled={!isPrintableVoucher(txn)}
                      onClick={() => handlePrintSingleVoucher(txn)}
                      className={`inline-flex items-center gap-1.5 py-1.5 px-3 border rounded-lg text-[11px] font-bold transition-all h-8 ${
                        !isPrintableVoucher(txn)
                          ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-40 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 cursor-pointer'
                      }`}
                      title={!isPrintableVoucher(txn) ? "Print available only after marked Paid or Void" : "Print Voucher"}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>

                    {txn.status === 'DELETED' ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg">
                        Voided
                      </span>
                    ) : currentUser.role === 'ADMIN' && (
                      <>
                        <button
                          onClick={() => handleEditClick(txn)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer h-8"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => handleOpenDeleteModal(txn)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer h-8"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {renderPagination()}
      </div>

      {/* Form Dialog modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 md:items-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full my-auto md:my-0 max-h-none md:max-h-[calc(100vh-2rem)] overflow-y-auto flex flex-col"
            >
              {(forceTypeVal === 'IN' || formType === 'IN') ? (
                // Simplified Inward Modal to match the user's spreadsheet concept image
                <div>
                  {/* Custom Header with light green rounded icon */}
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-5 h-5 text-emerald-600 font-bold" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">
                          {editingTransaction ? 'Edit Deposit Cash' : 'Record Deposit Cash'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                          {editingTransaction ? 'Modify entry in the petty cash ledger' : 'Add new entry to the petty cash ledger'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={closeModal}
                      className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Form Body */}
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {formError && (
                      <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                        <div>{formError}</div>
                      </div>
                    )}

                    {/* Row 1: ID & Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="inward-ref" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Inward Voucher / Receipt ID
                        </label>
                        <input 
                          id="inward-ref"
                          type="text" 
                          value={formReference}
                          onChange={(e) => {
                            if (isVoucherEditable) setFormReference(e.target.value);
                          }}
                          readOnly={!isVoucherEditable}
                          placeholder="e.g. IW-001"
                          className={`w-full py-2.5 px-3.5 border rounded-xl text-xs transition-all font-mono font-bold ${
                            !isVoucherEditable
                              ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900'
                          }`}
                        />
                        {duplicateTxnWarning && (
                          <div className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 mt-2 flex items-start gap-2 shadow-xs">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span>Voucher No. "{formReference.trim()}" is ALREADY USED by deposit #{duplicateTxnWarning.reference}!</span>
                              <div className="text-[10px] font-medium text-rose-500 mt-0.5">Please enter a unique number to avoid duplicates.</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label htmlFor="inward-date" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Date
                        </label>
                        <input 
                          id="inward-date"
                          type="date" 
                          value={formDate}
                          max={todayStr}
                          onChange={(e) => setFormDate(e.target.value)}
                          required
                          className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all font-semibold text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Row 2: Amount ({currencySymbol}) & Type (Cash / Online) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="inward-amount" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Amount ({currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{currencySymbol}</span>
                          <input 
                            id="inward-amount"
                            type="number" 
                            step="0.01"
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                            placeholder="0.00"
                            required
                            className="w-full py-2.5 pl-8 pr-3.5 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all font-bold text-slate-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="inward-payment-type" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Type (Cash / Online)
                        </label>
                        <select 
                          id="inward-payment-type"
                          value={formPaymentType}
                          onChange={(e) => setFormPaymentType(e.target.value as 'CASH' | 'ONLINE')}
                          required
                          className="w-full py-2.5 px-3 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-600 transition-all cursor-pointer font-semibold"
                        >
                          <option value="CASH">Cash</option>
                          <option value="ONLINE">Online</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 3: Paid From / Source */}
                    <div className="relative">
                      <label htmlFor="inward-merchant" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Paid From / Source
                      </label>
                      <input 
                        id="inward-merchant"
                        type="text" 
                        value={formMerchant}
                        onChange={(e) => {
                          setFormMerchant(e.target.value);
                          setShowMerchantSuggestions(true);
                        }}
                        onFocus={() => setShowMerchantSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => setShowMerchantSuggestions(false), 200);
                        }}
                        placeholder="e.g. Corporate Treasury, Bank Withdrawal"
                        autoComplete="off"
                        className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700 font-medium"
                      />

                      {/* Recommendations Popup (shown after typing 2+ characters) */}
                      {showMerchantSuggestions && merchantSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs">
                          <div className="px-3 py-1.5 bg-slate-50/90 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-600 font-extrabold">
                              <Info className="w-3 h-3 text-emerald-500" />
                              Previous Sources
                            </span>
                          </div>
                          <div className="max-h-44 overflow-y-auto divide-y divide-slate-50">
                            {merchantSuggestions.map((suggestion, idx) => {
                              const isExact = suggestion.toLowerCase() === formMerchant.trim().toLowerCase();
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormMerchant(suggestion);
                                    setShowMerchantSuggestions(false);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50/70 hover:text-emerald-950 font-semibold text-slate-700 transition-colors flex items-center justify-between cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 group-hover:scale-125 transition-transform" />
                                    <span className="truncate">{suggestion}</span>
                                  </div>
                                  {isExact ? (
                                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md shrink-0">Exact Match</span>
                                  ) : (
                                    <span className="text-[9px] font-medium text-slate-400 group-hover:text-emerald-600 shrink-0">Use Name</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Row 4: Particulars / Purpose */}
                    <div>
                      <label htmlFor="inward-desc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Particulars / Purpose
                      </label>
                      <input 
                        id="inward-desc"
                        type="text"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="ATM withdraw, Initial Amount etc. (Optional)"
                        className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700"
                      />
                    </div>

                    {/* Row: Project Ref. No. (Optional) */}
                    <div>
                      <label htmlFor="inward-project-ref" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Project Ref. No. (Optional)
                      </label>
                      <input 
                        id="inward-project-ref"
                        type="text"
                        value={formProjectRefNo}
                        onChange={(e) => setFormProjectRefNo(e.target.value)}
                        placeholder="e.g. PRJ-2026-001 or Site Ref"
                        className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700 font-mono"
                      />
                    </div>

                    {/* Row 5: Remarks / Notes (Optional) */}
                    <div>
                      <label htmlFor="inward-remarks" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Remarks / Notes (Optional)
                      </label>
                      <input 
                        id="inward-remarks"
                        type="text"
                        value={formRemarks}
                        onChange={(e) => setFormRemarks(e.target.value)}
                        placeholder="Additional internal audit notes..."
                        className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700"
                      />
                    </div>

                    {/* Action buttons matching the Cancel / Confirm layout */}
                    <div className="pt-3 flex gap-3 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={closeModal}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs border border-slate-200 transition-all cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-emerald-950/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        {editingTransaction ? 'Update Entry' : 'Confirm Entry'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Standard Outward / Expense Modal (Pristine, matches the image)
                <div>
                  {/* Header */}
                  <div className="bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100/30 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-950 text-sm tracking-tight">
                          {editingTransaction ? 'Edit Expense Payment' : 'Record Expense Payment'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Add new entry to the petty cash ledger
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={closeModal}
                      className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Form Body */}
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    
                    {formError && (
                      <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                        <div>{formError}</div>
                      </div>
                    )}

                    {/* Row 1: Voucher No. & Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="form-ref" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Voucher No.
                        </label>
                        <input 
                          id="form-ref"
                          type="text" 
                          value={formReference}
                          onChange={(e) => {
                            if (isVoucherEditable) setFormReference(e.target.value);
                          }}
                          readOnly={!isVoucherEditable}
                          placeholder="e.g. 27"
                          required
                          className={`w-full py-2.5 px-3.5 border rounded-xl text-xs transition-all font-mono font-bold ${
                            !isVoucherEditable
                              ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-50/50 border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900'
                          }`}
                        />
                        {duplicateTxnWarning && (
                          <div className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 mt-2 flex items-start gap-2 shadow-xs">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span>Voucher No. "{formReference.trim()}" is ALREADY USED by voucher #{duplicateTxnWarning.reference}!</span>
                              <div className="text-[10px] font-medium text-rose-500 mt-0.5">Please enter a unique number to avoid duplicates.</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label htmlFor="form-date" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Date
                        </label>
                        <input 
                          id="form-date"
                          type="date" 
                          value={formDate}
                          max={todayStr}
                          onChange={(e) => setFormDate(e.target.value)}
                          required
                          className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Row 2: Amount ({currencySymbol}) & Request Type */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className={currentUser.role === 'AUDITOR' ? 'col-span-2' : ''}>
                        <label htmlFor="form-amount" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Amount ({currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{currencySymbol}</span>
                          <input 
                            id="form-amount"
                            type="number" 
                            step="0.01"
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                            placeholder="0.00"
                            required
                            className="w-full py-2.5 pl-8 pr-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all font-bold text-slate-800"
                          />
                        </div>
                      </div>
                      {currentUser.role !== 'AUDITOR' && (
                        <div>
                          <label htmlFor="form-payment-type" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Request Type
                          </label>
                          <select 
                            id="form-payment-type"
                            value={currentUser.role === 'ADMIN' ? formPaymentType : 'CASH'}
                            onChange={(e) => {
                              if (currentUser.role === 'ADMIN') {
                                setFormPaymentType(e.target.value as 'CASH' | 'ONLINE');
                              }
                            }}
                            disabled={currentUser.role !== 'ADMIN'}
                            required
                            className={`w-full py-2.5 px-3 border rounded-xl text-xs transition-all font-semibold ${
                              currentUser.role !== 'ADMIN'
                                ? 'bg-slate-100/80 border-slate-200 text-slate-700 font-bold cursor-not-allowed'
                                : 'bg-slate-50/50 border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden text-slate-600 cursor-pointer'
                            }`}
                          >
                            <option value="CASH">Cash</option>
                            {currentUser.role === 'ADMIN' && (
                              <option value="ONLINE">Online</option>
                            )}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Row 3: Expense Category & Paid To */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="form-category" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Expense Category
                        </label>
                        <select 
                          id="form-category"
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          required
                          className="w-full py-2.5 px-3 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-600 transition-all cursor-pointer font-semibold"
                        >
                          <option value="" disabled>Choose Category</option>
                          {formCategory && !expenseCategories.some(cat => cat.name === formCategory) && (
                            <option value={formCategory}>{formCategory}</option>
                          )}
                          {expenseCategories.map((cat, idx) => (
                            <option key={idx} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <label htmlFor="form-merchant" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Paid To
                        </label>
                        <input 
                          id="form-merchant"
                          type="text" 
                          value={formMerchant}
                          onChange={(e) => {
                            if (currentUser.role === 'ADMIN') {
                              setFormMerchant(e.target.value);
                              setShowMerchantSuggestions(true);
                            }
                          }}
                          onFocus={() => {
                            if (currentUser.role === 'ADMIN') setShowMerchantSuggestions(true);
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowMerchantSuggestions(false), 200);
                          }}
                          readOnly={currentUser.role !== 'ADMIN'}
                          placeholder="Name of payee"
                          required
                          autoComplete="off"
                          className={`w-full py-2.5 px-3.5 border rounded-xl text-xs transition-all font-semibold ${
                            currentUser.role !== 'ADMIN'
                              ? 'bg-slate-100/80 border-slate-200 cursor-not-allowed text-slate-700 font-bold'
                              : 'bg-slate-50/50 border-slate-200 focus:border-rose-500 focus:bg-white text-slate-700'
                          }`}
                        />

                        {/* Recommendations Popup (shown after typing 2+ characters) */}
                        {currentUser.role === 'ADMIN' && showMerchantSuggestions && merchantSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs">
                            <div className="px-3 py-1.5 bg-slate-50/90 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-slate-600 font-extrabold">
                                <Info className="w-3 h-3 text-rose-500" />
                                Previous Payees
                              </span>
                            </div>
                            <div className="max-h-44 overflow-y-auto divide-y divide-slate-50">
                              {merchantSuggestions.map((suggestion, idx) => {
                                const isExact = suggestion.toLowerCase() === formMerchant.trim().toLowerCase();
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setFormMerchant(suggestion);
                                      setShowMerchantSuggestions(false);
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50/70 hover:text-rose-950 font-semibold text-slate-700 transition-colors flex items-center justify-between cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 group-hover:scale-125 transition-transform" />
                                      <span className="truncate">{suggestion}</span>
                                    </div>
                                    {isExact ? (
                                      <span className="text-[9px] font-extrabold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md shrink-0">Exact Match</span>
                                    ) : (
                                      <span className="text-[9px] font-medium text-slate-400 group-hover:text-rose-600 shrink-0">Use Name</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 4: Particulars (Purpose) */}
                    <div>
                      <label htmlFor="form-desc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Particulars (Purpose)
                      </label>
                      <textarea 
                        id="form-desc"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Solar Advertisement Rent, Gland purchase, etc."
                        required
                        rows={2}
                        className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700"
                      ></textarea>
                    </div>

                    {/* Row: Project Ref. No. (Optional) */}
                    <div>
                      <label htmlFor="form-project-ref" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Project Ref. No. (Optional)
                      </label>
                      <input 
                        id="form-project-ref"
                        type="text"
                        value={formProjectRefNo}
                        onChange={(e) => setFormProjectRefNo(e.target.value)}
                        placeholder="e.g. PRJ-2026-001 or Site Ref"
                        className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700 font-mono"
                      />
                    </div>

                    {/* Row 5: Remarks / Audit Notes (Optional) */}
                    <div>
                      <label htmlFor="form-remarks" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Remarks / Audit Notes (Optional)
                      </label>
                      <input 
                        id="form-remarks"
                        type="text"
                        value={formRemarks}
                        onChange={(e) => setFormRemarks(e.target.value)}
                        placeholder="Provide any remarks or audit annotations..."
                        className="w-full py-2.5 px-3.5 bg-slate-50/50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all text-slate-700"
                      />
                    </div>

                    {/* Drag and Drop File Input Area (Optional Receipt Doc) */}
                    <div>
                      <label htmlFor="form-receipt-input" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Upload Receipt Doc (Optional)
                      </label>
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all ${dragActive ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200 bg-slate-50/30'}`}
                      >
                        <input 
                          id="form-receipt-input"
                          type="file" 
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {receiptFile ? (
                          <div className="space-y-1 relative z-10">
                            <FileText className="w-7 h-7 text-rose-600 mx-auto" />
                            <p className="text-[11px] font-bold text-slate-800 break-all">{receiptFile.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{receiptFile.size}</p>

                            {receiptFile.isUploading && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-medium border border-sky-200 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
                                Uploading to Cloud Storage...
                              </div>
                            )}

                            {receiptFile.cloudinaryUrl ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Uploaded to Cloud Storage
                              </div>
                            ) : (
                              !receiptFile.isUploading && receiptFile.dataUrl && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  Attachment Ready
                                </div>
                              )
                            )}

                            {receiptFile.uploadError && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                {receiptFile.uploadError} (Will retry on submit)
                              </div>
                            )}

                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  const urlToDelete = receiptFile?.cloudinaryUrl || (editingTransaction?.receiptUrl?.includes('cloudinary.com') ? editingTransaction.receiptUrl : null);
                                  const pidToDelete = (receiptFile as any)?.cloudinaryPublicId || undefined;
                                  if (urlToDelete && urlToDelete.includes('cloudinary.com')) {
                                    deleteFileFromCloudinary(urlToDelete, {
                                      cloudName: integrationSettings?.cloudinaryCloudName || localStorage.getItem('cloudinary_cloud_name') || '',
                                      apiKey: integrationSettings?.cloudinaryApiKey || localStorage.getItem('cloudinary_api_key') || '',
                                      apiSecret: integrationSettings?.cloudinaryApiSecret || localStorage.getItem('cloudinary_api_secret') || '',
                                      publicId: pidToDelete
                                    }).catch(err => console.warn('Cloudinary delete error on remove file click:', err));
                                  }
                                  setReceiptFile(null);
                                  const fileInput = document.getElementById('form-receipt-input') as HTMLInputElement | null;
                                  if (fileInput) fileInput.value = '';
                                }}
                                className="mt-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                              >
                                Remove file
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Paperclip className="w-7 h-7 text-slate-400 mx-auto" />
                            <p className="text-[11px] font-bold text-slate-600">Drag & drop receipt here, or <span className="text-slate-900 underline">browse</span></p>
                            <p className="text-[9px] text-slate-400">PNG, JPG, JPEG (&lt;150KB) or PDF (&lt;250KB) • Firebase Storage</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 flex gap-3 border-t border-slate-50">
                      <button 
                        type="button" 
                        onClick={closeModal}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs border border-slate-200 transition-all cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className={`flex-1 ${
                          (forceTypeVal || formType) === 'IN'
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/15'
                            : 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/15'
                        } text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
                      >
                        <Check className="w-4 h-4" />
                        {editingTransaction 
                          ? 'Save Changes' 
                          : ((forceTypeVal || formType) === 'IN' ? 'Record Deposit' : 'Record Payment')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {renderBatchPrintModal()}
        {renderDetailModals()}
        {renderDeleteModal()}
        {renderConfirmPopupModal()}
    </div>
  );
}
