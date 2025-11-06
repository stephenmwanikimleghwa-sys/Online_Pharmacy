import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon as SearchIcon, XMarkIcon as XIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const QuickSale = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saleError, setSaleError] = useState("");
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleSearch = async (term) => {
    if (!term) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      console.log('Searching with term:', term);
      console.log('API URL:', `${API_BASE_URL}/products/?search=${term}`);
      
      const response = await axios.get(`${API_BASE_URL}/products/?search=${term}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Search response data:', {
        full: response.data,
        results: response.data.results,
        count: response.data.count,
        hasResults: Array.isArray(response.data.results || response.data)
      });
      
      // If the response includes results property (pagination), use that, otherwise use the whole response
      const products = response.data.results || response.data;
      console.log('Products to display:', products);
      setSearchResults(products);
    } catch (error) {
      console.error('Search error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addToSale = (product) => {
    const existingItem = selectedItems.find(item => item.id === product.id);
    if (existingItem) {
      setSelectedItems(selectedItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setSelectedItems([...selectedItems, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setSelectedItems(selectedItems.map(item =>
      item.id === productId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter(item => item.id !== productId));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCompleteSale = async () => {
    setSaleError("");
    try {
      const requestData = {
        items: selectedItems.map(item => ({
          id: item.id,
          quantity: item.quantity
        }))
      };
      console.log('Sending quick sale request:', requestData);
      
      const response = await axios.post(`${API_BASE_URL}/orders/quick/`, requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 201) { // Backend returns 201 CREATED
        console.log('Sale completed successfully:', response.data);
        setSelectedItems([]);
        setSearchTerm('');
        setSearchResults([]);
        onClose();
        // TODO: Show success toast/notification
      }
    } catch (error) {
      console.error('Sale completion error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Show server-provided message when available
      const serverData = error.response?.data;
      const userMessage = serverData?.details || serverData?.error || serverData?.message || serverData?.detail || 'Failed to complete sale. Please try again.';
      setSaleError(userMessage);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
              <div className="flex justify-between items-center mb-6">
                <Dialog.Title className="text-2xl font-bold text-gray-900">
                  Quick Sale
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-6">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Search for medicines..."
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <SearchIcon className="h-6 w-6 text-gray-400 absolute left-3 top-3" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search Results */}
            <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Search Results</h3>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => addToSale(product)}
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">Stock: {product.stock_quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">KES {product.price}</p>
                        <button className="mt-1 text-sm text-white bg-blue-600 px-3 py-1 rounded-full hover:bg-blue-700">
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              {saleError && (
                <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
                  <strong className="font-medium">Sale failed:</strong>
                  <div className="mt-1 text-sm">{saleError}</div>
                </div>
              )}

            {/* Selected Items */}
            <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Current Sale</h3>
              <div className="space-y-3">
                {selectedItems.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="font-semibold text-blue-600">
                        KES {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total and Complete Sale */}
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-t border-gray-200">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-bold text-blue-600">
                    KES {calculateTotal().toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handleCompleteSale}
                  disabled={selectedItems.length === 0}
                  className={`w-full py-3 rounded-lg text-white font-semibold 
                    ${selectedItems.length > 0
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
  );
};

export default QuickSale;