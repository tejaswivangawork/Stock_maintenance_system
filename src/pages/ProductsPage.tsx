import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Eye,
  ArrowDownRight,
  ArrowUpRight,
  Package,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Product, Category, Supplier } from '../types/index.ts';
import { StockStatusBadge } from '../components/Badge.tsx';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { StockInModal } from '../components/StockInModal.tsx';
import { StockOutModal } from '../components/StockOutModal.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const canModify = hasRole('admin', 'manager');

  // Products and reference data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<{ product: Product; recentMovements: any[] } | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Stock In / Out quick action modal
  const [actionProductId, setActionProductId] = useState<number | undefined>(undefined);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    supplier_id: '',
    unit_price: '',
    cost_price: '',
    available_quantity: '',
    minimum_stock_level: '10',
    unit_of_measure: 'pcs',
    status: 'active',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getProducts({
        search: searchTerm,
        category_id: selectedCategory || undefined,
        supplier_id: selectedSupplier || undefined,
        stock_status: selectedStockStatus || undefined,
        status: selectedStatus || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      });
      setProducts(res.products);
      setPagination(res.pagination);
    } catch (err: any) {
      error(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchTerm,
    selectedCategory,
    selectedSupplier,
    selectedStockStatus,
    selectedStatus,
    sortBy,
    sortOrder,
    pagination.page,
    pagination.limit,
    error,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    api.getCategories().then((res) => setCategories(res.categories));
    api.getSuppliers({ status: 'active' }).then((res) => setSuppliers(res.suppliers));

    const handleUpdate = () => fetchProducts();
    window.addEventListener('stock_updated', handleUpdate);
    return () => window.removeEventListener('stock_updated', handleUpdate);
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      supplier_id: '',
      unit_price: '',
      cost_price: '',
      available_quantity: '0',
      minimum_stock_level: '10',
      unit_of_measure: 'pcs',
      status: 'active',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      description: p.description || '',
      category_id: String(p.category_id),
      supplier_id: p.supplier_id ? String(p.supplier_id) : '',
      unit_price: String(p.unit_price),
      cost_price: String(p.cost_price),
      available_quantity: String(p.available_quantity),
      minimum_stock_level: String(p.minimum_stock_level),
      unit_of_measure: p.unit_of_measure || 'pcs',
      status: p.status,
    });
  };

  const handleViewProduct = async (p: Product) => {
    try {
      const res = await api.getProductById(p.id);
      setViewingProduct(res);
    } catch (err: any) {
      error(err.message || 'Failed to fetch product details');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: formData.name,
          sku: formData.sku,
          description: formData.description,
          category_id: Number(formData.category_id),
          supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
          unit_price: Number(formData.unit_price),
          cost_price: Number(formData.cost_price || 0),
          minimum_stock_level: Number(formData.minimum_stock_level),
          unit_of_measure: formData.unit_of_measure,
          status: formData.status,
        });
        success(`Product "${formData.name}" updated successfully.`);
        setEditingProduct(null);
      } else {
        await api.createProduct({
          name: formData.name,
          sku: formData.sku,
          description: formData.description,
          category_id: Number(formData.category_id),
          supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
          unit_price: Number(formData.unit_price),
          cost_price: Number(formData.cost_price || 0),
          available_quantity: Number(formData.available_quantity || 0),
          minimum_stock_level: Number(formData.minimum_stock_level || 10),
          unit_of_measure: formData.unit_of_measure,
          status: formData.status,
        });
        success(`Product "${formData.name}" created successfully.`);
        setIsCreateOpen(false);
      }
      fetchProducts();
      window.dispatchEvent(new CustomEvent('stock_updated'));
    } catch (err: any) {
      error(err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id);
      success(`Product "${productToDelete.name}" deleted.`);
      setProductToDelete(null);
      fetchProducts();
      window.dispatchEvent(new CustomEvent('stock_updated'));
    } catch (err: any) {
      error(err.message || 'Could not delete product');
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Products &amp; Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage SKUs, stock thresholds, pricing, and supplier relationships
          </p>
        </div>
        {canModify && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, SKU..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div>
            <select
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Stock Levels</option>
              <option value="normal">In Stock (Healthy)</option>
              <option value="low">Low Stock (≤ Min Level)</option>
              <option value="out">Out of Stock (0)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="active">Active Catalog</option>
              <option value="inactive">Archived / Inactive</option>
              <option value="">All Statuses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    <span>Product Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('sku')}>
                  <div className="flex items-center gap-1.5">
                    <span>SKU</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Category</th>
                <th
                  className="py-3 px-4 text-center cursor-pointer"
                  onClick={() => handleSort('available_quantity')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Stock Level</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer" onClick={() => handleSort('unit_price')}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Unit Price</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading products...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No products found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adjust your search filters or add a new product
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{p.sku}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.category_name}</td>
                    <td className="py-3 px-4 text-center">
                      <StockStatusBadge
                        quantity={p.available_quantity}
                        minLevel={p.minimum_stock_level}
                      />
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Min: {p.minimum_stock_level} {p.unit_of_measure}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      ${p.unit_price.toFixed(2)}
                      <div className="text-[10px] text-slate-400">Cost: ${p.cost_price.toFixed(2)}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-700">
                      ${((p.total_valuation as number) || p.available_quantity * p.unit_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.supplier_name || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Quick Stock In */}
                        <button
                          onClick={() => {
                            setActionProductId(p.id);
                            setIsStockInOpen(true);
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Stock In (+)"
                        >
                          <ArrowDownRight className="w-4 h-4" />
                        </button>

                        {/* Quick Stock Out */}
                        <button
                          onClick={() => {
                            setActionProductId(p.id);
                            setIsStockOutOpen(true);
                          }}
                          disabled={p.available_quantity === 0}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Stock Out (-)"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>

                        {/* View Product Details */}
                        <button
                          onClick={() => handleViewProduct(p)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Details & History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Product */}
                        {canModify && (
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete / Deactivate Product */}
                        {canModify && (
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete / Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <span className="font-semibold">{pagination.page}</span> of{' '}
              <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total}{' '}
              total products)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Product Modal */}
      <Modal
        isOpen={isCreateOpen || editingProduct !== null}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? `Edit Product — ${editingProduct.sku}` : 'Add New Product'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Industrial Digital Caliper 150mm"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unique SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. TOOL-CAL-101"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specification details, grade, compatibility..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Supplier
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">No Supplier Assigned</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Unit Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                placeholder="65.00"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                placeholder="38.00"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Unit of Measure */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                placeholder="pcs, box, kg..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Initial Available Qty (Only for Create) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editingProduct ? 'Stock Level (Managed via movements)' : 'Initial Quantity'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                disabled={editingProduct !== null}
                value={formData.available_quantity}
                onChange={(e) => setFormData({ ...formData, available_quantity: e.target.value })}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Minimum Stock Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Min. Reorder Threshold <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formData.minimum_stock_level}
                onChange={(e) => setFormData({ ...formData, minimum_stock_level: e.target.value })}
                placeholder="10"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive / Archived</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingProduct(null);
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Product Details Modal */}
      {viewingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setViewingProduct(null)}
          title={viewingProduct.product.name}
          subtitle={`SKU: ${viewingProduct.product.sku} | Category: ${viewingProduct.product.category_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Available Stock</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {viewingProduct.product.available_quantity} {viewingProduct.product.unit_of_measure}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Min. Level</span>
                <p className="text-lg font-bold text-slate-700 mt-0.5">
                  {viewingProduct.product.minimum_stock_level} {viewingProduct.product.unit_of_measure}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Unit Price</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  ${viewingProduct.product.unit_price.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Valuation</span>
                <p className="text-lg font-extrabold text-indigo-700 mt-0.5">
                  ${(viewingProduct.product.available_quantity * viewingProduct.product.unit_price).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Description & Supplier */}
            <div className="space-y-2 text-xs">
              <p className="text-slate-600">
                <span className="font-semibold text-slate-800">Description: </span>
                {viewingProduct.product.description || 'No description provided.'}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-800">Supplier: </span>
                {viewingProduct.product.supplier_name || 'None assigned'}
              </p>
            </div>

            {/* Recent Transaction Log for this product */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Recent Movements History
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3">Reference #</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingProduct.recentMovements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                          No movements logged yet.
                        </td>
                      </tr>
                    ) : (
                      viewingProduct.recentMovements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 text-slate-600">{m.date}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                                m.movement_type === 'IN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {m.movement_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">
                            {m.movement_type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                            {m.reference_number}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{m.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={productToDelete !== null}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}" (${productToDelete?.sku})? Note: Products with movement history cannot be permanently deleted and must be set to inactive instead to preserve audit records.`}
        confirmLabel="Delete"
        isDanger={true}
      />

      {/* Quick Action Modals */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => {
          setIsStockInOpen(false);
          setActionProductId(undefined);
        }}
        preselectedProductId={actionProductId}
        onSuccess={fetchProducts}
      />

      <StockOutModal
        isOpen={isStockOutOpen}
        onClose={() => {
          setIsStockOutOpen(false);
          setActionProductId(undefined);
        }}
        preselectedProductId={actionProductId}
        onSuccess={fetchProducts}
      />
    </div>
  );
};
