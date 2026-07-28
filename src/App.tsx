import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  LayoutDashboard, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  FileText, 
  Settings, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  IndianRupee
} from 'lucide-react';
import { User, Transaction, CategoryLimit, ActivityLog, TransactionStatus, UserRole, AppSettings } from './types';
import { MOCK_USERS, MOCK_CATEGORIES, INITIAL_TRANSACTIONS, INITIAL_LOGS, DEFAULT_APP_SETTINGS } from './data';
import { db, collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc } from './firebase';
import { sendSmsNotification, sendEmailNotification } from './services/notificationService';

// Subcomponents
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import RegisterView from './components/RegisterView';
import SettingsView from './components/SettingsView';
import AdminSettingsView from './components/AdminSettingsView';

type NavigationTab = 'DASHBOARD' | 'INWARD' | 'OUTWARD' | 'SETTINGS' | 'ADMIN_SETTINGS';

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
          } else {
            localStorage.setItem('petty_cash_db_seeded', 'true');
          }
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
            snapshot.forEach((d) => list.push(d.data() as Transaction));
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(list);
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
          } else {
            snapshot.forEach((d) => {
              if (d.id === 'config') {
                setAppSettings(d.data() as AppSettings);
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

    addLog('TXN_CREATE', `Logged cash voucher reference ${newTxn.reference} of ${appSettings.currencySymbol}${newTxn.amount.toFixed(2)} under ${newTxn.category} (Merchant: ${newTxn.merchant})`);

    // Dispatch automated SMS & Email alerts
    sendSmsNotification('NEW', newTxn, currentUser, updatedTxnsList, appSettings);
    sendEmailNotification('NEW', newTxn, currentUser, updatedTxnsList, appSettings);
  };

  // Handler: Update transaction (for edits)
  const handleUpdateTransaction = (updatedTxn: Transaction) => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    let finalTxn = updatedTxn;
    const target = transactions.find(t => t.id === updatedTxn.id);
    if (!target) return;

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
        ...updatedTxn,
        editHistory: target.editHistory
      };
    }

    const updatedTxnsList = transactions.map(t => t.id === updatedTxn.id ? finalTxn : t);
    setTransactions(updatedTxnsList);
    setDoc(doc(db, 'transactions', updatedTxn.id), finalTxn).catch(e => console.warn(e));

    addLog('TXN_UPDATE', `Modified transaction reference ${updatedTxn.reference} (${updatedTxn.type === 'IN' ? 'Deposit' : 'Disbursement'})`);

    // Dispatch automated SMS & Email alerts with dynamic changed fields
    if (changes.length > 0) {
      const changedFieldLabels = changes.map(c => c.field);
      sendSmsNotification('EDIT', finalTxn, currentUser, updatedTxnsList, appSettings, changedFieldLabels);
      sendEmailNotification('EDIT', finalTxn, currentUser, updatedTxnsList, appSettings, changedFieldLabels);
    }
  };

  // Handler: Delete transaction
  const handleDeleteTransaction = (id: string) => {
    if (!currentUser) return;
    const targetTxn = transactions.find(t => t.id === id);
    if (!targetTxn) return;

    setTransactions(prev => prev.filter(t => t.id !== id));
    deleteDoc(doc(db, 'transactions', id)).catch(e => console.warn(e));

    addLog('TXN_DELETE', `Deleted transaction reference ${targetTxn.reference} of ${appSettings.currencySymbol}${targetTxn.amount.toFixed(2)}`);
  };

  // Handler: Admin Claims Authorization
  const handleUpdateStatus = (id: string, status: TransactionStatus) => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    updateDoc(doc(db, 'transactions', id), { status }).catch(e => console.warn(e));

    const targetTxn = transactions.find(t => t.id === id);
    if (targetTxn) {
      addLog(
        status === 'APPROVED' ? 'TXN_APPROVE' : 'TXN_REJECT',
        `${status === 'APPROVED' ? 'Approved' : 'Rejected'} cash voucher reference ${targetTxn.reference} (${appSettings.currencySymbol}${targetTxn.amount.toFixed(2)})`
      );

      if (status === 'APPROVED' && targetTxn.type === 'OUT') {
        const updatedCats = categories.map(cat => {
          if (cat.name === targetTxn.category) {
            const newSpent = cat.spent + targetTxn.amount;
            updateDoc(doc(db, 'categories', String(cat.id)), { spent: newSpent }).catch(e => console.warn(e));
            return { ...cat, spent: newSpent };
          }
          return cat;
        });
        setCategories(updatedCats);
      }
    }
  };

  // Admin Handler: App Settings
  const handleUpdateAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    setDoc(doc(db, 'app_settings', 'config'), newSettings).catch(e => console.warn(e));
    addLog('APP_SETTINGS_UPDATE', `Updated App Settings (Currency: ${newSettings.currencySymbol}, Format: ${newSettings.dateFormat}, Timezone: ${newSettings.timezone})`);
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

  // Guard: Redirect to secure login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLogin} usersList={users} />;
  }

  const roleTabs = currentUser ? (
    currentUser.role === 'ADMIN' ? [
      { id: 'DASHBOARD' as const, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'INWARD' as const, label: 'Inward', icon: ArrowDownCircle },
      { id: 'OUTWARD' as const, label: 'Outward', icon: ArrowUpCircle },
      { id: 'SETTINGS' as const, label: 'Settings', icon: Settings },
      { id: 'ADMIN_SETTINGS' as const, label: 'Admin Settings', icon: ShieldAlert },
    ] : [
      { id: 'DASHBOARD' as const, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'INWARD' as const, label: 'Inward', icon: ArrowDownCircle },
      { id: 'OUTWARD' as const, label: 'Outward', icon: ArrowUpCircle },
      { id: 'SETTINGS' as const, label: 'Settings', icon: Settings },
    ]
  ) : [];

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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${activeTab === tab.id ? getActiveTabClass(tab.id) : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'}`}
                >
                  <IconComponent className="w-4 h-4 shrink-0" />
                  {tab.label}
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
            className="text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                          className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-bold transition-all text-left ${activeTab === tab.id ? getActiveTabClass(tab.id) : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'}`}
                        >
                          <IconComponent className="w-4.5 h-4.5 shrink-0" />
                          {tab.label}
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
              {activeTab === 'SETTINGS' && <Settings className="w-5 h-5 text-slate-600" />}
              {activeTab === 'ADMIN_SETTINGS' && <ShieldAlert className="w-5 h-5 text-[#f7b944]" />}
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                {activeTab === 'DASHBOARD' && 'Financial Overview'}
                {activeTab === 'INWARD' && 'Inward Cash Registry'}
                {activeTab === 'OUTWARD' && 'Outward Expenses Registry'}
                {activeTab === 'SETTINGS' && 'User Settings & Security'}
                {activeTab === 'ADMIN_SETTINGS' && 'Administrator Control Node'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {activeTab === 'DASHBOARD' && 'Overview of inflows, record disbursements, and monitor petty cash balances.'}
              {activeTab === 'INWARD' && 'Log and record of deposits.'}
              {activeTab === 'OUTWARD' && 'Record cash disbursements and track voucher disbursements.'}
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
