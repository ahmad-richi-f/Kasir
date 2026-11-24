<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';

if (!has_any_user()) {
    header('Location: setup.php');
    exit;
}

if (current_user()) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        $error = 'Token keamanan tidak valid. Silakan coba lagi.';
    } else {
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');

        $stmt = db()->prepare('SELECT id, password_hash, is_active FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || (int) $user['is_active'] !== 1 || !password_verify($password, $user['password_hash'])) {
            $error = 'Username atau kata sandi karyawan salah.';
        } else {
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $user['id'];
            header('Location: index.php');
            exit;
        }
    }
}
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login Karyawan — KasirKita POS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
  <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8">
    <h1 class="text-xl font-bold tracking-tight">KasirKita POS</h1>
    <p class="mt-1 text-sm text-slate-500">Masuk khusus karyawan toko untuk membuka terminal kasir.</p>
    <?php if ($error): ?>
      <div class="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"><?= e($error) ?></div>
    <?php endif; ?>
    <form method="post" class="mt-6 space-y-4">
      <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Username Karyawan</label>
        <input name="username" required autofocus class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Kata Sandi</label>
        <input type="password" name="password" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
      </div>
      <button type="submit" class="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-medium text-sm rounded-lg">
        Masuk Kasir
      </button>
    </form>
  </div>
</body>
</html>
