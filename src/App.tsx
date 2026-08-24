import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Network,
  Sliders,
  Users as UsersIcon,
  Share2,
  History,
  Database,
  ChevronDown,
  IndianRupee,
  Briefcase,
  Users2,
  Target,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { User, Transaction, CategoryLimit, ActivityLog, TransactionStatus, UserRole, AppSettings, IntegrationSettings, WorkflowHistoryEntry } from './types';
import { CRMAccount, CRMContact, CRMOpportunity, CRMSettings, CRMTab, DEFAULT_CRM_SETTINGS, INITIAL_CRM_ACCOUNTS, INITIAL_CRM_CONTACTS, INITIAL_CRM_OPPORTUNITIES } from './crm/types';
import { MOCK_USERS, MOCK_CATEGORIES, INITIAL_TRANSACTIONS, INITIAL_LOGS, DEFAULT_APP_SETTINGS, DEFAULT_INTEGRATION_SETTINGS } from './data';
import { db, collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc } from './firebase';
import { sendEmailNotification } from './services/notificationService';
import { convertExternalUrlToDataUrl, deleteFileFromCloudinary } from './services/fileAttachmentService';
import { uploadToFirebaseStorage } from './services/firebaseStorageService';
import { sortTransactionsByIdDesc, isAssignedManagerForTxn } from './utils';


// Subcomponents
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import RegisterView from './components/RegisterView';
import ApprovalsView from './components/ApprovalsView';
import SettingsView from './components/SettingsView';
import AdminSettingsView, { AdminTab } from './components/AdminSettingsView';

// CRM Subcomponents
import CRMDashboardView from './components/crm/CRMDashboardView';
import CRMAccountsView from './components/crm/CRMAccountsView';
import CRMContactsView from './components/crm/CRMContactsView';
import CRMOpportunitiesView from './components/crm/CRMOpportunitiesView';

// HRMS Subcomponent
import HRMSPlaceholderView from './components/hrms/HRMSPlaceholderView';

export type ParentModule = 'CRM' | 'HRMS' | 'CASH_BOOK' | 'SETTINGS' | 'ADMIN_SETTINGS';
export type CashBookTab = 'DASHBOARD' | 'INWARD' | 'OUTWARD' | 'APPROVALS';

export interface AppModuleConfig {
  id: ParentModule;
  label: string;
  defaultTab: NavigationTab;
  hasSubmenu: boolean;
}

export const APP_MODULES: AppModuleConfig[] = [
  { id: 'CRM', label: 'CRM', defaultTab: 'CRM_DASHBOARD', hasSubmenu: true },
  { id: 'HRMS', label: 'HRMS', defaultTab: 'HRMS', hasSubmenu: false },
  { id: 'CASH_BOOK', label: 'Cash Book', defaultTab: 'CASHBOOK_DASHBOARD', hasSubmenu: true },
];

export const getDefaultModuleState = (): { defaultTab: NavigationTab; defaultParent: ParentModule | null } => {
  const savedMod = (typeof window !== 'undefined' ? localStorage.getItem('ommax_pref_default_module') : null) as ParentModule | null;
  const targetMod = savedMod || 'CRM';
  const found = APP_MODULES.find(m => m.id === targetMod) || APP_MODULES[0];
  return {
    defaultTab: found.defaultTab,
    defaultParent: found.id
  };
};

