import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

      const recipientList = Array.isArray(recipients)
        ? recipients.map((r: string) => String(r).trim()).filter(Boolean)
        : String(recipients).split(",").map((r: string) => r.trim()).filter(Boolean);

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
        saveToSentItems: "true"
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
