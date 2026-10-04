import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { HeartPulse, Home as HomeIcon, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchDoctors } from '../api/public.api';
import DoctorCard from '../components/DoctorCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user is logged in, redirect to appropriate place
  useEffect(() => {
    if (user) {
      if (user.role === 'PATIENT') navigate('/doctors');
      else navigate(`/${user.role.toLowerCase()}/dashboard`);
    }
  }, [user, navigate]);

  const { data: doctorsData, isLoading } = useQuery({
    queryKey: ['featured-doctors'],
    queryFn: () => searchDoctors({ limit: 3, sort: 'RELEVANCE' }),
  });

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-blue-600 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Find and Book the Best Doctors
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
            Book appointments for clinic visits or home consultations with top specialists near you.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button asChild size="lg" variant="secondary" className="font-semibold">
              <Link to="/doctors">Browse Doctors</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-transparent text-white border-white hover:bg-white hover:text-blue-600 font-semibold"
            >
              <Link to="/login">Login to Book</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">How Do You Want to Consult?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Flexible consultation models to fit your specific needs and schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <CardTitle>Walk-in (Token)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Get a token for a standard clinic visit and join the live queue on the day of your
                appointment.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-md transition-shadow border-blue-200 shadow-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4">
                <HeartPulse className="w-6 h-6" />
              </div>
              <CardTitle className="text-blue-700">Premium Slot</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Book an exact time slot in advance. Skip the waiting room and consult right on
                schedule.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <HomeIcon className="w-6 h-6" />
              </div>
              <CardTitle>Home Visit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Can't make it to the clinic? Request a verified doctor to visit your home at your
                selected time.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Top Rated Doctors</h2>
              <p className="text-muted-foreground">
                Find the most highly recommended professionals on our platform.
              </p>
            </div>
            <Button variant="link" asChild className="hidden md:flex">
              <Link to="/doctors">See all doctors</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoading
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl h-64 border border-slate-100 animate-pulse"
                  ></div>
                ))
              : doctorsData?.doctors?.map((doctor) => (
                  <DoctorCard key={doctor._id} doctor={doctor} />
                ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Button variant="link" asChild>
              <Link to="/doctors">See all doctors</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
