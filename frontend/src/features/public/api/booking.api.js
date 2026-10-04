import api from '../../../lib/axios';

export const holdSlot = async (data) => {
  const response = await api.post('/appointments/hold', data);
  return response.data.data;
};

export const createOrder = async (appointmentId) => {
  const response = await api.post('/payments/create-order', { appointmentId });
  return response.data.data;
};

export const verifyPayment = async (data) => {
  const response = await api.post('/payments/verify', data);
  return response.data.data;
};
