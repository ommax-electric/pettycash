import { AppSettings, Transaction, User } from '../types';
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
  const approvedInflow = transactions
    .filter(t => t.type === 'IN' && t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.amount, 0);

  const approvedOutflowCash = transactions
    .filter(t => t.type === 'OUT' && t.status === 'APPROVED' && t.paymentType !== 'ONLINE')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = approvedInflow - approvedOutflowCash;
  return `${currencySymbol}${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Dispatches SMS notification via Self-Hosted Android SMSGate HTTP Endpoint
 */
export async function sendSmsNotification(
  type: 'NEW' | 'EDIT',
  txn: Transaction,
  currentUser: User | null,
  transactionsList: Transaction[],
  appSettings: AppSettings,
  changedFieldLabels: string[] = []
): Promise<{ success: boolean; message: string }> {
  try {
    const isSmsEnabled = localStorage.getItem('petty_cash_sms_enabled') !== 'false'; // Default to enabled
    if (!isSmsEnabled) {
      return { success: false, message: 'SMS Gate is currently disabled in settings.' };
    }

    let gatewayUrl = (localStorage.getItem('petty_cash_sms_url') || 'https://api.sms-gate.app/3rdparty/v1/message').trim();
    if (!gatewayUrl || gatewayUrl.includes('mobile/v1') || gatewayUrl === 'https://api.sms-gate.app' || gatewayUrl === 'https://api.sms-gate.app/') {
      gatewayUrl = 'https://api.sms-gate.app/3rdparty/v1/message';
    }

    const username = (localStorage.getItem('petty_cash_sms_username') || 'WRJ0SQ').trim();
    const password = (localStorage.getItem('petty_cash_sms_password') || 'sdoaxryxfmy5qh').trim();
    const rawRecipients = localStorage.getItem('petty_cash_sms_recipients') || '+919025976761';

    const recipients = rawRecipients
      .split(',')
      .map(r => formatPhoneNumber(r))
      .filter(Boolean);

    if (recipients.length === 0) {
      return { success: false, message: 'No valid recipient phone numbers specified.' };
    }

    // Determine message template
    let template = '';
    if (type === 'NEW') {
      template = localStorage.getItem('petty_cash_sms_template_new') ||
        'New Petty Cash Voucher Alert: #{voucher_id} for {amount} paid to {paid_to} ({category}). Cash balance: {balance}.';
    } else {
      template = localStorage.getItem('petty_cash_sms_template_edit') ||
        'Changes Alert for Petty Cash Voucher #{voucher_id}: {changed_fields} changed by {updated_by}. Please review. Balance: {balance}.';
    }

    const currentBalance = calculateCashBalance(transactionsList, appSettings.currencySymbol);
    const changedFieldsStr = joinChangedFields(changedFieldLabels);
    const updaterName = currentUser ? `${currentUser.fullName}` : 'Admin';

    // Format text - replace {changed_fields} or slash-delimited placeholder if present
    let messageText = template
      .replace(/\{voucher_id\}/g, txn.reference || txn.id)
      .replace(/\{amount\}/g, `${appSettings.currencySymbol}${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      .replace(/\{paid_to\}/g, txn.merchant || 'N/A')
      .replace(/\{category\}/g, txn.category || 'General')
      .replace(/\{remarks\}/g, txn.remarks || txn.description || 'N/A')
      .replace(/\{date\}/g, txn.date)
      .replace(/\{balance\}/g, currentBalance)
      .replace(/Name\/amount\/paid to\/category\/date\/attachment\/remarks\/particulars/gi, changedFieldsStr)
      .replace(/\{changed_fields\}/g, changedFieldsStr)
      .replace(/\{updated_by\}/g, updaterName);

    const payload = {
      url: gatewayUrl,
      username: username,
      password: password,
      phoneNumbers: recipients,
      message: messageText
    };

    console.log('[SMSGate] Dispatching SMS Alert via Server Proxy /api/send-sms:', payload);

    // Primary Dispatch: Server Proxy endpoint (handles Basic Auth & bypasses browser CORS)
    try {
      const serverRes = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const serverData = await serverRes.json();
      if (serverRes.ok && serverData.success) {
        console.log('[SMSGate] Server proxy dispatch successful:', serverData);
        return { success: true, message: 'SMS Alert dispatched successfully via SMSGate Server Proxy!' };
      } else {
        const errorMsg = serverData.error || (serverData.details && serverData.details.message) || `Server proxy returned error status ${serverRes.status}`;
        console.warn('[SMSGate] Server proxy returned error response:', serverData);
        return { success: false, message: errorMsg };
      }
    } catch (proxyError: any) {
      console.warn('[SMSGate] Server proxy network exception:', proxyError);
      return { success: false, message: `Proxy connection error: ${proxyError.message || 'Failed to reach backend server'}` };
    }
  } catch (err: any) {
    console.error('[SMSGate] Dispatch exception:', err);
    return { success: false, message: err.message || 'Failed to dispatch SMS' };
  }
}

