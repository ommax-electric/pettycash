import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, 
  Users, 
  History, 
  Database, 
  Plus, 
  Pencil, 
  Trash2, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  Tag, 
  Globe, 
  UserPlus, 
  X, 
  Save,
  Lock,
  Shield,
  Activity,
  Key,
  FileSpreadsheet,
  Info,
  Server,
  Terminal,
  Layers,
  RefreshCw,
  FolderPlus,
  Check,
  Share2,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Folder,
  FolderCheck,
  Cloud,
  Briefcase,
  Building2,
  FileText
} from 'lucide-react';
import { User, CategoryLimit, ActivityLog, AppSettings, IntegrationSettings, UserRole, Transaction } from '../types';
import { CRMSettings, DEFAULT_CRM_SETTINGS } from '../crm/types';
import { formatTimestampInTimezone } from '../utils';
import { sendEmailNotification, calculateCashBalance } from '../services/notificationService';
import { substituteSampleTags, parseBodyTextToBlocks, buildModernHtmlEmailFromText } from '../utils/emailTemplate';
import { convertExternalUrlToDataUrl, uploadFileToCloudinary, testCloudinaryConnection } from '../services/fileAttachmentService';
import { db, doc, updateDoc } from '../firebase';

export type AdminTab = 'APP_SETTINGS' | 'USER_MGMT' | 'INTEGRATIONS' | 'TEMPLATES' | 'SYSTEM_AUDIT' | 'SYSTEM_OPERATIONS';

export interface AdminSettingsViewProps {
  currentUser: User;
  appSettings: AppSettings;
  onUpdateAppSettings: (newSettings: AppSettings) => void;
  integrationSettings?: IntegrationSettings;
  onUpdateIntegrationSettings?: (newSettings: IntegrationSettings) => void;
  crmSettings?: CRMSettings;
  onUpdateCRMSettings?: (settings: CRMSettings) => Promise<void> | void;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (username: string) => void;
  categories: CategoryLimit[];
  onAddCategory: (cat: CategoryLimit) => void;
  onUpdateCategory: (cat: CategoryLimit) => void;
  onDeleteCategory: (catName: string) => void;
  logs: ActivityLog[];
  transactions: Transaction[];
  onUpdateTransaction?: (updatedTxn: Transaction) => void;
  onBackupData: () => void;
  onRestoreData: (jsonContent: string) => boolean | Promise<boolean>;
  onWipeAllData: () => void | Promise<void>;
  activeSubTab?: AdminTab;
  onSubTabChange?: (tab: AdminTab) => void;
}

