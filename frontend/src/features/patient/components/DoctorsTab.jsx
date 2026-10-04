import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyDoctors } from '../api/patient.api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';

const DoctorsTab = () => {
  const { data: doctors, isLoading } = useQuery({
    queryKey: ['my-doctors'],
    queryFn: getMyDoctors,
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {(!doctors || doctors.length === 0) ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">You haven't booked any doctors yet.</p>
            <Button asChild className="mt-4">
              <Link to="/doctors">Browse Doctors</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <Card key={doctor._id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <img 
                      src={doctor.profilePicture || 'https://via.placeholder.com/150'} 
                      alt={doctor.fullName}
                      className="w-16 h-16 rounded-full object-cover border"
                    />
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1">Dr. {doctor.fullName}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {doctor.specializations?.join(', ')}
                      </p>
                    </div>
                  </div>
                  
                  {doctor.clinic?.name && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{doctor.clinic.name}, {doctor.clinic.city}</span>
                    </div>
                  )}
                  
                  <Button asChild className="w-full">
                    <Link to={`/doctors/${doctor.slug}`}>Book Again</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorsTab;
