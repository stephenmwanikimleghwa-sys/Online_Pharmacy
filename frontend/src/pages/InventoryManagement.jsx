import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import inventoryService from '../services/inventoryService';
import InventoryItemCard from '../components/InventoryItemCard';
import RestockModal from '../components/RestockModal';
import StockLogsModal from '../components/StockLogsModal';
import SupplierList from './inventory/SupplierList';
import BatchList from './inventory/BatchList';
import StockIntakeLog from './StockIntakeLog';

const InventoryManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [activeTab]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventory();
      setInventory(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (itemId, quantity, reason) => {
    try {
      await inventoryService.restockInventory(itemId, quantity, reason);
      fetchInventory(); // Refresh list
    } catch (error) {
      console.error('Error restocking item:', error);
      alert('Failed to restock item');
    }
  };

  const handleViewLogs = (item) => {
    setSelectedItem(item);
    setShowLogsModal(true);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
        filter === 'low' ? (item.is_low_stock && item.stock_quantity > 0) :
          filter === 'out' ? (item.stock_quantity === 0) : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
            {user?.pharmacy_name && (
              <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                {user.pharmacy_name}
              </span>
            )}
          </div>
          <p className="text-gray-600">Manage pharmacy stock levels and restocking</p>
        </div>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'suppliers' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Suppliers
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'batches' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Batches
          </button>
          <button
            onClick={() => setActiveTab('intake')}
            className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'intake' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Stock Intake
          </button>
        </div>
      </div>

      {activeTab === 'suppliers' ? (
        <SupplierList />
      ) : activeTab === 'batches' ? (
        <BatchList />
      ) : activeTab === 'intake' ? (
        <StockIntakeLog />
      ) : (
        <>
          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Products
                </label>
                <input
                  type="text"
                  placeholder="Search by product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Stock Status
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Items</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>

              {/* Stats */}
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Total Products: {inventory.length}</p>
                <p className="text-sm text-yellow-600">
                  Low Stock: {inventory.filter(item => item.is_low_stock && item.stock_quantity > 0).length}
                </p>
                <p className="text-sm text-red-600">
                  Out of Stock: {inventory.filter(item => item.stock_quantity === 0).length}
                </p>
              </div>
            </div>
          </div>

          {/* Inventory List */}
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-500">Loading inventory...</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="space-y-2">
                  <p className="text-gray-500">No inventory items found</p>
                  {searchTerm && <p className="text-sm text-gray-400">Try adjusting your search terms</p>}
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                  <p className="text-sm text-gray-500">
                    Displaying {filteredInventory.length} out of {inventory.length} total items
                  </p>
                </div>
                {filteredInventory.map(item => (
                  <InventoryItemCard
                    key={item.id}
                    item={item}
                    onRestock={() => {
                      setSelectedItem(item);
                      setShowRestockModal(true);
                    }}
                    onViewLogs={() => handleViewLogs(item)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Modals */}
          {showRestockModal && selectedItem && (
            <RestockModal
              item={selectedItem}
              onClose={() => {
                setShowRestockModal(false);
                setSelectedItem(null);
              }}
              onRestock={handleRestock}
            />
          )}

          {showLogsModal && selectedItem && (
            <StockLogsModal
              item={selectedItem}
              onClose={() => {
                setShowLogsModal(false);
                setSelectedItem(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default InventoryManagement;
