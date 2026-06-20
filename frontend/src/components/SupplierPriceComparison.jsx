import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#7c3aed', '#0891b2'];

const trendBadge = (trend) => {
  if (trend === 'RISING') return <span className="text-amber-600 text-xs font-bold">↑</span>;
  if (trend === 'FALLING') return <span className="text-emerald-600 text-xs font-bold">↓</span>;
  return <span className="text-gray-500 text-xs">→</span>;
};

const medal = (index) => ['🥇', '🥈', '🥉'][index] || '';

const SupplierPriceComparison = ({
  data,
  onOrderFrom,
  onViewHistory,
  orderQuantity = 500,
}) => {
  const comparison = data?.comparison || [];
  const product = data?.product;

  const chartData = useMemo(() => {
    const monthMap = {};
    comparison.forEach((row, idx) => {
      (row.price_history || []).forEach((pt) => {
        const month = pt.date?.slice(0, 7);
        if (!month) return;
        if (!monthMap[month]) monthMap[month] = { month };
        monthMap[month][`s${row.supplier_id}`] = pt.price;
        monthMap[month][`${row.supplier_name}`] = pt.price;
      });
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [comparison]);

  if (!product) {
    return <p className="text-sm text-gray-500">No comparison data.</p>;
  }

  const cheapest = comparison[0];
  const expensive = comparison[comparison.length - 1];
  const savingsPerUnit = data?.price_range?.difference || 0;
  const savingsOnOrder = savingsPerUnit * orderQuantity;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">💊 {product.name}</h3>
        <p className="text-sm text-gray-500">Supplier Price Comparison — based on purchase history</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b text-gray-500">
              <th className="py-2 pr-3">Supplier</th>
              <th className="py-2 pr-3">Last Price</th>
              <th className="py-2 pr-3">Avg</th>
              <th className="py-2 pr-3">Bought</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row, idx) => (
              <tr key={row.supplier_id} className="border-b border-gray-100">
                <td className="py-2 pr-3 font-medium">
                  {medal(idx)} {row.supplier_name}{' '}
                  {row.is_cheapest && <span className="text-emerald-600 text-xs">✅</span>}{' '}
                  {trendBadge(row.trend)}
                </td>
                <td className="py-2 pr-3">KES {Number(row.last_price).toLocaleString()}</td>
                <td className="py-2 pr-3">KES {Number(row.average_price).toLocaleString()}</td>
                <td className="py-2 pr-3">{row.times_supplied}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cheapest && expensive && cheapest.supplier_id !== expensive.supplier_id && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
          <p>
            Best price: <strong>{cheapest.supplier_name}</strong> saves you KES{' '}
            {savingsPerUnit.toLocaleString()}/unit vs {expensive.supplier_name}
          </p>
          <p className="text-gray-600 mt-1">
            On a {orderQuantity} unit order: saves KES {savingsOnOrder.toLocaleString()}
          </p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {comparison.map((row, idx) => (
                <Line
                  key={row.supplier_id}
                  type="monotone"
                  dataKey={row.supplier_name}
                  stroke={COLORS[idx % COLORS.length]}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {cheapest && onOrderFrom && (
          <button type="button" className="btn-primary text-sm px-4 py-2 rounded-lg" onClick={() => onOrderFrom(cheapest)}>
            Order from {cheapest.supplier_name}
          </button>
        )}
        {cheapest && onViewHistory && (
          <button type="button" className="btn-secondary text-sm px-4 py-2 rounded-lg" onClick={() => onViewHistory(cheapest)}>
            View History
          </button>
        )}
      </div>
    </div>
  );
};

export default SupplierPriceComparison;
