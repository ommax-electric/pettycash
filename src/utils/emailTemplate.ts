/**
 * Utility to parse plain text email body templates into HTML & React preview components.
 * Automatically detects key-value detail blocks (e.g., "Amount: ₹3,500") and wraps them inside
 * a modern red left-bordered callout box, matching corporate administration email styles.
 */

export interface ParsedEmailBlock {
  type: 'paragraph' | 'callout' | 'balance' | 'signoff' | 'note';
  text?: string;
  lines?: { key: string; value: string; raw: string }[];
}

/**
 * Parses raw body text (with tags substituted) into structured blocks for rendering.
 */
export function parseBodyTextToBlocks(rawText: string): ParsedEmailBlock[] {
  if (!rawText) return [];

  const rawBlocks = rawText.split(/\n\s*\n/);
  const blocks: ParsedEmailBlock[] = [];

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    const lines = trimmedBlock.split('\n').map(l => l.trim()).filter(Boolean);

    // Check if lines look like key-value pairs (e.g. "Voucher ID: #VOUCHER-104")
    const keyValueLines = lines.map(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < line.length - 1) {
        return {
          key: line.substring(0, colonIdx).trim(),
          value: line.substring(colonIdx + 1).trim(),
          raw: line
        };
      }
      return null;
    });

    const isKeyValueBlock = lines.length > 0 && keyValueLines.every(kv => kv !== null);

    if (isKeyValueBlock) {
      const nonNullLines = keyValueLines.filter((kv): kv is { key: string; value: string; raw: string } => kv !== null);
      
      const detailsLines = nonNullLines.filter(l => !l.key.toLowerCase().includes('balance'));
      const balanceLines = nonNullLines.filter(l => l.key.toLowerCase().includes('balance'));

      if (detailsLines.length > 0) {
        blocks.push({
          type: 'callout',
          lines: detailsLines
        });
      }

      if (balanceLines.length > 0) {
        for (const bLine of balanceLines) {
          blocks.push({
            type: 'balance',
            lines: [bLine],
            text: bLine.raw
          });
        }
      }
    } else if (trimmedBlock.toLowerCase().startsWith('current cash balance:') || trimmedBlock.toLowerCase().startsWith('cash balance:')) {
      const colonIdx = trimmedBlock.indexOf(':');
      const keyStr = colonIdx > 0 ? trimmedBlock.substring(0, colonIdx).trim() : 'Current Cash Balance';
      const valStr = colonIdx > 0 ? trimmedBlock.substring(colonIdx + 1).trim() : trimmedBlock;
      blocks.push({
        type: 'balance',
        lines: [{ key: keyStr, value: valStr, raw: trimmedBlock }],
        text: trimmedBlock
      });
    } else if (trimmedBlock.toLowerCase().startsWith('thank') || trimmedBlock.toLowerCase().startsWith('regards')) {
      blocks.push({
        type: 'signoff',
        text: trimmedBlock
      });
    } else if (trimmedBlock.toLowerCase().startsWith('please ignore') || trimmedBlock.toLowerCase().startsWith('this is an automated')) {
      blocks.push({
        type: 'note',
        text: trimmedBlock
      });
    } else {
      blocks.push({
        type: 'paragraph',
        text: trimmedBlock
      });
    }
  }

  return blocks;
}

/**
 * Converts raw template text with tag placeholders into mock sample values for previewing.
 */
export function substituteSampleTags(
  templateText: string,
  currencySymbol: string = '₹',
  isEditMode: boolean = false
): string {
  if (!templateText) return '';

  return templateText
    .replace(/\{voucher_id\}/g, 'VOUCHER-104')
    .replace(/\{amount\}/g, `${currencySymbol}3,500.00`)
    .replace(/\{paid_to\}/g, 'Rahul Sharma')
    .replace(/\{particulars\}/g, 'A4 printer paper & stationary')
    .replace(/\{category\}/g, 'Office Supplies')
    .replace(/\{remarks\}/g, 'Invoice #INV-2026-902 attached')
    .replace(/\{date\}/g, '28-07-2026')
    .replace(/\{attachment\}/g, 'YES')
    .replace(/\{balance\}/g, `${currencySymbol}12,500.00`)
    .replace(/\{changed_fields\}/g, 'Amount and Category')
    .replace(/\{updated_by\}/g, 'Anita')
    .replace(/\{re_routed_to\}/g, 'Rajesh Sharma')
    .replace(/\{re_routed_by\}/g, 'Mohan Kumar')
    .replace(/\{re_route_reason\}/g, 'Exceeds branch limit authorization threshold');
}

