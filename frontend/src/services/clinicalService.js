import api from './api';

/** Normalize list/detail payloads whether DRF paginates or wraps in {data}. */
function unwrapList(payload) {
  if (!payload) return { results: [] };
  if (Array.isArray(payload)) return { results: payload };
  if (Array.isArray(payload.results)) return payload;
  if (Array.isArray(payload.data)) return { results: payload.data };
  if (payload.data && Array.isArray(payload.data.results)) return payload.data;
  return { results: [] };
}

function unwrapOne(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    // Prefer nested entity when envelope is { data: { id, ... } }
    if (payload.data.id != null || payload.data.patient != null) return payload.data;
  }
  return payload;
}

const getConsultations = async () => {
  const response = await api.get('/clinical/consultations/', {
    skipGlobalErrorNotification: true,
  });
  return unwrapList(response.data);
};

const getConsultation = async (id) => {
  const response = await api.get(`/clinical/consultations/${id}/`, {
    skipGlobalErrorNotification: true,
  });
  return unwrapOne(response.data);
};

const createConsultation = async (data) => {
  const response = await api.post('/clinical/consultations/', data, {
    skipGlobalErrorNotification: true,
  });
  return unwrapOne(response.data);
};

const updateConsultation = async (id, data) => {
  const response = await api.patch(`/clinical/consultations/${id}/`, data, {
    skipGlobalErrorNotification: true,
  });
  return unwrapOne(response.data);
};

const addLabTest = async (data) => {
  const response = await api.post('/clinical/lab_tests/', data, {
    skipGlobalErrorNotification: true,
  });
  return unwrapOne(response.data);
};

const billToOTC = async (id, payment_mode) => {
  const response = await api.post(
    `/clinical/consultations/${id}/bill_to_otc/`,
    { payment_mode },
    { skipGlobalErrorNotification: true },
  );
  return unwrapOne(response.data);
};

const clinicalService = {
  getConsultations,
  getConsultation,
  createConsultation,
  updateConsultation,
  addLabTest,
  billToOTC,
};

export default clinicalService;
