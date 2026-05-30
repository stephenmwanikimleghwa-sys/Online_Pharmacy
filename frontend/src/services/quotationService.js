import api from './api';

const getQuotations = async (params = {}) => {
  try {
    const response = await api.get('/finance/quotations/', { params });
    return response.data;
  } catch (err) {
    console.error('[QuotationService] Failed to fetch quotations', err);
    // Return a safe empty structure so UI that maps over results doesn't crash
    return { results: [], count: 0 };
  }
};

const getQuotation = async (id) => {
  const response = await api.get(`/finance/quotations/${id}/`);
  return response.data;
};

const createQuotation = async (data) => {
  const response = await api.post('/finance/quotations/', data);
  return response.data;
};

const updateQuotation = async (id, data) => {
  const response = await api.put(`/finance/quotations/${id}/`, data);
  return response.data;
};

const convertToSale = async (id, payment_method = 'CASH', notes = '') => {
  const response = await api.post(`/finance/quotations/${id}/convert_to_sale/`, {
    payment_method,
    notes
  });
  return response.data;
};

const exportPDF = async (id) => {
  const response = await api.get(`/finance/quotations/${id}/export_pdf/`, {
    responseType: 'blob'
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `quotation_${id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const quotationService = {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  convertToSale,
  exportPDF
};

export default quotationService;
