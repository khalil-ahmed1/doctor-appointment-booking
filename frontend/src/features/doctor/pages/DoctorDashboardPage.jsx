import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  CheckCircle,
  Clock,
  CalendarDays,
  ListOrdered,
  Wallet,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function DoctorDashboardPage() {
  const {
    data: kpis,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['doctor-dashboard-kpis'],
    queryFn: doctorApi.getDashboardKPIs,
    refetchInterval: 30000, // refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load dashboard data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      </div>

      {kpis.subscriptionStatus.status === 'EXPIRED' && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive">
          <AlertTitle>Subscription Expired</AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-2">
            <span>Your profile is currently hidden and you cannot accept new bookings.</span>
            <Button size="sm" asChild>
              <Link to="/doctor/subscription">Renew Now</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {kpis.subscriptionStatus.status === 'GRACE' && (
        <Alert variant="warning" className="bg-yellow-100 border-yellow-400 text-yellow-800">
          <AlertTitle>Subscription Grace Period</AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-2">
            <span>
              Your subscription has ended. You have a few days to renew before your profile is
              hidden.
            </span>
            <Button size="sm" variant="outline" className="border-yellow-400" asChild>
              <Link to="/doctor/subscription">Renew Now</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {kpis.payoutStatus !== 'ACTIVE' && (
        <Alert className="bg-orange-100 border-orange-400 text-orange-800">
          <AlertTitle>Payout Account Status: {kpis.payoutStatus}</AlertTitle>
          <AlertDescription>
            Your payout account is not fully active yet. Please contact admin if this persists.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.today.confirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today Pending/Checkout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.today.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming (7 days)</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.upcomingAppointmentsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal Queue Size</CardTitle>
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.normalQueueSize}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Earnings</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(kpis.thisMonthEarnings / 100).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.subscriptionStatus.status}</div>
            {kpis.subscriptionStatus.endsAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Ends: {new Date(kpis.subscriptionStatus.endsAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
