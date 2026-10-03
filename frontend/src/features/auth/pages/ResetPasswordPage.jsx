import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../../lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password: data.password });
      toast.success('Password has been reset successfully');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-primary/20">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">Set new password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password below.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline font-medium">
              Back to log in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};
