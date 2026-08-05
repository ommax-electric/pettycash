import { IntegrationSettings } from '../types';

export interface CloudinaryUploadResult {
  success: boolean;
  url: string;
  publicId?: string;
  bytes?: number;
  format?: string;
  message: string;
}

/**
 * Formats date string into Year and Month Name for folder hierarchy in Cloudinary
 * E.g., { year: '2026', month: 'August' }
 */
export function getYearAndMonthFolderNames(dateStr?: string | null): { year: string; month: string } {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (!dateStr) {
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: MONTH_NAMES[now.getMonth()]
    };
  }

  const clean = dateStr.split('T')[0].trim();
  let dateObj: Date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number);
    dateObj = new Date(y, m - 1, d);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('-').map(Number);
    dateObj = new Date(y, m - 1, d);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/').map(Number);
    dateObj = new Date(y, m - 1, d);
  } else {
    dateObj = new Date(clean);
  }

  if (isNaN(dateObj.getTime())) {
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: MONTH_NAMES[now.getMonth()]
    };
  }

  return {
    year: dateObj.getFullYear().toString(),
    month: MONTH_NAMES[dateObj.getMonth()]
  };
}

/**
 * Auto-compresses PNG, JPG, and JPEG files client-side using HTML5 Canvas
 * down to max dimensions (1920px) and quality 0.82 before upload.
 */
export async function compressAndProcessFile(file: File): Promise<{
  name: string;
  size: string;
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
}> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png'].includes(extension);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;

      if (!isImage) {
        // PDF document: return original without image compression
        resolve({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          dataUrl: rawDataUrl,
          originalBytes: file.size,
          compressedBytes: file.size
        });
        return;
      }

      // Image Compression via Canvas
      const img = new Image();
      img.onerror = () => {
        resolve({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          dataUrl: rawDataUrl,
          originalBytes: file.size,
          compressedBytes: file.size
        });
      };
      img.onload = () => {
        const MAX_DIM = 1920;
        let w = img.width;
        let h = img.height;

        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            dataUrl: rawDataUrl,
            originalBytes: file.size,
            compressedBytes: file.size
          });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);

        const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(mimeType, 0.82);

        // Estimate byte size from compressed base64
        const base64Str = compressedDataUrl.substring(compressedDataUrl.indexOf(',') + 1);
        const compBytes = Math.round(base64Str.length * 0.75);

        const isCompressed = compBytes < file.size;
        const finalDataUrl = isCompressed ? compressedDataUrl : rawDataUrl;
        const finalBytes = isCompressed ? compBytes : file.size;

        resolve({
          name: file.name,
          size: (finalBytes / 1024).toFixed(1) + ' KB' + (isCompressed ? ' (Auto-Compressed)' : ''),
          dataUrl: finalDataUrl,
          originalBytes: file.size,
          compressedBytes: finalBytes
        });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a receipt image (PNG, JPG, JPEG) or PDF document to Cloudinary
 * Target Folder Hierarchy: /Petty Cash Register / {Year} / {Month} /
 * Public ID Format: {VoucherNo}_{OriginalFileName}
 */
export async function uploadReceiptToCloudinary(
  fileInput: File | Blob | string,
  fileName: string,
  voucherId: string,
  dateStr: string,
  settings?: IntegrationSettings | null
): Promise<CloudinaryUploadResult> {
  const cloudName = settings?.cloudinaryCloudName || 'ommaxelectric';
  const uploadPreset = settings?.cloudinaryUploadPreset || 'petty_cash_receipts';
  const rootFolder = settings?.cloudinaryFolderName || 'Petty Cash Register';

  if (!cloudName || !uploadPreset) {
    return {
      success: false,
      url: typeof fileInput === 'string' && fileInput.startsWith('data:') ? fileInput : '',
      message: 'Cloudinary Cloud Name or Upload Preset is not configured in Admin Settings.'
    };
  }

  try {
    const { year, month } = getYearAndMonthFolderNames(dateStr);
    const targetFolder = `${rootFolder}/${year}/${month}`;

    // Clean voucher reference (e.g., '26' or 'VCH-026')
    const cleanVoucher = voucherId ? voucherId.toString().trim().replace(/[^a-zA-Z0-9_-]/g, '') : '26';

    // Extract base name without extension and sanitize
    let baseName = 'receipt';
    if (fileName && fileName.trim()) {
      const lastDot = fileName.lastIndexOf('.');
      baseName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
    }
    const cleanBaseName = baseName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

    // Public ID formatted strictly as: VoucherNo_OriginalFileName (e.g. 26_invoice_receipt)
    const publicId = `${cleanVoucher}_${cleanBaseName}`;

    const formData = new FormData();
    formData.append('file', fileInput);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', targetFolder);
    formData.append('public_id', publicId);

    const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName.trim()}/auto/upload`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok && data.secure_url) {
      return {
        success: true,
        url: data.secure_url,
        publicId: data.public_id,
        bytes: data.bytes,
        format: data.format,
        message: `Successfully uploaded attachment to Cloudinary: /${targetFolder}/${publicId}`
      };
    } else {
      const errDetail = data?.error?.message || 'Upload failed. Check Cloud Name and Upload Preset.';
      return {
        success: false,
        url: typeof fileInput === 'string' && fileInput.startsWith('data:') ? fileInput : '',
        message: `Cloudinary upload error: ${errDetail}`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      url: typeof fileInput === 'string' && fileInput.startsWith('data:') ? fileInput : '',
      message: `Network/Upload error: ${err?.message || 'Unable to reach Cloudinary servers'}`
    };
  }
}

/**
 * Tests Cloudinary Credentials (Cloud Name & Upload Preset) by attempting a 1x1 pixel test upload
 */
export async function testCloudinaryConnection(
  cloudName: string,
  uploadPreset: string
): Promise<{ success: boolean; message: string }> {
  if (!cloudName.trim()) {
    return { success: false, message: 'Please enter your Cloudinary Cloud Name.' };
  }
  if (!uploadPreset.trim()) {
    return { success: false, message: 'Please enter your Cloudinary Upload Preset name.' };
  }

  try {
    // 1x1 transparent PNG base64
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const formData = new FormData();
    formData.append('file', testImage);
    formData.append('upload_preset', uploadPreset.trim());
    formData.append('folder', 'Petty Cash Register/_connection_test');

    const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName.trim()}/auto/upload`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok && data.secure_url) {
      return {
        success: true,
        message: `Connection successful! Cloudinary account "${cloudName}" and upload preset "${uploadPreset}" are fully active.`
      };
    } else {
      const msg = data?.error?.message || 'Failed to authenticate preset. Ensure preset mode is set to "Unsigned" in Cloudinary settings.';
      return {
        success: false,
        message: `Cloudinary Error: ${msg}`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err?.message || 'Network error'}`
    };
  }
}

