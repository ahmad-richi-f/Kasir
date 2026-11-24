import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, Store, UserCheck } from 'lucide-react';
import type { EmployeeUser } from '../types';

interface AuthScreenProps {
  needsSetup: boolean;
  onAuthenticated: (token: string, user: EmployeeUser) => void;
}

export function AuthScreen({ needsSetup, onAuthenticated }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = needsSetup ? '/api/auth/setup' : '/api/auth/login';
      const body = needsSetup
        ? { username: username.trim(), fullName: fullName.trim(), password }
        : { username: username.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Autentikasi gagal. Periksa kembali data Anda.');
        return;
      }
      onAuthenticated(data.token, data.user);
    } catch {
      setError('Gagal terhubung ke server kasir.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-sm">
        {/* Left Editorial Store Showcase */}
        <div className="lg:col-span-6 relative min-h-[260px] lg:min-h-[600px] bg-slate-900 overflow-hidden flex flex-col justify-between p-8 text-white">
          {!imgError ? (
            <img
              src="/src/assets/images/pos_login_counter_1795481806376.jpg"
              alt="Suasana meja kasir modern Toko KasirKita"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/50 to-slate-950/35" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block leading-none">
                KasirKita POS
              </span>
              <span className="text-xs text-slate-300 mt-1 block">
                Sistem Kasir &amp; Inventaris Toko
              </span>
            </div>
          </div>

          <div className="relative z-10 space-y-5 pt-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug text-balance">
              Kelola transaksi harian, stok gudang, dan laporan toko dalam satu meja kasir.
            </h2>

            <div className="pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-200">
              <div>
                <p className="font-semibold text-white">Tunai &amp; QRIS</p>
                <p className="text-slate-300 mt-0.5">Hitung kembalian &amp; QR dinamis otomatis</p>
              </div>
              <div>
                <p className="font-semibold text-white">Notifikasi Stok</p>
                <p className="text-slate-300 mt-0.5">Peringatan dini saat barang menipis</p>
              </div>
              <div>
                <p className="font-semibold text-white">Ekspor Laporan</p>
                <p className="text-slate-300 mt-0.5">Rekap harian Excel &amp; PDF siap cetak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Employee Auth Form */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
              {needsSetup ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Langkah Awal Sistem</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Akses Terbatas Karyawan</span>
                </>
              )}
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {needsSetup ? 'Aktivasi Akun Kasir Pertama' : 'Masuk ke Terminal Kasir'}
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {needsSetup
                ? 'Daftarkan akun Admin/Supervisor pertama untuk membuka akses kasir, stok barang, dan laporan penjualan.'
                : 'Masukkan username dan kata sandi karyawan yang terdaftar untuk memulai shift kerja.'}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {needsSetup && (
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Lengkap Karyawan
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Rina Wijaya"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                  />
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username Karyawan
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={needsSetup ? 'Contoh: admin_kasir' : 'Masukkan username'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata Sandi {needsSetup && '(min. 6 karakter)'}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={needsSetup ? 6 : 1}
                    autoComplete={needsSetup ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
              >
                {submitting
                  ? 'Memproses...'
                  : needsSetup
                    ? 'Aktifkan Akun & Buka Kasir'
                    : 'Masuk Shift Kasir'}
              </button>
            </form>

            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center gap-2.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Autentikasi terenkripsi scrypt dengan verifikasi sesi server aktif.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
