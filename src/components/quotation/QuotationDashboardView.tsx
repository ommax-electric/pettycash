import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  SolarQuotation, 
  QuotationStatus, 
  QuotationMasterConfig, 
  DEFAULT_QUOTATION_MASTER_CONFIG, 
  DEFAULT_LETTERHEAD_CONFIG,
  DEFAULT_SAVINGS_BENEFITS,
  DEFAULT_SUPPLY_INCLUDES,
  DEFAULT_INSTALLATION_INCLUDES,
  DEFAULT_TERMS_AND_CONDITIONS,
  DEFAULT_WARRANTY_CLAUSES,
  DEFAULT_COMPLETION_MILESTONES,
  DEFAULT_BRAND_DECLARATIONS,
  DEFAULT_BRAND_NOTES,
  DEFAULT_TECHNICAL_ASSUMPTIONS,
  DEFAULT_EXCLUSIONS,
  BOQItem, 
  SolarBenefitRow,
  QuotationRevision,
  interpolateSubject,
  stripEquipmentBrandNames,
  buildDefaultBOQItems,
  getStructureFeet,
  cleanStructureDescription,
  deriveAcCapacityKw,
  deriveDcCapacityKwp
} from '../../quotation/types';
import { CRMOpportunity, CRMAccount, CRMContact } from '../../crm/types';
import { User, AppSettings, formatDateToDMY } from '../../types';
import { 
  Plus, 
  Filter, 
  Calendar,
  FileText, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Edit3, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  FolderPlus, 
  RotateCcw, 
  ChevronDown,
  Sun,
  Zap,
  Battery,
  Layers,
  Star,
  IndianRupee,
  Calculator,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Trash2,
  History,
  RefreshCw,
  CheckSquare,
  Square,
  Save,
  AlertTriangle
} from 'lucide-react';
import Quotation5PagePrintView from './Quotation5PagePrintView';

interface QuotationDashboardViewProps {
  quotations: SolarQuotation[];
  opportunities: CRMOpportunity[];
  accounts: CRMAccount[];
  contacts: CRMContact[];
  currentUser: User | null;
  users?: User[];
  appSettings: AppSettings;
  masterConfig?: QuotationMasterConfig;
  onNavigateToTools: (quotationToEdit?: SolarQuotation) => void;
  onSaveQuotation?: (quotation: SolarQuotation, isSubmit?: boolean) => void;
  onUpdateQuotationStatus: (quotationId: string, status: QuotationStatus, reason?: string) => void;
  onDeleteQuotation?: (quotationId: string) => void;
  initialOpportunity?: CRMOpportunity | null;
  onClearInitialOpportunity?: () => void;
}

const ALL_STATUSES: { id: QuotationStatus; label: string }[] = [
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SENT', label: 'Submitted' },
  { id: 'UNDER_REVISION', label: 'Under Revision' },
  { id: 'WON', label: 'Won / Converted' },
  { id: 'LOST', label: 'Lost' }
];

const STANDARD_CAPACITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 100];
const PAGE_SIZE = 10;
const MASTER_CONFIG_STORAGE_KEY = 'ommax_solar_quotation_master_config';

