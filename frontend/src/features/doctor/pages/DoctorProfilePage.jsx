import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ClinicSettings } from '../components/ClinicSettings';
import { GallerySettings } from '../components/GallerySettings';

export default function DoctorProfilePage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: doctorApi.getProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: doctorApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      toast.success('Profile updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  const [formData, setFormData] = useState({
    headline: '',
    bio: '',
    experienceYears: 0,
    gender: 'MALE',
  });

  // Sync form data with profile once loaded
  React.useEffect(() => {
    if (profile) {
      setFormData({
        headline: profile.headline || '',
        bio: profile.bio || '',
        experienceYears: profile.experienceYears || 0,
        gender: profile.gender || 'MALE',
      });
    }
  }, [profile]);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'experienceYears' ? Number(value) : value,
    }));
  };

  if (isLoading) return <div className="p-8">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile & Gallery</h2>
        <p className="text-muted-foreground">
          Manage your public profile information, clinic details, and photo gallery.
        </p>
      </div>

      {profile?.subscription?.status === 'EXPIRED' && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <h3 className="font-bold">Subscription Expired</h3>
          <p>Your profile is currently read-only. Please renew your plan to edit details.</p>
        </div>
      )}

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="clinic">Clinic & Map</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>Update your professional information.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    name="headline"
                    value={formData.headline}
                    onChange={handleInputChange}
                    placeholder="e.g. Senior Cardiologist"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell patients about yourself..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experienceYears">Experience (Years)</Label>
                    <Input
                      id="experienceYears"
                      name="experienceYears"
                      type="number"
                      value={formData.experienceYears}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={
                    updateProfileMutation.isPending || profile?.subscription?.status === 'EXPIRED'
                  }
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Details'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinic">
          <Card>
            <CardHeader>
              <CardTitle>Clinic Information</CardTitle>
              <CardDescription>Update your clinic address and map location.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClinicSettings
                profile={profile}
                isExpired={profile?.subscription?.status === 'EXPIRED'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle>Photo Gallery</CardTitle>
              <CardDescription>Manage photos of your clinic. Maximum 12 photos.</CardDescription>
            </CardHeader>
            <CardContent>
              <GallerySettings
                profile={profile}
                isExpired={profile?.subscription?.status === 'EXPIRED'}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
