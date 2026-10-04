import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Calendar, MapPin, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

const BookingSuccessPage = () => {
  const location = useLocation();
  const { appointment, doctor } = location.state || {};

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 text-center">
        <h2 className="text-2xl font-bold mb-4">No Booking Found</h2>
        <Button asChild><Link to="/">Go Home</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-12 pb-24 px-4">
      <Card className="border-green-100 shadow-sm">
        <CardHeader className="bg-green-50 text-center pb-8 pt-10 rounded-t-xl border-b border-green-100">
          <div className="mx-auto bg-green-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-white">
            <CheckCircle className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl text-green-900">Booking Confirmed!</CardTitle>
          <p className="text-green-700 mt-2">
            Your {appointment.type.toLowerCase().replace('_', ' ')} appointment has been scheduled.
          </p>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between bg-slate-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="font-semibold">{appointment.bookingCode}</p>
            </div>
            {appointment.type === 'NORMAL' && appointment.tokenLabel && (
              <div className="mt-4 md:mt-0">
                <p className="text-sm text-muted-foreground">Queue Token</p>
                <p className="font-bold text-2xl text-blue-600 flex items-center">
                  <Hash className="w-5 h-5 mr-1" /> {appointment.tokenLabel}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">Appointment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Doctor</p>
                <p className="font-medium">Dr. {doctor?.fullName}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-medium">{appointment.patientDetails?.name || 'Self'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-1" /> Date & Time
                </p>
                <p className="font-medium">
                  {appointment.dateStr} 
                  {appointment.type === 'NORMAL' 
                    ? ' (Anytime during working hours)' 
                    : ` at ${appointment.startTime} - ${appointment.endTime}`}
                </p>
              </div>

              {appointment.type === 'HOME_VISIT' && appointment.addressSnapshot && (
                <div className="col-span-1 md:col-span-2">
                   <p className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="w-4 h-4 mr-1" /> Address
                  </p>
                  <p className="font-medium">{appointment.addressSnapshot.line1}, {appointment.addressSnapshot.city}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t">
          <Button 
             variant="outline" 
             className="w-full sm:w-auto" 
             onClick={async () => {
                try {
                  const api = (await import('../../../lib/axios')).default;
                  const response = await api.get(`/appointments/${appointment._id}/receipt`, { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `Receipt-${appointment.bookingCode}.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch {
                  alert('Failed to download receipt');
                }
             }}
          >
            Download Receipt (PDF)
          </Button>
          <Button className="w-full sm:w-auto" asChild>
            <Link to="/patient/dashboard">Go to My Appointments</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
export default BookingSuccessPage;