/**
 * Dispatches Corporate Email notification via configured SMTP / API endpoint
 */
export async function sendEmailNotification(
  type: 'NEW' | 'EDIT',
  txn: Transaction,
  currentUser: User | null,
  transactionsList: Transaction[],
  appSettings: AppSettings,
  changedFieldLabels: string[] = []
): Promise<{ success: boolean; message: string }> {
  try {
    const isEmailEnabled = localStorage.getItem('petty_cash_email_enabled') === 'true';
    if (!isEmailEnabled) {
      return { success: false, message: 'Corporate Email alerts disabled in settings.' };
    }

    const rawRecipients = localStorage.getItem('petty_cash_email_recipients') || '';
    const recipients = rawRecipients.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      return { success: false, message: 'No Email recipients specified.' };
    }

    const tenantId = (localStorage.getItem('ms_graph_tenant_id') || '').trim();
    const clientId = (localStorage.getItem('ms_graph_client_id') || '').trim();
    const clientSecret = (localStorage.getItem('ms_graph_client_secret') || '').trim();
    const senderEmail = (localStorage.getItem('ms_graph_sender_email') || 'mail@ommaxelectric.com').trim();
    const senderName = (localStorage.getItem('ms_graph_sender_name') || 'Petty Cash Desk').trim();

    if (!tenantId || !clientId || !clientSecret) {
      return {
        success: false,
        message: 'Microsoft Graph API configuration incomplete. Please provide Tenant ID, Client ID, and Client Secret in Admin Settings.'
      };
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

    if (type === 'NEW') {
      subjectTemplate = localStorage.getItem('petty_cash_email_subject_new') ||
        '[Petty Cash Alert] New Voucher #{voucher_id} - {amount} ({category})';
      bodyTemplate = localStorage.getItem('petty_cash_email_body_new') ||
        'Hello Finance Team,\n\nA new petty cash voucher has been registered:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.';
    } else {
      subjectTemplate = localStorage.getItem('petty_cash_email_subject_edit') ||
        '[Petty Cash Changes Alert] Voucher #{voucher_id} Modified ({changed_fields}) - {amount}';
      bodyTemplate = localStorage.getItem('petty_cash_email_body_edit') ||
        'Hello Finance Team,\n\nChanges Alert for Petty Cash Voucher #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.';
    }

    const emailSubject = subjectTemplate
      .replace(/\{voucher_id\}/g, txn.reference || txn.id)
      .replace(/\{amount\}/g, formattedAmount)
      .replace(/\{category\}/g, txn.category || 'General')
      .replace(/\{changed_fields\}/g, changedFieldsStr)
      .replace(/\{attachment\}/g, hasAttachment ? 'YES' : 'NO');

    const emailBodyParsed = bodyTemplate
      .replace(/\{voucher_id\}/g, txn.reference || txn.id)
      .replace(/\{amount\}/g, formattedAmount)
      .replace(/\{paid_to\}/g, txn.merchant || 'N/A')
      .replace(/\{category\}/g, txn.category || 'General')
      .replace(/\{remarks\}/g, txn.remarks || txn.description || 'N/A')
      .replace(/\{date\}/g, txn.date)
      .replace(/\{attachment\}/g, attachmentHtml)
      .replace(/\{balance\}/g, currentBalance)
      .replace(/\{changed_fields\}/g, boldChangedFields)
      .replace(/\{updated_by\}/g, updaterName);

    const cardTitle = type === 'NEW' ? 'New Voucher Alert' : 'Voucher Changes Alert';
    const emailBodyHtml = buildModernHtmlEmailFromText(cardTitle, emailBodyParsed);

    console.log('[EmailAlert] Dispatching Email Alert via Microsoft Graph Proxy:', {
      tenantId,
      clientId,
      senderEmail,
      recipients,
      emailSubject
    });

    try {
      const serverRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          clientId,
          clientSecret,
          senderEmail,
          senderName,
          recipients,
          subject: emailSubject,
          body: emailBodyHtml
        })
      });

      const serverData = await serverRes.json();
      if (serverRes.ok && serverData.success) {
        return { success: true, message: serverData.message || 'Email alert dispatched successfully via Microsoft Graph API!' };
      } else {
        const errorMsg = serverData.error || (serverData.details && serverData.details.error_description) || `Server returned error status ${serverRes.status}`;
        return { success: false, message: errorMsg };
      }
    } catch (proxyError: any) {
      console.warn('[EmailAlert] Microsoft Graph proxy exception:', proxyError);
      return { success: false, message: `Proxy connection error: ${proxyError.message || 'Failed to reach backend server'}` };
    }
  } catch (err: any) {
    console.error('[EmailAlert] Exception:', err);
    return { success: false, message: err.message || 'Failed to dispatch email' };
  }
}
