import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AddMedicineModal } from '../components/AddMedicineModal';
import BulkAddMedicineModal from '../components/BulkAddMedicineModal';
import StockLogsModal from '../components/StockLogsModal';
import AdjustStockModal from '../components/AdjustStockModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { normalizeDisplayValue } from '../utils/displayHelpers';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { inventoryService } from '../services/inventoryService';
import { queryClient } from '../lib/queryClient';
import { QUERY_KEYS } from '../lib/queryKeys';

const AdminStock = () => {
	const { notify } = useNotification();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedBranch, setSelectedBranch] = useState('all');

	const [formErrors, setFormErrors] = useState({});
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [editingItem, setEditingItem] = useState(null);
	const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
	const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);

	const getCategoryLabel = (category) => {
		if (!category && category !== 0) return '';
		if (typeof category === 'string') return category;
		if (typeof category === 'number' || typeof category === 'boolean') return String(category);
		if (category?.name) return category.name;
		if (category?.label) return category.label;
		return normalizeDisplayValue(category, '');
	};

	const sanitizeItem = (item) => {
		if (!item || typeof item !== 'object') return item;
		return {
			...item,
			id: item.id ?? item.pk ?? item.product_id ?? item.product?.id ?? item.name ?? String(Date.now()),
			name: normalizeDisplayValue(item.name, ''),
			category: getCategoryLabel(item.category),
			price: Number(item.price ?? item?.pricing_tier?.price ?? 0) || 0,
			stock_quantity: Number(item.stock_quantity ?? item.quantity ?? 0) || 0,
			expiry_date: item.expiry_date ?? item.expiryDate ?? '',
			supplier: normalizeDisplayValue(item.supplier, ''),
			description: normalizeDisplayValue(item.description, ''),
			reorder_threshold: Number(item.reorder_threshold ?? 10) || 10,
		};
	};

	// Search, filter, and pagination state
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);

	const [filters, setFilters] = useState({
		lowStock: false,
		outOfStock: false,
		category: '',
	});

	// Removed debounce - instant search as user types
	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const requestIdRef = useRef(0);

	const [form, setForm] = useState({
		name: '',
		category: '',
		buying_price: '',
		use_legacy_prices: false,
		wholesale_price: '',
		retail_price: '',
		stock_quantity: 0,
		dosage_form: 'other',
		strength: '',
		shelf_location: '',
		expiry_date: '',
		supplier: '',
		description: '',
		reorder_threshold: 10,
		image: null,
	});

	const [logEntries, setLogEntries] = useState([]);
	const [selectedItemForLogs, setSelectedItemForLogs] = useState(null);
	const [adjustQty, setAdjustQty] = useState(0);
	const [adjustReason, setAdjustReason] = useState('');

	// Categories list (derived from items)
	const [categories, setCategories] = useState([]);

	// Check if user is logged in and has required role
	useEffect(() => {
		const token = localStorage.getItem('access_token');
		if (!token) {
			navigate('/login');
			return;
		}
		api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
		fetchItems();
	}, []);

	// Instant search - refetch when search, filters, or page change
	useEffect(() => {
		if (isInitialLoad) return; // Skip on first render
		const controller = new AbortController();
		const timeout = setTimeout(() => {
			fetchItems(controller.signal);
		}, 400); // Debounce typing to prevent network spam & UI lag
		return () => {
			clearTimeout(timeout);
			controller.abort();
		};
	}, [searchQuery, filters.lowStock, filters.outOfStock, filters.category, currentPage]);

	// Reset to page 1 when search or filters change
	useEffect(() => {
		if (!isInitialLoad) setCurrentPage(1);
	}, [searchQuery, filters.lowStock, filters.outOfStock, filters.category]);

	const fetchItems = async (signal) => {
		const currentRequestId = ++requestIdRef.current;
		try {
			// Only show loading spinner on initial page load, not on search/filter
			if (isInitialLoad) {
				setLoading(true);
				setIsInitialLoad(false);
			}
			setError('');

			// Build query params
			const params = {
				per_page: 50,
				page: currentPage,
			};

			// Add filters
			if (filters.lowStock) params.low_stock = 'true';
			if (filters.outOfStock) params.out_of_stock = 'true';
			if (filters.category) params.category = filters.category;
			const trimmedSearchQuery = searchQuery.trim();
			if (trimmedSearchQuery) params.search = trimmedSearchQuery;

			let fetchedProducts = [];
			let totalPagesCount = 1;
			let totalItemsCount = 0;

			// Always use the inventory endpoint to get branch-scoped stock
			try {
				const inventoryRes = await inventoryService.getInventory(params, { signal });
				if (signal?.aborted || currentRequestId !== requestIdRef.current) return;

				const data = inventoryRes.data || {};
				const payload = data.data || data;
				
				if (Array.isArray(payload.products)) {
					fetchedProducts = payload.products;
					totalItemsCount = payload.totalItems ?? fetchedProducts.length;
					totalPagesCount = payload.totalPages ?? 1;
				} else if (Array.isArray(payload)) {
					fetchedProducts = payload;
					totalItemsCount = fetchedProducts.length;
					totalPagesCount = 1;
				}

				setItems(fetchedProducts.map(sanitizeItem));
				setTotalPages(totalPagesCount);
				setTotalItems(totalItemsCount);
			} catch (inventoryErr) {
				if (signal?.aborted || currentRequestId !== requestIdRef.current) return;
				throw inventoryErr;
			}

			if (signal?.aborted || currentRequestId !== requestIdRef.current) return;

			// Extract unique categories
			const uniqueCategories = [...new Set(fetchedProducts.map(p => getCategoryLabel(p.category)).filter(Boolean))];
			setCategories(uniqueCategories.sort());

		} catch (err) {
			if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
			if (err.response?.status === 401) {
				setError('Please log in to view inventory');
				navigate('/login');
			} else {
				// Show error state
				setError('Failed to load inventory');
				}
		} finally {
			if (requestIdRef.current === currentRequestId) {
				setLoading(false);
			}
		}
	};

	const openAddModal = () => {
		setIsEditMode(false);
		setEditingItem(null);
		setForm({
			name: '',
			category: '',
			buying_price: '',
			use_legacy_prices: false,
			wholesale_price: '',
			retail_price: '',
			stock_quantity: 0,
			dosage_form: 'other',
			strength: '',
			shelf_location: '',
			expiry_date: '',
			supplier: '',
			description: '',
			reorder_threshold: 10,
			department: 'CHEMIST',
			image: null,
		});
		setIsModalOpen(true);
		};

	const handleRefresh = async () => {
		await fetchItems();
	};

	const openEditModal = (item) => {
		setIsEditMode(true);
		setEditingItem(item);
		setForm({
			name: item.name || '',
			category: item.category || '',
			buying_price: item.pricing_tier?.buying_price || '',
			use_legacy_prices: item.pricing_tier?.use_legacy_prices || false,
			wholesale_price: item.pricing_tier?.wholesale_price || '',
			retail_price: item.pricing_tier?.retail_price || '',
			stock_quantity: item.stock_quantity || 0,
			dosage_form: item.dosage_form || 'other',
			strength: item.strength || '',
			shelf_location: item.shelf_location || '',
			expiry_date: item.expiry_date || '',
			supplier: item.supplier || '',
			description: item.description || '',
			reorder_threshold: item.reorder_threshold ?? 10,
			department: item.department || 'CHEMIST',
			image: item.image || null,
		});
		setIsModalOpen(true);
	};

	const openDuplicateModal = (item) => {
		setIsEditMode(false);
		setEditingItem(null);
		setForm({
			name: item.name || '',
			category: item.category || '',
			buying_price: item.pricing_tier?.buying_price || '',
			use_legacy_prices: item.pricing_tier?.use_legacy_prices || false,
			wholesale_price: item.pricing_tier?.wholesale_price || '',
			retail_price: item.pricing_tier?.retail_price || '',
			stock_quantity: item.stock_quantity || 0,
			dosage_form: item.dosage_form || 'other',
			strength: item.strength || '',
			shelf_location: item.shelf_location || '',
			expiry_date: item.expiry_date || '',
			supplier: item.supplier || '',
			description: item.description || '',
			reorder_threshold: item.reorder_threshold ?? 10,
			department: item.department || 'CHEMIST',
			image: item.image || null,
		});
		setIsModalOpen(true);
	};

	const handleDelete = async (item) => {
		if (!window.confirm(`Delete ${item.name}? This will remove it from inventory.`)) return;
		try {
			await api.delete(`/products/${item.id}/`);
			fetchItems();
		} catch (err) {
			setError('Failed to delete item');
		}
	};

	const validateForm = () => {
		const errors = {};

		if (!form.name?.trim()) {
			errors.name = 'Name is required';
		}

		if (!form.category?.trim()) {
			errors.category = 'Category is required';
		}

		// Buying price is always required now (as it calculates the others)
		const hasBP = form.buying_price && !isNaN(form.buying_price) && Number(form.buying_price) > 0;
		if (!hasBP) {
			errors.buying_price = 'Buying Price is required';
		}

		if (form.use_legacy_prices) {
			if (!form.wholesale_price || isNaN(form.wholesale_price) || Number(form.wholesale_price) <= 0) {
				errors.wholesale_price = 'Wholesale Price must be a positive number';
			}
			if (!form.retail_price || isNaN(form.retail_price) || Number(form.retail_price) <= 0) {
				errors.retail_price = 'Retail Price must be a positive number';
			}
		}

		if (!form.stock_quantity || isNaN(form.stock_quantity) || Number(form.stock_quantity) < 0) {
			errors.stock_quantity = 'Stock quantity must be zero or positive';
		}

		if (!form.reorder_threshold || isNaN(form.reorder_threshold) || Number(form.reorder_threshold) <= 0) {
			errors.reorder_threshold = 'Reorder threshold must be a positive number';
		}

		// Validate expiry date is in the future
		if (form.expiry_date) {
			const expiryDate = new Date(form.expiry_date);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (expiryDate < today) {
				errors.expiry_date = 'Expiry date must be in the future';
			}
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (!validateForm()) return;

		try {
			// Use FormData if image is present, otherwise use JSON
			let data;
			let headers = {};

			if (form.image && form.image instanceof File) {
				data = new FormData();
				data.append('name', form.name.trim());
				data.append('category', form.category.trim());
				if (form.buying_price) data.append('buying_price', Number(form.buying_price));
				
				data.append('use_legacy_prices', form.use_legacy_prices);
				if (form.use_legacy_prices) {
					if (form.wholesale_price) data.append('wholesale_price', Number(form.wholesale_price));
					if (form.retail_price) data.append('retail_price', Number(form.retail_price));
				}

				data.append('stock_quantity', Number(form.stock_quantity));
				data.append('dosage_form', form.dosage_form);
				data.append('department', form.department);
				data.append('strength', form.strength?.trim() || '');
				data.append('shelf_location', form.shelf_location?.trim() || '');
				data.append('description', form.description?.trim() || '');
				data.append('supplier', form.supplier?.trim() || '');
				if (form.expiry_date) {
					data.append('expiry_date', form.expiry_date);
				}
				data.append('image', form.image);
			} else {
				data = {
					name: form.name.trim(),
					category: form.category.trim(),
					...(form.buying_price ? { buying_price: Number(form.buying_price) } : {}),
					use_legacy_prices: form.use_legacy_prices,
					...(form.use_legacy_prices && form.wholesale_price ? { wholesale_price: Number(form.wholesale_price) } : {}),
					...(form.use_legacy_prices && form.retail_price ? { retail_price: Number(form.retail_price) } : {}),
					stock_quantity: Number(form.stock_quantity),
					dosage_form: form.dosage_form,
					department: form.department,
					strength: form.strength?.trim() || '',
					shelf_location: form.shelf_location?.trim() || '',
					description: form.description?.trim() || '',
					supplier: form.supplier?.trim() || null,
					expiry_date: form.expiry_date || null,
				};
				headers['Content-Type'] = 'application/json';
			}

			if (isEditMode && editingItem) {
				await api.patch(`/products/${editingItem.id}/`, data, { headers });
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory._def });
			} else {
				// Optimistic UI: append a temporary item so user sees the new product immediately
					const optimisticId = `tmp-${Date.now()}`;
					const optimisticItem = {
						id: optimisticId,
						name: data instanceof FormData ? data.get('name') : data.name,
						category: data instanceof FormData ? data.get('category') : data.category,
						price: data instanceof FormData ? data.get('price') : data.price,
						stock_quantity: data instanceof FormData ? data.get('stock_quantity') : data.stock_quantity,
						department: data instanceof FormData ? data.get('department') : data.department,
						expiry_date: data instanceof FormData ? data.get('expiry_date') : data.expiry_date,
						description: data instanceof FormData ? data.get('description') : data.description,
						supplier: data instanceof FormData ? data.get('supplier') : data.supplier,
						optimistic: true,
					};
					setItems(prev => [optimisticItem, ...prev]);
					try {
						const response = await api.post('/products/', data, { headers });
						// Replace optimistic item with real server response
						setItems(prev => prev.map(i => (i.id === optimisticId ? response.data : i)));
						queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory._def });
						notify.success('Product Added', 'The product has been added to the system.');
						// Background refresh — does NOT trigger a loading spinner
						void fetchItems();
					} catch (postErr) {
						// Remove optimistic item on failure
						setItems(prev => prev.filter(i => i.id !== optimisticId));
						notify.error('Add Failed', 'The product could not be added. Please try again.');
						throw postErr;
					}
				}

				setIsModalOpen(false);
				setFormErrors({});
				// Edit path: refresh list after editing
				if (isEditMode) await fetchItems();
			} catch (err) {
			if (err.response?.data) {
				// Handle validation errors from backend
				setFormErrors(err.response.data);
			} else {
				setError('Failed to save item');
			}
		}
	};

	const openLogs = (item) => {
		setSelectedItemForLogs(item);
	};

	const openAdjustModal = (item) => {
		setSelectedItemForAdjust(item);
		setIsAdjustModalOpen(true);
	};

	const handleAdjust = async (item) => {
		try {
			const qty = parseInt(adjustQty, 10);
			if (!qty) {
				setError('Adjustment quantity must be non-zero integer');
				return;
			}
			await api.post(`/inventory/${item.id}/adjust/`, {
				quantity: qty,
				reason: adjustReason,
				change_type: 'adjustment',
				branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
			});
			setAdjustQty(0);
			setAdjustReason('');
			fetchItems();
			openLogs(item);
		} catch (err) {
			setError('Failed to adjust stock');
		}
	};

	if (loading) return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="flex flex-col items-center gap-4 opacity-40">
				<div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-xl animate-spin shadow-glow-indigo"></div>
				<p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading...</p>
			</div>
		</div>
	);

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">

			{/* Header Section */}
			<div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
							<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
						</div>
						<h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Manage <span className="text-primary">Stock</span></h1>
					</div>
					<p className="text-lg text-slate-500 font-medium">Add, edit, and manage pharmaceutical products in your inventory.</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<button
						onClick={() => navigate('/admin/restock-requests')}
						className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-card hover:bg-slate-50 transition-all active:scale-[0.98]"
					>
						Restock Requests
					</button>
					<button
						onClick={(e) => { e.preventDefault(); setIsBulkModalOpen(true); }}
						className="px-6 py-3.5 bg-white border border-indigo-200 text-indigo-700 rounded-2xl shadow-sm hover:shadow-card hover:bg-indigo-50 transition-all active:scale-[0.98] flex items-center gap-2 group"
					>
						{/* Stack icon for bulk */}
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
						<span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">Bulk Add</span>
					</button>
					<button
						onClick={(e) => { e.preventDefault(); openAddModal(); }}
						className="px-6 py-3.5 btn-primary text-white rounded-2xl  shadow-premium hover:shadow-glow transition-all active:scale-[0.98] flex items-center gap-2 group"
					>
						<PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
						<span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">Add Medicine</span>
					</button>
					<button
						onClick={(e) => { e.preventDefault(); handleRefresh(); }}
						disabled={loading}
						className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-card hover:bg-slate-50 disabled:opacity-40 transition-all active:scale-[0.98]"
					>
						Refresh
					</button>
				</div>
			</div>

			{error && (
				<div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 animate-shake">
					<div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
					</div>
					<p className="text-rose-900 font-bold text-sm tracking-tight">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
				</div>
			)}

			{/* Search and Filters */}
			<div className="glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium mb-10">
				<div className="flex flex-wrap gap-4">
					<div className="flex-1 min-w-[200px]">
						<label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Search</label>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search by name, category, or supplier..."
							className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 /30 focus:border-indigo-400 transition-all"
						/>
					</div>
					<div className="w-48">
						<label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
						<select
							value={filters.category}
							onChange={(e) => setFilters({ ...filters, category: e.target.value })}
							className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-700 focus:outline-none focus:ring-2 /30 focus:border-indigo-400 transition-all"
						>
							<option value="">All Categories</option>
										{categories.map(cat => {
											const label = normalizeDisplayValue(cat, '');
											return (
												<option key={label} value={label}>{label}</option>
											);
										})}
						</select>
					</div>
					<div className="flex items-end gap-4">
						<label className="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" checked={filters.lowStock} onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked })} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
							<span className="text-sm font-medium text-slate-600">Low Stock</span>
						</label>
						<label className="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" checked={filters.outOfStock} onChange={(e) => setFilters({ ...filters, outOfStock: e.target.checked })} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
							<span className="text-sm font-medium text-slate-600">Out of Stock</span>
						</label>
					</div>
				</div>
			</div>

			<ErrorBoundary>
				<div className="glass-card rounded-[2.5rem] border border-white/60 shadow-premium overflow-hidden">
					<div className="overflow-auto max-h-[70vh]">
						<table className="min-w-full text-sm">
							<thead className="sticky top-0 z-20" style={{ background: 'var(--bg-primary)' }}>
								<tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
									<th className="text-left px-3 py-3 font-bold sticky left-0 z-30" style={{ background: 'var(--bg-primary)' }}>Product</th>
									<th className="text-left px-3 py-3 font-bold text-xs">Category</th>
									<th className="text-right px-3 py-3 font-bold text-xs">Price</th>
									<th className="text-right px-3 py-3 font-bold text-xs">Stock</th>
									<th className="text-left px-3 py-3 font-bold text-xs">Expiry</th>
									<th className="text-left px-3 py-3 font-bold text-xs">Status</th>
									<th className="text-right px-3 py-3 font-bold text-xs">Actions</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item, idx) => {
									const out = item.stock_quantity === 0;
									const low = !out && item.stock_quantity <= (item.reorder_threshold ?? 10);
									return (
									<tr key={String(item.id ?? `row-${idx}`)} className="border-b hover:bg-primary/5 transition-colors group" style={{ borderColor: 'var(--border-primary)' }}>
										<td className={`px-3 py-3 font-semibold text-sm sticky left-0 z-10 group-hover:bg-primary/5 transition-colors ${out ? 'text-slate-400' : 'text-slate-800'}`} style={{ background: 'var(--bg-primary)' }}>
											{normalizeDisplayValue(item.name)} {item.optimistic && <span className="ml-2 text-xs text-slate-400">(Saving...)</span>}
										</td>
										<td className="px-3 py-3 text-xs text-slate-600 max-w-[10rem] truncate">
											{normalizeDisplayValue(item.category) || '—'}
										</td>
										<td className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
											{item.price ? `KES ${normalizeDisplayValue(item.price, '0')}` : '—'}
										</td>
										<td className="px-3 py-3 text-right text-xs font-bold text-slate-700">
											{normalizeDisplayValue(item.stock_quantity, 0)}
										</td>
										<td className="px-3 py-3 text-xs">
											{(() => {
												if (!item.expiry_date) return <span className="text-slate-500">—</span>;
												try {
													const exp = new Date(item.expiry_date);
													const today = new Date();
													exp.setHours(0, 0, 0, 0);
													today.setHours(0, 0, 0, 0);
													const diffMs = exp - today;
													const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
													let text = '';
													let classes = 'text-slate-700';
													if (diffDays > 30) {
														text = `${diffDays} days left`;
														classes = 'text-emerald-700 bg-emerald-50 border border-emerald-100';
													} else if (diffDays > 7) {
														text = `${diffDays} days left`;
														classes = 'text-amber-700 bg-amber-50 border border-amber-100';
													} else if (diffDays > 0) {
														text = `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
														classes = 'text-orange-700 bg-orange-50 border border-orange-100';
													} else if (diffDays === 0) {
														text = 'Expires today';
														classes = 'text-rose-700 bg-rose-50 border border-rose-100';
													} else {
														text = `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
														classes = 'text-white bg-rose-600 border border-rose-700';
													}
													return (
														<span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${classes}`}>
															{text}
														</span>
													);
												} catch (e) {
													return <span className="text-slate-500">{normalizeDisplayValue(item.expiry_date, '—')}</span>;
												}
											})()}
										</td>
										<td className="px-3 py-3">
											<div className="flex flex-wrap gap-1">
												{out && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold whitespace-nowrap">Out</span>}
												{low && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold whitespace-nowrap">Low</span>}
												{!out && !low && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold whitespace-nowrap">In Stock</span>}
											</div>
										</td>
										<td className="px-3 py-3 text-right">
											<div className="flex flex-wrap items-center justify-end gap-1.5">
												<button onClick={() => openEditModal(item)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-100 transition-all">Edit</button>
												<button onClick={() => openDuplicateModal(item)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all">Duplicate</button>
												<button onClick={() => openAdjustModal(item)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-all">Adjust</button>
												<button onClick={() => navigate('/otc-sales')} className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all">Quick Sale</button>
												<button onClick={() => openLogs(item)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all">Logs</button>
											</div>
										</td>
									</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* ── Pagination Controls ── */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between p-4 bg-white/5 border-t border-white/10">
							<p className="text-xs font-medium text-slate-500">
								Page {currentPage} of {totalPages} &middot; {totalItems} items total
							</p>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1 || loading}
									className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 transition-all disabled:opacity-40"
								>
									← Prev
								</button>
								{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
									let page = i + 1;
									if (totalPages > 5) {
										page = Math.min(Math.max(currentPage - 2, 1) + i, totalPages - (4 - i));
									}
									return (
										<button
											key={page}
											onClick={() => setCurrentPage(page)}
											disabled={loading}
											className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 ${
												page === currentPage
													? 'border-primary-500 bg-primary-50 text-primary-700'
													: 'border-slate-200 text-slate-700 hover:bg-slate-50'
											}`}
										>
											{page}
										</button>
									);
								})}
								<button
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									disabled={currentPage === totalPages || loading}
									className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 transition-all disabled:opacity-40"
								>
									Next →
								</button>
							</div>
						</div>
					)}
				</div>
			</ErrorBoundary>

			<AddMedicineModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				isEditMode={isEditMode}
				form={form}
				setForm={setForm}
				formErrors={formErrors}
				onSubmit={handleSubmit}
				categories={categories}
			/>

			<BulkAddMedicineModal
				isOpen={isBulkModalOpen}
				onClose={() => setIsBulkModalOpen(false)}
				onSuccess={() => fetchItems()}
				categories={categories}
			/>

			{selectedItemForLogs && (
				<StockLogsModal 
					item={selectedItemForLogs} 
					onClose={() => setSelectedItemForLogs(null)} 
				/>
			)}

			{isAdjustModalOpen && (
				<AdjustStockModal
					item={selectedItemForAdjust}
					onClose={() => {
						setIsAdjustModalOpen(false);
						setSelectedItemForAdjust(null);
					}}
					onSuccess={() => fetchItems()}
				/>
			)}
		</div>

	);
};

export default AdminStock;
