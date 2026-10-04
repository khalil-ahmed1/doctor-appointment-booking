import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { toast } from 'sonner';

export default function AdminAppointmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminAppointments', page, statusFilter, typeFilter],
    queryFn: () => adminApi.getAppointments({ page, limit: 12, status: statusFilter, type: typeFilter }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.cancelAppointment(id, reason),
    onSuccess: () => {
      toast.success('Appointment cancelled & refunded');
      queryClient.invalidateQueries({ queryKey: ['adminAppointments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel appointment');
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading appointments...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load appointments.</div>;
  }

  const appointments = data?.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">All Appointments</h1>
        <div className="flex space-x-4">
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="NORMAL">Normal</option>
            <option value="PREMIUM">Premium</option>
            <option value="HOME_VISIT">Home Visit</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED_BY_DOCTOR">Cancelled (Doctor)</option>
            <option value="CANCELLED_BY_ADMIN">Cancelled (Admin)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Booking Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date/Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-slate-500">
                  No appointments found.
                </td>
              </tr>
            ) : (
              appointments.map((appt) => (
                <tr key={appt._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {appt.bookingCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{appt.patient?.name}</div>
                    <div className="text-sm text-slate-500">{appt.patient?.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {appt.doctor?.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {appt.type === 'NORMAL' ? (
                      <span className="font-semibold text-slate-700">{appt.tokenLabel} (Normal)</span>
                    ) : (
                      <>
                        <div>{appt.dateStr}</div>
                        <div className="text-slate-500">{appt.startTime}</div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {appt.status === 'CONFIRMED' && (
                      <button 
                        onClick={() => {
                          const reason = prompt('Enter cancellation reason (min 5 characters):');
                          if (reason && reason.length >= 5) {
                            cancelMutation.mutate({ id: appt._id, reason });
                          } else if (reason !== null) {
                            toast.error('Reason must be at least 5 characters');
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel & Refund
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
