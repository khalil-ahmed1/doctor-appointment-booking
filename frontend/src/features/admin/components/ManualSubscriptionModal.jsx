import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ManualSubscriptionModal({ isOpen, onClose, doctor }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState('GRANT_DAYS');
  const [days, setDays] = useState('');
  const [endDate, setEndDate] = useState('');
  const [planId, setPlanId] = useState('');
  const [reason, setReason] = useState('');

  const { data: plansData } = useQuery({
    queryKey: ['adminPlans'],
    queryFn: () => adminApi.getPlans(),
    enabled: isOpen,
  });
  const plans = plansData?.data || [];

  const mutation = useMutation({
    mutationFn: (data) => adminApi.manualSubscriptionUpdate(data),
    onSuccess: () => {
      toast.success('Subscription updated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminDoctors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update subscription');
    },
  });

  const resetForm = () => {
    setAction('GRANT_DAYS');
    setDays('');
    setEndDate('');
    setPlanId('');
    setReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason || reason.length < 5) {
      toast.error('Reason must be at least 5 characters long');
      return;
    }

    const payload = {
      doctorId: doctor._id,
      action,
      reason,
    };

    if (action === 'GRANT_DAYS') {
      if (!days || parseInt(days) <= 0) return toast.error('Valid days required');
      payload.days = parseInt(days);
    } else if (action === 'SET_END_DATE') {
      if (!endDate) return toast.error('End date required');
      payload.endDate = endDate;
    } else if (action === 'CHANGE_PLAN') {
      if (!planId) return toast.error('Plan selection required');
      payload.planId = planId;
    }

    mutation.mutate(payload);
  };

  if (!doctor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Subscription - {doctor.fullName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRANT_DAYS">Grant / Extend (Days)</SelectItem>
                <SelectItem value="SET_END_DATE">Set Exact End Date</SelectItem>
                <SelectItem value="CHANGE_PLAN">Grant Specific Plan</SelectItem>
                <SelectItem value="SUSPEND">Suspend Subscription</SelectItem>
                <SelectItem value="REACTIVATE">Reactivate Subscription</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action === 'GRANT_DAYS' && (
            <div className="space-y-2">
              <Label>Days to Add</Label>
              <Input
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="e.g. 30"
                required
              />
            </div>
          )}

          {action === 'SET_END_DATE' && (
            <div className="space-y-2">
              <Label>Exact End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          )}

          {action === 'CHANGE_PLAN' && (
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <Select value={planId} onValueChange={setPlanId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan._id} value={plan._id}>
                      {plan.name} ({plan.durationDays} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason (Mandatory)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Compensated for downtime"
              required
              minLength={5}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Apply Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
