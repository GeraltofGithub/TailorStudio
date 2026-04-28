import { Suspense, lazy, memo } from 'react'
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'

import { AppShell } from './components/AppShell'
import { LegacyRedirect } from './components/LegacyRedirect'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))

const DashboardPage = lazy(() => import('./pages/app/DashboardPage'))
const CustomersPage = lazy(() => import('./pages/app/CustomersPage'))
const CustomerPage = lazy(() => import('./pages/app/CustomerPage'))
const OrdersPage = lazy(() => import('./pages/app/OrdersPage'))
const OrderPage = lazy(() => import('./pages/app/OrderPage'))
const PaymentsPage = lazy(() => import('./pages/app/PaymentsPage'))
const TeamPage = lazy(() => import('./pages/app/TeamPage'))
const SettingsPage = lazy(() => import('./pages/app/SettingsPage'))
const PhonePeReturnPage = lazy(() => import('./pages/app/PhonePeReturnPage'))

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<div className="auth-page">Loading…</div>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/index.html" element={<LegacyRedirect to="/" />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/join" element={<JoinPage />} />

              {/* Backward compatible .html routes (Spring redirects here after form login) */}
              <Route path="/login.html" element={<LegacyRedirect to="/login" />} />
              <Route path="/signup.html" element={<LegacyRedirect to="/signup" />} />
              <Route path="/join.html" element={<LegacyRedirect to="/join" />} />
              <Route path="/app/dashboard.html" element={<LegacyRedirect to="/app/dashboard" />} />
              <Route path="/app/customers.html" element={<LegacyRedirect to="/app/customers" />} />
              <Route path="/app/customer.html" element={<LegacyRedirect to="/app/customer" />} />
              <Route path="/app/orders.html" element={<LegacyRedirect to="/app/orders" />} />
              <Route path="/app/order.html" element={<LegacyRedirect to="/app/order" />} />
              <Route path="/app/payments.html" element={<LegacyRedirect to="/app/payments" />} />
              <Route path="/app/team.html" element={<LegacyRedirect to="/app/team" />} />
              <Route path="/app/settings.html" element={<LegacyRedirect to="/app/settings" />} />
              <Route path="/app/phonepe-return.html" element={<LegacyRedirect to="/app/phonepe-return" />} />

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
      </ToastProvider>
    </BrowserRouter>
  )
}

export default memo(App)
