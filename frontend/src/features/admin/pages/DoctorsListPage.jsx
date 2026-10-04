import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ManualSubscriptionModal from '../components/ManualSubscriptionModal';

export default function DoctorsListPage() {
  const queryClient = useQueryClient();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminDoctors'],
    queryFn: () => adminApi.getDoctors({ page: 1, limit: 50 }),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }) => adminApi.updateDoctorPublish(id, isPublished),
    onSuccess: () => {
      toast.success('Publish status updated');
      queryClient.invalidateQueries({ queryKey: ['adminDoctors'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update publish status');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateDoctorStatus(id, status),
    onSuccess: () => {
      toast.success('Account status updated');
      queryClient.invalidateQueries({ queryKey: ['adminDoctors'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update account status');
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading doctors...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load doctors.</div>;
  }

  const doctors = data?.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Manage Doctors</h1>
        <Link
          to="/admin/doctors/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Doctor
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Doctor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Published
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {doctors.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                  No doctors found.
                </td>
              </tr>
            ) : (
              doctors.map((doc) => (
                <tr key={doc._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {doc.fullName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{doc.fullName}</div>
                        <div className="text-sm text-slate-500">
                          {doc.specializations?.map((s) => s.name).join(', ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{doc.user?.email}</div>
                    <div className="text-sm text-slate-500">{doc.user?.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doc.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doc.isPublished
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {doc.isPublished ? 'Published' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() =>
                        publishMutation.mutate({ id: doc._id, isPublished: !doc.isPublished })
                      }
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      {doc.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() =>
                        statusMutation.mutate({
                          id: doc._id,
                          status: doc.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        })
                      }
                      className={`${doc.status === 'ACTIVE' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                    >
                      {doc.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setIsSubModalOpen(true);
                      }}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Manage Sub
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ManualSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => {
          setIsSubModalOpen(false);
          setSelectedDoctor(null);
        }}
        doctor={selectedDoctor}
      />
    </div>
  );
}
