import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    X,
    Loader2,
} from 'lucide-react'
type User = {
  id: number
  name: string
  username: string
  role: 'admin' | 'barge_crew'
  created_at?: string
  updated_at?: string
}

type UserForm = {
  name: string
  username: string
  password: string
  role: 'admin' | 'barge_crew'
}

type NotificationType = 'success' | 'error' | 'warning' | 'loading'

type Notification = {
  type: NotificationType
  title: string
  message: string
}

export default function UserManagement() {
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [notification, setNotification] =
  useState<Notification | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const [form, setForm] = useState<UserForm>({
    name: '',
    username: '',
    password: '',
    role: 'barge_crew',
  })

  


  const showNotification = (
        type: NotificationType,
        title: string,
        message: string,
        ) => {
        setNotification({
            type,
            title,
            message,
        })

        if (type !== 'loading') {
            setTimeout(() => {
            setNotification(null)
            }, 4000)
        }
        }

    const closeNotification = () => {
        setNotification(null)
        }
  // =========================
  // LOAD USERS
  // =========================

  const loadUsers = async () => {
  try {
    setIsLoading(true)

    const params: Record<string, string> = {}

    if (search.trim()) {
      params.search = search.trim()
    }

    if (roleFilter) {
      params.role = roleFilter
    }

    const response = await api.get('/users', {
      params,
    })

    const data = response.data?.data || []

    setUsers(data)
    setFilteredUsers(data)
  } catch (error: any) {
    console.error('Gagal mengambil user:', error)

    const message =
      error.response?.data?.message ||
      'Gagal mengambil data user.'

    showNotification(
        'error',
        'Gagal memuat data user',
        message,
        )
  } finally {
    setIsLoading(false)
  }
}

  useEffect(() => {
    loadUsers()
  }, [])

  // =========================
  // SEARCH & FILTER
  // =========================

  useEffect(() => {
    let result = [...users]

    if (search.trim()) {
      const keyword = search.toLowerCase()

      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(keyword) ||
          user.username.toLowerCase().includes(keyword),
      )
    }

    if (roleFilter) {
      result = result.filter(
        (user) => user.role === roleFilter,
      )
    }

    setFilteredUsers(result)
  }, [search, roleFilter, users])

  // =========================
  // FORM
  // =========================

  const resetForm = () => {
    setForm({
      name: '',
      username: '',
      password: '',
      role: 'barge_crew',
    })

    setEditingUser(null)
  }

  const openAddForm = () => {
    resetForm()
    setShowForm(true)
  }

  const openEditForm = (user: User) => {
    setEditingUser(user)

    setForm({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
    })

    setShowForm(true)
  }

  const closeForm = () => {
    if (isSaving) return

    setShowForm(false)
    resetForm()
  }

  const handleFormChange = (
    field: keyof UserForm,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // =========================
  // SAVE USER
  // =========================

  const handleSubmit = async (
  e: React.FormEvent<HTMLFormElement>,
) => {
  e.preventDefault()

  if (!form.name.trim()) {
    showNotification(
      'warning',
      'Data belum lengkap',
      'Nama wajib diisi.',
    )
    return
  }

  if (!form.username.trim()) {
    showNotification(
      'warning',
      'Data belum lengkap',
      'Username wajib diisi.',
    )
    return
  }

  if (!editingUser && !form.password) {
    showNotification(
      'warning',
      'Password diperlukan',
      'Password wajib diisi untuk user baru.',
    )
    return
  }

  if (form.password && form.password.length < 6) {
    showNotification(
      'warning',
      'Password terlalu pendek',
      'Password harus memiliki minimal 6 karakter.',
    )
    return
  }

  try {
    setIsSaving(true)

    showNotification(
      'loading',
      editingUser
        ? 'Memperbarui user'
        : 'Menambahkan user',
      editingUser
        ? 'Sedang menyimpan perubahan...'
        : 'Sedang membuat akun baru...',
    )

    const payload: {
      name: string
      username: string
      role: 'admin' | 'barge_crew'
      password?: string
    } = {
      name: form.name.trim(),
      username: form.username.trim(),
      role: form.role,
    }

    if (form.password.trim()) {
      payload.password = form.password
    }

    let response

    if (editingUser) {
      response = await api.put(
        `/users/${editingUser.id}`,
        payload,
      )
    } else {
      response = await api.post(
        '/users',
        payload,
      )
    }

    setNotification(null)

    setShowForm(false)
    resetForm()

    await loadUsers()

    showNotification(
      'success',
      editingUser
        ? 'User berhasil diperbarui'
        : 'User berhasil ditambahkan',
      response.data?.message ||
        (editingUser
          ? 'Perubahan data user telah berhasil disimpan.'
          : 'Akun user baru berhasil dibuat.'),
    )
  } catch (error: any) {
    console.error('Gagal menyimpan user:', error)

    setNotification(null)

    if (error.response?.data?.errors) {
      const errors = error.response.data.errors

      const firstError = Object.values(errors)[0]

      if (Array.isArray(firstError)) {
        showNotification(
          'error',
          'Data tidak dapat disimpan',
          firstError[0] as string,
        )

        return
      }
    }

    showNotification(
      'error',
      'Gagal menyimpan user',
      error.response?.data?.message ||
        'Terjadi kesalahan saat menyimpan data user.',
    )
  } finally {
    setIsSaving(false)
  }
}

  // =========================
  // DELETE USER
  // =========================

  // =========================
// DELETE USER
// =========================

const handleDelete = (user: User) => {
  if (isDeleting) return

  setDeleteTarget(user)
}

const confirmDelete = async () => {
  if (!deleteTarget || isDeleting) return

  const user = deleteTarget

  try {
    setIsDeleting(true)

    showNotification(
      'loading',
      'Menghapus user',
      `Sedang menghapus akun ${user.name}...`,
    )

    const response = await api.delete(`/users/${user.id}`)

    await loadUsers()

    setDeleteTarget(null)
    setNotification(null)

    showNotification(
      'success',
      'User berhasil dihapus',
      response.data?.message ||
        `Akun ${user.name} telah berhasil dihapus.`,
    )
  } catch (error: any) {
    console.error('Gagal menghapus user:', error)

    setDeleteTarget(null)
    setNotification(null)

    showNotification(
      'error',
      'Gagal menghapus user',
      error.response?.data?.message ||
        'User tidak dapat dihapus. Silakan coba lagi.',
    )
  } finally {
    setIsDeleting(false)
  }
}

  // =========================
  // FORMAT DATE
  // =========================

  const formatDate = (date?: string) => {
    if (!date) return '-'

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))
  }

  const renderNotification = () => {
  if (!notification) return null

  const config = {
    success: {
      icon: CheckCircle2,
      iconClass: 'text-emerald-600',
      progressClass: 'bg-emerald-500',
    },
    error: {
      icon: XCircle,
      iconClass: 'text-red-600',
      progressClass: 'bg-red-500',
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'text-amber-600',
      progressClass: 'bg-amber-500',
    },
    loading: {
      icon: Loader2,
      iconClass: 'animate-spin text-slate-600',
      progressClass: 'bg-slate-500',
    },
  }[notification.type]

  const Icon = config.icon

  return (
    <div className="fixed right-5 top-5 z-[100] w-[calc(100%-2.5rem)] max-w-md animate-in slide-in-from-right-5 fade-in duration-300">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        <div className="flex items-start gap-3 p-4">

          <div className="mt-0.5 shrink-0">
            <Icon
              className={`h-5 w-5 ${config.iconClass}`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {notification.title}
            </p>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              {notification.message}
            </p>
          </div>

          {notification.type !== 'loading' && (
            <button
              type="button"
              onClick={closeNotification}
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          )}

        </div>

        {notification.type !== 'loading' && (
          <div className="h-1 w-full bg-slate-100">
            <div
              className={`h-full ${config.progressClass} animate-[shrink_4s_linear_forwards]`}
            />
          </div>
        )}

      </div>
    </div>
  )
}

  return (
<>
    {renderNotification()}
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Manajemen User
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kelola akun admin dan barge crew.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Kembali
            </button>

            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              onClick={openAddForm}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              + Tambah User
            </button>

          </div>
        </div>

        {/* FILTER */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="grid gap-3 md:grid-cols-[1fr_220px]">

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Cari User
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau username..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Role
              </label>

              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Semua Role</option>
                <option value="admin">Admin</option>
                <option value="barge_crew">
                  Barge Crew
                </option>
              </select>
            </div>

          </div>
        </div>

        {/* STATISTICS */}
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total User
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {users.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Admin
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                users.filter(
                  (user) => user.role === 'admin',
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Barge Crew
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                users.filter(
                  (user) => user.role === 'barge_crew',
                ).length
              }
            </p>
          </div>

        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[800px] text-sm">

              <thead className="bg-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    #
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Nama
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Username
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Role
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Dibuat
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-slate-700">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Memuat data user...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Tidak ada user ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {user.name}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {user.username}
                      </td>

                      <td className="px-5 py-4">

                        {user.role === 'admin' ? (
                          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Barge Crew
                          </span>
                        )}

                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(user)
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(user)
                            }
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            🗑 Hapus
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>

          </div>
        </div>

      </div>

      {/* ========================= */}
      {/* MODAL FORM */}
      {/* ========================= */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingUser
                    ? 'Edit User'
                    : 'Tambah User'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingUser
                    ? 'Perbarui informasi akun user.'
                    : 'Buat akun user baru.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-6"
            >

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nama
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    handleFormChange(
                      'name',
                      e.target.value,
                    )
                  }
                  placeholder="Nama lengkap"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Username
                </label>

                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    handleFormChange(
                      'username',
                      e.target.value,
                    )
                  }
                  placeholder="Username"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                  {editingUser && (
                    <span className="ml-1 font-normal text-slate-400">
                      (kosongkan jika tidak diubah)
                    </span>
                  )}
                </label>

                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    handleFormChange(
                      'password',
                      e.target.value,
                    )
                  }
                  placeholder={
                    editingUser
                      ? 'Password baru'
                      : 'Minimal 6 karakter'
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>

                <select
                  value={form.role}
                  onChange={(e) =>
                    handleFormChange(
                      'role',
                      e.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="admin">
                    Admin
                  </option>

                  <option value="barge_crew">
                    Barge Crew
                  </option>
                </select>
              </div>

              {/* BUTTON */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? 'Menyimpan...'
                    : editingUser
                      ? 'Simpan Perubahan'
                      : 'Tambah User'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================= */}
{/* MODAL KONFIRMASI HAPUS */}
{/* ========================= */}
{deleteTarget && (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4">
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
      
      {/* Icon */}
      <div className="flex justify-center pt-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-600" />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 pt-4 text-center">
        <h2 className="text-lg font-bold text-slate-900">
          Hapus User?
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Apakah Anda yakin ingin menghapus akun berikut?
        </p>

        {/* User Information */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <p className="text-sm font-semibold text-slate-900">
            {deleteTarget.name}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            @{deleteTarget.username}
          </p>

          <div className="mt-2">
            {deleteTarget.role === 'admin' ? (
              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                Admin
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Barge Crew
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-red-500">
          Tindakan ini tidak dapat dibatalkan.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={() => setDeleteTarget(null)}
          disabled={isDeleting}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Batal
        </button>

        <button
          type="button"
          onClick={confirmDelete}
          disabled={isDeleting}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Menghapus...
            </span>
          ) : (
            'Ya, Hapus User'
          )}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
    </>
  )
}