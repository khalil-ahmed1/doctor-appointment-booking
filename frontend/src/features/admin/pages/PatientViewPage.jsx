import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function PatientViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: 'OTHER',
    dob: '',
  });

  const { data: patient, isLoading } = useQuery({
    queryKey: ['admin-patient', id],
    queryFn: () => adminApi.getPatientById(id),
  });

  useEffect(() => {
    if (patient?.data) {
      setFormData({
        name: patient.data.name || '',
        phone: patient.data.phone || '',
        gender: patient.data.gender || 'OTHER',
        dob: patient.data.dob ? new Date(patient.data.dob).toISOString().split('T')[0] : '',
      });
    }
  }, [patient]);

  const updateMutation = useMutation({
    mutationFn: (data) => adminApi.updatePatient(id, data),
    onSuccess: () => {
      toast.success('Patient details updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-patient', id] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update patient details');
    },
  });

  const blockMutation = useMutation({
    mutationFn: (status) => adminApi.updatePatientBlockStatus(id, status),
    onSuccess: () => {
      toast.success('Patient status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-patient', id] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update patient status');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleBlockToggle = () => {
    const newStatus = patient?.data?.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    if (window.confirm(`Are you sure you want to ${newStatus === 'BLOCKED' ? 'block' : 'unblock'} this patient?`)) {
      blockMutation.mutate(newStatus);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading patient...</div>;
  }

  const pData = patient?.data;

  if (!pData) {
    return <div className="p-8 text-center text-red-500">Patient not found.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/patients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Profile</h1>
          <p className="text-muted-foreground">View and edit patient details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mb-2">
                {pData.name.charAt(0).toUpperCase()}
              </div>
              <CardTitle>{pData.name}</CardTitle>
              <CardDescription>{pData.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  pData.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                  pData.status === 'BLOCKED' ? 'bg-red-100 text-red-800' : 
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {pData.status}
                </span>
              </div>
              <Button 
                variant={pData.status === 'BLOCKED' ? 'outline' : 'destructive'} 
                className="w-full"
                onClick={handleBlockToggle}
                disabled={blockMutation.isPending}
              >
                {pData.status === 'BLOCKED' ? 'Unblock Patient' : 'Block Patient'}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">{new Date(pData.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient ID</span>
                <span className="font-medium">{pData._id.substring(18)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email Verified</span>
                <span className="font-medium">{pData.emailVerified ? 'Yes' : 'No'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Edit Details</CardTitle>
              <CardDescription>Update patient personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
