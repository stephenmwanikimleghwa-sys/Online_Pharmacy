import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadInventory = async () => {
      if (user) {
        console.log('[Inventory Debug] User available:', {
          username: user.username,
          role: user.role,
        });
        
        try {
          await fetchInventory({ silent: false });
          console.log('[Inventory Debug] Initial fetch complete');
        } catch (error) {
          console.error('[Inventory Debug] Initial fetch failed:', error);
        }

        // Set up polling (store id in ref so we can clear it from anywhere)
        intervalRef.current = setInterval(async () => {
          try {
            // Silent refresh to avoid re-showing the global loading spinner and UI shake
            await fetchInventory({ silent: true });
            console.log('[Inventory Debug] Poll fetch complete (silent)');
          } catch (error) {
            console.error('[Inventory Debug] Poll fetch failed:', error);
            // Stop polling and navigate to login if unauthorized
            if (error?.response?.status === 401) {
              console.warn('[Inventory Debug] Poll detected 401 — stopping polling and redirecting to login');
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              navigate('/login');
            }
          }
        }, 10000);

        return () => {
          console.log('[Inventory Debug] Cleaning up polling interval');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        };
      } else {
        console.log('[Inventory Debug] No user available, skipping fetch');
      }
    };

    loadInventory();
  }, [user]); // Re-run when user changes

  useEffect(() => {
    filterInventory();
  }, [inventory, filter, searchTerm]);

  const fetchInventory = async (opts = {}) => {
    // Accept options to allow silent background refreshes (no global loading spinner)
    const silent = !!opts.silent;

    try {
      if (!silent) setLoading(true);
      console.log('[Inventory Debug] Starting inventory fetch', { silent });
      
      // Check authentication
      const token = localStorage.getItem('access_token');
      console.log('[Inventory Debug] Auth status:', {
        hasToken: !!token,
        tokenStart: token ? `${token.substring(0, 10)}...` : 'none'
      });
      
  // Make the API call
  const response = await inventoryService.getInventory();
      console.log('[Inventory Debug] Raw API response:', {
        status: response.status,
        hasData: !!response.data,
        productsArray: Array.isArray(response.data?.products),
        productsCount: response.data?.products?.length
      });
      
      // Process the data
      const inventoryData = response?.data?.products || [];
      console.log('[Inventory Debug] Processing inventory items:', {
        totalItems: inventoryData.length,
        firstItem: inventoryData[0] ? {
          id: inventoryData[0].id,
          name: inventoryData[0].name,
          category: inventoryData[0].category
        } : 'no items'
      });
      
      // Update state only if data changed to avoid re-render/layout jitter
      setInventory((prev) => {
        try {
          const prevIds = prev.map((p) => `${p.id}:${p.stock_quantity}:${p.reorder_threshold}:${p.name}`).join('|');
          const nextIds = inventoryData.map((p) => `${p.id}:${p.stock_quantity}:${p.reorder_threshold}:${p.name}`).join('|');
          if (prevIds === nextIds) {
            // no substantive change
            return prev;
          }
        } catch (err) {
          // fallback to replacing state
        }
        console.log('[Inventory Debug] Inventory changed, updating state', { prevCount: prev.length, nextCount: inventoryData.length, silent });
        return inventoryData;
      });
      
    } catch (error) {
      console.error('[Inventory Debug] Fetch failed:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        type: error.name,
        stack: error.stack
      });
      // If unauthorized, stop polling and redirect to login
      if (error?.response?.status === 401) {
        console.warn('[Inventory Debug] Fetch detected 401 — stopping polling and redirecting to login');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        navigate('/login');
        return; // no further handling
      }

      setInventory([]); // Set empty array on non-auth errors
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filterInventory = () => {
    console.log('[Debug] Starting filterInventory with:', {
      inventoryCount: inventory.length,
      searchTerm,
      filter
    });

    let filtered = Array.isArray(inventory) ? inventory : [];
    console.log('[Debug] Initial filtered array:', filtered);

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('[Debug] After search filter:', {
        term: searchTerm,
        count: filtered.length
      });
    }

    // Apply stock status filter
    switch (filter) {
      case 'low':
        filtered = filtered.filter(item => item?.is_low_stock && item?.stock_quantity > 0);
        break;
      case 'out':
        filtered = filtered.filter(item => item?.stock_quantity === 0);
        break;
      case 'all':
      default:
        break;
    }
    console.log('[Debug] After status filter:', {
      filter,
      count: filtered.length,
      items: filtered
    });

    setFilteredInventory(filtered);
  };

  const handleRestock = async (itemId, quantity, reason) => {
    try {
  // Create a restock request instead of directly restocking
  const currentStock = selectedItem?.stock_quantity ?? 0;
  await inventoryService.requestRestock(itemId, quantity, currentStock, reason);
      setShowRestockModal(false);
      setSelectedItem(null);

      // Optimistically update UI: no need to refresh full inventory, but refresh summary silently
      await fetchInventory({ silent: true });

      // Optionally notify user
      console.log('Stock request submitted successfully');
    } catch (error) {
      console.error('Error requesting stock:', error);
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
            <p className="text-sm text-gray-600">Total Products: {Array.isArray(inventory) ? inventory.length : 0}</p>
            <p className="text-sm text-yellow-600">
              Low Stock: {Array.isArray(inventory) ? inventory.filter(item => item.is_low_stock && item.stock_quantity > 0).length : 0}
            </p>
            <p className="text-sm text-red-600">
              Out of Stock: {Array.isArray(inventory) ? inventory.filter(item => item.stock_quantity === 0).length : 0}
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
              <p className="text-sm text-gray-400">
                Debug info: Total items in inventory: {inventory.length}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <p className="text-sm text-gray-500">
                Debug info: Displaying {filteredInventory.length} out of {inventory.length} total items
              </p>
            </div>
            {filteredInventory.map(item => {
              console.log('Rendering item:', item); // Debug log
              return (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  onRestock={() => {
                    setSelectedItem(item);
                    setShowRestockModal(true);
                  }}
                  onViewLogs={() => handleViewLogs(item)}
                />
              );
            })}
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
    </div>
  );
};

export default InventoryManagement;
