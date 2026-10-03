import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

export const RootLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <div className="font-bold text-xl text-primary">DocBook</div>
          <div className="ml-auto flex items-center space-x-4">
             {/* Add navigation links later */}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};
