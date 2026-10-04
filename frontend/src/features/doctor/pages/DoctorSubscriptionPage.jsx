import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { getPlans } from '../../public/api/public.api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Download, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

export default function DoctorSubscriptionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: doctorApi.getProfile,
  });

  const { data: plans, isLoading: isPlansLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: getPlans,
  });

  const { data: historyRes, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['doctor-subscriptions'],
    queryFn: () => doctorApi.getSubscriptions({ limit: 10 }),
  });

  const orderMutation = useMutation({
    mutationFn: doctorApi.createSubscriptionOrder,
  });

  const verifyMutation = useMutation({
    mutationFn: doctorApi.verifySubscriptionPayment,
  });

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handleSubscribe = async (plan) => {
    setIsProcessing(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Failed to load payment gateway. Check your connection.');
        return;
      }

      // Create Order
      const orderData = await orderMutation.mutateAsync({ planId: plan._id });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mockKeyId', // Set mock key if not available
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DocBook',
        description: `Subscription: ${plan.name}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            await verifyMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan._id,
            });
            toast.success('Subscription successful!');
            queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
            queryClient.invalidateQueries({ queryKey: ['doctor-subscriptions'] });
          } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Verification failed');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#3b82f6',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to initiate payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProfileLoading || isPlansLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const sub = profile?.subscription || {};

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing details.</p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold text-lg">{sub.planName || 'No active plan'}</span>
                <Badge
                  variant={
                    sub.status === 'ACTIVE' || sub.status === 'TRIAL' ? 'default' : 'destructive'
                  }
                >
                  {sub.status || 'EXPIRED'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {sub.endsAt
                  ? `Valid until: ${format(new Date(sub.endsAt), 'PPP')}`
                  : 'You do not have any valid subscriptions.'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stacking Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How subscriptions work</AlertTitle>
        <AlertDescription>
          If you currently have time remaining on an active subscription, purchasing a new plan will
          stack the duration. Your new billing cycle will start immediately after your current one
          ends.
        </AlertDescription>
      </Alert>

      {/* Plans List */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans?.map((plan) => {
          const totalAmount = plan.price + Math.round((plan.price * plan.gstPercent) / 100);

          return (
            <Card
              key={plan._id}
              className="flex flex-col relative overflow-hidden transition-all hover:shadow-lg"
            >
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₹{(plan.price / 100).toFixed(0)}</span>
                  <span className="text-muted-foreground text-sm"> / {plan.durationDays} days</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  + {plan.gstPercent}% GST (Total: ₹{(totalAmount / 100).toFixed(2)})
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm">
                  {plan.features?.map((f, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleSubscribe(plan)}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Subscribe Now'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Subscription History */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Payment & Invoice History</h2>
        <Card>
          <CardContent className="p-0">
            {isHistoryLoading ? (
              <div className="p-8">Loading history...</div>
            ) : historyRes?.data?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Starts</TableHead>
                    <TableHead>Ends</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRes.data.map((sub) => (
                    <TableRow key={sub._id}>
                      <TableCell className="font-medium">{sub.invoiceNo || '-'}</TableCell>
                      <TableCell>{sub.plan?.name || sub.planName || 'Plan'}</TableCell>
                      <TableCell>{format(new Date(sub.startsAt), 'PP')}</TableCell>
                      <TableCell>{format(new Date(sub.endsAt), 'PP')}</TableCell>
                      <TableCell>₹{(sub.total / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        {sub.invoiceUrl ? (
                          <Button variant="outline" size="sm" asChild>
                            <a href={sub.invoiceUrl} target="_blank" rel="noreferrer">
                              <Download className="h-4 w-4 mr-2" /> Invoice
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No subscription history found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
