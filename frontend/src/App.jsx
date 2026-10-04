import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

// Layouts
import { RootLayout } from './layouts/RootLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import HomePage from './features/public/pages/HomePage';
import AllDoctorsPage from './features/public/pages/AllDoctorsPage';
import DoctorDetailPage from './features/public/pages/DoctorDetailPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { VerifyEmailPage } from './features/auth/pages/VerifyEmailPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import DoctorsListPage from './features/admin/pages/DoctorsListPage';
import DoctorCreatePage from './features/admin/pages/DoctorCreatePage';
import PatientsListPage from './features/admin/pages/PatientsListPage';
import PatientViewPage from './features/admin/pages/PatientViewPage';
import DoctorProfilePage from './features/doctor/pages/DoctorProfilePage';
import DoctorFeesPage from './features/doctor/pages/DoctorFeesPage';
import DoctorSchedulePage from './features/doctor/pages/DoctorSchedulePage';
import DoctorDashboardPage from './features/doctor/pages/DoctorDashboardPage';
import DoctorAppointmentsPage from './features/doctor/pages/DoctorAppointmentsPage';
import NormalQueuePage from './features/doctor/pages/NormalQueuePage';
import BookingPage from './features/public/pages/BookingPage';
import BookingSuccessPage from './features/public/pages/BookingSuccessPage';

import PatientDashboardPage from './features/patient/pages/PatientDashboardPage';

const queryClient = new QueryClient();

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes with Main Layout */}
              <Route element={<RootLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/doctors" element={<AllDoctorsPage />} />
                <Route path="/doctors/:slug" element={<DoctorDetailPage />} />
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
                  {/* Dashboards */}
                  <Route path="/patient/dashboard" element={<PatientDashboardPage />} />
                  <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
                  <Route path="/admin/dashboard" element={<div>Admin Dashboard Placeholder</div>} />
                  
                  {/* Booking Flow */}
                  <Route path="/doctors/:slug/book" element={<BookingPage />} />
                  <Route path="/doctors/:slug/book/success" element={<BookingSuccessPage />} />
                  
                  {/* Doctor Features */}
                  <Route path="/doctor/profile" element={<DoctorProfilePage />} />
                  <Route path="/doctor/fees" element={<DoctorFeesPage />} />
                  <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
                  <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
                  <Route path="/doctor/queue" element={<NormalQueuePage />} />
                  
                  {/* Admin Features */}
                  <Route path="/admin/doctors" element={<DoctorsListPage />} />
                  <Route path="/admin/doctors/new" element={<DoctorCreatePage />} />
                  <Route path="/admin/patients" element={<PatientsListPage />} />
                  <Route path="/admin/patients/:id" element={<PatientViewPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;