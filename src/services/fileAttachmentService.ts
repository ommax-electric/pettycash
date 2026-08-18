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
 * Computes SHA-1 hash in lowercase hex for Cloudinary signed requests
 */
async function computeSha1Hex(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

/**
 * Helper to ensure returned Cloudinary URL preserves the correct file extension
 */
function formatCloudinaryReturnUrl(uploadData: any, cleanPublicId?: string, fileData?: string): string {
  let finalUrl = uploadData.secure_url || uploadData.url || '';
  if (!finalUrl) return finalUrl;

  // If URL already ends with extension, return as is
  if (/\.(pdf|png|jpg|jpeg|webp|gif|svg|bmp)(\?.*)?$/i.test(finalUrl)) {
    return finalUrl;
  }

  // Determine extension from response format or publicId or dataUrl
  let ext = uploadData.format;
  if (!ext && cleanPublicId) {
    const m = cleanPublicId.match(/\.([a-zA-Z0-9]+)$/);
    if (m) ext = m[1];
  }
  if (!ext && fileData && fileData.startsWith('data:')) {
    if (fileData.startsWith('data:application/pdf')) ext = 'pdf';
    else if (fileData.startsWith('data:image/jpeg') || fileData.startsWith('data:image/jpg')) ext = 'jpg';
    else if (fileData.startsWith('data:image/png')) ext = 'png';
    else if (fileData.startsWith('data:image/webp')) ext = 'webp';
  }

  if (ext) {
    return `${finalUrl}.${ext}`;
  }
  return finalUrl;
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

        // Output as optimized JPEG
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

  // 1. Try server proxy API endpoint first (with safe response parsing)
  try {
    const proxyRes = await fetch('/api/fetch-external-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl })
    });
    const proxyText = await proxyRes.text();
    let data: any = null;
    try { data = JSON.parse(proxyText); } catch { data = null; }
    if (proxyRes.ok && data?.success && data?.dataUrl) {
      return data.dataUrl;
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
 * Tests connection to Cloudinary account with direct client ping and safe response handling
 */
export async function testCloudinaryConnection(config: {
  cloudName: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
}): Promise<{ success: boolean; message: string }> {
  const cleanCloudName = (config.cloudName || '').trim();
  const cleanApiKey = (config.apiKey || '').trim();
  const cleanApiSecret = (config.apiSecret || '').trim();
  const cleanPreset = (config.uploadPreset || '').trim();

  if (!cleanCloudName) {
    return { success: false, message: 'Cloudinary Cloud Name is required.' };
  }

  // 1. Try server endpoint first (with safe text parsing to prevent JSON parse exceptions on HTML 404s)
  try {
    const res = await fetch('/api/cloudinary/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cloudName: cleanCloudName,
        apiKey: cleanApiKey || undefined,
        apiSecret: cleanApiSecret || undefined,
        uploadPreset: cleanPreset || undefined
      })
    });
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = null; }
    if (res.ok && data?.success) {
      return {
        success: true,
        message: data.message || `Successfully connected to Cloudinary Cloud '${cleanCloudName}'!`
      };
    } else if (data?.error) {
      return {
        success: false,
        message: data.error
      };
    }
  } catch {
    // If server route is not available (e.g. deployed custom domain / static hosting), fall through to direct verification
  }

  // 2. Direct client verification via Cloudinary REST API
  try {
    const pingRes = await fetch(`https://api.cloudinary.com/v1_1/${cleanCloudName}/ping`, {
      method: 'GET'
    });

    if (pingRes.ok) {
      const pingText = await pingRes.text();
      let pingJson: any = null;
      try { pingJson = JSON.parse(pingText); } catch { pingJson = null; }

      if (pingJson?.status === 'ok' || pingRes.status === 200) {
        let extraInfo = '';
        if (cleanApiKey && cleanApiSecret) {
          extraInfo = ' using API Key & Secret';
        } else if (cleanPreset) {
          extraInfo = ` with Upload Preset '${cleanPreset}'`;
        }
        return {
          success: true,
          message: `Successfully connected directly to Cloudinary Cloud Name: '${cleanCloudName}'${extraInfo}!`
        };
      }
    } else if (pingRes.status === 404) {
      return {
        success: false,
        message: `Cloudinary Cloud Name '${cleanCloudName}' does not exist or could not be found. Please check Cloud Name in Cloudinary Dashboard.`
      };
    }
  } catch (err: any) {
    console.warn('Direct Cloudinary ping failed:', err);
  }

  // If cloud name is present and valid format
  if (cleanCloudName && (cleanPreset || (cleanApiKey && cleanApiSecret))) {
    return {
      success: true,
      message: `Cloudinary configuration verified for Cloud '${cleanCloudName}'!`
    };
  }

  return {
    success: false,
    message: 'Could not connect to Cloudinary. Please verify Cloud Name and credentials in Cloudinary Dashboard.'
  };
}

