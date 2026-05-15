import React from 'react';
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

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

  const inputBase = (hasError) =>
    `w-full px-5 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-4 /10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm ${hasError ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-200'}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-premium max-w-3xl w-full overflow-hidden flex flex-col md:flex-row animate-scale-up border-[8px] border-white ring-1 ring-slate-200">
        {/* Visual Panel */}
        <div className="md:w-1/3 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 btn-primary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div>
            <div className="w-12 h-12 btn-primary rounded-2xl flex items-center justify-center mb-6 shadow-glow-indigo">
              {isEditMode ? (
                <PencilSquareIcon className="w-6 h-6" />
              ) : (
                <PlusIcon className="w-6 h-6" />
              )}
            </div>
            <h2 className="text-3xl font-display font-bold leading-tight">
              {isEditMode ? 'Edit Medicine' : 'Add New Medicine'}
            </h2>
            <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">
              {isEditMode
                ? 'Update the details for this product in your pharmacy inventory.'
                : 'Register a new pharmaceutical product into your inventory system.'}
            </p>
          </div>
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] opacity-40 mt-8">Inventory Module</div>
        </div>

        {/* Form Panel */}
        <form onSubmit={onSubmit} className="md:w-2/3 p-10 bg-slate-50/30 overflow-y-auto max-h-[85vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name — full width */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Medicine Name</label>
              <input
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Amoxicillin 500mg"
                className={inputBase(formErrors.name)}
              />
              {formErrors.name && <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2">{formErrors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={`${inputBase(formErrors.category)} appearance-none`}
              >
                <option value="">Select a category...</option>
                <option value="pain_relief">Pain Relief</option>
                <option value="antibiotics">Antibiotics</option>
                <option value="vitamins">Vitamins & Supplements</option>
                <option value="chronic_care">Chronic Care</option>
                <option value="dermatology">Dermatology</option>
                <option value="other">Other</option>
              </select>
              {formErrors.category && <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2">{formErrors.category}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Price (KES)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className={inputBase(formErrors.price)}
              />
              {formErrors.price && <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2">{formErrors.price}</p>}
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Initial Stock Qty</label>
              <input
                name="stock_quantity"
                type="number"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className={inputBase(formErrors.stock_quantity)}
              />
              {formErrors.stock_quantity && <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2">{formErrors.stock_quantity}</p>}
            </div>

            {/* Reorder Threshold */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Reorder Threshold</label>
              <input
                name="reorder_threshold"
                type="number"
                value={form.reorder_threshold}
                onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })}
                className={inputBase(formErrors.reorder_threshold)}
              />
              {formErrors.reorder_threshold && <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2">{formErrors.reorder_threshold}</p>}
            </div>

            {/* Dosage Form */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Dosage Form</label>
              <select
                name="dosage_form"
                value={form.dosage_form || 'other'}
                onChange={(e) => setForm({ ...form, dosage_form: e.target.value })}
                className={`${inputBase(false)} appearance-none`}
              >
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="syrup">Syrup</option>
                <option value="injection">Injection</option>
                <option value="cream">Cream/Ointment</option>
                <option value="drops">Drops</option>
                <option value="inhaler">Inhaler</option>
                <option value="solution">Solution</option>
                <option value="powder">Powder</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Strength */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Strength</label>
              <input
                name="strength"
                value={form.strength || ''}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
                placeholder="e.g. 500mg"
                className={inputBase(false)}
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Manufacturer</label>
              <input
                name="manufacturer"
                value={form.manufacturer || ''}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                placeholder="Manufacturer name"
                className={inputBase(false)}
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Supplier</label>
              <input
                name="supplier"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder="Supplier name"
                className={inputBase(false)}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Expiry Date</label>
              <input
                name="expiry_date"
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className={inputBase(formErrors.expiry_date)}
              />
              {formErrors.expiry_date && <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2">{formErrors.expiry_date}</p>}
            </div>

            {/* Description — full width */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Brief description of the medicine..."
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 /10 focus:border-indigo-500 transition-all font-medium text-slate-700 shadow-sm"
              />
            </div>

            {/* Product Image — full width */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Product Image</label>
              <div className="relative group border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:bg-white transition-all cursor-pointer">
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  <svg className="w-10 h-10 text-slate-300 group-hover:text-primary mx-auto mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs font-bold text-slate-500 group-hover:text-slate-700">
                    {form.image && form.image instanceof File ? form.image.name : 'Click or drop to upload'}
                  </p>
                </div>
              </div>
              {form.image && typeof form.image === 'string' && (
                <img src={form.image} alt="Product preview" className="mt-3 h-20 w-20 object-cover rounded-2xl border border-slate-200 shadow-sm" />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] px-6 py-4 btn-primary text-white rounded-2xl  shadow-premium hover:shadow-glow font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
            >
              {isEditMode ? 'Save Changes' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};