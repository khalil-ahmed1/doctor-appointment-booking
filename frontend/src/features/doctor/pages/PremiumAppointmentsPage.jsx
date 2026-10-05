import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { formatTime12h, formatDateIndian } from '../../../utils/formatters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function PremiumAppointmentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
  });

  const [searchInput, setSearchInput] = useState('');
  const [rescheduleDialog, setRescheduleDialog] = useState({
    isOpen: false,
    appointmentId: null,
    dateStr: '',
    startTime: '',
  });

  const queryParams = {
    ...filters,
    type: 'PREMIUM',
  };

  if (activeTab === 'ACTIVE') {
    queryParams.excludeStatus = 'COMPLETED,NO_SHOW,CANCELLED_BY_DOCTOR,CANCELLED_BY_ADMIN,REFUNDED,PAYMENT_FAILED,EXPIRED';
  } else {
    queryParams.status = 'COMPLETED,NO_SHOW,CANCELLED_BY_DOCTOR,CANCELLED_BY_ADMIN,REFUNDED,PAYMENT_FAILED,EXPIRED';
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['doctor-premium-appointments', queryParams],
    queryFn: () => doctorApi.getAppointments(queryParams),
  });

  const updateStatusMutation = useMutation({
    mutationFn: doctorApi.updateAppointmentStatus,
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries(['doctor-premium-appointments']);
      queryClient.invalidateQueries(['doctor-dashboard-kpis']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: doctorApi.rescheduleAppointment,
    onSuccess: () => {
      toast.success('Appointment rescheduled successfully');
      setRescheduleDialog({ isOpen: false, appointmentId: null, dateStr: '', startTime: '' });
      queryClient.invalidateQueries(['doctor-premium-appointments']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reschedule');
    },
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput, page: 1 };
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleStatusChange = (id, newStatus) => {
    if (newStatus === 'CANCELLED_BY_DOCTOR') {
      const reason = window.prompt('Please enter cancellation reason:');
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
      case 'CONFIRMED':
        return <Badge className="bg-blue-500">Confirmed</Badge>;
      case 'CHECKED_IN':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Checked In</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'NO_SHOW':
        return <Badge variant="destructive">No Show</Badge>;
      case 'CANCELLED_BY_DOCTOR':
      case 'CANCELLED_BY_ADMIN':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'PAYMENT_FAILED':
        return <Badge variant="destructive">Payment Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const formatDateSeparator = (dateStr) => {
    const today = dayjs().format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    return dayjs(dateStr).format('dddd, DD MMM YYYY');
  };

  const renderTableBody = () => {
    let lastDateStr = null;
    const rows = [];

    data?.appointments?.forEach((app) => {
      if (app.dateStr !== lastDateStr) {
        rows.push(
          <tr key={`header-${app.dateStr}`} className="bg-muted/30">
            <td colSpan="6" className="py-2 px-4 font-semibold text-primary/80 border-b">
              {formatDateSeparator(app.dateStr)}
            </td>
          </tr>
        );
        lastDateStr = app.dateStr;
      }

      rows.push(
        <tr key={app._id} className="border-b transition-colors hover:bg-muted/50">
          <td className="p-4 align-middle">
            <span className="font-medium text-base">{formatDateIndian(app.dateStr)}</span>
            <div className="font-bold text-primary">{formatTime12h(app.startTime)}</div>
            <div className="text-xs text-muted-foreground mt-1">Code: {app.bookingCode}</div>
          </td>
          <td className="p-4 align-middle font-medium">
            {app.patientDetails?.name || app.patient?.name}
          </td>
          <td className="p-4 align-middle text-muted-foreground">
            {app.patientDetails?.age ? `${app.patientDetails.age} Y` : 'N/A'} / {app.patientDetails?.gender || 'N/A'}
          </td>
          <td className="p-4 align-middle text-muted-foreground">
            {app.patientDetails?.phone || 'N/A'}
          </td>
          <td className="p-4 align-middle">
            {getStatusBadge(app.status)}
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
                {(app.status === 'CONFIRMED' || app.status === 'CHECKED_IN') && (
                  <DropdownMenuItem onClick={() => handleStatusChange(app._id, 'COMPLETED')}>
                    Mark Completed
                  </DropdownMenuItem>
                )}
                {(app.status === 'CONFIRMED' || app.status === 'CHECKED_IN') && (
                  <DropdownMenuItem onClick={() => handleStatusChange(app._id, 'NO_SHOW')}>
                    Mark No-show
                  </DropdownMenuItem>
                )}
                {app.status === 'CONFIRMED' && (
                  <DropdownMenuItem
                    onClick={() =>
                      setRescheduleDialog({
                        isOpen: true,
                        appointmentId: app._id,
                        dateStr: app.dateStr,
                        startTime: app.startTime,
                      })
                    }
                  >
                    Reschedule
                  </DropdownMenuItem>
                )}
                {(app.status === 'CONFIRMED' || app.status === 'CHECKED_IN') && (
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => handleStatusChange(app._id, 'CANCELLED_BY_DOCTOR')}
                  >
                    Cancel & Refund
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
      );
    });

    return <tbody className="[&_tr:last-child]:border-0">{rows}</tbody>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Premium Appointments</h1>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-4">
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setFilters(prev => ({...prev, page: 1})) }}>
            <TabsList>
              <TabsTrigger value="ACTIVE">Active Records</TabsTrigger>
              <TabsTrigger value="PAST">Past / Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search by name, phone or code"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
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
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date / Time</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient Name</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Age / Gender</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Phone</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  {renderTableBody()}
                </table>
              </div>
            </div>
          )}

          {data?.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
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
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={rescheduleDialog.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setRescheduleDialog((prev) => ({ ...prev, isOpen: false }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Propose a new date and time. This will automatically update the booking and notify the
              patient.
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
                onChange={(e) =>
                  setRescheduleDialog((prev) => ({ ...prev, dateStr: e.target.value }))
                }
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
                onChange={(e) =>
                  setRescheduleDialog((prev) => ({ ...prev, startTime: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleDialog((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
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
