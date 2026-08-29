import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PlanningsListPage from './pages/PlanningsListPage'
import PlanningPage from './pages/PlanningPage'
import ArchivesPage from './pages/ArchivesPage'
import LieuxPage from './pages/LieuxPage'
import PublicPlanningPage from './pages/PublicPlanningPage'
import UsersPage from './pages/UsersPage'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<SignupPage />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
        <Route path="/p/:token" element={<PublicPlanningPage />} />
        <Route path="/semaine" element={<PublicPlanningPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PlanningsListPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/planning/:planningId"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PlanningPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/archives"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ArchivesPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lieux"
          element={
            <ProtectedRoute>
              <AppLayout>
                <LieuxPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/utilisateurs"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AdminRoute>
                  <UsersPage />
                </AdminRoute>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
