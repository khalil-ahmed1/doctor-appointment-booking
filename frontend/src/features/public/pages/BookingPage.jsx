import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDoctorBySlug, getDoctorSlots } from '../api/public.api';
import { holdSlot, createOrder, verifyPayment } from '../api/booking.api';
import { useAuth } from '../../../contexts/AuthContext';
import { format, addDays, isBefore, startOfToday } from 'date-fns';
import { Clock, ChevronRight, MapPin, Hash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const BookingPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const defaultType = searchParams.get('type') || 'PREMIUM';
  const [step, setStep] = useState(1);
  const [type, setType] = useState(defaultType);
  const [date, setDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientDetails, setPatientDetails] = useState({ name: user?.name || '', phone: user?.phone || '', age: '', gender: '', relation: 'SELF' });
  const [address, setAddress] = useState({ line1: '', city: '', state: '', pincode: '', location: { lat: 20.5937, lng: 78.9629 } });
  const [saveAddress, setSaveAddress] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState('new');
  
  const [heldAppointment, setHeldAppointment] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', slug],
    queryFn: () => getDoctorBySlug(slug),
  });

  const { data: slots, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['slots', slug, type, date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: () => getDoctorSlots(slug, type, format(date, 'yyyy-MM-dd')),
    enabled: !!date && (type === 'PREMIUM' || type === 'HOME_VISIT') && !!doctor,
    refetchInterval: 20000,
  });

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && heldAppointment && step === 3) {
      timerRef.current = setTimeout(() => {
        toast.error("Hold expired. Please select a slot again.");
        setStep(1);
        setHeldAppointment(null);
      }, 0);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown, heldAppointment, step]);

  const handleHoldSlot = async () => {
    try {
      let dateStr = type === 'NORMAL' ? format(new Date(), 'yyyy-MM-dd') : format(date, 'yyyy-MM-dd');
      let start = type === 'NORMAL' ? '00:00' : selectedSlot.startTime;
      let end = type === 'NORMAL' ? '23:59' : selectedSlot.endTime;

      const res = await holdSlot({
        doctorId: doctor._id,
        type,
        dateStr,
        startTime: start,
        endTime: end,
        idempotencyKey: `${Date.now()}`,
        patientDetails,
        addressSnapshot: type === 'HOME_VISIT' ? address : undefined,
        saveAddress: useSavedAddress === 'new' ? saveAddress : false,
      });

      setHeldAppointment(res);
      // Calculate remaining seconds
      const expiresAt = new Date(res.holdExpiresAt).getTime();
      const remaining = Math.floor((expiresAt - Date.now()) / 1000);
      setCountdown(Math.max(0, remaining));
      setStep(3); // Review and Pay
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to hold slot');
    }
  };

  const handlePayment = async () => {
    try {
      const order = await createOrder(heldAppointment._id);
      
      const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!rzpKey || rzpKey === 'rzp_test_mock') {
         toast.error("Razorpay Key ID is missing in frontend .env. Please add VITE_RAZORPAY_KEY_ID and restart the dev server.");
         return;
      }

      const options = {
        key: rzpKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Doctor Appointment Booking',
        description: `Booking with Dr. ${doctor.fullName}`,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            // Go to success page
            navigate(`/doctors/${slug}/book/success`, {
               state: { appointment: heldAppointment, doctor }
            });
          } catch {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: patientDetails.name,
          email: user?.email,
          contact: patientDetails.phone
        },
        theme: { color: '#2563eb' }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        toast.error(response.error.description);
      });
      rzp.open();

    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    }
  };

  if (isLoading || !doctor) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Book Appointment with Dr. {doctor.fullName}</h1>
        <div className="flex items-center text-sm text-muted-foreground mt-2 space-x-2">
           <span className={step >= 1 ? "text-blue-600 font-medium" : ""}>Selection</span>
           <ChevronRight className="w-4 h-4" />
           <span className={step >= 2 ? "text-blue-600 font-medium" : ""}>Patient Details</span>
           <ChevronRight className="w-4 h-4" />
           <span className={step >= 3 ? "text-blue-600 font-medium" : ""}>Review & Pay</span>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Type & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Consultation Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  {doctor.types?.normal?.enabled && (
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${type === 'NORMAL' ? 'border-blue-600 bg-blue-50/50' : 'hover:border-slate-300'}`}
                      onClick={() => setType('NORMAL')}
                    >
                      <div className="font-semibold flex justify-between">Clinic Visit <Hash className="w-4 h-4"/></div>
                      <div className="text-sm text-muted-foreground mt-1">Walk-in Queue</div>
                      <div className="mt-3 font-bold text-blue-700">₹{(doctor.fees?.normal || 0) / 100}</div>
                    </div>
                  )}
                  {doctor.types?.premium?.enabled && (
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${type === 'PREMIUM' ? 'border-blue-600 bg-blue-50/50' : 'hover:border-slate-300'}`}
                      onClick={() => setType('PREMIUM')}
                    >
                      <div className="font-semibold flex justify-between">Premium Slot <Clock className="w-4 h-4"/></div>
                      <div className="text-sm text-muted-foreground mt-1">Reserved Timing</div>
                      <div className="mt-3 font-bold text-blue-700">₹{(doctor.fees?.premium || 0) / 100}</div>
                    </div>
                  )}
                  {doctor.types?.homeVisit?.enabled && (
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${type === 'HOME_VISIT' ? 'border-blue-600 bg-blue-50/50' : 'hover:border-slate-300'}`}
                      onClick={() => setType('HOME_VISIT')}
                    >
                      <div className="font-semibold flex justify-between">Home Visit <MapPin className="w-4 h-4"/></div>
                      <div className="text-sm text-muted-foreground mt-1">Doctor visits you</div>
                      <div className="mt-3 font-bold text-blue-700">₹{(doctor.fees?.homeVisit || 0) / 100}</div>
                    </div>
                  )}
                </div>
              </div>

              {(type === 'PREMIUM' || type === 'HOME_VISIT') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                  <div>
                    <Label className="mb-2 block">Select Date</Label>
                    <div className="border rounded-md inline-block bg-white shadow-sm p-2">
                       <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => { setDate(d); setSelectedSlot(null); }}
                          disabled={(d) => isBefore(d, startOfToday()) || isBefore(addDays(startOfToday(), doctor.schedule?.advanceBookingDays || 30), d)}
                       />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Available Slots {date && `- ${format(date, 'MMM d, yyyy')}`}</Label>
                    {!date ? (
                      <div className="text-sm text-muted-foreground flex items-center h-32 justify-center border border-dashed rounded-md">
                        Please select a date first
                      </div>
                    ) : isLoadingSlots ? (
                       <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600"/></div>
                    ) : slots?.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {slots.map((s, idx) => (
                          <Button
                            key={idx}
                            variant={selectedSlot?.startTime === s.startTime ? "default" : "outline"}
                            className={`w-full ${s.status !== 'AVAILABLE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={s.status !== 'AVAILABLE'}
                            onClick={() => setSelectedSlot(s)}
                          >
                            {s.startTime}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground flex items-center h-32 justify-center border border-dashed rounded-md bg-slate-50">
                        No slots available on this date.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
               <Button 
                 onClick={() => setStep(2)}
                 disabled={(type !== 'NORMAL' && !selectedSlot)}
                 className="px-8"
               >
                 Continue
               </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Details</CardTitle>
              <CardDescription>Who is this appointment for?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input value={patientDetails.name} onChange={e => setPatientDetails({...patientDetails, name: e.target.value})} placeholder="Full name"/>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={patientDetails.phone} onChange={e => setPatientDetails({...patientDetails, phone: e.target.value})} placeholder="10-digit mobile"/>
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" value={patientDetails.age} onChange={e => setPatientDetails({...patientDetails, age: e.target.value})} placeholder="Years"/>
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={patientDetails.gender} onValueChange={v => setPatientDetails({...patientDetails, gender: v})}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="O">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Relation</Label>
                  <Select value={patientDetails.relation} onValueChange={v => setPatientDetails({...patientDetails, relation: v})}>
                    <SelectTrigger><SelectValue placeholder="Select relation" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELF">Self</SelectItem>
                      <SelectItem value="SPOUSE">Spouse</SelectItem>
                      <SelectItem value="CHILD">Child</SelectItem>
                      <SelectItem value="PARENT">Parent</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {type === 'HOME_VISIT' && (
                <div className="mt-6 space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Visit Address</h3>
                  
                  {user?.savedAddresses && user.savedAddresses.length > 0 && (
                     <div className="space-y-2 mb-4">
                        <Label>Select Address</Label>
                        <Select 
                           value={useSavedAddress} 
                           onValueChange={v => {
                              setUseSavedAddress(v);
                              if (v !== 'new') {
                                 const addr = user.savedAddresses[parseInt(v)];
                                 setAddress(addr);
                              } else {
                                 setAddress({ line1: '', city: '', state: '', pincode: '', location: { lat: 20.5937, lng: 78.9629 } });
                              }
                           }}
                        >
                           <SelectTrigger><SelectValue placeholder="Choose address" /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="new">-- Enter New Address --</SelectItem>
                             {user.savedAddresses.map((addr, idx) => (
                               <SelectItem key={idx} value={`${idx}`}>{addr.line1}, {addr.city} - {addr.pincode}</SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
                     </div>
                  )}

                  {useSavedAddress === 'new' && (
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input value={address.line1} onChange={e => setAddress({...address, line1: e.target.value})} placeholder="House/Flat No, Building, Street"/>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input value={address.city} onChange={e => setAddress({...address, city: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                          <Label>Pincode</Label>
                          <Input value={address.pincode} onChange={e => setAddress({...address, pincode: e.target.value})}/>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm text-blue-600 cursor-pointer" onClick={() => {
                           toast.success("Location coordinates updated from Map Pin");
                           setAddress({...address, location: { lat: 28.6139, lng: 77.2090 }});
                        }}>
                           <MapPin className="w-4 h-4"/> Set Location via Map Pin (Mocked)
                        </Label>
                        <p className="text-xs text-muted-foreground">Current: {address.location?.lat?.toFixed(4)}, {address.location?.lng?.toFixed(4)}</p>
                     </div>
                     <div className="flex items-center space-x-2 pt-2">
                       <input type="checkbox" id="saveAddr" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} className="rounded border-slate-300"/>
                       <Label htmlFor="saveAddr" className="text-sm font-normal">Save this address for future bookings</Label>
                     </div>
                  </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
               <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
               <Button onClick={handleHoldSlot} disabled={!patientDetails.name || !patientDetails.phone}>
                 Review & Pay
               </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 3 && heldAppointment && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          <Card className="border-blue-200 shadow-md">
            <CardHeader className="bg-blue-50/50 border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Review & Pay</CardTitle>
                <div className="bg-white px-3 py-1.5 rounded-full border shadow-sm text-sm font-bold text-red-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5"/> 
                  {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <div className="bg-slate-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">Booking Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Doctor</span>
                    <span className="font-medium">Dr. {doctor.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient Name</span>
                    <span className="font-medium">{patientDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date & Time</span>
                    <span className="font-medium">
                      {type === 'NORMAL' 
                        ? heldAppointment.dateStr 
                        : `${heldAppointment.dateStr} at ${heldAppointment.startTime}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 px-1">
                <h4 className="font-semibold text-slate-800 mb-2">Price Breakdown</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Consultation Fee</span>
                  <span>₹{heldAppointment.fee.consultationFee / 100}</span>
                </div>
                {heldAppointment.fee.convenienceFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee (incl. GST)</span>
                    <span>₹{heldAppointment.fee.convenienceFee / 100}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-3 border-t mt-3">
                  <span>Total Amount</span>
                  <span className="text-blue-700">₹{heldAppointment.fee.total / 100}</span>
                </div>
              </div>

            </CardContent>
            <CardFooter className="pt-6">
               <Button className="w-full text-lg h-12" onClick={handlePayment}>
                 Pay ₹{heldAppointment.fee.total / 100}
               </Button>
            </CardFooter>
          </Card>
          
          <p className="text-center text-xs text-muted-foreground">
             By proceeding, you agree to our terms of service and cancellation policy.
          </p>
        </div>
      )}

    </div>
  );
};

export default BookingPage;
