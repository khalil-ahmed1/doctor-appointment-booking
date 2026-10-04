import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../../lib/axios';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const VerifyEmailPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, error

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
      } catch (error) {
        setStatus('error');
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token]);

  return (
    <Card className="w-full max-w-md shadow-lg border-primary/20">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Email Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col items-center justify-center py-6">
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardDescription className="text-base text-center">
              Your email has been successfully verified! You can now log in to your account.
            </CardDescription>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <CardDescription className="text-base text-center text-destructive">
              Invalid or expired verification link.
            </CardDescription>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        {status !== 'loading' && (
          <Button asChild className="w-full">
            <Link to="/login">Go to Login</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
