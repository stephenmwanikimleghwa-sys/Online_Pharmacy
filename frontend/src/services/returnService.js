import api from './api';

const getReturns = async () => {
  const response = await api.get('/inventory/sales-returns/');
  return response.data;
};

const getReturn = async (id) => {
  const response = await api.get(`/inventory/sales-returns/${id}/`);
  return response.data;
};

const createReturn = async (data) => {
  const response = await api.post('/inventory/sales-returns/process_return/', data);
  return response.data;
};

const approveReturn = async (id) => {
  const response = await api.post(`/inventory/sales-returns/${id}/approve/`);
  return response.data;
};

const rejectReturn = async (id) => {
  const response = await api.post(`/inventory/sales-returns/${id}/reject/`);
  return response.data;
};

const returnService = {
  getReturns,
  getReturn,
  createReturn,
  approveReturn,
  rejectReturn
};

export default returnService;
