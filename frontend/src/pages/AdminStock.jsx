import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AddMedicineModal } from '../components/AddMedicineModal';
import ErrorBoundary from '../components/ErrorBoundary';

const AdminStock = () => {
	const navigate = useNavigate();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Debug items state
	useEffect(() => {
		console.log('[Items Debug]', { items, isArray: Array.isArray(items) });
	}, [items]);
	const [formErrors, setFormErrors] = useState({});
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [editingItem, setEditingItem] = useState(null);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const [perPage, setPerPage] = useState(20);

	// Search and filter state
	const [searchQuery, setSearchQuery] = useState('');
	const [filters, setFilters] = useState({
		lowStock: false,
		outOfStock: false,
		category: '',
	});

	// Debounced search query
	const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Form state
	const [form, setForm] = useState({
		name: '',
		category: '',
		price: '',
		stock_quantity: 0,
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

	// Toast notifications
	const [toast, setToast] = useState(null); // {message, type:'success'|'error'}

	const showToast = (message, type = 'success', timeout = 4000) => {
		setToast({ message, type });
		setTimeout(() => setToast(null), timeout);
	};

	// Categories list (derived from items)
	const [categories, setCategories] = useState([]);

	// DEBUG: Log modal state changes
	useEffect(() => {
		console.log('[Modal Debug] State changed:', { isModalOpen, isEditMode });
	}, [isModalOpen, isEditMode]);

	// Check if user is logged in and has required role
	useEffect(() => {
		const token = localStorage.getItem('access_token');
		if (!token) {
			navigate('/login');
			return;
		}
		api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
		fetchItems();
	}, [currentPage, perPage, debouncedSearch, filters.lowStock, filters.outOfStock, filters.category]);

	const fetchItems = async () => {
		try {
			setLoading(true);
			setError('');
			setItems([]); // Reset items to empty array

			// Build query params
			const params = new URLSearchParams({
				page: currentPage,
				per_page: perPage,
			});

			// Add filters
			if (filters.lowStock) params.append('low_stock', 'true');
			if (filters.outOfStock) params.append('out_of_stock', 'true');
			if (filters.category) params.append('category', filters.category);
			if (debouncedSearch) params.append('search', debouncedSearch);

			let products = [];
			let totalPagesCount = 0;
			let totalItemsCount = 0;

			// Try products endpoint first
			try {
				console.log('[Fetch Debug] Trying products endpoint...');
				const productsRes = await api.get(`/products/?${params.toString()}`);
				const data = productsRes.data;
				// Handle several possible shapes:
				// 1) Direct array: [ {...}, ... ]
				// 2) DRF paginated: { count, next, previous, results: [...] }
				// 3) Custom wrapper: { products: [...], totalPages, totalItems }
				if (Array.isArray(data)) {
					products = data;
					totalItemsCount = data.length;
					totalPagesCount = Math.ceil(totalItemsCount / perPage);
				} else if (data?.results && Array.isArray(data.results)) {
					products = data.results;
					totalItemsCount = data.count ?? data.results.length;
					totalPagesCount = Math.ceil(totalItemsCount / perPage);
				} else if (data?.products && Array.isArray(data.products)) {
					products = data.products;
					totalItemsCount = data.totalItems ?? data.products.length;
					totalPagesCount = data.totalPages ?? Math.ceil(totalItemsCount / perPage);
				} else {
					// unexpected shape; try to coerce to array or fall back
					products = [];
					totalItemsCount = 0;
					totalPagesCount = 0;
				}
				console.log('[Fetch Debug] Products endpoint success:', { count: totalItemsCount });
			} catch (productErr) {
				console.log('[Fetch Debug] Products endpoint failed, trying inventory endpoint');
				// Fallback to inventory endpoint
				const inventoryRes = await api.get(`/inventory/?${params.toString()}`);
				const idata = inventoryRes.data || {};
				products = Array.isArray(idata.products) ? idata.products : (Array.isArray(idata) ? idata : []);
				totalPagesCount = idata.totalPages ?? Math.ceil((idata.products?.length || products.length) / perPage);
				totalItemsCount = idata.totalItems ?? (idata.products?.length || products.length);
				console.log('[Fetch Debug] Inventory endpoint response:', { totalItemsCount, totalPagesCount });
			}

			setItems(products);
			setTotalPages(totalPagesCount);
			setTotalItems(totalItemsCount);

			// Extract unique categories
			const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
			setCategories(uniqueCategories.sort());

		} catch (err) {
			console.error(err);
			if (err.response?.status === 401) {
				setError('Please log in to view inventory');
				navigate('/login');
			} else {
				setError('Failed to load inventory');
			}
		} finally {
			setLoading(false);
		}
	};

	const openAddModal = () => {
		console.log('openAddModal called');
		setIsEditMode(false);
		setEditingItem(null);
		setForm({
			name: '',
			category: '',
			price: '',
			stock_quantity: 0,
			expiry_date: '',
			supplier: '',
			description: '',
			reorder_threshold: 10,
			image: null,
		});
		console.log('[Modal Debug] About to set isModalOpen to true');
		setIsModalOpen(true);
		console.log('[Modal Debug] Set isModalOpen to true');
	};

	const handleRefresh = async () => {
		console.log('[Refresh] manual refresh requested');
		await fetchItems();
	};

	const openEditModal = (item) => {
		setIsEditMode(true);
		setEditingItem(item);
		setForm({
			name: item.name || '',
			category: item.category || '',
			price: item.price || '',
			stock_quantity: item.stock_quantity || 0,
			expiry_date: item.expiry_date || '',
			supplier: item.supplier || '',
			description: item.description || '',
			reorder_threshold: item.reorder_threshold ?? 10,
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
			console.error(err);
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

		if (!form.price || isNaN(form.price) || Number(form.price) <= 0) {
			errors.price = 'Price must be a positive number';
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
			today.setHours(0, 0, 0, 0); // Reset time part for date-only comparison

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
				data.append('price', Number(form.price));
				data.append('stock_quantity', Number(form.stock_quantity));
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
					price: Number(form.price),
					stock_quantity: Number(form.stock_quantity),
					description: form.description?.trim() || '',
					supplier: form.supplier?.trim() || null,
					expiry_date: form.expiry_date || null,
				};
				headers['Content-Type'] = 'application/json';
			}

			if (isEditMode && editingItem) {
				await api.patch(`/products/${editingItem.id}/`, data, { headers });
			} else {
				// Optimistic UI: append a temporary item so user sees the new product immediately
				const optimisticId = `tmp-${Date.now()}`;
				const optimisticItem = {
					id: optimisticId,
					name: data instanceof FormData ? data.get('name') : data.name,
					category: data instanceof FormData ? data.get('category') : data.category,
					price: data instanceof FormData ? data.get('price') : data.price,
					stock_quantity: data instanceof FormData ? data.get('stock_quantity') : data.stock_quantity,
					expiry_date: data instanceof FormData ? data.get('expiry_date') : data.expiry_date,
					description: data instanceof FormData ? data.get('description') : data.description,
					supplier: data instanceof FormData ? data.get('supplier') : data.supplier,
					optimistic: true,
				};
				setItems(prev => [optimisticItem, ...prev]);
				try {
					const response = await api.post('/products/', data, { headers });
					console.log('Product created:', response.data);
					// Replace optimistic item with server response immediately
					setItems(prev => prev.map(i => (i.id === optimisticId ? response.data : i)));
					showToast('Product added', 'success');
					// optionally fetch in background to refresh pagination/indices
					fetchItems();
				} catch (postErr) {
					// Remove optimistic item on failure and show error toast
					setItems(prev => prev.filter(i => i.id !== optimisticId));
					showToast('Failed to add product', 'error');
					throw postErr;
				}
			}

			setIsModalOpen(false);
			setFormErrors({});
			// refresh authoritative data (fetch will replace optimistic entry)
			await fetchItems();
			console.log('Items refreshed');
		} catch (err) {
			console.error(err);
			if (err.response?.data) {
				// Handle validation errors from backend
				setFormErrors(err.response.data);
			} else {
				setError('Failed to save item');
			}
		}
	};

	const openLogs = async (item) => {
		setSelectedItemForLogs(item);
		try {
			const res = await api.get(`/inventory/${item.id}/logs/`);
			setLogEntries(res.data || []);
		} catch (err) {
			console.error(err);
			setError('Failed to load logs');
		}
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
			});
			setAdjustQty(0);
			setAdjustReason('');
			fetchItems();
			openLogs(item);
		} catch (err) {
			console.error(err);
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
				<div className="flex gap-3">
					<button
						onClick={() => navigate('/admin/restock-requests')}
						className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-card hover:bg-slate-50 transition-all active:scale-[0.98]"
					>
						Restock Requests
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
					<p className="text-rose-900 font-bold text-sm tracking-tight">{error}</p>
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
							{categories.map(cat => (
								<option key={cat} value={cat}>{cat}</option>
							))}
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
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-100">
							<thead className="bg-slate-50/50">
								<tr>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">#</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Price</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Stock</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Expiry</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{items.map((item, idx) => (
									<tr key={item.id ?? `row-${(currentPage - 1) * perPage + idx}`} className="hover:bg-slate-50/50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{(currentPage - 1) * perPage + idx + 1}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{item.name} {item.optimistic && <span className="ml-2 text-xs text-slate-400">(Saving...)</span>}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.category}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">KES {item.price}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{item.stock_quantity}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{(() => {
												if (!item.expiry_date) return <span className="text-gray-500">-</span>;
												try {
													const exp = new Date(item.expiry_date);
													const today = new Date();
													exp.setHours(0, 0, 0, 0);
													today.setHours(0, 0, 0, 0);
													const diffMs = exp - today;
													const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
													let text = '';
													let classes = 'text-gray-700';
													if (diffDays > 30) {
														text = `${diffDays} days left`;
														classes = 'text-green-800 bg-green-50';
													} else if (diffDays > 7) {
														text = `${diffDays} days left`;
														classes = 'text-yellow-800 bg-yellow-50';
													} else if (diffDays > 0) {
														text = `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
														classes = 'text-orange-800 bg-orange-50';
													} else if (diffDays === 0) {
														text = 'Expires today';
														classes = 'text-red-800 bg-red-100';
													} else {
														text = `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
														classes = 'text-white bg-red-600';
													}
													return (
														<span className={`inline-block px-2 py-1 rounded ${classes}`}>
															{text}
														</span>
													);
												} catch (e) {
													return <span className="text-gray-500">{item.expiry_date ?? '-'}</span>;
												}
											})()}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.stock_quantity === 0 ? 'bg-red-100 text-red-800' : (item.stock_quantity <= (item.reorder_threshold ?? 10) ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')
												}`}>
												{item.stock_quantity === 0 ? 'Out' : (item.stock_quantity <= (item.reorder_threshold ?? 10) ? 'Low' : 'In Stock')}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center gap-1.5">
												<button onClick={() => openEditModal(item)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-100 transition-all">Edit</button>
												<button onClick={() => handleDelete(item)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-all">Delete</button>
												<button onClick={() => openLogs(item)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all">Logs</button>
												<button onClick={() => { setSelectedItemForLogs(item); setAdjustQty(0); setAdjustReason(''); }} className="px-2.5 py-1 rounded-lg text-xs font-medium text-secondary-600 bg-secondary-50 hover:bg-secondary-100 border border-secondary-100 transition-all">Adjust</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					<div className="px-6 py-4 flex items-center justify-between border-t border-slate-100">
						<p className="text-sm text-slate-400">
							Showing <span className="font-semibold text-slate-600">{Math.min((currentPage - 1) * perPage + 1, Number(totalItems) || 0)}</span>–<span className="font-semibold text-slate-600">{Math.min(currentPage * perPage, Number(totalItems) || 0)}</span> of <span className="font-semibold text-slate-600">{Number(totalItems) || 0}</span>
						</p>
						<div className="flex items-center gap-2">
							<select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 /30">
								<option value={10}>10 / page</option>
								<option value={20}>20 / page</option>
								<option value={50}>50 / page</option>
								<option value={100}>100 / page</option>
							</select>
							<button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-40">Previous</button>
							<button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-5 py-2.5 btn-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest  shadow-premium transition-all active:scale-95 disabled:opacity-40">Next</button>
						</div>
					</div>
				</div>
			</ErrorBoundary>

			{/* Adjust Section */}
			{selectedItemForLogs && (
				<div className="mt-8 glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium">
					<h3 className="font-display font-bold text-slate-800 mb-4">Adjust Stock — {selectedItemForLogs.name}</h3>
					<div className="flex gap-3">
						<input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm w-40 focus:outline-none focus:ring-2 /30 focus:border-indigo-400" placeholder="+10 or -5" />
						<input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm flex-1 focus:outline-none focus:ring-2 /30 focus:border-indigo-400" placeholder="Reason for adjustment" />
						<button onClick={() => handleAdjust(selectedItemForLogs)} className="px-6 py-3 btn-primary text-white rounded-2xl  shadow-premium font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98]">Apply</button>
					</div>
					{logEntries.length > 0 && (
						<div className="mt-5">
							<h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Logs</h4>
							<ul className="space-y-2">
								{logEntries.map(log => (
									<li key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
										<span className="font-semibold text-slate-700">{log.change_type}</span>
										<span className={log.change_amount > 0 ? 'text-secondary-600 font-bold' : 'text-red-500 font-bold'}>{log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}</span>
										<span className="text-slate-400">by {log.logged_by?.username || 'system'} · {new Date(log.timestamp).toLocaleString()}</span>
										{log.reason && <span className="text-slate-500 ml-auto">{log.reason}</span>}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}


			{/* Toast */}
			{
				toast && (
					<div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-premium text-sm font-semibold animate-slide-up ${toast.type === 'success' ? 'bg-white border border-secondary-100 text-secondary-700' : 'bg-white border border-red-100 text-red-600'}`}>
						{toast.message}
					</div>
				)
			}
			<AddMedicineModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				isEditMode={isEditMode}
				form={form}
				setForm={setForm}
				formErrors={formErrors}
				onSubmit={handleSubmit}
			/>
		</div>

	);
};

export default AdminStock;
