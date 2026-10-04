import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function SubscriptionsListPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', page],
    queryFn: () => adminApi.getSubscriptions({ page, limit }),
    keepPreviousData: true,
  });

  if (isLoading) return <div className="p-8">Loading subscriptions...</div>;

  const subscriptions = response?.data || [];
  const meta = response?.meta || { totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">No subscriptions found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Starts At</TableHead>
                  <TableHead>Ends At</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub._id}>
                    <TableCell className="font-medium">
                      {sub.doctor?.fullName}
                    </TableCell>
                    <TableCell>{sub.plan?.name || 'Manual Grant'}</TableCell>
                    <TableCell>
                      <Badge variant={sub.type === 'TRIAL' ? 'outline' : sub.type === 'ADMIN_GRANT' ? 'secondary' : 'default'}>
                        {sub.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.source}</TableCell>
                    <TableCell>{format(new Date(sub.startsAt), 'PP')}</TableCell>
                    <TableCell>{format(new Date(sub.endsAt), 'PP')}</TableCell>
                    <TableCell>₹{(sub.total / 100).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="text-sm font-medium">
              Page {page} of {meta.totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
