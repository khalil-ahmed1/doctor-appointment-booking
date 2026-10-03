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
};
