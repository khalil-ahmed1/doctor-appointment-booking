import api from '@/lib/axios';

export const doctorApi = {
  getProfile: async () => {
    const response = await api.get('/doctor/profile');
    return response.data.data;
  },

  updateProfile: async (data) => {
    const response = await api.patch('/doctor/profile', data);
    return response.data.data;
  },

  uploadPicture: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/doctor/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  deletePicture: async () => {
    const response = await api.delete('/doctor/profile/picture');
    return response.data.data;
  },

  addGalleryImage: async (file, caption, order) => {
    const formData = new FormData();
    formData.append('image', file);
    if (caption) formData.append('caption', caption);
    if (order !== undefined) formData.append('order', order);

    const response = await api.post('/doctor/gallery', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  updateGalleryImage: async (imageId, caption, order) => {
    const response = await api.patch(`/doctor/gallery/${imageId}`, { caption, order });
    return response.data.data;
  },

  deleteGalleryImage: async (imageId) => {
    const response = await api.delete(`/doctor/gallery/${imageId}`);
    return response.data.data;
  },

  updateClinic: async (data) => {
    const response = await api.patch('/doctor/clinic', data);
    return response.data.data;
  },

  updateFees: async (data) => {
    const response = await api.patch('/doctor/fees', data);
    return response.data.data;
  },

  updateTypes: async (data) => {
    const response = await api.patch('/doctor/types', data);
    return response.data.data;
  },

  getSchedule: async (type) => {
    const response = await api.get(`/doctor/schedules/${type}`);
    return response.data.data;
  },

  updateSchedule: async (type, data) => {
    const response = await api.put(`/doctor/schedules/${type}`, data);
    return response.data.data;
  },

  getExceptions: async () => {
    const response = await api.get('/doctor/exceptions');
    return response.data.data;
  },

  addException: async (data) => {
    const response = await api.post('/doctor/exceptions', data);
    return response.data.data;
  },

  deleteException: async (id) => {
    const response = await api.delete(`/doctor/exceptions/${id}`);
    return response.data.data;
  },
};
