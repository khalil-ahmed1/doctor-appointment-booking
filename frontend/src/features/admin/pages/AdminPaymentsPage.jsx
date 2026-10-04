import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { toast } from 'sonner';

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminPayments', page, statusFilter],
    queryFn: () => adminApi.getPayments({ page, limit: 12, status: statusFilter }),
  });

  const retryTransferMutation = useMutation({
    mutationFn: (id) => adminApi.retryTransfer(id),
    onSuccess: () => {
      toast.success('Transfer retry initiated');
      queryClient.invalidateQueries({ queryKey: ['adminPayments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to retry transfer');
    }
  });

  const manualRefundMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.manualRefund(id, reason),
    onSuccess: () => {
      toast.success('Manual refund initiated');
      queryClient.invalidateQueries({ queryKey: ['adminPayments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to initiate refund');
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading payments...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load payments.</div>;
  }

  const payments = data?.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">All Payments</h1>
        <div className="flex space-x-4">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="CAPTURED">Captured</option>
            <option value="REFUNDED">Refunded</option>
            <option value="REFUND_INITIATED">Refund Initiated</option>
            <option value="PAYMENT_FAILED">Failed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payment ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Appointment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transfers</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {payments.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-slate-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div>{payment._id}</div>
                    <div className="text-xs text-slate-400">RZP: {payment.razorpayPaymentId || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.appointment ? (
                      <>
                        <div className="text-sm font-medium text-slate-900">{payment.appointment.bookingCode}</div>
                        <div className="text-sm text-slate-500">{payment.appointment.doctor?.fullName}</div>
                      </>
                    ) : (
                      <span className="text-sm text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                    ₹{(payment.amount / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {payment.transfers?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {payment.transfers.map((t, idx) => (
                          <div key={idx} className={`text-xs ${t.status === 'failed' ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                            {t.status} (₹{(t.amount / 100).toFixed(2)})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">No transfers</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {payment.transfers?.some(t => t.status === 'failed') && (
                      <button 
                        onClick={() => retryTransferMutation.mutate(payment._id)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Retry Transfer
                      </button>
                    )}
                    
                    {['CAPTURED', 'TRANSFERRED'].includes(payment.status) && (
                      <button 
                        onClick={() => {
                          const reason = prompt('Enter manual refund reason (min 5 characters):');
                          if (reason && reason.length >= 5) {
                            manualRefundMutation.mutate({ id: payment._id, reason });
                          } else if (reason !== null) {
                            toast.error('Reason must be at least 5 characters');
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Manual Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
