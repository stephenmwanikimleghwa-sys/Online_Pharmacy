import React from 'react';

export const AddMedicineModal = ({ 
  isOpen, 
  onClose, 
  isEditMode, 
  form, 
  setForm, 
  formErrors, 
  onSubmit 
}) => {
  if (!isOpen) return null;

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}></div>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div 
          className="relative inline-block p-6 my-8 text-left align-middle bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg w-full"
        >
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {isEditMode ? 'Edit Medicine' : 'Add Medicine'}
          </h3>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input 
                name="name" 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                className={`mt-1 block w-full rounded border px-3 py-2 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`} 
              />
              {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={(e) => setForm({...form, category: e.target.value})}
                className={`mt-1 block w-full rounded border px-3 py-2 ${formErrors.category ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select a category</option>
                <option value="pain_relief">Pain Relief</option>
                <option value="antibiotics">Antibiotics</option>
                <option value="vitamins">Vitamins & Supplements</option>
                <option value="chronic_care">Chronic Care</option>
                <option value="dermatology">Dermatology</option>
                <option value="other">Other</option>
              </select>
              {formErrors.category && <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium">Price</label>
              <input 
                name="price" 
                type="number" 
                step="0.01" 
                value={form.price} 
                onChange={(e) => setForm({...form, price: e.target.value})} 
                className={`mt-1 block w-full rounded border px-3 py-2 ${formErrors.price ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.price && <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium">Initial Stock Quantity</label>
              <input 
                name="stock_quantity" 
                type="number" 
                value={form.stock_quantity} 
                onChange={(e) => setForm({...form, stock_quantity: e.target.value})} 
                className={`mt-1 block w-full rounded border px-3 py-2 ${formErrors.stock_quantity ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.stock_quantity && <p className="mt-1 text-sm text-red-600">{formErrors.stock_quantity}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium">Reorder Threshold</label>
              <input 
                name="reorder_threshold" 
                type="number" 
                value={form.reorder_threshold} 
                onChange={(e) => setForm({...form, reorder_threshold: e.target.value})} 
                className={`mt-1 block w-full rounded border px-3 py-2 ${formErrors.reorder_threshold ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.reorder_threshold && <p className="mt-1 text-sm text-red-600">{formErrors.reorder_threshold}</p>}
            </div>
            
            
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea 
                name="description" 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})} 
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 h-24" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Supplier</label>
              <input 
                name="supplier" 
                value={form.supplier} 
                onChange={(e) => setForm({...form, supplier: e.target.value})} 
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium">Expiry Date</label>
              <input 
                name="expiry_date" 
                type="date" 
                value={form.expiry_date} 
                onChange={(e) => setForm({...form, expiry_date: e.target.value})} 
                className={`mt-1 block w-full rounded border px-3 py-2 ${formErrors.expiry_date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.expiry_date && <p className="mt-1 text-sm text-red-600">{formErrors.expiry_date}</p>}
            </div>
            
            <div className="mt-4">
              <button 
                type="submit" 
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isEditMode ? 'Save Changes' : 'Add Medicine'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};