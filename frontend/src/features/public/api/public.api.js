import api from '../../../lib/axios';

export const getSpecializations = async () => {
  const { data } = await api.get('/specializations');
  return data.data;
};

export const searchDoctors = async (params) => {
  // Remove empty string values
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );

  const { data } = await api.get('/doctors', { params: cleanParams });
  return data.data;
};

export const getDoctorBySlug = async (slug) => {
  const { data } = await api.get(`/doctors/${slug}`);
  return data.data;
};

export const getDoctorSlots = async (slug, type, date) => {
  const { data } = await api.get(`/doctors/${slug}/slots`, {
    params: { type, date },
  });
  return data.data;
};

export const getPlans = async () => {
  const { data } = await api.get('/plans');
  return data.data;
};
