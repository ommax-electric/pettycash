<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

$tenantId = trim($data['tenantId'] ?? '');
$clientId = trim($data['clientId'] ?? '');
$clientSecret = trim($data['clientSecret'] ?? '');
$senderEmail = trim($data['senderEmail'] ?? '');
$recipients = $data['recipients'] ?? [];
$subject = $data['subject'] ?? 'Petty Cash Alert';
$body = $data['body'] ?? '';

if (!$tenantId || !$clientId || !$clientSecret || !$senderEmail) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing Microsoft Graph API credentials']);
    exit;
}

// 1. Acquire token
$tokenUrl = "https://login.microsoftonline.com/" . urlencode($tenantId) . "/oauth2/v2.0/token";
$ch = curl_init($tokenUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'scope' => 'https://graph.microsoft.com/.default',
    'grant_type' => 'client_credentials'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$tokenData = json_decode($response, true);
if ($httpCode >= 400 || empty($tokenData['access_token'])) {
    http_response_code($httpCode ?: 400);
    echo json_encode([
        'error' => $tokenData['error_description'] ?? $tokenData['error'] ?? 'Authentication failed',
        'details' => $tokenData
    ]);
    exit;
}

$accessToken = $tokenData['access_token'];

// 2. Send email
$recipientList = is_array($recipients) ? $recipients : explode(',', $recipients);
$formattedRecipients = [];
foreach ($recipientList as $email) {
    $e = trim($email);
    if (!empty($e)) {
        $formattedRecipients[] = ['emailAddress' => ['address' => $e]];
    }
}

$graphUrl = "https://graph.microsoft.com/v1.0/users/" . urlencode($senderEmail) . "/sendMail";
$emailPayload = json_encode([
    'message' => [
        'subject' => $subject,
        'body' => [
            'contentType' => 'HTML',
            'content' => $body
        ],
        'toRecipients' => $formattedRecipients
    ],
    'saveToSentItems' => 'true'
]);

$ch = curl_init($graphUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $emailPayload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
]);

$mailResponse = curl_exec($ch);
$mailCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($mailCode === 200 || $mailCode === 202) {
    echo json_encode([
        'success' => true,
        'message' => 'Email sent successfully via Microsoft Graph API!'
    ]);
} else {
    http_response_code($mailCode ?: 500);
    $mailData = json_decode($mailResponse, true);
    echo json_encode([
        'error' => $mailData['error']['message'] ?? 'Failed to send email via Microsoft Graph API',
        'details' => $mailData
    ]);
}