export default function AdminSettingsView({
  currentUser,
  appSettings,
  onUpdateAppSettings,
  integrationSettings,
  onUpdateIntegrationSettings,
  crmSettings,
  onUpdateCRMSettings,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  logs,
  transactions,
  onUpdateTransaction,
  onBackupData,
  onRestoreData,
  onWipeAllData,
  activeSubTab,
  onSubTabChange
}: AdminSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>(activeSubTab || 'APP_SETTINGS');
  const [appSettingsSubTab, setAppSettingsSubTab] = useState<'PETTY_CASH' | 'CRM' | 'HRMS'>('PETTY_CASH');
  const [templatesSubTab, setTemplatesSubTab] = useState<'PETTY_CASH' | 'CRM' | 'HRMS'>('PETTY_CASH');

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // --- 1. App Settings Form State ---
  const defaultSampleStamp = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><circle cx='80' cy='80' r='74' fill='none' stroke='%231d4ed8' stroke-width='3.5' stroke-dasharray='7 3'/><circle cx='80' cy='80' r='66' fill='none' stroke='%231e40af' stroke-width='2.5'/><circle cx='80' cy='80' r='48' fill='none' stroke='%231e40af' stroke-width='1.5'/><path id='c1' fill='none' d='M 28,80 A 52,52 0 1,1 132,80' /><text fill='%231e40af' font-size='9.5' font-weight='800' font-family='sans-serif' letter-spacing='1.2'><textPath href='%23c1' startOffset='50%' text-anchor='middle'>OMMAX ELECTRIC PVT LTD</textPath></text><path id='c2' fill='none' d='M 132,80 A 52,52 0 1,1 28,80' /><text fill='%231e40af' font-size='8.5' font-weight='700' font-family='sans-serif' letter-spacing='1'><textPath href='%23c2' startOffset='50%' text-anchor='middle'>★ APPROVED & AUDITED ★</textPath></text><polygon points='80,60 85,74 100,74 88,83 93,98 80,89 67,98 72,83 60,74 75,74' fill='%232563eb'/><text x='80' y='110' text-anchor='middle' fill='%231e40af' font-size='9' font-weight='900' font-family='sans-serif' letter-spacing='0.5'>PETTY CASH</text></svg>`;

  const [formCurrency, setFormCurrency] = useState(appSettings.currencySymbol);
  const [formDateFormat, setFormDateFormat] = useState(appSettings.dateFormat);
  const [formTimezone, setFormTimezone] = useState(appSettings.timezone);
  const [stampEnabled, setStampEnabled] = useState<boolean>(appSettings.companyStampEnabled !== false);
  const [stampUrl, setStampUrl] = useState<string>(appSettings.companyStampUrl || defaultSampleStamp);
  const [stampRotate, setStampRotate] = useState<number>(appSettings.companyStampRotate ?? -12);
  const [stampOpacity, setStampOpacity] = useState<number>(appSettings.companyStampOpacity ?? 0.85);
  const [stampWidth, setStampWidth] = useState<number>(appSettings.companyStampWidth ?? 85);
  const [allowManualVoucher, setAllowManualVoucher] = useState<boolean>(appSettings.allowManualVoucherNumbering || false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    setFormCurrency(appSettings.currencySymbol);
    setFormDateFormat(appSettings.dateFormat);
    setFormTimezone(appSettings.timezone);
    setStampEnabled(appSettings.companyStampEnabled !== false);
    setStampUrl(appSettings.companyStampUrl || defaultSampleStamp);
    setStampRotate(appSettings.companyStampRotate ?? -12);
    setStampOpacity(appSettings.companyStampOpacity ?? 0.85);
    setStampWidth(appSettings.companyStampWidth ?? 85);
    setAllowManualVoucher(appSettings.allowManualVoucherNumbering || false);
  }, [appSettings]);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image file size should be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setStampUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Category Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryLimit | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'IN' | 'OUT' | 'BOTH'>('OUT');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catError, setCatError] = useState('');
  const [catDeleteError, setCatDeleteError] = useState('');
  const [deleteConfirmCatName, setDeleteConfirmCatName] = useState<string | null>(null);

  // CRM Settings State for Industry & Business Category Management
  const currentCrmSettings = crmSettings || DEFAULT_CRM_SETTINGS;
  const [isIndustryModalOpen, setIsIndustryModalOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<string | null>(null);
  const [industryNameInput, setIndustryNameInput] = useState('');
  const [industryError, setIndustryError] = useState('');
  const [deleteConfirmIndustry, setDeleteConfirmIndustry] = useState<string | null>(null);

  const [isBizCatModalOpen, setIsBizCatModalOpen] = useState(false);
  const [editingBizCat, setEditingBizCat] = useState<string | null>(null);
  const [bizCatNameInput, setBizCatNameInput] = useState('');
  const [bizCatError, setBizCatError] = useState('');
  const [deleteConfirmBizCat, setDeleteConfirmBizCat] = useState<string | null>(null);

  // --- 2. User Management State ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const [userEmpId, setUserEmpId] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('CUSTODIAN');
  const [userReportingTo, setUserReportingTo] = useState<string>('');
  const [userError, setUserError] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<{ [username: string]: boolean }>({});

  // --- 3. System Audit Filter State ---
  const [auditFilterAction, setAuditFilterAction] = useState<string>('ALL');

  // --- 4. System Operations State ---
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');

  // Batch Migration State for Legacy Cloudinary/External Attachments
  const [isMigratingAttachments, setIsMigratingAttachments] = useState(false);
  const [migrationStatusMsg, setMigrationStatusMsg] = useState<string | null>(null);

  const legacyAttachmentsCount = (transactions || []).filter(t => t.receiptUrl && t.receiptUrl.startsWith('http')).length;

  const handleBatchMigrateAttachments = async () => {
    setIsMigratingAttachments(true);
    setMigrationStatusMsg('Starting legacy attachment conversion & pull to Firestore...');
    const legacyTxns = (transactions || []).filter(t => t.receiptUrl && t.receiptUrl.startsWith('http'));
    
    if (legacyTxns.length === 0) {
      setMigrationStatusMsg('All attachments are already stored natively in Firestore! No legacy external URLs found.');
      setIsMigratingAttachments(false);
      return;
    }

    let successCount = 0;
    for (let i = 0; i < legacyTxns.length; i++) {
      const txn = legacyTxns[i];
      setMigrationStatusMsg(`Pulling & Converting attachment ${i + 1} of ${legacyTxns.length} (Voucher: ${txn.reference || txn.id})...`);
      try {
        const dataUrl = await convertExternalUrlToDataUrl(txn.receiptUrl!);
        if (dataUrl) {
          await updateDoc(doc(db, 'transactions', txn.id), { receiptUrl: dataUrl });
          if (onUpdateTransaction) {
            onUpdateTransaction({ ...txn, receiptUrl: dataUrl });
          }
          successCount++;
        }
      } catch (e) {
        console.warn('Batch migration failed for transaction:', txn.id, e);
      }
    }

    setIsMigratingAttachments(false);
    setMigrationStatusMsg(`Migration Complete! Successfully pulled & migrated ${successCount} of ${legacyTxns.length} legacy attachments directly into Firestore.`);
  };


  // --- 5. Integration Settings State (Email Alerts) ---

  const [openEmailAccordions, setOpenEmailAccordions] = useState<Record<string, boolean>>({

    config: true,
    new: false,
    edit: false,
    inward: false,
    inwardEdit: false,
    reqSubmitted: false,
    reqApproved: false,
    reqPaid: false,
    reqRejected: false,
    reqRerouted: false
  });

  const toggleEmailAccordion = (key: string) => {
    setOpenEmailAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Integration Sub-tab switcher state ('STORAGE' | 'EMAIL')
  const [integrationSubTab, setIntegrationSubTab] = useState<'STORAGE' | 'EMAIL'>('STORAGE');

  // Email State (Microsoft Graph API for Office 365 / Shared Mailbox)
  const [emailEnabled, setEmailEnabled] = useState<boolean>(() => {
    return integrationSettings?.emailEnabled ?? (localStorage.getItem('petty_cash_email_enabled') !== 'false');
  });

  // --- Cloudinary Storage Integration State ---
  const [cloudinaryEnabled, setCloudinaryEnabled] = useState<boolean>(() => {
    return integrationSettings?.cloudinaryEnabled ?? (localStorage.getItem('cloudinary_enabled') === 'true');
  });
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState<string>(() => {
    return integrationSettings?.cloudinaryCloudName || localStorage.getItem('cloudinary_cloud_name') || '';
  });
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState<string>(() => {
    return integrationSettings?.cloudinaryApiKey || localStorage.getItem('cloudinary_api_key') || '';
  });
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState<string>(() => {
    return integrationSettings?.cloudinaryApiSecret || localStorage.getItem('cloudinary_api_secret') || '';
  });
  const [showCloudinarySecret, setShowCloudinarySecret] = useState<boolean>(false);
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState<string>(() => {
    return integrationSettings?.cloudinaryUploadPreset || localStorage.getItem('cloudinary_upload_preset') || '';
  });

  const [cloudinaryTestStatus, setCloudinaryTestStatus] = useState<{ loading: boolean; message: string | null; success: boolean | null }>({
    loading: false,
    message: null,
    success: null
  });

  const [cloudinaryMigrationStatus, setCloudinaryMigrationStatus] = useState<{
    loading: boolean;
    message: string | null;
    successCount: number;
    totalCount: number;
  }>({
    loading: false,
    message: null,
    successCount: 0,
    totalCount: 0
  });

  const handleTestCloudinaryConnection = async () => {
    if (!cloudinaryCloudName.trim()) {
      setCloudinaryTestStatus({
        loading: false,
        message: 'Please enter your Cloudinary Cloud Name before testing.',
        success: false
      });
      return;
    }

    setCloudinaryTestStatus({ loading: true, message: 'Verifying connection to Cloudinary API...', success: null });

    const result = await testCloudinaryConnection({
      cloudName: cloudinaryCloudName.trim(),
      apiKey: cloudinaryApiKey.trim(),
      apiSecret: cloudinaryApiSecret.trim(),
      uploadPreset: cloudinaryUploadPreset.trim()
    });

    if (result.success) {
      setCloudinaryTestStatus({
        loading: false,
        message: result.message,
        success: true
      });
    } else {
      setCloudinaryTestStatus({
        loading: false,
        message: result.message,
        success: false
      });
    }
  };

  const handleSaveCloudinarySettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: IntegrationSettings = {
      ...integrationSettings,
      emailEnabled,
      msTenantId,
      msClientId,
      msClientSecret,
      msSenderEmail,
      msSenderName,
      emailRecipients,
      emailSubjectNew,
      emailBodyNew,
      emailSubjectEdit,
      emailBodyEdit,
      emailSubjectInward,
      emailBodyInward,
      emailSubjectInwardEdit,
      emailBodyInwardEdit,
      emailSubjectRequestSubmitted: emailSubjectReqSubmitted,
      emailBodyRequestSubmitted: emailBodyReqSubmitted,
      emailSubjectRequestApproved: emailSubjectReqApproved,
      emailBodyRequestApproved: emailBodyReqApproved,
      emailSubjectRequestPaid: emailSubjectReqPaid,
      emailBodyRequestPaid: emailBodyReqPaid,
      emailSubjectRequestRejected: emailSubjectReqRejected,
      emailBodyRequestRejected: emailBodyReqRejected,
      cloudinaryEnabled,
      cloudinaryCloudName: cloudinaryCloudName.trim(),
      cloudinaryApiKey: cloudinaryApiKey.trim(),
      cloudinaryApiSecret: cloudinaryApiSecret.trim(),
      cloudinaryUploadPreset: cloudinaryUploadPreset.trim()
    };

    localStorage.setItem('cloudinary_enabled', String(cloudinaryEnabled));
    localStorage.setItem('cloudinary_cloud_name', cloudinaryCloudName.trim());
    localStorage.setItem('cloudinary_api_key', cloudinaryApiKey.trim());
    localStorage.setItem('cloudinary_api_secret', cloudinaryApiSecret.trim());
    localStorage.setItem('cloudinary_upload_preset', cloudinaryUploadPreset.trim());

    if (onUpdateIntegrationSettings) {
      onUpdateIntegrationSettings(updated);
    }

    setIntegrationSuccess('Cloudinary Cloud Storage settings saved successfully!');
    setTimeout(() => setIntegrationSuccess(''), 3500);
  };

  const handleMigrateFirestoreToCloudinary = async () => {
    if (!cloudinaryCloudName.trim()) {
      alert('Please configure and save your Cloudinary Cloud Name before starting migration.');
      return;
    }

    // Auto-save current Cloudinary settings first
    handleSaveCloudinarySettings();

    const base64Txns = (transactions || []).filter(t => {
      if (!t.receiptUrl) return false;
      if (t.receiptUrl.startsWith('data:')) return true;
      if (!t.receiptUrl.includes('cloudinary.com')) return true;
      const cleanUrl = t.receiptUrl.split('?')[0];
      return !/\.(pdf|png|jpg|jpeg|webp|gif|svg)$/i.test(cleanUrl);
    });

    if (base64Txns.length === 0) {
      setCloudinaryMigrationStatus({
        loading: false,
        message: 'All attachments are already hosted on Cloudinary with proper file formats! No pending attachments found to migrate.',
        successCount: 0,
        totalCount: 0
      });
      return;
    }

    setCloudinaryMigrationStatus({
      loading: true,
      message: `Starting migration of ${base64Txns.length} attachments to Cloudinary cloud '${cloudinaryCloudName.trim()}'...`,
      successCount: 0,
      totalCount: base64Txns.length
    });

    let successCount = 0;
    let failCount = 0;
    let lastErrorMsg = '';

    for (let i = 0; i < base64Txns.length; i++) {
      const txn = base64Txns[i];
      const [yyyy, mm] = (txn.date || new Date().toISOString().split('T')[0]).split('-');
      const folderPath = `Petty Cash/${yyyy || '2026'}/${mm || '08'}`;
      const refClean = (txn.reference || txn.id || 'voucher').replace(/[^a-zA-Z0-9_-]/g, '');

      setCloudinaryMigrationStatus(prev => ({
        ...prev,
        message: `Uploading attachment ${i + 1} of ${base64Txns.length} (Voucher #${txn.reference || txn.id})... [Success: ${successCount}, Failed: ${failCount}]`
      }));

      try {
        let rawDataUrl: string | null = txn.receiptUrl!;
        if (!rawDataUrl.startsWith('data:')) {
          rawDataUrl = await convertExternalUrlToDataUrl(txn.receiptUrl!);
        }

        if (!rawDataUrl) {
          failCount++;
          lastErrorMsg = `Could not fetch external file for Voucher #${txn.reference || txn.id}`;
          console.warn(`[Migration Error] ${lastErrorMsg}`);
          continue;
        }

        let ext = 'png';
        if (rawDataUrl.startsWith('data:application/pdf')) ext = 'pdf';
        else if (rawDataUrl.startsWith('data:image/jpeg') || rawDataUrl.startsWith('data:image/jpg')) ext = 'jpg';
        else if (rawDataUrl.startsWith('data:image/png')) ext = 'png';
        else if (rawDataUrl.startsWith('data:image/webp')) ext = 'webp';

        let origName = (txn.receiptName || '').trim();
        if (!origName || origName.toLowerCase() === 'receipt' || origName.toLowerCase() === 'attachment') {
          origName = `file.${ext}`;
        } else if (!origName.includes('.')) {
          origName = `${origName}.${ext}`;
        }

        const sanitizedName = origName.replace(/[^a-zA-Z0-9_.-]/g, '_');

        const filePublicId = sanitizedName;

        const uploadRes = await uploadFileToCloudinary(rawDataUrl, filePublicId, folderPath, {
          cloudName: cloudinaryCloudName.trim(),
          apiKey: cloudinaryApiKey.trim(),
          apiSecret: cloudinaryApiSecret.trim(),
          uploadPreset: cloudinaryUploadPreset.trim()
        });

        if (uploadRes.success && uploadRes.url) {
          await updateDoc(doc(db, 'transactions', txn.id), {
            receiptUrl: uploadRes.url,
            receiptName: filePublicId
          });
          if (onUpdateTransaction) {
            onUpdateTransaction({
              ...txn,
              receiptUrl: uploadRes.url,
              receiptName: filePublicId
            });
          }
          successCount++;
        } else {
          failCount++;
          lastErrorMsg = uploadRes.error || 'Cloudinary upload rejected file';
          console.warn(`[Migration Error] Voucher #${txn.reference || txn.id}:`, uploadRes.error);
        }
      } catch (err: any) {
        failCount++;
        lastErrorMsg = err.message || 'Unknown processing error';
        console.warn(`Migration error for transaction ${txn.id}:`, err);
      }
    }

    setCloudinaryMigrationStatus({
      loading: false,
      message: `Migration Completed! Successfully migrated ${successCount} of ${base64Txns.length} attachments to Cloudinary cloud '${cloudinaryCloudName.trim()}'.${failCount > 0 ? ` (${failCount} failed. Last error: ${lastErrorMsg})` : ''}`,
      successCount,
      totalCount: base64Txns.length
    });
  };
  const [msTenantId, setMsTenantId] = useState<string>(() => {
    return integrationSettings?.msTenantId || localStorage.getItem('ms_graph_tenant_id') || 'a63883ba-4173-48a2-a29d-247ca0c8e59a';
  });
  const [msClientId, setMsClientId] = useState<string>(() => {
    return integrationSettings?.msClientId || localStorage.getItem('ms_graph_client_id') || 'cf54c887-7846-4cc7-8c4c-ed9d407d07d6';
  });
  const [msClientSecret, setMsClientSecret] = useState<string>(() => {
    return integrationSettings?.msClientSecret || localStorage.getItem('ms_graph_client_secret') || 'G0_8Q~QEhThZjfB8yvfs2eVIWan_GQ2_toG4kcUz';
  });
  const [showMsSecret, setShowMsSecret] = useState<boolean>(false);
  const [msSenderEmail, setMsSenderEmail] = useState<string>(() => {
    return integrationSettings?.msSenderEmail || localStorage.getItem('ms_graph_sender_email') || 'mail@ommaxelectric.com';
  });
  const [msSenderName, setMsSenderName] = useState<string>(() => {
    return integrationSettings?.msSenderName || localStorage.getItem('ms_graph_sender_name') || 'Petty Cash';
  });
  const [emailRecipients, setEmailRecipients] = useState<string>(() => {
    return integrationSettings?.emailRecipients || localStorage.getItem('petty_cash_email_recipients') || 'info@ommaxelectric.com, admin@ommaxelectric.com';
  });

  // Email Templates: New Voucher, Voucher Modifications, Inward Deposit & Deposit Changes
  const [emailSubjectNew, setEmailSubjectNew] = useState<string>(() => {
    return integrationSettings?.emailSubjectNew || localStorage.getItem('petty_cash_email_subject_new') || '[Petty Cash Alert] New Voucher #{voucher_id} - {amount} ({category})';
  });
  const [emailBodyNew, setEmailBodyNew] = useState<string>(() => {
    const saved = integrationSettings?.emailBodyNew || localStorage.getItem('petty_cash_email_body_new');
    if (!saved || !saved.includes('{particulars}')) {
      return 'Hello Finance Team,\n\nA new petty cash voucher has been registered:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.';
    }
    return saved;
  });
  const [emailSubjectEdit, setEmailSubjectEdit] = useState<string>(() => {
    return integrationSettings?.emailSubjectEdit || localStorage.getItem('petty_cash_email_subject_edit') || '[Petty Cash Changes Alert] Voucher #{voucher_id} Modified ({changed_fields}) - {amount}';
  });
  const [emailBodyEdit, setEmailBodyEdit] = useState<string>(() => {
    const saved = integrationSettings?.emailBodyEdit || localStorage.getItem('petty_cash_email_body_edit');
    if (!saved || !saved.includes('{particulars}')) {
      return 'Hello Finance Team,\n\nChanges Alert for Petty Cash Voucher #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.';
    }
    return saved;
  });
  const [emailSubjectInward, setEmailSubjectInward] = useState<string>(() => {
    return integrationSettings?.emailSubjectInward || localStorage.getItem('petty_cash_email_subject_inward') || '[Petty Cash Alert] Inward Deposit #{voucher_id} - {amount} ({category})';
  });
  const [emailBodyInward, setEmailBodyInward] = useState<string>(() => {
    const saved = integrationSettings?.emailBodyInward || localStorage.getItem('petty_cash_email_body_inward');
    if (!saved || !saved.includes('{particulars}')) {
      return 'Hello Finance Team,\n\nA new petty cash inward deposit has been recorded:\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.';
    }
    return saved;
  });
  const [emailSubjectInwardEdit, setEmailSubjectInwardEdit] = useState<string>(() => {
    return integrationSettings?.emailSubjectInwardEdit || localStorage.getItem('petty_cash_email_subject_inward_edit') || '[Petty Cash Deposit Changes Alert] Deposit #{voucher_id} Modified ({changed_fields}) - {amount}';
  });
  const [emailBodyInwardEdit, setEmailBodyInwardEdit] = useState<string>(() => {
    const saved = integrationSettings?.emailBodyInwardEdit || localStorage.getItem('petty_cash_email_body_inward_edit');
    if (!saved || !saved.includes('{particulars}')) {
      return 'Hello Finance Team,\n\nDeposit Changes Alert for Petty Cash Deposit #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.';
    }
    return saved;
  });

  // Approval Workflow Email Templates: Request Submitted, Approved, Paid, Rejected
  const [emailSubjectReqSubmitted, setEmailSubjectReqSubmitted] = useState<string>(() => {
    return integrationSettings?.emailSubjectRequestSubmitted || localStorage.getItem('petty_cash_email_subject_req_submitted') || '[Petty Cash Request] New Claim #{voucher_id} - {amount} requested by {paid_to}';
  });
  const [emailBodyReqSubmitted, setEmailBodyReqSubmitted] = useState<string>(() => {
    return integrationSettings?.emailBodyRequestSubmitted || localStorage.getItem('petty_cash_email_body_req_submitted') || 'Hello Manager / Approver,\n\nA new petty cash claim has been submitted for your approval:\n\nVoucher ID: #{voucher_id}\nRequested By: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nRemarks: {remarks}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review and approve this request in the Petty Cash Portal.';
  });
  const [emailSubjectReqApproved, setEmailSubjectReqApproved] = useState<string>(() => {
    return integrationSettings?.emailSubjectRequestApproved || localStorage.getItem('petty_cash_email_subject_req_approved') || '[Action Required] Claim #{voucher_id} - {amount} Approved - Issue Cash';
  });
  const [emailBodyReqApproved, setEmailBodyReqApproved] = useState<string>(() => {
    return integrationSettings?.emailBodyRequestApproved || localStorage.getItem('petty_cash_email_body_req_approved') || 'Hello Finance Admin & Claimant,\n\nPetty cash voucher #{voucher_id} requested by {paid_to} has been APPROVED by {approved_by} and is ready for payment disbursement:\n\nVoucher ID: #{voucher_id}\nClaimant / Paid To: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nApproved By: {approved_by}\nDate: {date}\nRemarks: {remarks}\n\nCurrent Cash Balance: {balance}\n\nPlease log in to the Petty Cash Portal to issue cash and mark as paid.';
  });
  const [emailSubjectReqPaid, setEmailSubjectReqPaid] = useState<string>(() => {
    return integrationSettings?.emailSubjectRequestPaid || localStorage.getItem('petty_cash_email_subject_req_paid') || '[Petty Cash Paid] Voucher #{voucher_id} - {amount} Issued';
  });
  const [emailBodyReqPaid, setEmailBodyReqPaid] = useState<string>(() => {
    return integrationSettings?.emailBodyRequestPaid || localStorage.getItem('petty_cash_email_body_req_paid') || 'Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} has been DISBURSED and marked as PAID by {paid_by}:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nIssued / Paid By: {paid_by}\nApproved By: {approved_by}\n\nCurrent Cash Balance: {balance}\n\nThank you.';
  });
  const [emailSubjectReqRejected, setEmailSubjectReqRejected] = useState<string>(() => {
    return integrationSettings?.emailSubjectRequestRejected || localStorage.getItem('petty_cash_email_subject_req_rejected') || '[Petty Cash Rejected] Claim #{voucher_id} - {amount}';
  });
  const [emailBodyReqRejected, setEmailBodyReqRejected] = useState<string>(() => {
    return integrationSettings?.emailBodyRequestRejected || localStorage.getItem('petty_cash_email_body_req_rejected') || 'Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} was REJECTED by {rejected_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nParticulars: {particulars}\nRemarks / Reason: {remarks}\nRejected By: {rejected_by}\n\nPlease contact your manager or admin for further details.';
  });
  const [emailSubjectReqRerouted, setEmailSubjectReqRerouted] = useState<string>(() => {
    return integrationSettings?.emailSubjectRequestRerouted || localStorage.getItem('petty_cash_email_subject_req_rerouted') || '[Petty Cash Re-Route] Approval Request #{voucher_id} Re-Routed to You';
  });
  const DEFAULT_EMAIL_BODY_REQ_REROUTED = 'Hello {re_routed_to},\n\nAn approval request for petty cash claim #{voucher_id} has been re-routed to you by {re_routed_by}:\n\nVoucher ID: #{voucher_id}\nRequested By: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nRe-Route Reason: {re_route_reason}\nRemarks: {remarks}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review and approve this request in the Petty Cash Portal.';

  const [emailBodyReqRerouted, setEmailBodyReqRerouted] = useState<string>(() => {
    const stored = localStorage.getItem('petty_cash_email_body_req_rerouted');
    if (stored && (stored.includes('Mr./Ms.') || stored.includes('Voucher Details:'))) {
      localStorage.setItem('petty_cash_email_body_req_rerouted', DEFAULT_EMAIL_BODY_REQ_REROUTED);
      return DEFAULT_EMAIL_BODY_REQ_REROUTED;
    }
    const fromSettings = integrationSettings?.emailBodyRequestRerouted;
    if (fromSettings && (fromSettings.includes('Mr./Ms.') || fromSettings.includes('Voucher Details:'))) {
      return DEFAULT_EMAIL_BODY_REQ_REROUTED;
    }
    return fromSettings || stored || DEFAULT_EMAIL_BODY_REQ_REROUTED;
  });

  useEffect(() => {
    if (integrationSettings) {
      setEmailEnabled(integrationSettings.emailEnabled);
      setMsTenantId(integrationSettings.msTenantId || 'a63883ba-4173-48a2-a29d-247ca0c8e59a');
      setMsClientId(integrationSettings.msClientId || 'cf54c887-7846-4cc7-8c4c-ed9d407d07d6');
      setMsClientSecret(integrationSettings.msClientSecret || 'G0_8Q~QEhThZjfB8yvfs2eVIWan_GQ2_toG4kcUz');
      setMsSenderEmail(integrationSettings.msSenderEmail || 'mail@ommaxelectric.com');
      setMsSenderName(integrationSettings.msSenderName || 'Petty Cash');
      setEmailRecipients(integrationSettings.emailRecipients || 'info@ommaxelectric.com, admin@ommaxelectric.com');
      setEmailSubjectNew(integrationSettings.emailSubjectNew || '[Petty Cash Alert] New Voucher #{voucher_id} - {amount} ({category})');
      setEmailBodyNew(integrationSettings.emailBodyNew || 'Hello Finance Team,\n\nA new petty cash voucher has been registered:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.');
      setEmailSubjectEdit(integrationSettings.emailSubjectEdit || '[Petty Cash Changes Alert] Voucher #{voucher_id} Modified ({changed_fields}) - {amount}');
      setEmailBodyEdit(integrationSettings.emailBodyEdit || 'Hello Finance Team,\n\nChanges Alert for Petty Cash Voucher #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.');
      setEmailSubjectInward(integrationSettings.emailSubjectInward || '[Petty Cash Alert] Inward Deposit #{voucher_id} - {amount} ({category})');
      setEmailBodyInward(integrationSettings.emailBodyInward || 'Hello Finance Team,\n\nA new petty cash inward deposit has been recorded:\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.');
      setEmailSubjectInwardEdit(integrationSettings.emailSubjectInwardEdit || '[Petty Cash Deposit Changes Alert] Deposit #{voucher_id} Modified ({changed_fields}) - {amount}');
      setEmailBodyInwardEdit(integrationSettings.emailBodyInwardEdit || 'Hello Finance Team,\n\nDeposit Changes Alert for Petty Cash Deposit #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.');
      setEmailSubjectReqSubmitted(integrationSettings.emailSubjectRequestSubmitted || '[Petty Cash Request] New Claim #{voucher_id} - {amount} requested by {paid_to}');
      setEmailBodyReqSubmitted(integrationSettings.emailBodyRequestSubmitted || 'Hello Manager / Approver,\n\nA new petty cash claim has been submitted for your approval:\n\nVoucher ID: #{voucher_id}\nRequested By: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nRemarks: {remarks}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review and approve this request in the Petty Cash Portal.');
      setEmailSubjectReqApproved(integrationSettings.emailSubjectRequestApproved || '[Action Required] Claim #{voucher_id} - {amount} Approved - Issue Cash');
      setEmailBodyReqApproved(integrationSettings.emailBodyRequestApproved || 'Hello Finance Admin & Claimant,\n\nPetty cash voucher #{voucher_id} requested by {paid_to} has been APPROVED by {approved_by} and is ready for payment disbursement:\n\nVoucher ID: #{voucher_id}\nClaimant / Paid To: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nApproved By: {approved_by}\nDate: {date}\nRemarks: {remarks}\n\nCurrent Cash Balance: {balance}\n\nPlease log in to the Petty Cash Portal to issue cash and mark as paid.');
      setEmailSubjectReqPaid(integrationSettings.emailSubjectRequestPaid || '[Petty Cash Paid] Voucher #{voucher_id} - {amount} Issued');
      setEmailBodyReqPaid(integrationSettings.emailBodyRequestPaid || 'Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} has been DISBURSED and marked as PAID by {paid_by}:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nIssued / Paid By: {paid_by}\nApproved By: {approved_by}\n\nCurrent Cash Balance: {balance}\n\nThank you.');
      setEmailSubjectReqRejected(integrationSettings.emailSubjectRequestRejected || '[Petty Cash Rejected] Claim #{voucher_id} - {amount}');
      setEmailBodyReqRejected(integrationSettings.emailBodyRequestRejected || 'Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} was REJECTED by {rejected_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nParticulars: {particulars}\nRemarks / Reason: {remarks}\nRejected By: {rejected_by}\n\nPlease contact your manager or admin for further details.');
      setEmailSubjectReqRerouted(integrationSettings.emailSubjectRequestRerouted || '[Petty Cash Re-Route] Approval Request #{voucher_id} Re-Routed to You');
      const reroutedBody = integrationSettings.emailBodyRequestRerouted;
      if (!reroutedBody || reroutedBody.includes('Mr./Ms.') || reroutedBody.includes('Voucher Details:')) {
        setEmailBodyReqRerouted(DEFAULT_EMAIL_BODY_REQ_REROUTED);
      } else {
        setEmailBodyReqRerouted(reroutedBody);
      }
      setCloudinaryEnabled(integrationSettings.cloudinaryEnabled ?? false);
      setCloudinaryCloudName(integrationSettings.cloudinaryCloudName || '');
      setCloudinaryApiKey(integrationSettings.cloudinaryApiKey || '');
      setCloudinaryApiSecret(integrationSettings.cloudinaryApiSecret || '');
      setCloudinaryUploadPreset(integrationSettings.cloudinaryUploadPreset || '');
    }
  }, [integrationSettings]);

  const [emailPreviewTab, setEmailPreviewTab] = useState<'NEW' | 'EDIT' | 'INWARD'>('NEW');

  const [integrationSuccess, setIntegrationSuccess] = useState<string>('');
  const [testNotificationModal, setTestNotificationModal] = useState<{ title: string; content: string; type: 'SMS' | 'EMAIL' } | null>(null);



  const handleSaveEmailSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: IntegrationSettings = {
      ...integrationSettings,
      cloudinaryEnabled,
      emailEnabled,
      msTenantId,
      msClientId,
      msClientSecret,
      msSenderEmail,
      msSenderName,
      emailRecipients,
      emailSubjectNew,
      emailBodyNew,
      emailSubjectEdit,
      emailBodyEdit,
      emailSubjectInward,
      emailBodyInward,
      emailSubjectInwardEdit,
      emailBodyInwardEdit,
      emailSubjectRequestSubmitted: emailSubjectReqSubmitted,
      emailBodyRequestSubmitted: emailBodyReqSubmitted,
      emailSubjectRequestApproved: emailSubjectReqApproved,
      emailBodyRequestApproved: emailBodyReqApproved,
      emailSubjectRequestPaid: emailSubjectReqPaid,
      emailBodyRequestPaid: emailBodyReqPaid,
      emailSubjectRequestRejected: emailSubjectReqRejected,
      emailBodyRequestRejected: emailBodyReqRejected,
      emailSubjectRequestRerouted: emailSubjectReqRerouted,
      emailBodyRequestRerouted: emailBodyReqRerouted
    };

    if (onUpdateIntegrationSettings) {
      onUpdateIntegrationSettings(updated);
    } else {
      localStorage.setItem('petty_cash_email_enabled', String(emailEnabled));
      localStorage.setItem('ms_graph_tenant_id', msTenantId);
      localStorage.setItem('ms_graph_client_id', msClientId);
      localStorage.setItem('ms_graph_client_secret', msClientSecret);
      localStorage.setItem('ms_graph_sender_email', msSenderEmail);
      localStorage.setItem('ms_graph_sender_name', msSenderName);
      localStorage.setItem('petty_cash_email_recipients', emailRecipients);
      localStorage.setItem('petty_cash_email_subject_new', emailSubjectNew);
      localStorage.setItem('petty_cash_email_body_new', emailBodyNew);
      localStorage.setItem('petty_cash_email_subject_edit', emailSubjectEdit);
      localStorage.setItem('petty_cash_email_body_edit', emailBodyEdit);
      localStorage.setItem('petty_cash_email_subject_inward', emailSubjectInward);
      localStorage.setItem('petty_cash_email_body_inward', emailBodyInward);
      localStorage.setItem('petty_cash_email_subject_inward_edit', emailSubjectInwardEdit);
      localStorage.setItem('petty_cash_email_body_inward_edit', emailBodyInwardEdit);
      localStorage.setItem('petty_cash_email_subject_req_submitted', emailSubjectReqSubmitted);
      localStorage.setItem('petty_cash_email_body_req_submitted', emailBodyReqSubmitted);
      localStorage.setItem('petty_cash_email_subject_req_approved', emailSubjectReqApproved);
      localStorage.setItem('petty_cash_email_body_req_approved', emailBodyReqApproved);
      localStorage.setItem('petty_cash_email_subject_req_paid', emailSubjectReqPaid);
      localStorage.setItem('petty_cash_email_body_req_paid', emailBodyReqPaid);
      localStorage.setItem('petty_cash_email_subject_req_rejected', emailSubjectReqRejected);
      localStorage.setItem('petty_cash_email_body_req_rejected', emailBodyReqRejected);
      localStorage.setItem('petty_cash_email_subject_req_rerouted', emailSubjectReqRerouted);
      localStorage.setItem('petty_cash_email_body_req_rerouted', emailBodyReqRerouted);
    }
    setIntegrationSuccess('Microsoft Graph API configuration & templates saved successfully to Firestore!');
    setTimeout(() => setIntegrationSuccess(''), 3500);
  };

  const handleResetEmailDefaults = () => {
    setEmailSubjectNew('[Petty Cash Alert] New Voucher #{voucher_id} - {amount} ({category})');
    setEmailBodyNew('Hello Finance Team,\n\nA new petty cash voucher has been registered:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.');
    
    setEmailSubjectEdit('[Petty Cash Changes Alert] Voucher #{voucher_id} Modified ({changed_fields}) - {amount}');
    setEmailBodyEdit('Hello Finance Team,\n\nChanges Alert for Petty Cash Voucher #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.');
    
    setEmailSubjectInward('[Petty Cash Alert] Inward Deposit #{voucher_id} - {amount} ({category})');
    setEmailBodyInward('Hello Finance Team,\n\nA new petty cash inward deposit has been recorded:\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.');
    
    setEmailSubjectInwardEdit('[Petty Cash Deposit Changes Alert] Deposit #{voucher_id} Modified ({changed_fields}) - {amount}');
    setEmailBodyInwardEdit('Hello Finance Team,\n\nDeposit Changes Alert for Petty Cash Deposit #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.');
    
    setEmailSubjectReqSubmitted('[Petty Cash Request] New Claim #{voucher_id} - {amount} requested by {paid_to}');
    setEmailBodyReqSubmitted('Hello Manager / Approver,\n\nA new petty cash claim has been submitted for your approval:\n\nVoucher ID: #{voucher_id}\nRequested By: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nRemarks: {remarks}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review and approve this request in the Petty Cash Portal.');
    
    setEmailSubjectReqApproved('[Action Required] Claim #{voucher_id} - {amount} Approved - Issue Cash');
    setEmailBodyReqApproved('Hello Finance Admin & Claimant,\n\nPetty cash voucher #{voucher_id} requested by {paid_to} has been APPROVED by {approved_by} and is ready for payment disbursement:\n\nVoucher ID: #{voucher_id}\nClaimant / Paid To: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nApproved By: {approved_by}\nDate: {date}\nRemarks: {remarks}\n\nCurrent Cash Balance: {balance}\n\nPlease log in to the Petty Cash Portal to issue cash and mark as paid.');
    
    setEmailSubjectReqPaid('[Petty Cash Paid] Voucher #{voucher_id} - {amount} Issued');
    setEmailBodyReqPaid('Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} has been DISBURSED and marked as PAID by {paid_by}:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nIssued / Paid By: {paid_by}\nApproved By: {approved_by}\n\nCurrent Cash Balance: {balance}\n\nThank you.');
    
    setEmailSubjectReqRejected('[Petty Cash Rejected] Claim #{voucher_id} - {amount}');
    setEmailBodyReqRejected('Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} was REJECTED by {rejected_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nParticulars: {particulars}\nRemarks / Reason: {remarks}\nRejected By: {rejected_by}\n\nPlease contact your manager or admin for further details.');
    
    setEmailSubjectReqRerouted('[Petty Cash Re-Route] Approval Request #{voucher_id} Re-Routed to You');
    setEmailBodyReqRerouted(DEFAULT_EMAIL_BODY_REQ_REROUTED);
    
    setIntegrationSuccess('All Petty Cash email templates have been reset to corporate defaults.');
    setTimeout(() => setIntegrationSuccess(''), 3500);
  };

  const handleTestEmail = async () => {
    // Persist current settings first
    localStorage.setItem('petty_cash_email_enabled', 'true');
    localStorage.setItem('ms_graph_tenant_id', msTenantId);
    localStorage.setItem('ms_graph_client_id', msClientId);
    localStorage.setItem('ms_graph_client_secret', msClientSecret);
    localStorage.setItem('ms_graph_sender_email', msSenderEmail);
    localStorage.setItem('ms_graph_sender_name', msSenderName);
    localStorage.setItem('petty_cash_email_recipients', emailRecipients);

    if (!msTenantId.trim() || !msClientId.trim() || !msClientSecret.trim()) {
      setTestNotificationModal({
        title: 'Microsoft Graph API Credentials Required',
        type: 'EMAIL',
        content: `Please enter your Directory (Tenant) ID, Application (Client) ID, and Client Secret from Azure Portal before dispatching a test email.\n\nSender Email: ${msSenderEmail}\nRecipients: ${emailRecipients}`
      });
      return;
    }

    const testTxn: Transaction = emailPreviewTab === 'INWARD' ? {
      id: 'IW-TEST-101',
      type: 'IN',
      amount: 25000,
      category: 'Bank Cash Withdrawal',
      merchant: 'HDFC Bank (Parthiban)',
      description: 'Cash withdrawn from HDFC Bank for Petty Cash replenishment',
      remarks: 'Cheque #CHQ-88290 verified',
      date: new Date().toISOString().split('T')[0],
      status: 'APPROVED',
      recordedBy: currentUser ? currentUser.fullName : 'Admin (Anita)',
      reference: 'IW-101',
      receiptName: 'BankSlip.pdf',
      receiptSize: '2 KB'
    } : {
      id: 'VOUCHER-TEST-104',
      type: 'OUT',
      amount: 3500,
      category: 'Office Supplies',
      merchant: 'Rahul Sharma',
      description: 'A4 printer paper & stationery',
      remarks: 'Invoice #INV-2026-902 attached',
      date: new Date().toISOString().split('T')[0],
      status: 'APPROVED',
      recordedBy: currentUser ? currentUser.fullName : 'Admin (Anita)',
      reference: 'VOUCHER-104',
      receiptName: 'Invoice.pdf',
      receiptSize: '1 KB'
    };

    const currentIntegrationSettings: IntegrationSettings = {
      ...integrationSettings,
      cloudinaryEnabled,
      emailEnabled: true,
      msTenantId,
      msClientId,
      msClientSecret,
      msSenderEmail,
      msSenderName,
      emailRecipients,
      emailSubjectNew,
      emailBodyNew,
      emailSubjectEdit,
      emailBodyEdit,
      emailSubjectInward,
      emailBodyInward
    };

    setIntegrationSuccess('Connecting to Microsoft Identity Platform & Graph API...');

    const result = await sendEmailNotification(
      emailPreviewTab,
      testTxn,
      currentUser,
      transactions,
      appSettings,
      ['Amount', 'Particulars'],
      currentIntegrationSettings
    );

    setTestNotificationModal({
      title: result.success ? 'Microsoft Graph Modern HTML Email Dispatched!' : 'Microsoft Graph Email Dispatch Result',
      type: 'EMAIL',
      content: `Microsoft 365 Tenant ID: ${msTenantId}\nClient ID: ${msClientId}\nFrom Sender: ${msSenderName} <${msSenderEmail}>\nTo Recipients: ${emailRecipients}\nFormat: HTML Only (Modern Card Layout)\n\n========================================\nGRAPH API RESPONSE:\n${result.message}`
    });
    setIntegrationSuccess('');
  };

  // ----------------------------------------------------
  // Handlers for App Settings
  // ----------------------------------------------------
  const handleSaveAppSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAppSettings({
      currencySymbol: formCurrency.trim() || '₹',
      dateFormat: formDateFormat,
      timezone: formTimezone,
      companyStampUrl: stampUrl.trim(),
      companyStampEnabled: stampEnabled,
      companyStampRotate: stampRotate,
      companyStampOpacity: stampOpacity,
      companyStampWidth: stampWidth,
      allowManualVoucherNumbering: allowManualVoucher
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType('OUT');
    setCatColor('#3b82f6');
    setCatError('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CategoryLimit) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type || 'OUT');
    setCatColor(cat.color || '#3b82f6');
    setCatError('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: catName.trim(),
        type: catType,
        color: catColor,
      });
    } else {
      onAddCategory({
        id: `CAT-${Date.now().toString().slice(-4)}`,
        name: catName.trim(),
        type: catType,
        color: catColor,
        budget: 0,
        spent: 0
      });
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategoryDirect = (categoryName: string) => {
    setCatDeleteError('');
    // Check if category is involved in any inward or outward transactions
    const isUsed = transactions.some(
      t => t.category.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );

    if (isUsed) {
      setCatDeleteError(`Cannot delete category "${categoryName}" as it is involved in recorded inward/outward vouchers.`);
      setTimeout(() => setCatDeleteError(''), 6000);
      return;
    }

    // Require user confirmation modal before deleting
    setDeleteConfirmCatName(categoryName);
  };

  // ----------------------------------------------------
  // Handlers for CRM Settings (Industry & Business Category)
  // ----------------------------------------------------
  const openAddIndustryModal = () => {
    setEditingIndustry(null);
    setIndustryNameInput('');
    setIndustryError('');
    setIsIndustryModalOpen(true);
  };

  const openEditIndustryModal = (ind: string) => {
    setEditingIndustry(ind);
    setIndustryNameInput(ind);
    setIndustryError('');
    setIsIndustryModalOpen(true);
  };

  const handleSaveIndustry = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = industryNameInput.trim();
    if (!trimmed) {
      setIndustryError('Industry name is required.');
      return;
    }
    const currentList = currentCrmSettings.industries || [];
    let updatedList: string[];
    if (editingIndustry) {
      updatedList = currentList.map(item => item === editingIndustry ? trimmed : item);
    } else {
      if (currentList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
        setIndustryError('Industry with this name already exists.');
        return;
      }
      updatedList = [...currentList, trimmed];
    }
    if (onUpdateCRMSettings) {
      await onUpdateCRMSettings({
        ...currentCrmSettings,
        industries: updatedList
      });
    }
    setIsIndustryModalOpen(false);
  };

  const handleDeleteIndustryDirect = async (ind: string) => {
    if (onUpdateCRMSettings) {
      const currentList = currentCrmSettings.industries || [];
      await onUpdateCRMSettings({
        ...currentCrmSettings,
        industries: currentList.filter(item => item !== ind)
      });
    }
    setDeleteConfirmIndustry(null);
  };

  const openAddBizCatModal = () => {
    setEditingBizCat(null);
    setBizCatNameInput('');
    setBizCatError('');
    setIsBizCatModalOpen(true);
  };

  const openEditBizCatModal = (cat: string) => {
    setEditingBizCat(cat);
    setBizCatNameInput(cat);
    setBizCatError('');
    setIsBizCatModalOpen(true);
  };

  const handleSaveBizCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = bizCatNameInput.trim();
    if (!trimmed) {
      setBizCatError('Business category name is required.');
      return;
    }
    const currentList = currentCrmSettings.businessCategories || [];
    let updatedList: string[];
    if (editingBizCat) {
      updatedList = currentList.map(item => item === editingBizCat ? trimmed : item);
    } else {
      if (currentList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
        setBizCatError('Business category with this name already exists.');
        return;
      }
      updatedList = [...currentList, trimmed];
    }
    if (onUpdateCRMSettings) {
      await onUpdateCRMSettings({
        ...currentCrmSettings,
        businessCategories: updatedList
      });
    }
    setIsBizCatModalOpen(false);
  };

  const handleDeleteBizCatDirect = async (cat: string) => {
    if (onUpdateCRMSettings) {
      const currentList = currentCrmSettings.businessCategories || [];
      await onUpdateCRMSettings({
        ...currentCrmSettings,
        businessCategories: currentList.filter(item => item !== cat)
      });
    }
    setDeleteConfirmBizCat(null);
  };

  // ----------------------------------------------------
  // Handlers for User Management
  // ----------------------------------------------------
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserFullName('');
    setUserEmpId('');
    setUserUsername('');
    setUserEmail('');
    setUserPassword('');
    setShowModalPassword(false);
    setUserRole('CUSTODIAN');
    setUserReportingTo('');
    setUserError('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setUserFullName(u.fullName);
    setUserEmpId(u.empId || '');
    setUserUsername(u.username);
    setUserEmail(u.email || '');
    setUserPassword(u.password || '');
    setShowModalPassword(false);
    setUserRole(u.role);
    setUserReportingTo(u.reportingTo || '');
    setUserError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!userFullName.trim()) {
      setUserError('Full Name is required.');
      return;
    }

    if (!userEmpId.trim()) {
      setUserError('Employee ID is required.');
      return;
    }

    if (!userUsername.trim()) {
      setUserError('Username / Login ID is required.');
      return;
    }

    if (!editingUser && !userPassword.trim()) {
      setUserError('Password is required for new user creation.');
      return;
    }

    const trimmedEmpId = userEmpId.trim();
    const trimmedUsername = userUsername.trim().toLowerCase();

    if (!editingUser) {
      const usernameExists = users.some(u => u.username.toLowerCase() === trimmedUsername);
      if (usernameExists) {
        setUserError(`Username "${trimmedUsername}" is already taken.`);
        return;
      }

      const empIdExists = users.some(u => u.empId && u.empId.toLowerCase() === trimmedEmpId.toLowerCase());
      if (empIdExists) {
        setUserError(`Employee ID "${trimmedEmpId}" is already assigned to another user.`);
        return;
      }

      onAddUser({
        username: trimmedUsername,
        empId: trimmedEmpId,
        fullName: userFullName.trim(),
        email: userEmail.trim(),
        role: userRole,
        password: userPassword.trim() || 'user123',
        reportingTo: userReportingTo.trim()
      });
    } else {
      onUpdateUser({
        ...editingUser,
        fullName: userFullName.trim(),
        empId: trimmedEmpId,
        email: userEmail.trim(),
        role: userRole,
        password: userPassword.trim() || editingUser.password,
        reportingTo: userReportingTo.trim()
      });
    }

    setIsUserModalOpen(false);
  };

  const toggleShowPassword = (username: string) => {
    setShowPasswords(prev => ({ ...prev, [username]: !prev[username] }));
  };

  // ----------------------------------------------------
  // Handlers for Export Audit Report
  // ----------------------------------------------------
  const handleExportAuditReport = () => {
    const csvRows: string[][] = [];
    csvRows.push(['Ommax Electric Private Limited - System Audit Report']);
    csvRows.push([`Generated On: ${new Date().toLocaleString()}`, `Generated By: ${currentUser.fullName}`]);
    csvRows.push([]);
    csvRows.push(['Log ID', 'Timestamp', 'User Name', 'Role', 'IP Address', 'Action Code', 'Activity Details']);

    filteredLogs.forEach(log => {
      csvRows.push([
        log.id,
        formatTimestampInTimezone(log.timestamp, appSettings.timezone, appSettings.dateFormat),
        log.user.replace(/"/g, '""'),
        log.role,
        log.ipAddress,
        log.action,
        log.details.replace(/"/g, '""')
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_audit_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // Handlers for Restore & Wipe
  // ----------------------------------------------------
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreSuccess('');
    setRestoreError('');

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const success = await onRestoreData(content);
        if (success) {
          setRestoreSuccess('System state successfully restored from backup package!');
          setTimeout(() => setRestoreSuccess(''), 4000);
        } else {
          setRestoreError('Invalid backup file format or structure.');
        }
      } catch (err) {
        setRestoreError('Error parsing backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  };

  const handleWipeDataConfirm = async () => {
    if (wipeConfirmInput.trim().toUpperCase() === 'WIPE') {
      await onWipeAllData();
      setIsWipeModalOpen(false);
      setWipeConfirmInput('');
    }
  };

  // Filter audit logs
  const filteredLogs = logs.filter(log => {
    if (auditFilterAction === 'ALL') return true;
    if (auditFilterAction === 'LOGIN') return log.action === 'LOGIN_SUCCESS' || log.action === 'LOGOUT';
    if (auditFilterAction === 'LEDGER') return log.action.startsWith('TXN_');
    if (auditFilterAction === 'USER_ADMIN') return log.action.startsWith('USER_');
    if (auditFilterAction === 'SYSTEM') return log.action.startsWith('SYSTEM_') || log.action.startsWith('APP_') || log.action.startsWith('CATEGORY_');
    return true;
  });

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="w-full">
        <AnimatePresence mode="wait">
          
          {/* ======================================================== */}
          {/* TAB 1: APP SETTINGS & SUBTABS (PETTY CASH, CRM, HRMS)    */}
          {/* ======================================================== */}
          {activeTab === 'APP_SETTINGS' && (
            <motion.div
              key="APP_SETTINGS"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* App Settings Sub-tab Selector */}
              <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-2 border border-slate-200/80 w-full sm:w-auto inline-flex">
                <button
                  type="button"
                  onClick={() => setAppSettingsSubTab('PETTY_CASH')}
                  className={`flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    appSettingsSubTab === 'PETTY_CASH'
                      ? 'bg-white text-slate-900 shadow-xs font-extrabold ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-[#f7b944] shrink-0" />
                  <span>Petty Cash Settings</span>
                  <span className="text-[10px] bg-[#f7b944]/20 text-amber-900 px-2 py-0.5 rounded-md font-extrabold">Active</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppSettingsSubTab('CRM')}
                  className={`flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    appSettingsSubTab === 'CRM'
                      ? 'bg-white text-slate-900 shadow-xs font-extrabold ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-[#f7b944] shrink-0" />
                  <span>CRM Settings</span>
                  <span className="text-[10px] bg-[#f7b944]/20 text-amber-900 px-2 py-0.5 rounded-md font-extrabold">Active</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppSettingsSubTab('HRMS')}
                  className={`flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    appSettingsSubTab === 'HRMS'
                      ? 'bg-white text-slate-900 shadow-xs font-extrabold ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <span>HRMS Settings</span>
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-bold">Coming Soon</span>
                </button>
              </div>

              {/* SUBTAB 1.1: PETTY CASH MODULE SETTINGS */}
              {appSettingsSubTab === 'PETTY_CASH' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Global Formatting & Preferences */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-[#f7b944]" />
                        Global Localization & Display Standards
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Changes made here instantly format amounts, dates, and time stamps across all views, reports, and vouchers.
                      </p>
                    </div>

              {settingsSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  App settings updated successfully! Reflecting across entire workspace.
                </div>
              )}

              <form onSubmit={handleSaveAppSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Currency Symbol */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Currency / Amount Symbol</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="₹">₹ - Indian Rupee (INR)</option>
                    <option value="$">$ - US Dollar (USD)</option>
                    <option value="€">€ - Euro (EUR)</option>
                    <option value="£">£ - British Pound (GBP)</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="S$">S$ - Singapore Dollar</option>
                  </select>
                </div>

                {/* Date Format */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Date Format Standard</label>
                  <select
                    value={formDateFormat}
                    onChange={(e) => setFormDateFormat(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/07/2026)</option>
                    <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 15-07-2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-15)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/15/2026)</option>
                    <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 15-Jul-2026)</option>
                  </select>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">System Timezone</label>
                  <select
                    value={formTimezone}
                    onChange={(e) => setFormTimezone(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="Asia/Kolkata (IST, UTC+05:30)">Asia/Kolkata (IST, UTC+05:30)</option>
                    <option value="UTC (Coordinated Universal Time)">UTC (Universal Time)</option>
                    <option value="America/New_York (EST, UTC-05:00)">America/New_York (EST, UTC-05:00)</option>
                    <option value="Europe/London (GMT, UTC+00:00)">Europe/London (GMT, UTC+00:00)</option>
                    <option value="Asia/Dubai (GST, UTC+04:00)">Asia/Dubai (GST, UTC+04:00)</option>
                    <option value="Asia/Singapore (SGT, UTC+08:00)">Asia/Singapore (SGT, UTC+08:00)</option>
                  </select>
                </div>

                {/* Manual Voucher Numbering Control */}
                <div className="md:col-span-3 border-t border-slate-100 pt-4 mt-2">
                  <div className="flex items-center justify-between p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl hover:border-amber-300 transition-all">
                    <div className="space-y-1 pr-4">
                      <label htmlFor="manual-voucher-toggle" className="font-bold text-xs text-slate-800 flex items-center gap-2 cursor-pointer">
                        <Pencil className="w-4 h-4 text-amber-600" />
                        Allow Manual Voucher Numbering for Users
                      </label>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        When <strong>Enabled</strong>, users can enter custom Voucher / Reference numbers manually when logging expenses.
                        When <strong>Disabled</strong>, Voucher numbers are strictly auto-generated in sequence. Duplicate numbers are automatically flagged and blocked in real-time.
                      </p>
                    </div>
                    <button
                      id="manual-voucher-toggle"
                      type="button"
                      role="switch"
                      aria-checked={allowManualVoucher}
                      onClick={() => setAllowManualVoucher(!allowManualVoucher)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        allowManualVoucher ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          allowManualVoucher ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="md:col-span-3 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    Save System Settings
                  </button>
                </div>
              </form>
            </div>

            {/* Company Stamp & Seal Settings */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#f7b944]" />
                    Company Seal & Stamp Configuration
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Add official corporate stamp/seal to printed vouchers
                  </p>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 px-3.5 py-2 rounded-xl border border-slate-200 transition-all shrink-0">
                  <input
                    type="checkbox"
                    checked={stampEnabled}
                    onChange={(e) => setStampEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#f7b944] rounded border-slate-300 focus:ring-[#f7b944]"
                  />
                  <span className="text-xs font-extrabold text-slate-800">
                    {stampEnabled ? 'Seal Enabled on Vouchers' : 'Seal Disabled'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Controls Column (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Image URL & File Upload */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Stamp Image URL or File Upload</label>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <input
                        type="text"
                        value={stampUrl}
                        onChange={(e) => setStampUrl(e.target.value)}
                        placeholder="Paste image URL (https://... or data:image/...)"
                        className="flex-1 py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs font-mono text-slate-800"
                      />
                      <label className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setStampUrl(defaultSampleStamp)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200/60 transition-colors cursor-pointer"
                      >
                        Use Default Ommax Official Seal
                      </button>
                      <button
                        type="button"
                        onClick={() => setStampUrl('')}
                        className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        Clear Image
                      </button>
                    </div>
                  </div>

                  {/* Basic Image Edit Tools */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#f7b944]" />
                        Stamp Adjustment & Edit Tools
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setStampRotate(-12);
                          setStampOpacity(0.85);
                          setStampWidth(85);
                        }}
                        className="text-[10px] font-extrabold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 text-slate-400" />
                        Reset
                      </button>
                    </div>

                    {/* Rotation Tool */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">Rotation Angle</span>
                        <span className="font-mono font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                          {stampRotate}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={stampRotate}
                        onChange={(e) => setStampRotate(Number(e.target.value))}
                        className="w-full accent-[#f7b944] cursor-pointer"
                      />
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-bold">Quick Angle:</span>
                        {[-45, -12, 0, 12, 45].map((angle) => (
                          <button
                            key={angle}
                            type="button"
                            onClick={() => setStampRotate(angle)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                              stampRotate === angle
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {angle}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opacity Tool */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">Stamp Opacity</span>
                        <span className="font-mono font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                          {Math.round(stampOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={stampOpacity}
                        onChange={(e) => setStampOpacity(Number(e.target.value))}
                        className="w-full accent-[#f7b944] cursor-pointer"
                      />
                    </div>

                    {/* Stamp Width / Scale Tool */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">Stamp Size / Width</span>
                        <span className="font-mono font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                          {stampWidth} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="160"
                        step="5"
                        value={stampWidth}
                        onChange={(e) => setStampWidth(Number(e.target.value))}
                        className="w-full accent-[#f7b944] cursor-pointer"
                      />
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-bold">Quick Size:</span>
                        {[60, 85, 110, 135].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setStampWidth(size)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                              stampWidth === size
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {size}px
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Interactive Live Voucher Preview (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span>Voucher Header Live Preview</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-md">Header Seal Position</span>
                    </label>

                    {/* Mobile Screen Helper Banner */}
                    <div className="sm:hidden mb-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                      <span className="text-amber-600 font-bold">📱 Note:</span>
                      <span>Preview is scaled for voucher printing. Scroll preview horizontally or switch to desktop for full view.</span>
                    </div>

                    {/* Replica Voucher Header Box with overflow scroll wrapper */}
                    <div className="w-full overflow-x-auto pb-1">
                      <div className="min-w-[330px] bg-white border-2 border-blue-600 rounded-xl p-3 shadow-xs space-y-2 select-none relative">
                        <div className="flex items-center justify-between gap-1.5 min-h-[80px]">
                          {/* Date/No Table */}
                          <div className="border border-blue-600 rounded text-[9px] font-semibold text-blue-900 overflow-hidden bg-blue-50/30 shrink-0 w-24 sm:w-28">
                            <div className="flex border-b border-blue-600">
                              <span className="bg-blue-100 px-1 py-0.5 font-bold border-r border-blue-600 w-7 sm:w-8">No.</span>
                              <span className="px-1 py-0.5 font-mono font-bold text-slate-900">V-101</span>
                            </div>
                            <div className="flex border-b border-blue-600">
                              <span className="bg-blue-100 px-1 py-0.5 font-bold border-r border-blue-600 w-7 sm:w-8">Date</span>
                              <span className="px-1 py-0.5 font-mono text-slate-900">15/07/26</span>
                            </div>
                            <div className="flex">
                              <span className="bg-blue-100 px-1 py-0.5 font-bold border-r border-blue-600 w-7 sm:w-8">Rs.</span>
                              <span className="px-1 py-0.5 font-mono font-bold text-slate-900">₹3,500</span>
                            </div>
                          </div>

                          {/* Middle Seal Placement */}
                          <div className="flex-1 flex items-center justify-center px-1 overflow-visible">
                            {stampEnabled && stampUrl ? (
                              <img
                                src={stampUrl}
                                alt="Company Seal Preview"
                                style={{
                                  width: `${stampWidth}px`,
                                  height: 'auto',
                                  maxWidth: '100%',
                                  objectFit: 'contain',
                                  transform: `rotate(${stampRotate}deg)`,
                                  opacity: stampOpacity,
                                  transition: 'all 0.15s ease-out'
                                }}
                              />
                            ) : (
                              <div className="text-[10px] font-bold text-slate-300 border border-dashed border-slate-200 rounded-lg p-2 text-center">
                                No Seal Rendered
                              </div>
                            )}
                          </div>

                          {/* Right Cash Voucher Header */}
                          <div className="text-right shrink-0">
                            <div className="text-[8px] font-bold text-blue-800 uppercase tracking-tight">Ommax Electric Pvt Ltd</div>
                            <div className="text-xs sm:text-sm font-black text-blue-700 tracking-wider">CASH VOUCHER</div>
                          </div>
                        </div>

                        {/* Line preview */}
                        <div className="border-t border-dashed border-blue-200 pt-1.5 text-[9px] text-slate-400 flex justify-between font-mono">
                          <span>Pay to: Rahul Sharma</span>
                          <span>Category: Office Supplies</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 font-medium">
                    <span className="font-extrabold text-amber-950 block mb-0.5">Seal Placement Standard:</span>
                    Positioned cleanly in the header area between the Date/No box and the CASH VOUCHER heading for both single and batch voucher printouts.
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveAppSettings}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4 text-[#f7b944]" />
                  Save App Settings & Seal Configuration
                </button>
              </div>
            </div>

            {/* Category Management */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#f7b944]" />
                    Deposit & Expense Register Categories
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure categories for deposits and petty cash disbursements.
                  </p>
                </div>

                <button
                  onClick={openAddCategoryModal}
                  className="bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Category
                </button>
              </div>

              {catDeleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{catDeleteError}</span>
                  </div>
                  <button onClick={() => setCatDeleteError('')} className="p-1 text-rose-400 hover:text-rose-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {categories.map((cat, idx) => (
                  <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 truncate block">{cat.name}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                          cat.type === 'IN' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {cat.type === 'IN' ? 'DEPOSIT' : 'EXPENSE'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        className="p-1.5 hover:bg-white text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategoryDirect(cat.name)}
                        className="p-1.5 hover:bg-white text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

              {/* SUBTAB 1.2: CRM MODULE SETTINGS */}
              {appSettingsSubTab === 'CRM' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Industry Categories */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-[#f7b944]" />
                          Industry Classifications
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Manage master industry verticals and sectors available across CRM accounts and opportunities.
                        </p>
                      </div>

                      <button
                        onClick={openAddIndustryModal}
                        className="bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Industry
                      </button>
                    </div>

                    {/* Industries Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(currentCrmSettings.industries || []).map((ind, idx) => (
                        <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-3.5 h-3.5 rounded-full shrink-0 bg-amber-500"></span>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-800 truncate block">{ind}</span>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md inline-block mt-0.5 bg-amber-100 text-amber-800 font-mono">
                                INDUSTRY
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => openEditIndustryModal(ind)}
                              className="p-1.5 hover:bg-white text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Industry"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmIndustry(ind)}
                              className="p-1.5 hover:bg-white text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Industry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Business Categories */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                          <Tag className="w-5 h-5 text-[#f7b944]" />
                          Business Categories
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Configure account business categories (e.g. Enterprise, SME, Government, Channel Partner).
                        </p>
                      </div>

                      <button
                        onClick={openAddBizCatModal}
                        className="bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Category
                      </button>
                    </div>

                    {/* Business Categories Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(currentCrmSettings.businessCategories || []).map((cat, idx) => (
                        <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-3.5 h-3.5 rounded-full shrink-0 bg-blue-500"></span>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-800 truncate block">{cat}</span>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md inline-block mt-0.5 bg-blue-100 text-blue-800 font-mono">
                                BIZ CATEGORY
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => openEditBizCatModal(cat)}
                              className="p-1.5 hover:bg-white text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Business Category"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmBizCat(cat)}
                              className="p-1.5 hover:bg-white text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Business Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 1.3: HRMS MODULE SETTINGS (UPCOMING) */}
              {appSettingsSubTab === 'HRMS' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900">HRMS & Workforce Settings</h3>
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-mono">
                              PREPARING MODULE
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Set up organizational departments, designations, payroll cycles, and leave policies.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-600" />
                          <h4 className="font-bold text-xs text-slate-800">Departments & Designations</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Manage organizational hierarchies, reporting managers, and role assignments across branches.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-600" />
                          <h4 className="font-bold text-xs text-slate-800">Attendance & Leave Rules</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Define standard work shifts, holidays calendar, earned/casual leave accruals, and approvals.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between text-xs text-blue-900">
                      <div className="flex items-center gap-2.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>This configuration partition will automatically activate upon HRMS release.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        {/* ======================================================== */}
        {/* TAB 2: USER MANAGEMENT                                   */}
        {/* ======================================================== */}
        {activeTab === 'USER_MGMT' && (
          <motion.div
            key="USER_MGMT"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#f7b944]" />
                    Authorized System Users
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage system credentials, employee IDs, and access roles (Admin, Custodian, Auditor).
                  </p>
                </div>

                <button
                  onClick={openAddUserModal}
                  className="bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Create New User
                </button>
              </div>

              {/* Users Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {users.map((u, idx) => {
                  const isCurrent = u.username.toLowerCase() === currentUser.username.toLowerCase();
                  const initials = u.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || u.username.slice(0, 2).toUpperCase();

                  return (
                    <div key={idx} className="bg-slate-50/70 rounded-2xl border border-slate-100 p-5 space-y-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#f7b944] text-slate-950 font-black flex items-center justify-center text-xs tracking-wider uppercase shadow-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                              {u.fullName}
                              {isCurrent && (
                                <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-md">You</span>
                              )}
                            </h4>
                            <p className="text-xs font-mono text-slate-700 font-bold">Emp ID: {u.empId || u.username.toUpperCase()}</p>
                            <p className="text-[11px] font-mono text-slate-400">Username: {u.username}</p>
                            {u.email && (
                              <p className="text-[11px] font-mono text-slate-500 font-medium truncate" title={u.email}>
                                Email: {u.email}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : u.role === 'MANAGER'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : u.role === 'CUSTODIAN'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {u.role === 'CUSTODIAN' ? 'USER' : u.role}
                        </span>
                      </div>

                      {/* Password Field */}
                      <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">
                            {showPasswords[u.username] ? (u.password || '••••••••') : '••••••••'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(u.username)}
                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showPasswords[u.username] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => openEditUserModal(u)}
                          className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-slate-500" />
                          Edit
                        </button>

                        {!isCurrent && (
                          <button
                            onClick={() => setDeleteConfirmUser(u.username)}
                            className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition-colors border border-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SYSTEM AUDIT TIMELINE                             */}
        {/* ======================================================== */}
        {activeTab === 'SYSTEM_AUDIT' && (
          <motion.div
            key="SYSTEM_AUDIT"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
              
              {/* Header & Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#f7b944]" />
                    Complete User Movement & Audit Trail
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Continuous timeline monitoring of logins, register modifications, user management, and system operations.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter category */}
                  <select
                    value={auditFilterAction}
                    onChange={(e) => setAuditFilterAction(e.target.value)}
                    className="py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="LOGIN">Security & Auth</option>
                    <option value="LEDGER">Ledger Movements</option>
                    <option value="USER_ADMIN">User Management</option>
                    <option value="SYSTEM">System Operations</option>
                  </select>

                  {/* Export Report Button */}
                  <button
                    onClick={handleExportAuditReport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Report
                  </button>
                </div>
              </div>

              {/* Timeline Stream */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {filteredLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">
                    No recorded movements matching the current filter criteria.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isAuth = log.action === 'LOGIN_SUCCESS' || log.action === 'LOGOUT';
                    const isTxn = log.action.startsWith('TXN_');
                    const isUserAction = log.action.startsWith('USER_');

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline Bullet Dot */}
                        <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white shadow-xs ${
                          isAuth
                            ? 'bg-emerald-500'
                            : isTxn
                            ? 'bg-blue-500'
                            : isUserAction
                            ? 'bg-amber-500'
                            : 'bg-[#f7b944]'
                        }`}>
                          {isAuth ? <Key className="w-2.5 h-2.5" /> : isTxn ? <Tag className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                        </div>

                        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800">{log.user}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                log.role === 'ADMIN' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {log.role}
                              </span>
                              <span className="text-slate-400 text-[11px] font-mono">• {log.ipAddress}</span>
                            </div>

                            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestampInTimezone(log.timestamp, appSettings.timezone, appSettings.dateFormat)} ({appSettings.timezone.split(' ')[0]})
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-slate-100">
                            {log.details}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: NOTIFICATION & STORAGE GATEWAY INTEGRATIONS      */}
        {/* ======================================================== */}
        {activeTab === 'INTEGRATIONS' && (
          <motion.div
            key="INTEGRATIONS"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Notification Banner */}
            {integrationSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-semibold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                {integrationSuccess}
              </div>
            )}

            {/* Sub-tab Navigation Bar for Integrations */}
            <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200/80 max-w-lg">
              <button
                type="button"
                onClick={() => setIntegrationSubTab('STORAGE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  integrationSubTab === 'STORAGE'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <HardDrive className={`w-4 h-4 ${integrationSubTab === 'STORAGE' ? 'text-amber-600' : 'text-slate-500'}`} />
                <span>Cloud Storage</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-extrabold ${
                  cloudinaryEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {cloudinaryEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIntegrationSubTab('EMAIL')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  integrationSubTab === 'EMAIL'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Mail className={`w-4 h-4 ${integrationSubTab === 'EMAIL' ? 'text-sky-600' : 'text-slate-500'}`} />
                <span>Email Gateway</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-extrabold ${
                  emailEnabled ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {emailEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: CLOUD STORAGE (CLOUDINARY) */}
            {integrationSubTab === 'STORAGE' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        cloudinaryEnabled ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <HardDrive className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-800">Cloudinary Cloud Storage</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            cloudinaryEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {cloudinaryEnabled ? 'Active Provider' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Store voucher attachments (PDFs & images) directly in Cloudinary under Petty Cash/Year/Month folder structure.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={cloudinaryEnabled}
                        onChange={(e) => setCloudinaryEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f7b944]"></div>
                    </label>
                  </div>

                  {/* Cloudinary Credentials Form */}
                  <form onSubmit={handleSaveCloudinarySettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Cloud Name (<span className="text-amber-600">cloud_name</span>)
                        </label>
                        <input
                          type="text"
                          value={cloudinaryCloudName}
                          onChange={(e) => setCloudinaryCloudName(e.target.value)}
                          placeholder="e.g. dxyz123abc"
                          className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                          required
                        />
                        <span className="text-[10px] text-slate-400">Found on your Cloudinary Dashboard</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          API Key (<span className="text-amber-600">api_key</span>)
                        </label>
                        <input
                          type="text"
                          value={cloudinaryApiKey}
                          onChange={(e) => setCloudinaryApiKey(e.target.value)}
                          placeholder="e.g. 123456789012345"
                          className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                        />
                        <span className="text-[10px] text-slate-400">Optional for unsigned uploads, required for signed API operations</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          API Secret (<span className="text-amber-600">api_secret</span>)
                        </label>
                        <div className="relative">
                          <input
                            type={showCloudinarySecret ? 'text' : 'password'}
                            value={cloudinaryApiSecret}
                            onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                            placeholder="e.g. AbC123XyZ456..."
                            className="w-full py-2.5 px-3 pr-10 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCloudinarySecret(!showCloudinarySecret)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showCloudinarySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400">Keep secret for secure backend upload signing</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Upload Preset <span className="text-slate-400 font-normal">(Optional for unsigned client uploads)</span>
                        </label>
                        <input
                          type="text"
                          value={cloudinaryUploadPreset}
                          onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                          placeholder="e.g. petty_cash_preset"
                          className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                        />
                        <span className="text-[10px] text-slate-400">Created in Cloudinary Settings &gt; Upload &gt; Upload presets</span>
                      </div>
                    </div>

                    {/* Connection Test Status Feedback */}
                    {cloudinaryTestStatus.message && (
                      <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                        cloudinaryTestStatus.success === true
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : cloudinaryTestStatus.success === false
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        {cloudinaryTestStatus.loading ? (
                          <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                        ) : cloudinaryTestStatus.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{cloudinaryTestStatus.message}</span>
                      </div>
                    )}

                    {/* Buttons for Cloudinary */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleTestCloudinaryConnection}
                        disabled={cloudinaryTestStatus.loading}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${cloudinaryTestStatus.loading ? 'animate-spin' : ''}`} />
                        Test Connection & Verify Cloudinary
                      </button>

                      <button
                        type="submit"
                        className="bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Cloudinary Settings
                      </button>
                    </div>
                  </form>

                  {/* Migration Box inside Integrations */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Database className="w-5 h-5 text-amber-700" />
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">Migrate Existing Attachments to Cloudinary</h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Convert Base64 receipt images & PDFs stored in Firestore into Cloudinary hosted files under Petty Cash/Year/Month folders.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-amber-200/80 text-amber-950 px-3 py-1 rounded-full font-mono">
                        {(transactions || []).filter(t => {
                          if (!t.receiptUrl) return false;
                          if (t.receiptUrl.startsWith('data:')) return true;
                          if (!t.receiptUrl.includes('cloudinary.com')) return true;
                          const cleanUrl = t.receiptUrl.split('?')[0];
                          return !/\.(pdf|png|jpg|jpeg|webp|gif|svg)$/i.test(cleanUrl);
                        }).length} Pending
                      </span>
                    </div>

                    {cloudinaryMigrationStatus.message && (
                      <div className="bg-white/80 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 font-medium space-y-1.5">
                        <div className="flex items-center gap-2">
                          {cloudinaryMigrationStatus.loading ? (
                            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span>{cloudinaryMigrationStatus.message}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleMigrateFirestoreToCloudinary}
                        disabled={cloudinaryMigrationStatus.loading || !cloudinaryCloudName}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {cloudinaryMigrationStatus.loading ? 'Migrating Attachments...' : 'Start Attachment Migration to Cloudinary'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: EMAIL GATEWAY (MICROSOFT GRAPH API) */}
            {integrationSubTab === 'EMAIL' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-indigo-600" />
                        Microsoft Graph API Email Gateway (Office 365)
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Configure corporate Office 365 / Shared Mailbox email alerts dispatched automatically upon voucher submission, approvals, or updates.
                      </p>
                    </div>
                  </div>
                </div>

            {/* Microsoft Graph API Email Integration Form */}
            <form onSubmit={handleSaveEmailSettings} className="space-y-4">

                {/* Toggle Email Alerts */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      emailEnabled ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Microsoft Graph API Email Integration (Office 365)</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {emailEnabled ? 'Active — Dispatches corporate email alerts directly via Microsoft Graph API' : 'Disabled — No email alerts will be sent'}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f7b944]"></div>
                  </label>
                </div>

                {/* ACCORDION 1: CONFIGURATION SETTINGS */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('config')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">1. Configuration Settings</h4>
                        <p className="text-xs text-slate-400">Microsoft Azure AD OAuth Credentials & Recipient Emails</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono font-semibold">
                        {msTenantId && msClientId ? 'Configured' : 'Not Configured'}
                      </span>
                      {openEmailAccordions.config ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.config && (
                    <div className="p-6 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                      {/* Azure AD Quick Setup Helper Banner */}
                      <div className="bg-blue-50/80 rounded-2xl border border-blue-100 p-4 flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
                        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-bold text-blue-950">How to set up Microsoft 365 Azure App for Mail Flow:</span>
                          <ol className="list-decimal ml-4 space-y-1 text-[11px] text-blue-800">
                            <li>Go to <a href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps" target="_blank" rel="noreferrer" className="underline font-bold hover:text-blue-950">Azure Portal &gt; App Registrations</a> and register a new app.</li>
                            <li>Copy the <strong>Directory (Tenant) ID</strong> and <strong>Application (Client) ID</strong> into the fields below.</li>
                            <li>Under <strong>Certificates &amp; secrets</strong>, generate a Client Secret and copy its Value here.</li>
                            <li>Under <strong>API permissions</strong>, add Microsoft Graph <code>Mail.Send</code> Application permission &amp; click <strong>Grant admin consent</strong>.</li>
                            <li>This allows mail flow directly from your shared mailbox (e.g. <code>mail@ommaxelectric.com</code>) without an extra user license!</li>
                          </ol>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Directory (Tenant) ID
                          </label>
                          <input
                            type="text"
                            value={msTenantId}
                            onChange={(e) => setMsTenantId(e.target.value)}
                            placeholder="e.g. 88888888-4444-4444-4444-121212121212"
                            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Application (Client) ID
                          </label>
                          <input
                            type="text"
                            value={msClientId}
                            onChange={(e) => setMsClientId(e.target.value)}
                            placeholder="e.g. 11111111-2222-3333-4444-555555555555"
                            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700">
                            Client Secret Value
                          </label>
                          <div className="relative">
                            <input
                              type={showMsSecret ? 'text' : 'password'}
                              value={msClientSecret}
                              onChange={(e) => setMsClientSecret(e.target.value)}
                              placeholder="Azure AD Client Secret Value"
                              className="w-full py-2.5 pl-3 pr-9 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowMsSecret(!showMsSecret)}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showMsSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Sender Shared Mailbox Email Address
                          </label>
                          <input
                            type="email"
                            value={msSenderEmail}
                            onChange={(e) => setMsSenderEmail(e.target.value)}
                            placeholder="mail@ommaxelectric.com"
                            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                            required
                          />
                          <span className="text-[10px] text-slate-400">Office 365 User / Shared Mailbox user account</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Sender Display Name
                          </label>
                          <input
                            type="text"
                            value={msSenderName}
                            onChange={(e) => setMsSenderName(e.target.value)}
                            placeholder="Petty Cash Desk"
                            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-medium"
                            required
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Recipient Email Addresses (Finance Team / Auditors)
                          </label>
                          <input
                            type="text"
                            value={emailRecipients}
                            onChange={(e) => setEmailRecipients(e.target.value)}
                            placeholder="cfo@company.com, auditor@company.com, admin@company.com"
                            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                            required
                          />
                          <span className="text-[10px] text-slate-400">Separate multiple recipient email addresses with commas</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar for Email Gateway Settings */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-600" />
                    Test Connection & Verify Credentials
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Email Gateway Settings
                  </button>
                </div>
              </form>
            </div>
          )}
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: TEMPLATES & NOTIFICATION BLUEPRINTS (PETTY CASH, CRM, HRMS) */}
        {/* ======================================================== */}
        {activeTab === 'TEMPLATES' && (
          <motion.div
            key="TEMPLATES"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Notification Banner */}
            {integrationSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-semibold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                {integrationSuccess}
              </div>
            )}

            {/* Templates Sub-tab Selector */}
            <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-2 border border-slate-200/80 w-full sm:w-auto inline-flex">
              <button
                type="button"
                onClick={() => setTemplatesSubTab('PETTY_CASH')}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  templatesSubTab === 'PETTY_CASH'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold ring-1 ring-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Petty Cash Templates</span>
                <span className="text-[10px] bg-[#f7b944]/20 text-amber-900 px-2 py-0.5 rounded-md font-extrabold">9 Active</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplatesSubTab('CRM')}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  templatesSubTab === 'CRM'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold ring-1 ring-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>CRM Templates</span>
                <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-bold">Coming Soon</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplatesSubTab('HRMS')}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  templatesSubTab === 'HRMS'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold ring-1 ring-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>HRMS Templates</span>
                <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-bold">Coming Soon</span>
              </button>
            </div>

            {/* SUBTAB 4.1: PETTY CASH AUTOMATED TEMPLATES */}
            {templatesSubTab === 'PETTY_CASH' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Petty Cash Communication & Email Templates
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Customize corporate email subjects and body layouts dispatched automatically upon voucher creation, edits, deletions, threshold alerts, and approvals.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Templates Form */}
                <form onSubmit={handleSaveEmailSettings} className="space-y-4">
                  {/* ACCORDION 1: NEW VOUCHER EMAIL TEMPLATE WITH PREVIEW */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleEmailAccordion('new')}
                      className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-50 text-[#ed3833] flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">1. New Voucher Template & Preview</h4>
                          <p className="text-xs text-slate-400">Corporate email subject & body sent when a new payment voucher is created</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ed3833]"></span>
                        {openEmailAccordions.new ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </button>

                    {openEmailAccordions.new && (
                      <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                            {['{voucher_id}', '{amount}', '{paid_to}', '{particulars}', '{category}', '{remarks}', '{date}', '{attachment}', '{balance}'].map((tag) => (
                              <button
                                key={`new-email-${tag}`}
                                type="button"
                                onClick={() => setEmailBodyNew(prev => prev + ' ' + tag)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-red-800 cursor-pointer transition-all"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                            <input
                              type="text"
                              value={emailSubjectNew}
                              onChange={(e) => setEmailSubjectNew(e.target.value)}
                              placeholder="Subject line"
                              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                              required
                            />
                            <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                            <textarea
                              value={emailBodyNew}
                              onChange={(e) => setEmailBodyNew(e.target.value)}
                              rows={5}
                              className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                              required
                            />
                          </div>
                        </div>

                        {/* Live Card Preview */}
                        {(() => {
                          const previewSubject = substituteSampleTags(emailSubjectNew, appSettings.currencySymbol, false);
                          const previewBodyRaw = substituteSampleTags(emailBodyNew, appSettings.currencySymbol, false);
                          const previewBlocks = parseBodyTextToBlocks(previewBodyRaw);

                          return (
                            <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                    New Voucher HTML Email Card Preview
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-slate-500">
                                  From: {msSenderName} &lt;{msSenderEmail}&gt;
                                </span>
                              </div>

                              <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                                Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                              </div>

                              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                                <iframe
                                  title="New Voucher Email Preview"
                                  srcDoc={buildModernHtmlEmailFromText('New Voucher Alert', previewBodyRaw, '#3b82f6', 'NEW')}
                                  className="w-full h-[580px] border-0"
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                {/* ACCORDION 3: VOUCHER CHANGES EMAIL TEMPLATE WITH PREVIEW */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('edit')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">2. Voucher Changes Template & Preview</h4>
                        <p className="text-xs text-slate-400">Corporate email subject & body sent when an existing voucher is modified</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {openEmailAccordions.edit ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.edit && (
                    <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                          {['{voucher_id}', '{changed_fields}', '{updated_by}', '{amount}', '{paid_to}', '{particulars}', '{category}', '{remarks}', '{date}', '{attachment}', '{balance}'].map((tag) => (
                            <button
                              key={`edit-email-${tag}`}
                              type="button"
                              onClick={() => setEmailBodyEdit(prev => prev + ' ' + tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-amber-800 cursor-pointer transition-all"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                          <input
                            type="text"
                            value={emailSubjectEdit}
                            onChange={(e) => setEmailSubjectEdit(e.target.value)}
                            placeholder="Subject line"
                            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                            required
                          />
                          <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                          <textarea
                            value={emailBodyEdit}
                            onChange={(e) => setEmailBodyEdit(e.target.value)}
                            rows={6}
                            className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Card Preview */}
                      {(() => {
                        const previewSubject = substituteSampleTags(emailSubjectEdit, appSettings.currencySymbol, true);
                        const previewBodyRaw = substituteSampleTags(emailBodyEdit, appSettings.currencySymbol, true);
                        const previewBlocks = parseBodyTextToBlocks(previewBodyRaw);

                        return (
                          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                  Voucher Changes HTML Email Card Preview
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                From: {msSenderName} &lt;{msSenderEmail}&gt;
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                            </div>

                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                              <iframe
                                title="Voucher Changes Email Preview"
                                srcDoc={buildModernHtmlEmailFromText('Voucher Changes Alert', previewBodyRaw, '#f7b944', 'EDIT')}
                                className="w-full h-[580px] border-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ACCORDION 3: DEPOSIT EMAIL TEMPLATE WITH PREVIEW */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('inward')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00bc7d] flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">3. Deposit Template & Preview</h4>
                        <p className="text-xs text-slate-400">Corporate email subject & body sent when cash is deposited into petty cash</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00bc7d]"></span>
                      {openEmailAccordions.inward ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.inward && (
                    <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                          {['{voucher_id}', '{amount}', '{paid_to}', '{particulars}', '{category}', '{remarks}', '{date}', '{attachment}', '{balance}'].map((tag) => (
                            <button
                              key={`inward-email-${tag}`}
                              type="button"
                              onClick={() => setEmailBodyInward(prev => prev + ' ' + tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-emerald-800 cursor-pointer transition-all"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                          <input
                            type="text"
                            value={emailSubjectInward}
                            onChange={(e) => setEmailSubjectInward(e.target.value)}
                            placeholder="Subject line"
                            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                            required
                          />
                          <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                          <textarea
                            value={emailBodyInward}
                            onChange={(e) => setEmailBodyInward(e.target.value)}
                            rows={5}
                            className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Card Preview */}
                      {(() => {
                        const previewSubject = substituteSampleTags(emailSubjectInward, appSettings.currencySymbol, false)
                          .replace(/VOUCHER-104/g, 'IW-101')
                          .replace(/₹3,500/g, '₹25,000')
                          .replace(/\$3,500/g, '$25,000')
                          .replace(/Rahul Sharma/g, 'HDFC Bank (Parthiban)');
                        const previewBodyRaw = substituteSampleTags(emailBodyInward, appSettings.currencySymbol, false)
                          .replace(/VOUCHER-104/g, 'IW-101')
                          .replace(/₹3,500/g, '₹25,000')
                          .replace(/\$3,500/g, '$25,000')
                          .replace(/Rahul Sharma/g, 'HDFC Bank (Parthiban)')
                          .replace(/Office Supplies/g, 'Bank Cash Withdrawal')
                          .replace(/A4 printer paper & stationery/g, 'Cash withdrawn from HDFC Bank for Petty Cash replenishment')
                          .replace(/Invoice #INV-2026-902 attached/g, 'Cheque #CHQ-88290 verified')
                          .replace(/₹12,500/g, '₹37,500')
                          .replace(/\$12,500/g, '$37,500');
                        const previewBlocks = parseBodyTextToBlocks(previewBodyRaw);

                        return (
                          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#00bc7d] animate-pulse"></span>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                  Cash Deposit HTML Email Card Preview
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                From: {msSenderName} &lt;{msSenderEmail}&gt;
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                            </div>

                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                              <iframe
                                title="Cash Deposit Email Preview"
                                srcDoc={buildModernHtmlEmailFromText('Deposit Alert', previewBodyRaw, '#00bc7d', 'INWARD')}
                                className="w-full h-[580px] border-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ACCORDION 4: DEPOSIT CHANGES EMAIL TEMPLATE WITH PREVIEW */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('inwardEdit')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">4. Deposit Changes Template & Preview</h4>
                        <p className="text-xs text-slate-400">Corporate email subject & body sent when an existing inward deposit is modified</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {openEmailAccordions.inwardEdit ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.inwardEdit && (
                    <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                          {['{voucher_id}', '{changed_fields}', '{updated_by}', '{amount}', '{paid_to}', '{particulars}', '{category}', '{remarks}', '{date}', '{attachment}', '{balance}'].map((tag) => (
                            <button
                              key={`inward-edit-email-${tag}`}
                              type="button"
                              onClick={() => setEmailBodyInwardEdit(prev => prev + ' ' + tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-amber-800 cursor-pointer transition-all"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                          <input
                            type="text"
                            value={emailSubjectInwardEdit}
                            onChange={(e) => setEmailSubjectInwardEdit(e.target.value)}
                            placeholder="Subject line"
                            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                            required
                          />
                          <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                          <textarea
                            value={emailBodyInwardEdit}
                            onChange={(e) => setEmailBodyInwardEdit(e.target.value)}
                            rows={6}
                            className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Card Preview */}
                      {(() => {
                        const previewSubject = substituteSampleTags(emailSubjectInwardEdit, appSettings.currencySymbol, true)
                          .replace(/VOUCHER-104/g, 'IW-101')
                          .replace(/₹3,500/g, '₹25,000')
                          .replace(/\$3,500/g, '$25,000')
                          .replace(/Rahul Sharma/g, 'HDFC Bank (Parthiban)');
                        const previewBodyRaw = substituteSampleTags(emailBodyInwardEdit, appSettings.currencySymbol, true)
                          .replace(/VOUCHER-104/g, 'IW-101')
                          .replace(/₹3,500/g, '₹25,000')
                          .replace(/\$3,500/g, '$25,000')
                          .replace(/Rahul Sharma/g, 'HDFC Bank (Parthiban)')
                          .replace(/Office Supplies/g, 'Bank Cash Withdrawal')
                          .replace(/A4 printer paper & stationery/g, 'Cash withdrawn from HDFC Bank for Petty Cash replenishment')
                          .replace(/Invoice #INV-2026-902 attached/g, 'Cheque #CHQ-88290 verified')
                          .replace(/₹12,500/g, '₹37,500')
                          .replace(/\$12,500/g, '$37,500');
                        const previewBlocks = parseBodyTextToBlocks(previewBodyRaw);

                        return (
                          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#f7b944] animate-pulse"></span>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                  Deposit Changes HTML Email Card Preview
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                From: {msSenderName} &lt;{msSenderEmail}&gt;
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                            </div>

                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                              <iframe
                                title="Deposit Changes Email Preview"
                                srcDoc={buildModernHtmlEmailFromText('Deposit Changes Alert', previewBodyRaw, '#f7b944', 'INWARD_EDIT')}
                                className="w-full h-[580px] border-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ACCORDION 5: CLAIM REQUEST SUBMITTED TEMPLATE & PREVIEW */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('reqSubmitted')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">5. Claim Submitted (Pending Approval) Template & Preview</h4>
                        <p className="text-xs text-slate-400">Email sent to Approval Manager when a custodian submits a new petty cash claim</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {openEmailAccordions.reqSubmitted ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.reqSubmitted && (
                    <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                          {['{voucher_id}', '{amount}', '{paid_to}', '{particulars}', '{category}', '{remarks}', '{date}', '{attachment}', '{balance}'].map((tag) => (
                            <button
                              key={`req-sub-email-${tag}`}
                              type="button"
                              onClick={() => setEmailBodyReqSubmitted(prev => prev + ' ' + tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-amber-800 cursor-pointer transition-all"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                          <input
                            type="text"
                            value={emailSubjectReqSubmitted}
                            onChange={(e) => setEmailSubjectReqSubmitted(e.target.value)}
                            placeholder="Subject line"
                            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                            required
                          />
                          <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                          <textarea
                            value={emailBodyReqSubmitted}
                            onChange={(e) => setEmailBodyReqSubmitted(e.target.value)}
                            rows={6}
                            className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Card Preview */}
                      {(() => {
                        const previewSubject = substituteSampleTags(emailSubjectReqSubmitted, appSettings.currencySymbol, false);
                        const previewBodyRaw = substituteSampleTags(emailBodyReqSubmitted, appSettings.currencySymbol, false);
                        const previewBlocks = parseBodyTextToBlocks(previewBodyRaw);

                        return (
                          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                  Claim Submitted HTML Email Card Preview
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                From: {msSenderName} &lt;{msSenderEmail}&gt;
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                            </div>

                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                              <iframe
                                title="Claim Submitted Email Preview"
                                srcDoc={buildModernHtmlEmailFromText('Petty Cash Claim Pending Approval', previewBodyRaw, '#ff7900', 'REQUEST_SUBMITTED')}
                                className="w-full h-[580px] border-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ACCORDION 6: CLAIM APPROVED (READY FOR PAYMENT) TEMPLATE & PREVIEW */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('reqApproved')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">6. Claim Approved (Ready for Payment) Template & Preview</h4>
                        <p className="text-xs text-slate-400">Email sent to Finance Admin & Claimant when a claim is approved by Manager</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      {openEmailAccordions.reqApproved ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.reqApproved && (
                    <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                          {['{voucher_id}', '{amount}', '{paid_to}', '{particulars}', '{category}', '{approved_by}', '{date}', '{remarks}', '{balance}'].map((tag) => (
                            <button
                              key={`req-app-email-${tag}`}
                              type="button"
                              onClick={() => setEmailBodyReqApproved(prev => prev + ' ' + tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-blue-800 cursor-pointer transition-all"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                          <input
                            type="text"
                            value={emailSubjectReqApproved}
                            onChange={(e) => setEmailSubjectReqApproved(e.target.value)}
                            placeholder="Subject line"
                            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                            required
                          />
                          <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                          <textarea
                            value={emailBodyReqApproved}
                            onChange={(e) => setEmailBodyReqApproved(e.target.value)}
                            rows={6}
                            className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Card Preview */}
                      {(() => {
                        const previewSubject = substituteSampleTags(emailSubjectReqApproved, appSettings.currencySymbol, false)
                          .replace(/\{approved_by\}/g, 'Mohan (Manager)');
                        const previewBodyRaw = substituteSampleTags(emailBodyReqApproved, appSettings.currencySymbol, false)
                          .replace(/\{approved_by\}/g, 'Mohan (Manager)');
                        const previewBlocks = parseBodyTextToBlocks(previewBodyRaw);

                        return (
                          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                  Claim Approved HTML Email Card Preview (Manager / Admin View)
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                                🔒 Balance hidden automatically for Claimant
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                            </div>

                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                              <iframe
                                title="Claim Approved Email Preview"
                                srcDoc={buildModernHtmlEmailFromText('Claim Approved & Ready for Payment', previewBodyRaw, '#2563eb', 'REQUEST_APPROVED')}
                                className="w-full h-[580px] border-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ACCORDION 7: CLAIM DISBURSED & PAID TEMPLATE & PREVIEW */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('reqPaid')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">7. Claim Disbursed & Paid Template & Preview</h4>
                        <p className="text-xs text-slate-400">Email sent to Claimant, Manager & Admin when cash is issued and marked as PAID</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {openEmailAccordions.reqPaid ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.reqPaid && (
                    <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                          {['{voucher_id}', '{amount}', '{paid_to}', '{particulars}', '{category}', '{paid_by}', '{approved_by}', '{date}', '{balance}'].map((tag) => (
                            <button
                              key={`req-paid-email-${tag}`}
                              type="button"
                              onClick={() => setEmailBodyReqPaid(prev => prev + ' ' + tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-emerald-800 cursor-pointer transition-all"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                          <input
                            type="text"
                            value={emailSubjectReqPaid}
                            onChange={(e) => setEmailSubjectReqPaid(e.target.value)}
                            placeholder="Subject line"
                            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                            required
                          />
                          <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                          <textarea
                            value={emailBodyReqPaid}
                            onChange={(e) => setEmailBodyReqPaid(e.target.value)}
                            rows={6}
                            className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Card Preview */}
                      {(() => {
                        const previewSubject = substituteSampleTags(emailSubjectReqPaid, appSettings.currencySymbol, false)
                          .replace(/\{paid_by\}/g, 'Anita (Admin)')
                          .replace(/\{approved_by\}/g, 'Mohan (Manager)');
                        const previewBodyRaw = substituteSampleTags(emailBodyReqPaid, appSettings.currencySymbol, false)
                          .replace(/\{paid_by\}/g, 'Anita (Admin)')
                          .replace(/\{approved_by\}/g, 'Mohan (Manager)');
                        const previewBlocks = parseBodyTextToBlocks(previewBodyRaw);

                        return (
                          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                  Payment Disbursed HTML Email Card Preview (Manager / Admin View)
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                                🔒 Balance hidden automatically for Claimant
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                            </div>

                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                              <iframe
                                title="Claim Disbursed Email Preview"
                                srcDoc={buildModernHtmlEmailFromText('Petty Cash Issued & Paid', previewBodyRaw, '#6CC417', 'REQUEST_PAID')}
                                className="w-full h-[580px] border-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ACCORDION 8: CLAIM REJECTED TEMPLATE & PREVIEW */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('reqRejected')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">8. Claim Rejected Template & Preview</h4>
                        <p className="text-xs text-slate-400">Email sent to Claimant when a request is rejected by Manager/Admin</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {openEmailAccordions.reqRejected ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.reqRejected && (
                    <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                          {['{voucher_id}', '{amount}', '{paid_to}', '{particulars}', '{rejected_by}', '{remarks}', '{date}'].map((tag) => (
                            <button
                              key={`req-rej-email-${tag}`}
                              type="button"
                              onClick={() => setEmailBodyReqRejected(prev => prev + ' ' + tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-rose-800 cursor-pointer transition-all"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                          <input
                            type="text"
                            value={emailSubjectReqRejected}
                            onChange={(e) => setEmailSubjectReqRejected(e.target.value)}
                            placeholder="Subject line"
                            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                            required
                          />
                          <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                          <textarea
                            value={emailBodyReqRejected}
                            onChange={(e) => setEmailBodyReqRejected(e.target.value)}
                            rows={6}
                            className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Card Preview */}
                      {(() => {
                        const previewSubject = substituteSampleTags(emailSubjectReqRejected, appSettings.currencySymbol, false)
                          .replace(/\{rejected_by\}/g, 'Mohan (Manager)');
                        const previewBodyRaw = substituteSampleTags(emailBodyReqRejected, appSettings.currencySymbol, false)
                          .replace(/\{rejected_by\}/g, 'Mohan (Manager)');
                        const previewBlocks = parseBodyTextToBlocks(previewBodyRaw);

                        return (
                          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                  Claim Rejected HTML Email Card Preview
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                From: {msSenderName} &lt;{msSenderEmail}&gt;
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                            </div>

                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                              <iframe
                                title="Claim Rejected Email Preview"
                                srcDoc={buildModernHtmlEmailFromText('Petty Cash Claim Rejected', previewBodyRaw, '#f43f5e', 'REQUEST_REJECTED')}
                                className="w-full h-[580px] border-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ACCORDION 9: CLAIM RE-ROUTED TEMPLATE & PREVIEW */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleEmailAccordion('reqRerouted')}
                    className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">9. Claim Re-Routed Template & Preview</h4>
                        <p className="text-xs text-slate-400">Email sent to newly assigned Manager when an approval request is re-routed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {openEmailAccordions.reqRerouted ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {openEmailAccordions.reqRerouted && (
                    <div className="p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 mr-1">Insert Placeholders:</span>
                          {['{voucher_id}', '{amount}', '{paid_to}', '{particulars}', '{category}', '{date}', '{remarks}', '{attachment}', '{re_routed_to}', '{re_routed_by}', '{re_route_reason}', '{balance}'].map((tag) => (
                            <button
                              key={`req-reroute-email-${tag}`}
                              type="button"
                              onClick={() => setEmailBodyReqRerouted(prev => prev + ' ' + tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-[10px] font-mono font-bold text-slate-700 hover:text-amber-800 cursor-pointer transition-all"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Email Subject Line</label>
                          <input
                            type="text"
                            value={emailSubjectReqRerouted}
                            onChange={(e) => setEmailSubjectReqRerouted(e.target.value)}
                            placeholder="Subject line"
                            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-semibold"
                            required
                          />
                          <label className="block text-xs font-bold text-slate-700 pt-1">Email Body Text</label>
                          <textarea
                            value={emailBodyReqRerouted}
                            onChange={(e) => setEmailBodyReqRerouted(e.target.value)}
                            rows={6}
                            className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono leading-relaxed"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Card Preview */}
                      {(() => {
                        const previewSubject = substituteSampleTags(emailSubjectReqRerouted, appSettings.currencySymbol, false)
                          .replace(/\{re_routed_to\}/g, 'Rajesh Sharma')
                          .replace(/\{re_routed_by\}/g, 'Mohan Kumar')
                          .replace(/\{re_route_reason\}/g, 'Exceeds branch limit authorization threshold');
                        const previewBodyRaw = substituteSampleTags(emailBodyReqRerouted, appSettings.currencySymbol, false)
                          .replace(/\{re_routed_to\}/g, 'Rajesh Sharma')
                          .replace(/\{re_routed_by\}/g, 'Mohan Kumar')
                          .replace(/\{re_route_reason\}/g, 'Exceeds branch limit authorization threshold');

                        return (
                          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                  Claim Re-Routed HTML Email Card Preview
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                From: {msSenderName} &lt;{msSenderEmail}&gt;
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Subject: <span className="font-mono text-slate-800">{previewSubject}</span>
                            </div>

                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-2xl mx-auto">
                              <iframe
                                title="Claim Re-Routed Email Preview"
                                srcDoc={buildModernHtmlEmailFromText('Petty Cash Approval Request Re-Routed', previewBodyRaw, '#d97706', 'REQUEST_REROUTED')}
                                className="w-full h-[580px] border-0"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleResetEmailDefaults}
                    className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    Reset to Corporate Defaults
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleTestEmail}
                      className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-sky-600" />
                      Test Dispatched Email Payloads
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Petty Cash Templates
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SUBTAB 4.2: CRM TEMPLATES (UPCOMING) */}
          {templatesSubTab === 'CRM' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">CRM Communication Templates</h3>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-mono">
                          PREPARING MODULE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Automated customer correspondence, quotation dispatch, deal updates, and client onboarding templates.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-600" />
                      <h4 className="font-bold text-xs text-slate-800">Lead Welcome & Quotations</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Custom HTML email templates with dynamic price estimation tables and PDF quote attachments.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <h4 className="font-bold text-xs text-slate-800">Deal Progress & Reminders</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Automated milestone reminders, contract signing notifications, and payment invoice dispatches.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>CRM email and notification templates will automatically unlock when the CRM module is enabled.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 4.3: HRMS TEMPLATES (UPCOMING) */}
          {templatesSubTab === 'HRMS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">HRMS Communication Templates</h3>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-mono">
                          PREPARING MODULE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Offer letters, monthly salary slip notifications, leave approval alerts, and HR announcements.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-600" />
                      <h4 className="font-bold text-xs text-slate-800">Payslip & Compensation Dispatches</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Encrypted salary breakdown notifications with dynamic gross/net pay placeholders and PDF slip generation.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <h4 className="font-bold text-xs text-slate-800">Leave Approvals & Work Notices</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Automatic supervisor notifications for leave applications, attendance regularization, and team rosters.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>HRMS email templates and notices will automatically unlock when the HRMS module is enabled.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: SYSTEM OPERATIONS (BACKUP, RESTORE, ATTACHMENT MIGRATION, WIPE) */}
        {/* ======================================================== */}
        {activeTab === 'SYSTEM_OPERATIONS' && (
          <motion.div
            key="SYSTEM_OPERATIONS"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              
              {/* 1. Backup Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Download className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800">Export Complete Backup</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Download a full system JSON package containing all registered vouchers, user lists, categories, app settings, and audit logs for safekeeping.
                  </p>
                </div>

                <button
                  onClick={onBackupData}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  Download Complete System Backup (.json)
                </button>
              </div>

              {/* 2. Restore Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#f7b944] flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800">Restore System Backup</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Upload a previously generated system backup JSON file to restore all vouchers, users, and workspace configurations.
                  </p>

                  {restoreSuccess && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {restoreSuccess}
                    </div>
                  )}

                  {restoreError && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      {restoreError}
                    </div>
                  )}
                </div>

                <label className="w-full bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4" />
                  Upload & Restore Backup JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileRestore}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

            {/* 3. Cloudinary Attachment Migration Card */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Migrate Attachments to Cloudinary Storage</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Move all existing receipt images & PDF attachments stored as Base64 strings in Firestore directly to Cloudinary under Petty Cash/Year/Month folders to free up database storage space.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-amber-200/80 text-amber-950 px-3 py-1 rounded-full font-mono shrink-0">
                  {(transactions || []).filter(t => {
                    if (!t.receiptUrl) return false;
                    if (t.receiptUrl.startsWith('data:')) return true;
                    if (!t.receiptUrl.includes('cloudinary.com')) return true;
                    const cleanUrl = t.receiptUrl.split('?')[0];
                    return !/\.(pdf|png|jpg|jpeg|webp|gif|svg)$/i.test(cleanUrl);
                  }).length} Pending
                </span>
              </div>

              {cloudinaryMigrationStatus.message && (
                <div className="bg-white/90 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
                  {cloudinaryMigrationStatus.loading ? (
                    <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{cloudinaryMigrationStatus.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-amber-200/60">
                <p className="text-[11px] text-slate-500 font-medium">
                  {cloudinaryCloudName
                    ? `Ready to migrate to Cloudinary cloud '${cloudinaryCloudName}'`
                    : 'Requires Cloudinary Cloud Name (configured in Integrations tab)'}
                </p>

                <button
                  onClick={handleMigrateFirestoreToCloudinary}
                  disabled={cloudinaryMigrationStatus.loading || !cloudinaryCloudName}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  {cloudinaryMigrationStatus.loading ? 'Migrating Attachments...' : 'Start Migration to Cloudinary'}
                </button>
              </div>
            </div>

            {/* 4. Wipe All Data Card */}
            <div className="bg-rose-50/60 rounded-2xl border border-rose-200 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-rose-900">Danger Zone: Wipe All Financial Data</h3>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    Permanently clear all recorded deposit & expense vouchers, reset categories to clean defaults, and erase history. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsWipeModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  Wipe All Register Data
                </button>
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>
      </div>



      {/* ================================================= realm MODALS ================================================= */}
      {/* MODAL: TEST NOTIFICATION PAYLOAD DISPLAY                 */}
      {/* ======================================================== */}
      {testNotificationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {testNotificationModal.title}
              </h3>
              <button
                onClick={() => setTestNotificationModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {testNotificationModal.content}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTestNotificationModal(null)}
                className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Close Test Output
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {catError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  {catError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Travel & Site Visits"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Register Type</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as 'IN' | 'OUT' | 'BOTH')}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] rounded-xl text-xs cursor-pointer font-semibold"
                >
                  <option value="OUT">Expense</option>
                  <option value="IN">Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color Tag Accent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-xs font-mono text-slate-600">{catColor}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT USER                                   */}
      {/* ======================================================== */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800">
                {editingUser ? 'Edit System User' : 'Create New System User'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {userError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  {userError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={userEmpId}
                  onChange={(e) => setUserEmpId(e.target.value)}
                  placeholder="e.g. OEPL-104"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username / Login Identifier</label>
                <input
                  type="text"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  disabled={!!editingUser}
                  placeholder="e.g. ramesh"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. ramesh@ommaxelectric.com"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showModalPassword ? "text" : "password"}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                    className="w-full py-2.5 pl-3 pr-10 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                    title={showModalPassword ? "Hide Password" : "Show Password"}
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Access Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] rounded-xl text-xs cursor-pointer font-semibold"
                >
                  <option value="CUSTODIAN">User / Petty Cash Custodian</option>
                  <option value="MANAGER">Manager (Approver)</option>
                  <option value="ADMIN">System Administrator</option>
                  <option value="AUDITOR">Auditor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reporting To (Approval Manager)</label>
                <select
                  value={userReportingTo}
                  onChange={(e) => setUserReportingTo(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] rounded-xl text-xs cursor-pointer font-semibold text-slate-800"
                >
                  <option value="">-- Direct Admin / No Manager Assigned --</option>
                  {users
                    .filter(u => u.username !== userUsername)
                    .map(u => (
                      <option key={u.username} value={u.fullName}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Petty cash claims raised by this user will be routed to this person for authorization.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  Save User
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRM DELETE USER                               */}
      {/* ======================================================== */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-bold text-sm text-slate-800">Confirm User Deletion</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to revoke and delete user <strong className="text-slate-800 font-mono">{deleteConfirmUser}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteUser(deleteConfirmUser);
                  setDeleteConfirmUser(null);
                }}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Delete User
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT CRM INDUSTRY                           */}
      {/* ======================================================== */}
      {isIndustryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800">
                {editingIndustry ? 'Edit Industry Classification' : 'Add New Industry Classification'}
              </h3>
              <button
                onClick={() => setIsIndustryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIndustry} className="space-y-4">
              {industryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  {industryError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Industry Name</label>
                <input
                  type="text"
                  value={industryNameInput}
                  onChange={(e) => setIndustryNameInput(e.target.value)}
                  placeholder="e.g. Smart Metering & AMR"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIndustryModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  Save Industry
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE CONFIRM CRM INDUSTRY                       */}
      {/* ======================================================== */}
      {deleteConfirmIndustry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4"
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Industry Deletion</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete the industry <span className="font-bold text-slate-800">"{deleteConfirmIndustry}"</span>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmIndustry(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteIndustryDirect(deleteConfirmIndustry)}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT CRM BUSINESS CATEGORY                  */}
      {/* ======================================================== */}
      {isBizCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800">
                {editingBizCat ? 'Edit Business Category' : 'Add New Business Category'}
              </h3>
              <button
                onClick={() => setIsBizCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBizCat} className="space-y-4">
              {bizCatError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  {bizCatError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Category Name</label>
                <input
                  type="text"
                  value={bizCatNameInput}
                  onChange={(e) => setBizCatNameInput(e.target.value)}
                  placeholder="e.g. Public Utility / PSU"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-[#f7b944] focus:bg-white rounded-xl text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBizCatModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[#f7b944] hover:bg-[#e0a330] text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE CONFIRM CRM BUSINESS CATEGORY              */}
      {/* ======================================================== */}
      {deleteConfirmBizCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4"
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Business Category Deletion</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete the business category <span className="font-bold text-slate-800">"{deleteConfirmBizCat}"</span>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBizCat(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBizCatDirect(deleteConfirmBizCat)}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CATEGORY DELETE CONFIRMATION                      */}
      {/* ======================================================== */}
      {deleteConfirmCatName && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4"
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Category Deletion</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete the category <span className="font-bold text-slate-800">"{deleteConfirmCatName}"</span>?
                This category is not involved in any recorded transactions and will be removed permanently.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCatName(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(deleteConfirmCatName);
                  setDeleteConfirmCatName(null);
                }}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: WIPE ALL DATA CONFIRMATION                        */}
      {/* ======================================================== */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-rose-200 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">Security Check: Wipe Data</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete all deposit/expense vouchers and reset financial registers.
              To confirm, type <strong className="text-rose-600 font-mono select-all">WIPE</strong> in the box below:
            </p>

            <input
              type="text"
              value={wipeConfirmInput}
              onChange={(e) => setWipeConfirmInput(e.target.value)}
              placeholder="Type WIPE here"
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 focus:border-rose-500 rounded-xl text-xs font-mono uppercase tracking-widest font-bold"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsWipeModalOpen(false)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={wipeConfirmInput.trim().toUpperCase() !== 'WIPE'}
                onClick={handleWipeDataConfirm}
                className="py-2 px-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
              >
                Confirm Data Wipe
              </button>
            </div>
          </motion.div>
        </div>
      )}



    </div>
  );
}
