import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import { RootLayout } from './layouts/RootLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { VerifyEmailPage } from './features/auth/pages/VerifyEmailPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import DoctorsListPage from './features/admin/pages/DoctorsListPage';
import DoctorCreatePage from './features/admin/pages/DoctorCreatePage';
import DoctorProfilePage from './features/doctor/pages/DoctorProfilePage';
import DoctorFeesPage from './features/doctor/pages/DoctorFeesPage';
import DoctorSchedulePage from './features/doctor/pages/DoctorSchedulePage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes with Main Layout */}
            <Route element={<RootLayout />}>
              <Route path="/" element={<Home />} />
              {/* <Route path="/doctors/:slug" element={<DoctorProfilePage />} /> */}
            </Route>

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            </Route>

            {/* Protected Dashboard Routes */}
            <Route element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'ADMIN', 'SUB_ADMIN']} />}>
              <Route element={<DashboardLayout />}>
                {/* Placeholders */}
                <Route path="/patient/dashboard" element={<div>Patient Dashboard Placeholder</div>} />
                <Route path="/doctor/dashboard" element={<div>Doctor Dashboard Placeholder</div>} />
                <Route path="/admin/dashboard" element={<div>Admin Dashboard Placeholder</div>} />
                
                {/* Doctor Features */}
                <Route path="/doctor/profile" element={<DoctorProfilePage />} />
                <Route path="/doctor/fees" element={<DoctorFeesPage />} />
                <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
                
                {/* Admin Features */}
                <Route path="/admin/doctors" element={<DoctorsListPage />} />
                <Route path="/admin/doctors/new" element={<DoctorCreatePage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;