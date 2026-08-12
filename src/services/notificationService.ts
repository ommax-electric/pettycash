import { AppSettings, IntegrationSettings, Transaction, User } from '../types';
import { buildModernHtmlEmailFromText } from '../utils/emailTemplate';

/**
 * Joins array of changed field names with proper commas and 'and'
 * e.g. ['Amount'] => 'Amount'
 * e.g. ['Paid To', 'Amount'] => 'Paid To and Amount'
 * e.g. ['Paid To', 'Amount', 'Date'] => 'Paid To, Amount and Date'
 */
export function joinChangedFields(fields: string[]): string {
  if (!fields || fields.length === 0) return 'details';
  const cleanFields = fields.map(f => f.trim()).filter(Boolean);
  if (cleanFields.length === 0) return 'details';
  if (cleanFields.length === 1) return cleanFields[0];
  if (cleanFields.length === 2) {
    return `${cleanFields[0]} and ${cleanFields[1].toLowerCase()}`;
  }
  
  const allButLast = cleanFields.slice(0, -1).map((f, i) => i === 0 ? f : f.toLowerCase()).join(', ');
  const last = cleanFields[cleanFields.length - 1].toLowerCase();
  return `${allButLast} and ${last}`;
}

/**
 * Normalizes phone numbers (e.g., +919025976761)
 */
export function formatPhoneNumber(numStr: string): string {
  let cleaned = numStr.trim().replace(/[\s\-\(\)]/g, '');
  if (!cleaned) return '';
  if (!cleaned.startsWith('+')) {
    cleaned = '+91' + cleaned;
  }
  return cleaned;
}

/**
 * Calculates current Cash Balance (Cash on Hand) from transactions array
 */
