import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';

import { Users, Activity, Calendar, CreditCard, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StatCard = ({ title, value, icon: Icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

const AdminDashboardPage = () => {
  const {
    data: result,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-dashboard-kpis'],
    queryFn: adminApi.getDashboardKPIs,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  if (isError || !result?.data) {
    return <div className="p-8 text-center text-red-500">Failed to load dashboard KPIs.</div>;
  }

  const kpis = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key performance indicators.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Doctors"
          value={kpis.totalDoctors}
          icon={Activity}
          description="Active doctors on platform"
        />
        <StatCard
          title="Total Patients"
          value={kpis.totalPatients}
          icon={Users}
          description="Registered patients"
        />
        <StatCard
          title="Total Appointments"
          value={kpis.totalAppointments}
          icon={Calendar}
          description="All-time bookings"
        />
        <StatCard
          title="Gross Merchandise Value"
          value={`₹${(kpis.gmv / 100).toFixed(2)}`}
          icon={TrendingUp}
          description="Total booking value processed"
        />
        <StatCard
          title="Subscription Revenue"
          value={`₹${(kpis.subscriptionRevenue / 100).toFixed(2)}`}
          icon={CreditCard}
          description="Total subscription sales"
        />
        <StatCard
          title="Active Subscriptions"
          value={kpis.activeSubscriptions}
          icon={Award}
          description="Currently active doctor plans"
        />
      </div>
    </div>
  );
};

export default AdminDashboardPage;