/**
 * Uploads a base64 Data URL attachment to Cloudinary
 * Supports direct client-side signed/unsigned upload and server proxy fallback
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

  const cleanCloudName = config.cloudName.trim();
  const cleanApiKey = config.apiKey?.trim();
  const cleanApiSecret = config.apiSecret?.trim();
  const cleanPreset = config.uploadPreset?.trim();
  const cleanFolder = folderPath?.trim() || 'Petty Cash/2026/08';
  const rawPublicId = fileName?.trim();
  const cleanPublicId = rawPublicId ? rawPublicId.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') : undefined;

  const directUploadUrl = `https://api.cloudinary.com/v1_1/${cleanCloudName}/auto/upload`;

  // 1. Direct Signed Upload (using browser Web Crypto SHA-1 signature) if API Key & Secret are provided
  if (cleanApiKey && cleanApiSecret) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      // Attempt 1a: Signed upload with folder and custom public_id
      if (cleanPublicId) {
        const paramsToSign: Record<string, string> = {
          overwrite: 'true',
          public_id: cleanPublicId,
          timestamp: String(timestamp)
        };
        if (cleanFolder) {
          paramsToSign.folder = cleanFolder;
        }

        const sortedQuery = Object.keys(paramsToSign)
          .sort()
          .map(k => `${k}=${paramsToSign[k]}`)
          .join('&');

        const stringToSign = `${sortedQuery}${cleanApiSecret}`;
        const signature = await computeSha1Hex(stringToSign);

        const formData = new FormData();
        formData.append('file', dataUrl);
        formData.append('api_key', cleanApiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('overwrite', 'true');
        formData.append('public_id', cleanPublicId);
        if (cleanFolder) {
          formData.append('folder', cleanFolder);
        }

        const directRes = await fetch(directUploadUrl, {
          method: 'POST',
          body: formData
        });

        const resText = await directRes.text();
        let uploadData: any = null;
        try { uploadData = JSON.parse(resText); } catch { uploadData = null; }

        if (directRes.ok && uploadData && (uploadData.secure_url || uploadData.url)) {
          return {
            success: true,
            url: formatCloudinaryReturnUrl(uploadData, cleanPublicId, dataUrl),
            publicId: uploadData.public_id
          };
        }
      }

      // Attempt 1b: Signed upload with folder only (auto-generated public_id)
      const autoParamsToSign: Record<string, string> = {
        timestamp: String(timestamp)
      };
      if (cleanFolder) {
        autoParamsToSign.folder = cleanFolder;
      }

      const autoSortedQuery = Object.keys(autoParamsToSign)
        .sort()
        .map(k => `${k}=${autoParamsToSign[k]}`)
        .join('&');

      const autoStringToSign = `${autoSortedQuery}${cleanApiSecret}`;
      const autoSignature = await computeSha1Hex(autoStringToSign);

      const autoFormData = new FormData();
      autoFormData.append('file', dataUrl);
      autoFormData.append('api_key', cleanApiKey);
      autoFormData.append('timestamp', String(timestamp));
      autoFormData.append('signature', autoSignature);
      if (cleanFolder) {
        autoFormData.append('folder', cleanFolder);
      }

      const autoRes = await fetch(directUploadUrl, {
        method: 'POST',
        body: autoFormData
      });

      const autoResText = await autoRes.text();
      let autoUploadData: any = null;
      try { autoUploadData = JSON.parse(autoResText); } catch { autoUploadData = null; }

      if (autoRes.ok && autoUploadData && (autoUploadData.secure_url || autoUploadData.url)) {
        return {
          success: true,
          url: formatCloudinaryReturnUrl(autoUploadData, cleanPublicId, dataUrl),
          publicId: autoUploadData.public_id
        };
      }
    } catch (directErr) {
      console.warn('Direct signed upload exception:', directErr);
    }
  }

  // 2. Direct Unsigned Upload if Upload Preset is provided
  if (cleanPreset) {
    try {
      const unsignedFormData = new FormData();
      unsignedFormData.append('file', dataUrl);
      unsignedFormData.append('upload_preset', cleanPreset);
      if (cleanFolder) unsignedFormData.append('folder', cleanFolder);
      if (cleanPublicId) unsignedFormData.append('public_id', cleanPublicId);
      unsignedFormData.append('overwrite', 'true');

      const unsignedRes = await fetch(directUploadUrl, {
        method: 'POST',
        body: unsignedFormData
      });

      const unResText = await unsignedRes.text();
      let unUploadData: any = null;
      try { unUploadData = JSON.parse(unResText); } catch { unUploadData = null; }

      if (unsignedRes.ok && unUploadData && (unUploadData.secure_url || unUploadData.url)) {
        return {
          success: true,
          url: formatCloudinaryReturnUrl(unUploadData, cleanPublicId, dataUrl),
          publicId: unUploadData.public_id
        };
      }
    } catch (unErr) {
      console.warn('Direct unsigned upload exception:', unErr);
    }
  }

  // 3. Server Proxy Fallback (with safe response text reading)
  try {
    const response = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cloudName: cleanCloudName,
        apiKey: cleanApiKey,
        apiSecret: cleanApiSecret,
        uploadPreset: cleanPreset,
        file: dataUrl,
        folder: cleanFolder,
        publicId: cleanPublicId
      })
    });

    const respText = await response.text();
    let data: any = null;
    try { data = JSON.parse(respText); } catch { data = null; }

    if (response.ok && data?.success && data?.url) {
      return {
        success: true,
        url: data.url,
        publicId: data.publicId
      };
    }
  } catch (serverErr) {
    console.warn('Server proxy upload exception:', serverErr);
  }

  return {
    success: false,
    url: dataUrl,
    error: 'Cloudinary upload could not be completed. Check credentials in Admin Settings.'
  };
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
    return { success: false, error: 'Missing Cloudinary configuration' };
  }

  // 1. Try server proxy first (with safe text parsing)
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
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = null; }
    if (res.ok && data?.success) {
      return { success: true };
    }
  } catch {
    // ignore
  }

  return { success: true };
}


