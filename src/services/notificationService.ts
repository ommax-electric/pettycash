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
  type: 'NEW' | 'EDIT' | 'INWARD' | 'INWARD_EDIT',
  txn: Transaction,
  currentUser: User | null,
  transactionsList: Transaction[],
  appSettings: AppSettings,
  changedFieldLabels: string[] = [],
  integrationSettings?: IntegrationSettings | null
): Promise<{ success: boolean; message: string }> {
  try {
    const isSmsEnabled = integrationSettings 
      ? integrationSettings.smsEnabled 
      : (localStorage.getItem('petty_cash_sms_enabled') !== 'false');
    if (!isSmsEnabled) {
      return { success: false, message: 'SMS Gate is currently disabled in settings.' };
    }

    let gatewayUrl = (integrationSettings
      ? integrationSettings.smsGatewayUrl
      : (localStorage.getItem('petty_cash_sms_url') || 'https://api.sms-gate.app/3rdparty/v1/message')).trim();
    if (!gatewayUrl || gatewayUrl.includes('mobile/v1') || gatewayUrl === 'https://api.sms-gate.app' || gatewayUrl === 'https://api.sms-gate.app/') {
      gatewayUrl = 'https://api.sms-gate.app/3rdparty/v1/message';
    }

    const username = (integrationSettings
      ? integrationSettings.smsUsername
      : (localStorage.getItem('petty_cash_sms_username') || 'WRJ0SQ')).trim();
    const password = (integrationSettings
      ? integrationSettings.smsPassword
      : (localStorage.getItem('petty_cash_sms_password') || 'sdoaxryxfmy5qh')).trim();
    const rawRecipients = integrationSettings
      ? integrationSettings.smsRecipients
      : (localStorage.getItem('petty_cash_sms_recipients') || '+919025976761');

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
      template = (integrationSettings ? integrationSettings.smsTemplateNew : null) ||
        localStorage.getItem('petty_cash_sms_template_new') ||
        'New Petty Cash Voucher Alert: #{voucher_id} for {amount} paid to {paid_to} ({category}). Cash balance: {balance}.';
    } else if (type === 'INWARD') {
      template = (integrationSettings ? integrationSettings.smsTemplateInward : null) ||
        localStorage.getItem('petty_cash_sms_template_inward') ||
        'Inward Cash Deposit Alert: #{voucher_id} for {amount} received from {paid_to} ({category}). Cash balance: {balance}.';
    } else if (type === 'INWARD_EDIT') {
      template = (integrationSettings ? integrationSettings.smsTemplateInwardEdit : null) ||
        localStorage.getItem('petty_cash_sms_template_inward_edit') ||
        'Deposit Changes Alert for Cash Deposit #{voucher_id}: {changed_fields} changed by {updated_by}. Please review. Balance: {balance}.';
    } else {
      template = (integrationSettings ? integrationSettings.smsTemplateEdit : null) ||
        localStorage.getItem('petty_cash_sms_template_edit') ||
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

    // 1. Try Node.js Express Server Proxy /api/send-sms
    try {
      const serverRes = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = await serverRes.text();
      let serverData: any = null;
      try {
        serverData = JSON.parse(responseText);
      } catch {
        serverData = null;
      }

      if (serverRes.ok && serverData && serverData.success) {
        console.log('[SMSGate] Server proxy dispatch successful:', serverData);
        return { success: true, message: 'SMS Alert dispatched successfully via SMSGate Server Proxy!' };
      } else if (serverData && serverData.error) {
        console.warn('[SMSGate] Server proxy returned error response:', serverData);
        return { success: false, message: serverData.error || 'Server proxy error' };
      }
    } catch (proxyError: any) {
      console.warn('[SMSGate] Node server proxy network exception:', proxyError);
    }

    // 2. Try PHP Endpoint Proxy /api/send-sms.php (for PHP / cPanel shared hosting)
    try {
      const phpRes = await fetch('/api/send-sms.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const phpText = await phpRes.text();
      let phpData: any = null;
      try {
        phpData = JSON.parse(phpText);
      } catch {
        phpData = null;
      }

      if (phpRes.ok && phpData && phpData.success) {
        console.log('[SMSGate] PHP endpoint proxy dispatch successful:', phpData);
        return { success: true, message: 'SMS Alert dispatched successfully via PHP SMS Proxy!' };
      }
    } catch (phpErr) {
      console.warn('[SMSGate] PHP proxy exception:', phpErr);
    }

    // 3. Fallback: Direct Browser Client-Side Dispatch to SMS Gate API
    console.log('[SMSGate] Server proxies unavailable. Executing direct browser client dispatch...');
    try {
      const authString = btoa(`${username}:${password}`);
      const directRes = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify({
          phoneNumbers: recipients,
          message: messageText
        })
      });

      const directText = await directRes.text();
      let directData: any = null;
      try {
        directData = JSON.parse(directText);
      } catch {
        directData = { raw: directText };
      }

      if (directRes.ok) {
        return { success: true, message: 'SMS Alert dispatched successfully via SMS Gate API!' };
      } else {
        const errDetail = directData.error || directData.message || directText || `HTTP ${directRes.status}`;
        return { success: false, message: `SMS Gate API Error: ${errDetail}` };
      }
    } catch (directErr: any) {
      console.error('[SMSGate] Direct client dispatch exception:', directErr);
      return { success: false, message: `Failed to dispatch SMS: ${directErr.message || 'Network connection failed'}` };
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
  type: 'NEW' | 'EDIT' | 'INWARD' | 'INWARD_EDIT',
  txn: Transaction,
  currentUser: User | null,
  transactionsList: Transaction[],
  appSettings: AppSettings,
  changedFieldLabels: string[] = [],
  integrationSettings?: IntegrationSettings | null
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
    const recipients = rawRecipients.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      return { success: false, message: 'No Email recipients specified.' };
    }

    const tenantId = (integrationSettings
      ? integrationSettings.msTenantId
      : (localStorage.getItem('ms_graph_tenant_id') || '')).trim();
    const clientId = (integrationSettings
      ? integrationSettings.msClientId
      : (localStorage.getItem('ms_graph_client_id') || '')).trim();
    const clientSecret = (integrationSettings
      ? integrationSettings.msClientSecret
      : (localStorage.getItem('ms_graph_client_secret') || '')).trim();
    const senderEmail = (integrationSettings
      ? integrationSettings.msSenderEmail
      : (localStorage.getItem('ms_graph_sender_email') || 'mail@ommaxelectric.com')).trim();
    const senderName = (integrationSettings
      ? integrationSettings.msSenderName
      : (localStorage.getItem('ms_graph_sender_name') || 'Petty Cash Desk')).trim();

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

    let cardTitle = 'New Voucher Alert';
    let cardBorderColor = '#ed3833';

    if (type === 'NEW') {
      cardTitle = 'New Voucher Alert';
      cardBorderColor = '#ed3833'; // Requirement: New Voucher Alert #ed3833
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectNew : null) ||
        localStorage.getItem('petty_cash_email_subject_new') ||
        '[Petty Cash Alert] New Voucher #{voucher_id} - {amount} ({category})';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyNew : null) ||
        localStorage.getItem('petty_cash_email_body_new') ||
        'Hello Finance Team,\n\nA new petty cash voucher has been registered:\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.';
    } else if (type === 'INWARD') {
      cardTitle = 'Deposit Alert';
      cardBorderColor = '#00bc7d'; // Requirement: New Deposit Alert #00bc7d
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectInward : null) ||
        localStorage.getItem('petty_cash_email_subject_inward') ||
        '[Petty Cash Alert] Inward Deposit #{voucher_id} - {amount} ({category})';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyInward : null) ||
        localStorage.getItem('petty_cash_email_body_inward') ||
        'Hello Finance Team,\n\nA new petty cash inward deposit has been recorded:\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nThis is an automated alert from your Corporate Petty Cash Register.';
    } else if (type === 'INWARD_EDIT') {
      cardTitle = 'Deposit Changes Alert';
      cardBorderColor = '#f7b944'; // Requirement: Both Voucher and Deposit change alert #f7b944
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectInwardEdit : null) ||
        localStorage.getItem('petty_cash_email_subject_inward_edit') ||
        '[Petty Cash Deposit Changes Alert] Deposit #{voucher_id} Modified ({changed_fields}) - {amount}';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyInwardEdit : null) ||
        localStorage.getItem('petty_cash_email_body_inward_edit') ||
        'Hello Finance Team,\n\nDeposit Changes Alert for Petty Cash Deposit #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher/Ref ID: #{voucher_id}\nAmount: {amount}\nReceived From / Source: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.';
    } else {
      cardTitle = 'Voucher Changes Alert';
      cardBorderColor = '#f7b944'; // Requirement: Both Voucher and Deposit change alert #f7b944
      subjectTemplate = (integrationSettings ? integrationSettings.emailSubjectEdit : null) ||
        localStorage.getItem('petty_cash_email_subject_edit') ||
        '[Petty Cash Changes Alert] Voucher #{voucher_id} Modified ({changed_fields}) - {amount}';
      bodyTemplate = (integrationSettings ? integrationSettings.emailBodyEdit : null) ||
        localStorage.getItem('petty_cash_email_body_edit') ||
        'Hello Finance Team,\n\nChanges Alert for Petty Cash Voucher #{voucher_id}:\n{changed_fields} changed by {updated_by}.\n\nVoucher ID: #{voucher_id}\nAmount: {amount}\nPaid To: {paid_to}\nParticulars: {particulars}\nCategory: {category}\nRemarks: {remarks}\nDate: {date}\nAttachment: {attachment}\n\nCurrent Cash Balance: {balance}\n\nPlease review it in the system register.';
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
      .replace(/\{particulars\}/g, txn.description || 'N/A')
      .replace(/\{category\}/g, txn.category || 'General')
      .replace(/\{remarks\}/g, txn.remarks || 'N/A')
      .replace(/\{date\}/g, txn.date)
      .replace(/\{attachment\}/g, attachmentHtml)
      .replace(/\{balance\}/g, currentBalance)
      .replace(/\{changed_fields\}/g, boldChangedFields)
      .replace(/\{updated_by\}/g, updaterName);

    const emailBodyHtml = buildModernHtmlEmailFromText(cardTitle, emailBodyParsed, cardBorderColor);

    console.log('[EmailAlert] Dispatching Email Alert via Microsoft Graph Proxy:', {
      tenantId,
      clientId,
      senderEmail,
      recipients,
      emailSubject
    });

    const emailPayload = {
      tenantId,
      clientId,
      clientSecret,
      senderEmail,
      senderName,
      recipients,
      subject: emailSubject,
      body: emailBodyHtml
    };

    // 1. Try Node.js Express Server Proxy /api/send-email
    try {
      const serverRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      const responseText = await serverRes.text();
      let serverData: any = null;
      try {
        serverData = JSON.parse(responseText);
      } catch {
        serverData = null; // HTML or non-JSON returned on static hosts
      }

      if (serverRes.ok && serverData && serverData.success) {
        return { success: true, message: serverData.message || 'Email alert dispatched successfully via Microsoft Graph API!' };
      } else if (serverData && serverData.error) {
        console.warn('[EmailAlert] Node proxy returned error message:', serverData);
        // If it's an explicit JSON error from Microsoft Graph via the server, return it directly
        if (serverRes.status !== 404 && serverRes.status !== 502) {
          return { success: false, message: serverData.error || 'Email proxy error' };
        }
      }
    } catch (proxyError: any) {
      console.warn('[EmailAlert] Node proxy exception:', proxyError);
    }

    // 2. Try PHP Endpoint Proxy /api/send-email.php (for PHP / cPanel shared hosting)
    try {
      const phpRes = await fetch('/api/send-email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      const phpText = await phpRes.text();
      let phpData: any = null;
      try {
        phpData = JSON.parse(phpText);
      } catch {
        phpData = null;
      }

      if (phpRes.ok && phpData && phpData.success) {
        return { success: true, message: phpData.message || 'Email alert dispatched successfully via PHP Microsoft Graph Proxy!' };
      } else if (phpData && phpData.error) {
        console.warn('[EmailAlert] PHP proxy returned error message:', phpData);
        if (phpRes.status !== 404 && phpRes.status !== 502) {
          return { success: false, message: phpData.error || 'PHP proxy error' };
        }
      }
    } catch (phpErr) {
      console.warn('[EmailAlert] PHP proxy exception:', phpErr);
    }

    // 3. Fallback: Direct Client Browser Dispatch to Microsoft Graph API
    console.log('[EmailAlert] Server proxies unavailable. Attempting direct browser client dispatch via MS Graph API...');

    try {
      // Step A: Acquire token directly from browser
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

      const tokenText = await tokenRes.text();
      let tokenData: any = null;
      try { tokenData = JSON.parse(tokenText); } catch { tokenData = { raw: tokenText }; }

      if (!tokenRes.ok || !tokenData.access_token) {
        const errorMsg = tokenData.error_description || tokenData.error || `Microsoft OAuth authentication failed (${tokenRes.status})`;
        return { success: false, message: `Microsoft Graph Auth Error: ${errorMsg}` };
      }

      // Step B: Send mail via Graph API
      const graphMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;
      const directPayload = {
        message: {
          subject: emailSubject,
          body: {
            contentType: "HTML",
            content: emailBodyHtml
          },
          toRecipients: recipients.map((email: string) => ({
            emailAddress: { address: email }
          }))
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
        return { success: true, message: `Email alert successfully sent via Microsoft Graph API to ${recipients.join(", ")}!` };
      } else {
        const mailErrText = await mailRes.text();
        let mailErrJson: any = null;
        try { mailErrJson = JSON.parse(mailErrText); } catch { mailErrJson = { raw: mailErrText }; }
        return {
          success: false,
          message: mailErrJson.error?.message || `Microsoft Graph API returned HTTP ${mailRes.status}`
        };
      }
    } catch (directError: any) {
      console.error('[EmailAlert] Direct client dispatch exception:', directError);
      return { success: false, message: `Failed to dispatch email: ${directError.message || 'Network error'}` };
    }
  } catch (err: any) {
    console.error('[EmailAlert] Exception:', err);
    return { success: false, message: err.message || 'Failed to dispatch email' };
  }
}
