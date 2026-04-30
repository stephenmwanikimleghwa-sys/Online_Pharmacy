import React, { useState, useEffect } from "react";
import api from "../services/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const OTCSales = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [discountMargin, setDiscountMargin] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/products/");
      setProducts(response.data?.results || response.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load inventory for OTC sales.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.pricing_tier?.retail_price || item.product.price) * item.quantity, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return discountMargin > 0 ? subtotal * (1 - discountMargin / 100) : subtotal;
  };

  const renderPrice = (val) => {
    if (val === undefined || val === null) return "N/A";
    return `KSh ${parseFloat(val).toLocaleString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight dark:text-white">
            OTC <span className="text-indigo-600 dark:text-indigo-400">Sales Dashboard</span>
          </h1>
          <p className="text-slate-500 font-medium">Quickly view explicit pricing and process over-the-counter metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Products Table (Left 2/3) */}
        <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 border border-white/60 dark:border-gray-800 shadow-premium">
          <div className="mb-6 relative">
            <input
              type="text"
              placeholder="Search explicitly by medicine name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-800 dark:text-gray-200"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Medicine Name</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry Date</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">B.P (Cost)</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">WSP (1.15x)</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">SP (1.33x)</th>
                  <th className="pb-4 pt-2 px-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {loading ? (
                  <tr><td colSpan="6" className="py-8 text-center text-gray-400">Loading products...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-gray-400">No matching medicines found.</td></tr>
                ) : (
                  filteredProducts.map((p) => {
                    const bp = p.pricing_tier?.buying_price;
                    const wsp = p.pricing_tier?.wholesale_price;
                    const sp = p.pricing_tier?.retail_price;
                    
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm whitespace-nowrap">{p.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{p.category}</p>
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-gray-600 dark:text-gray-400">
                          {p.expiry_date ? format(new Date(p.expiry_date), "MMM dd, yyyy") : "N/A"}
                        </td>
                        <td className="py-4 px-4 font-bold text-indigo-600 dark:text-indigo-400 text-sm">{renderPrice(bp)}</td>
                        <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400 text-sm">{renderPrice(wsp)}</td>
                        <td className="py-4 px-4 font-bold text-rose-600 dark:text-rose-400 text-sm">{renderPrice(sp)}</td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleAddToCart(p)}
                            disabled={p.stock_quantity <= 0}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                              p.stock_quantity > 0
                                ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-800/60"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
                            }`}
                          >
                            {p.stock_quantity > 0 ? "Add +" : "Out"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Current Cart / Calculator (Right 1/3) */}
        <div className="glass-card rounded-[2rem] p-6 border border-white/60 dark:border-gray-800 flex flex-col h-[500px]">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Current Quick Sale</h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6 scrollbar-custom">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No items in sale</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.product.name}</h4>
                    <p className="text-xs text-gray-500">Qty: {item.quantity} × {renderPrice(item.product.pricing_tier?.retail_price || item.product.price)}</p>
                  </div>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {renderPrice((item.product.pricing_tier?.retail_price || item.product.price) * item.quantity)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-auto">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{renderPrice(calculateSubtotal())}</span>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase">Discount Margin (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountMargin}
                onChange={(e) => setDiscountMargin(e.target.value)}
                className="w-20 pl-2 pr-1 py-1 text-right bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold"
              />
            </div>

            <div className="flex justify-between items-center mb-6 py-3 border-y border-dashed border-gray-200 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">Total SP</span>
              <span className="text-2xl font-display font-bold text-indigo-600 dark:text-indigo-400">
                {renderPrice(calculateTotal())}
              </span>
            </div>

            <button
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-xl text-white font-bold text-sm uppercase tracking-widest transition-all ${
                cart.length > 0
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
                  : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
              }`}
            >
              Finalize OTC Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTCSales;
