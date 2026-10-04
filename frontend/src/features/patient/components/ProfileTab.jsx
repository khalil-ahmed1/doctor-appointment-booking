import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '../api/patient.api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  phone: z.string().length(10, 'Must be 10 digits').regex(/^\d+$/, 'Must be only digits'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  dob: z.string().optional().nullable(),
});

const ProfileTab = () => {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      gender: user?.gender || '',
      dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    }
  });

  const genderValue = watch('gender');

  useEffect(() => {
    if (user) {
      setValue('name', user.name || '');
      setValue('phone', user.phone || '');
      setValue('gender', user.gender || '');
      setValue('dob', user.dob ? new Date(user.dob).toISOString().split('T')[0] : '');
    }
  }, [user, setValue]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  });

  const onSubmit = (data) => {
    // Clean up empty strings
    if (!data.gender) data.gender = null;
    if (!data.dob) data.dob = null;
    mutation.mutate(data);
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email (Read Only)</Label>
            <Input id="email" value={user?.email || ''} disabled />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={genderValue || ''} onValueChange={(val) => setValue('gender', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input type="date" id="dob" {...register('dob')} />
            </div>
          </div>

          <Button type="submit" className="w-full mt-4" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileTab;