/**
 * Builds modern HTML email markup with timeline tracking, 2-column data grid,
 * left-bordered details callouts, and balance summary matching corporate email design.
 */
export function buildModernHtmlEmailFromText(
  title: string,
  bodyText: string,
  accentColor: string = '#3b82f6',
  typeOrStatus?: string
): string {
  const blocks = parseBodyTextToBlocks(bodyText);

  let introParagraphsHtml = '';
  const gridLines: { key: string; value: string; raw: string }[] = [];
  const detailLines: { key: string; value: string; raw: string }[] = [];
  let balanceHtml = '';
  let signoffHtml = '';

  blocks.forEach(block => {
    if (block.type === 'paragraph') {
      introParagraphsHtml += `<p style="margin: 0 0 10px 0; font-size: 14px; color: #475569; line-height: 1.5;">${block.text?.replace(/\n/g, '<br/>')}</p>`;
    } else if (block.type === 'callout' && block.lines) {
      block.lines.forEach(line => {
        const k = line.key.toLowerCase();
        if (
          k.includes('particular') ||
          k.includes('remark') ||
          k.includes('reason') ||
          k.includes('change') ||
          k.includes('description')
        ) {
          detailLines.push(line);
        } else {
          gridLines.push(line);
        }
      });
    } else if (block.type === 'balance') {
      const line = block.lines ? block.lines[0] : null;
      const keyText = line ? line.key : 'Current Cash Balance';
      const valText = line ? line.value : (block.text ? block.text.replace(/^.*:\s*/, '') : '');

      balanceHtml = `<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border-radius: 6px; padding: 15px; border: 1px solid #bbf7d0; margin-top: 15px;">
        <tr>
          <td align="center">
            <p style="margin: 0; font-size: 14px; color: #166534;">
              <span style="font-weight: 600;">${keyText}:</span> 
              <span style="font-size: 16px; font-weight: 700; margin-left: 5px;">${valText}</span>
            </p>
          </td>
        </tr>
      </table>`;
    } else if (block.type === 'signoff' || block.type === 'note') {
      signoffHtml += `<p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">${block.text}</p>`;
    }
  });

  const getFieldIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('amount')) return '💰 ';
    if (k.includes('voucher') || k.includes('ref')) return '📋 ';
    if (k.includes('paid') || k.includes('received') || k.includes('source') || k.includes('claimant') || k.includes('requested')) return '👤 ';
    if (k.includes('category')) return '🏷️ ';
    if (k.includes('date')) return '📅 ';
    if (k.includes('attachment')) return '📎 ';
    if (k.includes('balance')) return '🏦 ';
    if (k.includes('approved') || k.includes('issued') || k.includes('rejected') || k.includes('by')) return '✍️ ';
    return '';
  };

  const renderGridCell = (item: { key: string; value: string }, cellWidth: string) => {
    const isAmount = item.key.toLowerCase().includes('amount');
    const isAttachment = item.key.toLowerCase().includes('attachment');
    const icon = getFieldIcon(item.key);

    if (isAmount) {
      return `<td width="${cellWidth}" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px 14px; border: 1.5px solid ${accentColor}; border-top: 3.5px solid ${accentColor}; box-sizing: border-box;">
        <p style="margin: 0 0 4px 0; font-size: 10px; color: ${accentColor}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; line-height: 1.2; word-break: break-word;">${icon}${item.key}</p>
        <p style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 700; line-height: 1.2; word-break: break-word;">${item.value}</p>
      </td>`;
    }

    if (isAttachment) {
      let attachmentValueHtml = item.value;
      if (item.value.includes('<a')) {
        attachmentValueHtml = item.value;
      } else if (item.value.toUpperCase().includes('YES')) {
        attachmentValueHtml = `<span style="background-color: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; display: inline-block;">YES</span>`;
      } else {
        attachmentValueHtml = `<span style="background-color: #64748b; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; display: inline-block;">NO</span>`;
      }

      return `<td width="${cellWidth}" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0; box-sizing: border-box;">
        <p style="margin: 0 0 4px 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; line-height: 1.2; word-break: break-word;">${icon}${item.key}</p>
        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600; line-height: 1.3;">${attachmentValueHtml}</p>
      </td>`;
    }

    return `<td width="${cellWidth}" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0; box-sizing: border-box;">
      <p style="margin: 0 0 4px 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; line-height: 1.2; word-break: break-word;">${icon}${item.key}</p>
      <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600; line-height: 1.3; word-break: break-word;">${item.value}</p>
    </td>`;
  };

  // Render Grid Cards in 2 columns
  let gridTableHtml = '';
  if (gridLines.length > 0) {
    let rowsHtml = '';
    for (let i = 0; i < gridLines.length; i += 2) {
      const itemA = gridLines[i];
      const itemB = gridLines[i + 1];

      rowsHtml += '<tr>';
      if (itemB) {
        rowsHtml += renderGridCell(itemA, '48%');
        rowsHtml += '<td width="4%"></td>';
        rowsHtml += renderGridCell(itemB, '48%');
      } else {
        rowsHtml += renderGridCell(itemA, '48%');
        rowsHtml += '<td width="4%"></td>';
        rowsHtml += '<td width="48%"></td>';
      }
      rowsHtml += '</tr>';
      if (i + 2 < gridLines.length) {
        rowsHtml += '<tr><td colspan="3" height="10"></td></tr>';
      }
    }

    gridTableHtml = `<table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; table-layout: fixed;">
      <colgroup>
        <col width="48%">
        <col width="4%">
        <col width="48%">
      </colgroup>
      ${rowsHtml}
    </table>`;
  }

  // Render Details Blocks (Particulars & Remarks)
  let detailBlocksHtml = '';
  if (detailLines.length > 0) {
    detailBlocksHtml = `<table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
      ${detailLines.map((line, idx) => `
        <tr>
          <td style="border-left: 3.5px solid ${accentColor}; padding-left: 14px; ${idx < detailLines.length - 1 ? 'padding-bottom: 15px;' : ''}">
            <p style="margin: 0 0 4px 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">${line.key}</p>
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5; word-break: break-word;">${line.value}</p>
          </td>
        </tr>
      `).join('')}
    </table>`;
  }

  const timelineHtml = renderTimelineHeaderHtml(title, typeOrStatus);

  const getBadgeTag = () => {
    const norm = (typeOrStatus || '').toUpperCase();
    if (norm === 'NEW') return '📝 NEW VOUCHER ALERT';
    if (norm === 'EDIT') return '✏️ VOUCHER MODIFICATION';
    if (norm === 'INWARD') return '📥 CASH DEPOSIT ALERT';
    if (norm === 'INWARD_EDIT') return '✏️ DEPOSIT MODIFICATION';
    if (norm === 'REQUEST_SUBMITTED') return '⏳ ACTION REQUIRED: PENDING APPROVAL';
    if (norm === 'REQUEST_APPROVED') return '🕒 ACTION REQUIRED: DISBURSE CASH';
    if (norm === 'REQUEST_PAID') return '✓ PAYMENT DISBURSED';
    if (norm === 'REQUEST_REJECTED') return '✕ CLAIM REJECTED';
    if (norm === 'REQUEST_REROUTED') return '🔀 ACTION REQUIRED: REQUEST RE-ROUTED';
    return '🔔 PETTY CASH NOTIFICATION';
  };

  const badgeText = getBadgeTag();

  const headerHtml = timelineHtml ? `
                    <!-- Compact Header with Centered Timeline -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 25px 25px 20px 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <div style="margin-bottom: 10px;">
                              <span style="background-color: ${accentColor}; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 12px; border-radius: 20px; display: inline-block;">${badgeText}</span>
                            </div>
                            <h1 style="color: #0f172a; margin: 0 0 5px 0; font-size: 20px; font-weight: 700;">${title}</h1>
                            <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0;">Request progress tracking</p>
                            
                            ${timelineHtml}
                        </td>
                    </tr>` : `
                    <!-- Compact Header Without Timeline -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 25px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <div style="margin-bottom: 10px;">
                              <span style="background-color: ${accentColor}; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 12px; border-radius: 20px; display: inline-block;">${badgeText}</span>
                            </div>
                            <h1 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 700;">${title}</h1>
                        </td>
                    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Outfit', Arial, sans-serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Outfit', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px 10px;">
        <tr>
            <td align="center">
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 2px solid ${accentColor}; border-top: 6px solid ${accentColor};">

                    ${headerHtml}

                    <!-- Compact Content Area -->
                    <tr>
                        <td style="padding: 25px;">
                            ${introParagraphsHtml}

                            ${gridTableHtml}

                            ${detailBlocksHtml}

                            ${balanceHtml}

                            ${signoffHtml}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                                This is an automated notification from the Administration Department.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                                © ${new Date().getFullYear()} Ommax Electric Pvt. Ltd. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function renderTimelineHeaderHtml(title: string, typeOrStatus?: string): string {
  const normType = (typeOrStatus || '').toUpperCase();
  const normTitle = (title || '').toLowerCase();

  // Deposits and deposit changes do NOT need timeline tracking
  if (normType === 'INWARD' || normType === 'INWARD_EDIT' || normTitle.includes('deposit')) {
    return '';
  }

  type StepState = 'active' | 'completed' | 'pending' | 'rejected';
  let step1State: StepState = 'active';
  let step2State: StepState = 'pending';
  let step3State: StepState = 'pending';
  let step4State: StepState = 'pending';

  if (normType === 'REQUEST_APPROVED' || normTitle.includes('approved') || normTitle.includes('issue cash')) {
    step1State = 'completed';
    step2State = 'completed';
    step3State = 'active';
    step4State = 'pending';
  } else if (normType === 'REQUEST_PAID' || normTitle.includes('paid') || normTitle.includes('payment issued') || normTitle.includes('disbursed')) {
    step1State = 'completed';
    step2State = 'completed';
    step3State = 'completed';
    step4State = 'completed';
  } else if (normType === 'REQUEST_REJECTED' || normTitle.includes('rejected')) {
    step1State = 'completed';
    step2State = 'rejected';
    step3State = 'pending';
    step4State = 'pending';
  } else if (normType === 'REQUEST_REROUTED' || normTitle.includes('re-routed') || normTitle.includes('rerouted')) {
    step1State = 'active';
    step2State = 'pending';
    step3State = 'pending';
    step4State = 'pending';
  } else {
    step1State = 'active';
    step2State = 'pending';
    step3State = 'pending';
    step4State = 'pending';
  }

  const renderStepCircle = (
    state: 'active' | 'completed' | 'pending' | 'rejected',
    activeChar: string,
    pendingChar: string,
    rejectedChar: string = '&#10007;'
  ) => {
    if (state === 'completed') {
      return `<table width="38" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #10b981; border-radius: 50%;">
        <tr>
          <td height="38" align="center" valign="middle" style="color: #ffffff; font-size: 18px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; line-height: 38px; text-align: center;">
            &#10003;
          </td>
        </tr>
      </table>`;
    }

    if (state === 'active') {
      return `<table width="38" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #3b82f6; border-radius: 50%;">
        <tr>
          <td height="38" align="center" valign="middle" style="color: #ffffff; font-size: 15px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; line-height: 38px; text-align: center;">
            ${activeChar}
          </td>
        </tr>
      </table>`;
    }

    if (state === 'rejected') {
      return `<table width="38" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #ef4444; border-radius: 50%;">
        <tr>
          <td height="38" align="center" valign="middle" style="color: #ffffff; font-size: 18px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; line-height: 38px; text-align: center;">
            ${rejectedChar}
          </td>
        </tr>
      </table>`;
    }

    return `<table width="34" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 50%;">
      <tr>
        <td height="34" align="center" valign="middle" style="color: #64748b; font-size: 13px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; line-height: 34px; text-align: center;">
          ${pendingChar}
        </td>
      </tr>
    </table>`;
  };

  const line1Color = (step1State === 'active' || step1State === 'completed') ? '#cbd5e1' : '#e2e8f0';
  const line2Color = (step2State === 'completed') ? '#cbd5e1' : '#e2e8f0';
  const line3Color = (step3State === 'active' || step3State === 'completed') ? '#cbd5e1' : '#e2e8f0';

  return `<table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 380px; margin: 0 auto;">
    <tr>
      <!-- Step 1: Created -->
      <td width="16%" align="center" valign="middle">
        ${renderStepCircle(step1State, '📝', '1')}
      </td>
      <td width="12%" align="center" valign="middle"><div style="height: 2px; background-color: ${line1Color}; width: 100%;"></div></td>
      
      <!-- Step 2: Approval -->
      <td width="16%" align="center" valign="middle">
        ${renderStepCircle(step2State, '🔍', '2')}
      </td>
      <td width="12%" align="center" valign="middle"><div style="height: 2px; background-color: ${line2Color}; width: 100%;"></div></td>
      
      <!-- Step 3: Issue Request -->
      <td width="16%" align="center" valign="middle">
        ${renderStepCircle(step3State, '🕒', '3')}
      </td>
      <td width="12%" align="center" valign="middle"><div style="height: 2px; background-color: ${line3Color}; width: 100%;"></div></td>
      
      <!-- Step 4: Cash Issued -->
      <td width="16%" align="center" valign="middle">
        ${renderStepCircle(step4State, '₹', '4')}
      </td>
    </tr>
  </table>`;
}

/**
 * Converts raw CRM template text with tag placeholders into realistic sample values for previewing.
 */
export function substituteCRMSampleTags(
  templateText: string,
  currencySymbol: string = '₹',
  type: 'NEW_OPP' | 'WIN_OPP' | 'LOST_OPP' = 'NEW_OPP'
): string {
  if (!templateText) return '';

  const sampleAmount = `${currencySymbol}45,00,000.00`;
  const stageName = type === 'WIN_OPP' ? 'Closed Won' : type === 'LOST_OPP' ? 'Closed Lost' : 'Proposal / Quotation';
  const probVal = type === 'WIN_OPP' ? '100%' : type === 'LOST_OPP' ? '0%' : '80%';
  const closeDate = type === 'WIN_OPP' ? '28-08-2026' : type === 'LOST_OPP' ? '28-08-2026' : '15-09-2026';

  return templateText
    .replace(/\{opportunity_title\}/g, 'Commercial Rooftop Solar 250kW')
    .replace(/\{account_name\}/g, 'Apex Industries Ltd')
    .replace(/\{contact_name\}/g, 'Vikramaditya Verma')
    .replace(/\{amount\}/g, sampleAmount)
    .replace(/\{stage\}/g, stageName)
    .replace(/\{probability\}/g, probVal)
    .replace(/\{expected_close_date\}/g, closeDate)
    .replace(/\{closing_date\}/g, '28-08-2026')
    .replace(/\{lost_date\}/g, '28-08-2026')
    .replace(/\{portfolio\}/g, 'Commercial & Industrial Solar')
    .replace(/\{lead_source\}/g, 'Direct Inbound / Referral')
    .replace(/\{assigned_to\}/g, 'Rajesh Sharma')
    .replace(/\{created_by\}/g, 'Anita Roy')
    .replace(/\{won_by\}/g, 'Rajesh Sharma')
    .replace(/\{lost_reason\}/g, 'Client delayed capital expenditure to next financial year due to internal plant restructuring.')
    .replace(/\{notes\}/g, type === 'WIN_OPP'
      ? 'Client signed 250kW Turnkey EPC agreement. Advance payment of 20% approved by finance director.'
      : type === 'LOST_OPP'
      ? 'Decision postponed by client management; stay in touch for next quarter CAPEX review.'
      : 'Initial site survey completed. Detailed engineering proposal & ROI calculation submitted for executive review.'
    )
    .replace(/\{date\}/g, '28-08-2026');
}

/**
 * Builds modern, classic Outlook-compatible HTML email for CRM Opportunities (New, Win, Lost).
 * Built with robust table markup, inline CSS styles, and Word/Outlook engine compatibility.
 */
export function buildModernCRMEmailFromText(
  title: string,
  bodyText: string,
  accentColor: string = '#3b82f6',
  type: 'NEW_OPP' | 'WIN_OPP' | 'LOST_OPP' = 'NEW_OPP'
): string {
  const blocks = parseBodyTextToBlocks(bodyText);

  let introParagraphsHtml = '';
  const gridLines: { key: string; value: string; raw: string }[] = [];
  const detailLines: { key: string; value: string; raw: string }[] = [];
  let signoffHtml = '';

  blocks.forEach(block => {
    if (block.type === 'paragraph') {
      introParagraphsHtml += `<p style="margin: 0 0 12px 0; font-size: 14px; color: #334155; line-height: 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${block.text?.replace(/\n/g, '<br/>')}</p>`;
    } else if (block.type === 'callout' && block.lines) {
      block.lines.forEach(line => {
        const k = line.key.toLowerCase();
        if (
          k.includes('note') ||
          k.includes('reason') ||
          k.includes('summary') ||
          k.includes('strategy') ||
          k.includes('description') ||
          k.includes('remark') ||
          k.includes('closure')
        ) {
          detailLines.push(line);
        } else {
          gridLines.push(line);
        }
      });
    } else if (block.type === 'signoff' || block.type === 'note') {
      signoffHtml += `<p style="margin: 14px 0 0 0; font-size: 13px; color: #64748b; line-height: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${block.text}</p>`;
    }
  });

  const getCRMFieldIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('amount') || k.includes('value') || k.includes('deal value')) return '💰 ';
    if (k.includes('opportunity') || k.includes('title') || k.includes('deal')) return '💼 ';
    if (k.includes('account') || k.includes('client') || k.includes('company')) return '🏢 ';
    if (k.includes('contact') || k.includes('person') || k.includes('owner') || k.includes('assigned') || k.includes('executive')) return '👤 ';
    if (k.includes('stage') || k.includes('status')) return '📊 ';
    if (k.includes('probability') || k.includes('win rate')) return '📈 ';
    if (k.includes('date') || k.includes('close') || k.includes('expected')) return '📅 ';
    if (k.includes('portfolio') || k.includes('product') || k.includes('service')) return '📦 ';
    if (k.includes('lead') || k.includes('source')) return '🎯 ';
    return '📌 ';
  };

  const renderCRMGridCell = (item: { key: string; value: string }, cellWidth: string) => {
    const isAmount = item.key.toLowerCase().includes('amount') || item.key.toLowerCase().includes('value') || item.key.toLowerCase().includes('deal value');
    const isStage = item.key.toLowerCase().includes('stage');
    const icon = getCRMFieldIcon(item.key);

    if (isAmount) {
      return `<td width="${cellWidth}" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px 14px; border: 1.5px solid ${accentColor}; border-top: 3.5px solid ${accentColor}; box-sizing: border-box;">
        <p style="margin: 0 0 4px 0; font-size: 10px; color: ${accentColor}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; line-height: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${icon}${item.key}</p>
        <p style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 700; line-height: 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${item.value}</p>
      </td>`;
    }

    if (isStage) {
      const stageBadgeBg = type === 'WIN_OPP' ? '#10b981' : type === 'LOST_OPP' ? '#ef4444' : '#3b82f6';
      return `<td width="${cellWidth}" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0; box-sizing: border-box;">
        <p style="margin: 0 0 4px 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; line-height: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${icon}${item.key}</p>
        <p style="margin: 0; font-size: 13px; line-height: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <span style="background-color: ${stageBadgeBg}; color: #ffffff; padding: 3px 9px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-block;">${item.value}</span>
        </p>
      </td>`;
    }

    return `<td width="${cellWidth}" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0; box-sizing: border-box;">
      <p style="margin: 0 0 4px 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; line-height: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${icon}${item.key}</p>
      <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600; line-height: 20px; word-break: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${item.value}</p>
    </td>`;
  };

  // Render Grid Cards in 2 columns (classic Outlook table layout)
  let gridTableHtml = '';
  if (gridLines.length > 0) {
    let rowsHtml = '';
    for (let i = 0; i < gridLines.length; i += 2) {
      const itemA = gridLines[i];
      const itemB = gridLines[i + 1];

      rowsHtml += '<tr>';
      if (itemB) {
        rowsHtml += renderCRMGridCell(itemA, '48%');
        rowsHtml += '<td width="4%" style="font-size:1px; line-height:1px;">&nbsp;</td>';
        rowsHtml += renderCRMGridCell(itemB, '48%');
      } else {
        rowsHtml += renderCRMGridCell(itemA, '48%');
        rowsHtml += '<td width="4%" style="font-size:1px; line-height:1px;">&nbsp;</td>';
        rowsHtml += '<td width="48%" style="font-size:1px; line-height:1px;">&nbsp;</td>';
      }
      rowsHtml += '</tr>';
      if (i + 2 < gridLines.length) {
        rowsHtml += '<tr><td colspan="3" height="10" style="font-size:1px; line-height:10px;">&nbsp;</td></tr>';
      }
    }

    gridTableHtml = `<table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; table-layout: fixed;">
      <colgroup>
        <col width="48%">
        <col width="4%">
        <col width="48%">
      </colgroup>
      ${rowsHtml}
    </table>`;
  }

  // Render Details & Notes Callout Blocks (Classic Outlook compatible)
  let detailBlocksHtml = '';
  if (detailLines.length > 0) {
    detailBlocksHtml = `<table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
      ${detailLines.map((line, idx) => `
        <tr>
          <td style="border-left: 3.5px solid ${accentColor}; background-color: #f8fafc; border-radius: 0 8px 8px 0; padding: 12px 16px; ${idx < detailLines.length - 1 ? 'margin-bottom: 12px;' : ''}">
            <p style="margin: 0 0 4px 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${line.key}</p>
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 22px; word-break: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${line.value.replace(/\n/g, '<br/>')}</p>
          </td>
        </tr>
        ${idx < detailLines.length - 1 ? '<tr><td height="10" style="font-size:1px; line-height:10px;">&nbsp;</td></tr>' : ''}
      `).join('')}
    </table>`;
  }

  const getCRMBadgeText = () => {
    if (type === 'WIN_OPP') return '🎉 DEAL CLOSED WON';
    if (type === 'LOST_OPP') return '✕ OPPORTUNITY CLOSED LOST';
    return '💼 NEW CRM OPPORTUNITY';
  };

  const badgeText = getCRMBadgeText();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${title}</title>
    <!--[if gte mso 9]>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style type="text/css">
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px 10px;">
        <tr>
            <td align="center" valign="top">
                <!-- Main Card Container (Classic Outlook & Webmail Compatible) -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 2px solid ${accentColor}; border-top: 6px solid ${accentColor};">
                    
                    <!-- Header Section -->
                    <tr>
                        <td align="center" style="background-color: #ffffff; padding: 25px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <div style="margin-bottom: 10px;">
                              <span style="background-color: ${accentColor}; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 14px; border-radius: 20px; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                ${badgeText}
                              </span>
                            </div>
                            <h1 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 700; line-height: 26px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${title}
                            </h1>
                        </td>
                    </tr>

                    <!-- Body Content Area -->
                    <tr>
                        <td style="padding: 25px;">
                            ${introParagraphsHtml}

                            ${gridTableHtml}

                            ${detailBlocksHtml}

                            ${signoffHtml}
                        </td>
                    </tr>

                    <!-- Corporate Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                This is an automated notification from the Administration Department.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                &copy; ${new Date().getFullYear()} Ommax Electric Pvt. Ltd. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

