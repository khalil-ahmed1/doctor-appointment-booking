import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorEarningsPage() {
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-earnings', page],
    queryFn: () => doctorApi.getEarnings({ page, limit: 20 }),
  });

  const handleExport = async () => {
    try {
      const blob = await doctorApi.exportEarningsCSV({});
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Earnings_Ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV', error);
      alert('Failed to export CSV');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-green-100 text-green-800">Processed</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'REFUNDED':
        return <Badge variant="secondary">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { transactions, pagination } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earnings & Payouts</h1>
          <p className="text-muted-foreground">View your transaction ledger and payout history.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">No transactions found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Booking Code</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Gateway Fee</TableHead>
                      <TableHead className="text-right">GST on Fee</TableHead>
                      <TableHead className="text-right">Platform Comm.</TableHead>
                      <TableHead className="text-right">Net to Doctor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(tx.date), 'dd MMM yyyy, HH:mm')}</TableCell>
                        <TableCell className="font-medium">{tx.bookingCode}</TableCell>
                        <TableCell>{tx.patientName}</TableCell>
                        <TableCell>
                          {tx.type === 'NORMAL' && 'Normal'}
                          {tx.type === 'PREMIUM' && 'Premium'}
                          {tx.type === 'HOME_VISIT' && 'Home Visit'}
                          {!['NORMAL','PREMIUM','HOME_VISIT'].includes(tx.type) && tx.type}
                        </TableCell>
                        <TableCell className="text-right">₹{(tx.gross / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">-₹{(tx.gatewayFee / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">-₹{(tx.gstOnFee / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">-₹{(tx.platformCommission / 100).toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-bold ${tx.isRefunded ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.isRefunded ? '-' : ''}₹{(Math.abs(tx.netToDoctor) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.transferStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
