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
			const payload = {
				name: form.name.trim(),
				category: form.category.trim(),
				price: Number(form.price),
				stock_quantity: Number(form.stock_quantity),
				description: form.description?.trim() || '',
				supplier: form.supplier?.trim() || null,
				expiry_date: form.expiry_date || null,
			};
      
			if (isEditMode && editingItem) {
				await api.patch(`/products/${editingItem.id}/`, payload);
			} else {
				// Optimistic UI: append a temporary item so user sees the new product immediately
				const optimisticId = `tmp-${Date.now()}`;
				const optimisticItem = {
					id: optimisticId,
					name: payload.name,
					category: payload.category,
					price: payload.price,
					stock_quantity: payload.stock_quantity,
					expiry_date: payload.expiry_date,
					description: payload.description,
					supplier: payload.supplier,
					optimistic: true,
				};
				setItems(prev => [optimisticItem, ...prev]);
				try {
					const response = await api.post('/products/', payload);
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

	if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			{/* DEBUG: show modal state for troubleshooting */}
			{true && (
				<div className="fixed bottom-4 right-4 bg-yellow-200 text-yellow-900 px-3 py-2 rounded shadow">
					Modal open: {String(isModalOpen)} | Edit mode: {String(isEditMode)}
				</div>
			)}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-bold">Manage Stock</h1>
					<div className="flex space-x-4">
						<button
							onClick={() => navigate('/admin/restock-requests')}
							className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							<svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
							Restock Requests
						</button>
						<button 
							onClick={(e) => {
								e.preventDefault();
								console.log('[Modal Debug] Add Medicine button clicked');
								openAddModal();
							}} 
							className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
						>
							<PlusIcon className="h-4 w-4 mr-2" /> Add Medicine
						</button>
						<button
							onClick={(e) => {
								e.preventDefault();
								handleRefresh();
							}}
							disabled={loading}
							className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
						>
							Refresh
						</button>
					</div>
				</div>

				{error && <div className="mb-4 p-3 bg-red-100 text-red-700">{error}</div>}

				{/* Search and Filters */}
				<div className="bg-white shadow rounded-lg mb-6 p-4">
					<div className="flex flex-wrap gap-4">
						<div className="flex-1 min-w-[200px]">
							<label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search by name, category, or supplier..."
								className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
							/>
						</div>
            
						<div className="w-48">
							<label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
							<select
								value={filters.category}
								onChange={(e) => setFilters({ ...filters, category: e.target.value })}
								className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
							>
								<option value="">All Categories</option>
								{categories.map(cat => (
									<option key={cat} value={cat}>{cat}</option>
								))}
							</select>
						</div>

						<div className="flex items-end gap-4">
							<div>
								<label className="flex items-center">
									<input
										type="checkbox"
										checked={filters.lowStock}
										onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked })}
										className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
									/>
									<span className="ml-2 text-sm text-gray-600">Low Stock</span>
								</label>
							</div>
              
							<div>
								<label className="flex items-center">
									<input
										type="checkbox"
										checked={filters.outOfStock}
										onChange={(e) => setFilters({ ...filters, outOfStock: e.target.checked })}
										className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
									/>
									<span className="ml-2 text-sm text-gray-600">Out of Stock</span>
								</label>
							</div>
						</div>
					</div>
				</div>

				<ErrorBoundary>
				<div className="bg-white shadow rounded-lg overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{items.map((item, idx) => (
										<tr key={item.id ?? `row-${(currentPage-1)*perPage + idx}`}>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(currentPage - 1) * perPage + idx + 1}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name} {item.optimistic && <span className="ml-2 text-xs text-gray-500">(Saving...)</span>}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.price}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stock_quantity}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{(() => {
												if (!item.expiry_date) return <span className="text-gray-500">-</span>;
												try {
													const exp = new Date(item.expiry_date);
													const today = new Date();
													exp.setHours(0,0,0,0);
													today.setHours(0,0,0,0);
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
											<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
												item.stock_quantity === 0 ? 'bg-red-100 text-red-800' : (item.stock_quantity <= (item.reorder_threshold ?? 10) ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')
											}`}>
												{item.stock_quantity === 0 ? 'Out' : (item.stock_quantity <= (item.reorder_threshold ?? 10) ? 'Low' : 'In Stock')}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<button onClick={() => openEditModal(item)} className="text-blue-600 mr-3">Edit</button>
											<button onClick={() => handleDelete(item)} className="text-red-600 mr-3">Delete</button>
											<button onClick={() => openLogs(item)} className="text-indigo-600 mr-3">Logs</button>
											<button onClick={() => { setSelectedItemForLogs(item); setAdjustQty(0); setAdjustReason(''); }} className="text-green-600">Adjust</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
          
					{/* Pagination */}
					<div className="px-6 py-4 flex items-center justify-between border-t">
						<div className="flex-1 flex justify-between items-center">
							<div>
												<p className="text-sm text-gray-700">
													Showing{' '}
													<span className="font-medium">{Math.min((currentPage - 1) * perPage + 1, Number(totalItems) || 0)}</span>
													{' '}-{' '}
													<span className="font-medium">{Math.min(currentPage * perPage, Number(totalItems) || 0)}</span>
													{' '}of{' '}
													<span className="font-medium">{Number(totalItems) || 0}</span>
													{' '}results
												</p>
							</div>
              
							<div className="flex gap-2">
								<select
									value={perPage}
									onChange={(e) => {
										setPerPage(Number(e.target.value));
										setCurrentPage(1);
									}}
									className="rounded border-gray-300 text-sm"
								>
									<option value={10}>10 per page</option>
									<option value={20}>20 per page</option>
									<option value={50}>50 per page</option>
									<option value={100}>100 per page</option>
								</select>
                
								<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
									<button
										onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
										disabled={currentPage === 1}
										className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
									>
										Previous
									</button>
                  
									<button
										onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
										disabled={currentPage === totalPages}
										className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
									>
										Next
									</button>
								</nav>
							</div>
						</div>
					</div>
				</div>
				</ErrorBoundary>

					{/* Adjust Section */}
				{selectedItemForLogs && (
					<div className="mt-6 bg-white p-4 rounded shadow">
						<h3 className="font-medium">Adjust Stock for {selectedItemForLogs.name}</h3>
						<div className="mt-2 flex gap-2">
							<input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="px-3 py-2 border rounded w-40" placeholder="+10 or -5" />
							<input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="px-3 py-2 border rounded flex-1" placeholder="Reason" />
							<button onClick={() => handleAdjust(selectedItemForLogs)} className="px-4 py-2 bg-blue-600 text-white rounded">Apply</button>
						</div>

						{/* Logs list */}
						{logEntries.length > 0 && (
							<div className="mt-4">
								<h4 className="text-sm font-medium">Recent Logs</h4>
								<ul className="mt-2 space-y-2 text-sm">
									{logEntries.map(log => (
										<li key={log.id} className="border p-2 rounded">
											<div><strong>{log.change_type}</strong> {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount} by {log.logged_by?.username || 'system'} on {new Date(log.timestamp).toLocaleString()}</div>
											<div className="text-xs text-gray-600">{log.reason}</div>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Add/Edit Modal */}
			{toast && (
				<div className={`fixed top-6 right-6 z-50 rounded shadow px-4 py-2 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
					{toast.message}
				</div>
			)}
			<AddMedicineModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				isEditMode={isEditMode}
				form={form}
				setForm={setForm}
				formErrors={formErrors}
				onSubmit={handleSubmit}
			/>

			{/* DEBUG: quick toggle to test modal independently of the main button */}
			<button
				onClick={() => setIsModalOpen(v => !v)}
				className="fixed left-4 bottom-4 bg-purple-600 text-white px-3 py-2 rounded shadow-lg"
			>
				Toggle Modal (debug)
			</button>
		</div>
	);
};

export default AdminStock;
