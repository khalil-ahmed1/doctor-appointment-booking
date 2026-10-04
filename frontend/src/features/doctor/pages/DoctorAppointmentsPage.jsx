import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function DoctorAppointmentsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    type: 'ALL',
    status: 'ALL',
  });
  
  const [searchInput, setSearchInput] = useState('');

  const [rescheduleDialog, setRescheduleDialog] = useState({
    isOpen: false,
    appointmentId: null,
    dateStr: '',
    startTime: '',
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['doctor-appointments', filters],
    queryFn: () => doctorApi.getAppointments({
      ...filters,
      type: filters.type === 'ALL' ? undefined : filters.type,
      status: filters.status === 'ALL' ? undefined : filters.status,
    }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: doctorApi.updateAppointmentStatus,
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries(['doctor-appointments']);
      queryClient.invalidateQueries(['doctor-dashboard-kpis']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  });

  const rescheduleMutation = useMutation({
    mutationFn: doctorApi.rescheduleAppointment,
    onSuccess: () => {
      toast.success('Appointment rescheduled successfully');
      setRescheduleDialog({ isOpen: false, appointmentId: null, dateStr: '', startTime: '' });
      queryClient.invalidateQueries(['doctor-appointments']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reschedule');
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleStatusChange = (id, newStatus, currentType) => {
    if (newStatus === 'CANCELLED_BY_DOCTOR') {
      const reason = window.prompt("Please enter cancellation reason:");
      if (!reason) return;
      updateStatusMutation.mutate({ id, status: newStatus, reason });
      return;
    }
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleRescheduleSubmit = () => {
    if (!rescheduleDialog.dateStr || !rescheduleDialog.startTime) {
      toast.error('Date and time are required');
      return;
    }
    rescheduleMutation.mutate({
      id: rescheduleDialog.appointmentId,
      dateStr: rescheduleDialog.dateStr,
      startTime: rescheduleDialog.startTime,
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED': return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Confirmed</Badge>;
      case 'CHECKED_IN': return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Checked In</Badge>;
      case 'EN_ROUTE': return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">En Route</Badge>;
      case 'IN_PROGRESS': return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">In Progress</Badge>;
      case 'COMPLETED': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'NO_SHOW': return <Badge variant="destructive">No Show</Badge>;
      case 'CANCELLED_BY_DOCTOR':
      case 'CANCELLED_BY_ADMIN':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'EXPIRED_TOKEN':
      case 'EXPIRED':
        return <Badge variant="secondary">Expired</Badge>;
      case 'PAYMENT_FAILED':
        return <Badge variant="destructive">Payment Failed</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge variant="outline">Pending Payment</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <form onSubmit={handleSearch} className="flex gap-2 w-full md:max-w-sm">
              <Input
                placeholder="Search by name, phone or code"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" size="icon" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
              <Select value={filters.type} onValueChange={(val) => setFilters(prev => ({ ...prev, type: val, page: 1 }))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                  <SelectItem value="HOME_VISIT">Home Visit</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.status} onValueChange={(val) => setFilters(prev => ({ ...prev, status: val, page: 1 }))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED_BY_DOCTOR">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-destructive">Failed to load appointments</div>
          ) : data?.appointments?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No appointments found
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code / Time</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {data?.appointments?.map((app) => (
                      <tr key={app._id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <td className="p-4 align-middle">
                          <div className="font-medium">{app.bookingCode}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {app.type === 'NORMAL' ? (
                              <span>Token: {app.tokenLabel}</span>
                            ) : (
                              <span>{app.dateStr} <br/> {app.startTime}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{app.patientDetails?.name || app.patient?.name}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {app.patientDetails?.phone || 'No phone'}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline" className="font-normal">{app.type.replace('_', ' ')}</Badge>
                        </td>
                        <td className="p-4 align-middle">
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="p-4 align-middle">
                          <span className="font-medium">₹{(app.fee?.consultationFee / 100 || 0).toFixed(2)}</span>
                          <div className="text-xs text-muted-foreground">
                            {app.paymentStatus || 'PENDING'}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              
                              {app.status === 'CONFIRMED' && app.type === 'PREMIUM' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(app._id, 'CHECKED_IN', app.type)}>
                                  Mark Checked-in
                                </DropdownMenuItem>
                              )}
                              
                              {app.status === 'CONFIRMED' && app.type === 'HOME_VISIT' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(app._id, 'EN_ROUTE', app.type)}>
                                  Mark En Route
                                </DropdownMenuItem>
                              )}
                              
                              {(app.status === 'CONFIRMED' || app.status === 'CHECKED_IN' || app.status === 'EN_ROUTE') && (
                                <DropdownMenuItem onClick={() => handleStatusChange(app._id, 'IN_PROGRESS', app.type)}>
                                  Start Consultation
                                </DropdownMenuItem>
                              )}
                              
                              {(app.status === 'CONFIRMED' || app.status === 'CHECKED_IN' || app.status === 'EN_ROUTE' || app.status === 'IN_PROGRESS') && (
                                <DropdownMenuItem onClick={() => handleStatusChange(app._id, 'COMPLETED', app.type)}>
                                  Mark Completed
                                </DropdownMenuItem>
                              )}
                              
                              {(app.status === 'CONFIRMED' || app.status === 'CHECKED_IN') && (
                                <DropdownMenuItem onClick={() => handleStatusChange(app._id, 'NO_SHOW', app.type)}>
                                  Mark No-show
                                </DropdownMenuItem>
                              )}

                              {app.status === 'CONFIRMED' && app.type !== 'NORMAL' && (
                                <DropdownMenuItem onClick={() => setRescheduleDialog({
                                  isOpen: true,
                                  appointmentId: app._id,
                                  dateStr: app.dateStr,
                                  startTime: app.startTime,
                                })}>
                                  Reschedule
                                </DropdownMenuItem>
                              )}

                              {(app.status === 'CONFIRMED' || app.status === 'CHECKED_IN') && (
                                <DropdownMenuItem 
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                  onClick={() => handleStatusChange(app._id, 'CANCELLED_BY_DOCTOR', app.type)}
                                >
                                  Cancel & Refund
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data?.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {filters.page} of {data.pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rescheduleDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setRescheduleDialog(prev => ({...prev, isOpen: false}))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Propose a new date and time. This will automatically update the booking and notify the patient.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dateStr" className="text-right">
                Date
              </Label>
              <Input
                id="dateStr"
                type="date"
                value={rescheduleDialog.dateStr}
                onChange={(e) => setRescheduleDialog(prev => ({ ...prev, dateStr: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">
                Time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={rescheduleDialog.startTime}
                onChange={(e) => setRescheduleDialog(prev => ({ ...prev, startTime: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button onClick={handleRescheduleSubmit} disabled={rescheduleMutation.isPending}>
              {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
