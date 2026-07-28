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
    let { url, username, password, phoneNumbers, message } = req.body || {};

    let targetUrl = url || 'https://api.sms-gate.app/3rdparty/v1/message';
    if (!targetUrl || targetUrl.includes('mobile/v1') || targetUrl === 'https://api.sms-gate.app' || targetUrl === 'https://api.sms-gate.app/') {
      targetUrl = 'https://api.sms-gate.app/3rdparty/v1/message';
    }

    const authHeader = 'Basic ' + Buffer.from(`${username || 'WRJ0SQ'}:${password || 'sdoaxryxfmy5qh'}`).toString('base64');

    const smsRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        phoneNumbers: Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers],
        message: message || ''
      })
    });

    const smsData: any = await smsRes.json().catch(() => null);

    if (smsRes.ok) {
      return res.status(200).json({
        success: true,
        data: smsData
      });
    } else {
      return res.status(smsRes.status || 500).json({
        error: `SMS Gate API returned HTTP ${smsRes.status}`,
        details: smsData
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
