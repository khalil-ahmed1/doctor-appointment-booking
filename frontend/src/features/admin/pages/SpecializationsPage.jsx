import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const SpecializationsPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', slug: '', icon: '', isActive: true });

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-specializations'],
    queryFn: adminApi.getSpecializations,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createSpecialization,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-specializations']);
      toast.success('Specialization created');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateSpecialization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-specializations']);
      toast.success('Specialization updated');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteSpecialization,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-specializations']);
      toast.success('Specialization deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete');
    },
  });

  const handleOpenModal = (spec = null) => {
    if (spec) {
      setEditingId(spec._id);
      setFormData({
        name: spec.name,
        slug: spec.slug,
        icon: spec.icon || '',
        isActive: spec.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', slug: '', icon: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  const specializations = result?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Specializations</h1>
          <p className="text-muted-foreground">Manage doctor specializations</p>
        </div>
        <Button onClick={() => handleOpenModal()}>Add Specialization</Button>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {specializations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No specializations found.
                </TableCell>
              </TableRow>
            ) : (
              specializations.map((spec) => (
                <TableRow key={spec._id}>
                  <TableCell className="font-medium">{spec.name}</TableCell>
                  <TableCell>{spec.slug}</TableCell>
                  <TableCell>{spec.icon}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${spec.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {spec.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(spec)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this?')) {
                          deleteMutation.mutate(spec._id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Specialization' : 'Add Specialization'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cardiologist"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. cardiologist"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (optional)</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g. Activity"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" className="mr-2" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpecializationsPage;
