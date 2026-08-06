import { Transaction, IntegrationSettings } from '../types';
export { compressAndProcessFile, type ProcessedFileResult } from './fileAttachmentService';

export async function uploadReceiptToCloudinary(
  fileData: string,
  fileName: string,
  voucherId: string,
  _dateStr?: string,
  _integrationSettings?: IntegrationSettings
): Promise<{
  success: boolean;
  url: string;
  publicId: string;
  message: string;
}> {
  return {
    success: true,
    url: fileData,
    publicId: `firestore_${voucherId}`,
    message: 'Attachment saved directly to Firestore Database.'
  };
}

export async function testCloudinaryConnection(): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'Firestore File Manager is active and operational.'
  };
}

export async function migrateExistingAttachmentsToCloudinary(
  _transactions: Transaction[],
  _integrationSettings?: IntegrationSettings,
  _onProgress?: (progress: { current: number; total: number; currentVoucher: string }) => void
): Promise<{
  migratedCount: number;
  failedCount: number;
  details: Array<{ voucherNo: string; name: string; oldUrl: string; newUrl?: string; error?: string }>;
}> {
  return {
    migratedCount: 0,
    failedCount: 0,
    details: []
  };
}
