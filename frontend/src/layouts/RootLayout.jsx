import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';

export const RootLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans antialiased">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8 justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <span className="font-bold text-xl leading-none">D</span>
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">DocBook</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/doctors" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Find Doctors</Link>
            <Link to="/#specialties" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Specialties</Link>
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <Link
                  to={user.role === 'PATIENT' ? '/patient/dashboard' : `/${user.role.toLowerCase()}/dashboard`}
                  className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600"
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0)}
                </div>
                <button onClick={logout} className="text-slate-500 hover:text-red-600 transition-colors" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-blue-600 hidden sm:block">Log in</Link>
                <Link to="/register" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="bg-blue-600 text-white p-1 rounded-md">
                <span className="font-bold text-lg leading-none">D</span>
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">DocBook</span>
            </Link>
            <p className="text-sm text-slate-500 mb-6">
              Making quality healthcare accessible. Book appointments with the best doctors instantly.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">For Patients</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link to="/doctors" className="hover:text-blue-600">Search for Doctors</Link></li>
              <li><Link to="/login" className="hover:text-blue-600">Login</Link></li>
              <li><Link to="/register" className="hover:text-blue-600">Register</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">For Doctors</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link to="/login" className="hover:text-blue-600">Doctor Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#" className="hover:text-blue-600">Contact Us</a></li>
              <li><a href="#" className="hover:text-blue-600">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-600">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-100 text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center">
          <p>© 2026 DocBook. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};
