import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

export default function DoctorFeesPage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: doctorApi.getProfile
  });

  const updateFeesMutation = useMutation({
    mutationFn: doctorApi.updateFees,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update fees');
    }
  });

  const updateTypesMutation = useMutation({
    mutationFn: doctorApi.updateTypes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      toast.success('Settings saved successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    }
  });

  const [formData, setFormData] = useState({
    fees: {
      normal: '',
      premium: '',
      homeVisit: '',
    },
    types: {
      normal: {
        enabled: false,
        dailyTokenLimit: 0,
        walkInHoursText: '',
      },
      premium: {
        enabled: false,
      },
      homeVisit: {
        enabled: false,
        serviceArea: {
          mode: 'RADIUS',
          radiusKm: 5,
          pincodes: '',
        }
      }
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fees: {
          normal: profile.fees?.normal ? profile.fees.normal / 100 : '',
          premium: profile.fees?.premium ? profile.fees.premium / 100 : '',
          homeVisit: profile.fees?.homeVisit ? profile.fees.homeVisit / 100 : '',
        },
        types: {
          normal: {
            enabled: profile.types?.normal?.enabled || false,
            dailyTokenLimit: profile.types?.normal?.dailyTokenLimit || 0,
            walkInHoursText: profile.types?.normal?.walkInHoursText || '',
          },
          premium: {
            enabled: profile.types?.premium?.enabled || false,
          },
          homeVisit: {
            enabled: profile.types?.homeVisit?.enabled || false,
            serviceArea: {
              mode: profile.types?.homeVisit?.serviceArea?.mode || 'RADIUS',
              radiusKm: profile.types?.homeVisit?.serviceArea?.radiusKm || 5,
              pincodes: profile.types?.homeVisit?.serviceArea?.pincodes?.join(', ') || '',
            }
          }
        }
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      const feesPayload = {
        normal: formData.fees.normal ? Number(formData.fees.normal) * 100 : undefined,
        premium: formData.fees.premium ? Number(formData.fees.premium) * 100 : undefined,
        homeVisit: formData.fees.homeVisit ? Number(formData.fees.homeVisit) * 100 : undefined,
      };

      const typesPayload = {
        normal: {
          enabled: formData.types.normal.enabled,
          dailyTokenLimit: Number(formData.types.normal.dailyTokenLimit),
          walkInHoursText: formData.types.normal.walkInHoursText,
        },
        premium: {
          enabled: formData.types.premium.enabled,
        },
        homeVisit: {
          enabled: formData.types.homeVisit.enabled,
          serviceArea: {
            mode: formData.types.homeVisit.serviceArea.mode,
            radiusKm: Number(formData.types.homeVisit.serviceArea.radiusKm),
            pincodes: formData.types.homeVisit.serviceArea.pincodes
              ? formData.types.homeVisit.serviceArea.pincodes.split(',').map(p => p.trim()).filter(Boolean)
              : [],
          }
        }
      };

      await updateFeesMutation.mutateAsync(feesPayload);
      await updateTypesMutation.mutateAsync(typesPayload);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  const isPending = updateFeesMutation.isPending || updateTypesMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Fees & Services</h2>
        <p className="text-muted-foreground">
          Manage your appointment types, fees, and operational limits.
        </p>
      </div>

      {profile?.subscription?.status === 'EXPIRED' && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <h3 className="font-bold">Subscription Expired</h3>
          <p>You cannot edit fees and services while your subscription is expired. Please renew your plan.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Normal Appointment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Normal Appointment</CardTitle>
                <CardDescription>Queue-based walk-in / basic consultation</CardDescription>
              </div>
              <Switch 
                checked={formData.types.normal.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev, types: { ...prev.types, normal: { ...prev.types.normal, enabled: checked } }
                }))}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Consultation Fee (₹)</Label>
              <Input 
                type="number" 
                value={formData.fees.normal}
                onChange={(e) => setFormData(prev => ({
                  ...prev, fees: { ...prev.fees, normal: e.target.value }
                }))}
                min="0"
                placeholder="e.g. 500"
              />
            </div>
            <div className="space-y-2">
              <Label>Daily Token Limit</Label>
              <div className="flex gap-2 items-center">
                <Input 
                  type="number" 
                  value={formData.types.normal.dailyTokenLimit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev, types: { ...prev.types, normal: { ...prev.types.normal, dailyTokenLimit: e.target.value } }
                  }))}
                  min="0"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">(0 = unlimited)</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Walk-in Hours (Text)</Label>
              <Input 
                value={formData.types.normal.walkInHoursText}
                onChange={(e) => setFormData(prev => ({
                  ...prev, types: { ...prev.types, normal: { ...prev.types.normal, walkInHoursText: e.target.value } }
                }))}
                placeholder="e.g. Mon-Sat 10:00 - 13:00"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" /> Displayed to patients for guidance
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Premium Appointment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Premium Appointment</CardTitle>
                <CardDescription>Fixed time-slot bookings</CardDescription>
              </div>
              <Switch 
                checked={formData.types.premium.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev, types: { ...prev.types, premium: { ...prev.types.premium, enabled: checked } }
                }))}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Consultation Fee (₹)</Label>
              <Input 
                type="number" 
                value={formData.fees.premium}
                onChange={(e) => setFormData(prev => ({
                  ...prev, fees: { ...prev.fees, premium: e.target.value }
                }))}
                min="0"
                placeholder="e.g. 1000"
              />
            </div>
            <div className="rounded-md bg-muted p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                To accept premium appointments, you must also define your working hours in the <strong>Schedule</strong> section.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Home Visit Settings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Home Visit</CardTitle>
                <CardDescription>Consultations at the patient's address</CardDescription>
              </div>
              <Switch 
                checked={formData.types.homeVisit.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev, types: { ...prev.types, homeVisit: { ...prev.types.homeVisit, enabled: checked } }
                }))}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Consultation Fee (₹)</Label>
                <Input 
                  type="number" 
                  value={formData.fees.homeVisit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev, fees: { ...prev.fees, homeVisit: e.target.value }
                  }))}
                  min="0"
                  placeholder="e.g. 2500"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Service Area Mode</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.types.homeVisit.serviceArea.mode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev, types: { 
                      ...prev.types, 
                      homeVisit: { 
                        ...prev.types.homeVisit, 
                        serviceArea: { ...prev.types.homeVisit.serviceArea, mode: e.target.value } 
                      } 
                    }
                  }))}
                >
                  <option value="RADIUS">Radius (Km) from Clinic</option>
                  <option value="PINCODES">Specific Pincodes</option>
                </select>
              </div>

              {formData.types.homeVisit.serviceArea.mode === 'RADIUS' ? (
                <div className="space-y-2">
                  <Label>Radius (Km)</Label>
                  <Input 
                    type="number" 
                    value={formData.types.homeVisit.serviceArea.radiusKm}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, types: { 
                        ...prev.types, 
                        homeVisit: { 
                          ...prev.types.homeVisit, 
                          serviceArea: { ...prev.types.homeVisit.serviceArea, radiusKm: e.target.value } 
                        } 
                      }
                    }))}
                    min="1"
                    max="100"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Serviceable Pincodes (Comma separated)</Label>
                  <Input 
                    type="text" 
                    value={formData.types.homeVisit.serviceArea.pincodes}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, types: { 
                        ...prev.types, 
                        homeVisit: { 
                          ...prev.types.homeVisit, 
                          serviceArea: { ...prev.types.homeVisit.serviceArea, pincodes: e.target.value } 
                        } 
                      }
                    }))}
                    placeholder="e.g. 400001, 400002"
                  />
                </div>
              )}
            </div>
            <div className="rounded-md bg-muted p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Make sure you also define your home visit working hours in the <strong>Schedule</strong> section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isPending || profile?.subscription?.status === 'EXPIRED'} size="lg">
          {isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