type NavigationTab = 
  | 'CRM_DASHBOARD'
  | 'CRM_ACCOUNTS'
  | 'CRM_CONTACTS'
  | 'CRM_OPPORTUNITIES'
  | 'CRM_SETTINGS'
  | 'HRMS'
  | 'CASHBOOK_DASHBOARD'
  | 'CASHBOOK_INWARD'
  | 'CASHBOOK_OUTWARD'
  | 'CASHBOOK_APPROVALS'
  | 'CASHBOOK_SETTINGS'
  | 'SETTINGS'
  | 'ADMIN_SETTINGS';

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getActiveTabClass = (tabId: NavigationTab) => {
  switch (tabId) {
    // CRM
    case 'CRM_DASHBOARD':
      return 'bg-[#f7b944] text-slate-950 font-extrabold shadow-md shadow-amber-950/20';
    case 'CRM_ACCOUNTS':
      return 'bg-blue-600 text-white shadow-md shadow-blue-950/20';
    case 'CRM_CONTACTS':
      return 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20';
    case 'CRM_OPPORTUNITIES':
      return 'bg-amber-600 text-white shadow-md shadow-amber-950/20';
    case 'CRM_SETTINGS':
      return 'bg-slate-700 text-white shadow-md shadow-slate-950/20';

    // HRMS
    case 'HRMS':
      return 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20';

    // Cash Book
    case 'CASHBOOK_DASHBOARD':
      return 'bg-sky-600 text-white shadow-md shadow-sky-950/20';
    case 'CASHBOOK_INWARD':
      return 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20';
    case 'CASHBOOK_OUTWARD':
      return 'bg-rose-600 text-white shadow-md shadow-rose-950/20';
    case 'CASHBOOK_APPROVALS':
      return 'bg-amber-600 text-white shadow-md shadow-amber-950/20';
    case 'CASHBOOK_SETTINGS':
    case 'SETTINGS':
      return 'bg-slate-700 text-white shadow-md shadow-slate-950/20';

    // Admin
    case 'ADMIN_SETTINGS':
      return 'bg-[#f7b944] text-slate-950 font-extrabold shadow-md shadow-amber-950/20';
    default:
      return 'bg-blue-600 text-white shadow-xs';
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Navigation State - Accordion & Tabs (initialized from user preference)
  const initialNav = getDefaultModuleState();
  const [activeTab, setActiveTab] = useState<NavigationTab>(initialNav.defaultTab);
  const [openParentModule, setOpenParentModule] = useState<ParentModule | null>(initialNav.defaultParent);
  
  // Admin sub tab state
  const [adminSubTab, setAdminSubTab] = useState<AdminTab>('APP_SETTINGS');
  
  // App States (Cash Book)
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>(DEFAULT_INTEGRATION_SETTINGS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryLimit[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // CRM States (Completely isolated collections)
  const [crmAccounts, setCrmAccounts] = useState<CRMAccount[]>([]);
  const [crmContacts, setCrmContacts] = useState<CRMContact[]>([]);
  const [crmOpportunities, setCrmOpportunities] = useState<CRMOpportunity[]>([]);
  const [crmSettings, setCrmSettings] = useState<CRMSettings>(DEFAULT_CRM_SETTINGS);

  // Mobile navigation drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = 'CONNECT | Ommax Electric Private Limited';
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
            
            // Seed CRM initial records
            for (const acc of INITIAL_CRM_ACCOUNTS) {
              await setDoc(doc(db, 'crm_accounts', acc.id), acc);
            }
            for (const con of INITIAL_CRM_CONTACTS) {
              await setDoc(doc(db, 'crm_contacts', con.id), con);
            }
            for (const opp of INITIAL_CRM_OPPORTUNITIES) {
              await setDoc(doc(db, 'crm_opportunities', opp.id), opp);
            }
            await setDoc(doc(db, 'crm_settings', 'config'), DEFAULT_CRM_SETTINGS);
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

        // Ensure CRM settings exist
        const crmSettingsDocRef = doc(db, 'crm_settings', 'config');
        const crmSettingsSnap = await getDoc(crmSettingsDocRef);
        if (!crmSettingsSnap.exists()) {
          await setDoc(crmSettingsDocRef, DEFAULT_CRM_SETTINGS);
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
              }
            });
          }
        }, (err) => console.warn('Firestore settings sync notice:', err));

        // 6. CRM Accounts Sync
        const unsubCrmAccs = onSnapshot(collection(db, 'crm_accounts'), (snapshot) => {
          if (snapshot.empty) {
            setCrmAccounts([]);
          } else {
            const list: CRMAccount[] = [];
            snapshot.forEach(d => list.push({ ...d.data(), id: d.id } as CRMAccount));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setCrmAccounts(list);
          }
        }, (err) => console.warn('CRM accounts sync notice:', err));

        // 7. CRM Contacts Sync
        const unsubCrmCons = onSnapshot(collection(db, 'crm_contacts'), (snapshot) => {
          if (snapshot.empty) {
            setCrmContacts([]);
          } else {
            const list: CRMContact[] = [];
            snapshot.forEach(d => list.push({ ...d.data(), id: d.id } as CRMContact));
            setCrmContacts(list);
          }
        }, (err) => console.warn('CRM contacts sync notice:', err));

        // 8. CRM Opportunities Sync
        const unsubCrmOpps = onSnapshot(collection(db, 'crm_opportunities'), (snapshot) => {
          if (snapshot.empty) {
            setCrmOpportunities([]);
          } else {
            const list: CRMOpportunity[] = [];
            snapshot.forEach(d => list.push({ ...d.data(), id: d.id } as CRMOpportunity));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setCrmOpportunities(list);
          }
        }, (err) => console.warn('CRM opportunities sync notice:', err));

        // 9. CRM Settings Sync
        const unsubCrmSettings = onSnapshot(collection(db, 'crm_settings'), (snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach(d => {
              if (d.id === 'config') {
                setCrmSettings({ ...DEFAULT_CRM_SETTINGS, ...d.data() } as CRMSettings);
              }
            });
          }
        }, (err) => console.warn('CRM settings sync notice:', err));

        unsubs = [unsubTxns, unsubCats, unsubUsers, unsubLogs, unsubSettings, unsubCrmAccs, unsubCrmCons, unsubCrmOpps, unsubCrmSettings];
      } catch (err) {
        console.error('Firebase sync setup error:', err);
      }
    };

    initializeAndSync();

    return () => {
      unsubs.forEach(unsub => unsub && unsub());
    };
  }, []);






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
    const initialNav = getDefaultModuleState();
    setActiveTab(initialNav.defaultTab);
    setOpenParentModule(initialNav.defaultParent);
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

    // Dispatch automated Email alerts
    const emailType = newTxn.type === 'IN' ? 'INWARD' : (newTxn.status === 'PENDING' ? 'REQUEST_SUBMITTED' : 'NEW');
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

      // If comparing receiptUrl, skip if receiptName already recorded an attachment change, or sanitize data URLs
      if (field === 'receiptUrl') {
        const nameOld = (target.receiptName === null || target.receiptName === undefined) ? '' : String(target.receiptName).trim();
        const nameNew = (updatedTxn.receiptName === null || updatedTxn.receiptName === undefined) ? '' : String(updatedTxn.receiptName).trim();
        if (nameOld !== nameNew) return; // 'Attachment' label handles attachment changes
      }

      if (oldValStr.startsWith('data:')) oldValStr = '[Attached File]';
      if (newValStr.startsWith('data:')) newValStr = '[Attached File]';

      changes.push({
        field: fieldLabel,
        oldValue: oldValStr,
        newValue: newValStr
      });
    });

    if (changes.length > 0) {
      const editHistory = target.editHistory ? [...target.editHistory] : [];
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        editedBy: currentUser ? (currentUser.fullName || currentUser.username || 'Admin') : 'Admin',
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

    // Dispatch automated Email alerts with dynamic changed fields
    if (changes.length > 0) {
      const changedFieldLabels = changes.map(c => c.field);
      const isDeposit = finalTxn.type === 'IN';
      const notificationType = isDeposit ? 'INWARD_EDIT' : 'EDIT';
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
      if (
        targetTxn.receiptUrl &&
        targetTxn.receiptUrl.includes('cloudinary.com')
      ) {
        deleteFileFromCloudinary(targetTxn.receiptUrl, {
          cloudName: integrationSettings?.cloudinaryCloudName || localStorage.getItem('cloudinary_cloud_name') || '',
          apiKey: integrationSettings?.cloudinaryApiKey || localStorage.getItem('cloudinary_api_key') || '',
          apiSecret: integrationSettings?.cloudinaryApiSecret || localStorage.getItem('cloudinary_api_secret') || ''
        }).catch(e => console.warn('Cloudinary cleanup error on delete:', e));
      }

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

  // Workflow Handler: Re-Route Approval Request to another Manager
  const handleReRouteRequest = (id: string, targetManagerName: string, reason: string, reRoutedBy: string) => {
    if (!currentUser) return;
    const targetTxn = transactions.find(t => t.id === id);
    if (!targetTxn) return;

    const realRerouter = resolveRealPersonName(reRoutedBy, 'MANAGER');
    const now = new Date().toISOString();

    const existingWorkflowHistory = targetTxn.workflowHistory || [];
    const newWorkflowStep: WorkflowHistoryEntry = {
      id: String(Date.now()),
      timestamp: now,
      action: 'RE_ROUTED',
      actor: realRerouter,
      target: targetManagerName,
      reason: reason
    };

    const updatedTxn: Transaction = {
      ...targetTxn,
      approverName: targetManagerName, // Assigns to new manager for pending queue visibility
      reRoutedBy: realRerouter,
      reRoutedAt: now,
      reRouteReason: reason,
      workflowHistory: [...existingWorkflowHistory, newWorkflowStep]
    };

    setTransactions(prev => prev.map(t => t.id === id ? updatedTxn : t));
    setDoc(doc(db, 'transactions', id), updatedTxn).catch(e => console.warn(e));

    addLog('TXN_REROUTE', `Re-routed approval for voucher ${updatedTxn.reference} (${appSettings.currencySymbol}${updatedTxn.amount.toFixed(2)}) to ${targetManagerName}: ${reason}`);

    sendEmailNotification('REQUEST_REROUTED', updatedTxn, currentUser, transactions, appSettings, undefined, integrationSettings, users);
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

  // Dynamic Navigation Configuration
  const isUserAdmin = currentUser?.role === 'ADMIN';
  const isUserCustodian = currentUser?.role === 'CUSTODIAN';
  const isManagerOrAdmin = Boolean(
    isUserAdmin || 
    isUserCustodian || 
    currentUser?.isManager || 
    (currentUser && users.some(u => 
      u.reportingTo?.toLowerCase() === currentUser.username.toLowerCase() || 
      u.reportingTo?.toLowerCase() === currentUser.fullName.toLowerCase()
    ))
  );

  // CRM Sub Tabs
  const crmSubTabs: { id: NavigationTab; label: string; icon: any; badge?: number }[] = [
    { id: 'CRM_DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'CRM_ACCOUNTS', label: 'Accounts', icon: Building2, badge: crmAccounts.length },
    { id: 'CRM_CONTACTS', label: 'Contacts', icon: UsersIcon, badge: crmContacts.length },
    { id: 'CRM_OPPORTUNITIES', label: 'Opportunity', icon: Target, badge: crmOpportunities.length }
  ];

  // Cash Book Sub Tabs
  const cashBookSubTabs: { id: NavigationTab; label: string; icon: any; badge?: number }[] = useMemo(() => {
    const tabs: { id: NavigationTab; label: string; icon: any; badge?: number }[] = [
      { id: 'CASHBOOK_DASHBOARD', label: 'Dashboard', icon: LayoutDashboard }
    ];

    if (isUserAdmin || isUserCustodian) {
      tabs.push({ id: 'CASHBOOK_INWARD', label: 'Deposit', icon: ArrowDownCircle });
    }

    tabs.push({ id: 'CASHBOOK_OUTWARD', label: 'Expense', icon: ArrowUpCircle });

    if (isManagerOrAdmin) {
      tabs.push({ 
        id: 'CASHBOOK_APPROVALS', 
        label: 'Approvals', 
        icon: CheckCircle2,
        badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
      });
    }

    return tabs;
  }, [isUserAdmin, isUserCustodian, isManagerOrAdmin, pendingApprovalsCount]);

  // Admin sub-menu items configuration
  const adminSubMenuItems = [
    { id: 'APP_SETTINGS' as AdminTab, label: 'App Settings', icon: Sliders },
    { id: 'USER_MGMT' as AdminTab, label: 'Users', icon: UsersIcon, badge: users.length },
    { id: 'INTEGRATIONS' as AdminTab, label: 'Integrations', icon: Share2 },
    { id: 'TEMPLATES' as AdminTab, label: 'Templates', icon: FileText, badge: 9 },
    { id: 'SYSTEM_AUDIT' as AdminTab, label: 'Audit Trail', icon: History, badge: logs.length },
    { id: 'SYSTEM_OPERATIONS' as AdminTab, label: 'System Ops', icon: Database },
  ];

  // ==================== CRM OPERATIONS ====================
  const getNextCRMAccountId = () => {
    const usedNums = new Set<number>();
    crmAccounts.forEach(a => {
      if (!a.id) return;
      const match = a.id.match(/(?:ACC\s*[-_]?\s*)(\d+)/i);
      if (match) {
        usedNums.add(parseInt(match[1], 10));
      }
    });
    let n = 1;
    while (usedNums.has(n)) {
      n++;
    }
    return `ACC - ${String(n).padStart(3, '0')}`;
  };

  const getNextCRMContactId = () => {
    const usedNums = new Set<number>();
    crmContacts.forEach(c => {
      if (!c.id) return;
      const match = c.id.match(/(?:CON\s*[-_]?\s*)(\d+)/i);
      if (match) {
        usedNums.add(parseInt(match[1], 10));
      }
    });
    let n = 1;
    while (usedNums.has(n)) {
      n++;
    }
    return `CON - ${String(n).padStart(3, '0')}`;
  };

  const handleAddCRMAccount = async (acc: Omit<CRMAccount, 'id' | 'createdAt'>): Promise<CRMAccount> => {
    const id = (acc as any).id || getNextCRMAccountId();
    const now = new Date().toISOString();
    const statusLabel = acc.status === 'ACTIVE' ? 'Active Client' : acc.status === 'PROSPECT' ? 'Prospect / Lead' : 'Inactive';
    const newAcc: CRMAccount = {
      ...acc,
      id,
      createdAt: now,
      editHistory: acc.editHistory || [
        {
          timestamp: now,
          changedBy: currentUser?.fullName || currentUser?.username || 'Admin',
          action: 'CREATED',
          details: `Account created with status "${statusLabel}"`
        }
      ]
    };
    setCrmAccounts(prev => [newAcc, ...prev.filter(a => a.id !== id)]);
    try {
      await setDoc(doc(db, 'crm_accounts', id), newAcc);
      addLog('CREATE_ACCOUNT', `Created CRM Account: ${acc.name} (${id})`);
    } catch (err) {
      console.error('Error adding CRM account:', err);
    }
    return newAcc;
  };

  const handleUpdateCRMAccount = async (acc: CRMAccount) => {
    setCrmAccounts(prev => prev.map(a => a.id === acc.id ? acc : a));
    try {
      await setDoc(doc(db, 'crm_accounts', acc.id), acc);
      addLog('UPDATE_ACCOUNT', `Updated CRM Account: ${acc.name} (${acc.id})`);
    } catch (err) {
      console.error('Error updating CRM account:', err);
    }
  };

  const handleDeleteCRMAccount = async (id: string) => {
    setCrmAccounts(prev => prev.filter(a => a.id !== id));
    try {
      await deleteDoc(doc(db, 'crm_accounts', id));
      addLog('DELETE_ACCOUNT', `Deleted CRM Account: ${id}`);
    } catch (err) {
      console.error('Error deleting CRM account:', err);
    }
  };

  const handleAddCRMContact = async (con: Omit<CRMContact, 'id' | 'createdAt'>): Promise<CRMContact> => {
    const id = (con as any).id || getNextCRMContactId();
    const now = new Date().toISOString();
    const statusLabel = con.status === 'ACTIVE' ? 'Active' : con.status === 'INACTIVE' ? 'Inactive' : con.status === 'LEFT_COMPANY' ? 'Left Company' : 'Do Not Contact';
    const newCon: CRMContact = {
      ...con,
      id,
      createdAt: now,
      editHistory: con.editHistory || [
        {
          timestamp: now,
          changedBy: currentUser?.fullName || currentUser?.username || 'Admin',
          action: 'CREATED',
          details: `Contact created with status "${statusLabel}"`
        }
      ]
    };
    setCrmContacts(prev => [newCon, ...prev.filter(c => c.id !== id)]);
    try {
      await setDoc(doc(db, 'crm_contacts', id), newCon);
      const contactDisplayName = con.name || [con.firstName, con.lastName].filter(Boolean).join(' ') || 'Contact';
      addLog('CREATE_CONTACT', `Added CRM Contact: ${contactDisplayName} (${id})`);
    } catch (err) {
      console.error('Error adding CRM contact:', err);
    }
    return newCon;
  };

  const handleUpdateCRMContact = async (con: CRMContact) => {
    setCrmContacts(prev => prev.map(c => c.id === con.id ? con : c));
    try {
      await setDoc(doc(db, 'crm_contacts', con.id), con);
      addLog('UPDATE_CONTACT', `Updated CRM Contact: ${con.firstName || con.name} ${con.lastName || ''} (${con.id})`);
    } catch (err) {
      console.error('Error updating CRM contact:', err);
    }
  };

  const handleDeleteCRMContact = async (id: string) => {
    setCrmContacts(prev => prev.filter(c => c.id !== id));
    try {
      await deleteDoc(doc(db, 'crm_contacts', id));
      addLog('DELETE_CONTACT', `Deleted CRM Contact: ${id}`);
    } catch (err) {
      console.error('Error deleting CRM contact:', err);
    }
  };

  const getNextCRMOpportunityId = () => {
    const usedNums = new Set<number>();
    crmOpportunities.forEach(o => {
      if (!o.id) return;
      const match = o.id.match(/(?:DEAL\s*[-_]?\s*|OPP\s*[-_]?\s*)(\d+)/i);
      if (match) {
        usedNums.add(parseInt(match[1], 10));
      }
    });
    let n = 1;
    while (usedNums.has(n)) {
      n++;
    }
    return `DEAL - ${String(n).padStart(3, '0')}`;
  };

  const handleAddCRMOpportunity = async (opp: Omit<CRMOpportunity, 'id' | 'createdAt'>) => {
    const id = (opp as any).id || getNextCRMOpportunityId();
    const newOpp: CRMOpportunity = {
      ...opp,
      id,
      createdAt: new Date().toISOString()
    };
    setCrmOpportunities(prev => [newOpp, ...prev.filter(o => o.id !== id)]);
    try {
      await setDoc(doc(db, 'crm_opportunities', id), newOpp);
      addLog('CREATE_OPPORTUNITY', `Created CRM Opportunity: ${opp.title} (${id})`);
    } catch (err) {
      console.error('Error adding CRM opportunity:', err);
    }
  };

  const handleUpdateCRMOpportunity = async (opp: CRMOpportunity) => {
    setCrmOpportunities(prev => prev.map(o => o.id === opp.id ? opp : o));
    try {
      await setDoc(doc(db, 'crm_opportunities', opp.id), opp);
      addLog('UPDATE_OPPORTUNITY', `Updated CRM Opportunity: ${opp.title} (${opp.id})`);
    } catch (err) {
      console.error('Error updating CRM opportunity:', err);
    }
  };

  const handleDeleteCRMOpportunity = async (id: string) => {
    setCrmOpportunities(prev => prev.filter(o => o.id !== id));
    try {
      await deleteDoc(doc(db, 'crm_opportunities', id));
      addLog('DELETE_OPPORTUNITY', `Deleted CRM Opportunity: ${id}`);
    } catch (err) {
      console.error('Error deleting CRM opportunity:', err);
    }
  };

  const handleUpdateCRMSettings = async (newSettings: CRMSettings) => {
    try {
      await setDoc(doc(db, 'crm_settings', 'config'), newSettings);
      setCrmSettings(newSettings);
      addLog('UPDATE_CRM_SETTINGS', 'Updated CRM Master Settings');
    } catch (err) {
      console.error('Error updating CRM settings:', err);
    }
  };

  // Guard: Redirect to secure login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLogin} usersList={users} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col justify-between shrink-0 border-r border-slate-800">
        <div className="overflow-y-auto">
          {/* Main Logo Header Banner */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#f7b944] text-[#112231] shrink-0 font-bold shadow-sm">
              <Network className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-none tracking-wider bg-gradient-to-r from-[#ec003f] to-[#f7b944] bg-clip-text text-transparent">CONNECT</h2>
              <span className="text-[10px] text-[#f7b944] font-bold tracking-wide block mt-1">Ommax Electric Private Limited</span>
            </div>
          </div>

          {/* Navigation Hierarchy */}
          <nav className="p-4 space-y-2">
            
            {/* MODULE 1: CRM */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setOpenParentModule(prev => prev === 'CRM' ? null : 'CRM');
                  if (!activeTab.startsWith('CRM_')) {
                    setActiveTab('CRM_DASHBOARD');
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                  activeTab.startsWith('CRM_')
                    ? 'bg-slate-800/80 text-white font-extrabold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-[#f7b944] shrink-0" />
                  <span className="tracking-wide">CRM</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openParentModule === 'CRM' ? 'rotate-180 text-white' : 'text-slate-500'}`} />
              </button>

              <AnimatePresence initial={false}>
                {openParentModule === 'CRM' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="overflow-hidden space-y-0.5 pl-3 border-l border-slate-800 ml-4 py-1"
                  >
                    {crmSubTabs.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                            isSubActive
                              ? 'bg-[#f7b944]/20 text-[#f7b944] font-bold border-l-2 border-[#f7b944]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <SubIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </div>
                          {sub.badge !== undefined && sub.badge > 0 && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                              isSubActive ? 'bg-[#f7b944] text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {sub.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* MODULE 2: HRMS */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('HRMS');
                  setOpenParentModule('HRMS');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                  activeTab === 'HRMS'
                    ? 'bg-slate-800/80 text-white font-extrabold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="tracking-wide">HRMS</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 font-bold">
                  Soon
                </span>
              </button>
            </div>

            {/* MODULE 3: Cash Book (formerly Petty Cash) */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setOpenParentModule(prev => prev === 'CASH_BOOK' ? null : 'CASH_BOOK');
                  if (!activeTab.startsWith('CASHBOOK_')) {
                    setActiveTab('CASHBOOK_DASHBOARD');
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                  activeTab.startsWith('CASHBOOK_')
                    ? 'bg-slate-800/80 text-white font-extrabold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IndianRupee className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="tracking-wide">Cash Book</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openParentModule === 'CASH_BOOK' ? 'rotate-180 text-white' : 'text-slate-500'}`} />
              </button>

              <AnimatePresence initial={false}>
                {openParentModule === 'CASH_BOOK' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="overflow-hidden space-y-0.5 pl-3 border-l border-slate-800 ml-4 py-1"
                  >
                    {cashBookSubTabs.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                            isSubActive
                              ? 'bg-[#f7b944]/20 text-[#f7b944] font-bold border-l-2 border-[#f7b944]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <SubIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </div>
                          {sub.badge !== undefined && sub.badge > 0 && (
                            <span className="bg-amber-500 text-slate-950 font-black text-[9px] font-mono px-1.5 py-0.2 rounded-md shrink-0">
                              {sub.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* MODULE 4: Settings (Top-level Parent Module) */}
            <div className="pt-1">
              <button
                onClick={() => {
                  setActiveTab('SETTINGS');
                  setOpenParentModule('SETTINGS');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                  activeTab === 'SETTINGS'
                    ? 'bg-slate-700 text-white font-extrabold shadow-md shadow-slate-950/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-slate-300 shrink-0" />
                  <span className="tracking-wide">Settings</span>
                </div>
              </button>
            </div>

            {/* MODULE 5: Admin Settings */}
            {isUserAdmin && (
              <div className="space-y-1 pt-1">
                <button
                  onClick={() => {
                    setActiveTab('ADMIN_SETTINGS');
                    setOpenParentModule(prev => prev === 'ADMIN_SETTINGS' ? null : 'ADMIN_SETTINGS');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                    activeTab === 'ADMIN_SETTINGS'
                      ? 'bg-[#f7b944] text-slate-950 font-extrabold shadow-md shadow-amber-950/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Admin Settings</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openParentModule === 'ADMIN_SETTINGS' ? 'rotate-180' : ''}`} />
                </button>

                {/* Admin Dropdown Sub-menu */}
                <AnimatePresence initial={false}>
                  {openParentModule === 'ADMIN_SETTINGS' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-0.5 pl-3 border-l border-slate-800 ml-4 py-1"
                    >
                      {adminSubMenuItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeTab === 'ADMIN_SETTINGS' && adminSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              setActiveTab('ADMIN_SETTINGS');
                              setAdminSubTab(sub.id);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                              isSubActive
                                ? 'bg-[#f7b944]/20 text-[#f7b944] font-bold border-l-2 border-[#f7b944]'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            {sub.badge !== undefined && (
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                                isSubActive ? 'bg-[#f7b944] text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </nav>
        </div>

        {/* User Session Info & Logout Control */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#f7b944]/20 border border-[#f7b944]/40 shrink-0 flex items-center justify-center font-bold text-xs text-[#f7b944]">
              {getInitials(currentUser.fullName)}
            </div>
            <div className="truncate">
              <p className="font-bold text-xs text-slate-100 truncate">{currentUser.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] text-slate-400 font-mono capitalize">{currentUser.role.toLowerCase()}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-red-950/40 hover:text-red-300 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-slate-700/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER & DRAWER */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#f7b944] text-[#112231] font-bold text-xs">
              <Network className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold leading-none tracking-wider bg-gradient-to-r from-[#ec003f] to-[#f7b944] bg-clip-text text-transparent">CONNECT</h2>
              <span className="text-[8px] text-[#f7b944] font-bold">Ommax Electric Private Limited</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 md:hidden"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 z-50 md:hidden flex flex-col justify-between shadow-2xl overflow-y-auto"
              >
                <div>
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f7b944] text-[#112231] shrink-0 font-bold shadow-sm">
                        <Network className="w-4.5 h-4.5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold leading-none tracking-wider bg-gradient-to-r from-[#ec003f] to-[#f7b944] bg-clip-text text-transparent">CONNECT</h2>
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

                  <nav className="p-4 space-y-2">
                    
                    {/* Mobile CRM */}
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setOpenParentModule(prev => prev === 'CRM' ? null : 'CRM');
                          if (!activeTab.startsWith('CRM_')) setActiveTab('CRM_DASHBOARD');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#f7b944]" />
                          <span>CRM</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 ${openParentModule === 'CRM' ? 'rotate-180' : ''}`} />
                      </button>
                      {openParentModule === 'CRM' && (
                        <div className="pl-3 border-l border-slate-800 ml-3 space-y-1">
                          {crmSubTabs.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => { setActiveTab(sub.id); setIsMobileMenuOpen(false); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                activeTab === sub.id ? 'bg-[#f7b944]/20 text-[#f7b944]' : 'text-slate-400'
                              }`}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mobile HRMS */}
                    <button
                      onClick={() => { setActiveTab('HRMS'); setOpenParentModule('HRMS'); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <Users2 className="w-4 h-4 text-indigo-400" />
                        <span>HRMS</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 font-bold">
                        Soon
                      </span>
                    </button>

                    {/* Mobile Cash Book */}
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setOpenParentModule(prev => prev === 'CASH_BOOK' ? null : 'CASH_BOOK');
                          if (!activeTab.startsWith('CASHBOOK_')) setActiveTab('CASHBOOK_DASHBOARD');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <IndianRupee className="w-4 h-4 text-emerald-400" />
                          <span>Cash Book</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 ${openParentModule === 'CASH_BOOK' ? 'rotate-180' : ''}`} />
                      </button>
                      {openParentModule === 'CASH_BOOK' && (
                        <div className="pl-3 border-l border-slate-800 ml-3 space-y-1">
                          {cashBookSubTabs.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => { setActiveTab(sub.id); setIsMobileMenuOpen(false); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                activeTab === sub.id ? 'bg-[#f7b944]/20 text-[#f7b944]' : 'text-slate-400'
                              }`}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mobile Settings (Parent Module) */}
                    <div>
                      <button
                        onClick={() => {
                          setActiveTab('SETTINGS');
                          setOpenParentModule('SETTINGS');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                          activeTab === 'SETTINGS'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Settings</span>
                        </div>
                      </button>
                    </div>

                    {/* Mobile Admin */}
                    {isUserAdmin && (
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setActiveTab('ADMIN_SETTINGS');
                            setOpenParentModule(prev => prev === 'ADMIN_SETTINGS' ? null : 'ADMIN_SETTINGS');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-[#f7b944]" />
                            <span>Admin Settings</span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 ${openParentModule === 'ADMIN_SETTINGS' ? 'rotate-180' : ''}`} />
                        </button>
                        {openParentModule === 'ADMIN_SETTINGS' && (
                          <div className="pl-3 border-l border-slate-800 ml-3 space-y-1">
                            {adminSubMenuItems.map(sub => (
                              <button
                                key={sub.id}
                                onClick={() => { 
                                  setActiveTab('ADMIN_SETTINGS'); 
                                  setAdminSubTab(sub.id); 
                                  setIsMobileMenuOpen(false); 
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  activeTab === 'ADMIN_SETTINGS' && adminSubTab === sub.id ? 'bg-[#f7b944]/20 text-[#f7b944]' : 'text-slate-400'
                                }`}
                              >
                                {sub.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </nav>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/30 space-y-3.5">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-[#f7b944]/20 border border-[#f7b944]/40 shrink-0 flex items-center justify-center font-bold text-xs text-[#f7b944]">
                      {getInitials(currentUser.fullName)}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-xs text-slate-100 truncate leading-tight">{currentUser.fullName}</p>
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
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

        {/* Mobile Page Title Header */}
        <div className="bg-white border-b border-slate-200/80 px-4 py-3 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            {/* CRM Icons */}
            {activeTab === 'CRM_DASHBOARD' && <LayoutDashboard className="w-4 h-4 text-[#f7b944]" />}
            {activeTab === 'CRM_ACCOUNTS' && <Building2 className="w-4 h-4 text-blue-600" />}
            {activeTab === 'CRM_CONTACTS' && <UsersIcon className="w-4 h-4 text-indigo-600" />}
            {activeTab === 'CRM_OPPORTUNITIES' && <Target className="w-4 h-4 text-amber-600" />}
            
            {/* HRMS Icon */}
            {activeTab === 'HRMS' && <Users2 className="w-4 h-4 text-indigo-600" />}

            {/* Cash Book Icons */}
            {activeTab === 'CASHBOOK_DASHBOARD' && <LayoutDashboard className="w-4 h-4 text-sky-600" />}
            {activeTab === 'CASHBOOK_INWARD' && <ArrowDownCircle className="w-4 h-4 text-emerald-600" />}
            {activeTab === 'CASHBOOK_OUTWARD' && <ArrowUpCircle className="w-4 h-4 text-rose-600" />}
            {activeTab === 'CASHBOOK_APPROVALS' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
            {(activeTab === 'CASHBOOK_SETTINGS' || activeTab === 'SETTINGS') && <Settings className="w-4 h-4 text-slate-600" />}

            {/* Admin Icon */}
            {activeTab === 'ADMIN_SETTINGS' && <ShieldAlert className="w-4 h-4 text-[#f7b944]" />}
            
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
              {/* CRM Headers */}
              {activeTab === 'CRM_DASHBOARD' && 'CRM Dashboard'}
              {activeTab === 'CRM_ACCOUNTS' && 'Accounts & Client Directory'}
              {activeTab === 'CRM_CONTACTS' && 'Contacts'}
              {activeTab === 'CRM_OPPORTUNITIES' && 'Sales Pipeline & Opportunities'}

              {/* HRMS Header */}
              {activeTab === 'HRMS' && 'Human Resources Management System'}

              {/* Cash Book Headers */}
              {activeTab === 'CASHBOOK_DASHBOARD' && 'Financial Overview'}
              {activeTab === 'CASHBOOK_INWARD' && 'Deposit Cash Registry'}
              {activeTab === 'CASHBOOK_OUTWARD' && 'Expense Registry'}
              {activeTab === 'CASHBOOK_APPROVALS' && 'Petty Cash Approvals Console'}
              {(activeTab === 'CASHBOOK_SETTINGS' || activeTab === 'SETTINGS') && 'Settings & Personal Preferences'}

              {/* Admin Header */}
              {activeTab === 'ADMIN_SETTINGS' && (
                adminSubTab === 'APP_SETTINGS' ? 'App Settings & Configuration' :
                adminSubTab === 'USER_MGMT' ? 'User Management & Access Roles' :
                adminSubTab === 'INTEGRATIONS' ? 'Integrations & Webhook Endpoints' :
                adminSubTab === 'TEMPLATES' ? 'Notification & Email Templates' :
                adminSubTab === 'SYSTEM_AUDIT' ? 'Audit Trail & Activity Log' :
                'System Operations & Database'
              )}
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-normal">
            {/* CRM Descriptions */}
            {activeTab === 'CRM_DASHBOARD' && 'Get a complete overview of Sales & Opportunities'}
            {activeTab === 'CRM_ACCOUNTS' && 'Manage customer companies, business details and account relationships'}
            {activeTab === 'CRM_CONTACTS' && 'Organize customer contacts, communication details, and key information'}
            {activeTab === 'CRM_OPPORTUNITIES' && 'Track potential deals, sales stages, values, and conversion progress'}
            {activeTab === 'CRM_SETTINGS' && 'Manage CRM preferences and configurations'}

            {/* HRMS Description */}
            {activeTab === 'HRMS' && 'Employee directory, attendance logging, leave approval workflows, and payroll integration.'}

            {/* Cash Book Descriptions */}
            {activeTab === 'CASHBOOK_DASHBOARD' && 'Overview of inflows, record disbursements, and monitor petty cash balances.'}
            {activeTab === 'CASHBOOK_INWARD' && 'Log and record deposits.'}
            {activeTab === 'CASHBOOK_OUTWARD' && 'Record cash disbursements and track voucher disbursements.'}
            {activeTab === 'CASHBOOK_APPROVALS' && 'Authorize pending petty cash requests and issue disbursements.'}
            {(activeTab === 'CASHBOOK_SETTINGS' || activeTab === 'SETTINGS') && 'Manage password credentials, phone dialing defaults, and workspace preferences.'}

            {/* Admin Descriptions */}
            {activeTab === 'ADMIN_SETTINGS' && (
              adminSubTab === 'APP_SETTINGS' ? 'Configure currency, date formats, voucher numbering, approval policies, and module settings.' :
              adminSubTab === 'USER_MGMT' ? 'Add, modify, and manage user credentials, roles, and reporting hierarchy.' :
              adminSubTab === 'INTEGRATIONS' ? 'Manage Microsoft Power Automate Webhook connectors, sender config, and Cloudinary attachments.' :
              adminSubTab === 'TEMPLATES' ? 'Customize and preview notification email templates for disbursements, deposits, and approvals.' :
              adminSubTab === 'SYSTEM_AUDIT' ? 'Complete chronological immutable audit logs of transactions, user access, and system events.' :
              'Export JSON backups, restore workspace states, and manage category limits.'
            )}
          </p>
        </div>

        {/* Mobile Main Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-12 bg-slate-50">
          {activeTab === 'CRM_DASHBOARD' && (
            <CRMDashboardView 
              accounts={crmAccounts}
              contacts={crmContacts}
              opportunities={crmOpportunities}
              crmSettings={crmSettings}
              currentUser={currentUser}
              appSettings={appSettings}
              onNavigateToAccounts={() => setActiveTab('CRM_ACCOUNTS')}
              onNavigateToContacts={() => setActiveTab('CRM_CONTACTS')}
              onNavigateToOpportunities={() => setActiveTab('CRM_OPPORTUNITIES')}
            />
          )}
          {activeTab === 'CRM_ACCOUNTS' && (
            <CRMAccountsView
              accounts={crmAccounts}
              crmSettings={crmSettings}
              currentUser={currentUser}
              users={users}
              appSettings={appSettings}
              onAddAccount={handleAddCRMAccount}
              onUpdateAccount={handleUpdateCRMAccount}
              onDeleteAccount={handleDeleteCRMAccount}
            />
          )}
          {activeTab === 'CRM_CONTACTS' && (
            <CRMContactsView
              contacts={crmContacts}
              accounts={crmAccounts}
              currentUser={currentUser}
              users={users}
              appSettings={appSettings}
              onAddContact={handleAddCRMContact}
              onUpdateContact={handleUpdateCRMContact}
              onDeleteContact={handleDeleteCRMContact}
            />
          )}
          {activeTab === 'CRM_OPPORTUNITIES' && (
            <CRMOpportunitiesView
              opportunities={crmOpportunities}
              accounts={crmAccounts}
              contacts={crmContacts}
              crmSettings={crmSettings}
              currentUser={currentUser}
              users={users}
              appSettings={appSettings}
              onAddOpportunity={handleAddCRMOpportunity}
              onUpdateOpportunity={handleUpdateCRMOpportunity}
              onDeleteOpportunity={handleDeleteCRMOpportunity}
              onAddAccount={handleAddCRMAccount}
              onAddContact={handleAddCRMContact}
            />
          )}
          {activeTab === 'HRMS' && (
            <HRMSPlaceholderView />
          )}
          {activeTab === 'CASHBOOK_DASHBOARD' && (
            <DashboardView 
              transactions={transactions} 
              categories={categories} 
              currentUser={currentUser}
              onNavigateToRegister={() => setActiveTab('CASHBOOK_OUTWARD')}
              appSettings={appSettings}
            />
          )}
          {activeTab === 'CASHBOOK_INWARD' && (
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
          {activeTab === 'CASHBOOK_OUTWARD' && (
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
          {activeTab === 'CASHBOOK_APPROVALS' && (
            <ApprovalsView 
              transactions={transactions}
              categories={categories}
              currentUser={currentUser}
              users={users}
              onApproveRequest={handleApproveRequest}
              onPayRequest={handlePayRequest}
              onRejectRequest={handleRejectRequest}
              onReRouteRequest={handleReRouteRequest}
              appSettings={appSettings}
            />
          )}
          {(activeTab === 'CASHBOOK_SETTINGS' || activeTab === 'SETTINGS') && (
            <SettingsView 
              currentUser={currentUser} 
              onUpdateUser={handleUpdateUser} 
              crmSettings={crmSettings}
            />
          )}
          {activeTab === 'ADMIN_SETTINGS' && (
            <AdminSettingsView 
              currentUser={currentUser}
              appSettings={appSettings}
              onUpdateAppSettings={handleUpdateAppSettings}
              integrationSettings={integrationSettings}
              onUpdateIntegrationSettings={handleUpdateIntegrationSettings}
              crmSettings={crmSettings}
              onUpdateCRMSettings={handleUpdateCRMSettings}
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
              activeSubTab={adminSubTab}
              onSubTabChange={setAdminSubTab}
            />
          )}
        </div>
      </div>

      {/* 2. MAIN SYSTEM CONSOLE - DESKTOP VIEW */}
      <main className="hidden md:flex flex-1 flex-col overflow-hidden min-w-0">
        
        {/* Main Header Toolbar */}
        <header className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shadow-xs shrink-0">
          <div>
            <div className="flex items-center gap-2">
              {/* CRM Icons */}
              {activeTab === 'CRM_DASHBOARD' && <LayoutDashboard className="w-5 h-5 text-[#f7b944]" />}
              {activeTab === 'CRM_ACCOUNTS' && <Building2 className="w-5 h-5 text-blue-600" />}
              {activeTab === 'CRM_CONTACTS' && <UsersIcon className="w-5 h-5 text-indigo-600" />}
              {activeTab === 'CRM_OPPORTUNITIES' && <Target className="w-5 h-5 text-amber-600" />}
              {activeTab === 'CRM_SETTINGS' && <Sliders className="w-5 h-5 text-slate-600" />}
              
              {/* HRMS Icon */}
              {activeTab === 'HRMS' && <Users2 className="w-5 h-5 text-indigo-600" />}

              {/* Cash Book Icons */}
              {activeTab === 'CASHBOOK_DASHBOARD' && <LayoutDashboard className="w-5 h-5 text-sky-600" />}
              {activeTab === 'CASHBOOK_INWARD' && <ArrowDownCircle className="w-5 h-5 text-emerald-600" />}
              {activeTab === 'CASHBOOK_OUTWARD' && <ArrowUpCircle className="w-5 h-5 text-rose-600" />}
              {activeTab === 'CASHBOOK_APPROVALS' && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
              {(activeTab === 'CASHBOOK_SETTINGS' || activeTab === 'SETTINGS') && <Settings className="w-5 h-5 text-slate-600" />}

              {/* Admin Icon */}
              {activeTab === 'ADMIN_SETTINGS' && <ShieldAlert className="w-5 h-5 text-[#f7b944]" />}
              
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                {/* CRM Headers */}
                {activeTab === 'CRM_DASHBOARD' && 'CRM Dashboard'}
                {activeTab === 'CRM_ACCOUNTS' && 'Accounts & Client Directory'}
                {activeTab === 'CRM_CONTACTS' && 'Contacts'}
                {activeTab === 'CRM_OPPORTUNITIES' && 'Sales Pipeline & Opportunities'}
                {activeTab === 'CRM_SETTINGS' && 'CRM Module Settings'}

                {/* HRMS Header */}
                {activeTab === 'HRMS' && 'Human Resources Management System'}

                {/* Cash Book Headers */}
                {activeTab === 'CASHBOOK_DASHBOARD' && 'Financial Overview'}
                {activeTab === 'CASHBOOK_INWARD' && 'Deposit Cash Registry'}
                {activeTab === 'CASHBOOK_OUTWARD' && 'Expense Registry'}
                {activeTab === 'CASHBOOK_APPROVALS' && 'Petty Cash Approvals Console'}
                {(activeTab === 'CASHBOOK_SETTINGS' || activeTab === 'SETTINGS') && 'Settings & Personal Preferences'}

                {/* Admin Header */}
                {activeTab === 'ADMIN_SETTINGS' && (
                  adminSubTab === 'APP_SETTINGS' ? 'App Settings & Configuration' :
                  adminSubTab === 'USER_MGMT' ? 'User Management & Access Roles' :
                  adminSubTab === 'INTEGRATIONS' ? 'Integrations & Webhook Endpoints' :
                  adminSubTab === 'TEMPLATES' ? 'Notification & Email Templates' :
                  adminSubTab === 'SYSTEM_AUDIT' ? 'Audit Trail & Activity Log' :
                  'System Operations & Database'
                )}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {/* CRM Descriptions */}
              {activeTab === 'CRM_DASHBOARD' && 'Get a complete overview of Sales & Opportunities'}
              {activeTab === 'CRM_ACCOUNTS' && 'Manage customer companies, business details and account relationships'}
              {activeTab === 'CRM_CONTACTS' && 'Organize customer contacts, communication details, and key information'}
              {activeTab === 'CRM_OPPORTUNITIES' && 'Track potential deals, sales stages, values, and conversion progress'}
              {activeTab === 'CRM_SETTINGS' && 'Manage CRM preferences and configurations'}

              {/* HRMS Description */}
              {activeTab === 'HRMS' && 'Employee directory, attendance logging, leave approval workflows, and payroll integration.'}

              {/* Cash Book Descriptions */}
              {activeTab === 'CASHBOOK_DASHBOARD' && 'Overview of inflows, record disbursements, and monitor petty cash balances.'}
              {activeTab === 'CASHBOOK_INWARD' && 'Log and record deposits.'}
              {activeTab === 'CASHBOOK_OUTWARD' && 'Record cash disbursements and track voucher disbursements.'}
              {activeTab === 'CASHBOOK_APPROVALS' && 'Authorize pending petty cash requests and issue disbursements.'}
              {(activeTab === 'CASHBOOK_SETTINGS' || activeTab === 'SETTINGS') && 'Manage password credentials, phone dialing defaults, and workspace preferences.'}

              {/* Admin Descriptions */}
              {activeTab === 'ADMIN_SETTINGS' && (
                adminSubTab === 'APP_SETTINGS' ? 'Configure currency, date formats, voucher numbering, approval policies, and module settings.' :
                adminSubTab === 'USER_MGMT' ? 'Add, modify, and manage user credentials, roles, and reporting hierarchy.' :
                adminSubTab === 'INTEGRATIONS' ? 'Manage Microsoft Power Automate Webhook connectors, sender config, and Cloudinary attachments.' :
                adminSubTab === 'TEMPLATES' ? 'Customize and preview notification email templates for disbursements, deposits, and approvals.' :
                adminSubTab === 'SYSTEM_AUDIT' ? 'Complete chronological immutable audit logs of transactions, user access, and system events.' :
                'Export JSON backups, restore workspace states, and manage category limits.'
              )}
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
              {/* CRM VIEWS */}
              {activeTab === 'CRM_DASHBOARD' && (
                <CRMDashboardView 
                  accounts={crmAccounts}
                  contacts={crmContacts}
                  opportunities={crmOpportunities}
                  crmSettings={crmSettings}
                  currentUser={currentUser}
                  appSettings={appSettings}
                  onNavigateToAccounts={() => setActiveTab('CRM_ACCOUNTS')}
                  onNavigateToContacts={() => setActiveTab('CRM_CONTACTS')}
                  onNavigateToOpportunities={() => setActiveTab('CRM_OPPORTUNITIES')}
                />
              )}
              {activeTab === 'CRM_ACCOUNTS' && (
                <CRMAccountsView
                  accounts={crmAccounts}
                  crmSettings={crmSettings}
                  currentUser={currentUser}
                  users={users}
                  appSettings={appSettings}
                  onAddAccount={handleAddCRMAccount}
                  onUpdateAccount={handleUpdateCRMAccount}
                  onDeleteAccount={handleDeleteCRMAccount}
                />
              )}
              {activeTab === 'CRM_CONTACTS' && (
                <CRMContactsView
                  contacts={crmContacts}
                  accounts={crmAccounts}
                  currentUser={currentUser}
                  users={users}
                  appSettings={appSettings}
                  onAddContact={handleAddCRMContact}
                  onUpdateContact={handleUpdateCRMContact}
                  onDeleteContact={handleDeleteCRMContact}
                />
              )}
              {activeTab === 'CRM_OPPORTUNITIES' && (
                <CRMOpportunitiesView
                  opportunities={crmOpportunities}
                  accounts={crmAccounts}
                  contacts={crmContacts}
                  crmSettings={crmSettings}
                  currentUser={currentUser}
                  users={users}
                  appSettings={appSettings}
                  onAddOpportunity={handleAddCRMOpportunity}
                  onUpdateOpportunity={handleUpdateCRMOpportunity}
                  onDeleteOpportunity={handleDeleteCRMOpportunity}
                  onAddAccount={handleAddCRMAccount}
                  onAddContact={handleAddCRMContact}
                />
              )}

              {/* HRMS VIEW */}
              {activeTab === 'HRMS' && (
                <HRMSPlaceholderView />
              )}

              {/* CASH BOOK (PETTY CASH) VIEWS */}
              {activeTab === 'CASHBOOK_DASHBOARD' && (
                <DashboardView 
                  transactions={transactions} 
                  categories={categories} 
                  currentUser={currentUser}
                  onNavigateToRegister={() => setActiveTab('CASHBOOK_OUTWARD')}
                  appSettings={appSettings}
                />
              )}
              {activeTab === 'CASHBOOK_INWARD' && (
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
              {activeTab === 'CASHBOOK_OUTWARD' && (
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
              {activeTab === 'CASHBOOK_APPROVALS' && (
                <ApprovalsView 
                  transactions={transactions}
                  categories={categories}
                  currentUser={currentUser}
                  users={users}
                  onApproveRequest={handleApproveRequest}
                  onPayRequest={handlePayRequest}
                  onRejectRequest={handleRejectRequest}
                  onReRouteRequest={handleReRouteRequest}
                  appSettings={appSettings}
                />
              )}
              {(activeTab === 'CASHBOOK_SETTINGS' || activeTab === 'SETTINGS') && (
                <SettingsView 
                  currentUser={currentUser} 
                  onUpdateUser={handleUpdateUser} 
                  crmSettings={crmSettings}
                  appSettings={appSettings}
                  onUpdateAppSettings={handleUpdateAppSettings}
                  availableModules={APP_MODULES.map(m => ({ id: m.id, label: m.label }))}
                />
              )}

              {/* ADMIN SETTINGS VIEW */}
              {activeTab === 'ADMIN_SETTINGS' && (
                <AdminSettingsView 
                  currentUser={currentUser}
                  appSettings={appSettings}
                  onUpdateAppSettings={handleUpdateAppSettings}
                  integrationSettings={integrationSettings}
                  onUpdateIntegrationSettings={handleUpdateIntegrationSettings}
                  crmSettings={crmSettings}
                  onUpdateCRMSettings={handleUpdateCRMSettings}
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
                  activeSubTab={adminSubTab}
                  onSubTabChange={setAdminSubTab}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

    </div>
  );
}
