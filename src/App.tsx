import { Navigate, Route, Routes } from 'react-router-dom'

import Login from './pages/Login'
import Attendance from './pages/Attendance'
import UserManagement from './pages/UserManagement'

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

      <Route
        path="/users"
        element={<UserManagement />}
      />
    </Routes>
  )
}

export default App

