import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const planSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  durationDays: z.number().min(1, 'Duration must be at least 1 day'),
  price: z.number().min(0, 'Price must be positive'),
  gstPercent: z.number().min(0).max(100),
  isActive: z.boolean(),
  displayOrder: z.number(),
  features: z.string().optional(),
});

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const { data: plansResponse, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.getPlans(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      code: '',
      durationDays: 30,
      price: 0,
      gstPercent: 18,
      isActive: true,
      displayOrder: 0,
      features: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createPlan(data),
    onSuccess: () => {
      toast.success('Plan created');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create plan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updatePlan(id, data),
    onSuccess: () => {
      toast.success('Plan updated');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update plan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deletePlan(id),
    onSuccess: () => {
      toast.success('Plan marked as inactive (deleted)');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete plan');
    },
  });

  const openModal = (plan = null) => {
    setEditingPlan(plan);
    if (plan) {
      reset({
        name: plan.name,
        code: plan.code,
        durationDays: plan.durationDays,
        price: plan.price / 100, // stored in paise, we edit in INR
        gstPercent: plan.gstPercent,
        isActive: plan.isActive,
        displayOrder: plan.displayOrder,
        features: plan.features ? plan.features.join('\n') : '',
      });
    } else {
      reset({
        name: '',
        code: '',
        durationDays: 30,
        price: 0,
        gstPercent: 18,
        isActive: true,
        displayOrder: 0,
        features: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const onSubmit = (values) => {
    const payload = {
      ...values,
      price: Math.round(values.price * 100), // INR to paise
      features: values.features.split('\n').filter((f) => f.trim() !== ''),
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <div className="p-8">Loading plans...</div>;

  const plans = plansResponse?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Plan
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan._id} className={!plan.isActive ? 'opacity-50' : ''}>
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openModal(plan)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (window.confirm('Delete this plan?')) deleteMutation.mutate(plan._id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mt-2">₹{(plan.price / 100).toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mb-4">
                {plan.code} • {plan.durationDays} days • {plan.gstPercent}% GST
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {plan.features?.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              {!plan.isActive && (
                <div className="mt-4 text-red-500 text-sm font-semibold">INACTIVE</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input {...register('name')} placeholder="e.g. Monthly Standard" />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Code (Unique)</label>
              <Input {...register('code')} placeholder="e.g. PLAN_MONTHLY" />
              {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Duration (Days)</label>
                <Input type="number" {...register('durationDays', { valueAsNumber: true })} />
                {errors.durationDays && (
                  <p className="text-red-500 text-sm mt-1">{errors.durationDays.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Price (INR, Excl. GST)</label>
                <Input type="number" step="0.01" {...register('price', { valueAsNumber: true })} />
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">GST %</label>
                <Input type="number" {...register('gstPercent', { valueAsNumber: true })} />
                {errors.gstPercent && (
                  <p className="text-red-500 text-sm mt-1">{errors.gstPercent.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Display Order</label>
                <Input type="number" {...register('displayOrder', { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Features (One per line)</label>
              <textarea
                className="w-full min-h-[100px] border rounded-md p-2 mt-1 text-sm"
                {...register('features')}
                placeholder="Feature 1&#10;Feature 2"
              ></textarea>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register('isActive')} />
              <label htmlFor="isActive" className="text-sm font-medium">
                Is Active (Visible)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
