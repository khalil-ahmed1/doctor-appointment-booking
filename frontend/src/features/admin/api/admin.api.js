import axios from '@/lib/axios';

export const adminApi = {
  getDoctors: async (params = {}) => {
    const response = await axios.get('/admin/doctors', { params });
    return response.data;
  },

  getDoctorById: async (id) => {
    const response = await axios.get(`/admin/doctors/${id}`);
    return response.data;
  },

  onboardDoctor: async (data) => {
    const response = await axios.post('/admin/doctors', data);
    return response.data;
  },

  updateDoctor: async (id, data) => {
    const response = await axios.put(`/admin/doctors/${id}`, data);
    return response.data;
  },

  updateDoctorStatus: async (id, status) => {
    const response = await axios.patch(`/admin/doctors/${id}/status`, { status });
    return response.data;
  },

  updateDoctorPublish: async (id, isPublished) => {
    const response = await axios.patch(`/admin/doctors/${id}/publish`, { isPublished });
    return response.data;
  },

  getPatients: async (params = {}) => {
    const response = await axios.get('/admin/patients', { params });
    return response.data;
  },

  getPatientById: async (id) => {
    const response = await axios.get(`/admin/patients/${id}`);
    return response.data;
  },

  updatePatient: async (id, data) => {
    const response = await axios.put(`/admin/patients/${id}`, data);
    return response.data;
  },

  updatePatientBlockStatus: async (id, status) => {
    const response = await axios.patch(`/admin/patients/${id}/block`, { status });
    return response.data;
  },

  getPlans: async (params = {}) => {
    const response = await axios.get('/admin/plans', { params });
    return response.data;
  },

  getPlanById: async (id) => {
    const response = await axios.get(`/admin/plans/${id}`);
    return response.data;
  },

  createPlan: async (data) => {
    const response = await axios.post('/admin/plans', data);
    return response.data;
  },

  updatePlan: async (id, data) => {
    const response = await axios.put(`/admin/plans/${id}`, data);
    return response.data;
  },

  deletePlan: async (id) => {
    const response = await axios.delete(`/admin/plans/${id}`);
    return response.data;
  },

  getSubscriptions: async (params = {}) => {
    const response = await axios.get('/admin/subscriptions', { params });
    return response.data;
  },

  manualSubscriptionUpdate: async (data) => {
    const response = await axios.post('/admin/subscriptions/manual', data);
    return response.data;
  },

  getAppointments: async (params = {}) => {
    const response = await axios.get('/admin/appointments', { params });
    return response.data;
  },

  getAppointmentById: async (id) => {
    const response = await axios.get(`/admin/appointments/${id}`);
    return response.data;
  },

  cancelAppointment: async (id, reason) => {
    const response = await axios.patch(`/admin/appointments/${id}/cancel`, { reason });
    return response.data;
  },

  rescheduleAppointment: async (id, data) => {
    const response = await axios.patch(`/admin/appointments/${id}/reschedule`, data);
    return response.data;
  },

  getPayments: async (params = {}) => {
    const response = await axios.get('/admin/payments', { params });
    return response.data;
  },

  retryTransfer: async (id) => {
    const response = await axios.post(`/admin/payments/${id}/retry-transfer`);
    return response.data;
  },

  manualRefund: async (id, reason) => {
    const response = await axios.post(`/admin/payments/${id}/refund`, { reason });
    return response.data;
  },
};
