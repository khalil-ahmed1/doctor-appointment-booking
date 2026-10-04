import axios from '@/lib/axios';

export const getMyAppointments = async () => {
  const response = await axios.get('/patients/appointments');
  return response.data.data;
};

export const getMyDoctors = async () => {
  const response = await axios.get('/patients/doctors');
  return response.data.data;
};

export const getMyPayments = async () => {
  const response = await axios.get('/patients/payments'); // Wait I didn't add /payments in the backend yet?
  return response.data.data;
};

export const updateProfile = async (data) => {
  const response = await axios.put('/patients/profile', data);
  return response.data.data;
};
