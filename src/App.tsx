import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  LayoutDashboard, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  CheckCircle2,
  FileText, 
  Settings, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  IndianRupee
} from 'lucide-react';
import { User, Transaction, CategoryLimit, ActivityLog, TransactionStatus, UserRole, AppSettings, IntegrationSettings } from './types';
import { MOCK_USERS, MOCK_CATEGORIES, INITIAL_TRANSACTIONS, INITIAL_LOGS, DEFAULT_APP_SETTINGS, DEFAULT_INTEGRATION_SETTINGS } from './data';
import { db, collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc } from './firebase';
import { sendSmsNotification, sendEmailNotification } from './services/notificationService';
import { convertExternalUrlToDataUrl } from './services/fileAttachmentService';
import { sortTransactionsByIdDesc, isAssignedManagerForTxn } from './utils';


// Subcomponents
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import RegisterView from './components/RegisterView';
import ApprovalsView from './components/ApprovalsView';
import SettingsView from './components/SettingsView';
import AdminSettingsView from './components/AdminSettingsView';

type NavigationTab = 'DASHBOARD' | 'INWARD' | 'OUTWARD' | 'APPROVALS' | 'SETTINGS' | 'ADMIN_SETTINGS';

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getActiveTabClass = (tabId: NavigationTab) => {
  switch (tabId) {
    case 'DASHBOARD':
      return 'bg-sky-600 text-white shadow-md shadow-sky-950/20';
    case 'INWARD':
      return 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20';
    case 'OUTWARD':
      return 'bg-rose-600 text-white shadow-md shadow-rose-950/20';
    case 'APPROVALS':
      return 'bg-amber-600 text-white shadow-md shadow-amber-950/20';
    case 'SETTINGS':
      return 'bg-slate-600 text-white shadow-md shadow-slate-950/20';
    case 'ADMIN_SETTINGS':
      return 'bg-[#f7b944] text-slate-950 font-extrabold shadow-md shadow-amber-950/20';
    default:
      return 'bg-blue-600 text-white shadow-xs';
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('DASHBOARD');
  
  // App States
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>(DEFAULT_INTEGRATION_SETTINGS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryLimit[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Mobile navigation drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = 'Petty Cash Register | Ommax Electric Private Limited';
  }, []);

  // Synchronize with Firebase Firestore
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const initializeAndSync = async () => {
      try {
        const isSeededLocally = localStorage.getItem('petty_cash_db_seeded');
        const initDocRef = doc(db, 'sys_meta', 'init');

        if (!isSeededLocally) {
          const initSnap = await getDoc(initDocRef);

          if (!initSnap.exists()) {
            // First time database setup - seed initial data once
            await setDoc(initDocRef, { initializedAt: new Date().toISOString() });
            localStorage.setItem('petty_cash_db_seeded', 'true');

            for (const txn of INITIAL_TRANSACTIONS) {
              await setDoc(doc(db, 'transactions', txn.id), txn);
            }
            for (const cat of MOCK_CATEGORIES) {
              await setDoc(doc(db, 'categories', String(cat.id)), cat);
            }
            for (const u of MOCK_USERS) {
              await setDoc(doc(db, 'users', u.id || u.username), u);
            }
            for (const lg of INITIAL_LOGS) {
              await setDoc(doc(db, 'logs', lg.id), lg);
            }
            await setDoc(doc(db, 'app_settings', 'config'), DEFAULT_APP_SETTINGS);
            await setDoc(doc(db, 'app_settings', 'integrations'), DEFAULT_INTEGRATION_SETTINGS);
          } else {
            localStorage.setItem('petty_cash_db_seeded', 'true');
          }
        }

        // Ensure integrations document exists in Firestore
        const integrationsDocRef = doc(db, 'app_settings', 'integrations');
        const integrationsSnap = await getDoc(integrationsDocRef);
        if (!integrationsSnap.exists()) {
          await setDoc(integrationsDocRef, DEFAULT_INTEGRATION_SETTINGS);
        }
      } catch (err) {
        console.warn('Initial seeding check:', err);
        localStorage.setItem('petty_cash_db_seeded', 'true');
      }

      try {
        // 1. Transactions Sync
        const unsubTxns = onSnapshot(collection(db, 'transactions'), (snapshot) => {
          setIsFirebaseConnected(true);
          if (snapshot.empty) {
            setTransactions([]);
          } else {
            const list: Transaction[] = [];
            const seenIds = new Set<string>();

            snapshot.forEach((d) => {
              const data = d.data() as Transaction;
              const primaryId = data.id || d.id;

              // Clean up orphan ghost candidate docs created by former candidate setDoc calls
              if (d.id !== primaryId && primaryId.startsWith('TXN-')) {
                deleteDoc(doc(db, 'transactions', d.id)).catch(() => {});
                return;
              }

              if (seenIds.has(primaryId)) {
                if (d.id !== primaryId) {
                  deleteDoc(doc(db, 'transactions', d.id)).catch(() => {});
                }
                return;
              }

              seenIds.add(primaryId);
              list.push({
                ...data,
                id: primaryId
              });
            });
            setTransactions(sortTransactionsByIdDesc(list));
          }
        }, (err) => console.warn('Firestore transactions sync notice:', err));

        // 2. Categories Sync
        const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
          if (snapshot.empty) {
            setCategories([]);
          } else {
            const list: CategoryLimit[] = [];
            snapshot.forEach((d) => list.push(d.data() as CategoryLimit));
            setCategories(list);
          }
        }, (err) => console.warn('Firestore categories sync notice:', err));

        // 3. Users Sync
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          if (snapshot.empty) {
            setUsers([]);
          } else {
            const list: User[] = [];
            snapshot.forEach((d) => list.push(d.data() as User));
            setUsers(list);
          }
        }, (err) => console.warn('Firestore users sync notice:', err));

        // 4. Logs Sync
        const unsubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
          if (snapshot.empty) {
            setLogs([]);
          } else {
            const list: ActivityLog[] = [];
            snapshot.forEach((d) => list.push(d.data() as ActivityLog));
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setLogs(list);
          }
        }, (err) => console.warn('Firestore logs sync notice:', err));

        // 5. Settings Sync
        const unsubSettings = onSnapshot(collection(db, 'app_settings'), (snapshot) => {
          if (snapshot.empty) {
            setAppSettings(DEFAULT_APP_SETTINGS);
            setIntegrationSettings(DEFAULT_INTEGRATION_SETTINGS);
          } else {
            snapshot.forEach((d) => {
              if (d.id === 'config') {
                setAppSettings(d.data() as AppSettings);
              } else if (d.id === 'integrations') {
                const fetched = d.data() as IntegrationSettings;
                const merged: IntegrationSettings = {
                  ...DEFAULT_INTEGRATION_SETTINGS,
                  ...fetched,
                  msTenantId: fetched.msTenantId ?? DEFAULT_INTEGRATION_SETTINGS.msTenantId,
                  msClientId: fetched.msClientId ?? DEFAULT_INTEGRATION_SETTINGS.msClientId,
                  msClientSecret: fetched.msClientSecret ?? DEFAULT_INTEGRATION_SETTINGS.msClientSecret,
                  msSenderEmail: fetched.msSenderEmail ?? DEFAULT_INTEGRATION_SETTINGS.msSenderEmail,
                  msSenderName: fetched.msSenderName ?? DEFAULT_INTEGRATION_SETTINGS.msSenderName,
                  emailRecipients: fetched.emailRecipients ?? DEFAULT_INTEGRATION_SETTINGS.emailRecipients,
                };
                setIntegrationSettings(merged);
                // Also mirror to localStorage for offline cache
                if (merged.smsEnabled !== undefined) localStorage.setItem('petty_cash_sms_enabled', String(merged.smsEnabled));
                if (merged.smsGatewayUrl) localStorage.setItem('petty_cash_sms_url', merged.smsGatewayUrl);
                if (merged.smsUsername) localStorage.setItem('petty_cash_sms_username', merged.smsUsername);
                if (merged.smsPassword) localStorage.setItem('petty_cash_sms_password', merged.smsPassword);
                if (merged.smsRecipients) localStorage.setItem('petty_cash_sms_recipients', merged.smsRecipients);
                if (merged.smsTemplateNew) localStorage.setItem('petty_cash_sms_template_new', merged.smsTemplateNew);
                if (merged.smsTemplateEdit) localStorage.setItem('petty_cash_sms_template_edit', merged.smsTemplateEdit);
                if (merged.smsTemplateInward) localStorage.setItem('petty_cash_sms_template_inward', merged.smsTemplateInward);

                if (merged.emailEnabled !== undefined) localStorage.setItem('petty_cash_email_enabled', String(merged.emailEnabled));
                if (merged.msTenantId !== undefined) localStorage.setItem('ms_graph_tenant_id', merged.msTenantId);
                if (merged.msClientId !== undefined) localStorage.setItem('ms_graph_client_id', merged.msClientId);
                if (merged.msClientSecret !== undefined) localStorage.setItem('ms_graph_client_secret', merged.msClientSecret);
                if (merged.msSenderEmail) localStorage.setItem('ms_graph_sender_email', merged.msSenderEmail);
                if (merged.msSenderName) localStorage.setItem('ms_graph_sender_name', merged.msSenderName);
                if (merged.emailRecipients) localStorage.setItem('petty_cash_email_recipients', merged.emailRecipients);
                if (merged.emailSubjectNew) localStorage.setItem('petty_cash_email_subject_new', merged.emailSubjectNew);
                if (merged.emailBodyNew) localStorage.setItem('petty_cash_email_body_new', merged.emailBodyNew);
                if (merged.emailSubjectEdit) localStorage.setItem('petty_cash_email_subject_edit', merged.emailSubjectEdit);
                if (merged.emailBodyEdit) localStorage.setItem('petty_cash_email_body_edit', merged.emailBodyEdit);
                if (merged.emailSubjectInward) localStorage.setItem('petty_cash_email_subject_inward', merged.emailSubjectInward);
                if (merged.emailBodyInward) localStorage.setItem('petty_cash_email_body_inward', merged.emailBodyInward);
                if (merged.emailSubjectRequestSubmitted) localStorage.setItem('petty_cash_email_subject_req_submitted', merged.emailSubjectRequestSubmitted);
                if (merged.emailBodyRequestSubmitted) localStorage.setItem('petty_cash_email_body_req_submitted', merged.emailBodyRequestSubmitted);
                if (merged.emailSubjectRequestApproved) localStorage.setItem('petty_cash_email_subject_req_approved', merged.emailSubjectRequestApproved);
                if (merged.emailBodyRequestApproved) localStorage.setItem('petty_cash_email_body_req_approved', merged.emailBodyRequestApproved);
                if (merged.emailSubjectRequestPaid) localStorage.setItem('petty_cash_email_subject_req_paid', merged.emailSubjectRequestPaid);
                if (merged.emailBodyRequestPaid) localStorage.setItem('petty_cash_email_body_req_paid', merged.emailBodyRequestPaid);
                if (merged.emailSubjectRequestRejected) localStorage.setItem('petty_cash_email_subject_req_rejected', merged.emailSubjectRequestRejected);
                if (merged.emailBodyRequestRejected) localStorage.setItem('petty_cash_email_body_req_rejected', merged.emailBodyRequestRejected);
              }
            });
          }
        }, (err) => console.warn('Firestore settings sync notice:', err));

        unsubs = [unsubTxns, unsubCats, unsubUsers, unsubLogs, unsubSettings];
      } catch (err) {
        console.error('Firebase sync setup error:', err);
      }
    };

    initializeAndSync();

    return () => {
      unsubs.forEach(unsub => unsub && unsub());
    };
  }, []);

  // Auto-migrate legacy Cloudinary/external attachment URLs to native Firestore Data URLs in the background
  useEffect(() => {
    if (transactions.length === 0) return;
    const legacyTxns = transactions.filter(t => t.receiptUrl && t.receiptUrl.startsWith('http'));
    if (legacyTxns.length === 0) return;

    let cancelled = false;
    const runAutoMigration = async () => {
      for (const txn of legacyTxns) {
        if (cancelled) break;
        try {
          const dataUrl = await convertExternalUrlToDataUrl(txn.receiptUrl!);
          if (dataUrl && !cancelled) {
            await updateDoc(doc(db, 'transactions', txn.id), { receiptUrl: dataUrl });
            setTransactions(prev => prev.map(t => t.id === txn.id ? { ...t, receiptUrl: dataUrl } : t));
          }
        } catch (e) {
          console.warn('Background attachment migration notice:', e);
        }
      }
    };

    const timer = setTimeout(() => {
      runAutoMigration();
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [transactions.length]);




  // Fetch user public IP address for accurate audit log tracking
  const [userIpAddress, setUserIpAddress] = useState<string>(() => {
    return localStorage.getItem('ommax_user_ip') || 'Detecting...';
  });
  const userIpRef = useRef<string>(userIpAddress);

  useEffect(() => {
    userIpRef.current = userIpAddress;
  }, [userIpAddress]);

  useEffect(() => {
    let isMounted = true;
    const fetchPublicIp = async () => {
      // List of reliable public IP endpoints
      const endpoints = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json',
        'https://api.db-ip.com/v2/free/self',
        'https://ipinfo.io/json'
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            const ip = data.ip || data.ipAddress;
            if (ip && isMounted) {
              setUserIpAddress(ip);
              userIpRef.current = ip;
              localStorage.setItem('ommax_user_ip', ip);
              return;
            }
          }
        } catch (e) {
          // Try next provider
        }
      }

      if (isMounted && userIpRef.current === 'Detecting...') {
        // If external IP lookup is blocked by ad-blocker or network sandbox, use client fallback tag
        setUserIpAddress('127.0.0.1');
        userIpRef.current = '127.0.0.1';
      }
    };

    fetchPublicIp();

    return () => {
      isMounted = false;
    };
  }, []);

  const getEffectiveIp = () => {
    if (userIpRef.current && userIpRef.current !== 'Detecting...') {
      return userIpRef.current;
    }
    const cached = localStorage.getItem('ommax_user_ip');
    if (cached) return cached;
    return '127.0.0.1';
  };

  // Helper for adding Audit Log to Firestore
  const addLog = (action: string, details: string) => {
    if (!currentUser) return;
    const logId = `LOG-0${Date.now().toString().slice(-5)}`;
    const effectiveIp = getEffectiveIp();
    const newLog: ActivityLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      user: currentUser.fullName,
      role: currentUser.role,
      action,
      details,
      ipAddress: effectiveIp
    };
    setLogs(prev => [newLog, ...prev]);
    setDoc(doc(db, 'logs', logId), newLog).catch(e => console.warn('Log save error:', e));
  };

  // Handler: Secure Login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    
    // Add Login Audit log
    const logId = `LOG-0${Date.now().toString().slice(-5)}`;
    const effectiveIp = getEffectiveIp();
    const newLog: ActivityLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      role: user.role,
      action: 'LOGIN_SUCCESS',
      details: 'Successfully authenticated into financial register node',
      ipAddress: effectiveIp
    };
    setLogs(prev => [newLog, ...prev]);
    setDoc(doc(db, 'logs', logId), newLog).catch(e => console.warn(e));
    setActiveTab('DASHBOARD');
  };

  // Handler: Secure Logout
  const handleLogout = () => {
    if (currentUser) {
      const logId = `LOG-0${Date.now().toString().slice(-5)}`;
      const effectiveIp = getEffectiveIp();
      const newLog: ActivityLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        user: currentUser.fullName,
        role: currentUser.role,
        action: 'LOGOUT',
        details: 'Terminated session and flushed security tokens',
        ipAddress: effectiveIp
      };
      setLogs(prev => [newLog, ...prev]);
      setDoc(doc(db, 'logs', logId), newLog).catch(e => console.warn(e));
    }
    setCurrentUser(null);
    setIsMobileMenuOpen(false);
  };

  // Handler: Record new Transaction Voucher
  const handleAddTransaction = (newTxnData: Omit<Transaction, 'id' | 'recordedBy'>) => {
    if (!currentUser || currentUser.role === 'AUDITOR') return;

    const newTxnId = `TXN-2026-${Date.now().toString().slice(-4)}`;
    const newTxn: Transaction = {
      ...newTxnData,
      id: newTxnId,
      recordedBy: currentUser.fullName
    };

    const updatedTxnsList = [newTxn, ...transactions];
    setTransactions(updatedTxnsList);
    setDoc(doc(db, 'transactions', newTxnId), newTxn).catch(e => console.warn(e));

    if (newTxn.status === 'PENDING') {
      addLog('TXN_REQUEST', `User "${currentUser.fullName}" requested petty cash voucher ${newTxn.reference} of ${appSettings.currencySymbol}${newTxn.amount.toFixed(2)} for ${newTxn.merchant} (${newTxn.category})`);
    } else {
      addLog('TXN_CREATE', `Logged cash voucher reference ${newTxn.reference} of ${appSettings.currencySymbol}${newTxn.amount.toFixed(2)} under ${newTxn.category} (Merchant: ${newTxn.merchant})`);
    }

    // Dispatch automated SMS & Email alerts
    const smsType = newTxn.type === 'IN' ? 'INWARD' : 'NEW';
    const emailType = newTxn.type === 'IN' ? 'INWARD' : (newTxn.status === 'PENDING' ? 'REQUEST_SUBMITTED' : 'NEW');
    sendSmsNotification(smsType, newTxn, currentUser, updatedTxnsList, appSettings, [], integrationSettings);
    sendEmailNotification(emailType, newTxn, currentUser, updatedTxnsList, appSettings, [], integrationSettings, users);
  };

  // Handler: Update transaction (for edits)
  const handleUpdateTransaction = (updatedTxn: Transaction) => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    let finalTxn = updatedTxn;
    const target = transactions.find(t => 
      t.id === updatedTxn.id || 
      (updatedTxn.reference && t.reference === updatedTxn.reference)
    );
    if (!target) return;

    // Ensure we maintain the primary document ID
    const primaryId = target.id;
    finalTxn = { ...updatedTxn, id: primaryId };

    const changes: { field: string; oldValue: string; newValue: string }[] = [];
    const fieldsToCompare: (keyof Transaction)[] = [
      'date', 'amount', 'category', 'merchant', 'reference', 'description', 'remarks', 'paymentType', 'receiptName', 'receiptUrl'
    ];

    fieldsToCompare.forEach(field => {
      const oldVal = target[field];
      const newVal = updatedTxn[field];

      const normOld = (oldVal === null || oldVal === undefined) ? '' : String(oldVal).trim();
      const normNew = (newVal === null || newVal === undefined) ? '' : String(newVal).trim();

      if (field === 'amount') {
        if (Number(oldVal || 0) === Number(newVal || 0)) return;
      } else if (field === 'paymentType') {
        const effOld = normOld || 'CASH';
        const effNew = normNew || 'CASH';
        if (effOld === effNew) return;
      } else {
        if (normOld === normNew) return;
      }

      let oldValStr = normOld;
      let newValStr = normNew;

      if (field === 'amount') {
        oldValStr = `${appSettings.currencySymbol}${Number(oldVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        newValStr = `${appSettings.currencySymbol}${Number(newVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (field === 'paymentType') {
        oldValStr = normOld || 'CASH';
        newValStr = normNew || 'CASH';
      } else {
        if (!oldValStr) oldValStr = '(Blank)';
        if (!newValStr) newValStr = '(Blank)';
      }

      if (oldValStr === newValStr) return;

      let fieldLabel = String(field);
      if (field === 'merchant') {
        fieldLabel = updatedTxn.type === 'IN' ? 'Paid From' : 'Paid To';
      } else if (field === 'reference') {
        fieldLabel = 'Voucher ID';
      } else if (field === 'description') {
        fieldLabel = 'Particulars';
      } else if (field === 'paymentType') {
        fieldLabel = 'Payment Mode';
      } else if (field === 'receiptName') {
        fieldLabel = 'Attachment';
      } else if (field === 'remarks') {
        fieldLabel = 'Remarks';
      } else if (field === 'date') {
        fieldLabel = 'Date';
      } else if (field === 'category') {
        fieldLabel = 'Category';
      } else if (field === 'amount') {
        fieldLabel = 'Amount';
      } else {
        fieldLabel = fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1);
      }

      changes.push({
        field: fieldLabel,
        oldValue: oldValStr,
        newValue: newValStr
      });
    });

    if (changes.length > 0) {
      const editHistory = target.editHistory ? [...target.editHistory] : [];
      const newHistoryEntry = {
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        editedBy: currentUser.fullName,
        changes
      };
      editHistory.push(newHistoryEntry);
      finalTxn = {
        ...updatedTxn,
        editHistory
      };
    } else {
      finalTxn = {
        ...updatedTxn
      };
      if (target.editHistory) {
        finalTxn.editHistory = target.editHistory;
      }
    }

    const updatedTxnsList = transactions.map(t => t.id === updatedTxn.id ? finalTxn : t);
    setTransactions(updatedTxnsList);
    
    // Save strictly to primary Firestore document ID (never create duplicate candidate docs)
    setDoc(doc(db, 'transactions', updatedTxn.id), finalTxn).catch(e => console.warn(e));

    // Delete orphan candidate docs if reference changed
    if (target.reference && target.reference !== updatedTxn.id && target.reference !== updatedTxn.reference) {
      deleteDoc(doc(db, 'transactions', target.reference)).catch(() => {});
    }

    addLog('TXN_UPDATE', `Modified transaction reference ${updatedTxn.reference} (${updatedTxn.type === 'IN' ? 'Deposit' : 'Disbursement'})`);

    // Dispatch automated SMS & Email alerts with dynamic changed fields
    if (changes.length > 0) {
      const changedFieldLabels = changes.map(c => c.field);
      const isDeposit = finalTxn.type === 'IN';
      const notificationType = isDeposit ? 'INWARD_EDIT' : 'EDIT';
      sendSmsNotification(notificationType, finalTxn, currentUser, updatedTxnsList, appSettings, changedFieldLabels, integrationSettings);
      sendEmailNotification(notificationType, finalTxn, currentUser, updatedTxnsList, appSettings, changedFieldLabels, integrationSettings, users);
    }
  };

  // Handler: Delete/Void transaction with reason
  const handleDeleteTransaction = (id: string, reason?: string, permanent: boolean = false) => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    
    const normSearchId = id.trim().toLowerCase().replace(/\d+/g, (m) => String(parseInt(m, 10)));
    const targetTxn = transactions.find(t => 
      t.id === id || 
      t.reference === id ||
      (t.reference && normSearchId && t.reference.trim().toLowerCase().replace(/\d+/g, (m) => String(parseInt(m, 10))) === normSearchId)
    );
    if (!targetTxn) return;

    if (permanent) {
      setTransactions(prev => prev.filter(t => t.id !== targetTxn.id && t.reference !== targetTxn.reference));
      deleteDoc(doc(db, 'transactions', targetTxn.id)).catch(e => console.warn(e));
      if (targetTxn.reference && targetTxn.reference !== targetTxn.id) {
        deleteDoc(doc(db, 'transactions', targetTxn.reference)).catch(() => {});
      }
      const numRef = targetTxn.reference ? targetTxn.reference.replace(/\D/g, '') : '';
      if (numRef) {
        const candidates = [numRef, `OW-${numRef}`, `OW-${numRef.padStart(3, '0')}`, `IW-${numRef}`, `IW-${numRef.padStart(3, '0')}`];
        candidates.forEach(cand => {
          if (cand !== targetTxn.id) {
            deleteDoc(doc(db, 'transactions', cand)).catch(() => {});
          }
        });
      }
      addLog('TXN_DELETE', `Permanently deleted voucher ${targetTxn.reference || targetTxn.id} (${appSettings.currencySymbol}${targetTxn.amount.toFixed(2)})`);
      return;
    }

    const deletionReasonStr = reason?.trim() || 'Transaction cancelled / voided by user';

    const updatedTxn: Transaction = {
      ...targetTxn,
      status: 'DELETED',
      deletedBy: currentUser.fullName,
      deletedAt: new Date().toISOString(),
      deleteReason: deletionReasonStr
    };

    setTransactions(prev => prev.map(t => (t.id === targetTxn.id || (targetTxn.reference && t.reference === targetTxn.reference)) ? {
      ...t,
      status: 'DELETED',
      deletedBy: currentUser.fullName,
      deletedAt: updatedTxn.deletedAt,
      deleteReason: deletionReasonStr
    } : t));

    setDoc(doc(db, 'transactions', targetTxn.id), updatedTxn).catch(e => console.warn(e));

    // Also clean up any orphan ghost candidate docs if they were ever created in Firestore
    if (targetTxn.reference && targetTxn.reference !== targetTxn.id) {
      deleteDoc(doc(db, 'transactions', targetTxn.reference)).catch(() => {});
    }
    const numRef = targetTxn.reference ? targetTxn.reference.replace(/\D/g, '') : '';
    if (numRef) {
      const candidates = [numRef, `OW-${numRef}`, `OW-${numRef.padStart(3, '0')}`, `IW-${numRef}`, `IW-${numRef.padStart(3, '0')}`];
      candidates.forEach(cand => {
        if (cand !== targetTxn.id) {
          deleteDoc(doc(db, 'transactions', cand)).catch(() => {});
        }
      });
    }

    addLog('TXN_DELETE', `Deleted/Voided voucher ${targetTxn.reference || targetTxn.id} (${appSettings.currencySymbol}${targetTxn.amount.toFixed(2)}). Reason: ${deletionReasonStr}`);
  };

  const isRoleTitleName = (name: string | undefined | null): boolean => {
    if (!name) return true;
    const s = name.trim().toLowerCase();
    const genericTerms = [
      'administrator', 'admin', 'manager', 'custodian', 'auditor', 'user',
      'administrator / manager', 'manager / admin', 'custodian / admin',
      'admin user', 'manager user', 'custodian user', 'auditor user', 'role'
    ];
    return genericTerms.some(term => s === term || s === term + 's');
  };

  const resolveRealPersonName = (name: string | undefined | null, roleCategory: 'ADMIN' | 'MANAGER' | 'CUSTODIAN'): string => {
    if (name && !isRoleTitleName(name)) return name;
    if (currentUser?.fullName && !isRoleTitleName(currentUser.fullName)) return currentUser.fullName;
    if (roleCategory === 'ADMIN') {
      const found = users.find(u => u.role === 'ADMIN');
      if (found?.fullName) return found.fullName;
    } else if (roleCategory === 'MANAGER') {
      const found = users.find(u => u.role === 'MANAGER');
      if (found?.fullName) return found.fullName;
    }
    if (roleCategory === 'ADMIN') return 'Administrator';
    if (roleCategory === 'CUSTODIAN') return 'David Vance';
    return 'Mohan';
  };

  // Workflow Handler: Manager / Admin Approval
  const handleApproveRequest = (id: string, approverName: string) => {
    if (!currentUser) return;
    const targetTxn = transactions.find(t => t.id === id);
    if (!targetTxn) return;

    const realApprover = resolveRealPersonName(approverName, currentUser.role === 'ADMIN' ? 'ADMIN' : 'MANAGER');
    const now = new Date().toISOString();
    const updatedTxn: Transaction = {
      ...targetTxn,
      status: 'APPROVED',
      approvedAt: now,
      approverName: realApprover,
      approvedBy: realApprover
    };

    setTransactions(prev => prev.map(t => t.id === id ? updatedTxn : t));
    setDoc(doc(db, 'transactions', id), updatedTxn).catch(e => console.warn(e));

    addLog('TXN_APPROVE', `Approved petty cash request ${updatedTxn.reference} of ${appSettings.currencySymbol}${updatedTxn.amount.toFixed(2)} for ${updatedTxn.merchant}`);

    sendEmailNotification('REQUEST_APPROVED', updatedTxn, currentUser, transactions, appSettings, undefined, integrationSettings, users);
  };

  // Workflow Handler: Admin / Custodian Issue Cash & Mark Paid
  const handlePayRequest = (id: string, paidBy: string) => {
    if (!currentUser) return;
    const targetTxn = transactions.find(t => t.id === id);
    if (!targetTxn) return;

    const realPayer = resolveRealPersonName(paidBy, currentUser.role === 'CUSTODIAN' ? 'CUSTODIAN' : 'ADMIN');
    const now = new Date().toISOString();
    const updatedTxn: Transaction = {
      ...targetTxn,
      status: 'PAID',
      paidAt: now,
      paidBy: realPayer
    };

    // Deduct from Category limit / add to spent
    const updatedCats = categories.map(cat => {
      if (cat.name === targetTxn.category) {
        const newSpent = cat.spent + targetTxn.amount;
        updateDoc(doc(db, 'categories', String(cat.id)), { spent: newSpent }).catch(e => console.warn(e));
        return { ...cat, spent: newSpent };
      }
      return cat;
    });
    setCategories(updatedCats);

    setTransactions(prev => prev.map(t => t.id === id ? updatedTxn : t));
    setDoc(doc(db, 'transactions', id), updatedTxn).catch(e => console.warn(e));

    addLog('TXN_PAY', `Issued cash payment for voucher ${updatedTxn.reference} of ${appSettings.currencySymbol}${updatedTxn.amount.toFixed(2)} to ${updatedTxn.merchant}`);

    sendEmailNotification('REQUEST_PAID', updatedTxn, currentUser, transactions, appSettings, undefined, integrationSettings, users);
  };

  // Workflow Handler: Rejection
  const handleRejectRequest = (id: string, reason: string, rejectedBy: string) => {
    if (!currentUser) return;
    const targetTxn = transactions.find(t => t.id === id);
    if (!targetTxn) return;

    const realRejecter = resolveRealPersonName(rejectedBy, currentUser.role === 'ADMIN' ? 'ADMIN' : 'MANAGER');
    const now = new Date().toISOString();
    const updatedTxn: Transaction = {
      ...targetTxn,
      status: 'REJECTED',
      rejectedAt: now,
      rejectedBy: realRejecter,
      rejectionReason: reason
    };

    setTransactions(prev => prev.map(t => t.id === id ? updatedTxn : t));
    setDoc(doc(db, 'transactions', id), updatedTxn).catch(e => console.warn(e));

    addLog('TXN_REJECT', `Rejected petty cash request ${updatedTxn.reference} of ${appSettings.currencySymbol}${updatedTxn.amount.toFixed(2)}: ${reason}`);

    sendEmailNotification('REQUEST_REJECTED', updatedTxn, currentUser, transactions, appSettings, undefined, integrationSettings, users);
  };

  // General Status Update Handler
  const handleUpdateStatus = (id: string, status: TransactionStatus) => {
    if (status === 'APPROVED') {
      handleApproveRequest(id, currentUser?.fullName || '');
    } else if (status === 'PAID') {
      handlePayRequest(id, currentUser?.fullName || '');
    } else if (status === 'REJECTED') {
      handleRejectRequest(id, 'Status updated by admin', currentUser?.fullName || '');
    } else {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      updateDoc(doc(db, 'transactions', id), { status }).catch(e => console.warn(e));
    }
  };

  // Admin Handler: App Settings
  const handleUpdateAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    setDoc(doc(db, 'app_settings', 'config'), newSettings).catch(e => console.warn(e));
    addLog('APP_SETTINGS_UPDATE', `Updated App Settings (Currency: ${newSettings.currencySymbol}, Format: ${newSettings.dateFormat}, Timezone: ${newSettings.timezone})`);
  };

  // Admin Handler: Integration Settings (SMS & Email Templates / APIs)
  const handleUpdateIntegrationSettings = (newSettings: IntegrationSettings) => {
    setIntegrationSettings(newSettings);

    // Save to local storage for local cache
    localStorage.setItem('petty_cash_sms_enabled', String(newSettings.smsEnabled));
    localStorage.setItem('petty_cash_sms_url', newSettings.smsGatewayUrl);
    localStorage.setItem('petty_cash_sms_username', newSettings.smsUsername);
    localStorage.setItem('petty_cash_sms_password', newSettings.smsPassword);
    localStorage.setItem('petty_cash_sms_recipients', newSettings.smsRecipients);
    localStorage.setItem('petty_cash_sms_template_new', newSettings.smsTemplateNew);
    localStorage.setItem('petty_cash_sms_template_edit', newSettings.smsTemplateEdit);
    localStorage.setItem('petty_cash_sms_template_inward', newSettings.smsTemplateInward);
    if (newSettings.smsTemplateInwardEdit) {
      localStorage.setItem('petty_cash_sms_template_inward_edit', newSettings.smsTemplateInwardEdit);
    }

    localStorage.setItem('petty_cash_email_enabled', String(newSettings.emailEnabled));
    localStorage.setItem('ms_graph_tenant_id', newSettings.msTenantId);
    localStorage.setItem('ms_graph_client_id', newSettings.msClientId);
    localStorage.setItem('ms_graph_client_secret', newSettings.msClientSecret);
    localStorage.setItem('ms_graph_sender_email', newSettings.msSenderEmail);
    localStorage.setItem('ms_graph_sender_name', newSettings.msSenderName);
    localStorage.setItem('petty_cash_email_recipients', newSettings.emailRecipients);
    localStorage.setItem('petty_cash_email_subject_new', newSettings.emailSubjectNew);
    localStorage.setItem('petty_cash_email_body_new', newSettings.emailBodyNew);
    localStorage.setItem('petty_cash_email_subject_edit', newSettings.emailSubjectEdit);
    localStorage.setItem('petty_cash_email_body_edit', newSettings.emailBodyEdit);
    localStorage.setItem('petty_cash_email_subject_inward', newSettings.emailSubjectInward);
    localStorage.setItem('petty_cash_email_body_inward', newSettings.emailBodyInward);
    if (newSettings.emailSubjectInwardEdit) {
      localStorage.setItem('petty_cash_email_subject_inward_edit', newSettings.emailSubjectInwardEdit);
    }
    if (newSettings.emailBodyInwardEdit) {
      localStorage.setItem('petty_cash_email_body_inward_edit', newSettings.emailBodyInwardEdit);
    }

    // Persist to Firestore for multi-domain, multi-session synchronization
    setDoc(doc(db, 'app_settings', 'integrations'), newSettings).catch(e => console.warn(e));
    addLog('INTEGRATION_SETTINGS_UPDATE', 'Updated SMS & Email Templates / API Settings');
  };

  // Admin Handler: User Management
  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    setDoc(doc(db, 'users', newUser.id || newUser.username), newUser).catch(e => console.warn(e));
    addLog('USER_CREATE', `Created new user account "${newUser.fullName}" (Emp ID: ${newUser.username}, Role: ${newUser.role})`);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.username.toLowerCase() === updatedUser.username.toLowerCase() ? updatedUser : u));
    setDoc(doc(db, 'users', updatedUser.id || updatedUser.username), updatedUser).catch(e => console.warn(e));
    if (currentUser && currentUser.username.toLowerCase() === updatedUser.username.toLowerCase()) {
      setCurrentUser(updatedUser);
    }
    addLog('USER_UPDATE', `Updated user credentials for "${updatedUser.fullName}" (Role: ${updatedUser.role})`);
  };

  const handleDeleteUser = (username: string) => {
    const target = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    setUsers(prev => prev.filter(u => u.username.toLowerCase() !== username.toLowerCase()));
    if (target) {
      deleteDoc(doc(db, 'users', target.id || target.username)).catch(e => console.warn(e));
    }
    addLog('USER_DELETE', `Deleted user account "${username}"`);
  };

  // Admin Handler: Category Management
  const handleAddCategory = (cat: CategoryLimit) => {
    setCategories(prev => [...prev, cat]);
    setDoc(doc(db, 'categories', String(cat.id)), cat).catch(e => console.warn(e));
    addLog('CATEGORY_CREATE', `Added category "${cat.name}" (${cat.type || 'OUT'}, Budget: ${appSettings.currencySymbol}${cat.budget})`);
  };

  const handleUpdateCategory = (cat: CategoryLimit) => {
    setCategories(prev => prev.map(c => (c.id && c.id === cat.id) || c.name === cat.name ? cat : c));
    setDoc(doc(db, 'categories', String(cat.id)), cat).catch(e => console.warn(e));
    addLog('CATEGORY_UPDATE', `Updated category details for "${cat.name}"`);
  };

  const handleDeleteCategory = (catName: string) => {
    const target = categories.find(c => c.name === catName);
    setCategories(prev => prev.filter(c => c.name !== catName));
    if (target) {
      deleteDoc(doc(db, 'categories', String(target.id))).catch(e => console.warn(e));
    }
    addLog('CATEGORY_DELETE', `Deleted category "${catName}"`);
  };

  // Admin Handler: System Backup, Restore, Wipe
  const handleBackupData = () => {
    const backupObj = {
      exportDate: new Date().toISOString(),
      appSettings,
      users,
      categories,
      transactions,
      logs
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ommax-petty-cash-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog('SYSTEM_BACKUP', 'Exported complete system JSON backup package');
  };

  const handleRestoreData = async (jsonContent: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed && (parsed.transactions || parsed.users || parsed.appSettings)) {
        localStorage.setItem('petty_cash_db_seeded', 'true');
        // Ensure initialization marker exists
        await setDoc(doc(db, 'sys_meta', 'init'), { initializedAt: new Date().toISOString() });

        // Clear existing transactions first so old items don't linger
        const currentTxnSnap = await getDocs(collection(db, 'transactions'));
        await Promise.all(currentTxnSnap.docs.map(d => deleteDoc(doc(db, 'transactions', d.id))));

        if (parsed.appSettings) {
          setAppSettings(parsed.appSettings);
          await setDoc(doc(db, 'app_settings', 'config'), parsed.appSettings);
        }
        if (Array.isArray(parsed.users) && parsed.users.length > 0) {
          setUsers(parsed.users);
          for (const u of parsed.users) {
            await setDoc(doc(db, 'users', u.id || u.username), u);
          }
        }
        if (Array.isArray(parsed.categories)) {
          setCategories(parsed.categories);
          for (const c of parsed.categories) {
            await setDoc(doc(db, 'categories', String(c.id)), c);
          }
        }
        if (Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
          for (const t of parsed.transactions) {
            await setDoc(doc(db, 'transactions', t.id), t);
          }
        }
        if (Array.isArray(parsed.logs)) {
          setLogs(parsed.logs);
          for (const l of parsed.logs) {
            await setDoc(doc(db, 'logs', l.id), l);
          }
        }

        addLog('SYSTEM_RESTORE', 'Restored system database and configurations from JSON backup');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Restore data error:', e);
      return false;
    }
  };

  const handleWipeAllData = async () => {
    try {
      localStorage.setItem('petty_cash_db_seeded', 'true');
      // Ensure sys_meta/init is set so initial mock seeding never re-triggers
      await setDoc(doc(db, 'sys_meta', 'init'), { 
        initializedAt: new Date().toISOString(),
        wipedAt: new Date().toISOString()
      });

      // Clear all transaction documents from Firestore
      const snap = await getDocs(collection(db, 'transactions'));
      const deletions = snap.docs.map(d => deleteDoc(doc(db, 'transactions', d.id)));
      await Promise.all(deletions);

      // Reset spent totals on categories
      const updatedCategories = categories.map(cat => ({ ...cat, spent: 0 }));
      setCategories(updatedCategories);
      for (const cat of updatedCategories) {
        if (cat.id) {
          updateDoc(doc(db, 'categories', String(cat.id)), { spent: 0 }).catch(e => console.warn(e));
        }
      }

      // Force state wipe locally
      setTransactions([]);
      addLog('SYSTEM_WIPE', 'Wiped all financial register vouchers and reset balances');
    } catch (e) {
      console.error('Wipe data error:', e);
      setTransactions([]);
    }
  };

  // Calculate Pending Approvals Count for Badging
  const pendingApprovalsCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return transactions.filter(t => {
      if (t.type !== 'OUT') return false;
      if (t.status !== 'PENDING') return false;
      return isAssignedManagerForTxn(t, currentUser, users);
    }).length;
  }, [transactions, currentUser, users]);

  // Dynamic Navigation Tabs per Role
  const roleTabs = React.useMemo(() => {
    if (!currentUser) return [];

    const isUserAdmin = currentUser.role === 'ADMIN';
    const isUserCustodian = currentUser.role === 'CUSTODIAN';

    const tabs: { id: NavigationTab; label: string; icon: any; badge?: number }[] = [
      { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard }
    ];

    // Inward is only shown for Admin & Custodian (Requirement #4)
    if (isUserAdmin || isUserCustodian) {
      tabs.push({ id: 'INWARD', label: 'Inward', icon: ArrowDownCircle });
    }

    // Outward is shown for all users
    tabs.push({ id: 'OUTWARD', label: 'Outward', icon: ArrowUpCircle });

    // Approvals tab for Managers, Admins, Custodians or users with subordinates
    const isManagerOrAdmin = isUserAdmin || isUserCustodian || currentUser.isManager || users.some(u => u.reportingTo?.toLowerCase() === currentUser.username.toLowerCase() || u.reportingTo?.toLowerCase() === currentUser.fullName.toLowerCase());

    if (isManagerOrAdmin) {
      tabs.push({ 
        id: 'APPROVALS', 
        label: 'Approvals', 
        icon: CheckCircle2,
        badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
      });
    }

    // Settings
    tabs.push({ id: 'SETTINGS', label: 'Settings', icon: Settings });

    // Admin Settings
    if (isUserAdmin) {
      tabs.push({ id: 'ADMIN_SETTINGS', label: 'Admin Settings', icon: ShieldAlert });
    }

    return tabs;
  }, [currentUser, users, pendingApprovalsCount]);

  // Guard: Redirect to secure login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLogin} usersList={users} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          {/* Main Logo Header Banner */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#f7b944] text-[#112231] shrink-0 font-bold shadow-sm">
              <IndianRupee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-none text-white tracking-tight">Petty Cash Register</h2>
              <span className="text-[10px] text-[#f7b944] font-bold tracking-wide block mt-1">Ommax Electric Private Limited</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {roleTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${activeTab === tab.id ? getActiveTabClass(tab.id) : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'}`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Current Operator Profile & Terminate Session action combined */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#f7b944]/20 border border-[#f7b944]/40 shrink-0 flex items-center justify-center font-bold text-xs text-[#f7b944]">
              {getInitials(currentUser.fullName)}
            </div>
            <div className="truncate">
              <p className="font-bold text-xs text-slate-100 truncate leading-tight">{currentUser.fullName}</p>
              <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {currentUser.role.charAt(0) + currentUser.role.slice(1).toLowerCase()}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:text-red-100 hover:bg-red-950/30 font-bold text-xs transition-all cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="md:hidden flex flex-col h-screen w-full overflow-hidden">
        <header className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f7b944] text-[#112231] shrink-0 font-bold shadow-sm">
              <IndianRupee className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xs font-bold leading-none text-slate-100">Petty Cash Register</h2>
              <span className="text-[9px] text-[#f7b944] font-bold tracking-wide block mt-0.5">Ommax Electric Private Limited</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-400 hover:text-white transition-all cursor-pointer relative"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {pendingApprovalsCount > 0 && !isMobileMenuOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            )}
          </button>
        </header>

        {/* MOBILE SLIDE-OVER LEFT DRAWER & BACKDROP */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 md:hidden"
              />

              {/* Slide-over Left Drawer Panel */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 z-50 md:hidden flex flex-col justify-between shadow-2xl"
              >
                <div>
                  {/* Drawer Header */}
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f7b944] text-[#112231] shrink-0 font-bold shadow-sm">
                        <IndianRupee className="w-4.5 h-4.5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h2 className="text-xs font-bold leading-none text-slate-100">Petty Cash Register</h2>
                        <span className="text-[9px] text-[#f7b944] font-bold tracking-wide block mt-0.5">Ommax Electric Private Limited</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Drawer Navigation Links */}
                  <nav className="p-4 space-y-1.5">
                    {roleTabs.map((tab) => {
                      const IconComponent = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs font-bold transition-all text-left ${activeTab === tab.id ? getActiveTabClass(tab.id) : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'}`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-4.5 h-4.5 shrink-0" />
                            <span>{tab.label}</span>
                          </div>
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Drawer Footer - User Profile & Logout */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/30 space-y-3.5">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-[#f7b944]/20 border border-[#f7b944]/40 shrink-0 flex items-center justify-center font-bold text-xs text-[#f7b944]">
                      {getInitials(currentUser.fullName)}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-xs text-slate-100 truncate leading-tight">{currentUser.fullName}</p>
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {currentUser.role.charAt(0) + currentUser.role.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-red-400 hover:text-red-100 hover:bg-red-950/30 font-bold text-xs transition-all text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Terminate Session
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* MOBILE VIEW SCROLLING PORT */}
        <div className="flex-1 overflow-y-auto p-4 pb-12 sm:pb-16 md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'DASHBOARD' && (
                <DashboardView 
                  transactions={transactions} 
                  categories={categories} 
                  currentUser={currentUser}
                  onNavigateToRegister={() => setActiveTab('OUTWARD')}
                  appSettings={appSettings}
                />
              )}
              {activeTab === 'INWARD' && (
                <RegisterView 
                  transactions={transactions} 
                  categories={categories} 
                  currentUser={currentUser}
                  onAddTransaction={handleAddTransaction}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  forceType="IN"
                  appSettings={appSettings}
                  integrationSettings={integrationSettings}
                />
              )}
              {activeTab === 'OUTWARD' && (
                <RegisterView 
                  transactions={transactions} 
                  categories={categories} 
                  currentUser={currentUser}
                  onAddTransaction={handleAddTransaction}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  forceType="OUT"
                  appSettings={appSettings}
                  integrationSettings={integrationSettings}
                />
              )}
              {activeTab === 'APPROVALS' && (
                <ApprovalsView 
                  transactions={transactions}
                  categories={categories}
                  currentUser={currentUser}
                  users={users}
                  onApproveRequest={handleApproveRequest}
                  onPayRequest={handlePayRequest}
                  onRejectRequest={handleRejectRequest}
                  appSettings={appSettings}
                />
              )}
              {activeTab === 'SETTINGS' && (
                <SettingsView currentUser={currentUser} onUpdateUser={handleUpdateUser} />
              )}
              {activeTab === 'ADMIN_SETTINGS' && (
                <AdminSettingsView 
                  currentUser={currentUser}
                  appSettings={appSettings}
                  onUpdateAppSettings={handleUpdateAppSettings}
                  integrationSettings={integrationSettings}
                  onUpdateIntegrationSettings={handleUpdateIntegrationSettings}
                  users={users}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  categories={categories}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  logs={logs}
                  transactions={transactions}
                  onUpdateTransaction={handleUpdateTransaction}
                  onBackupData={handleBackupData}
                  onRestoreData={handleRestoreData}
                  onWipeAllData={handleWipeAllData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 2. MAIN SYSTEM CONSOLE - DESKTOP VIEW */}
      <main className="hidden md:flex flex-1 flex-col overflow-hidden min-w-0">
        
        {/* Main Header Toolbar */}
        <header className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shadow-xs shrink-0">
          <div>
            <div className="flex items-center gap-2">
              {activeTab === 'DASHBOARD' && <LayoutDashboard className="w-5 h-5 text-sky-600" />}
              {activeTab === 'INWARD' && <ArrowDownCircle className="w-5 h-5 text-emerald-600" />}
              {activeTab === 'OUTWARD' && <ArrowUpCircle className="w-5 h-5 text-rose-600" />}
              {activeTab === 'APPROVALS' && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
              {activeTab === 'SETTINGS' && <Settings className="w-5 h-5 text-slate-600" />}
              {activeTab === 'ADMIN_SETTINGS' && <ShieldAlert className="w-5 h-5 text-[#f7b944]" />}
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                {activeTab === 'DASHBOARD' && 'Financial Overview'}
                {activeTab === 'INWARD' && 'Inward Cash Registry'}
                {activeTab === 'OUTWARD' && 'Outward Expenses Registry'}
                {activeTab === 'APPROVALS' && 'Petty Cash Approvals Console'}
                {activeTab === 'SETTINGS' && 'User Settings & Security'}
                {activeTab === 'ADMIN_SETTINGS' && 'Administrator Control Node'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {activeTab === 'DASHBOARD' && 'Overview of inflows, record disbursements, and monitor petty cash balances.'}
              {activeTab === 'INWARD' && 'Log and record of deposits.'}
              {activeTab === 'OUTWARD' && 'Record cash disbursements and track voucher disbursements.'}
              {activeTab === 'APPROVALS' && 'Authorize pending petty cash requests and issue disbursements.'}
              {activeTab === 'SETTINGS' && 'Manage password credentials, workspace preferences'}
              {activeTab === 'ADMIN_SETTINGS' && 'Configure app settings, user credentials, system audit timeline, and data operations.'}
            </p>
          </div>
        </header>

        {/* Scrolling Viewport Area */}
        <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-slate-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full"
            >
              {activeTab === 'DASHBOARD' && (
                <DashboardView 
                  transactions={transactions} 
                  categories={categories} 
                  currentUser={currentUser}
                  onNavigateToRegister={() => setActiveTab('OUTWARD')}
                  appSettings={appSettings}
                />
              )}
              {activeTab === 'INWARD' && (
                <RegisterView 
                  transactions={transactions} 
                  categories={categories} 
                  currentUser={currentUser}
                  onAddTransaction={handleAddTransaction}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  forceType="IN"
                  appSettings={appSettings}
                  integrationSettings={integrationSettings}
                />
              )}
              {activeTab === 'OUTWARD' && (
                <RegisterView 
                  transactions={transactions} 
                  categories={categories} 
                  currentUser={currentUser}
                  onAddTransaction={handleAddTransaction}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  forceType="OUT"
                  appSettings={appSettings}
                  integrationSettings={integrationSettings}
                />
              )}
              {activeTab === 'APPROVALS' && (
                <ApprovalsView 
                  transactions={transactions}
                  categories={categories}
                  currentUser={currentUser}
                  users={users}
                  onApproveRequest={handleApproveRequest}
                  onPayRequest={handlePayRequest}
                  onRejectRequest={handleRejectRequest}
                  appSettings={appSettings}
                />
              )}
              {activeTab === 'SETTINGS' && (
                <SettingsView currentUser={currentUser} onUpdateUser={handleUpdateUser} />
              )}
              {activeTab === 'ADMIN_SETTINGS' && (
                <AdminSettingsView 
                  currentUser={currentUser}
                  appSettings={appSettings}
                  onUpdateAppSettings={handleUpdateAppSettings}
                  integrationSettings={integrationSettings}
                  onUpdateIntegrationSettings={handleUpdateIntegrationSettings}
                  users={users}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  categories={categories}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  logs={logs}
                  transactions={transactions}
                  onUpdateTransaction={handleUpdateTransaction}
                  onBackupData={handleBackupData}
                  onRestoreData={handleRestoreData}
                  onWipeAllData={handleWipeAllData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

    </div>
  );
}
