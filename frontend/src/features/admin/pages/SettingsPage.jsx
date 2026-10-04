import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

const SETTING_FIELDS = [
  { key: 'trialDays', label: 'Trial Days', type: 'number', description: 'Days granted for initial trial.' },
  { key: 'holdMinutes', label: 'Hold Minutes', type: 'number', description: 'Slot reservation duration.' },
  { key: 'normalValidityDays', label: 'Normal Validity Days', type: 'number', description: 'Validity duration for normal queue tokens.' },
  { key: 'graceDays', label: 'Grace Days', type: 'number', description: 'Days of grace after subscription expiry.' },
  { key: 'advanceBookingDaysMax', label: 'Max Advance Booking Days', type: 'number', description: 'Maximum allowed days in advance for Premium.' },
  { key: 'maxActiveHoldsPerUser', label: 'Max Active Holds Per User', type: 'number', description: 'Concurrent hold limit.' },
  { key: 'feeBearer', label: 'Fee Bearer', type: 'text', description: 'PATIENT or DOCTOR' },
  { key: 'gatewayFeePercent', label: 'Gateway Fee %', type: 'number', description: 'Razorpay processing fee.' },
  { key: 'gstOnFeePercent', label: 'GST on Fee %', type: 'number', description: 'Tax applied to gateway fee.' },
  { key: 'platformCommissionPercent', label: 'Platform Commission %', type: 'number', description: 'Our revenue cut.' },
  { key: 'refundFeeBearer', label: 'Refund Fee Bearer', type: 'text', description: 'PLATFORM or DOCTOR' },
];

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.getSettings,
  });

  useEffect(() => {
    if (result?.data) {
      setFormData(result.data);
    }
  }, [result]);

  const updateMutation = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-settings']);
      toast.success('Settings updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update settings');
    },
  });

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Parse numbers automatically for numeric fields
    const parsedData = { ...formData };
    SETTING_FIELDS.forEach((field) => {
      if (field.type === 'number' && parsedData[field.key] !== undefined) {
        parsedData[field.key] = Number(parsedData[field.key]);
      }
    });
    updateMutation.mutate(parsedData);
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">Configure global operational parameters.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Configurations</CardTitle>
          <CardDescription>Changes apply immediately to new transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SETTING_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={`Enter ${field.label}`}
                  />
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
