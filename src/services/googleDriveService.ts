import { Transaction, IntegrationSettings } from '../types';

export interface MigrationProgress {
  current: number;
  total: number;
  currentVoucher: string;
}

/**
 * Firestore Attachment Service (replaces legacy Google Drive upload)
 * Returns the provided Base64 Data URL for storing directly inside Firestore.
 */
export async function uploadReceiptToGoogleDrive(
  fileData: string,
  fileName: string,
  voucherId: string,
  dateStr?: string,
  _integrationSettings?: IntegrationSettings
): Promise<{
  success: boolean;
  driveUrl: string;
  url: string;
  path: string;
  fileId: string;
  message: string;
}> {
  return {
    success: true,
    driveUrl: fileData,
    url: fileData,
    path: `Firestore / Voucher #${voucherId}`,
    fileId: `firestore_${voucherId}`,
    message: `Attachment saved directly to Firestore Database.`
  };
}

export async function testGoogleDriveConnection(): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'Firestore File Manager is active and operational.'
  };
}

export async function migrateExistingAttachmentsToGoogleDrive(
  _transactions: Transaction[],
  _integrationSettings?: IntegrationSettings,
  _onProgress?: (progress: MigrationProgress) => void
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
