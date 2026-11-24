import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import type { EmployeeRecord, EmployeeUser } from '../types';
import { formatDateTime } from '../utils/format';

interface EmployeesViewProps {
  authToken: string;
  currentUser: EmployeeUser;
}

export function EmployeesView({ authToken, currentUser }: EmployeesViewProps) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'kasir' | 'admin'>('kasir');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  async function handleCreateEmployee(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          username: username.trim(),
          fullName: fullName.trim(),
          password,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menambah karyawan.');
        return;
      }
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('kasir');
      setMessage(`Akun karyawan ${data.employee.fullName} berhasil dibuat.`);
      await loadEmployees();
    } catch {
      setErrorMsg('Gagal menghubungi server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(emp: EmployeeRecord) {
    const res = await fetch(`/api/employees/${emp.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ isActive: !emp.isActive }),
    });
    if (res.ok) {
      await loadEmployees();
    }
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
        Hanya Admin yang memiliki izin untuk menambahkan atau mengelola akun karyawan.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Manajemen Akun Karyawan (Khusus Admin)</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Hanya Admin yang dapat menambahkan akun kasir baru atau mengelola akses login karyawan toko.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
          <UserPlus className="w-4 h-4 text-teal-700" />
          <span>Tambah Karyawan Baru</span>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama Lengkap"
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username login"
            className="px-3 py-2 border border-slate-300 rounded-lg font-mono"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kata sandi (min. 6)"
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'kasir' | 'admin')}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="kasir">Kasir</option>
            <option value="admin">Admin / Supervisor</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg cursor-pointer"
          >
            {submitting ? 'Menyimpan...' : 'Tambah Akun'}
          </button>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Nama Lengkap</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Jabatan</th>
              <th className="px-4 py-3">Terdaftar</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                  Memuat daftar karyawan...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                  Belum ada data karyawan tersimpan di database lokal.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{emp.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{emp.username}</td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-700">{emp.role}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {formatDateTime(emp.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {emp.isActive ? (
                      <span className="text-emerald-700 font-semibold">Aktif</span>
                    ) : (
                      <span className="text-red-700 font-semibold">Nonaktif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {emp.id === currentUser.id ? (
                      <span className="text-xs text-slate-400">Sedang Login</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleActive(emp)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-xs font-medium rounded-lg cursor-pointer"
                      >
                        {emp.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
