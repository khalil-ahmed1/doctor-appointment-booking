import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  ListOrdered, 
  CalendarDays, 
  UserCircle, 
  Stethoscope, 
  Wallet, 
  CreditCard, 
  Bell, 
  Settings,
  ShieldAlert,
  Mail,
  Tags
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';

const doctorLinks = [
  { name: 'Overview', to: '/doctor/dashboard', icon: LayoutDashboard },
  { name: 'Appointments', to: '/doctor/appointments', icon: CalendarCheck },
  { name: 'Normal Queue', to: '/doctor/queue', icon: ListOrdered },
  { name: 'Schedule', to: '/doctor/schedule', icon: CalendarDays },
  { name: 'Profile & Gallery', to: '/doctor/profile', icon: UserCircle },
  { name: 'Fees & Services', to: '/doctor/fees', icon: Stethoscope },
  { name: 'Earnings & Payouts', to: '/doctor/earnings', icon: Wallet },
  { name: 'Subscription', to: '/doctor/subscription', icon: CreditCard },
  { name: 'Notifications', to: '/doctor/notifications', icon: Bell },
  { name: 'Account', to: '/doctor/account', icon: Settings },
];

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const renderNavLinks = () => {
    if (user.role === 'DOCTOR') {
      return doctorLinks.map((link) => {
        const isActive = location.pathname.startsWith(link.to);
        const Icon = link.icon;
        return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {link.name}
          </Link>
        );
      });
    }

    if (user.role === 'ADMIN') {
      const adminLinks = [
        { name: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Doctors', to: '/admin/doctors', icon: Stethoscope },
        { name: 'Patients', to: '/admin/patients', icon: UserCircle },
        { name: 'Appointments', to: '/admin/appointments', icon: CalendarCheck },
        { name: 'Payments', to: '/admin/payments', icon: Wallet },
        { name: 'Plans', to: '/admin/plans', icon: CreditCard },
        { name: 'Subscriptions', to: '/admin/subscriptions', icon: ListOrdered },
        { name: 'Specializations', to: '/admin/specializations', icon: Tags },
        { name: 'Settings', to: '/admin/settings', icon: Settings },
        { name: 'Audit Logs', to: '/admin/audit-logs', icon: ShieldAlert },
        { name: 'Email Logs', to: '/admin/email-logs', icon: Mail },
      ];
      return adminLinks.map((link) => {
        const isActive = location.pathname.startsWith(link.to);
        const Icon = link.icon;
        return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {link.name}
          </Link>
        );
      });
    }

    if (user.role === 'PATIENT') {
      return (
        <Link 
          to="/patient/dashboard" 
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors",
            location.pathname.startsWith('/patient/dashboard')
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="border-b bg-background shadow-sm">
        <div className="container flex h-16 items-center px-4 justify-between">
          <Link to="/" className="font-bold text-xl text-primary">DocBook Dashboard</Link>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <span className="text-sm font-medium">{user.name}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="container flex-1 flex py-6 px-4">
        <aside className="w-64 border-r pr-6 hidden md:block">
          <nav className="space-y-1">
            {renderNavLinks()}
          </nav>
        </aside>
        <main className="flex-1 md:pl-6 max-w-full overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

