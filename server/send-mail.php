<?php
/**
 * send-mail.php — あとで見る 拡張機能用メール送信API
 * migimigi.cc / CakePHP5環境またはスタンドアロンで使用可能
 *
 * 設置: Nginx jail の適当なパスに置き、Caddy でリバースプロキシ
 * エンドポイント例: https://migimigi.cc/api/send-mail
 *
 * リクエスト: POST JSON { "to": "...", "subject": "...", "body": "..." }
 * レスポンス: JSON { "ok": true } または { "ok": false, "error": "..." }
 */

// ── CORS: 拡張機能からのリクエストを許可 ──────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── 認証トークン（任意・推奨）────────────────────────────────────
// 設定ページで同じトークンを入力してもらう
define('AUTH_TOKEN', getenv('ATOLATER_TOKEN') ?: '');  // 空なら認証スキップ

if (AUTH_TOKEN !== '') {
    $token = $_SERVER['HTTP_X_ATOLATER_TOKEN'] ?? '';
    if (!hash_equals(AUTH_TOKEN, $token)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'unauthorized']);
        exit;
    }
}

// ── 送信元・デフォルト宛先 ────────────────────────────────────────
define('FROM_ADDRESS', 'atolater@migimigi.cc');
define('FROM_NAME',    'あとで見る');
// 安全のため、許可された宛先のみ受け付ける (空配列で全許可)
define('ALLOWED_TO', [
    // 'you@example.com',
]);

// ── リクエスト解析 ────────────────────────────────────────────────
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || empty($data['to']) || empty($data['subject']) || empty($data['body'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'missing fields']);
    exit;
}

$to      = filter_var(trim($data['to']),      FILTER_VALIDATE_EMAIL);
$subject = mb_substr(strip_tags($data['subject']), 0, 200);
$body    = strip_tags($data['body']);

if (!$to) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid email']);
    exit;
}

if (!empty(ALLOWED_TO) && !in_array($to, ALLOWED_TO, true)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'recipient not allowed']);
    exit;
}

// ── メール送信 ─────────────────────────────────────────────────────
$headers  = "From: " . mb_encode_mimeheader(FROM_NAME, 'UTF-8') . " <" . FROM_ADDRESS . ">\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: base64\r\n";
$headers .= "X-Mailer: atolater/1.0\r\n";

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$encodedBody    = base64_encode($body);

$ok = mail($to, $encodedSubject, $encodedBody, $headers);

if ($ok) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail() failed']);
}
