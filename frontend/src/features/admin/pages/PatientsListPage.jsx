import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function PatientsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-patients', { page, search, status }],
    queryFn: () => adminApi.getPatients({ page, search, status, limit: 50 }),
    keepPreviousData: true,
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updatePatientBlockStatus(id, status),
    onSuccess: () => {
      toast.success('Patient status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-patients'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update patient status');
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading patients...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load patients.</div>;
  }

  const patients = data?.patients || data?.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Manage Patients</h1>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
            <option value="INVITED">Invited</option>
          </select>
          <button
            type="submit"
            className="bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md font-medium text-sm transition-colors hidden"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                    No patients found.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {patient.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{patient.name}</div>
                          <div className="text-sm text-slate-500">
                            ID: {patient._id.substring(18)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{patient.email}</div>
                      <div className="text-sm text-slate-500">{patient.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          patient.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : patient.status === 'BLOCKED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/admin/patients/${patient._id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to ${patient.status === 'BLOCKED' ? 'unblock' : 'block'} this patient?`,
                            )
                          ) {
                            blockMutation.mutate({
                              id: patient._id,
                              status: patient.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED',
                            });
                          }
                        }}
                        className={`${patient.status === 'BLOCKED' ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}`}
                      >
                        {patient.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta?.total > data?.meta?.limit && (
          <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <p className="text-sm text-slate-600">
              Showing {(page - 1) * data.meta.limit + 1} to{' '}
              {Math.min(page * data.meta.limit, data.meta.total)} of {data.meta.total} patients
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page * data.meta.limit >= data.meta.total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
