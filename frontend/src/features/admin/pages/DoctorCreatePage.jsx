import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from '@/lib/axios';

const doctorSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\d{10}$/, '10 digits required'),
  sendInvite: z.boolean().default(true),
  specializations: z.array(z.string()).min(1, 'Select at least one specialization'),
  experienceYears: z.number().min(0).default(0),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  registration: z.object({
    number: z.string().min(1, 'Required'),
    council: z.string().min(1, 'Required'),
    year: z.number().min(1900),
  }),
  qualifications: z.array(z.object({
    degree: z.string().min(1, 'Required'),
    institute: z.string().min(1, 'Required'),
    year: z.number().min(1900),
  })).min(1, 'At least one required'),
  clinic: z.object({
    name: z.string().min(1, 'Required'),
    line1: z.string().min(1, 'Required'),
    city: z.string().min(1, 'Required'),
    state: z.string().min(1, 'Required'),
    pincode: z.string().min(1, 'Required'),
    location: z.object({ lat: z.number().default(0), lng: z.number().default(0) })
  }),
  payout: z.object({
    legalName: z.string().min(1, 'Required for payouts'),
    businessType: z.enum(['individual', 'proprietorship', 'partnership', 'private_limited']).default('individual'),
    bankLast4: z.string().regex(/^\d{4}$/, 'Must be 4 digits'),
    ifsc: z.string().min(1, 'Required'),
    panLast4: z.string().regex(/^[A-Z0-9]{4}$/i, 'Must be 4 characters'),
  }).optional(),
});

export default function DoctorCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: specializationsData } = useQuery({
    queryKey: ['specializations'],
    queryFn: async () => {
      const res = await axios.get('/specializations');
      return res.data;
    }
  });
  const specializations = specializationsData?.data || [];

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      sendInvite: true,
      gender: 'MALE',
      experienceYears: 0,
      specializations: [],
      qualifications: [{ degree: '', institute: '', year: new Date().getFullYear() }],
      registration: { number: '', council: '', year: new Date().getFullYear() },
      clinic: { name: '', line1: '', city: '', state: '', pincode: '', location: { lat: 20.5937, lng: 78.9629 } },
      payout: { legalName: '', businessType: 'individual', bankLast4: '', ifsc: '', panLast4: '' }
    }
  });

  const mutation = useMutation({
    mutationFn: (data) => adminApi.onboardDoctor(data),
    onSuccess: () => {
      toast.success('Doctor onboarded successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminDoctors'] });
      navigate('/admin/doctors');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to onboard doctor');
    }
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  const selectedSpecs = watch('specializations');

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-sm rounded-lg border border-slate-200 mt-6">
      <h1 className="text-2xl font-bold mb-6">Onboard New Doctor</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Account Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Account Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <input type="text" {...register('fullName')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input type="email" {...register('email')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <input type="text" {...register('phone')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
            </div>
            <div className="flex items-center pt-6">
              <input type="checkbox" {...register('sendInvite')} className="h-4 w-4 text-blue-600 border-slate-300 rounded" />
              <label className="ml-2 block text-sm text-slate-900">Send Invite Email (with trial info)</label>
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Professional Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Gender</label>
              <select {...register('gender')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Experience (Years)</label>
              <input type="number" {...register('experienceYears', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Specializations</label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                {specializations.map(spec => (
                  <label key={spec._id} className="inline-flex items-center">
                    <input 
                      type="checkbox" 
                      value={spec._id}
                      {...register('specializations')}
                      className="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
                    />
                    <span className="ml-2 text-sm text-slate-700">{spec.name}</span>
                  </label>
                ))}
              </div>
              {errors.specializations && <p className="text-red-500 text-sm mt-1">{errors.specializations.message}</p>}
            </div>
          </div>
        </div>
        
        {/* Registration */}
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Medical Registration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Reg. Number</label>
              <input type="text" {...register('registration.number')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.registration?.number && <p className="text-red-500 text-sm">{errors.registration.number.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Council</label>
              <input type="text" {...register('registration.council')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.registration?.council && <p className="text-red-500 text-sm">{errors.registration.council.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Year</label>
              <input type="number" {...register('registration.year', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
            </div>
          </div>
        </div>

        {/* Qualification */}
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Top Qualification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Degree</label>
              <input type="text" {...register('qualifications.0.degree')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.qualifications?.[0]?.degree && <p className="text-red-500 text-sm">{errors.qualifications[0].degree.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Institute</label>
              <input type="text" {...register('qualifications.0.institute')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.qualifications?.[0]?.institute && <p className="text-red-500 text-sm">{errors.qualifications[0].institute.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Year</label>
              <input type="number" {...register('qualifications.0.year', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
            </div>
          </div>
        </div>

        {/* Clinic Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Clinic Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Clinic Name</label>
              <input type="text" {...register('clinic.name')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.clinic?.name && <p className="text-red-500 text-sm">{errors.clinic.name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Address Line 1</label>
              <input type="text" {...register('clinic.line1')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.clinic?.line1 && <p className="text-red-500 text-sm">{errors.clinic.line1.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">City</label>
              <input type="text" {...register('clinic.city')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.clinic?.city && <p className="text-red-500 text-sm">{errors.clinic.city.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">State</label>
              <input type="text" {...register('clinic.state')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.clinic?.state && <p className="text-red-500 text-sm">{errors.clinic.state.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Pincode</label>
              <input type="text" {...register('clinic.pincode')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.clinic?.pincode && <p className="text-red-500 text-sm">{errors.clinic.pincode.message}</p>}
            </div>
          </div>
        </div>

        {/* Payout Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Payout & KYC (Razorpay Route)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Legal Name</label>
              <input type="text" {...register('payout.legalName')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.payout?.legalName && <p className="text-red-500 text-sm">{errors.payout.legalName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Business Type</label>
              <select {...register('payout.businessType')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border bg-white">
                <option value="individual">Individual</option>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private Limited</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Bank Last 4 Digits</label>
              <input type="text" maxLength={4} {...register('payout.bankLast4')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" placeholder="1234" />
              {errors.payout?.bankLast4 && <p className="text-red-500 text-sm">{errors.payout.bankLast4.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">IFSC Code</label>
              <input type="text" {...register('payout.ifsc')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
              {errors.payout?.ifsc && <p className="text-red-500 text-sm">{errors.payout.ifsc.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">PAN Last 4</label>
              <input type="text" maxLength={4} {...register('payout.panLast4')} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border uppercase" placeholder="123F" />
              {errors.payout?.panLast4 && <p className="text-red-500 text-sm">{errors.payout.panLast4.message}</p>}
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/admin/doctors')} className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">
            {isSubmitting ? 'Onboarding...' : 'Onboard Doctor'}
          </button>
        </div>
      </form>
    </div>
  );
}
