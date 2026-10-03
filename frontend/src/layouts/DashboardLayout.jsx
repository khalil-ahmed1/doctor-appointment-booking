import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="border-b bg-background shadow-sm">
        <div className="container flex h-16 items-center px-4 justify-between">
          <Link to="/" className="font-bold text-xl text-primary">DocBook Dashboard</Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">{user.name}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="container flex-1 flex py-6 px-4">
        {/* Sidebar placeholder */}
        <aside className="w-64 border-r pr-6 hidden md:block">
          <nav className="space-y-2">
            <Link to={`/${user.role.toLowerCase()}/dashboard`} className="block px-3 py-2 rounded-md bg-primary/10 text-primary font-medium">
              Overview
            </Link>
            {/* Additional nav links based on role */}
          </nav>
        </aside>
        <main className="flex-1 md:pl-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
