<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';

if (has_any_user()) {
    header('Location: login.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        $error = 'Token keamanan tidak valid. Muat ulang halaman.';
    } else {
        $username = trim((string) ($_POST['username'] ?? ''));
        $fullName = trim((string) ($_POST['full_name'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');

        if (!preg_match('/^[a-zA-Z0-9_.-]{3,30}$/', $username)) {
            $error = 'Username harus 3–30 karakter (huruf, angka, titik, atau garis bawah).';
        } elseif (mb_strlen($fullName) < 2) {
            $error = 'Nama lengkap minimal 2 karakter.';
        } elseif (strlen($password) < 6) {
            $error = 'Kata sandi minimal 6 karakter.';
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = db()->prepare(
                'INSERT INTO users (username, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)'
            );
            $stmt->execute([$username, $fullName, $hash, 'admin']);
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) db()->lastInsertId();
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
  <title>Aktivasi Akun Kasir Pertama — KasirKita</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
  <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8">
    <h1 class="text-xl font-bold tracking-tight">Aktivasi Karyawan Pertama</h1>
    <p class="mt-1 text-sm text-slate-500">Buat akun Admin/Supervisor toko sebelum mulai menggunakan kasir.</p>
    <?php if ($error): ?>
      <div class="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"><?= e($error) ?></div>
    <?php endif; ?>
    <form method="post" class="mt-6 space-y-4">
      <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
        <input name="full_name" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Contoh: Budi Santoso">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Username Karyawan</label>
        <input name="username" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Contoh: admin_toko">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Kata Sandi (min. 6 karakter)</label>
        <input type="password" name="password" required minlength="6" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
      </div>
      <button type="submit" class="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-medium text-sm rounded-lg">
        Aktifkan &amp; Masuk Kasir
      </button>
    </form>
  </div>
</body>
</html>
