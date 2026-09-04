import { Navigate, Route, Routes } from 'react-router-dom'

import Login from './pages/Login'
import Attendance from './pages/Attendance'

function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const token = localStorage.getItem('token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Attendance wajib login */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />

      {/* Halaman awal */}
      <Route
        path="/"
        element={<Navigate to="/attendance" replace />}
      />

      {/* URL tidak ditemukan */}
      <Route
        path="*"
        element={<Navigate to="/attendance" replace />}
      />
    </Routes>
  )
}

export default App

