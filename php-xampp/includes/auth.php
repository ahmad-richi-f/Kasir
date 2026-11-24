<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_strict_mode', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Strict',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function format_rupiah(float|int|string $amount): string
{
    return 'Rp ' . number_format((float) $amount, 0, ',', '.');
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(?string $token): bool
{
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

function has_any_user(): bool
{
    $count = (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    return $count > 0;
}

function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, username, full_name, role, is_active FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([(int) $_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user || (int) $user['is_active'] !== 1) {
        return null;
    }
    return $user;
}

function require_login(): array
{
    if (!has_any_user()) {
        header('Location: setup.php');
        exit;
    }
    $user = current_user();
    if (!$user) {
        $_SESSION = [];
        header('Location: login.php');
        exit;
    }
    return $user;
}

function get_low_stock_products(): array
{
    $stmt = db()->query(
        'SELECT id, sku, name, category, stock, min_stock, unit
         FROM products
         WHERE stock <= min_stock
         ORDER BY stock ASC, name ASC'
    );
    return $stmt->fetchAll();
}
