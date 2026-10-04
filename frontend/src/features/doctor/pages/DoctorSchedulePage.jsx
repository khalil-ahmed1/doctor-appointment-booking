import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScheduleEditor from '../components/ScheduleEditor';
import ExceptionsEditor from '../components/ExceptionsEditor';
import { CalendarDays, Home, Palmtree } from 'lucide-react';

const DoctorSchedulePage = () => {
  const { data: profile } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: doctorApi.getProfile,
  });

  const isExpired = profile?.subscription?.status === 'EXPIRED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedules & Leaves</h1>
        <p className="text-muted-foreground mt-2">
          Manage your working hours for Premium and Home Visit appointments, and block out holidays.
        </p>
      </div>

      {isExpired && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <h3 className="font-bold">Subscription Expired</h3>
          <p>
            You cannot edit schedules while your subscription is expired. Please renew your plan.
          </p>
        </div>
      )}

      <Tabs defaultValue="premium" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-8">
          <TabsTrigger value="premium" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Premium</span> Schedule
          </TabsTrigger>
          <TabsTrigger value="home_visit" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home Visit</span> Schedule
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="flex items-center gap-2">
            <Palmtree className="w-4 h-4" />
            Leaves & Exceptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="premium" className="mt-0 outline-none">
          <ScheduleEditor type="PREMIUM" isExpired={isExpired} />
        </TabsContent>

        <TabsContent value="home_visit" className="mt-0 outline-none">
          <ScheduleEditor type="HOME_VISIT" isExpired={isExpired} />
        </TabsContent>

        <TabsContent value="exceptions" className="mt-0 outline-none">
          <ExceptionsEditor isExpired={isExpired} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorSchedulePage;
