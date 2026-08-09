import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Send SMS via SMS Gate Cloud API (Server-side to bypass CORS)
  app.post("/api/send-sms", async (req, res) => {
    try {
      const { url, username, password, phoneNumbers, message } = req.body;

      if (!phoneNumbers || !message) {
        return res.status(400).json({ error: "Missing required parameters: phoneNumbers or message" });
      }

      let targetUrl = (url || "").trim();
      if (!targetUrl || targetUrl.includes("mobile/v1") || targetUrl === "https://api.sms-gate.app" || targetUrl === "https://api.sms-gate.app/") {
        targetUrl = "https://api.sms-gate.app/3rdparty/v1/message";
      }

      let user = (username || "").trim();
      if (!user) user = "WRJ0SQ";

      let pass = (password || "").trim();
      if (!pass) pass = "sdoaxryxfmy5qh";

      const recipients = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (user && pass) {
        const authString = Buffer.from(`${user}:${pass}`).toString("base64");
        headers["Authorization"] = `Basic ${authString}`;
      }

      const payload = {
        phoneNumbers: recipients,
        message
      };

      console.log(`[SMS Server Proxy] Request to ${targetUrl} for recipients:`, recipients);

      const gatewayResponse = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const responseText = await gatewayResponse.text();
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { raw: responseText };
      }

      if (gatewayResponse.ok) {
        console.log("[SMS Server Proxy] SMS Sent successfully:", responseJson);
        return res.json({ success: true, status: gatewayResponse.status, data: responseJson });
      } else {
        console.warn("[SMS Server Proxy] Gateway HTTP Error:", gatewayResponse.status, responseText);
        return res.status(gatewayResponse.status).json({
          error: `SMS Gate API rejected with status code ${gatewayResponse.status}`,
          details: responseJson
        });
      }
    } catch (err: any) {
      console.error("[SMS Server Proxy] Exception:", err);
      return res.status(500).json({ error: err.message || "Failed to dispatch SMS via gateway" });
    }
  });

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
      const cleanPublicId = publicId?.trim();

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

      // 1. Try Signed Upload if API Key & Secret are provided
      if (cleanApiKey && cleanApiSecret) {
        const timestamp = Math.floor(Date.now() / 1000);
        const formData = new URLSearchParams();
        formData.append("file", file);
        formData.append("api_key", cleanApiKey);
        formData.append("timestamp", String(timestamp));

        const paramsToSign: Record<string, string> = { timestamp: String(timestamp) };
        if (cleanFolder) {
          formData.append("folder", cleanFolder);
          paramsToSign.folder = cleanFolder;
        }
        if (cleanPublicId) {
          formData.append("public_id", cleanPublicId);
          paramsToSign.public_id = cleanPublicId;
        }
        if (cleanPreset) {
          formData.append("upload_preset", cleanPreset);
          paramsToSign.upload_preset = cleanPreset;
        }

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
        let parsedErr = errTxt;
        try {
          const parsed = JSON.parse(errTxt);
          if (parsed?.error?.message) {
            parsedErr = parsed.error.message;
          }
        } catch {
          // ignore
        }

        console.warn("[Cloudinary Signed Upload Failed]", parsedErr);

        // Fallback to Unsigned Upload if preset exists
        if (cleanPreset) {
          const unsignedFormData = new URLSearchParams();
          unsignedFormData.append("file", file);
          unsignedFormData.append("upload_preset", cleanPreset);
          if (cleanFolder) unsignedFormData.append("folder", cleanFolder);
          if (cleanPublicId) unsignedFormData.append("public_id", cleanPublicId);

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

          // Simple Unsigned retry without public_id/folder if preset restricts them
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
        }

        // Return descriptive error if key permissions are missing
        if (parsedErr.includes("missing permissions") || parsedErr.includes("actions=[\"create\"]") || parsedErr.includes("forbidden")) {
          return res.status(403).json({
            error: "Your Cloudinary API Key lacks 'create' permissions. Please check Access Keys in Cloudinary Console, or create an Unsigned Upload Preset in Cloudinary (Settings > Upload > Add upload preset) and enter its name in the Upload Preset field."
          });
        }

        return res.status(uploadRes.status).json({ error: "Cloudinary upload failed: " + parsedErr });
      }

      // 2. Try Unsigned Upload directly if only Upload Preset is provided
      if (cleanPreset) {
        const unsignedFormData = new URLSearchParams();
        unsignedFormData.append("file", file);
        unsignedFormData.append("upload_preset", cleanPreset);
        if (cleanFolder) unsignedFormData.append("folder", cleanFolder);
        if (cleanPublicId) unsignedFormData.append("public_id", cleanPublicId);

        let uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: unsignedFormData.toString()
        });

        if (!uploadRes.ok) {
          const fallbackFormData = new URLSearchParams();
          fallbackFormData.append("file", file);
          fallbackFormData.append("upload_preset", cleanPreset);

          uploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: fallbackFormData.toString()
          });
        }

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
        let parsedErr = errTxt;
        try {
          const parsed = JSON.parse(errTxt);
          if (parsed?.error?.message) {
            parsedErr = parsed.error.message;
          }
        } catch {
          // ignore
        }

        return res.status(uploadRes.status).json({ error: "Cloudinary Unsigned Upload failed: " + parsedErr });
      }

      return res.status(400).json({ error: "Either API Key & API Secret OR an Upload Preset must be configured in Cloudinary settings." });
    } catch (err: any) {
      console.error("[Cloudinary Upload Error]", err);
      return res.status(500).json({ error: err.message || "Failed to upload file to Cloudinary" });
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
