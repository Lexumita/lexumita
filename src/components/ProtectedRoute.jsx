import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const ROLE_HOME = {
  admin: '/admin/dashboard',
  avvocato: '/dashboard',
  cliente: '/portale',
  user: '/area',
}

const DEV_BYPASS = import.meta.env.DEV

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-petrolio flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-oro border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={ROLE_HOME[profile.role] ?? '/login'} replace />
  }

  return children
}