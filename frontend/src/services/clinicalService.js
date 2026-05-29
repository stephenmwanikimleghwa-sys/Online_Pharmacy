import api from './api';

const getConsultations = async () => {
  const response = await api.get('/clinical/consultations/');
  return response.data;
};

const getConsultation = async (id) => {
  const response = await api.get(`/clinical/consultations/${id}/`);
  return response.data;
};

const createConsultation = async (data) => {
  const response = await api.post('/clinical/consultations/', data);
  return response.data;
};

const updateConsultation = async (id, data) => {
  const response = await api.patch(`/clinical/consultations/${id}/`, data);
  return response.data;
};

const addLabTest = async (data) => {
  const response = await api.post('/clinical/lab_tests/', data);
  return response.data;
};

const billToOTC = async (id, payment_mode) => {
  const response = await api.post(`/clinical/consultations/${id}/bill_to_otc/`, {
    payment_mode
  });
  return response.data;
};

const clinicalService = {
  getConsultations,
  getConsultation,
  createConsultation,
  updateConsultation,
  addLabTest,
  billToOTC
};

export default clinicalService;
