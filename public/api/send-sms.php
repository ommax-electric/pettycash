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

$targetUrl = trim($data['url'] ?? 'https://api.sms-gate.app/3rdparty/v1/message');
if (!$targetUrl || strpos($targetUrl, 'mobile/v1') !== false || $targetUrl === 'https://api.sms-gate.app' || $targetUrl === 'https://api.sms-gate.app/') {
    $targetUrl = 'https://api.sms-gate.app/3rdparty/v1/message';
}

$user = trim($data['username'] ?? 'WRJ0SQ');
$pass = trim($data['password'] ?? 'sdoaxryxfmy5qh');
$phoneNumbers = $data['phoneNumbers'] ?? [];
$message = $data['message'] ?? '';

if (empty($phoneNumbers) || empty($message)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing phoneNumbers or message']);
    exit;
}

$recipients = is_array($phoneNumbers) ? $phoneNumbers : [$phoneNumbers];

$payload = json_encode([
    'phoneNumbers' => $recipients,
    'message' => $message
]);

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

$headers = ['Content-Type: application/json'];
if ($user && $pass) {
    $headers[] = 'Authorization: Basic ' . base64_encode("$user:$pass");
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$responseData = json_decode($response, true) ?? ['raw' => $response];

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode([
        'success' => true,
        'data' => $responseData
    ]);
} else {
    http_response_code($httpCode ?: 500);
    echo json_encode([
        'error' => "SMS Gate API returned HTTP $httpCode",
        'details' => $responseData
    ]);
}
