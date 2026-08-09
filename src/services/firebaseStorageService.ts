import { ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Uploads a file (Base64 Data URL, File, or external URL Blob) to Firebase Cloud Storage
 * and returns its public HTTPS download URL.
 */
export async function uploadToFirebaseStorage(
  fileOrDataUrl: string | File | Blob,
  fileName: string,
  folder: string = 'receipts'
): Promise<{ success: boolean; url?: string; message?: string }> {
  try {
    const cleanName = (fileName || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${folder}/${timestamp}_${cleanName}`;
    const storageRef = ref(storage, filePath);

    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('data:')) {
        await uploadString(storageRef, fileOrDataUrl, 'data_url');
      } else if (fileOrDataUrl.startsWith('http')) {
        const response = await fetch(fileOrDataUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch external file: ${response.statusText}`);
        }
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
      } else {
        return { success: false, message: 'Invalid file string format' };
      }
    } else {
      await uploadBytes(storageRef, fileOrDataUrl);
    }

    const downloadUrl = await getDownloadURL(storageRef);
    return { success: true, url: downloadUrl };
  } catch (error: any) {
    console.error('Firebase Storage upload error:', error);
    return { success: false, message: error?.message || 'Failed to upload to Firebase Cloud Storage' };
  }
}
