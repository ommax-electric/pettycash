import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Send Email via Microsoft Graph API (OAuth Client Credentials Flow for Office 365 / Shared Mailbox)
  app.post("/api/send-email", async (req, res) => {
    try {
      const { tenantId, clientId, clientSecret, senderEmail, senderName, recipients, subject, body } = req.body;

      if (!tenantId || !clientId || !clientSecret || !senderEmail) {
        return res.status(400).json({
          error: "Missing required Microsoft Graph API parameters: tenantId, clientId, clientSecret, or senderEmail"
        });
      }

      if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
        return res.status(400).json({ error: "No recipient email addresses provided" });
      }

      const rawRecipients = Array.isArray(recipients)
        ? recipients.map((r: string) => String(r).trim()).filter(Boolean)
        : String(recipients).split(",").map((r: string) => r.trim()).filter(Boolean);

      const uniqueRecipientsSet = new Set<string>();
      const recipientList: string[] = [];

      for (const email of rawRecipients) {
        const lower = email.toLowerCase();
        if (!uniqueRecipientsSet.has(lower)) {
          uniqueRecipientsSet.add(lower);
          recipientList.push(email);
        }
      }

      if (recipientList.length === 0) {
        return res.status(400).json({ error: "No valid recipient email addresses found" });
      }

      console.log(`[MS Graph API] Requesting OAuth Token for Tenant: ${tenantId}, Client ID: ${clientId}`);

      // 1. Acquire OAuth token from Microsoft Identity Platform
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

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        console.warn("[MS Graph API] Token Acquisition Failed:", tokenData);
        return res.status(tokenRes.status || 400).json({
          error: tokenData.error_description || tokenData.error || "Failed to authenticate with Microsoft Identity Platform",
          details: tokenData
        });
      }

      const accessToken = tokenData.access_token;
      console.log(`[MS Graph API] OAuth Token acquired successfully. Dispatching email via sender: ${senderEmail}...`);

      // 2. Dispatch email via MS Graph sendMail endpoint
      const graphMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

      const emailPayload = {
        message: {
          subject: subject || "Petty Cash Alert",
          body: {
            contentType: "HTML",
            content: body || ""
          },
          toRecipients: recipientList.map((email: string) => ({
            emailAddress: { address: email }
          }))
        },
        saveToSentItems: true
      };

      const mailRes = await fetch(graphMailUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      if (mailRes.ok || mailRes.status === 202) {
        console.log("[MS Graph API] Email sent successfully to recipients:", recipientList);
        return res.json({
          success: true,
          status: mailRes.status,
          message: `Email alert successfully sent via Microsoft Graph API from ${senderEmail} (${senderName || 'Petty Cash Desk'}) to ${recipientList.join(", ")}`
        });
      } else {
        const mailErrorText = await mailRes.text();
        let mailErrorJson;
        try {
          mailErrorJson = JSON.parse(mailErrorText);
        } catch {
          mailErrorJson = { raw: mailErrorText };
        }
        console.warn("[MS Graph API] Email send failed:", mailRes.status, mailErrorText);
        return res.status(mailRes.status).json({
          error: mailErrorJson.error?.message || `Microsoft Graph API returned HTTP ${mailRes.status}`,
          details: mailErrorJson
        });
      }
    } catch (err: any) {
      console.error("[MS Graph API] Exception:", err);
      return res.status(500).json({ error: err.message || "Failed to send email via Microsoft Graph API" });
    }
  });

  // API Route: Download external legacy attachments (e.g. Cloudinary PDFs) server-side to bypass CORS and return Base64 Data URL
  app.post("/api/fetch-external-file", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string" || !url.startsWith("http")) {
        return res.status(400).json({ error: "Invalid or missing URL parameter" });
      }

      console.log(`[File Proxy] Fetching external file server-side: ${url}`);
      const fileRes = await fetch(url);

      if (!fileRes.ok) {
        return res.status(fileRes.status).json({ error: `Failed to fetch external file: ${fileRes.statusText}` });
      }

      const contentType = fileRes.headers.get("content-type") || "application/pdf";
      const arrayBuffer = await fileRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;

      console.log(`[File Proxy] Successfully downloaded and converted file (${buffer.length} bytes, type: ${contentType})`);
      return res.json({ success: true, contentType, size: buffer.length, dataUrl });
    } catch (err: any) {
      console.error("[File Proxy] Error fetching external file:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch external file" });
    }
  });

  // API Route: Test Cloudinary Connection
  app.post("/api/cloudinary/test-connection", async (req, res) => {
    try {
      const { cloudName, apiKey, apiSecret, uploadPreset } = req.body;
      if (!cloudName) {
        return res.status(400).json({ error: "Cloudinary Cloud Name is required." });
      }

      if (apiKey && apiSecret) {
        // Authenticated Ping via Cloudinary REST Admin API
        const authString = Buffer.from(`${apiKey.trim()}:${apiSecret.trim()}`).toString("base64");
        const pingRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName.trim()}/ping`, {
          headers: { Authorization: `Basic ${authString}` }
        });

        if (!pingRes.ok) {
          const errorText = await pingRes.text();
          return res.status(pingRes.status).json({
            error: "Cloudinary authentication failed. Please verify API Key & API Secret.",
            details: errorText
          });
        }

        return res.json({
          success: true,
          message: `Successfully connected to Cloudinary Cloud Name: '${cloudName.trim()}' using API Key & Secret!`
        });
      } else if (uploadPreset) {
        // Ping Cloudinary ping endpoint for cloud name
        const pingRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName.trim()}/ping`);
        if (!pingRes.ok) {
          return res.status(400).json({ error: `Could not reach Cloudinary cloud '${cloudName.trim()}'. Check Cloud Name.` });
        }
        return res.json({
          success: true,
          message: `Successfully reached Cloudinary Cloud Name: '${cloudName.trim()}' with Upload Preset '${uploadPreset.trim()}'!`
        });
      } else {
        return res.status(400).json({ error: "Either API Key & API Secret OR Upload Preset is required." });
      }
    } catch (err: any) {
      console.error("[Cloudinary Test Error]", err);
      return res.status(500).json({ error: err.message || "Failed to connect to Cloudinary" });
    }
  });

  // API Route: Upload File to Cloudinary
  app.post("/api/cloudinary/upload", async (req, res) => {
    try {
      const { cloudName, apiKey, apiSecret, uploadPreset, file, folder, publicId } = req.body;

      if (!cloudName) {
        return res.status(400).json({ error: "Missing Cloud Name" });
      }
      if (!file) {
        return res.status(400).json({ error: "Missing file payload" });
      }

      const cleanCloudName = cloudName.trim();
      const cleanApiKey = apiKey?.trim();
      const cleanApiSecret = apiSecret?.trim();
      const cleanPreset = uploadPreset?.trim();
      const cleanFolder = folder?.trim();
      const rawPublicId = publicId?.trim();
      const cleanPublicId = rawPublicId ? rawPublicId.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') : undefined;

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cleanCloudName}/auto/upload`;

      // Helper to ensure returned URL always has proper extension
      const formatReturnUrl = (uploadData: any): string => {
        let finalUrl = uploadData.secure_url || uploadData.url || "";
        if (!finalUrl) return finalUrl;

        // Check if URL already ends with extension
        if (/\.(pdf|png|jpg|jpeg|webp|gif|svg|bmp)(\?.*)?$/i.test(finalUrl)) {
          return finalUrl;
        }

        // Determine extension from upload data or publicId
        let ext = uploadData.format;
        if (!ext && cleanPublicId) {
          const m = cleanPublicId.match(/\.([a-zA-Z0-9]+)$/);
          if (m) ext = m[1];
        }
        if (!ext && file && file.startsWith("data:")) {
          if (file.startsWith("data:application/pdf")) ext = "pdf";
          else if (file.startsWith("data:image/jpeg") || file.startsWith("data:image/jpg")) ext = "jpg";
          else if (file.startsWith("data:image/png")) ext = "png";
          else if (file.startsWith("data:image/webp")) ext = "webp";
        }

        if (ext) {
          return `${finalUrl}.${ext}`;
        }
        return finalUrl;
      };

      let lastErrorMsg = "";

      // 1. Signed Upload Attempts (if API Key & Secret are provided)
      if (cleanApiKey && cleanApiSecret) {
        const timestamp = Math.floor(Date.now() / 1000);

        // 1a. Try Signed Upload with folder and custom public_id (pure create action)
        if (cleanPublicId) {
          const formData = new URLSearchParams();
          formData.append("file", file);
          formData.append("api_key", cleanApiKey);
          formData.append("timestamp", String(timestamp));
          formData.append("overwrite", "true");

          const paramsToSign: Record<string, string> = { 
            timestamp: String(timestamp),
            overwrite: "true"
          };
          if (cleanFolder) {
            formData.append("folder", cleanFolder);
            paramsToSign.folder = cleanFolder;
          }
          formData.append("public_id", cleanPublicId);
          paramsToSign.public_id = cleanPublicId;

          const sortedQuery = Object.keys(paramsToSign)
            .sort()
            .map(k => `${k}=${paramsToSign[k]}`)
            .join("&");

          const stringToSign = `${sortedQuery}${cleanApiSecret}`;
          const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");
          formData.append("signature", signature);

          const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            return res.json({
              success: true,
              url: formatReturnUrl(uploadData),
              publicId: uploadData.public_id,
              format: uploadData.format,
              bytes: uploadData.bytes
            });
          }

          const errTxt = await uploadRes.text();
          try {
            const parsed = JSON.parse(errTxt);
            lastErrorMsg = parsed?.error?.message || errTxt;
          } catch {
            lastErrorMsg = errTxt;
          }
        }

        // 1b. Try Signed Upload WITHOUT custom public_id (let Cloudinary auto-generate public_id)
        const autoFormData = new URLSearchParams();
        autoFormData.append("file", file);
        autoFormData.append("api_key", cleanApiKey);
        autoFormData.append("timestamp", String(timestamp));

        const autoParamsToSign: Record<string, string> = { timestamp: String(timestamp) };
        if (cleanFolder) {
          autoFormData.append("folder", cleanFolder);
          autoParamsToSign.folder = cleanFolder;
        }

        const autoQuery = Object.keys(autoParamsToSign)
          .sort()
          .map(k => `${k}=${autoParamsToSign[k]}`)
          .join("&");

        const autoStringToSign = `${autoQuery}${cleanApiSecret}`;
        const autoSignature = crypto.createHash("sha1").update(autoStringToSign).digest("hex");
        autoFormData.append("signature", autoSignature);

        const autoUploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: autoFormData.toString()
        });

        if (autoUploadRes.ok) {
          const uploadData = await autoUploadRes.json();
          return res.json({
            success: true,
            url: formatReturnUrl(uploadData),
            publicId: uploadData.public_id,
            format: uploadData.format,
            bytes: uploadData.bytes
          });
        }

        const autoErrTxt = await autoUploadRes.text();
        try {
          const parsed = JSON.parse(autoErrTxt);
          lastErrorMsg = parsed?.error?.message || autoErrTxt;
        } catch {
          lastErrorMsg = autoErrTxt;
        }
      }

      // 2. Unsigned Upload Fallback (if Upload Preset is provided)
      if (cleanPreset) {
        // 2a. Unsigned with folder and public_id
        const unsignedFormData = new URLSearchParams();
        unsignedFormData.append("file", file);
        unsignedFormData.append("upload_preset", cleanPreset);
        if (cleanFolder) unsignedFormData.append("folder", cleanFolder);
        if (cleanPublicId) unsignedFormData.append("public_id", cleanPublicId);
        unsignedFormData.append("overwrite", "true");

        const unsignedRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: unsignedFormData.toString()
        });

        if (unsignedRes.ok) {
          const uploadData = await unsignedRes.json();
          return res.json({
            success: true,
            url: formatReturnUrl(uploadData),
            publicId: uploadData.public_id,
            format: uploadData.format,
            bytes: uploadData.bytes
          });
        }

        // 2b. Simple Unsigned with preset only
        const simpleFormData = new URLSearchParams();
        simpleFormData.append("file", file);
        simpleFormData.append("upload_preset", cleanPreset);

        const simpleRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: simpleFormData.toString()
        });

        if (simpleRes.ok) {
          const uploadData = await simpleRes.json();
          return res.json({
            success: true,
            url: formatReturnUrl(uploadData),
            publicId: uploadData.public_id,
            format: uploadData.format,
            bytes: uploadData.bytes
          });
        }

        const simpleErrTxt = await simpleRes.text();
        try {
          const parsed = JSON.parse(simpleErrTxt);
          lastErrorMsg = parsed?.error?.message || simpleErrTxt;
        } catch {
          lastErrorMsg = simpleErrTxt;
        }
      }

      if (lastErrorMsg.includes("missing permissions") || lastErrorMsg.includes("actions=") || lastErrorMsg.includes("forbidden")) {
        return res.status(403).json({
          error: "Your Cloudinary API Key lacks upload permissions. Please verify API Key & Secret in Cloudinary Dashboard, or create an Unsigned Upload Preset in Cloudinary (Settings > Upload > Add upload preset) and set preset name to 'petty_cash_receipts'."
        });
      }

      return res.status(400).json({ error: "Cloudinary upload failed: " + (lastErrorMsg || "Check API Key, API Secret, or Upload Preset configuration.") });
    } catch (err: any) {
      console.error("[Cloudinary Upload Error]", err);
      return res.status(500).json({ error: err.message || "Failed to upload file to Cloudinary" });
    }
  });

  // API Route: Delete File from Cloudinary
  app.post("/api/cloudinary/delete", async (req, res) => {
    try {
      const { cloudName, apiKey, apiSecret, fileUrl, publicId, resourceType } = req.body;

      const cleanCloudName = (cloudName || process.env.CLOUDINARY_CLOUD_NAME || "").trim();
      const cleanApiKey = (apiKey || process.env.CLOUDINARY_API_KEY || "").trim();
      const cleanApiSecret = (apiSecret || process.env.CLOUDINARY_API_SECRET || "").trim();

      if (!cleanCloudName) {
        return res.status(400).json({ error: "Missing Cloud Name" });
      }
      if (!cleanApiKey || !cleanApiSecret) {
        return res.status(400).json({ error: "Cloudinary API Key and API Secret are required to delete files from Cloudinary." });
      }
      if (!fileUrl && !publicId) {
        return res.status(400).json({ error: "Missing fileUrl or publicId parameter." });
      }

      let extractedFullPath = "";
      let extractedCleanPath = "";
      let extractedResourceType = resourceType?.trim() || "image";

      if (fileUrl && fileUrl.includes("cloudinary.com")) {
        try {
          const urlObj = new URL(fileUrl);
          const pathParts = urlObj.pathname.split("/").filter(Boolean);
          const uploadIdx = pathParts.indexOf("upload");
          if (uploadIdx > 0) {
            extractedResourceType = pathParts[uploadIdx - 1] || "image";
            let remaining = pathParts.slice(uploadIdx + 1);
            
            // Look for version segment /v1234567890/
            const versionIdx = remaining.findIndex(p => /^v\d+$/.test(p));
            if (versionIdx !== -1) {
              remaining = remaining.slice(versionIdx + 1);
            } else {
              // Skip signature or known transformation segments if no version segment is found
              while (remaining.length > 1) {
                const seg = remaining[0];
                if (
                  seg.startsWith("s--") || 
                  seg.includes(",") || 
                  /^(c|w|h|q|f|e|b|ar|l|u|o|x|y|g|d|a|fl|pg|so|eo|co|bo|p|r|m|vs|du|dn|if|end|fps|ki|dl)_[a-zA-Z0-9:-]+$/i.test(seg)
                ) {
                  remaining = remaining.slice(1);
                } else {
                  break;
                }
              }
            }
            extractedFullPath = decodeURIComponent(remaining.join("/"));
            extractedCleanPath = extractedFullPath.replace(/\.[a-zA-Z0-9]+$/, "");
          }
        } catch (e) {
          console.warn("[Cloudinary Delete] URL parsing exception:", e);
        }
      }

      if (!extractedFullPath && publicId) {
        extractedFullPath = publicId.trim();
        extractedCleanPath = extractedFullPath.replace(/\.[a-zA-Z0-9]+$/, "");
      }

      if (!extractedFullPath && !extractedCleanPath) {
        return res.status(400).json({ error: "Could not determine Cloudinary public_id from provided URL or publicId." });
      }

      const altResourceType = extractedResourceType === "image" ? "raw" : "image";

      // Build unique candidate list of (resourceType, publicId)
      const candidateList: Array<{ rType: string; pid: string }> = [];
      const addCand = (rType: string, pid: string) => {
        if (!pid) return;
        const cleanPid = pid.trim();
        if (cleanPid && !candidateList.some(c => c.rType === rType && c.pid === cleanPid)) {
          candidateList.push({ rType, pid: cleanPid });
        }
      };

      // If explicit publicId passed, add it first!
      if (publicId && publicId.trim()) {
        const p = publicId.trim();
        const pClean = p.replace(/\.[a-zA-Z0-9]+$/, "");
        addCand(extractedResourceType, p);
        addCand(extractedResourceType, pClean);
        addCand(altResourceType, p);
        addCand(altResourceType, pClean);
      }

      addCand(extractedResourceType, extractedCleanPath);
      addCand(extractedResourceType, extractedFullPath);
      addCand(altResourceType, extractedCleanPath);
      addCand(altResourceType, extractedFullPath);

      if (/\.(pdf)$/i.test(fileUrl || extractedFullPath)) {
        addCand("image", `${extractedCleanPath}.pdf`);
        addCand("raw", `${extractedCleanPath}.pdf`);
        addCand("image", `${extractedFullPath}.pdf`);
        addCand("raw", `${extractedFullPath}.pdf`);
      }

      console.log(`[Cloudinary Delete] Attempting delete across ${candidateList.length} candidates for URL: ${fileUrl || publicId}`);

      // 1. Primary Method: Cloudinary Admin API Delete Resources endpoint using Basic Auth
      const authHeader = "Basic " + Buffer.from(`${cleanApiKey}:${cleanApiSecret}`).toString("base64");
      const rTypesToTry = Array.from(new Set([extractedResourceType, altResourceType, "image", "raw"]));

      for (const rType of rTypesToTry) {
        const pidsForType = Array.from(new Set(candidateList.map(c => c.pid)));
        if (!pidsForType.length) continue;

        const searchParams = new URLSearchParams();
        for (const pid of pidsForType) {
          searchParams.append("public_ids[]", pid);
        }
        searchParams.append("invalidate", "true");

        const adminUrl = `https://api.cloudinary.com/v1_1/${cleanCloudName}/resources/${rType}/upload?${searchParams.toString()}`;

        try {
          const adminRes = await fetch(adminUrl, {
            method: "DELETE",
            headers: {
              "Authorization": authHeader
            }
          });

          if (adminRes.ok) {
            const adminData = await adminRes.json();
            console.log(`[Cloudinary Admin API Delete Response ${rType}]`, adminData);
            if (adminData.deleted) {
              let deletedCount = 0;
              for (const [pidKey, status] of Object.entries(adminData.deleted)) {
                if (status === "deleted") {
                  deletedCount++;
                  console.log(`[Cloudinary Admin API Delete SUCCESS] Deleted asset '${pidKey}' (${rType})`);
                }
              }
              if (deletedCount > 0) {
                return res.json({ success: true, result: "ok", method: "admin_api", resourceType: rType, details: adminData });
              }
            }
          } else {
            const errTxt = await adminRes.text();
            console.warn(`[Cloudinary Admin API Delete Non-200 ${rType}] Status: ${adminRes.status}`, errTxt);
          }
        } catch (err) {
          console.warn(`[Cloudinary Admin API Exception ${rType}]`, err);
        }
      }

      // 2. Secondary Method: Upload API destroy endpoint
      let lastDestroyResult: any = null;

      for (const cand of candidateList) {
        const timestamp = Math.floor(Date.now() / 1000);

        // Try Method A: Standard destroy signature with invalidate
        const toSignWithInvalidate = `invalidate=true&public_id=${cand.pid}&timestamp=${timestamp}${cleanApiSecret}`;
        const signatureA = crypto.createHash("sha1").update(toSignWithInvalidate).digest("hex");
        const destroyUrl = `https://api.cloudinary.com/v1_1/${cleanCloudName}/${cand.rType}/destroy`;

        const paramsA = new URLSearchParams({
          public_id: cand.pid,
          timestamp: String(timestamp),
          api_key: cleanApiKey,
          signature: signatureA,
          invalidate: "true"
        });

        try {
          const destroyResA = await fetch(destroyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: paramsA.toString()
          });
          const destroyDataA = await destroyResA.json();
          console.log(`[Cloudinary Delete Attempt A] '${cand.pid}' (${cand.rType}):`, destroyDataA);

          if (destroyDataA.result === "ok") {
            console.log(`[Cloudinary Delete SUCCESS] Successfully destroyed asset '${cand.pid}' (${cand.rType})`);
            return res.json({ success: true, result: "ok", publicId: cand.pid, resourceType: cand.rType });
          }
          lastDestroyResult = destroyDataA;

          // If signature failed or invalid, try Method B without invalidate param in signature
          if (destroyDataA.error?.message?.toLowerCase().includes("signature")) {
            const toSignSimple = `public_id=${cand.pid}&timestamp=${timestamp}${cleanApiSecret}`;
            const signatureB = crypto.createHash("sha1").update(toSignSimple).digest("hex");
            const paramsB = new URLSearchParams({
              public_id: cand.pid,
              timestamp: String(timestamp),
              api_key: cleanApiKey,
              signature: signatureB
            });

            const destroyResB = await fetch(destroyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: paramsB.toString()
            });
            const destroyDataB = await destroyResB.json();
            console.log(`[Cloudinary Delete Attempt B] '${cand.pid}' (${cand.rType}):`, destroyDataB);

            if (destroyDataB.result === "ok") {
              console.log(`[Cloudinary Delete SUCCESS Method B] Successfully destroyed asset '${cand.pid}' (${cand.rType})`);
              return res.json({ success: true, result: "ok", publicId: cand.pid, resourceType: cand.rType });
            }
            lastDestroyResult = destroyDataB;
          }
        } catch (err: any) {
          console.warn(`[Cloudinary Delete Candidate Exception] '${cand.pid}' (${cand.rType}):`, err);
        }
      }

      // If we checked all candidates and none returned "ok", but last result was "not_found", consider asset gone
      const isNotFound = lastDestroyResult?.result === "not_found" || !lastDestroyResult;
      return res.json({
        success: isNotFound,
        result: isNotFound ? "not_found" : (lastDestroyResult?.result || "failed"),
        details: lastDestroyResult
      });
    } catch (err: any) {
      console.error("[Cloudinary Delete Error]", err);
      return res.status(500).json({ error: err.message || "Failed to delete file from Cloudinary" });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
