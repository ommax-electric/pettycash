import { Transaction, IntegrationSettings } from '../types';
import { uploadFileToCloudinary, convertExternalUrlToDataUrl } from './fileAttachmentService';
import { db, doc, updateDoc } from '../firebase';

export { compressAndProcessFile, deleteFileFromCloudinary, uploadFileToCloudinary, testCloudinaryConnection, type ProcessedFileResult } from './fileAttachmentService';

export async function uploadReceiptToCloudinary(
  fileData: string,
  fileName: string,
  voucherId: string,
  _dateStr?: string,
  integrationSettings?: IntegrationSettings
): Promise<{
  success: boolean;
  url: string;
  publicId: string;
  message: string;
}> {
  if (integrationSettings?.cloudinaryCloudName) {
    const res = await uploadFileToCloudinary(fileData, `${voucherId}_${fileName}`, 'Petty Cash/Vouchers', {
      cloudName: integrationSettings.cloudinaryCloudName,
      apiKey: integrationSettings.cloudinaryApiKey,
      apiSecret: integrationSettings.cloudinaryApiSecret,
      uploadPreset: integrationSettings.cloudinaryUploadPreset
    });
    if (res.success && res.url) {
      return {
        success: true,
        url: res.url,
        publicId: res.publicId || fileName,
        message: 'Successfully uploaded attachment to Cloudinary.'
      };
    }
  }
  return {
    success: true,
    url: fileData,
    publicId: `firestore_${voucherId}`,
    message: 'Attachment saved directly to Firestore Database.'
  };
}

export async function migrateExistingAttachmentsToCloudinary(
  transactions: Transaction[],
  integrationSettings?: IntegrationSettings,
  onProgress?: (progress: { current: number; total: number; currentVoucher: string }) => void
): Promise<{
  migratedCount: number;
  failedCount: number;
  details: Array<{ voucherNo: string; name: string; oldUrl: string; newUrl?: string; error?: string }>;
}> {
  if (!integrationSettings?.cloudinaryCloudName) {
    return { migratedCount: 0, failedCount: 0, details: [] };
  }

  const base64Txns = (transactions || []).filter(t => {
    if (!t.receiptUrl) return false;
    if (t.receiptUrl.startsWith('data:')) return true;
    if (!t.receiptUrl.includes('cloudinary.com')) return true;
    return false;
  });

  let migratedCount = 0;
  let failedCount = 0;
  const details: Array<{ voucherNo: string; name: string; oldUrl: string; newUrl?: string; error?: string }> = [];

  for (let i = 0; i < base64Txns.length; i++) {
    const txn = base64Txns[i];
    const voucherNo = txn.reference || txn.id;
    if (onProgress) {
      onProgress({ current: i + 1, total: base64Txns.length, currentVoucher: voucherNo });
    }

    try {
      let rawDataUrl: string | null = txn.receiptUrl!;
      if (!rawDataUrl.startsWith('data:')) {
        rawDataUrl = await convertExternalUrlToDataUrl(txn.receiptUrl!);
      }

      if (!rawDataUrl) {
        failedCount++;
        details.push({ voucherNo, name: txn.receiptName || 'file', oldUrl: txn.receiptUrl!, error: 'Could not fetch external file' });
        continue;
      }

      const [yyyy, mm] = (txn.date || new Date().toISOString().split('T')[0]).split('-');
      const folderPath = `Petty Cash/${yyyy || '2026'}/${mm || '08'}`;
      const filePublicId = (txn.receiptName || 'attachment').replace(/[^a-zA-Z0-9_.-]/g, '_');

      const res = await uploadFileToCloudinary(rawDataUrl, filePublicId, folderPath, {
        cloudName: integrationSettings.cloudinaryCloudName,
        apiKey: integrationSettings.cloudinaryApiKey,
        apiSecret: integrationSettings.cloudinaryApiSecret,
        uploadPreset: integrationSettings.cloudinaryUploadPreset
      });

      if (res.success && res.url) {
        await updateDoc(doc(db, 'transactions', txn.id), {
          receiptUrl: res.url,
          receiptName: filePublicId
        });
        migratedCount++;
        details.push({ voucherNo, name: filePublicId, oldUrl: txn.receiptUrl!, newUrl: res.url });
      } else {
        failedCount++;
        details.push({ voucherNo, name: filePublicId, oldUrl: txn.receiptUrl!, error: res.error || 'Upload failed' });
      }
    } catch (err: any) {
      failedCount++;
      details.push({ voucherNo, name: txn.receiptName || 'file', oldUrl: txn.receiptUrl!, error: err.message || 'Error' });
    }
  }

  return { migratedCount, failedCount, details };
}

