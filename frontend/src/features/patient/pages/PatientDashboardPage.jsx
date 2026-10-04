import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, CreditCard, User as UserIcon } from 'lucide-react';
import AppointmentsTab from '../components/AppointmentsTab';
import DoctorsTab from '../components/DoctorsTab';
import PaymentsTab from '../components/PaymentsTab';
import ProfileTab from '../components/ProfileTab';
import { useAuth } from '@/contexts/AuthContext';

const PatientDashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">
          Manage your appointments, payments, and profile here.
        </p>
      </div>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Appointments</span>
          </TabsTrigger>
          <TabsTrigger value="doctors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">My Doctors</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-6">
          <AppointmentsTab />
        </TabsContent>
        <TabsContent value="doctors" className="mt-6">
          <DoctorsTab />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientDashboardPage;
