import React from 'react';

const InventoryItemCard = ({ item, onRestock, onViewLogs }) => {
  const getStockStatusColor = () => {
    if (item.stock_quantity === 0) {
      return 'bg-red-100 text-red-800';
    } else if (item.stock_quantity <= item.reorder_threshold) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getStockStatusText = () => {
    if (item.stock_quantity === 0) {
      return 'Out of Stock';
    } else if (item.stock_quantity <= item.reorder_threshold) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
          <p className="text-sm text-gray-600 capitalize">{item.category?.replace('_', ' ')}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStockStatusColor()}`}>
          {getStockStatusText()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Current Stock</p>
          <p className="text-2xl font-bold text-gray-900">{item.stock_quantity}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Reorder Threshold</p>
          <p className="text-lg text-gray-900">{item.reorder_threshold}</p>
        </div>
      </div>

      {item.price && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700">Price</p>
          <p className="text-lg text-gray-900">KES {item.price}</p>
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={onRestock}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Restock
        </button>
        <button
          onClick={onViewLogs}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          View Logs
        </button>
      </div>

      {item.is_low_stock && item.stock_quantity > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-xs text-yellow-800 text-center">
            ⚠️ Low stock alert - reorder needed
          </p>
        </div>
      )}

      {item.stock_quantity === 0 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-800 text-center">
            ❌ Out of stock - urgent restock required
          </p>
        </div>
      )}
    </div>
  );
};

export default InventoryItemCard;
