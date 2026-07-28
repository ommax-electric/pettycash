export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { tenantId, clientId, clientSecret, senderEmail, recipients, subject, body } = req.body || {};

    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
      return res.status(400).json({ error: 'Missing Microsoft Graph API credentials in request payload.' });
    }

    // 1. Get OAuth access token from Microsoft
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

    const tokenData: any = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(tokenRes.status || 400).json({
        error: tokenData.error_description || tokenData.error || 'Microsoft Graph OAuth authentication failed',
        details: tokenData
      });
    }

    // 2. Send Email via Graph API
    const formattedRecipients = (Array.isArray(recipients) ? recipients : [recipients]).map((email: string) => ({
      emailAddress: { address: email.trim() }
    }));

    const graphMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;
    const emailPayload = {
      message: {
        subject: subject || 'Petty Cash Notification',
        body: {
          contentType: "HTML",
          content: body || ''
        },
        toRecipients: formattedRecipients
      },
      saveToSentItems: "true"
    };

    const mailRes = await fetch(graphMailUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });

    if (mailRes.ok || mailRes.status === 202) {
      return res.status(200).json({
        success: true,
        message: 'Email alert sent successfully via Microsoft Graph API!'
      });
    } else {
      const mailError: any = await mailRes.json().catch(() => ({ message: `HTTP ${mailRes.status}` }));
      return res.status(mailRes.status || 500).json({
        error: mailError.error?.message || 'Failed to send email via Microsoft Graph API',
        details: mailError
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
