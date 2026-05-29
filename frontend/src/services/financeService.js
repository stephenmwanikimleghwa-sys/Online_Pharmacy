import api from './api';

const getCashFlow = async (branchId = '') => {
  const url = branchId ? `/finance/overview/cash_flow/?branch_id=${branchId}` : `/finance/overview/cash_flow/`;
  const response = await api.get(url);
  return response.data;
};

const getAccountBalances = async (branchId = '') => {
  const url = branchId ? `/finance/overview/account_balances/?branch_id=${branchId}` : `/finance/overview/account_balances/`;
  const response = await api.get(url);
  return response.data;
};

const getDebtorCreditorSummary = async () => {
  const response = await api.get('/finance/overview/debtor_creditor_summary/');
  return response.data;
};

const getLegacyLedger = async () => {
  const response = await api.get('/finance/overview/legacy_ledger/');
  return response.data;
};

const financeService = {
  getCashFlow,
  getAccountBalances,
  getDebtorCreditorSummary,
  getLegacyLedger,
};

export default financeService;
