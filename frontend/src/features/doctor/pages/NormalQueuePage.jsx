import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, User as UserIcon, LogIn, Stethoscope, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NormalQueuePage() {
  const queryClient = useQueryClient();

  const {
    data: queue,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['doctor-normal-queue'],
    queryFn: doctorApi.getNormalQueue,
  });

  const updateStatusMutation = useMutation({
    mutationFn: doctorApi.updateAppointmentStatus,
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries(['doctor-normal-queue']);
      queryClient.invalidateQueries(['doctor-dashboard-kpis']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const handleStatusChange = (id, newStatus) => {
    if (newStatus === 'CANCELLED_BY_DOCTOR') {
      const reason = window.prompt('Please enter cancellation reason:');
      if (!reason) return;
      updateStatusMutation.mutate({ id, status: newStatus, reason });
      return;
    }
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
            Waiting
          </Badge>
        );
      case 'CHECKED_IN':
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Checked In
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-center py-8 text-destructive">Failed to load queue</div>;
  }

  const activeTokens = queue || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Normal Queue Board</h1>
          <p className="text-muted-foreground mt-1">Live view of today's walk-in patients</p>
        </div>
      </div>

      {activeTokens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Queue is empty</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No active normal tokens at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeTokens.map((app) => (
            <Card
              key={app._id}
              className={`overflow-hidden transition-all ${app.status === 'IN_PROGRESS' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            >
              <div className="bg-muted px-4 py-3 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-primary">{app.tokenLabel}</span>
                  <span className="text-xs text-muted-foreground">#{app.tokenSeq}</span>
                </div>
                {getStatusBadge(app.status)}
              </div>
              <CardContent className="p-4">
                <div className="mb-4">
                  <p className="font-medium text-lg truncate">
                    {app.patientDetails?.name || app.patient?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {app.patientDetails?.phone || 'No phone'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {app.status === 'CONFIRMED' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleStatusChange(app._id, 'CHECKED_IN')}
                      >
                        <LogIn className="w-4 h-4 mr-2" /> Check-in
                      </Button>
                    </>
                  )}
                  {app.status === 'CHECKED_IN' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStatusChange(app._id, 'IN_PROGRESS')}
                    >
                      <Stethoscope className="w-4 h-4 mr-2" /> Start
                    </Button>
                  )}
                  {app.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange(app._id, 'COMPLETED')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Complete
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleStatusChange(app._id, 'CANCELLED_BY_DOCTOR')}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
