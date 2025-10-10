import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { inventoryService } from '../services/inventoryService';
import InventoryItemCard from '../components/InventoryItemCard';
import RestockModal from '../components/RestockModal';
import StockLogsModal from '../components/StockLogsModal';

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, filter, searchTerm]);

  const fetchInventory = async () => {
    try {
      const response = await inventoryService.getInventory();
      setInventory(response.data.products || response.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInventory = () => {
    let filtered = inventory;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply stock status filter
    switch (filter) {
      case 'low':
        filtered = filtered.filter(item => item.is_low_stock && item.stock_quantity > 0);
        break;
      case 'out':
        filtered = filtered.filter(item => item.stock_quantity === 0);
        break;
      case 'all':
      default:
        break;
    }

    setFilteredInventory(filtered);
  };

  const handleRestock = async (itemId, quantity, reason) => {
    try {
      await inventoryService.restockInventory(itemId, quantity, reason);
      setShowRestockModal(false);
      setSelectedItem(null);
      fetchInventory(); // Refresh inventory data
    } catch (error) {
      console.error('Error restocking item:', error);
    }
  };

  const handleViewLogs = (item) => {
    setSelectedItem(item);
    setShowLogsModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
        <p className="text-gray-600">Manage pharmacy stock levels and restocking</p>
      </div>

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
        {filteredInventory.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No inventory items found</p>
          </div>
        ) : (
          filteredInventory.map(item => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onRestock={() => {
                setSelectedItem(item);
                setShowRestockModal(true);
              }}
              onViewLogs={() => handleViewLogs(item)}
            />
          ))
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
    </div>
  );
};

export default InventoryManagement;
