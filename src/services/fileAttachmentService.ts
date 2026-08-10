/**
 * File Attachment Service
 * Handles processing, client-side compression (for images), and Base64 Data URL generation
 * for storing attachment files directly inside Firestore transaction records.
 */

export interface ProcessedFileResult {
  name: string;
  size: string;
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
}

/**
 * Auto-compresses PNG, JPG, and JPEG files client-side using HTML5 Canvas
 * down to max dimensions (1920px) and quality 0.82 before storing in Firestore.
 * PDF documents and other non-image attachments are read as raw Data URLs.
 */
export async function compressAndProcessFile(file: File): Promise<ProcessedFileResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(extension);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;

      if (!isImage) {
        // PDF document or other attachment: return raw Data URL
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
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
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

        ctx.drawImage(img, 0, 0, width, height);

        // Output as optimized JPEG or WebP
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const base64Str = compressedDataUrl.split(',')[1] || '';
        const compressedBytes = Math.round((base64Str.length * 3) / 4);

        resolve({
          name: file.name,
          size: (compressedBytes / 1024).toFixed(1) + ' KB',
          dataUrl: compressedDataUrl,
          originalBytes: file.size,
          compressedBytes
        });
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Downloads/fetches external files (e.g., legacy Cloudinary or Google Drive URLs)
 * and converts them into Base64 Data URLs so they are stored natively inside Firestore.
 */
export async function convertExternalUrlToDataUrl(url: string): Promise<string | null> {
  if (!url) return null;

  let targetUrl = url;
  if (targetUrl.startsWith('/')) {
    targetUrl = window.location.origin + targetUrl;
  }

  if (!targetUrl.startsWith('http')) return null;

  // 1. Try server proxy API endpoint first (downloads PDFs and files server-side bypassing CORS)
  try {
    const proxyRes = await fetch('/api/fetch-external-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl })
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && data.dataUrl) {
        return data.dataUrl;
      }
    }
  } catch (err) {
    console.warn('Server proxy fetch failed, trying direct client fetch:', err);
  }

  // 2. Direct client fetch fallback
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn('Direct fetch failed, trying image canvas fallback:', err);
  }

  // 3. Image Canvas Fallback for CORS / Image CDN URLs
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (e) {
        console.warn('Canvas conversion failed:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Tests connection to Cloudinary account
 */
export async function testCloudinaryConnection(config: {
  cloudName: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/cloudinary/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Successfully connected to Cloudinary!'
      };
    } else {
      return {
        success: false,
        message: data.error || 'Failed to connect to Cloudinary'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error connecting to Cloudinary API'
    };
  }
}

/**
 * Uploads a base64 Data URL attachment to Cloudinary
 * Returns the Cloudinary secure CDN URL on success, or falls back to original dataUrl on error.
 */
export async function uploadFileToCloudinary(
  dataUrl: string,
  fileName: string,
  folderPath: string,
  config: {
    cloudName: string;
    apiKey?: string;
    apiSecret?: string;
    uploadPreset?: string;
  }
): Promise<{ success: boolean; url: string; publicId?: string; error?: string }> {
  if (!dataUrl || !config.cloudName) {
    return { success: false, url: dataUrl, error: 'Missing Cloudinary cloud name or file data' };
  }

  try {
    const response = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cloudName: config.cloudName,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        uploadPreset: config.uploadPreset,
        file: dataUrl,
        folder: folderPath || 'Petty Cash/2026/08',
        publicId: fileName
      })
    });

    const data = await response.json();
    if (response.ok && data.success && data.url) {
      return {
        success: true,
        url: data.url,
        publicId: data.publicId
      };
    } else {
      console.warn('Cloudinary upload failed:', data.error);
      return { success: false, url: dataUrl, error: data.error || 'Cloudinary Upload failed' };
    }
  } catch (err: any) {
    console.warn('Exception during Cloudinary upload:', err);
    return { success: false, url: dataUrl, error: err.message || 'Network error uploading to Cloudinary' };
  }
}

/**
 * Deletes a file from Cloudinary using its URL or publicId
 */
export async function deleteFileFromCloudinary(
  fileUrl: string,
  config?: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
    publicId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!fileUrl && !config?.publicId) {
    return { success: false, error: 'Invalid or missing Cloudinary URL or publicId' };
  }

  const cloudName = (config?.cloudName || localStorage.getItem('cloudinary_cloud_name') || '').trim();
  const apiKey = (config?.apiKey || localStorage.getItem('cloudinary_api_key') || '').trim();
  const apiSecret = (config?.apiSecret || localStorage.getItem('cloudinary_api_secret') || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('[Cloudinary Delete] Cannot delete file from Cloudinary: Missing Cloud Name, API Key, or API Secret.');
    return { success: false, error: 'Missing Cloudinary configuration (Cloud Name, API Key, or API Secret)' };
  }

  try {
    const res = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cloudName,
        apiKey,
        apiSecret,
        fileUrl: fileUrl || undefined,
        publicId: config?.publicId || undefined
      })
    });
    const data = await res.json();
    if (data.success) {
      console.log('[Cloudinary Delete Success]', fileUrl || config?.publicId, data);
    } else {
      console.warn('[Cloudinary Delete Failed]', fileUrl || config?.publicId, data);
    }
    return { success: Boolean(data.success), error: data.error };
  } catch (err: any) {
    console.warn('Exception during Cloudinary file deletion:', err);
    return { success: false, error: err.message || 'Network error deleting from Cloudinary' };
  }
}

