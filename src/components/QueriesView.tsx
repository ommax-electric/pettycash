import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, MessageSquareQuote, CheckCircle2, AlertCircle, Clock,
  Search, Filter, Send, Paperclip, X, ChevronRight, ChevronLeft, ArrowLeft,
  User as UserIcon, Shield, Check, Lock, ExternalLink, RefreshCw,
  FileText, IndianRupee, Eye, CheckCircle, HelpCircle, Tag,
  ChevronDown
} from 'lucide-react';
import { ExpenseQuery, QueryMessage, Transaction, User as UserType, AppSettings, formatDateToDMY, formatISTDateTime } from '../types';
import { openAttachmentInNewTab, isAssignedManagerForTxn, isMatchUserIdentifier } from '../utils';

interface QueriesViewProps {
  queries: ExpenseQuery[];
  transactions: Transaction[];
  currentUser: UserType;
  users: UserType[];
  appSettings: AppSettings;
  selectedQueryId?: string | null;
  onSelectQuery?: (queryId: string | null) => void;
  onSendMessage: (queryId: string, message: string, attachments?: { name: string; url: string; size?: string }[]) => void;
  onCloseQuery: (queryId: string, reason?: string) => void;
  onNavigateToVoucher?: (txnId: string) => void;
}

export default function QueriesView({
  queries = [],
  transactions = [],
  currentUser,
  users = [],
  appSettings,
  selectedQueryId: initialSelectedQueryId,
  onSelectQuery,
  onSendMessage,
  onCloseQuery,
  onNavigateToVoucher
}: QueriesViewProps) {
  const currencySymbol = appSettings?.currencySymbol || '₹';

  // Section Tab: default is 'OPEN'
  const [activeSection, setActiveSection] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedPayees, setSelectedPayees] = useState<string[]>([]);
  const [isPayeeDropdownOpen, setIsPayeeDropdownOpen] = useState(false);
  const payeeDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination state: strictly 5 queries per page
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Query ID: strictly null by default; only populated when a query card is clicked
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedQueryId || null);

  useEffect(() => {
    if (initialSelectedQueryId) {
      const q = queries.find(item => item.id === initialSelectedQueryId);
      if (q) {
        setActiveSection(q.status);
        setSelectedId(q.id);
      }
    }
  }, [initialSelectedQueryId, queries]);

  // Unique Payee List from Queries & associated Transactions
  const payeeOptions = useMemo(() => {
    const set = new Set<string>();
    queries.forEach(q => {
      if (q.requestedBy && q.requestedBy.trim()) {
        set.add(q.requestedBy.trim());
      }
      const associated = transactions.find(t => t.id === q.transactionId || (q.voucherNo && t.reference === q.voucherNo));
      if (associated?.merchant && associated.merchant.trim()) {
        set.add(associated.merchant.trim());
      }
      if (associated?.requestedBy && associated.requestedBy.trim()) {
        set.add(associated.requestedBy.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [queries, transactions]);

  // Handle outside click for multi-select payee dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (payeeDropdownRef.current && !payeeDropdownRef.current.contains(e.target as Node)) {
        setIsPayeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Message compose state
  const [replyText, setReplyText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string; size?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close query modal state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeReasonInput, setCloseReasonInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external selectedQueryId
  useEffect(() => {
    if (initialSelectedQueryId) {
      setSelectedId(initialSelectedQueryId);
      const q = queries.find(item => item.id === initialSelectedQueryId);
      if (q) {
        setActiveSection(q.status);
      }
    }
  }, [initialSelectedQueryId, queries]);

  // Determine user permissions
  const isManagerOrAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || (currentUser as any).isManager;

  // Filter queries according to user role, section, date range, and payees
  const filteredQueries = useMemo(() => {
    return queries.filter(q => {
      // Status filter
      if (q.status !== activeSection) return false;

      // Access control:
      // Admins see all queries
      // Managers see queries assigned to them or where they raised it
      // Users see queries on their submitted claims
      if (currentUser.role !== 'ADMIN') {
        const isUserClaimant = isMatchUserIdentifier(q.requestedBy, currentUser.fullName) ||
          isMatchUserIdentifier(q.requestedBy, currentUser.username) ||
          isMatchUserIdentifier(q.requestedBy, currentUser.email) ||
          isMatchUserIdentifier(q.requestedBy, currentUser.empId);

        const isUserManager = isMatchUserIdentifier(q.managerName, currentUser.fullName) ||
          isMatchUserIdentifier(q.managerName, currentUser.username) ||
          isMatchUserIdentifier(q.managerName, currentUser.email) ||
          isMatchUserIdentifier(q.managerName, currentUser.empId);

        if (!isUserClaimant && !isUserManager) {
          return false;
        }
      }

      // Date Range Filter (From Date - To Date)
      if (fromDate || toDate) {
        let qDate = '';
        if (q.createdAt) {
          if (q.createdAt.includes('T')) qDate = q.createdAt.split('T')[0];
          else if (/^\d{4}-\d{2}-\d{2}$/.test(q.createdAt)) qDate = q.createdAt;
          else {
            const d = new Date(q.createdAt);
            if (!isNaN(d.getTime())) qDate = d.toISOString().slice(0, 10);
          }
        }
        if (!qDate) {
          const associated = transactions.find(t => t.id === q.transactionId || t.reference === q.voucherNo);
          if (associated?.date) {
            if (associated.date.includes('T')) qDate = associated.date.split('T')[0];
            else if (/^\d{4}-\d{2}-\d{2}$/.test(associated.date)) qDate = associated.date;
          }
        }
        if (fromDate && qDate && qDate < fromDate) return false;
        if (toDate && qDate && qDate > toDate) return false;
      }

      // Multi-Select Payee Filter
      if (selectedPayees.length > 0) {
        const associated = transactions.find(t => t.id === q.transactionId || (q.voucherNo && t.reference === q.voucherNo));
        const matchesAny = selectedPayees.some(p => {
          const pLower = p.trim().toLowerCase();
          return (q.requestedBy && q.requestedBy.trim().toLowerCase() === pLower) ||
            isMatchUserIdentifier(q.requestedBy, p) ||
            (associated?.merchant && associated.merchant.trim().toLowerCase() === pLower) ||
            (associated?.requestedBy && associated.requestedBy.trim().toLowerCase() === pLower);
        });
        if (!matchesAny) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [queries, activeSection, currentUser, fromDate, toDate, selectedPayees, transactions]);

  // Pagination calculations: strictly 5 queries per page
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredQueries.length / ITEMS_PER_PAGE));
  const paginatedQueries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQueries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQueries, currentPage]);

  // Reset page to 1 when filters, payee, or section tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSection, fromDate, toDate, selectedPayees]);

  // Selected Query Object - only resolved if user has actively selected one from the active list
  const selectedQuery = useMemo(() => {
    if (!selectedId) return null;
    return filteredQueries.find(q => q.id === selectedId) || null;
  }, [filteredQueries, selectedId]);

  // Associated Transaction Object
  const associatedTxn = useMemo(() => {
    if (!selectedQuery) return null;
    return transactions.find(t => t.id === selectedQuery.transactionId || t.reference === selectedQuery.voucherNo) || null;
  }, [transactions, selectedQuery]);

  // Count stats
  const openCount = useMemo(() => {
    return queries.filter(q => {
      if (q.status !== 'OPEN') return false;
      if (currentUser.role === 'ADMIN') return true;
      const isUserClaimant = isMatchUserIdentifier(q.requestedBy, currentUser.fullName) ||
        isMatchUserIdentifier(q.requestedBy, currentUser.username) ||
        isMatchUserIdentifier(q.requestedBy, currentUser.email);
      const isUserManager = isMatchUserIdentifier(q.managerName, currentUser.fullName) ||
        isMatchUserIdentifier(q.managerName, currentUser.username) ||
        isMatchUserIdentifier(q.managerName, currentUser.email);
      return isUserClaimant || isUserManager;
    }).length;
  }, [queries, currentUser]);

  const closedCount = useMemo(() => {
    return queries.filter(q => {
      if (q.status !== 'CLOSED') return false;
      if (currentUser.role === 'ADMIN') return true;
      const isUserClaimant = isMatchUserIdentifier(q.requestedBy, currentUser.fullName) ||
        isMatchUserIdentifier(q.requestedBy, currentUser.username) ||
        isMatchUserIdentifier(q.requestedBy, currentUser.email);
      const isUserManager = isMatchUserIdentifier(q.managerName, currentUser.fullName) ||
        isMatchUserIdentifier(q.managerName, currentUser.username) ||
        isMatchUserIdentifier(q.managerName, currentUser.email);
      return isUserClaimant || isUserManager;
    }).length;
  }, [queries, currentUser]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedQuery?.messages]);

  // Handle file selection for attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const sizeKB = (file.size / 1024).toFixed(1) + ' KB';
      setAttachedFiles(prev => [...prev, { name: file.name, url: dataUrl, size: sizeKB }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Sending a message
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyText.trim() && attachedFiles.length === 0) || !selectedQuery) return;

    setIsSubmitting(true);
    try {
      onSendMessage(selectedQuery.id, replyText.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
      setReplyText('');
      setAttachedFiles([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current user can close this query:
  // ONLY the managing approver can close. If admin submitted the expense and manager raised the query, admin CANNOT close.
  const canCloseSelectedQuery = useMemo(() => {
    if (!selectedQuery || selectedQuery.status === 'CLOSED') return false;

    // Check if current user is the claimant/submitter of this expense
    const isClaimant = isMatchUserIdentifier(selectedQuery.requestedBy, currentUser.fullName) ||
      isMatchUserIdentifier(selectedQuery.requestedBy, currentUser.username) ||
      isMatchUserIdentifier(selectedQuery.requestedBy, currentUser.email) ||
      isMatchUserIdentifier(selectedQuery.requestedBy, currentUser.empId);

    if (isClaimant) {
      return false; // Submitter/claimant cannot close query (even if they are an admin)
    }

    // Check if current user is the manager assigned/raised for this query
    const isManagerOfQuery = isMatchUserIdentifier(selectedQuery.managerName, currentUser.fullName) ||
      isMatchUserIdentifier(selectedQuery.managerName, currentUser.username) ||
      isMatchUserIdentifier(selectedQuery.managerName, currentUser.email);

    if (isManagerOfQuery) {
      return true;
    }

    // If current user is Admin (and NOT the claimant)
    if (currentUser.role === 'ADMIN') {
      return true;
    }

    return currentUser.role === 'MANAGER' || (currentUser as any).isManager;
  }, [selectedQuery, currentUser]);

  const handleConfirmClose = () => {
    if (!selectedQuery) return;
    onCloseQuery(selectedQuery.id, closeReasonInput.trim() || 'Resolved by Manager');
    setIsCloseModalOpen(false);
    setCloseReasonInput('');
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (onSelectQuery) onSelectQuery(id);
  };

  const togglePayeeSelection = (payee: string) => {
    setSelectedPayees(prev =>
      prev.includes(payee) ? prev.filter(p => p !== payee) : [...prev, payee]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Expense Clarification & Queries
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Direct clarification thread between approvers and expense claimants
            </p>
          </div>
        </div>

        {/* Section Pill Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveSection('OPEN');
              setSelectedId(null);
              if (onSelectQuery) onSelectQuery(null as any);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'OPEN'
                ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Open Queries</span>
            {openCount > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                activeSection === 'OPEN'
                  ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {openCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('CLOSED');
              setSelectedId(null);
              if (onSelectQuery) onSelectQuery(null as any);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'CLOSED'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Closed Queries</span>
            {closedCount > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                activeSection === 'CLOSED'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {closedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Queries List (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Filter: Calendar (From - To) & Payee */}
          <div className="space-y-1.5 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-violet-500 font-medium"
                title="From Date"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-violet-500 font-medium"
                title="To Date"
              />
            </div>
            <div className="flex items-center gap-1.5 relative" ref={payeeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsPayeeDropdownOpen(prev => !prev)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-violet-500 font-medium flex items-center justify-between gap-1 text-left cursor-pointer"
              >
                <span className="truncate">
                  {selectedPayees.length === 0
                    ? 'All Payees'
                    : selectedPayees.length === 1
                    ? selectedPayees[0]
                    : `${selectedPayees.length} Payees selected`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isPayeeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Multi-Select Dropdown Menu */}
              {isPayeeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
                  {payeeOptions.length === 0 ? (
                    <div className="px-2 py-1.5 text-[11px] text-slate-400 text-center">
                      No payees found
                    </div>
                  ) : (
                    payeeOptions.map((p) => {
                      const isChecked = selectedPayees.includes(p);
                      return (
                        <label
                          key={p}
                          onClick={() => togglePayeeSelection(p)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs text-slate-700 dark:text-slate-200 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-700"
                          />
                          <span className="truncate font-medium">{p}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {(fromDate || toDate || selectedPayees.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setSelectedPayees([]);
                  }}
                  title="Reset Filters"
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Queries List */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredQueries.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  {activeSection === 'OPEN' ? <Clock className="w-5 h-5 text-violet-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {activeSection === 'OPEN' ? 'No Open Queries' : 'No Closed Queries'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {fromDate || toDate || selectedPayees.length > 0
                    ? 'No queries match the selected filters.'
                    : activeSection === 'OPEN'
                    ? 'All claims are clear without pending clarification.'
                    : 'No resolved queries in history.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {paginatedQueries.map((q) => {
                    const isSelected = selectedQuery?.id === q.id;
                    const lastMsg = q.messages && q.messages.length > 0 ? q.messages[q.messages.length - 1] : null;

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleSelect(q.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-400 dark:border-violet-600 shadow-sm ring-1 ring-violet-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Left Accent Bar */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                          q.status === 'OPEN' ? 'bg-violet-600' : 'bg-emerald-500'
                        }`} />

                        <div className="pl-1 space-y-2">
                          {/* Top Row: Voucher ID & Amount */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-slate-100">
                              {q.voucherNo}
                            </span>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {currencySymbol}{q.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* Particulars / Category */}
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                              {q.particulars}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span>By <strong className="text-slate-700 dark:text-slate-300">{q.requestedBy}</strong></span>
                              <span>•</span>
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                {q.category}
                              </span>
                            </div>
                          </div>

                          {/* Latest Message Snippet */}
                          {lastMsg && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-2">
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                                <strong className="not-italic font-semibold text-slate-700 dark:text-slate-300">{lastMsg.senderName}:</strong> {lastMsg.message}
                              </p>
                              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                {q.messages.length} msg
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination Controls Bar (5 per page) */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs mt-2 shadow-2xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Page {currentPage} of {totalPages} <span className="text-slate-400 font-normal">({filteredQueries.length} total)</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Previous 5 Queries"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 rounded-md border border-violet-200 dark:border-violet-800">
                        {currentPage}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Next 5 Queries"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Conversation Thread View (8 cols on lg) */}
        <div className="lg:col-span-8">
          {!selectedQuery ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                {filteredQueries.length === 0 ? (
                  activeSection === 'OPEN' ? <Clock className="w-6 h-6 text-violet-500" /> : <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <MessageSquareQuote className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {filteredQueries.length === 0
                  ? activeSection === 'OPEN'
                    ? 'No Open Queries'
                    : 'No Closed Queries'
                  : 'Click on a query to view the thread'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {filteredQueries.length === 0
                  ? activeSection === 'OPEN'
                    ? 'There are currently no open queries pending clarification.'
                    : 'There are currently no resolved queries in history.'
                  : 'Select any query from the list on the left to view the conversation thread.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col min-h-[580px] max-h-[calc(100vh-200px)]">
              {/* Thread Header Banner */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                        {selectedQuery.voucherNo}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                        selectedQuery.status === 'OPEN'
                          ? 'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      }`}>
                        {selectedQuery.status === 'OPEN' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        <span>{selectedQuery.status === 'OPEN' ? 'QUERY OPEN' : 'QUERY RESOLVED'}</span>
                      </span>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 px-2 py-0.5 rounded-md">
                        {currencySymbol}{selectedQuery.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {selectedQuery.particulars}
                    </h2>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                      <span>Applicant: <strong className="text-slate-700 dark:text-slate-300">{selectedQuery.requestedBy}</strong></span>
                      <span>•</span>
                      <span>Manager: <strong className="text-slate-700 dark:text-slate-300">{selectedQuery.managerName}</strong></span>
                      <span>•</span>
                      <span>Category: <strong className="text-slate-700 dark:text-slate-300">{selectedQuery.category}</strong></span>
                    </div>
                  </div>

                  {/* Header Actions: Close Query / View Voucher */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {associatedTxn?.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => openAttachmentInNewTab(associatedTxn.receiptUrl || '', associatedTxn.receiptName || 'Receipt')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="View Original Attached Receipt"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span>Receipt</span>
                      </button>
                    )}

                    {canCloseSelectedQuery && (
                      <button
                        type="button"
                        onClick={() => setIsCloseModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Close Query</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Closed Query Info Banner */}
                {selectedQuery.status === 'CLOSED' && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Query closed by <strong>{selectedQuery.closedBy || 'Manager'}</strong>
                        {selectedQuery.closedAt && ` on ${formatISTDateTime(selectedQuery.closedAt)}`}
                        {selectedQuery.closeReason && ` — "${selectedQuery.closeReason}"`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Thread Timeline */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/20 dark:bg-slate-900/20">
                {selectedQuery.messages.map((msg, idx) => {
                  const isManagerMsg = msg.senderRole === 'MANAGER' || msg.senderRole === 'ADMIN';
                  const isCurrentUserMsg = isMatchUserIdentifier(msg.senderName, currentUser.fullName) ||
                    isMatchUserIdentifier(msg.senderName, currentUser.username) ||
                    (currentUser.email && msg.senderEmail && msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase());

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isCurrentUserMsg ? 'items-end' : 'items-start'} space-y-1.5`}
                    >
                      {/* Sender Name & Timestamp */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {msg.senderName}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                          isManagerMsg
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {msg.senderRole}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          {formatISTDateTime(msg.timestamp)}
                        </span>
                      </div>

                      {/* Message Bubble */}
                      <div className={`p-4 rounded-2xl max-w-xl text-xs leading-relaxed space-y-2.5 shadow-2xs ${
                        isCurrentUserMsg
                          ? 'bg-violet-600 text-white rounded-tr-xs'
                          : isManagerMsg
                            ? 'bg-white dark:bg-slate-800 border border-purple-200/60 dark:border-purple-900/40 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-white/20 dark:border-slate-700/60">
                            {msg.attachments.map((att, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => openAttachmentInNewTab(att.url, att.name)}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer w-full text-left ${
                                  isCurrentUserMsg
                                    ? 'bg-white/10 hover:bg-white/20 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate flex-1">{att.name}</span>
                                {att.size && <span className="text-[10px] opacity-70 shrink-0">{att.size}</span>}
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box Footer */}
              {selectedQuery.status === 'OPEN' ? (
                <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  {/* Attached Files Previews */}
                  {attachedFiles.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pb-1">
                      {attachedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[150px]">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(i)}
                            className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Attach Bill / Clarification Document"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <div className="flex-1 relative">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(e);
                          }
                        }}
                        placeholder="Write your response or clarification here... (Enter to send)"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || (!replyText.trim() && attachedFiles.length === 0)}
                      className="p-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0"
                      title="Send Reply"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    This query thread has been closed.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Close Query Modal */}
      <AnimatePresence>
        {isCloseModalOpen && selectedQuery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Close Query Thread</h3>
                    <p className="text-xs text-slate-500">Mark clarification as resolved</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <p>
                  Closing query for voucher <strong>{selectedQuery.voucherNo}</strong> ({selectedQuery.particulars}).
                </p>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Resolution / Closure Remarks (Optional):</label>
                  <textarea
                    rows={3}
                    value={closeReasonInput}
                    onChange={(e) => setCloseReasonInput(e.target.value)}
                    placeholder="e.g. Receipt verified, clarification acceptable."
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClose}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Close Query</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
