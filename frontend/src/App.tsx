import { Suspense, lazy, memo } from 'react'
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'

import { AppShell } from './components/AppShell'
import { BootGate } from './components/BootGate'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))

import DashboardPage from './pages/app/DashboardPage'
import CustomersPage from './pages/app/CustomersPage'
import OrdersPage from './pages/app/OrdersPage'
import PaymentsPage from './pages/app/PaymentsPage'
import TeamPage from './pages/app/TeamPage'
import SettingsPage from './pages/app/SettingsPage'

const CustomerPage = lazy(() => import('./pages/app/CustomerPage'))
const OrderPage = lazy(() => import('./pages/app/OrderPage'))
const PhonePeReturnPage = lazy(() => import('./pages/app/PhonePeReturnPage'))

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BootGate>
          <AuthProvider>
            <Suspense fallback={<div className="auth-page">Loading…</div>}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                <Route path="/app" element={<AppShell />}>
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="customer" element={<CustomerPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="order" element={<OrderPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="phonepe-return" element={<PhonePeReturnPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BootGate>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default memo(App)
