import { FormEvent, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

import api from '../services/api'

interface User {
  id: number
  name: string
  username: string
  role: 'admin' | 'barge_crew'
}

interface LoginResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
  }
}

export default function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()

    setError('')

    if (!username.trim()) {
      setError('Username wajib diisi.')
      return
    }

    if (!password) {
      setError('Password wajib diisi.')
      return
    }

    try {
      setLoading(true)

      const response = await api.post<LoginResponse>(
        '/login',
        {
          username: username.trim(),
          password,
        },
      )

      const result = response.data

      if (result.success) {
        // Simpan token
        localStorage.setItem(
          'token',
          result.data.token,
        )

        // Simpan data user
        localStorage.setItem(
          'user',
          JSON.stringify(result.data.user),
        )

        // Masuk ke halaman attendance
        navigate('/attendance', { replace: true })
      } else {
        setError(result.message || 'Login gagal.')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 422) {
          setError(
            err.response.data?.message ||
              'Username atau password salah.',
          )
        } else if (err.response?.status === 401) {
          setError('Username atau password salah.')
        } else {
          setError(
            err.response?.data?.message ||
              'Terjadi kesalahan pada server.',
          )
        }
      } else {
        setError(
          'Terjadi kesalahan. Silakan coba lagi.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <span className="text-3xl font-bold text-white">
              MC
            </span>
          </div>

          <h1 className="text-3xl font-bold text-slate-800">
            Minera ClockIn
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sistem Manajemen Kehadiran
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              Login
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Silakan masuk menggunakan akun Anda
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="Masukkan username"
                autoComplete="username"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Masukkan password"
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Minera ClockIn
        </p>

      </div>
    </div>
  )
}

