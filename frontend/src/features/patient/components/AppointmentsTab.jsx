import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyAppointments } from '../api/patient.api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { MapPin, Download, AlertCircle, Loader2 } from 'lucide-react';
import axios from '@/lib/axios';

const AppointmentsTab = () => {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: getMyAppointments,
  });

  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming | past

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const now = new Date();

  // A naive filter for upcoming vs past.
  // Real logic would be slightly more complex handling NO_SHOW, COMPLETED etc.
  const upcoming = appointments?.filter(a => {
    if (['COMPLETED', 'NO_SHOW', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_ADMIN', 'EXPIRED_TOKEN', 'EXPIRED', 'PAYMENT_FAILED'].includes(a.status)) return false;
    return true; // PENDING_PAYMENT, CONFIRMED, CHECKED_IN, IN_PROGRESS
  }) || [];

  const past = appointments?.filter(a => !upcoming.includes(a)) || [];

  const displayed = activeTab === 'upcoming' ? upcoming : past;

  const handleDownloadReceipt = async (id) => {
    try {
      const response = await axios.get(`/appointments/${id}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('Failed to download receipt');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 border-b">
        <button
          className={`pb-2 px-1 border-b-2 font-medium ${activeTab === 'upcoming' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`pb-2 px-1 border-b-2 font-medium ${activeTab === 'past' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-md flex items-start gap-3 text-blue-800 mb-4">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <p className="text-sm">
          Appointments can't be cancelled by patients. Contact the clinic for help.
        </p>
      </div>

      {displayed.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">No {activeTab} appointments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayed.map((appt) => (
            <Card key={appt._id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{appt.type}</Badge>
                      <Badge>{appt.status}</Badge>
                    </div>

                    <h3 className="font-semibold text-lg">Dr. {appt.doctor?.fullName}</h3>

                    <div className="text-sm text-muted-foreground">
                      {appt.type === 'NORMAL' ? (
                        <p>Valid from: {appt.validFrom ? format(new Date(appt.validFrom), 'PP') : ''}</p>
                      ) : (
                        <p>{format(new Date(appt.dateStr), 'PP')} at {appt.startTime}</p>
                      )}
                    </div>

                    {appt.tokenLabel && (
                      <div className="text-sm font-medium text-primary bg-primary/10 inline-block px-2 py-1 rounded">
                        Token: {appt.tokenLabel}
                      </div>
                    )}

                    {appt.type === 'HOME_VISIT' && appt.addressSnapshot && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          {appt.addressSnapshot.line1}, {appt.addressSnapshot.city}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Booking Code</p>
                      <p className="font-mono font-medium">{appt.bookingCode}</p>
                      <p className="mt-2 font-semibold">₹{(appt.fee?.total || 0) / 100}</p>
                    </div>

                    {['CONFIRMED', 'COMPLETED', 'CHECKED_IN', 'IN_PROGRESS'].includes(appt.status) && (
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => handleDownloadReceipt(appt._id)}>
                        <Download className="mr-2 h-4 w-4" /> Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentsTab;