// Helper to load live master configuration from Tools storage or prop
function getMasterConfig(propConfig?: QuotationMasterConfig): QuotationMasterConfig {
  if (propConfig) return propConfig;
  try {
    const raw = localStorage.getItem(MASTER_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_QUOTATION_MASTER_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Could not parse master config:', e);
  }
  return DEFAULT_QUOTATION_MASTER_CONFIG;
}

// Helper to auto-generate Offer No (e.g. SP26270025) and reuse released/deleted numbers synced with Tools Master Config
function generateOfferNo(existingQuotations: SolarQuotation[], config?: QuotationMasterConfig): string {
  const cfg = config || getMasterConfig();
  const prefix = (cfg.offerPrefix !== undefined && cfg.offerPrefix !== null && cfg.offerPrefix !== '') ? cfg.offerPrefix : 'SP';
  const yearCode = (cfg.offerYearCode !== undefined && cfg.offerYearCode !== null && cfg.offerYearCode !== '') ? cfg.offerYearCode : '2627';
  const startSeq = (cfg.offerStartingSeq && cfg.offerStartingSeq > 0) ? cfg.offerStartingSeq : 1;
  const usedNumbers = new Set<number>();

  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedYear = yearCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedPrefix}${escapedYear}(\\d+)`, 'i');

  existingQuotations.forEach(q => {
    if (q.offerNo) {
      const baseOffer = q.offerNo.split('-')[0].trim();
      const match = baseOffer.match(regex) || baseOffer.match(/(\d{4})$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
          usedNumbers.add(num);
        }
      }
    }
  });

  // Start from sequence configured in Tools module and find lowest available sequence number
  let seq = startSeq;
  while (usedNumbers.has(seq)) {
    seq++;
  }

  return `${prefix}${yearCode}${String(seq).padStart(4, '0')}`;
}

// Helper to generate revised Offer No (e.g. SP26270025-R01, SP26270025-R02)
function getRevisedOfferDetails(currentOfferNo: string, currentRevisionIndex = 0) {
  const match = currentOfferNo.match(/^(.*?)(?:[-_ ]*R[-_ ]*(\d+))$/i);
  let baseOffer = currentOfferNo;
  let nextRevNum = (currentRevisionIndex || 0) + 1;

  if (match) {
    baseOffer = match[1].trim();
    const extractedNum = parseInt(match[2], 10);
    if (!isNaN(extractedNum)) {
      nextRevNum = Math.max(nextRevNum, extractedNum + 1);
    }
  }

  const padRev = String(nextRevNum).padStart(2, '0');
  const newOfferNo = `${baseOffer}-R${padRev}`;
  const revisionCode = `R-${padRev}`;

  return {
    baseOffer,
    nextRevNum,
    newOfferNo,
    revisionCode
  };
}

interface MasterDiffSection {
  key: string;
  tabId: string;
  title: string;
  desc: string;
  isModified?: boolean;
  changesSummary: string;
  applySync: (quo: SolarQuotation, master: QuotationMasterConfig) => Partial<SolarQuotation>;
}

// Helper to deeply compare arrays of strings or objects
function isDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

// Helper to reliably detect primary equipment lines (Module, Inverter, Battery, Structure)
// so that only true Balance of System (BOS) items remain in default supply lists.
export function isPrimaryEquipmentSupplyLine(item: string): boolean {
  if (!item || !item.trim()) return false;
  const lower = item.toLowerCase().trim();

  // Module / Panel keywords
  if (
    lower.includes('solar pv module') ||
    lower.includes('solar module') ||
    lower.includes('mono perc') ||
    lower.includes('topcon') ||
    lower.includes('bifacial') ||
    lower.includes('half-cut') ||
    lower.includes('dcr panels') ||
    lower.includes('pv panel') ||
    lower.includes('solar panel') ||
    lower.includes('wp panel') ||
    lower.includes('glass-to-glass') ||
    lower.startsWith('solar module')
  ) {
    return true;
  }

  // Inverter keywords
  if (
    lower.includes('inverter') ||
    lower.includes('micro-inverter') ||
    lower.includes('grid-tied') ||
    lower.includes('hybrid solar') ||
    lower.startsWith('inverter')
  ) {
    return true;
  }

  // Battery keywords
  if (
    lower.includes('battery') ||
    lower.includes('bess') ||
    lower.includes('energy storage') ||
    lower.includes('lithium ferro') ||
    lower.includes('lfp') ||
    lower.includes('tubular') ||
    lower.startsWith('battery')
  ) {
    return true;
  }

  // Structure keywords
  if (
    lower.includes('mounting structure') ||
    lower.includes('structure elevation') ||
    lower.includes('rcc mounting') ||
    lower.includes('flush mount') ||
    lower.includes('ground mounted') ||
    lower.includes('super high-rise') ||
    lower.includes('hdg structure') ||
    lower.includes('aluminium rails') ||
    lower.includes('walkable roof') ||
    lower.includes('table rcc') ||
    lower.startsWith('mounting structure') ||
    lower.startsWith('module mounting') ||
    lower.startsWith('structure')
  ) {
    return true;
  }

  return false;
}

// Helper to detect differences between current quotation snapshot and latest Master Configuration across all Tools tabs
function detectMasterConfigDiffs(quo: SolarQuotation, master: QuotationMasterConfig): MasterDiffSection[] {
  const sections: MasterDiffSection[] = [];

  // 1. General Tab (Subject Template / Validity / Salutation)
  const currentSalutation = (quo.salutation || '').trim();
  const masterSalutation = (master.defaultToSalutation || '').trim();
  const isSalutationDifferent = Boolean(masterSalutation && currentSalutation && masterSalutation !== currentSalutation);
  sections.push({
    key: 'general',
    tabId: 'GENERAL',
    title: 'General (Salutation & Defaults)',
    desc: 'Default to-salutation and greeting settings',
    isModified: isSalutationDifferent,
    changesSummary: isSalutationDifferent ? `Master Salutation: "${masterSalutation}" vs Proposal: "${currentSalutation}"` : 'Salutation matches Master Config',
    applySync: (q, m) => ({
      salutation: m.defaultToSalutation || q.salutation
    })
  });

  // 2. Intro Tab (Opening Narrative / Intro Opening Text)
  const currentIntro = (quo.introOpeningText || '').trim();
  const masterIntro = (master.introOpeningText || '').trim();
  const isIntroDifferent = Boolean(masterIntro && currentIntro && masterIntro !== currentIntro);
  sections.push({
    key: 'intro',
    tabId: 'INTRO',
    title: 'Intro (Opening Proposal Text)',
    desc: 'Introductory proposal paragraph narrative template',
    isModified: isIntroDifferent,
    changesSummary: isIntroDifferent ? 'Master intro opening text template has been updated in Tools module.' : 'Intro narrative matches Master Config',
    applySync: (q, m) => ({
      introOpeningText: m.introOpeningText || q.introOpeningText
    })
  });

  // 3a. Scope of Work Tab (Supply Includes & BOS Items)
  const currentBosSupply = (quo.supplyIncludes || [])
    .filter(item => !isPrimaryEquipmentSupplyLine(item))
    .map(s => s.trim());

  const masterSupply = ((master.defaultSupplyIncludes && master.defaultSupplyIncludes.length > 0)
    ? master.defaultSupplyIncludes
    : DEFAULT_SUPPLY_INCLUDES).map(s => s.trim());

  const isSupplyListDiff = masterSupply.length !== currentBosSupply.length ||
    masterSupply.some((item, idx) => item !== currentBosSupply[idx]);

  const isSupplyDiff = isSupplyListDiff;

  sections.push({
    key: 'scopeOfWorkSupply',
    tabId: 'SCOPE_OF_WORK',
    title: 'Scope of Work (Supply Includes & BOS Inclusions)',
    desc: 'Standard BOS supply inclusions (ACDB/DCDB, cabling, earthing, net-metering)',
    isModified: isSupplyDiff,
    changesSummary: isSupplyDiff
      ? 'Master BOS supply includes checklist has been updated in Tools module.'
      : 'Supply includes match Master Config',
    applySync: (q, m) => {
      const dynamicEquipment = (q.supplyIncludes || []).filter(item => isPrimaryEquipmentSupplyLine(item));
      const latestMasterSupply = (m.defaultSupplyIncludes && m.defaultSupplyIncludes.length > 0)
        ? m.defaultSupplyIncludes
        : DEFAULT_SUPPLY_INCLUDES;
      
      const combined = [...dynamicEquipment, ...latestMasterSupply];
      const seen = new Set<string>();
      const cleanSupply: string[] = [];
      for (const it of combined) {
        const tr = it.trim();
        if (tr && !seen.has(tr.toLowerCase())) {
          seen.add(tr.toLowerCase());
          cleanSupply.push(tr);
        }
      }
      return {
        supplyIncludes: cleanSupply
      };
    }
  });

  // 3b. Scope of Work Tab (Installation Scope Inclusions)
  const currentInstall = (quo.installationIncludes || []).map(s => s.trim());
  const masterInstall = ((master.defaultInstallationIncludes && master.defaultInstallationIncludes.length > 0)
    ? master.defaultInstallationIncludes
    : DEFAULT_INSTALLATION_INCLUDES).map(s => s.trim());
  const isInstallDifferent = masterInstall.length !== currentInstall.length ||
    masterInstall.some((item, idx) => item !== currentInstall[idx]);

  sections.push({
    key: 'scopeOfWork',
    tabId: 'SCOPE_OF_WORK',
    title: 'Scope of Work (Installation Scope)',
    desc: 'Standard installation and commissioning inclusions',
    isModified: isInstallDifferent,
    changesSummary: isInstallDifferent ? 'Standard installation & commissioning scope clauses have been updated in Tools module.' : 'Installation scope matches Master Config',
    applySync: (q, m) => ({
      installationIncludes: (m.defaultInstallationIncludes && m.defaultInstallationIncludes.length > 0) ? m.defaultInstallationIncludes : q.installationIncludes
    })
  });

  // 4. Payment Terms Tab (Advance %, Delivery %, Installation %, Subsidy Note)
  const isAdvanceDiff = (master.defaultAdvancePercent !== undefined && quo.advancePaymentPercent !== undefined && master.defaultAdvancePercent !== quo.advancePaymentPercent);
  const isDeliveryDiff = (master.defaultDeliveryPercent !== undefined && quo.deliveryPaymentPercent !== undefined && master.defaultDeliveryPercent !== quo.deliveryPaymentPercent);
  const isInstallPercDiff = (master.defaultInstallationPercent !== undefined && quo.installationPaymentPercent !== undefined && master.defaultInstallationPercent !== quo.installationPaymentPercent);
  const isMilestonesDifferent = Boolean(isAdvanceDiff || isDeliveryDiff || isInstallPercDiff);
  sections.push({
    key: 'paymentMilestones',
    tabId: 'PAYMENT_TERMS',
    title: 'Payment Terms (Milestone Percentages)',
    desc: 'Advance %, Delivery %, and Installation % milestone splits',
    isModified: isMilestonesDifferent,
    changesSummary: isMilestonesDifferent ? `Master Splits: Advance ${master.defaultAdvancePercent ?? 50}%, Delivery ${master.defaultDeliveryPercent ?? 40}%, Install ${master.defaultInstallationPercent ?? 10}% vs Proposal: ${quo.advancePaymentPercent ?? 50}% / ${quo.deliveryPaymentPercent ?? 40}% / ${quo.installationPaymentPercent ?? 10}%` : 'Payment milestones match Master Config',
    applySync: (q, m) => ({
      advancePaymentPercent: m.defaultAdvancePercent ?? q.advancePaymentPercent,
      deliveryPaymentPercent: m.defaultDeliveryPercent ?? q.deliveryPaymentPercent,
      installationPaymentPercent: m.defaultInstallationPercent ?? q.installationPaymentPercent
    })
  });

  const currentSubsidy = (quo.subsidyNote || '').trim();
  const masterSubsidy = (master.defaultSubsidyNote || '').trim();
  const isSubsidyDiff = Boolean(masterSubsidy && currentSubsidy && masterSubsidy !== currentSubsidy);
  sections.push({
    key: 'subsidyNote',
    tabId: 'PAYMENT_TERMS',
    title: 'Payment Terms (Subsidy Note / DBT)',
    desc: 'PM Surya Ghar DBT policy disclaimer & government subsidy note',
    isModified: isSubsidyDiff,
    changesSummary: isSubsidyDiff ? 'Master Central Subsidy DBT note has been updated in Tools module.' : 'Subsidy disclaimer matches Master Config',
    applySync: (q, m) => ({
      subsidyNote: m.defaultSubsidyNote || q.subsidyNote
    })
  });

  // 5. Banking Details Tab
  const isBankDiff = Boolean(
    (master.beneficiaryName && (quo.beneficiaryName || '').trim() !== master.beneficiaryName.trim()) ||
    (master.bankName && (quo.bankName || '').trim() !== master.bankName.trim()) ||
    (master.accountNumber && (quo.accountNumber || '').trim() !== master.accountNumber.trim()) ||
    (master.ifscCode && (quo.ifscCode || '').trim() !== master.ifscCode.trim()) ||
    (master.accountType && (quo.accountType || '').trim() !== master.accountType.trim()) ||
    (master.bankAddress && (quo.bankAddress || '').trim() !== master.bankAddress.trim()) ||
    (master.micrNumber && (quo.micrNumber || '').trim() !== master.micrNumber.trim())
  );
  sections.push({
    key: 'banking',
    tabId: 'BANKING_DETAILS',
    title: 'Banking Details',
    desc: 'Beneficiary Name, Bank, A/C No, IFSC, MICR, and Branch Address',
    isModified: isBankDiff,
    changesSummary: isBankDiff ? `Master Bank: ${master.bankName || ''} (${master.accountNumber || ''}) vs Proposal: ${quo.bankName || ''} (${quo.accountNumber || ''})` : 'Banking details match Master Config',
    applySync: (q, m) => ({
      beneficiaryName: m.beneficiaryName || q.beneficiaryName,
      bankName: m.bankName || q.bankName,
      accountNumber: m.accountNumber || q.accountNumber,
      accountType: m.accountType || q.accountType,
      ifscCode: m.ifscCode || q.ifscCode,
      micrNumber: m.micrNumber || q.micrNumber,
      bankAddress: m.bankAddress || q.bankAddress
    })
  });

  // 6. Terms & Conditions Tab
  const masterTerms = (master.termsAndConditions && master.termsAndConditions.length > 0) ? master.termsAndConditions : DEFAULT_TERMS_AND_CONDITIONS;
  const quoTerms = quo.termsAndConditions || [];
  const isTermsDiff = masterTerms.length !== quoTerms.length ||
    masterTerms.some((t, i) => (t || '').trim() !== (quoTerms[i] || '').trim());

  sections.push({
    key: 'terms',
    tabId: 'TERMS_AND_CONDITIONS',
    title: 'Terms & Conditions',
    desc: 'Standard commercial clauses, statutory conditions, and validity terms',
    isModified: isTermsDiff,
    changesSummary: isTermsDiff ? `Master has ${masterTerms.length} terms vs Proposal snapshot with ${(quo.termsAndConditions || []).length} terms.` : 'Terms and conditions match Master Config',
    applySync: (q, m) => ({
      termsAndConditions: (m.termsAndConditions && m.termsAndConditions.length > 0) ? m.termsAndConditions : q.termsAndConditions
    })
  });

  // 7. Warranty Tab
  const masterWarrantyClauses = (master.warrantyClauses && master.warrantyClauses.length > 0)
    ? master.warrantyClauses
    : DEFAULT_WARRANTY_CLAUSES;
  const quoWarrantyClauses = (quo.warrantyClauses && quo.warrantyClauses.length > 0)
    ? quo.warrantyClauses
    : DEFAULT_WARRANTY_CLAUSES;
  const isWarrantyClausesDiff = !isDeepEqual(masterWarrantyClauses, quoWarrantyClauses);
  sections.push({
    key: 'warranties',
    tabId: 'WARRANTY',
    title: 'Warranty Terms & Clauses',
    desc: 'Standard warranty specifications and equipment clauses',
    isModified: isWarrantyClausesDiff,
    changesSummary: isWarrantyClausesDiff ? 'Master warranty terms and equipment clauses have been updated in Tools module.' : 'Warranty terms match Master Config',
    applySync: (q, m) => ({
      warrantyClauses: (m.warrantyClauses && m.warrantyClauses.length > 0) ? m.warrantyClauses : q.warrantyClauses,
      moduleWarrantyYears: m.moduleWarrantyYears || q.moduleWarrantyYears,
      inverterWarrantyYears: m.defaultInverterWarranty ? (parseInt(m.defaultInverterWarranty) || 5) : q.inverterWarrantyYears,
      balanceOfSystemWarrantyYears: m.defaultBosWarranty ? (parseInt(m.defaultBosWarranty) || 1) : q.balanceOfSystemWarrantyYears
    })
  });

  // 8. Project Completion Tab
  const masterMilestones = (master.completionMilestones && master.completionMilestones.length > 0)
    ? master.completionMilestones
    : DEFAULT_COMPLETION_MILESTONES;
  const quoMilestones = (quo.completionMilestones && quo.completionMilestones.length > 0)
    ? quo.completionMilestones
    : DEFAULT_COMPLETION_MILESTONES;
  const isCompletionDiff = !isDeepEqual(masterMilestones, quoMilestones);
  sections.push({
    key: 'projectCompletion',
    tabId: 'PROJECT_COMPLETION',
    title: 'Project Completion Milestones',
    desc: 'Standard project execution and delivery milestones',
    isModified: isCompletionDiff,
    changesSummary: isCompletionDiff ? 'Master project execution milestones have been updated in Tools module.' : 'Project completion milestones match Master Config',
    applySync: (q, m) => ({
      completionMilestones: (m.completionMilestones && m.completionMilestones.length > 0) ? m.completionMilestones : q.completionMilestones,
      projectCompletionWeeks: m.defaultCompletionWeeks || q.projectCompletionWeeks
    })
  });

  // 9. Estimated Solar Benefits Tab (Assumptions & matrix)
  const isTariffAssumptionsDiff = master.tariffAssumptions && !isDeepEqual(master.tariffAssumptions, quo.tariffAssumptions || []);
  const isBenefitsTableDiff = master.benefitsTable && !isDeepEqual(master.benefitsTable, quo.benefitsTable || []);
  const isSolarBenefitsDiff = Boolean(isTariffAssumptionsDiff || isBenefitsTableDiff);
  sections.push({
    key: 'discomTariff',
    tabId: 'ESTIMATED_SOLAR_BENEFITS',
    title: 'Estimated Solar Benefits (Assumptions & Matrix)',
    desc: 'Solar generation assumptions and ROI table matrix',
    isModified: isSolarBenefitsDiff,
    changesSummary: isSolarBenefitsDiff ? 'Solar generation assumptions or benefits table matrix have been updated in Tools module.' : 'Solar benefits match Master Config',
    applySync: (q, m) => ({
      tariffAssumptions: (m.tariffAssumptions && m.tariffAssumptions.length > 0) ? m.tariffAssumptions : q.tariffAssumptions,
      benefitsTable: (m.benefitsTable && m.benefitsTable.length > 0) ? m.benefitsTable : q.benefitsTable
    })
  });

  // 10. Brand Declaration Tab
  const masterBrands = master.brandDeclarations || DEFAULT_BRAND_DECLARATIONS;
  const quoBrands = quo.brandDeclarations || [];
  const isBrandDeclarationsDiff = masterBrands.length !== quoBrands.length ||
    masterBrands.some((mb, idx) => {
      const qb = quoBrands[idx];
      if (!qb) return true;
      return (mb.description || '').trim() !== (qb.description || '').trim() ||
             (mb.brand || '').trim() !== (qb.brand || '').trim() ||
             (mb.warrantySpec || '').trim() !== (qb.warrantySpec || '').trim();
    });
  const isBrandNotesDiff = master.brandNotes && !isDeepEqual(master.brandNotes, quo.brandNotes || []);
  const isBrandDiff = Boolean(isBrandDeclarationsDiff || isBrandNotesDiff);
  sections.push({
    key: 'brandDeclaration',
    tabId: 'BRAND_DECLARATION',
    title: 'Brand Declaration & Matrix',
    desc: 'Approved make/brand matrix list and manufacturer notes',
    isModified: isBrandDiff,
    changesSummary: isBrandDiff ? 'Master approved brand matrix list and brand notes have been updated in Tools module.' : 'Brand declarations match Master Config',
    applySync: (q, m) => ({
      brandDeclarations: (m.brandDeclarations && m.brandDeclarations.length > 0) ? m.brandDeclarations : q.brandDeclarations,
      brandNotes: (m.brandNotes && m.brandNotes.length > 0) ? m.brandNotes : q.brandNotes
    })
  });

  // 11. Technical Assumptions Tab
  const masterTech = master.technicalAssumptions || DEFAULT_TECHNICAL_ASSUMPTIONS;
  const quoTech = quo.technicalAssumptions || [];
  const isTechDiff = masterTech.length !== quoTech.length ||
    masterTech.some((t, i) => (t || '').trim() !== (quoTech[i] || '').trim());

  sections.push({
    key: 'technicalAssumptions',
    tabId: 'TECHNICAL_ASSUMPTIONS',
    title: 'Technical Assumptions',
    desc: 'Technical boundary conditions, roof tilt, and standard cable run specifications',
    isModified: Boolean(isTechDiff),
    changesSummary: isTechDiff ? 'Master technical assumptions list has been updated in Tools module.' : 'Technical assumptions match Master Config',
    applySync: (q, m) => ({
      technicalAssumptions: (m.technicalAssumptions && m.technicalAssumptions.length > 0) ? m.technicalAssumptions : q.technicalAssumptions
    })
  });

  // 12. Exclusions Tab
  const masterExcl = master.exclusions || DEFAULT_EXCLUSIONS;
  const quoExcl = quo.exclusions || [];
  const isExclusionsDiff = masterExcl.length !== quoExcl.length ||
    masterExcl.some((e, i) => (e || '').trim() !== (quoExcl[i] || '').trim());

  sections.push({
    key: 'exclusions',
    tabId: 'EXCLUSIONS',
    title: 'Standard Exclusions',
    desc: 'Civil/statutory exclusions and customer scope responsibilities',
    isModified: Boolean(isExclusionsDiff),
    changesSummary: isExclusionsDiff ? 'Master exclusions list has been updated in Tools module.' : 'Exclusions match Master Config',
    applySync: (q, m) => ({
      exclusions: (m.exclusions && m.exclusions.length > 0) ? m.exclusions : q.exclusions
    })
  });

  // 13. Disclaimer Tab
  const masterDisclaimer = (master.warrantyDisclaimer || '').trim();
  const currentDisclaimer = (quo.warrantyDisclaimer || '').trim();
  const isDisclaimerDiff = Boolean(masterDisclaimer && currentDisclaimer && masterDisclaimer !== currentDisclaimer);
  sections.push({
    key: 'warrantyDisclaimer',
    tabId: 'DISCLAIMER',
    title: 'Warranty Disclaimer Text',
    desc: 'Manufacturer warranty pass-through & replacement policy clauses',
    isModified: isDisclaimerDiff,
    changesSummary: isDisclaimerDiff ? 'Master warranty disclaimer clauses have been updated in Tools module.' : 'Disclaimer matches Master Config',
    applySync: (q, m) => ({
      warrantyDisclaimer: m.warrantyDisclaimer || q.warrantyDisclaimer
    })
  });

  // 14. Add-on & Pricing Tab (Signatory, Stamp, GST Rates & Letterhead)
  const isSignatoryDiff = (master.authorizedSignatoryName && quo.authorizedSignatoryName && master.authorizedSignatoryName.trim() !== quo.authorizedSignatoryName.trim()) ||
    (master.signatoryDesignation && quo.signatoryDesignation && master.signatoryDesignation.trim() !== quo.signatoryDesignation.trim());
  const isStampDiff = (master.companyStampUrl !== undefined && quo.companyStampUrl !== undefined && master.companyStampUrl !== quo.companyStampUrl) ||
    (master.companyStampEnabled !== undefined && quo.companyStampEnabled !== undefined && master.companyStampEnabled !== quo.companyStampEnabled);
  const isGstDiff = Boolean(
    (master.gstGoodsPercent !== undefined && quo.gstGoodsPercent !== undefined && master.gstGoodsPercent !== quo.gstGoodsPercent) ||
    (master.gstGoodsRate !== undefined && quo.gstGoodsRate !== undefined && master.gstGoodsRate !== quo.gstGoodsRate) ||
    (master.gstServicesPercent !== undefined && quo.gstServicesPercent !== undefined && master.gstServicesPercent !== quo.gstServicesPercent) ||
    (master.gstServicesRate !== undefined && quo.gstServicesRate !== undefined && master.gstServicesRate !== quo.gstServicesRate)
  );
  const isStampSectionDiff = Boolean(isSignatoryDiff || isStampDiff || isGstDiff);
  sections.push({
    key: 'brandingStamp',
    tabId: 'ADDON_PRICING',
    title: 'Pricing & Signatory Stamp',
    desc: 'Authorized Signatory Name, Designation, Company Stamp seal, and GST rates',
    isModified: isStampSectionDiff,
    changesSummary: isStampSectionDiff ? `Master Signatory: "${master.authorizedSignatoryName}" vs Proposal: "${quo.authorizedSignatoryName}"` : 'Signatory and stamp settings match Master Config',
    applySync: (q, m) => ({
      authorizedSignatoryName: m.authorizedSignatoryName || q.authorizedSignatoryName,
      signatoryDesignation: m.signatoryDesignation || q.signatoryDesignation,
      companyStampEnabled: m.companyStampEnabled ?? q.companyStampEnabled,
      companyStampUrl: m.companyStampUrl !== undefined ? m.companyStampUrl : q.companyStampUrl,
      companyStampWidth: m.companyStampWidth ?? q.companyStampWidth,
      companyStampRotate: m.companyStampRotate ?? q.companyStampRotate,
      companyStampOpacity: m.companyStampOpacity ?? q.companyStampOpacity,
      gstGoodsPercent: m.gstGoodsPercent ?? q.gstGoodsPercent,
      gstGoodsRate: m.gstGoodsRate ?? q.gstGoodsRate,
      gstServicesPercent: m.gstServicesPercent ?? q.gstServicesPercent,
      gstServicesRate: m.gstServicesRate ?? q.gstServicesRate
    })
  });

  return sections;
}

// Complete Quotation Generator based on the questionnaire answers
function createCompleteQuotation(
  formData: {
    opportunityId?: string;
    clientName: string;
    contactPhone: string;
    contactEmail: string;
    location: string;
    offerNo: string;
    capacityKw: number;
    solarModule: string;
    inverter: string;
    battery: string;
    batteryQty: number;
    structureElevation: string;
    pricingMode: 'MANUAL' | 'AUTOMATIC';
    manualTotal: number;
    discountAmount?: number;
    connectionType?: string;
    targetSegment?: string;
    scheme?: string;
    starModule?: boolean;
    starInverter?: boolean;
    starBattery?: boolean;
    starStructure?: boolean;
    structureFeet?: number;
  },
  masterConfig: QuotationMasterConfig,
  currentUser: User | null,
  existingQuotation?: SolarQuotation
): SolarQuotation {
  const capacity = formData.capacityKw;
  const isBatteryActive = Boolean(formData.battery && !formData.battery.toLowerCase().includes('nil') && formData.batteryQty > 0);

  // Pricing calculations
  let basicCost = 0;
  let gstGoodsAmount = 0;
  let gstServicesAmount = 0;
  let totalGst = 0;
  let grandTotal = 0;
  const discount = formData.discountAmount || 0;

  const gstGoodsPercent = masterConfig.gstGoodsPercent || 80;
  const gstGoodsRate = masterConfig.gstGoodsRate || 5;
  const gstServicesPercent = masterConfig.gstServicesPercent || 20;
  const gstServicesRate = masterConfig.gstServicesRate || 18;

  // Dual GST Effective Multiplier: 0.80 * 1.05 + 0.20 * 1.18 = 1.076
  const goodsFactor = (gstGoodsPercent / 100) * (1 + gstGoodsRate / 100);
  const servicesFactor = (gstServicesPercent / 100) * (1 + gstServicesRate / 100);
  const totalMultiplier = goodsFactor + servicesFactor;

  if (formData.pricingMode === 'MANUAL') {
    const rawTotal = formData.manualTotal > 0 ? formData.manualTotal : Math.round(capacity * 60000);
    basicCost = Math.round(rawTotal / totalMultiplier);
    const goodsBase = basicCost * (gstGoodsPercent / 100);
    const servicesBase = basicCost * (gstServicesPercent / 100);
    gstGoodsAmount = Math.round(goodsBase * (gstGoodsRate / 100));
    // Reconcile services tax so basicCost + totalGst exactly equals rawTotal without any +/- ₹1 rounding drift
    gstServicesAmount = Math.max(0, (rawTotal - basicCost) - gstGoodsAmount);
    totalGst = gstGoodsAmount + gstServicesAmount;
    grandTotal = Math.max(0, rawTotal - discount);
  } else {
    const solarBase = capacity * 55000;
    const batteryBase = isBatteryActive ? (formData.batteryQty * 95000) : 0;
    basicCost = Math.round(solarBase + batteryBase);
    const goodsBase = basicCost * (gstGoodsPercent / 100);
    const servicesBase = basicCost * (gstServicesPercent / 100);
    gstGoodsAmount = Math.round(goodsBase * (gstGoodsRate / 100));
    gstServicesAmount = Math.round(servicesBase * (gstServicesRate / 100));
    totalGst = gstGoodsAmount + gstServicesAmount;
    grandTotal = Math.max(0, basicCost + totalGst - discount);
  }

  // Supply Scope Items - include section if starred in masterConfig.starredSupplySections (configured in Tools)
  const sections = masterConfig.starredSupplySections || { module: true, inverter: true, battery: false, structure: true };
  const starModule = formData.starModule !== undefined ? formData.starModule : (sections.module !== false);
  const starInverter = formData.starInverter !== undefined ? formData.starInverter : (sections.inverter !== false);
  const starBattery = formData.starBattery !== undefined ? formData.starBattery : (sections.battery === true);
  const starStructure = formData.starStructure !== undefined ? formData.starStructure : (sections.structure !== false);

  const dynamicSupply: string[] = [];
  if (starModule && formData.solarModule && !formData.solarModule.toLowerCase().includes('nil')) {
    let cleanMod = formData.solarModule.replace(/^solar\s*pv\s*modules?\s*[-–:]\s*/i, '').trim();
    cleanMod = stripEquipmentBrandNames(cleanMod);
    if (cleanMod) dynamicSupply.push(cleanMod);
  }
  if (starInverter && formData.inverter && !formData.inverter.toLowerCase().includes('nil')) {
    let cleanInv = formData.inverter.replace(/^(?:grid-tied\s*\/\s*hybrid\s*)?solar\s*inverter\s*[-–:]\s*/i, '').trim();
    cleanInv = stripEquipmentBrandNames(cleanInv);
    if (cleanInv) dynamicSupply.push(cleanInv);
  }
  const isBatteryNil = !isBatteryActive || !formData.battery || formData.battery.toLowerCase().includes('nil') || (formData.batteryQty !== undefined && formData.batteryQty <= 0);
  if (starBattery && formData.battery && !isBatteryNil) {
    let cleanBat = formData.battery.replace(/^battery(?:\s*energy)?(?:\s*storage)?(?:\s*bank)?\s*[-–:]\s*/i, '').trim();
    cleanBat = cleanBat.replace(/\s*\((?:qty:\s*)?\d+\s*nos\)/gi, '').trim();
    cleanBat = stripEquipmentBrandNames(cleanBat);
    if (cleanBat && !cleanBat.toLowerCase().includes('nil')) {
      dynamicSupply.push(cleanBat);
    }
  }
  const isStructureNil = !formData.structureElevation || formData.structureElevation.toLowerCase().includes('nil') || (formData.structureFeet !== undefined && formData.structureFeet <= 0);
  if (starStructure && formData.structureElevation && !isStructureNil) {
    let cleanStruct = cleanStructureDescription(formData.structureElevation);
    cleanStruct = stripEquipmentBrandNames(cleanStruct);
    if (cleanStruct && !cleanStruct.toLowerCase().includes('nil')) {
      dynamicSupply.push(cleanStruct);
    }
  }

  const rawDefaultList = (existingQuotation?.supplyIncludes && existingQuotation.supplyIncludes.length > 0)
    ? existingQuotation.supplyIncludes
    : ((masterConfig.defaultSupplyIncludes && masterConfig.defaultSupplyIncludes.length > 0)
      ? masterConfig.defaultSupplyIncludes
      : DEFAULT_SUPPLY_INCLUDES);

  // Filter out any primary equipment lines from defaultList (since primary equipment is dynamic)
  const defaultList = rawDefaultList.filter(item => !isPrimaryEquipmentSupplyLine(item));

  // Combine dynamic primary equipment and non-equipment BOS items with strict deduplication
  const combinedSupply = [...dynamicSupply, ...defaultList];
  const seenSupply = new Set<string>();
  const supplyIncludes: string[] = [];
  for (const item of combinedSupply) {
    const clean = item.trim();
    if (clean && !seenSupply.has(clean.toLowerCase())) {
      seenSupply.add(clean.toLowerCase());
      supplyIncludes.push(clean);
    }
  }

  const acCapacityKw = capacity;
  const dcCapacityKwp = deriveDcCapacityKwp(capacity, undefined, masterConfig.defaultSolarPlateWp, formData.solarModule);

  // BOQ Items - Standardized base items + configured defaults from Pricing
  const boqItems: BOQItem[] = buildDefaultBOQItems({
    capacityKw: acCapacityKw,
    capacityKwp: dcCapacityKwp,
    solarModule: formData.solarModule,
    inverter: formData.inverter,
    battery: formData.battery,
    batteryQty: formData.batteryQty,
    isBatteryActive: isBatteryActive,
    structureElevation: formData.structureElevation,
    structureFeet: formData.structureFeet,
    basicCost: basicCost,
    defaultBoqItems: masterConfig.defaultBoqItems
  });

  // Benefits table: directly from Tools module master configuration or existing quotation snapshot
  const benefitsTable: SolarBenefitRow[] = (existingQuotation?.benefitsTable && existingQuotation.benefitsTable.length > 0)
    ? existingQuotation.benefitsTable
    : ((masterConfig.benefitsTable && masterConfig.benefitsTable.length > 0)
      ? masterConfig.benefitsTable
      : DEFAULT_SAVINGS_BENEFITS);

  const now = new Date();
  const validityDate = new Date();
  validityDate.setDate(now.getDate() + (masterConfig.defaultPriceValidityWeeks ? masterConfig.defaultPriceValidityWeeks * 7 : 28));
  const dateStr = now.toISOString().split('T')[0];
  const validityStr = validityDate.toISOString().split('T')[0];

  const id = existingQuotation?.id || `quo-${Date.now()}`;
  const quotationNo = existingQuotation?.quotationNo || formData.offerNo || `QUO-2026-${String(Date.now()).slice(-4)}`;

  // Revision & Status handling
  const revMatch = formData.offerNo.match(/R[-_ ]*(\d+)/i);
  const revNum = revMatch ? parseInt(revMatch[1], 10) : (existingQuotation?.revisionIndex || 0);
  const revisionCode = revNum > 0 ? `R-${String(revNum).padStart(2, '0')}` : (existingQuotation?.revisionCode || 'R-0');
  const revisionIndex = revNum;
  const status: QuotationStatus = existingQuotation
    ? (existingQuotation.status === 'SENT' ? 'UNDER_REVISION' : existingQuotation.status)
    : 'DRAFT';

  // Build structured revision history log if this is a revision of an existing quotation
  const historyList: QuotationRevision[] = [...(existingQuotation?.revisionHistory || [])];
  if (existingQuotation && (revNum > 0 || existingQuotation.status === 'SENT' || existingQuotation.status === 'UNDER_REVISION')) {
    const changes: string[] = [];
    if (existingQuotation.capacityKw !== capacity) {
      changes.push(`Capacity: ${existingQuotation.capacityKw} kW → ${capacity} kW`);
    }
    if (Math.abs(existingQuotation.grandTotal - grandTotal) > 1) {
      changes.push(`Total Amount: ₹${existingQuotation.grandTotal.toLocaleString('en-IN')} → ₹${grandTotal.toLocaleString('en-IN')}`);
    }
    if (existingQuotation.connectionType !== formData.connectionType) {
      changes.push(`System Type: ${existingQuotation.connectionType || 'N/A'} → ${formData.connectionType}`);
    }
    if (existingQuotation.scheme !== formData.scheme) {
      changes.push(`Scheme: ${existingQuotation.scheme || 'N/A'} → ${formData.scheme}`);
    }
    if (formData.solarModule && !existingQuotation.supplyIncludes?.some(s => s.includes(formData.solarModule))) {
      changes.push(`Module: ${formData.solarModule}`);
    }
    if (formData.inverter && !existingQuotation.supplyIncludes?.some(s => s.includes(formData.inverter))) {
      changes.push(`Inverter: ${formData.inverter}`);
    }
    if (formData.battery && !existingQuotation.supplyIncludes?.some(s => s.includes(formData.battery))) {
      changes.push(`Battery: ${formData.battery} (${formData.batteryQty} Nos)`);
    }
    if (formData.structureElevation && !existingQuotation.supplyIncludes?.some(s => s.includes(formData.structureElevation))) {
      changes.push(`Structure: ${formData.structureElevation}`);
    }
    if (changes.length === 0) {
      changes.push(`Commercial terms and pricing refreshed for revision.`);
    }

    const currentRevEntry: QuotationRevision = {
      revisionCode,
      timestamp: new Date().toISOString(),
      author: currentUser?.fullName || currentUser?.username || 'Admin',
      reason: changes.join(' | '),
      basicCost,
      grandTotal,
      changesSummary: changes.join('\n• ')
    };

    const existingIdx = historyList.findIndex(h => h.revisionCode === revisionCode);
    if (existingIdx >= 0) {
      historyList[existingIdx] = currentRevEntry;
    } else {
      historyList.push(currentRevEntry);
    }
  }

  const generatedSubject = interpolateSubject(masterConfig.defaultSubjectTemplate, {
    capacityKw: acCapacityKw,
    capacityKwp: dcCapacityKwp,
    connectionType: formData.connectionType,
    clientName: formData.clientName,
    projectName: formData.clientName,
    location: formData.location,
    scheme: formData.scheme
  });

  return {
    id,
    quotationNo,
    offerNo: formData.offerNo,
    revisionIndex,
    revisionCode,
    revisionHistory: historyList,
    letterhead: existingQuotation?.letterhead || masterConfig.letterhead || DEFAULT_LETTERHEAD_CONFIG,
    title: `Solar Proposal – ${formData.clientName} (${acCapacityKw} kW)`,
    type: 'SOLAR_EPC',
    status,
    
    opportunityId: formData.opportunityId,
    clientName: formData.clientName,
    projectName: formData.clientName,
    location: formData.location,
    state: existingQuotation?.state || 'Tamil Nadu',
    scheme: formData.scheme || existingQuotation?.scheme || 'PM Surya Ghar: Muft Bijli Yojana (Central Subsidy)',
    targetSegment: formData.targetSegment || existingQuotation?.targetSegment,
    connectionType: formData.connectionType || existingQuotation?.connectionType,
    subject: existingQuotation?.subject || generatedSubject,
    salutation: existingQuotation?.salutation || masterConfig.defaultToSalutation || 'Dear Valued Customer,',
    introOpeningText: existingQuotation?.introOpeningText || masterConfig.introOpeningText || 'In support of your Green Energy initiatives, we at Ommax Electric are pleased to submit our offer for the supply, installation, testing, and commissioning of a Solar PV Power Plant.',
    date: dateStr,
    priceValidityDate: existingQuotation?.priceValidityDate || validityStr,
    
    contactPhone: formData.contactPhone || existingQuotation?.contactPhone,
    contactEmail: formData.contactEmail || existingQuotation?.contactEmail,
    
    capacityKw: acCapacityKw,
    capacityKwp: dcCapacityKwp,
    systemType: isBatteryActive ? 'HYBRID' : (formData.connectionType?.toLowerCase().includes('off') ? 'OFF_GRID' : 'ON_GRID'),
    gridEvacuationVoltage: capacity > 5 ? '415V Three Phase' : '230V Single Phase',
    
    // Questionnaire equipment selections and state
    solarModule: formData.solarModule,
    inverter: formData.inverter,
    battery: formData.battery,
    batteryQty: formData.batteryQty,
    structureElevation: formData.structureElevation,
    structureFeet: formData.structureFeet,
    starModule: starModule,
    starInverter: starInverter,
    starBattery: starBattery,
    starStructure: starStructure,
    pricingMode: formData.pricingMode,
    manualTotal: formData.manualTotal,

    supplyIncludes,
    installationIncludes: (existingQuotation?.installationIncludes && existingQuotation.installationIncludes.length > 0)
      ? existingQuotation.installationIncludes
      : ((masterConfig.defaultInstallationIncludes && masterConfig.defaultInstallationIncludes.length > 0)
        ? masterConfig.defaultInstallationIncludes
        : DEFAULT_INSTALLATION_INCLUDES),
    
    boqItems,
    basicCost,
    gstGoodsPercent: existingQuotation?.gstGoodsPercent ?? gstGoodsPercent,
    gstGoodsRate: existingQuotation?.gstGoodsRate ?? gstGoodsRate,
    gstGoodsAmount,
    gstServicesPercent: existingQuotation?.gstServicesPercent ?? gstServicesPercent,
    gstServicesRate: existingQuotation?.gstServicesRate ?? gstServicesRate,
    gstServicesAmount,
    totalGst,
    specialDiscount: discount,
    grandTotal,
    
    subsidyNote: existingQuotation?.subsidyNote || masterConfig.defaultSubsidyNote || 'Direct DBT Subsidy up to ₹78,000 under PM Surya Ghar Muft Bijli Yojana will be credited directly to consumer bank account after DISCOM meter installation.',
    advancePaymentPercent: existingQuotation?.advancePaymentPercent ?? masterConfig.defaultAdvancePercent ?? 50,
    deliveryPaymentPercent: existingQuotation?.deliveryPaymentPercent ?? masterConfig.defaultDeliveryPercent ?? 40,
    installationPaymentPercent: existingQuotation?.installationPaymentPercent ?? masterConfig.defaultInstallationPercent ?? 10,
    
    beneficiaryName: existingQuotation?.beneficiaryName || masterConfig.beneficiaryName || 'OMMAX ELECTRIC PRIVATE LIMITED',
    bankName: existingQuotation?.bankName || masterConfig.bankName || 'HDFC Bank Ltd',
    accountNumber: existingQuotation?.accountNumber || masterConfig.accountNumber || '50200088991122',
    accountType: existingQuotation?.accountType || masterConfig.accountType || 'Current Account',
    ifscCode: existingQuotation?.ifscCode || masterConfig.ifscCode || 'HDFC0001234',
    micrNumber: existingQuotation?.micrNumber || masterConfig.micrNumber || '600240012',
    bankAddress: existingQuotation?.bankAddress || masterConfig.bankAddress || 'T. Nagar Branch, Chennai - 600017',
    
    termsAndConditions: (existingQuotation?.termsAndConditions && existingQuotation.termsAndConditions.length > 0)
      ? existingQuotation.termsAndConditions
      : ((masterConfig.termsAndConditions && masterConfig.termsAndConditions.length > 0)
        ? masterConfig.termsAndConditions
        : []),
    warrantyClauses: (existingQuotation?.warrantyClauses && existingQuotation.warrantyClauses.length > 0)
      ? existingQuotation.warrantyClauses
      : ((masterConfig.warrantyClauses && masterConfig.warrantyClauses.length > 0)
        ? masterConfig.warrantyClauses
        : DEFAULT_WARRANTY_CLAUSES),
    completionMilestones: (existingQuotation?.completionMilestones && existingQuotation.completionMilestones.length > 0)
      ? existingQuotation.completionMilestones
      : ((masterConfig.completionMilestones && masterConfig.completionMilestones.length > 0)
        ? masterConfig.completionMilestones
        : DEFAULT_COMPLETION_MILESTONES),
    moduleWarrantyYears: existingQuotation?.moduleWarrantyYears || masterConfig.moduleWarrantyYears || 25,
    inverterWarrantyYears: existingQuotation?.inverterWarrantyYears || (masterConfig.defaultInverterWarranty ? (parseInt(masterConfig.defaultInverterWarranty) || 5) : 5),
    balanceOfSystemWarrantyYears: existingQuotation?.balanceOfSystemWarrantyYears || (masterConfig.defaultBosWarranty ? (parseInt(masterConfig.defaultBosWarranty) || 1) : 1),
    projectCompletionWeeks: existingQuotation?.projectCompletionWeeks || masterConfig.defaultCompletionWeeks || '2 to 3 weeks',
    
    tariffPerUnit: existingQuotation?.tariffPerUnit ?? masterConfig.defaultTariffPerUnit ?? 8.0,
    benefitsTable,
    tariffAssumptions: (existingQuotation?.tariffAssumptions && existingQuotation.tariffAssumptions.length > 0)
      ? existingQuotation.tariffAssumptions
      : ((masterConfig.tariffAssumptions && masterConfig.tariffAssumptions.length > 0)
        ? masterConfig.tariffAssumptions
        : [
            'Average Solar Generation: 4.0 Units per kWp per day',
            'TANGEDCO Tariff considered at ₹8.00 / kWh unit',
            'Degradation accounted at 0.55% annually after Year 1',
            'Savings calculated based on 100% self-consumption + net-meter export'
          ]),
    brandDeclarations: (existingQuotation?.brandDeclarations && existingQuotation.brandDeclarations.length > 0)
      ? existingQuotation.brandDeclarations
      : masterConfig.brandDeclarations || [],
    brandNotes: (existingQuotation?.brandNotes && existingQuotation.brandNotes.length > 0)
      ? existingQuotation.brandNotes
      : masterConfig.brandNotes || [],
    
    technicalAssumptions: (existingQuotation?.technicalAssumptions && existingQuotation.technicalAssumptions.length > 0)
      ? existingQuotation.technicalAssumptions
      : masterConfig.technicalAssumptions || [],
    exclusions: (existingQuotation?.exclusions && existingQuotation.exclusions.length > 0)
      ? existingQuotation.exclusions
      : masterConfig.exclusions || [],
    warrantyDisclaimer: existingQuotation?.warrantyDisclaimer !== undefined
      ? existingQuotation.warrantyDisclaimer
      : (masterConfig.warrantyDisclaimer || ''),
    authorizedSignatoryName: existingQuotation?.authorizedSignatoryName || masterConfig.authorizedSignatoryName || 'Authorized Signatory',
    signatoryDesignation: existingQuotation?.signatoryDesignation || masterConfig.signatoryDesignation || 'OMMAX ELECTRIC PRIVATE LIMITED',
    companyStampEnabled: existingQuotation?.companyStampEnabled !== undefined
      ? existingQuotation.companyStampEnabled
      : masterConfig.companyStampEnabled ?? true,
    companyStampUrl: existingQuotation?.companyStampUrl !== undefined
      ? existingQuotation.companyStampUrl
      : masterConfig.companyStampUrl,
    companyStampWidth: existingQuotation?.companyStampWidth ?? masterConfig.companyStampWidth ?? 120,
    companyStampRotate: existingQuotation?.companyStampRotate ?? masterConfig.companyStampRotate ?? 0,
    companyStampOpacity: existingQuotation?.companyStampOpacity ?? masterConfig.companyStampOpacity ?? 0.95,
    
    createdBy: currentUser?.fullName || currentUser?.username || 'Admin',
    createdAt: new Date().toISOString()
  };
}

export default function QuotationDashboardView({
  quotations,
  opportunities,
  accounts,
  contacts,
  currentUser,
  masterConfig: propMasterConfig,
  onNavigateToTools,
  onSaveQuotation,
  onUpdateQuotationStatus,
  onDeleteQuotation,
  initialOpportunity,
  onClearInitialOpportunity
}: QuotationDashboardViewProps) {
  const isAdmin = currentUser?.role === 'ADMIN';

  // Filter States
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedStatuses, setSelectedStatuses] = useState<QuotationStatus[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchOwnerFilter, setSearchOwnerFilter] = useState<string>('');
  const [searchAccountFilter, setSearchAccountFilter] = useState<string>('');
  const [searchContactFilter, setSearchContactFilter] = useState<string>('');

  // Dropdown open state: 'date' | 'status' | 'owner' | 'account' | 'contact' | null
  const [openFilter, setOpenFilter] = useState<'date' | 'status' | 'owner' | 'account' | 'contact' | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Quotation for 5-Page Live Preview Modal
  const [previewQuotation, setPreviewQuotation] = useState<SolarQuotation | null>(null);

  // =========================================================================
  // NEW SIMPLIFIED QUESTIONNAIRE FORM MODAL STATE
  // =========================================================================
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  // 8 Specific Form Fields:
  // a. Choose CRM Opportunity
  const [formOpportunityId, setFormOpportunityId] = useState<string>('');
  const [formClientName, setFormClientName] = useState<string>('');
  const [formContactPhone, setFormContactPhone] = useState<string>('');
  const [formContactEmail, setFormContactEmail] = useState<string>('');
  const [formFullAddress, setFormFullAddress] = useState<string>('');
  
  // b. Offer No. (auto-generated, editable)
  const [formOfferNo, setFormOfferNo] = useState<string>('');

  // Project Capacity
  const [formCapacityKw, setFormCapacityKw] = useState<number>(0);

  // Connection Type, Target Segment, Schemes
  const [formSystemType, setFormSystemType] = useState<string>('');
  const [formSegment, setFormSegment] = useState<string>('');
  const [formScheme, setFormScheme] = useState<string>('');

  // d. Solar PV Modules
  const [formSolarModule, setFormSolarModule] = useState<string>('');
  const [formStarModule, setFormStarModule] = useState<boolean>(true);

  // e. Inverter
  const [formInverter, setFormInverter] = useState<string>('');
  const [formStarInverter, setFormStarInverter] = useState<boolean>(true);

  // f. Battery with qty
  const [formBattery, setFormBattery] = useState<string>('');
  const [formBatteryQty, setFormBatteryQty] = useState<number>(0);
  const [formStarBattery, setFormStarBattery] = useState<boolean>(true);

  // g. Structure Elevation & Height in Feet
  const [formStructure, setFormStructure] = useState<string>('');
  const [formStructureFeet, setFormStructureFeet] = useState<number>(0);
  const [formStarStructure, setFormStarStructure] = useState<boolean>(true);

  // Pricing (Manual default or Automatic)
  const [formPricingMode, setFormPricingMode] = useState<'MANUAL' | 'AUTOMATIC'>('MANUAL');
  const [formManualPrice, setFormManualPrice] = useState<number>(0);
  const [formDiscountAmount, setFormDiscountAmount] = useState<number>(0);

  // Status Update Dialog (Won/Lost)
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean;
    quotation: SolarQuotation | null;
    targetStatus: 'WON' | 'LOST' | null;
    lostReason: string;
  }>({
    isOpen: false,
    quotation: null,
    targetStatus: null,
    lostReason: ''
  });

  // Admin Delete Proposal Dialog
  const [deleteProposalDialog, setDeleteProposalDialog] = useState<{
    isOpen: boolean;
    quotation: SolarQuotation | null;
  }>({
    isOpen: false,
    quotation: null
  });

  // Revision Warning Dialog for Submitted Quotations
  const [revisionWarningDialog, setRevisionWarningDialog] = useState<{
    isOpen: boolean;
    quotation: SolarQuotation | null;
    revisedOfferNo: string;
    revisionCode: string;
    revisionIndex: number;
  }>({
    isOpen: false,
    quotation: null,
    revisedOfferNo: '',
    revisionCode: '',
    revisionIndex: 1
  });

  // Selective Master Sync Dialog for Revisions & Drafts (Only shown if changes are detected in Tools Master Config)
  const [revisionSyncDialog, setRevisionSyncDialog] = useState<{
    isOpen: boolean;
    quotation: SolarQuotation | null;
    isDraft?: boolean;
    revisedOfferNo: string;
    revisionCode: string;
    revisionIndex: number;
    detectedDiffs: MasterDiffSection[];
    syncSelections: Record<string, boolean>;
  }>({
    isOpen: false,
    quotation: null,
    isDraft: false,
    revisedOfferNo: '',
    revisionCode: '',
    revisionIndex: 1,
    detectedDiffs: [],
    syncSelections: {}
  });

  // Staged quotation snapshot in memory when syncing Master Config into a Draft
  const [pendingDraftSyncQuotation, setPendingDraftSyncQuotation] = useState<SolarQuotation | null>(null);

  // Revision Details Dialog (shows only changes made for revision when clicking revised Offer No)
  const [revisionDetailsDialog, setRevisionDetailsDialog] = useState<{
    isOpen: boolean;
    quotation: SolarQuotation | null;
  }>({
    isOpen: false,
    quotation: null
  });

  // Staged revision quotation (in-memory only, not saved until Draft or Submit)
  const [pendingRevisionQuotation, setPendingRevisionQuotation] = useState<SolarQuotation | null>(null);
  // Track if active preview quotation has unsaved changes / hasn't been committed as draft or submitted
  const [isPreviewUnsaved, setIsPreviewUnsaved] = useState<boolean>(false);
  // Soft warning pop-up for discarding unsaved questionnaire or preview
  const [showDiscardModal, setShowDiscardModal] = useState<{
    isOpen: boolean;
    type: 'QUESTIONNAIRE' | 'PREVIEW';
  }>({
    isOpen: false,
    type: 'QUESTIONNAIRE'
  });

  const isRevisedQuotation = (quo: SolarQuotation) => {
    return Boolean(
      (quo.revisionIndex && quo.revisionIndex > 0) ||
      (quo.revisionCode && quo.revisionCode !== 'R-0' && quo.revisionCode !== 'R0' && quo.revisionCode !== 'R00') ||
      (quo.revisionHistory && quo.revisionHistory.length > 0)
    );
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, selectedStatuses, selectedOwners, selectedAccounts, selectedContacts]);

  // Account Owners list dynamically derived ONLY from existing quotations
  const availableOwners = useMemo(() => {
    const ownerSet = new Set<string>();
    quotations.forEach(q => {
      if (q.createdBy && q.createdBy.trim()) {
        ownerSet.add(q.createdBy.trim());
      }
    });
    return Array.from(ownerSet).sort();
  }, [quotations]);

  // Accounts list dynamically derived ONLY from existing quotations
  const availableAccounts = useMemo(() => {
    const accSet = new Set<string>();
    quotations.forEach(q => {
      if (q.accountName && q.accountName.trim()) {
        accSet.add(q.accountName.trim());
      }
    });
    return Array.from(accSet).sort();
  }, [quotations]);

  // Contacts / Client names dynamically derived ONLY from existing quotations
  const availableContacts = useMemo(() => {
    const contactSet = new Set<string>();
    quotations.forEach(q => {
      if (q.contactName && q.contactName.trim()) {
        contactSet.add(q.contactName.trim());
      } else if (q.clientName && q.clientName.trim()) {
        contactSet.add(q.clientName.trim());
      }
    });
    return Array.from(contactSet).sort();
  }, [quotations]);

  // Quick Preset Helper for Date Filter
  const setDatePreset = (preset: 'today' | 'this_month' | 'last_30_days' | 'this_year') => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'this_month') {
      setFromDate(`${yyyy}-${mm}-01`);
      const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
      setToDate(`${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_30_days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      const pY = past.getFullYear();
      const pM = String(past.getMonth() + 1).padStart(2, '0');
      const pD = String(past.getDate()).padStart(2, '0');
      setFromDate(`${pY}-${pM}-${pD}`);
      setToDate(todayStr);
    } else if (preset === 'this_year') {
      setFromDate(`${yyyy}-01-01`);
      setToDate(`${yyyy}-12-31`);
    }
  };

  const dateLabel = useMemo(() => {
    if (fromDate && toDate) {
      return `${formatDateToDMY(fromDate)} - ${formatDateToDMY(toDate)}`;
    }
    if (fromDate) {
      return `From ${formatDateToDMY(fromDate)}`;
    }
    if (toDate) {
      return `Up to ${formatDateToDMY(toDate)}`;
    }
    return 'All Dates';
  }, [fromDate, toDate]);

  // Calculate High-Level Metrics
  const metrics = useMemo(() => {
    const totalRaised = quotations.length;
    const totalValue = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    
    const wonList = quotations.filter(q => q.status === 'WON');
    const wonCount = wonList.length;
    const wonValue = wonList.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    const lostList = quotations.filter(q => q.status === 'LOST');
    const lostCount = lostList.length;
    const lostValue = lostList.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    const activeList = quotations.filter(q => q.status === 'SENT' || q.status === 'UNDER_REVISION' || q.status === 'DRAFT');
    const activeCount = activeList.length;
    const activeValue = activeList.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    return {
      totalRaised,
      totalValue,
      wonCount,
      wonValue,
      lostCount,
      lostValue,
      activeCount,
      activeValue
    };
  }, [quotations]);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      // 1. Date Range Filter (From Date)
      if (fromDate) {
        const qDateStr = q.date || q.createdAt?.substring(0, 10);
        if (qDateStr && qDateStr < fromDate) return false;
      }

      // 2. Date Range Filter (To Date)
      if (toDate) {
        const qDateStr = q.date || q.createdAt?.substring(0, 10);
        if (qDateStr && qDateStr > toDate) return false;
      }

      // 3. Multi-select Status filter
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(q.status)) return false;
      }

      // 4. Multi-select Account Owner / Creator filter
      if (selectedOwners.length > 0) {
        const creator = (q.createdBy || '').trim().toLowerCase();
        const matchesOwner = selectedOwners.some(o => o.trim().toLowerCase() === creator);
        if (!matchesOwner) return false;
      }

      // 5. Multi-select Account filter
      if (selectedAccounts.length > 0) {
        const accName = (q.accountName || '').trim().toLowerCase();
        const matchesAccount = selectedAccounts.some(a => a.trim().toLowerCase() === accName);
        if (!matchesAccount) return false;
      }

      // 6. Multi-select Contact / Client filter
      if (selectedContacts.length > 0) {
        const conName = (q.contactName || '').trim().toLowerCase();
        const clientName = (q.clientName || '').trim().toLowerCase();
        const matchesContact = selectedContacts.some(c => {
          const target = c.trim().toLowerCase();
          return target === conName || target === clientName;
        });
        if (!matchesContact) return false;
      }

      return true;
    });
  }, [quotations, fromDate, toDate, selectedStatuses, selectedOwners, selectedAccounts, selectedContacts]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / PAGE_SIZE));
  const paginatedQuotations = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredQuotations.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredQuotations, currentPage]);

  const hasActiveFilters = 
    !!fromDate ||
    !!toDate ||
    selectedStatuses.length > 0 || 
    selectedOwners.length > 0 || 
    selectedAccounts.length > 0 || 
    selectedContacts.length > 0;

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedStatuses([]);
    setSelectedOwners([]);
    setSelectedAccounts([]);
    setSelectedContacts([]);
    setSearchOwnerFilter('');
    setSearchAccountFilter('');
    setSearchContactFilter('');
    setCurrentPage(1);
  };

  // =========================================================================
  // HANDLERS FOR NEW QUESTIONNAIRE WIZARD
  // =========================================================================

  // Helper to resolve full contact address from CRM module
  const handleSelectOpportunity = (oppId: string, directOpp?: CRMOpportunity) => {
    setFormOpportunityId(oppId);
    if (!oppId) {
      return;
    }
    const opp = directOpp || opportunities.find(o => o.id === oppId);
    if (!opp) return;

    const contact = contacts.find(c => 
      (opp.contactId && c.id === opp.contactId) || 
      (opp.contactName && (c.name?.trim().toLowerCase() === opp.contactName.trim().toLowerCase() || 
        [c.firstName, c.lastName].filter(Boolean).join(' ').trim().toLowerCase() === opp.contactName.trim().toLowerCase()))
    );
    const account = accounts.find(a => 
      (opp.accountId && a.id === opp.accountId) || 
      (opp.accountName && a.name?.trim().toLowerCase() === opp.accountName.trim().toLowerCase())
    );

    let clientName = 'Valued Customer';
    if (contact) {
      const rawName = (contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '').trim();
      const sal = (contact.salutation || '').trim();
      if (sal && rawName && !rawName.toLowerCase().startsWith(sal.toLowerCase())) {
        clientName = `${sal} ${rawName}`;
      } else {
        clientName = rawName || account?.name || opp.title || 'Valued Customer';
      }
    } else {
      clientName = account?.name || opp.contactName || opp.title || 'Valued Customer';
    }
    const phone = contact?.phone || contact?.mobile || contact?.altMobile || account?.phone || '';
    const email = contact?.email || account?.email || '';

    // Fetch complete full postal address from CRM Contact module first, then CRM Account
    const street = (contact?.address || account?.address || '').trim();
    const city = (contact?.city || account?.billingCity || 'Chennai').trim();
    const state = (contact?.state || account?.billingState || 'Tamil Nadu').trim();
    const pincode = (contact?.pincode || account?.pincode || '').trim();

    const addressLines: string[] = [];
    if (street) {
      addressLines.push(street);
    }
    
    let localityLine = '';
    if (city && state) {
      localityLine = `${city}, ${state}`;
    } else if (city) {
      localityLine = city;
    } else if (state) {
      localityLine = state;
    }

    if (pincode) {
      localityLine = localityLine ? `${localityLine} - ${pincode}` : pincode;
    }

    if (localityLine) {
      addressLines.push(localityLine);
    }

    const fullAddress = addressLines.length > 0 ? addressLines.join('\n') : `${city}, ${state}`;

    setFormClientName(clientName);
    setFormContactPhone(phone);
    setFormContactEmail(email);
    setFormFullAddress(fullAddress);

    // If opportunity has an amount, pre-set the manual price
    if (opp.amount && opp.amount > 0) {
      setFormManualPrice(opp.amount);
    }
  };

  const handleOpenNewQuestionnaire = () => {
    setEditingQuotationId(null);
    setPendingRevisionQuotation(null);
    setIsPreviewUnsaved(false);
    setFormOpportunityId('');
    setFormClientName('');
    setFormContactPhone('');
    setFormContactEmail('');
    setFormFullAddress('');
    
    // Load master config from tools
    const config = getMasterConfig(propMasterConfig);
    
    // Auto-generate offer number synced with master config
    const generatedOffer = generateOfferNo(quotations, config);
    setFormOfferNo(generatedOffer);
    
    // Default capacity
    setFormCapacityKw(0);

    // Dropdown fields
    setFormSystemType('');
    setFormSegment('');
    setFormScheme('');

    // Initial empty selections for user to choose
    setFormSolarModule('');
    setFormStarModule(true);
    setFormInverter('');
    setFormStarInverter(true);
    setFormBattery('');
    setFormBatteryQty(0);
    setFormStarBattery(true);
    setFormStructure('');
    setFormStructureFeet(0);
    setFormStarStructure(true);

    // Pricing defaults
    setFormPricingMode('MANUAL');
    setFormManualPrice(0);
    setFormDiscountAmount(0);

    setIsQuestionnaireOpen(true);
  };

  const handledOppRef = useRef<string | null>(null);

  // Auto-open new quotation wizard and bind client when navigated from CRM Opportunity module
  useEffect(() => {
    if (initialOpportunity && handledOppRef.current !== initialOpportunity.id) {
      handledOppRef.current = initialOpportunity.id;
      handleOpenNewQuestionnaire();
      handleSelectOpportunity(initialOpportunity.id, initialOpportunity);
    }
    if (!initialOpportunity) {
      handledOppRef.current = null;
    }
  }, [initialOpportunity]);

  const handleOpenEditQuestionnaire = (quo: SolarQuotation) => {
    setEditingQuotationId(quo.id);
    setIsPreviewUnsaved(false);
    setFormOpportunityId(quo.opportunityId || '');
    setFormClientName(quo.clientName || '');
    setFormContactPhone(quo.contactPhone || '');
    setFormContactEmail(quo.contactEmail || '');
    setFormFullAddress(quo.location || '');
    setFormOfferNo(quo.offerNo || '');
    setFormCapacityKw(quo.capacityKw || 0);

    const config = getMasterConfig(propMasterConfig);
    setFormSystemType(quo.connectionType || (quo.systemType === 'HYBRID' ? 'Hybrid Solar System (BESS)' : quo.systemType === 'OFF_GRID' ? 'Off-Grid Standalone System' : 'On-Grid Net-Metering System'));
    setFormSegment(quo.targetSegment || 'Residential Rooftop');
    setFormScheme(quo.scheme || 'PM Surya Ghar: Muft Bijli Yojana (Central Subsidy)');

    const hasSupply = Array.isArray(quo.supplyIncludes) && quo.supplyIncludes.length > 0;
    
    // 1. Solar PV Module
    const moduleLine = quo.supplyIncludes?.find(s => s.toLowerCase().includes('solar pv module') || s.toLowerCase().includes('panel'));
    const moduleBOQ = quo.boqItems?.find(b => b.slNo === 1 || b.id === 'boq-1' || b.itemDescription.toLowerCase().includes('solar pv module') || b.itemDescription.toLowerCase().includes('panel'));
    const moduleText = quo.solarModule || (moduleLine ? moduleLine.replace(/Solar PV Modules:\s*/i, '').trim() : (moduleBOQ?.itemDescription || config.supplyDropdownOptions.moduleOptions[0] || ''));
    setFormSolarModule(moduleText || '');
    setFormStarModule(quo.starModule !== undefined ? quo.starModule : (hasSupply ? Boolean(moduleLine) : true));

    // 2. Inverter
    const inverterLine = quo.supplyIncludes?.find(s => s.toLowerCase().includes('inverter'));
    const inverterBOQ = quo.boqItems?.find(b => b.slNo === 2 || b.id === 'boq-2' || b.itemDescription.toLowerCase().includes('inverter'));
    let inverterText = quo.inverter || '';
    if (!inverterText && inverterLine) {
      inverterText = inverterLine
        .replace(/^(?:grid-tied\s*\/\s*hybrid\s*)?solar\s*inverter\s*[-–:]\s*/i, '')
        .replace(/^solar\s*inverter\s*[-–:]\s*/i, '')
        .replace(/^inverter\s*[-–:]\s*/i, '')
        .trim();
    }
    if (!inverterText && inverterBOQ?.itemDescription) {
      inverterText = inverterBOQ.itemDescription.trim();
    }
    if (!inverterText) {
      inverterText = config.supplyDropdownOptions.inverterOptions[0] || '';
    }
    setFormInverter(inverterText || '');
    setFormStarInverter(quo.starInverter !== undefined ? quo.starInverter : (hasSupply ? Boolean(inverterLine) : true));

    // 3. Battery & Storage
    const batteryLine = quo.supplyIncludes?.find(s => s.toLowerCase().includes('battery'));
    if (quo.battery) {
      setFormBattery(quo.battery);
      setFormBatteryQty(quo.batteryQty !== undefined ? quo.batteryQty : (quo.battery.toLowerCase().includes('nil') ? 0 : 1));
      setFormStarBattery(quo.starBattery !== undefined ? quo.starBattery : !quo.battery.toLowerCase().includes('nil'));
    } else if (batteryLine && !batteryLine.toLowerCase().includes('nil')) {
      const match = batteryLine.match(/Qty:\s*(\d+)/i);
      const qty = match ? parseInt(match[1], 10) : 1;
      setFormBatteryQty(qty);
      const batteryClean = batteryLine.replace(/Battery Energy Storage:\s*/i, '').replace(/\(Qty.*?\)/i, '').trim();
      setFormBattery(batteryClean || config.supplyDropdownOptions.batteryOptions[1] || 'Battery Storage');
      setFormStarBattery(true);
    } else if (batteryLine && batteryLine.toLowerCase().includes('nil')) {
      setFormBattery(config.supplyDropdownOptions.batteryOptions.find(b => b.toLowerCase().includes('nil')) || 'Nil (On-Grid Direct Net-Metering)');
      setFormBatteryQty(0);
      setFormStarBattery(true);
    } else {
      setFormBattery('');
      setFormBatteryQty(0);
      setFormStarBattery(hasSupply ? Boolean(batteryLine) : true);
    }

    // 4. Structure Elevation
    const structureLine = quo.supplyIncludes?.find(s => s.toLowerCase().includes('structure') || s.toLowerCase().includes('mounting'));
    const structureBOQ = quo.boqItems?.find(b => b.slNo === 4 || b.id === 'boq-4' || b.itemDescription.toLowerCase().includes('mounting structure') || b.itemDescription.toLowerCase().includes('structure'));
    const isStructureNil = (quo.structureElevation && quo.structureElevation.toLowerCase().includes('nil')) ||
      structureBOQ?.quantity?.toLowerCase().includes('nil') || structureBOQ?.quantity === '0' || structureBOQ?.quantity === '0 Feet' || (structureLine && structureLine.toLowerCase().includes('nil'));
    
    if (isStructureNil) {
      setFormStructure(config.supplyDropdownOptions.structureOptions.find(s => s.toLowerCase().includes('nil')) || 'Nil (No Mounting Structure / Customer Scope)');
      setFormStructureFeet(0);
      setFormStarStructure(quo.starStructure !== undefined ? quo.starStructure : true);
    } else {
      const structureText = quo.structureElevation || (structureLine ? structureLine.replace(/Module Mounting Structure:\s*/i, '').replace(/\(.*?\)/i, '').trim() : (structureBOQ?.itemDescription || config.supplyDropdownOptions.structureOptions[1] || config.supplyDropdownOptions.structureOptions[0] || ''));
      setFormStructure(structureText || '');
      setFormStarStructure(quo.starStructure !== undefined ? quo.starStructure : (hasSupply ? Boolean(structureLine) : true));

      let extractedFeet = quo.structureFeet !== undefined ? quo.structureFeet : 7;
      if (quo.structureFeet === undefined) {
        const structureSearchStr = `${structureBOQ?.quantity || ''} ${structureLine || ''} ${structureBOQ?.itemDescription || ''}`;
        const feetMatch = structureSearchStr.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|Height)/i);
        if (feetMatch) {
          extractedFeet = parseFloat(feetMatch[1]) || 0;
        }
      }
      setFormStructureFeet(extractedFeet);
    }

    setFormPricingMode(quo.pricingMode || 'MANUAL');
    setFormManualPrice(quo.manualTotal || (quo.grandTotal ? (quo.grandTotal + (quo.specialDiscount || 0)) : (quo.basicCost + quo.totalGst)));
    setFormDiscountAmount(quo.specialDiscount || 0);

    // If preview modal is open, close it so we return seamlessly to editing
    setPreviewQuotation(null);
    setIsQuestionnaireOpen(true);
  };

  // Intercept Edit action to show revision warning for submitted quotations, or selective sync for drafts with master changes
  const handleEditClick = (quo: SolarQuotation) => {
    setPreviewQuotation(null);
    if (quo.status === 'SENT') {
      const { newOfferNo, revisionCode, nextRevNum } = getRevisedOfferDetails(quo.offerNo || '', quo.revisionIndex || 0);
      setRevisionWarningDialog({
        isOpen: true,
        quotation: quo,
        revisedOfferNo: newOfferNo,
        revisionCode,
        revisionIndex: nextRevNum
      });
    } else {
      // For Drafts: Detect if Master Config in Tools was updated since this draft was saved
      const latestCfg = getMasterConfig(propMasterConfig);
      const allSections = detectMasterConfigDiffs(quo, latestCfg);
      const detectedDiffs = allSections.filter(s => s.isModified);

      if (detectedDiffs.length > 0) {
        // Initialize all detected diffs as unchecked (false) by default so original draft snapshot is preserved unless user checks them
        const initialSyncSelections: Record<string, boolean> = {};
        detectedDiffs.forEach(diff => {
          initialSyncSelections[diff.key] = false;
        });

        setPendingRevisionQuotation(null);
        setPendingDraftSyncQuotation(null);
        setRevisionSyncDialog({
          isOpen: true,
          quotation: quo,
          isDraft: true,
          revisedOfferNo: quo.offerNo || '',
          revisionCode: '',
          revisionIndex: quo.revisionIndex || 0,
          detectedDiffs,
          syncSelections: initialSyncSelections
        });
      } else {
        setPendingRevisionQuotation(null);
        setPendingDraftSyncQuotation(null);
        handleOpenEditQuestionnaire(quo);
      }
    }
  };

  // Step 1: When user clicks "Proceed to Edit" from Revision Warning, check for Master Config differences across all tabs
  const handleConfirmRevision = () => {
    if (!revisionWarningDialog.quotation) return;
    const quo = revisionWarningDialog.quotation;
    const { revisedOfferNo, revisionCode, revisionIndex } = revisionWarningDialog;
    const latestCfg = getMasterConfig(propMasterConfig);

    // Close step 1 revision warning dialog
    setRevisionWarningDialog({
      isOpen: false,
      quotation: null,
      revisedOfferNo: '',
      revisionCode: '',
      revisionIndex: 1
    });

    // Detect if any Master Config sections differ from this quotation's snapshot
    const allSections = detectMasterConfigDiffs(quo, latestCfg);
    const detectedDiffs = allSections.filter(s => s.isModified);

    // If NO modifications/differences happened in Master Config, bypass the modal entirely!
    if (detectedDiffs.length === 0) {
      const stagedQuo: SolarQuotation = {
        ...quo,
        offerNo: revisedOfferNo,
        revisionCode,
        revisionIndex,
        status: 'UNDER_REVISION',
        updatedAt: new Date().toISOString()
      };

      // Staged in memory only - do NOT write to database until user saves draft or submits
      setPendingRevisionQuotation(stagedQuo);
      setPendingDraftSyncQuotation(null);
      handleOpenEditQuestionnaire(stagedQuo);
      return;
    }

    // Initialize all detected diffs as unchecked (false) by default so original snapshot is preserved unless user checks them
    const initialSyncSelections: Record<string, boolean> = {};
    detectedDiffs.forEach(diff => {
      initialSyncSelections[diff.key] = false;
    });

    // Open Step 2 Selective Sync Dialog showing ONLY the detected changed sections
    setRevisionSyncDialog({
      isOpen: true,
      quotation: quo,
      isDraft: false,
      revisedOfferNo,
      revisionCode,
      revisionIndex,
      detectedDiffs,
      syncSelections: initialSyncSelections
    });
  };

  // Step 2: Apply selected Master Config fields (or keep old snapshot)
  const handleApplySyncAndEdit = () => {
    if (!revisionSyncDialog.quotation) return;
    const { isDraft, revisedOfferNo, revisionCode, revisionIndex, detectedDiffs, syncSelections } = revisionSyncDialog;
    const hasSelected = Object.values(syncSelections).some(Boolean);
    if (!hasSelected) return;

    const quo = revisionSyncDialog.quotation;
    const latestCfg = getMasterConfig(propMasterConfig);

    if (isDraft) {
      // For Drafts: Retain draft status and offerNo without creating a revision
      let stagedQuo: SolarQuotation = {
        ...quo,
        updatedAt: new Date().toISOString()
      };

      // Apply only selectively checked Master Config fields
      detectedDiffs.forEach(diff => {
        if (syncSelections[diff.key]) {
          const patch = diff.applySync(stagedQuo, latestCfg);
          stagedQuo = {
            ...stagedQuo,
            ...patch
          };
        }
      });

      // Staged in memory only - do NOT write to database until user saves draft or submits
      setPendingDraftSyncQuotation(stagedQuo);
      setPendingRevisionQuotation(null);

      setRevisionSyncDialog({
        isOpen: false,
        quotation: null,
        isDraft: false,
        revisedOfferNo: '',
        revisionCode: '',
        revisionIndex: 1,
        detectedDiffs: [],
        syncSelections: {}
      });

      handleOpenEditQuestionnaire(stagedQuo);
      return;
    }

    // Start with exact previous snapshot for Revisions
    let stagedQuo: SolarQuotation = {
      ...quo,
      offerNo: revisedOfferNo,
      revisionCode,
      revisionIndex,
      status: 'UNDER_REVISION',
      updatedAt: new Date().toISOString()
    };

    // Apply only selectively checked Master Config fields
    detectedDiffs.forEach(diff => {
      if (syncSelections[diff.key]) {
        const patch = diff.applySync(stagedQuo, latestCfg);
        stagedQuo = {
          ...stagedQuo,
          ...patch
        };
      }
    });

    // Staged in memory only - do NOT write to database until user saves draft or submits
    setPendingRevisionQuotation(stagedQuo);
    setPendingDraftSyncQuotation(null);

    setRevisionSyncDialog({
      isOpen: false,
      quotation: null,
      isDraft: false,
      revisedOfferNo: '',
      revisionCode: '',
      revisionIndex: 1,
      detectedDiffs: [],
      syncSelections: {}
    });

    handleOpenEditQuestionnaire(stagedQuo);
  };

  // Step 2b: Keep all original proposal settings untouched and proceed directly to questionnaire
  const handleKeepAllOriginalAndEdit = () => {
    if (!revisionSyncDialog.quotation) return;
    const quo = revisionSyncDialog.quotation;
    const { isDraft, revisedOfferNo, revisionCode, revisionIndex } = revisionSyncDialog;

    setRevisionSyncDialog({
      isOpen: false,
      quotation: null,
      isDraft: false,
      revisedOfferNo: '',
      revisionCode: '',
      revisionIndex: 1,
      detectedDiffs: [],
      syncSelections: {}
    });

    if (isDraft) {
      // Retain draft in memory without modifying any master config fields
      setPendingDraftSyncQuotation(quo);
      setPendingRevisionQuotation(null);
      handleOpenEditQuestionnaire(quo);
      return;
    }

    // Start with exact previous snapshot for Revisions
    const stagedQuo: SolarQuotation = {
      ...quo,
      offerNo: revisedOfferNo,
      revisionCode,
      revisionIndex,
      status: 'UNDER_REVISION',
      updatedAt: new Date().toISOString()
    };

    setPendingRevisionQuotation(stagedQuo);
    setPendingDraftSyncQuotation(null);
    handleOpenEditQuestionnaire(stagedQuo);
  };

  const handleGenerateQuotation = () => {
    // Check required fields with clear alerts
    if (!formOpportunityId) {
      alert('Please select a Client from the "Choose Client" drop-down.');
      return;
    }

    if (!formClientName.trim()) {
      alert('Client / Contact Name is required.');
      return;
    }

    if (!formOfferNo.trim()) {
      alert('Offer No. is required.');
      return;
    }

    if (!formSystemType.trim()) {
      alert('Please choose Connection Type.');
      return;
    }

    if (!formSegment.trim()) {
      alert('Please choose Target Segment.');
      return;
    }

    if (!formScheme.trim()) {
      alert('Please choose Scheme.');
      return;
    }

    if (!formCapacityKw || formCapacityKw <= 0) {
      alert('Please choose Project Capacity.');
      return;
    }

    if (!formSolarModule.trim()) {
      alert('Please choose Solar PV Modules.');
      return;
    }

    if (!formInverter.trim()) {
      alert('Please choose Inverter.');
      return;
    }

    if (!formBattery.trim()) {
      alert('Please choose Battery & Storage.');
      return;
    }

    if (!formStructure.trim()) {
      alert('Please choose Structure Elevation.');
      return;
    }

    if (formPricingMode === 'MANUAL' && (!formManualPrice || formManualPrice <= 0)) {
      alert('Please enter a valid Total Price.');
      return;
    }

    const config = getMasterConfig(propMasterConfig);
    const capacity = formCapacityKw;
    const existingQuotation = pendingRevisionQuotation 
      || pendingDraftSyncQuotation
      || (editingQuotationId ? quotations.find(q => q.id === editingQuotationId) : undefined);

    const completeQuotation = createCompleteQuotation(
      {
        opportunityId: formOpportunityId || undefined,
        clientName: formClientName.trim(),
        contactPhone: formContactPhone.trim(),
        contactEmail: formContactEmail.trim(),
        location: formFullAddress.trim() || 'Ariyalur - 621704',
        offerNo: formOfferNo.trim() || generateOfferNo(quotations, config),
        capacityKw: capacity,
        connectionType: formSystemType,
        targetSegment: formSegment,
        scheme: formScheme,
        solarModule: formSolarModule || config.supplyDropdownOptions.moduleOptions[0],
        inverter: formInverter || config.supplyDropdownOptions.inverterOptions[0],
        battery: formBattery,
        batteryQty: formBattery.toLowerCase().includes('nil') || !formBattery ? 0 : formBatteryQty,
        structureElevation: formStructure || config.supplyDropdownOptions.structureOptions[0],
        structureFeet: formStructureFeet,
        starModule: formStarModule,
        starInverter: formStarInverter,
        starBattery: formStarBattery,
        starStructure: formStarStructure,
        pricingMode: formPricingMode,
        manualTotal: formManualPrice,
        discountAmount: formDiscountAmount
      },
      config,
      currentUser,
      existingQuotation
    );

    // Close questionnaire modal and open live preview marked as unsaved
    setIsQuestionnaireOpen(false);
    onClearInitialOpportunity?.();

    // Immediately open 5-page live preview
    setPreviewQuotation(completeQuotation);
    setIsPreviewUnsaved(true);
  };

  const handleSaveDraftFromQuestionnaire = () => {
    if (!formOpportunityId) {
      alert('Please select a Client from the "Choose Client" drop-down before saving draft.');
      return;
    }
    if (!formClientName.trim()) {
      alert('Client / Contact Name is required before saving draft.');
      return;
    }
    if (!formCapacityKw || formCapacityKw <= 0) {
      alert('Please choose Project Capacity before saving draft.');
      return;
    }

    const config = getMasterConfig(propMasterConfig);
    const capacity = formCapacityKw;
    const existingQuotation = pendingRevisionQuotation 
      || pendingDraftSyncQuotation
      || (editingQuotationId ? quotations.find(q => q.id === editingQuotationId) : undefined);

    const completeQuotation = createCompleteQuotation(
      {
        opportunityId: formOpportunityId || undefined,
        clientName: formClientName.trim(),
        contactPhone: formContactPhone.trim(),
        contactEmail: formContactEmail.trim(),
        location: formFullAddress.trim() || 'Ariyalur - 621704',
        offerNo: formOfferNo.trim() || generateOfferNo(quotations, config),
        capacityKw: capacity,
        connectionType: formSystemType,
        targetSegment: formSegment,
        scheme: formScheme,
        solarModule: formSolarModule || config.supplyDropdownOptions.moduleOptions[0],
        inverter: formInverter || config.supplyDropdownOptions.inverterOptions[0],
        battery: formBattery,
        batteryQty: formBattery.toLowerCase().includes('nil') || !formBattery ? 0 : formBatteryQty,
        structureElevation: formStructure || config.supplyDropdownOptions.structureOptions[0],
        structureFeet: formStructureFeet,
        starModule: formStarModule,
        starInverter: formStarInverter,
        starBattery: formStarBattery,
        starStructure: formStarStructure,
        pricingMode: formPricingMode,
        manualTotal: formManualPrice,
        discountAmount: formDiscountAmount
      },
      config,
      currentUser,
      existingQuotation
    );

    const isRevision = Boolean(pendingRevisionQuotation) 
      || (existingQuotation?.status === 'SENT') 
      || (existingQuotation?.status === 'UNDER_REVISION');

    const draftQuo: SolarQuotation = {
      ...completeQuotation,
      status: isRevision ? 'UNDER_REVISION' : 'DRAFT',
      updatedAt: new Date().toISOString()
    };

    if (onSaveQuotation) {
      onSaveQuotation(draftQuo);
    }

    onClearInitialOpportunity?.();
    setIsQuestionnaireOpen(false);
    setEditingQuotationId(null);
    setPendingRevisionQuotation(null);
    setPendingDraftSyncQuotation(null);
    setIsPreviewUnsaved(false);
  };

  const handleSaveDraftFromPreview = (quo: SolarQuotation) => {
    const isRevision = quo.status === 'UNDER_REVISION' 
      || Boolean(pendingRevisionQuotation) 
      || (editingQuotationId && quotations.find(q => q.id === editingQuotationId)?.status === 'SENT');

    const nextStatus: QuotationStatus = isRevision ? 'UNDER_REVISION' : 'DRAFT';
    const draftQuo: SolarQuotation = {
      ...quo,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    if (onSaveQuotation) {
      onSaveQuotation(draftQuo);
    }
    setPreviewQuotation(null);
    setEditingQuotationId(null);
    setPendingRevisionQuotation(null);
    setPendingDraftSyncQuotation(null);
    setIsPreviewUnsaved(false);
  };

  const handleSubmitFromPreview = (quo: SolarQuotation) => {
    const sentQuo: SolarQuotation = {
      ...quo,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (onSaveQuotation) {
      onSaveQuotation(sentQuo, true);
    }
    setPreviewQuotation(null);
    setEditingQuotationId(null);
    setPendingRevisionQuotation(null);
    setPendingDraftSyncQuotation(null);
    setIsPreviewUnsaved(false);
  };

  const handleRequestCloseQuestionnaire = () => {
    const isDirty = Boolean(
      formOpportunityId ||
      formClientName.trim() ||
      formCapacityKw > 0 ||
      editingQuotationId ||
      pendingRevisionQuotation ||
      pendingDraftSyncQuotation
    );

    if (isDirty) {
      setShowDiscardModal({ isOpen: true, type: 'QUESTIONNAIRE' });
    } else {
      onClearInitialOpportunity?.();
      setIsQuestionnaireOpen(false);
      setEditingQuotationId(null);
      setPendingRevisionQuotation(null);
      setPendingDraftSyncQuotation(null);
    }
  };

  const handleRequestClosePreview = () => {
    if (isPreviewUnsaved) {
      setShowDiscardModal({ isOpen: true, type: 'PREVIEW' });
    } else {
      setPreviewQuotation(null);
    }
  };

  const handleConfirmDiscard = () => {
    onClearInitialOpportunity?.();
    setShowDiscardModal({ isOpen: false, type: 'QUESTIONNAIRE' });
    setIsQuestionnaireOpen(false);
    setPreviewQuotation(null);
    setEditingQuotationId(null);
    setPendingRevisionQuotation(null);
    setPendingDraftSyncQuotation(null);
    setIsPreviewUnsaved(false);
  };

  const handleSaveDraftFromDiscardModal = () => {
    const currentType = showDiscardModal.type;
    setShowDiscardModal({ isOpen: false, type: 'QUESTIONNAIRE' });
    if (currentType === 'QUESTIONNAIRE') {
      handleSaveDraftFromQuestionnaire();
    } else if (previewQuotation) {
      handleSaveDraftFromPreview(previewQuotation);
    }
  };

  const handleConfirmStatus = () => {
    if (!statusDialog.quotation || !statusDialog.targetStatus) return;
    onUpdateQuotationStatus(statusDialog.quotation.id, statusDialog.targetStatus, statusDialog.lostReason);
    setStatusDialog({ isOpen: false, quotation: null, targetStatus: null, lostReason: '' });
  };

  // Live master configuration options for dropdowns and defaults
  const masterConfig = getMasterConfig(propMasterConfig);

  // Available opportunities for new quotation creation (filters out opportunities that already have a quotation)
  const availableOpportunities = useMemo(() => {
    const list = opportunities.filter(opp => {
      if (formOpportunityId && opp.id === formOpportunityId) return true;
      const alreadyHasQuotation = quotations.some(q => q.opportunityId === opp.id);
      return !alreadyHasQuotation;
    });
    if (initialOpportunity && !list.some(o => o.id === initialOpportunity.id)) {
      list.unshift(initialOpportunity);
    }
    return list;
  }, [opportunities, quotations, formOpportunityId, initialOpportunity]);

  // Live pricing breakdown computation for the questionnaire modal preview
  const livePricingPreview = useMemo(() => {
    const capacity = formCapacityKw;
    const isBatteryActive = Boolean(formBattery && !formBattery.toLowerCase().includes('nil') && formBatteryQty > 0);
    
    let basic = 0;
    let goodsTax = 0;
    let servicesTax = 0;
    let totalTax = 0;
    let subtotal = 0;
    let discount = formDiscountAmount || 0;
    let grandTotal = 0;

    const goodsPercent = masterConfig.gstGoodsPercent || 80;
    const goodsRate = masterConfig.gstGoodsRate || 5;
    const servicesPercent = masterConfig.gstServicesPercent || 20;
    const servicesRate = masterConfig.gstServicesRate || 18;
    const totalMultiplier = ((goodsPercent / 100) * (1 + goodsRate / 100)) + ((servicesPercent / 100) * (1 + servicesRate / 100));

    if (formPricingMode === 'MANUAL') {
      const rawPrice = formManualPrice > 0 ? formManualPrice : Math.round(capacity * 60000);
      basic = Math.round(rawPrice / totalMultiplier);
      const goodsBase = basic * (goodsPercent / 100);
      goodsTax = Math.round(goodsBase * (goodsRate / 100));
      // Reconcile services tax so basic + totalTax exactly equals rawPrice
      servicesTax = Math.max(0, (rawPrice - basic) - goodsTax);
      totalTax = goodsTax + servicesTax;
      subtotal = rawPrice;
      grandTotal = Math.max(0, rawPrice - discount);
    } else {
      const solarBase = capacity * 55000;
      const batteryBase = isBatteryActive ? (formBatteryQty * 95000) : 0;
      basic = Math.round(solarBase + batteryBase);
      const goodsBase = basic * (goodsPercent / 100);
      const servicesBase = basic * (servicesPercent / 100);
      goodsTax = Math.round(goodsBase * (goodsRate / 100));
      servicesTax = Math.round(servicesBase * (servicesRate / 100));
      totalTax = goodsTax + servicesTax;
      subtotal = basic + totalTax;
      grandTotal = Math.max(0, subtotal - discount);
    }

    const goodsBase = basic * (goodsPercent / 100);
    const servicesBase = basic * (servicesPercent / 100);

    return {
      capacity,
      basic,
      goodsBase,
      servicesBase,
      goodsTax,
      servicesTax,
      totalTax,
      subtotal,
      discount,
      grandTotal
    };
  }, [formPricingMode, formManualPrice, formCapacityKw, formBattery, formBatteryQty, formDiscountAmount, masterConfig]);

  return (
    <div className="space-y-4 pb-10 sm:pb-14">
      {/* 1. TOP METRICS STRIP: 1x4 ON DESKTOP, 2x2 ON MOBILE (Matching Cashbook / Petty Cash Palette) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Raised */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Total Raised
            </span>
            <span className="text-slate-700 bg-slate-100 p-1.5 rounded-lg shrink-0">
              <FileText className="w-4 h-4 text-slate-700" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {metrics.totalRaised} <span className="text-xs font-bold text-slate-400">Quotes</span>
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
              ₹ {metrics.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total value
            </p>
          </div>
        </div>

        {/* Won Proposals */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Won / Converted
            </span>
            <span className="text-emerald-600 bg-emerald-50 p-1.5 rounded-lg shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-none">
              {metrics.wonCount} <span className="text-xs font-bold text-emerald-500">Won</span>
            </p>
            <p className="text-[9px] text-emerald-600 mt-1.5 flex items-center gap-1 font-bold">
              ₹ {metrics.wonValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} converted
            </p>
          </div>
        </div>

        {/* Lost Proposals */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Proposals Lost
            </span>
            <span className="text-rose-600 bg-rose-50 p-1.5 rounded-lg shrink-0">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight leading-none">
              {metrics.lostCount} <span className="text-xs font-bold text-rose-400">Lost</span>
            </p>
            <p className="text-[9px] text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
              ₹ {metrics.lostValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} value
            </p>
          </div>
        </div>

        {/* Active In-Review / Drafts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Active / In-Review
            </span>
            <span className="text-amber-600 bg-amber-50 p-1.5 rounded-lg shrink-0">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {metrics.activeCount} <span className="text-xs font-bold text-slate-400">Active</span>
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
              ₹ {metrics.activeValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in pipeline
            </p>
          </div>
        </div>
      </div>

      {/* 2. TOP ACTION BAR: NEW QUOTATION BUTTON */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-800 text-sm tracking-tight">
            Proposals & Quotations
          </h2>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
            {filteredQuotations.length} {filteredQuotations.length === 1 ? 'quote' : 'quotes'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenNewQuestionnaire}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-extrabold shadow-xs hover:bg-[#e5aa3b] transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* 3. FILTERS TOOLBAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Filters:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 flex-1 min-w-0">
            {/* Filter 1: Calendar / Date Range */}
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'date' ? null : 'date')}
                className={`w-full py-1.5 px-2 sm:px-2.5 bg-white border rounded-xl text-[11px] font-semibold text-slate-700 transition-all h-[34px] cursor-pointer flex items-center justify-between shadow-2xs min-w-0 ${
                  fromDate || toDate ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{dateLabel}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {openFilter === 'date' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-68 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter by Date</span>
                      <button
                        type="button"
                        onClick={() => { setFromDate(''); setToDate(''); }}
                        className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setDatePreset('today')}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('this_month')}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                      >
                        This Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('last_30_days')}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                      >
                        Last 30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('this_year')}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                      >
                        This Year
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">From Date</label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">To Date</label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter 2: Multi-select Status */}
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                className={`w-full py-1.5 px-2 sm:px-2.5 bg-white border rounded-xl text-[11px] font-semibold text-slate-700 transition-all h-[34px] cursor-pointer flex items-center justify-between shadow-2xs min-w-0 ${
                  selectedStatuses.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {selectedStatuses.length === 0 ? 'All Statuses' : `${selectedStatuses.length} Statuses`}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {openFilter === 'status' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2.5 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                      <span className="font-extrabold text-slate-800 text-[11px]">Select Status</span>
                      <button
                        type="button"
                        onClick={() => setSelectedStatuses([])}
                        className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {ALL_STATUSES.map(s => {
                        const isChecked = selectedStatuses.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-slate-700 select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedStatuses(prev => prev.filter(x => x !== s.id));
                                } else {
                                  setSelectedStatuses(prev => [...prev, s.id]);
                                }
                              }}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                            />
                            <span className="text-xs font-medium">{s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter 3: Account Owner */}
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'owner' ? null : 'owner')}
                className={`w-full py-1.5 px-2 sm:px-2.5 bg-white border rounded-xl text-[11px] font-semibold text-slate-700 transition-all h-[34px] cursor-pointer flex items-center justify-between shadow-2xs min-w-0 ${
                  selectedOwners.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {selectedOwners.length === 0 ? 'All Owners' : `${selectedOwners.length} Owners`}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {openFilter === 'owner' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2.5 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter by Owner</span>
                      <button
                        type="button"
                        onClick={() => setSelectedOwners([])}
                        className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search owner..."
                      value={searchOwnerFilter}
                      onChange={(e) => setSearchOwnerFilter(e.target.value)}
                      className="w-full text-xs p-1.5 mb-2 rounded-lg border border-slate-200 bg-slate-50"
                    />

                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {availableOwners
                        .filter(o => o.toLowerCase().includes(searchOwnerFilter.toLowerCase()))
                        .map(owner => {
                          const isChecked = selectedOwners.includes(owner);
                          return (
                            <label
                              key={owner}
                              className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-slate-700 select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedOwners(prev => prev.filter(x => x !== owner));
                                  } else {
                                    setSelectedOwners(prev => [...prev, owner]);
                                  }
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                              />
                              <span className="text-xs font-medium truncate">{owner}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter 4: CRM Account */}
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'account' ? null : 'account')}
                className={`w-full py-1.5 px-2 sm:px-2.5 bg-white border rounded-xl text-[11px] font-semibold text-slate-700 transition-all h-[34px] cursor-pointer flex items-center justify-between shadow-2xs min-w-0 ${
                  selectedAccounts.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {selectedAccounts.length === 0 ? 'All Accounts' : `${selectedAccounts.length} Accounts`}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {openFilter === 'account' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2.5 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter by Account</span>
                      <button
                        type="button"
                        onClick={() => setSelectedAccounts([])}
                        className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search account..."
                      value={searchAccountFilter}
                      onChange={(e) => setSearchAccountFilter(e.target.value)}
                      className="w-full text-xs p-1.5 mb-2 rounded-lg border border-slate-200 bg-slate-50"
                    />

                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {availableAccounts
                        .filter(a => a.toLowerCase().includes(searchAccountFilter.toLowerCase()))
                        .map(acc => {
                          const isChecked = selectedAccounts.includes(acc);
                          return (
                            <label
                              key={acc}
                              className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-slate-700 select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedAccounts(prev => prev.filter(x => x !== acc));
                                  } else {
                                    setSelectedAccounts(prev => [...prev, acc]);
                                  }
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                              />
                              <span className="text-xs font-medium truncate">{acc}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter 5: Contact / Client Name */}
            <div className="relative min-w-0 col-span-2 sm:col-span-1">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'contact' ? null : 'contact')}
                className={`w-full py-1.5 px-2 sm:px-2.5 bg-white border rounded-xl text-[11px] font-semibold text-slate-700 transition-all h-[34px] cursor-pointer flex items-center justify-between shadow-2xs min-w-0 ${
                  selectedContacts.length > 0 ? 'border-amber-400 bg-amber-50/40 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {selectedContacts.length === 0 ? 'All Contacts' : `${selectedContacts.length} Contacts`}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {openFilter === 'contact' && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                  <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2.5 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                      <span className="font-extrabold text-slate-800 text-[11px]">Filter by Contact</span>
                      <button
                        type="button"
                        onClick={() => setSelectedContacts([])}
                        className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search contact..."
                      value={searchContactFilter}
                      onChange={(e) => setSearchContactFilter(e.target.value)}
                      className="w-full text-xs p-1.5 mb-2 rounded-lg border border-slate-200 bg-slate-50"
                    />

                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {availableContacts
                        .filter(c => c.toLowerCase().includes(searchContactFilter.toLowerCase()))
                        .map(con => {
                          const isChecked = selectedContacts.includes(con);
                          return (
                            <label
                              key={con}
                              className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-slate-700 select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedContacts(prev => prev.filter(x => x !== con));
                                  } else {
                                    setSelectedContacts(prev => [...prev, con]);
                                  }
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                              />
                              <span className="text-xs font-medium truncate">{con}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 text-slate-400 hover:text-amber-700 rounded-xl hover:bg-amber-50 cursor-pointer shrink-0 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. PROPOSALS LIST & TABLE (MOBILE RESPONSIVE WITHOUT HORIZONTAL SCROLL) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Offer No & Revision</th>
                <th className="py-3 px-4">Client & Location</th>
                <th className="py-3 px-3 text-center">Capacity</th>
                <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Date & Validity</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderPlus className="w-8 h-8 text-slate-300" />
                      <span>No proposals found matching criteria</span>
                      <button
                        type="button"
                        onClick={handleOpenNewQuestionnaire}
                        className="mt-1 text-xs text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Create your first quotation
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedQuotations.map((quo) => (
                  <tr key={quo.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Offer No */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                      <div className="flex items-center gap-1.5">
                        {isRevisedQuotation(quo) ? (
                          <button
                            type="button"
                            onClick={() => setRevisionDetailsDialog({ isOpen: true, quotation: quo })}
                            className="text-amber-700 hover:text-amber-900 hover:underline cursor-pointer text-left font-bold"
                            title="Click to view revision changes"
                          >
                            {quo.offerNo || quo.quotationNo}
                          </button>
                        ) : (
                          <span className="text-slate-900">
                            {quo.offerNo || quo.quotationNo}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans font-bold ${
                          isRevisedQuotation(quo)
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {quo.revisionCode || 'R0'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5 font-normal">
                        by {quo.createdBy || 'Admin'}
                      </div>
                    </td>

                    {/* Client & Location */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 text-xs">
                        {quo.clientName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="truncate max-w-xs">📍 {quo.location}</span>
                        {quo.accountName && (
                          <span className="text-slate-400">• {quo.accountName}</span>
                        )}
                      </div>
                    </td>

                    {/* Capacity */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {quo.capacityKw} kW
                      </span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-black text-slate-950 text-xs">
                        ₹ {quo.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      {quo.specialDiscount > 0 && (
                        <span className="text-[10px] font-semibold text-rose-600 block">
                          Disc: ₹{quo.specialDiscount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        quo.status === 'WON' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        quo.status === 'LOST' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        quo.status === 'SENT' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        quo.status === 'UNDER_REVISION' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {quo.status === 'SENT' ? 'Submitted' : quo.status === 'UNDER_REVISION' ? 'Under Revision' : quo.status === 'DRAFT' ? 'Draft' : quo.status === 'WON' ? 'Won' : quo.status === 'LOST' ? 'Lost' : quo.status}
                      </span>
                    </td>

                    {/* Date / Validity */}
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      <div>Date: {formatDateToDMY(quo.date)}</div>
                      <div className="text-[10px] text-slate-400">Valid: {formatDateToDMY(quo.priceValidityDate)}</div>
                    </td>

                    {/* Actions (Left to Right) */}
                    <td className="py-3 px-4 text-left">
                      <div className="flex items-center justify-start gap-1.5">
                        {/* 1. 5-Page Live Preview Modal */}
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewQuotation(quo);
                            setIsPreviewUnsaved(false);
                          }}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="View Proposal"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* 2. Edit in Simplified Questionnaire (With Revision Intercept for Submitted) */}
                        <button
                          type="button"
                          onClick={() => handleEditClick(quo)}
                          className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-500 hover:text-amber-700 transition-colors cursor-pointer"
                          title={quo.status === 'SENT' ? 'Edit Submitted Quotation (Generates Revision)' : 'Edit Quotation Parameters'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* 3. Mark Won (Only visible after submission and if not yet won) */}
                        {quo.status !== 'DRAFT' && quo.status !== 'WON' && (
                          <button
                            type="button"
                            onClick={() => setStatusDialog({ isOpen: true, quotation: quo, targetStatus: 'WON', lostReason: '' })}
                            className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                            title="Mark Won"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* 4. Mark Lost (Only visible after submission and if not yet lost) */}
                        {quo.status !== 'DRAFT' && quo.status !== 'LOST' && (
                          <button
                            type="button"
                            onClick={() => setStatusDialog({ isOpen: true, quotation: quo, targetStatus: 'LOST', lostReason: '' })}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Mark Lost"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* 5. Admin Delete Proposal Action (Admin only) */}
                        {Boolean(onDeleteQuotation) && isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteProposalDialog({ isOpen: true, quotation: quo })}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Proposal (Releases Offer No.)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards (No Horizontal Scroll) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedQuotations.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-400 font-medium">
              <div className="flex flex-col items-center justify-center gap-2">
                <FolderPlus className="w-8 h-8 text-slate-300" />
                <span className="text-xs">No proposals found matching criteria</span>
                <button
                  type="button"
                  onClick={handleOpenNewQuestionnaire}
                  className="mt-1 text-xs text-amber-700 font-bold hover:underline cursor-pointer"
                >
                  Create your first quotation
                </button>
              </div>
            </div>
          ) : (
            paginatedQuotations.map((quo) => (
              <div key={quo.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                {/* Top Row: Offer No + Revision & Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isRevisedQuotation(quo) ? (
                      <button
                        type="button"
                        onClick={() => setRevisionDetailsDialog({ isOpen: true, quotation: quo })}
                        className="font-mono font-bold text-xs text-amber-700 hover:text-amber-900 hover:underline cursor-pointer truncate"
                        title="Click to view revision changes"
                      >
                        {quo.offerNo || quo.quotationNo}
                      </button>
                    ) : (
                      <span className="font-mono font-bold text-xs text-slate-900 truncate">
                        {quo.offerNo || quo.quotationNo}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans font-bold shrink-0 ${
                      isRevisedQuotation(quo)
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {quo.revisionCode || 'R0'}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${
                    quo.status === 'WON' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    quo.status === 'LOST' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    quo.status === 'SENT' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    quo.status === 'UNDER_REVISION' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {quo.status === 'SENT' ? 'Submitted' : quo.status === 'UNDER_REVISION' ? 'Under Revision' : quo.status === 'DRAFT' ? 'Draft' : quo.status === 'WON' ? 'Won' : quo.status === 'LOST' ? 'Lost' : quo.status}
                  </span>
                </div>

                {/* Client Info */}
                <div>
                  <div className="font-extrabold text-slate-900 text-xs">
                    {quo.clientName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="truncate">📍 {quo.location}</span>
                    {quo.accountName && (
                      <span className="text-slate-400 shrink-0">• {quo.accountName}</span>
                    )}
                  </div>
                </div>

                {/* Capacity & Price Details Strip */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">Capacity</span>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {quo.capacityKw} kW
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-semibold">Grand Total</span>
                    <span className="font-black text-slate-950 text-[11px]">
                      ₹ {quo.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    {quo.specialDiscount > 0 && (
                      <span className="text-[9px] font-semibold text-rose-600 block">
                        Disc: ₹{quo.specialDiscount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date & Sub-info */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Date: {formatDateToDMY(quo.date)}</span>
                  <span>Valid: {formatDateToDMY(quo.priceValidityDate)}</span>
                </div>

                {/* Mobile Actions Toolbar (Left to Right) */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {/* View */}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewQuotation(quo);
                        setIsPreviewUnsaved(false);
                      }}
                      className="p-2 hover:bg-indigo-50 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="View Proposal"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleEditClick(quo)}
                      className="p-2 hover:bg-amber-50 rounded-lg text-slate-600 hover:text-amber-700 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title={quo.status === 'SENT' ? 'Edit Submitted Quotation (Generates Revision)' : 'Edit Quotation Parameters'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Mark Won (Only after submission) */}
                    {quo.status !== 'DRAFT' && quo.status !== 'WON' && (
                      <button
                        type="button"
                        onClick={() => setStatusDialog({ isOpen: true, quotation: quo, targetStatus: 'WON', lostReason: '' })}
                        className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                        title="Mark Won"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Won</span>
                      </button>
                    )}

                    {/* Mark Lost (Only after submission) */}
                    {quo.status !== 'DRAFT' && quo.status !== 'LOST' && (
                      <button
                        type="button"
                        onClick={() => setStatusDialog({ isOpen: true, quotation: quo, targetStatus: 'LOST', lostReason: '' })}
                        className="p-2 hover:bg-rose-50 rounded-lg text-rose-700 hover:text-rose-800 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                        title="Mark Lost"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Lost</span>
                      </button>
                    )}
                  </div>

                  {/* Delete (Admin only) */}
                  {Boolean(onDeleteQuotation) && isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeleteProposalDialog({ isOpen: true, quotation: quo })}
                      className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Proposal (Releases Offer No.)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200/80 text-xs">
            <div className="text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredQuotations.length)} of {filteredQuotations.length} quotes
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NEW / EDIT QUOTATION QUESTIONNAIRE WIZARD                          */}
      {/* ========================================================================= */}
      {isQuestionnaireOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f7b944]/20 border border-[#f7b944]/50 flex items-center justify-center text-[#f7b944]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">
                    {editingQuotationId ? 'Edit Quotation Parameters' : 'Prepare Solar Quotation'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Fill the parameters below to automatically generate all 5 proposal pages.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestCloseQuestionnaire}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Choose CRM Opportunity / Client */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Choose Client *
                  </label>
                  <select
                    value={formOpportunityId}
                    onChange={(e) => handleSelectOpportunity(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                  >
                    <option value="">-- Choose Client from CRM Opportunities --</option>
                    {availableOpportunities.map(opp => (
                      <option key={opp.id} value={opp.id}>
                        {opp.title} ({opp.accountName} • Target: ₹{opp.amount.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Client / Contact Name *
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Mr. Senthil Kumar"
                        value={formClientName}
                        onChange={(e) => setFormClientName(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f7b944]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={formContactPhone}
                        onChange={(e) => setFormContactPhone(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f7b944]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="client@example.com"
                        value={formContactEmail}
                        onChange={(e) => setFormContactEmail(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f7b944]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Complete Postal Address</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Door No, Street Name&#10;City, State - PIN"
                    value={formFullAddress}
                    onChange={(e) => setFormFullAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f7b944] leading-relaxed"
                  />
                </div>
              </div>

              {/* Grid 3 Columns for Connection Type, Target Segment, and Schemes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Connection Type */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Connection Type *</span>
                  </label>
                  <select
                    value={formSystemType}
                    onChange={(e) => setFormSystemType(e.target.value)}
                    className="w-full text-xs font-medium p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                  >
                    <option value="">Choose Connection Type</option>
                    {masterConfig.availableSystemTypes.map((st) => (
                      <option key={st.id} value={st.label}>{st.label}</option>
                    ))}
                    {formSystemType && !masterConfig.availableSystemTypes.some(st => st.label === formSystemType) && (
                      <option value={formSystemType}>{formSystemType}</option>
                    )}
                  </select>
                </div>

                {/* Target Segment */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Target Segment *</span>
                  </label>
                  <select
                    value={formSegment}
                    onChange={(e) => setFormSegment(e.target.value)}
                    className="w-full text-xs font-medium p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                  >
                    <option value="">Choose Target Segment</option>
                    {masterConfig.availableSegments.map((seg) => (
                      <option key={seg.id} value={seg.label}>{seg.label}</option>
                    ))}
                    {formSegment && !masterConfig.availableSegments.some(seg => seg.label === formSegment) && (
                      <option value={formSegment}>{formSegment}</option>
                    )}
                  </select>
                </div>

                {/* Scheme */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scheme *</span>
                  </label>
                  <select
                    value={formScheme}
                    onChange={(e) => setFormScheme(e.target.value)}
                    className="w-full text-xs font-medium p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                  >
                    <option value="">Choose Scheme</option>
                    {masterConfig.availableSchemes.map((sch) => (
                      <option key={sch.id} value={sch.label}>{sch.label}</option>
                    ))}
                    {formScheme && !masterConfig.availableSchemes.some(sch => sch.label === formScheme) && (
                      <option value={formScheme}>{formScheme}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Grid 2 Columns for Offer No & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Offer No. */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Offer No. *
                  </label>
                  <input
                    type="text"
                    value={formOfferNo}
                    onChange={(e) => setFormOfferNo(e.target.value)}
                    placeholder="e.g. SP26270025"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f7b944]"
                  />
                </div>

                {/* Project Capacity */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Project Capacity (kW) *
                  </label>
                  <select
                    value={formCapacityKw}
                    onChange={(e) => setFormCapacityKw(parseFloat(e.target.value))}
                    className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                  >
                    <option value={0}>Choose Project Capacity</option>
                    {(masterConfig.capacityOptions && masterConfig.capacityOptions.length > 0 ? masterConfig.capacityOptions : STANDARD_CAPACITIES).map(cap => (
                      <option key={cap} value={cap}>
                        {cap} kW
                      </option>
                    ))}
                    {formCapacityKw > 0 && !(masterConfig.capacityOptions && masterConfig.capacityOptions.length > 0 ? masterConfig.capacityOptions : STANDARD_CAPACITIES).includes(formCapacityKw) && (
                      <option value={formCapacityKw}>{formCapacityKw} kW</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Grid 2 Columns for Modules & Inverter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Solar PV Modules */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-600" />
                      <span>Solar PV Modules *</span>
                    </label>
                  </div>
                  <select
                    value={formSolarModule}
                    onChange={(e) => setFormSolarModule(e.target.value)}
                    className="w-full text-xs font-medium p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                  >
                    <option value="">Choose Solar PV Module</option>
                    {masterConfig.supplyDropdownOptions.moduleOptions.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                    {formSolarModule && !masterConfig.supplyDropdownOptions.moduleOptions.includes(formSolarModule) && (
                      <option value={formSolarModule}>{formSolarModule}</option>
                    )}
                  </select>
                </div>

                {/* Inverter */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      <span>Inverter *</span>
                    </label>
                  </div>
                  <select
                    value={formInverter}
                    onChange={(e) => setFormInverter(e.target.value)}
                    className="w-full text-xs font-medium p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                  >
                    <option value="">Choose Inverter</option>
                    {masterConfig.supplyDropdownOptions.inverterOptions.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                    {formInverter && !masterConfig.supplyDropdownOptions.inverterOptions.includes(formInverter) && (
                      <option value={formInverter}>{formInverter}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Grid 2 Columns for Battery & Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Battery with Qty (Quantity next to dropdown) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Battery & Storage *</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={formBattery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormBattery(val);
                        if (val.toLowerCase().includes('nil') || !val) {
                          setFormBatteryQty(0);
                        } else if (formBatteryQty === 0) {
                          setFormBatteryQty(1);
                        }
                      }}
                      className="flex-1 min-w-0 text-xs font-medium p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                    >
                      <option value="">Choose Battery & Storage</option>
                      {masterConfig.supplyDropdownOptions.batteryOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                      {formBattery && !masterConfig.supplyDropdownOptions.batteryOptions.includes(formBattery) && (
                        <option value={formBattery}>{formBattery}</option>
                      )}
                    </select>

                    <div className="flex items-center gap-1 shrink-0 bg-white px-2 py-1 border border-slate-300 rounded-lg">
                      <span className="text-[11px] font-semibold text-slate-600">Qty:</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={formBattery.toLowerCase().includes('nil') || !formBattery ? 0 : formBatteryQty}
                        onChange={(e) => {
                          if (formBattery.toLowerCase().includes('nil') || !formBattery) {
                            setFormBatteryQty(0);
                          } else {
                            setFormBatteryQty(parseInt(e.target.value, 10) || 0);
                          }
                        }}
                        disabled={formBattery.toLowerCase().includes('nil') || !formBattery}
                        className="w-12 text-xs font-bold text-center bg-transparent border-0 focus:outline-none disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Structure Elevation with Feet next to dropdown */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Structure Elevation *</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={formStructure}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormStructure(val);
                        if (val.toLowerCase().includes('nil') || !val) {
                          setFormStructureFeet(0);
                        } else {
                          // Extract feet number if present in option string (e.g. 7 to 10 Feet -> 7, 12+ Feet -> 12)
                          const match = val.match(/(\d+(?:\.\d+)?)\s*(?:to|-)?\s*(?:\d+)?\s*(?:Feet|Ft|feet|ft)/i);
                          const parsedFeet = match ? parseFloat(match[1]) : (formStructureFeet > 0 ? formStructureFeet : 7);
                          setFormStructureFeet(parsedFeet);
                        }
                      }}
                      className="flex-1 min-w-0 text-xs font-medium p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f7b944] bg-white cursor-pointer"
                    >
                      <option value="">Choose Structure Elevation</option>
                      {masterConfig.supplyDropdownOptions.structureOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                      {formStructure && !masterConfig.supplyDropdownOptions.structureOptions.includes(formStructure) && (
                        <option value={formStructure}>{formStructure}</option>
                      )}
                    </select>

                    <div className="flex items-center gap-1 shrink-0 bg-white px-2 py-1 border border-slate-300 rounded-lg" title="Structure height in feet (0 = Nil)">
                      <span className="text-[11px] font-semibold text-slate-600">Feet:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        value={formStructure.toLowerCase().includes('nil') || !formStructure ? 0 : formStructureFeet}
                        onChange={(e) => {
                          const val = e.target.value;
                          const parsed = val === '' ? 0 : parseFloat(val);
                          setFormStructureFeet(isNaN(parsed) ? 0 : Math.max(0, parsed));
                        }}
                        disabled={formStructure.toLowerCase().includes('nil') || !formStructure}
                        className="w-12 text-xs font-bold text-center bg-transparent border-0 focus:outline-none disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Calculation Mode */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-amber-700" />
                    <span>Pricing Calculation Mode</span>
                  </label>

                  <div className="flex items-center gap-4 bg-white px-3 py-1 rounded-lg border border-amber-200">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-800">
                      <input
                        type="radio"
                        name="pricingMode"
                        checked={formPricingMode === 'MANUAL'}
                        onChange={() => setFormPricingMode('MANUAL')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Manual (Default)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-800">
                      <input
                        type="radio"
                        name="pricingMode"
                        checked={formPricingMode === 'AUTOMATIC'}
                        onChange={() => setFormPricingMode('AUTOMATIC')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Automatic</span>
                    </label>
                  </div>
                </div>

                {formPricingMode === 'MANUAL' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Total Price (₹) *
                      </label>
                      <div className="relative">
                        <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="number"
                          value={formManualPrice}
                          onChange={(e) => setFormManualPrice(parseFloat(e.target.value) || 0)}
                          placeholder="e.g. 330000"
                          className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Discount Amount (₹)
                      </label>
                      <div className="relative">
                        <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="number"
                          min={0}
                          value={formDiscountAmount || ''}
                          onChange={(e) => setFormDiscountAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="text-xs text-amber-900 font-medium py-2">
                      Calculated at ₹55,000 / kWp + Battery additions + Dual GST breakdown automatically.
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Discount Amount (₹)
                      </label>
                      <div className="relative">
                        <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="number"
                          min={0}
                          value={formDiscountAmount || ''}
                          onChange={(e) => setFormDiscountAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Instant Live Calculation Matrix */}
                <div className={`bg-white p-3 rounded-lg border border-amber-200/80 grid gap-2 text-center text-xs ${
                  livePricingPreview.discount > 0 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Base Basic Cost</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹ {livePricingPreview.basic.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Equipment GST (5% on 80%)</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹ {livePricingPreview.goodsTax.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Services GST (18% on 20%)</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹ {livePricingPreview.servicesTax.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {livePricingPreview.discount > 0 && (
                    <div>
                      <span className="text-[10px] text-rose-600 font-semibold block">Discount</span>
                      <span className="font-mono font-bold text-rose-700">
                        - ₹ {livePricingPreview.discount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className="bg-amber-50 p-1 rounded-md border border-amber-200">
                    <span className="text-[10px] text-amber-900 font-bold block">Grand Total</span>
                    <span className="font-mono font-bold text-amber-950 text-xs">
                      ₹ {livePricingPreview.grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleRequestCloseQuestionnaire}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraftFromQuestionnaire}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs transition-all border border-slate-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Save quotation draft without submitting"
                >
                  <Save className="w-3.5 h-3.5 text-blue-400" />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateQuotation}
                  className="px-5 py-2.5 bg-[#f7b944] hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{editingQuotationId ? 'Update & Preview Proposal' : 'Generate Quotation & Preview'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5-PAGE LIVE A4 PREVIEW MODAL                                              */}
      {/* ========================================================================= */}
      {previewQuotation && (
        <Quotation5PagePrintView
          quotation={previewQuotation}
          onClose={handleRequestClosePreview}
          onEdit={(quo) => {
            if (isPreviewUnsaved) {
              setPreviewQuotation(null);
              setIsQuestionnaireOpen(true);
            } else {
              handleEditClick(quo);
            }
          }}
          onSaveDraft={(quo) => handleSaveDraftFromPreview(quo)}
          onSubmitQuotation={(quo) => handleSubmitFromPreview(quo)}
        />
      )}

      {/* ========================================================================= */}
      {/* SOFT WARNING / DISCARD CONFIRMATION DIALOG                                */}
      {/* ========================================================================= */}
      {showDiscardModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Unsaved Quotation
                </h3>
                <p className="text-xs text-slate-500">
                  You are leaving quotation preparation without saving
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {showDiscardModal.type === 'QUESTIONNAIRE'
                ? 'Would you like to save this quotation as a draft or discard all unsaved changes and leave?'
                : 'This quotation preview has not been saved as a draft or submitted yet. Would you like to save it as a draft or discard?'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardModal({ isOpen: false, type: 'QUESTIONNAIRE' })}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer order-3 sm:order-1"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl cursor-pointer order-2"
              >
                Discard & Leave
              </button>
              <button
                type="button"
                onClick={handleSaveDraftFromDiscardModal}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 order-1 sm:order-3"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save as Draft</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATUS UPDATE DIALOG (WON / LOST)                                         */}
      {/* ========================================================================= */}
      {statusDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <h3 className="text-sm font-extrabold text-slate-900">
              {statusDialog.targetStatus === 'WON' ? 'Mark Proposal as Won / Converted' : 'Mark Proposal as Lost'}
            </h3>
            <p className="text-xs text-slate-500">
              Proposal: <strong>{statusDialog.quotation?.offerNo}</strong> for <strong>{statusDialog.quotation?.clientName}</strong>
            </p>

            {statusDialog.targetStatus === 'LOST' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Loss
                </label>
                <input
                  type="text"
                  value={statusDialog.lostReason}
                  onChange={(e) => setStatusDialog(prev => ({ ...prev, lostReason: e.target.value }))}
                  placeholder="e.g. Price competition, Delayed decision, Grid permit rejected"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#f7b944]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusDialog({ isOpen: false, quotation: null, targetStatus: null, lostReason: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatus}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  statusDialog.targetStatus === 'WON'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                Confirm {statusDialog.targetStatus}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN DELETE PROPOSAL DIALOG                                              */}
      {/* ========================================================================= */}
      {deleteProposalDialog.isOpen && deleteProposalDialog.quotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Delete Quotation Proposal
                </h3>
                <p className="text-xs text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
              <div><strong>Offer No:</strong> {deleteProposalDialog.quotation.offerNo}</div>
              <div><strong>Client:</strong> {deleteProposalDialog.quotation.clientName}</div>
              <div><strong>Capacity:</strong> {deleteProposalDialog.quotation.capacityKw} kW</div>
              <div><strong>Total:</strong> ₹{deleteProposalDialog.quotation.grandTotal.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                Deleting this proposal will release Offer No. <strong>{deleteProposalDialog.quotation.offerNo}</strong> for reuse.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProposalDialog({ isOpen: false, quotation: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isAdmin && deleteProposalDialog.quotation && onDeleteQuotation) {
                    onDeleteQuotation(deleteProposalDialog.quotation.id);
                  }
                  setDeleteProposalDialog({ isOpen: false, quotation: null });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete & Release Number</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVISION WARNING DIALOG FOR SUBMITTED PROPOSALS                           */}
      {/* ========================================================================= */}
      {revisionWarningDialog.isOpen && revisionWarningDialog.quotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Edit Submitted Quotation
                </h3>
                <p className="text-xs text-slate-500">
                  Generates a revised offer number sequence
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-900 leading-relaxed space-y-2.5">
              <p className="font-medium text-slate-800">
                Would you like to edit the submitted Quotation? This edit will generate a revised offer number (e.g., R-01, R-02).
              </p>
              <div className="bg-white rounded-lg p-2.5 border border-amber-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Current Offer No:</span>
                  <span className="font-bold text-slate-800">{revisionWarningDialog.quotation.offerNo}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold">
                  <span className="font-sans">Revised Offer No:</span>
                  <span>{revisionWarningDialog.revisedOfferNo}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-amber-100 font-sans text-[10.5px]">
                  <span>Status will become:</span>
                  <span className="font-bold text-amber-700">Under Revision</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionWarningDialog({
                  isOpen: false,
                  quotation: null,
                  revisedOfferNo: '',
                  revisionCode: '',
                  revisionIndex: 1
                })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevision}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Proceed to Edit ({revisionWarningDialog.revisionCode})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SELECTIVE MASTER CONFIG SYNC DIALOG (REVISIONS & DRAFTS)                  */}
      {/* ========================================================================= */}
      {revisionSyncDialog.isOpen && revisionSyncDialog.quotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/60">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {revisionSyncDialog.isDraft ? 'Selective Master Sync for Draft' : 'Selective Master Sync for Revision'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {revisionSyncDialog.isDraft ? (
                      <>
                        <span className="font-bold text-slate-800">{revisionSyncDialog.quotation.offerNo}</span>
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600">Draft</span>
                      </>
                    ) : (
                      <>
                        {revisionSyncDialog.quotation.offerNo} → <span className="font-bold text-amber-600">{revisionSyncDialog.revisedOfferNo}</span> ({revisionSyncDialog.revisionCode})
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevisionSyncDialog(prev => ({ ...prev, isOpen: false, quotation: null }))}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/70 text-xs text-blue-900 space-y-1">
              <p className="font-semibold text-slate-900">
                {revisionSyncDialog.isDraft
                  ? 'Updates were detected in Tools Master Settings since this draft was saved:'
                  : 'Choose which Master Configuration updates to pull into this revision:'}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {revisionSyncDialog.isDraft
                  ? 'By default, this draft retains all of its existing parameters. Check any specific section below if you wish to sync it with the latest global settings from Tools.'
                  : 'By default, this revision retains all snapshot data from the original proposal (isolated snapshot). Check any specific section below if you wish to overwrite it with the latest global settings.'}
              </p>
            </div>

            {/* Quick Actions (Select All / Keep All) */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-500 font-medium text-[11px]">
                Detected Differences ({revisionSyncDialog.detectedDiffs.length} section{revisionSyncDialog.detectedDiffs.length > 1 ? 's' : ''} modified):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allSelected: Record<string, boolean> = {};
                    revisionSyncDialog.detectedDiffs.forEach(d => {
                      allSelected[d.key] = true;
                    });
                    setRevisionSyncDialog(prev => ({
                      ...prev,
                      syncSelections: allSelected
                    }));
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer text-[11px]"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const allOriginal: Record<string, boolean> = {};
                    revisionSyncDialog.detectedDiffs.forEach(d => {
                      allOriginal[d.key] = false;
                    });
                    setRevisionSyncDialog(prev => ({
                      ...prev,
                      syncSelections: allOriginal
                    }));
                  }}
                  className="text-slate-500 hover:text-slate-700 font-bold hover:underline cursor-pointer text-[11px]"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Checkbox Options Grid - ONLY render sections where modifications/differences were detected */}
            <div className="overflow-y-auto max-h-72 space-y-2 pr-1 text-xs">
              {revisionSyncDialog.detectedDiffs.map((item) => {
                const isChecked = Boolean(revisionSyncDialog.syncSelections[item.key]);
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-amber-50/60 border-amber-300 text-slate-900 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRevisionSyncDialog(prev => ({
                          ...prev,
                          syncSelections: {
                            ...prev.syncSelections,
                            [item.key]: checked
                          }
                        }));
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 text-xs truncate">{item.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isChecked ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isChecked ? 'Pull Latest Master' : 'Retain Original'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                      {item.changesSummary && (
                        <p className="text-[10.5px] text-amber-900/90 font-medium bg-amber-50/80 rounded px-1.5 py-0.5 mt-1 border border-amber-200/50">
                          {item.changesSummary}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {(() => {
              const selectedCount = Object.values(revisionSyncDialog.syncSelections).filter(Boolean).length;
              const hasSelected = selectedCount > 0;
              return (
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRevisionSyncDialog(prev => ({ ...prev, isOpen: false, quotation: null }))}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleKeepAllOriginalAndEdit}
                      className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      {revisionSyncDialog.isDraft ? 'Keep All Original & Edit Draft' : 'Keep All Original & Revise'}
                    </button>
                    <button
                      type="button"
                      disabled={!hasSelected}
                      onClick={handleApplySyncAndEdit}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                        hasSelected
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-xs'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                      }`}
                      title={!hasSelected ? 'Select at least one change to apply, or click Keep All Original' : undefined}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>
                        {revisionSyncDialog.isDraft
                          ? (hasSelected ? `Apply Selected (${selectedCount}) & Edit Draft` : 'Apply Selected & Edit Draft')
                          : (hasSelected ? `Apply Selected (${selectedCount}) & Revise` : 'Apply Selected & Revise')}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVISION DETAILS / CHANGES DIALOG                                         */}
      {/* ========================================================================= */}
      {revisionDetailsDialog.isOpen && revisionDetailsDialog.quotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Revision Changes</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono font-bold">
                      {revisionDetailsDialog.quotation.revisionCode || 'Revised'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {revisionDetailsDialog.quotation.offerNo} • {revisionDetailsDialog.quotation.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevisionDetailsDialog({ isOpen: false, quotation: null })}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {/* Proposal Snapshot info */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Capacity</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {revisionDetailsDialog.quotation.capacityKw} kW
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold block">Grand Total</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ₹ {revisionDetailsDialog.quotation.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>System: <strong>{revisionDetailsDialog.quotation.connectionType || revisionDetailsDialog.quotation.systemType}</strong></span>
                  <span>Status: <strong className="text-amber-700">{revisionDetailsDialog.quotation.status}</strong></span>
                </div>
              </div>

              {/* Revision History & Changes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Changes Made for Revision
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {(revisionDetailsDialog.quotation.revisionHistory?.length || 0)} Recorded Log(s)
                  </span>
                </div>

                {revisionDetailsDialog.quotation.revisionHistory && revisionDetailsDialog.quotation.revisionHistory.length > 0 ? (
                  <div className="space-y-2.5">
                    {revisionDetailsDialog.quotation.revisionHistory.map((rev, idx) => (
                      <div key={idx} className="bg-amber-50/40 rounded-xl border border-amber-200/70 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px]">
                            {rev.revisionCode}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatDateToDMY(rev.timestamp?.split('T')[0]) || rev.timestamp}
                          </span>
                        </div>

                        <div className="text-xs text-slate-800 space-y-1 bg-white/90 p-2.5 rounded-lg border border-amber-100">
                          <div className="text-[11px] font-bold text-slate-500 mb-1">Detailed Modifications:</div>
                          {(rev.changesSummary || rev.reason || 'Commercial terms & scope updated')
                            .split(/\n\s*•|\s*\|\s*/)
                            .filter(Boolean)
                            .map((change, cIdx) => (
                              <div key={cIdx} className="flex items-start gap-1.5 text-slate-900 text-xs">
                                <span className="text-amber-600 font-bold mt-0.5">•</span>
                                <span className="font-medium">{change.replace(/^•\s*/, '')}</span>
                              </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>Revised by: <strong>{rev.author || 'Admin'}</strong></span>
                          <span>Revised Total: <strong>₹{rev.grandTotal?.toLocaleString('en-IN') || revisionDetailsDialog.quotation?.grandTotal.toLocaleString('en-IN')}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
                    <p className="font-semibold text-slate-800">
                      Revision Version: {revisionDetailsDialog.quotation.revisionCode || 'R-01'}
                    </p>
                    <ul className="space-y-1.5 list-disc pl-4 text-slate-700">
                      <li>Capacity: <strong>{revisionDetailsDialog.quotation.capacityKw} kW</strong></li>
                      <li>Grand Total (EPC): <strong>₹{revisionDetailsDialog.quotation.grandTotal.toLocaleString('en-IN')}</strong></li>
                      <li>Scheme: <strong>{revisionDetailsDialog.quotation.scheme}</strong></li>
                      <li>Connection Type: <strong>{revisionDetailsDialog.quotation.connectionType}</strong></li>
                      <li>Target Segment: <strong>{revisionDetailsDialog.quotation.targetSegment}</strong></li>
                    </ul>
                    <p className="text-[11px] text-slate-400 italic pt-1">
                      (Click the Eye icon on the row anytime to view or print the full 5-page proposal)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevisionDetailsDialog({ isOpen: false, quotation: null })}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
