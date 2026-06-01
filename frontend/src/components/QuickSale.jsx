import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon as SearchIcon, XMarkIcon as XIcon, PlusIcon, MinusIcon, CheckCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const QuickSale = ({ isOpen, onClose }) => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [lastOrder, setLastOrder] = useState(null);
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleSearch = async (term) => {
    if (!term) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/products/?search=${term}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const products = response.data.results || response.data;
      setSearchResults(products);
    } catch (error) {
      console.error('Search error:', error);
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

  const handleDownloadReceipt = async (orderId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/orders/${orderId}/receipt/`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('Receipt print error:', error);
      notify.error('Receipt Failed', 'Could not generate the receipt. Please try again.');
    }
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

      const response = await axios.post(`${API_BASE_URL}/orders/quick/`, requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 201) {
        setLastOrder(response.data);
        setSelectedItems([]);
        setSearchTerm('');
        setSearchResults([]);
      }
    } catch (error) {
      const serverData = error.response?.data;
      const userMessage = serverData?.details || serverData?.error || serverData?.message || serverData?.detail || 'Failed to complete sale. Please try again.';
      setSaleError(userMessage);
    }
  };

  const resetSale = () => {
    setLastOrder(null);
    setSearchTerm('');
    setSearchResults([]);
    setSelectedItems([]);
    setSaleError("");
  };

  const handleClose = () => {
    resetSale();
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 modal-overlay" />
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
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-[2.5rem] modal-card p-8 text-left align-middle transition-all">

                {lastOrder ? (
                  /* Success View */
                  <div className="py-12 flex flex-col items-center text-center animate-fade-in">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-inner" style={{background:'rgba(16,185,129,0.12)', color:'#10b981'}}>
                      <CheckCircleIcon className="w-16 h-16" />
                    </div>
                    <h2 className="text-4xl font-display font-bold mb-4 tracking-tight" style={{color:'var(--text-primary)'}}>Sale Completed!</h2>
                    <p className="text-lg mb-10 max-w-md" style={{color:'var(--text-secondary)'}}>The transaction was successful and inventory has been updated. Order ID: #{lastOrder.id}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                      <button
                        onClick={() => handleDownloadReceipt(lastOrder.id)}
                        className="flex items-center justify-center gap-3 py-4 btn-primary font-bold rounded-2xl shadow-glow hover:opacity-90 transition-all active:scale-[0.98]"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Print Order Receipt
                      </button>
                      <button
                        onClick={resetSale}
                        className="flex items-center justify-center gap-3 py-4 form-cancel-btn rounded-2xl transition-all active:scale-[0.98]"
                      >
                        New Quick Sale
                      </button>
                    </div>

                    <button
                      onClick={handleClose}
                      className="mt-8 text-sm font-bold transition-colors" style={{color:'var(--text-secondary)'}}
                    >
                      Close Window
                    </button>
                  </div>
                ) : (
                  /* Sale View */
                  <>
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 btn-primary rounded-2xl flex items-center justify-center shadow-glow">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                          <Dialog.Title className="text-3xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>
                            Quick Sale
                          </Dialog.Title>
                          <p className="text-sm" style={{color:'var(--text-secondary)'}}>Process over-the-counter sales instantly.</p>
                        </div>
                      </div>
                      <button
                        onClick={handleClose}
                        className="p-3 rounded-2xl transition-colors group form-cancel-btn"
                      >
                        <XIcon className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="relative mb-8 group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <SearchIcon className="h-6 w-6 transition-colors" style={{color:'var(--text-secondary)'}} />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          handleSearch(e.target.value);
                        }}
                        placeholder="Search for medicines by name, category, or code..."
                        className="form-input pl-14"
                      />
                      {loading && (
                        <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent" style={{borderColor:'var(--color-primary)', borderTopColor:'transparent'}}></div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[500px]">
                      <div className="lg:col-span-7 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-4 px-2">
                          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Available Inventory</h3>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase text-primary" style={{background:'var(--brand-mist)'}}>{searchResults.length} results</span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-custom">
                          {searchResults.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed" style={{color:'var(--text-secondary)', borderColor:'var(--border-primary)', background:'var(--bg-field)'}}>
                              <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              <p className="font-bold uppercase tracking-widest text-[10px]">Start typing to search...</p>
                            </div>
                          ) : (
                            searchResults.map((product) => (
                              <div
                                key={product.id}
                                className="data-cell flex items-center justify-between p-5 rounded-2xl cursor-pointer active:scale-[0.99] hover:shadow-premium transition-all group"
                                onClick={() => addToSale(product)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors" style={{background:'var(--brand-mist)'}}>
                                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                  </div>
                                  <div>
                                    <h4 className="font-bold leading-tight text-primary" style={{color:'var(--text-primary)'}}>{product.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${product.stock_quantity < 10 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {product.stock_quantity} left
                                      </span>
                                      <span className="text-[10px] font-bold uppercase tracking-tight" style={{color:'var(--text-secondary)'}}>{product.category_name}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-display font-bold text-primary">{product.price}</p>
                                  <span className="text-[10px] font-bold text-primary uppercase flex items-center gap-1 mt-1">
                                    <PlusIcon className="w-3 h-3" /> Add to Sale
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-5 flex flex-col min-h-0 rounded-[2rem] p-6 border" style={{background:'var(--bg-field)', borderColor:'var(--border-primary)'}}>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Current Sale</h3>
                          <button
                            onClick={() => setSelectedItems([])}
                            disabled={selectedItems.length === 0}
                            className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:underline disabled:opacity-0"
                          >
                            Clear All
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-custom mb-6">
                          {selectedItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40" style={{color:'var(--text-secondary)'}}>
                              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                              <p className="text-xs font-bold uppercase tracking-widest">Your cart is empty</p>
                            </div>
                          ) : (
                            selectedItems.map((item) => (
                              <div key={item.id} className="data-cell p-4 rounded-2xl group/item">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-bold text-sm leading-tight" style={{color:'var(--text-primary)'}}>{item.name}</h4>
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="p-1.5 rounded-lg transition-all hover:bg-rose-50"
                                  >
                                    <XIcon className="h-4 w-4 text-rose-400" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center rounded-xl p-1 gap-1" style={{background:'var(--bg-card)'}}>
                                    <button
                                      onClick={() => updateQuantity(item.id, -1)}
                                      className="p-1.5 rounded-lg transition-all hover:text-rose-500" style={{color:'var(--text-secondary)'}}
                                    >
                                      <MinusIcon className="h-4 w-4" />
                                    </button>
                                    <span className="w-8 text-center font-display font-bold text-sm" style={{color:'var(--text-primary)'}}>{item.quantity}</span>
                                    <button
                                      onClick={() => updateQuantity(item.id, 1)}
                                      className="p-1.5 rounded-lg transition-all text-primary" style={{color:'var(--text-secondary)'}}
                                    >
                                      <PlusIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <p className="font-display font-bold" style={{color:'var(--text-primary)'}}>
                                    KES {(item.price * item.quantity).toFixed(0)}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="pt-6 border-t" style={{borderColor:'var(--border-primary)'}}>
                          {saleError && (
                            <div className="mb-4 alert-error rounded-xl">
                              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <div className="text-xs font-semibold leading-relaxed">{saleError}</div>
                            </div>
                          )}

                          <div className="flex justify-between items-center mb-6">
                            <span className="text-sm font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Grand Total</span>
                            <div className="text-right">
                              <span className="text-3xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>KES {calculateTotal().toFixed(0)}</span>
                              <p className="text-[10px] font-bold uppercase mt-1" style={{color:'var(--text-secondary)'}}>Inc. VAT where applicable</p>
                            </div>
                          </div>

                          <button
                            onClick={handleCompleteSale}
                            disabled={selectedItems.length === 0}
                            className={`w-full py-5 rounded-2xl font-display font-bold text-lg transition-all active:scale-[0.98] ${
                              selectedItems.length > 0
                                ? 'btn-primary shadow-glow hover:opacity-95'
                                : 'opacity-40 cursor-not-allowed'
                            }`}
                            style={selectedItems.length === 0 ? {background:'var(--bg-field)', color:'var(--text-secondary)'} : {}}
                          >
                            Finalize Sale
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default QuickSale;