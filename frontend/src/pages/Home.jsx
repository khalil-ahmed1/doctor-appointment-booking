import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const Home = () => {
  const { user, logout } = useAuth();

  return (
    <div className="container px-4 py-12 md:py-24">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Find and book the <span className="text-primary">best doctors</span> near you.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Book appointments online instantly. Choose from normal, premium, or home visits based on your convenience.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {user ? (
            <>
              <Button asChild size="lg">
                <Link to={`/${user.role.toLowerCase()}/dashboard`}>Go to Dashboard</Link>
              </Button>
              <Button variant="outline" size="lg" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/login">Login to Book</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/register">Create Account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
