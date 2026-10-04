import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyPayments } from '../api/patient.api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

const PaymentsTab = () => {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: getMyPayments,
  });

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      {!payments || payments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">No payment history found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => (
            <Card key={payment._id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{payment.status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), 'PP p')}
                      </span>
                    </div>

                    <div>
                      <p className="font-semibold text-lg">
                        Dr. {payment.appointment?.doctor?.fullName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Booking Code: {payment.appointment?.bookingCode}
                      </p>
                    </div>

                    {payment.razorpayPaymentId && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Payment ID: {payment.razorpayPaymentId}
                      </p>
                    )}

                    {payment.refunds?.length > 0 && (
                      <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                        {payment.refunds.map((r) => (
                          <div key={r._id}>
                            Refund: ₹{r.amount / 100} - {r.status}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-xl font-bold">₹{(payment.amount || 0) / 100}</p>
                    </div>
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

export default PaymentsTab;