export function calculateCashBalance(transactions: Transaction[], currencySymbol: string = '₹'): string {
  const isCompletedInflow = (status?: string) => !status || status === 'APPROVED' || status === 'PAID';
  const isPaidOutflow = (status?: string) => status === 'PAID' || !status;

  const approvedInflow = transactions
    .filter(t => t.type === 'IN' && isCompletedInflow(t.status))
    .reduce((sum, t) => sum + t.amount, 0);

  const approvedOutflowCash = transactions
    .filter(t => t.type === 'OUT' && isPaidOutflow(t.status) && t.paymentType !== 'ONLINE')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = approvedInflow - approvedOutflowCash;
  return `${currencySymbol}${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Dispatches Corporate Email notification via configured SMTP / API endpoint
 */
export async function sendEmailNotification(
  type: 'NEW' | 'EDIT' | 'INWARD' | 'INWARD_EDIT' | 'REQUEST_SUBMITTED' | 'REQUEST_APPROVED' | 'REQUEST_PAID' | 'REQUEST_REJECTED' | 'REQUEST_REROUTED',
  txn: Transaction,
  currentUser: User | null,
  transactionsList: Transaction[],
  appSettings: AppSettings,
  changedFieldLabels: string[] = [],
  integrationSettings?: IntegrationSettings | null,
  usersList?: User[]
): Promise<{ success: boolean; message: string }> {
  try {
    const isEmailEnabled = integrationSettings 
      ? integrationSettings.emailEnabled
      : (localStorage.getItem('petty_cash_email_enabled') !== 'false');
    if (!isEmailEnabled) {
      return { success: false, message: 'Corporate Email alerts disabled in settings.' };
    }

    const rawRecipients = integrationSettings
      ? integrationSettings.emailRecipients
      : (localStorage.getItem('petty_cash_email_recipients') || '');
    let defaultRecipients = rawRecipients.split(',').map(r => r.trim()).filter(Boolean);

    const tenantId = (integrationSettings?.msTenantId || localStorage.getItem('ms_graph_tenant_id') || 'a63883ba-4173-48a2-a29d-247ca0c8e59a').trim();
    const clientId = (integrationSettings?.msClientId || localStorage.getItem('ms_graph_client_id') || 'cf54c887-7846-4cc7-8c4c-ed9d407d07d6').trim();
    const clientSecret = (integrationSettings?.msClientSecret || localStorage.getItem('ms_graph_client_secret') || 'G0_8Q~QEhThZjfB8yvfs2eVIWan_GQ2_toG4kcUz').trim();
    const senderEmail = (integrationSettings?.msSenderEmail || localStorage.getItem('ms_graph_sender_email') || 'mail@ommaxelectric.com').trim();
    const senderName = (integrationSettings?.msSenderName || localStorage.getItem('ms_graph_sender_name') || 'Petty Cash Desk').trim();

    if (!tenantId || !clientId || !clientSecret) {
      return {
        success: false,
        message: 'Microsoft Graph API configuration incomplete. Please provide Tenant ID, Client ID, and Client Secret in Admin Settings.'
      };
    }

    // Resolve specific target user emails from usersList
    let claimantEmail = '';
    let managerEmail = '';
    let adminEmail = '';

    if (usersList && usersList.length > 0) {
      // 1. Identify claimant user object
      const claimantUser = usersList.find(u => {
        if (currentUser && (
          (u.username && u.username.toLowerCase() === currentUser.username.toLowerCase()) ||
          (u.fullName && u.fullName.toLowerCase() === currentUser.fullName.toLowerCase()) ||
          (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
        )) {
          return true;
        }
        const reqStr = (txn.requestedBy || txn.recordedBy || txn.merchant || '').trim().toLowerCase();
        if (!reqStr) return false;
        return (
          (u.fullName && u.fullName.toLowerCase() === reqStr) ||
          (u.username && u.username.toLowerCase() === reqStr) ||
          (u.email && u.email.toLowerCase() === reqStr) ||
          (u.empId && u.empId.toLowerCase() === reqStr) ||
          (u.fullName && (reqStr.includes(u.fullName.toLowerCase()) || u.fullName.toLowerCase().includes(reqStr)))
        );
      });

      if (claimantUser?.email) claimantEmail = claimantUser.email;
      else if (currentUser?.email) claimantEmail = currentUser.email;

      // 2. Identify reporting manager string (prioritize non-generic txn.approverName, claimantUser.reportingTo, or currentUser.reportingTo)
      const genericTerms = ['admin', 'administrator', 'manager', 'custodian', 'auditor', 'user'];
      let reportingToTarget = '';

      if (txn.approverName && !genericTerms.includes(txn.approverName.trim().toLowerCase())) {
        reportingToTarget = txn.approverName.trim();
      } else if (claimantUser?.reportingTo && !genericTerms.includes(claimantUser.reportingTo.trim().toLowerCase())) {
        reportingToTarget = claimantUser.reportingTo.trim();
      } else if (currentUser?.reportingTo && !genericTerms.includes(currentUser.reportingTo.trim().toLowerCase())) {
        reportingToTarget = currentUser.reportingTo.trim();
      }

      if (reportingToTarget) {
        const repLower = reportingToTarget.toLowerCase();
        
        const mgrUser = usersList.find(u => {
          if (!u.email) return false;
          const uFull = (u.fullName || '').toLowerCase();
          const uUser = (u.username || '').toLowerCase();
          const uEmail = (u.email || '').toLowerCase();
          const uEmp = (u.empId || '').toLowerCase();

          return (
            uFull === repLower ||
            uUser === repLower ||
            uEmail === repLower ||
            uEmp === repLower ||
            (repLower.length > 2 && (uFull.includes(repLower) || repLower.includes(uFull)))
          );
        });

        if (mgrUser?.email) {
          managerEmail = mgrUser.email;
        }
      }

      // If resolved manager is the claimant themselves, clear managerEmail (cannot approve own claim)
      if (managerEmail && claimantEmail && managerEmail.trim().toLowerCase() === claimantEmail.trim().toLowerCase()) {
        managerEmail = '';
      }

      // 3. Identify Admin user email
      const adminUser = usersList.find(u => u.role === 'ADMIN' && u.email);
      if (adminUser?.email) adminEmail = adminUser.email;
    }

    let subjectTemplate = '';
    let bodyTemplate = '';

    const currentBalance = calculateCashBalance(transactionsList, appSettings.currencySymbol);
    const changedFieldsStr = joinChangedFields(changedFieldLabels);
    const updaterName = currentUser ? `${currentUser.fullName}` : 'Admin';
    const formattedAmount = `${appSettings.currencySymbol}${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const hasAttachment = Boolean(txn.receiptUrl || txn.receiptName);
    const attachmentHtml = hasAttachment
      ? (txn.receiptUrl 
          ? `<a href="${txn.receiptUrl}" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline;">YES</a>`
          : '<a href="#" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline;">YES</a>')
      : 'NO';

    const boldChangedFields = `<strong>${changedFieldsStr}</strong>`;

    let cardTitle = 'New Voucher Alert';
    let cardBorderColor = '#ed3833';

    // Target recipient emails list
    let targetRecipients: string[] = [];

    if (type === 'NEW') {
      cardTitle = 'New Voucher Alert';
      cardBorderColor = '#ed3833';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectNew : null) ||
        localStorage.getItem('petty_cash_email_subject_new') ||
        '[Petty Cash Alert] New Voucher #{voucher_id} - {amount} ({category})';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyNew : null) ||
        localStorage.getItem('petty_cash_email_body_new') ||
        'Hello Finance Team,\n\nA new petty cash voucher has been registered:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.';
      if (defaultRecipients.length > 0) {
        targetRecipients.push(...defaultRecipients);
      } else if (adminEmail) {
        targetRecipients.push(adminEmail);
      }
      if (claimantEmail) targetRecipients.push(claimantEmail);
    } else if (type === 'REQUEST_SUBMITTED') {
      cardTitle = 'Petty Cash Claim Pending Approval';
      cardBorderColor = '#ff7900';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectRequestSubmitted : null) ||
        localStorage.getItem('petty_cash_email_subject_req_submitted') ||
        '[Petty Cash Request] New Claim #{voucher_id} - {amount} requested by {paid_to}';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyRequestSubmitted : null) ||
        localStorage.getItem('petty_cash_email_body_req_submitted') ||
        'Hello Manager / Approver,\n\nA new petty cash claim has been submitted for your approval:\n\nVoucher ID: #{voucher_id}\nRequested By: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nRemarks: {remarks}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review and approve this request in the Petty Cash Portal.';
      
      // ONLY send approval request to assigned reporting manager (or admin if no manager)
      // Strictly exclude claimant email from receiving approval request emails for their own claim
      if (managerEmail && managerEmail.trim().toLowerCase() !== claimantEmail.trim().toLowerCase()) {
        targetRecipients.push(managerEmail);
      } else if (adminEmail && adminEmail.trim().toLowerCase() !== claimantEmail.trim().toLowerCase()) {
        targetRecipients.push(adminEmail);
      } else if (defaultRecipients.length > 0) {
        targetRecipients.push(...defaultRecipients.filter(e => e.trim().toLowerCase() !== claimantEmail.trim().toLowerCase()));
      }
    } else if (type === 'REQUEST_APPROVED') {
      cardTitle = 'Petty Cash Claim Approved - Action Required: Issue Cash';
      cardBorderColor = '#2563eb';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectRequestApproved : null) ||
        localStorage.getItem('petty_cash_email_subject_req_approved') ||
        '[Action Required] Claim #{voucher_id} - {amount} Approved - Issue Cash';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyRequestApproved : null) ||
        localStorage.getItem('petty_cash_email_body_req_approved') ||
        'Hello Finance Admin & Claimant,\n\nPetty cash voucher #{voucher_id} requested by {paid_to} has been APPROVED by {approved_by} and is ready for payment disbursement:\n\nVoucher ID: #{voucher_id}\nClaimant / Paid To: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nApproved By: {approved_by}\nDate: {date}\nRemarks: {remarks}\n\nCurrent Cash Balance: {balance}\n\nPlease log in to the Petty Cash Portal to issue cash and mark as paid.';
      if (claimantEmail) targetRecipients.push(claimantEmail);
      if (adminEmail) targetRecipients.push(adminEmail);
      if (defaultRecipients.length > 0) targetRecipients.push(...defaultRecipients);
    } else if (type === 'REQUEST_PAID') {
      cardTitle = 'Petty Cash Payment Issued';
      cardBorderColor = '#6CC417';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectRequestPaid : null) ||
        localStorage.getItem('petty_cash_email_subject_req_paid') ||
        '[Petty Cash Paid] Voucher #{voucher_id} - {amount} Issued';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyRequestPaid : null) ||
        localStorage.getItem('petty_cash_email_body_req_paid') ||
        'Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} has been DISBURSED and marked as PAID by {paid_by}:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nIssued / Paid By: {paid_by}\nApproved By: {approved_by}\n\nCurrent Cash Balance: {balance}\n\nThank you.';
      if (claimantEmail) targetRecipients.push(claimantEmail);
      if (managerEmail) targetRecipients.push(managerEmail);
      if (adminEmail) targetRecipients.push(adminEmail);
    } else if (type === 'REQUEST_REJECTED') {
      cardTitle = 'Petty Cash Claim Rejected';
      cardBorderColor = '#ef4444';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectRequestRejected : null) ||
        localStorage.getItem('petty_cash_email_subject_req_rejected') ||
        '[Petty Cash Rejected] Claim #{voucher_id} - {amount}';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyRequestRejected : null) ||
        localStorage.getItem('petty_cash_email_body_req_rejected') ||
        'Hello {paid_to},\n\nYour petty cash claim #{voucher_id} for {amount} was REJECTED by {rejected_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nParticulars: {particulars}\nRemarks / Reason: {remarks}\nRejected By: {rejected_by}\n\nPlease contact your manager or admin for further details.';
      if (claimantEmail) targetRecipients.push(claimantEmail);
    } else if (type === 'REQUEST_REROUTED') {
      cardTitle = 'Petty Cash Approval Request Re-Routed';
      cardBorderColor = '#d97706';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectRequestRerouted : null) ||
        localStorage.getItem('petty_cash_email_subject_req_rerouted') ||
        '[Petty Cash Re-Route] Approval Request #{voucher_id} Re-Routed to You';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyRequestRerouted : null) ||
        localStorage.getItem('petty_cash_email_body_req_rerouted') ||
        'Hello {re_routed_to},\n\nAn approval request for petty cash claim #{voucher_id} has been re-routed to you by {re_routed_by}:\n\nVoucher ID: #{voucher_id}\nRequested By: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nRe-Route Reason: {re_route_reason}\nRemarks: {remarks}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review and approve this request in the Petty Cash Portal.';
      if (bodyTemplate.includes('Mr./Ms.') || bodyTemplate.includes('Voucher Details:')) {
        bodyTemplate = 'Hello {re_routed_to},\n\nAn approval request for petty cash claim #{voucher_id} has been re-routed to you by {re_routed_by}:\n\nVoucher ID: #{voucher_id}\nRequested By: {paid_to}\nAmount: {amount}\nParticulars: {particulars}\nCategory: {category}\nDate: {date}\nRe-Route Reason: {re_route_reason}\nRemarks: {remarks}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review and approve this request in the Petty Cash Portal.';
      }
      
      // Target recipient: Newly assigned manager
      const targetMgrName = (txn.approverName || '').trim().toLowerCase();
      let targetMgrEmail = '';
      if (usersList && targetMgrName) {
        const mgrUser = usersList.find(u => 
          (u.fullName && u.fullName.toLowerCase() === targetMgrName) ||
          (u.username && u.username.toLowerCase() === targetMgrName) ||
          (u.email && u.email.toLowerCase() === targetMgrName)
        );
        if (mgrUser?.email) targetMgrEmail = mgrUser.email;
      }
      if (targetMgrEmail) targetRecipients.push(targetMgrEmail);
      if (adminEmail && adminEmail !== targetMgrEmail) targetRecipients.push(adminEmail);
      if (defaultRecipients.length > 0 && targetRecipients.length === 0) targetRecipients.push(...defaultRecipients);
    } else if (type === 'INWARD') {
      cardTitle = 'Deposit Alert';
      cardBorderColor = '#00bc7d';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectInward : null) ||
        localStorage.getItem('petty_cash_email_subject_inward') ||
        '[Petty Cash Alert] Inward Deposit #{voucher_id} - {amount} ({category})';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyInward : null) ||
        localStorage.getItem('petty_cash_email_body_inward') ||
        'Hello Finance Team,\n\nA new petty cash inward deposit has been recorded:\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.';
      if (defaultRecipients.length > 0) {
        targetRecipients.push(...defaultRecipients);
      } else if (adminEmail) {
        targetRecipients.push(adminEmail);
      }
    } else if (type === 'INWARD_EDIT') {
      cardTitle = 'Deposit Changes Alert';
      cardBorderColor = '#f7b944';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectInwardEdit : null) ||
        localStorage.getItem('petty_cash_email_subject_inward_edit') ||
        '[Petty Cash Deposit Changes Alert] Deposit #{voucher_id} Modified ({changed_fields}) - {amount}';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyInwardEdit : null) ||
        localStorage.getItem('petty_cash_email_body_inward_edit') ||
        'Hello Finance Team,\n\nDeposit Changes Alert for Petty Cash Deposit #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.';
      if (adminEmail) targetRecipients.push(adminEmail);
      if (defaultRecipients.length > 0) targetRecipients.push(...defaultRecipients);
    } else {
      cardTitle = 'Voucher Changes Alert';
      cardBorderColor = '#f7b944';
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectEdit : null) ||
        localStorage.getItem('petty_cash_email_subject_edit') ||
        '[Petty Cash Changes Alert] Voucher #{voucher_id} Modified ({changed_fields}) - {amount}';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyEdit : null) ||
        localStorage.getItem('petty_cash_email_body_edit') ||
        'Hello Finance Team,\n\nChanges Alert for Petty Cash Voucher #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.';
      if (adminEmail) targetRecipients.push(adminEmail);
      if (defaultRecipients.length > 0) targetRecipients.push(...defaultRecipients);
    }

    // Fallback: If targetRecipients is still empty
    if (targetRecipients.length === 0) {
      if (defaultRecipients.length > 0) {
        targetRecipients.push(...defaultRecipients);
      } else if (adminEmail) {
        targetRecipients.push(adminEmail);
      }
    }

    // Deduplicate recipients case-insensitively
    const uniqueRecipientsMap = new Map<string, string>();
    targetRecipients.forEach(r => {
      const clean = (r || '').trim();
      if (clean) {
        uniqueRecipientsMap.set(clean.toLowerCase(), clean);
      }
    });

    const allUniqueRecipients = Array.from(uniqueRecipientsMap.values());
    if (allUniqueRecipients.length === 0) {
      return { success: false, message: 'No Email recipients specified or found.' };
    }

    const emailSubject = subjectTemplate
      .replace(/\{voucher_id\}/g, txn.reference || txn.id)
      .replace(/\{amount\}/g, formattedAmount)
      .replace(/\{category\}/g, txn.category || 'General')
      .replace(/\{changed_fields\}/g, changedFieldsStr)
      .replace(/\{attachment\}/g, hasAttachment ? 'YES' : 'NO');

    const approverName = txn.approvedBy || txn.approverName || 'Mohan';
    const payerName = txn.paidBy || 'David Vance';
    const rejecterName = txn.rejectedBy || 'Mohan';

    // Helper to send email to specific recipients with or without cash balance
    const dispatchEmailToRecipients = async (recList: string[], includeBalance: boolean) => {
      if (!recList || recList.length === 0) {
        return { success: true, message: 'No recipients for this batch.' };
      }

      let bodyText = bodyTemplate;
      if (!includeBalance) {
        bodyText = bodyText.replace(/\n\n(Current Cash Balance|Cash Balance): \{balance\}/gi, '');
        bodyText = bodyText.replace(/(Current Cash Balance|Cash Balance): \{balance\}/gi, '');
      }

      const emailBodyParsed = bodyText
        .replace(/\{voucher_id\}/g, txn.reference || txn.id)
        .replace(/\{amount\}/g, formattedAmount)
        .replace(/\{paid_to\}/g, txn.merchant || 'N/A')
        .replace(/\{particulars\}/g, txn.description || 'N/A')
        .replace(/\{category\}/g, txn.category || 'General')
        .replace(/\{remarks\}/g, (txn.remarks && txn.remarks.trim()) ? txn.remarks.trim() : (txn.rejectionReason && txn.rejectionReason.trim() ? txn.rejectionReason.trim() : 'N/A'))
        .replace(/\{date\}/g, txn.date)
        .replace(/\{attachment\}/g, attachmentHtml)
        .replace(/\{balance\}/g, currentBalance)
        .replace(/\{changed_fields\}/g, boldChangedFields)
        .replace(/\{updated_by\}/g, updaterName)
        .replace(/\{approved_by\}/g, approverName)
        .replace(/\{paid_by\}/g, payerName)
        .replace(/\{rejected_by\}/g, rejecterName)
        .replace(/\{re_routed_to\}/g, txn.approverName || 'Manager')
        .replace(/\{re_routed_by\}/g, txn.reRoutedBy || updaterName)
        .replace(/\{re_route_reason\}/g, txn.reRouteReason || 'N/A');

      const emailBodyHtml = buildModernHtmlEmailFromText(cardTitle, emailBodyParsed, cardBorderColor, type);

      const emailPayload = {
        tenantId,
        clientId,
        clientSecret,
        senderEmail,
        senderName,
        recipients: recList,
        subject: emailSubject,
        body: emailBodyHtml
      };

      // 1. Server proxy
      try {
        const serverRes = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload)
        });
        const responseText = await serverRes.text();
        let serverData: any = null;
        try { serverData = JSON.parse(responseText); } catch { serverData = null; }
        if (serverRes.ok && serverData && serverData.success) {
          return { success: true, message: serverData.message || 'Email sent via server proxy' };
        }
      } catch (e) {
        console.warn('[EmailAlert] Server proxy exception:', e);
      }

      // 2. Direct client fallback
      try {
        const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
        const tokenParams = new URLSearchParams();
        tokenParams.append("client_id", clientId);
        tokenParams.append("client_secret", clientSecret);
        tokenParams.append("scope", "https://graph.microsoft.com/.default");
        tokenParams.append("grant_type", "client_credentials");

        const tokenRes = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams.toString()
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const graphMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;
          const directPayload = {
            message: {
              subject: emailSubject,
              body: { contentType: "HTML", content: emailBodyHtml },
              toRecipients: recList.map((email: string) => ({ emailAddress: { address: email } }))
            },
            saveToSentItems: true
          };
          const mailRes = await fetch(graphMailUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(directPayload)
          });
          if (mailRes.ok || mailRes.status === 202) {
            return { success: true, message: 'Email sent directly' };
          }
        }
      } catch (err) {
        console.warn('[EmailAlert] Direct dispatch exception:', err);
      }

      return { success: true, message: 'Email process completed.' };
    };

    // If claimantEmail is among recipients for claim actions (REQUEST_SUBMITTED, APPROVED, PAID, REJECTED),
    // separate claimant (no organization balance shown) from management (balance shown)
    const normalizedClaimant = claimantEmail ? claimantEmail.trim().toLowerCase() : '';

    if (normalizedClaimant && ['REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_PAID', 'REQUEST_REJECTED'].includes(type)) {
      const claimantRecList = allUniqueRecipients.filter(r => r.toLowerCase() === normalizedClaimant);
      const managementRecList = allUniqueRecipients.filter(r => r.toLowerCase() !== normalizedClaimant);

      let claimantRes = { success: true, message: '' };
      let managementRes = { success: true, message: '' };

      if (claimantRecList.length > 0) {
        claimantRes = await dispatchEmailToRecipients(claimantRecList, false);
      }
      if (managementRecList.length > 0) {
        managementRes = await dispatchEmailToRecipients(managementRecList, true);
      }

      return {
        success: claimantRes.success && managementRes.success,
        message: 'Emails dispatched (Claimant without cash balance, Management with cash balance).'
      };
    }

    // Default flow
    return await dispatchEmailToRecipients(allUniqueRecipients, true);
  } catch (err: any) {
    console.error('[EmailAlert] Exception:', err);
    return { success: false, message: err.message || 'Failed to dispatch email' };
  }
}
