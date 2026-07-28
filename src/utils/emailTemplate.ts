/**
 * Utility to parse plain text email body templates into HTML & React preview components.
 * Automatically detects key-value detail blocks (e.g., "Amount: ₹3,500") and wraps them inside
 * a modern red left-bordered callout box, matching corporate administration email styles.
 */

export interface ParsedEmailBlock {
  type: 'paragraph' | 'callout' | 'signoff' | 'note';
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
      blocks.push({
        type: 'callout',
        lines: keyValueLines.filter((kv): kv is { key: string; value: string; raw: string } => kv !== null)
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
    .replace(/\{category\}/g, 'Office Supplies')
    .replace(/\{remarks\}/g, 'A4 printer paper & ink cartridges purchase')
    .replace(/\{date\}/g, '2026-07-28')
    .replace(/\{balance\}/g, `${currencySymbol}12,500.00`)
    .replace(/\{changed_fields\}/g, 'Amount and Category')
    .replace(/\{updated_by\}/g, 'Anita (Admin)');
}

/**
 * Builds modern HTML email markup using the parsed body blocks.
 */
export function buildModernHtmlEmailFromText(
  title: string,
  bodyText: string
): string {
  const blocks = parseBodyTextToBlocks(bodyText);

  const htmlContent = blocks.map(block => {
    if (block.type === 'callout' && block.lines) {
      const lineHtml = block.lines.map(line => {
        let valueStyle = 'color: #334155;';
        if (line.key.toLowerCase().includes('amount')) {
          valueStyle = 'color: #ef4444; font-weight: 700;';
        } else if (line.key.toLowerCase().includes('balance')) {
          valueStyle = 'color: #059669; font-weight: 700;';
        } else if (line.key.toLowerCase().includes('changed')) {
          valueStyle = 'color: #2563eb; font-weight: 600;';
        }
        return `<div style="margin-bottom: 6px;"><strong style="color: #0f172a; font-weight: 700;">${line.key}:</strong> <span style="${valueStyle}">${line.value}</span></div>`;
      }).join('');

      return `
      <!-- Details Callout Box -->
      <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
        <div style="font-size: 14px; line-height: 1.7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${lineHtml}
        </div>
      </div>`;
    }

    if (block.type === 'signoff') {
      return `<p style="margin: 24px 0 20px 0; font-size: 15px; font-weight: 700; color: #0f172a;">${block.text}</p>`;
    }

    if (block.type === 'note') {
      return `<p style="margin: 16px 0; font-size: 13px; font-style: italic; color: #94a3b8; line-height: 1.5;">${block.text}</p>`;
    }

    return `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">${block.text?.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04); overflow: hidden; text-align: left;">
          <tr>
            <td style="padding: 40px 36px;">
              
              <!-- Header Title -->
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.2;">
                ${title}
              </h1>
              
              <!-- Yellow Accent Bar -->
              <div style="width: 44px; height: 4px; background-color: #f7b944; border-radius: 2px; margin-top: 10px; margin-bottom: 24px;"></div>
              
              <!-- Body Content -->
              ${htmlContent}
              
              <!-- Divider -->
              <div style="border-top: 1px solid #f1f5f9; margin-top: 28px; margin-bottom: 20px;"></div>
              
              <!-- Footer -->
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
                This is an automated notification from the Administration Department.
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
