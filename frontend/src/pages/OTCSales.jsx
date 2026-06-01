import React, { useState, useEffect } from "react";
import api from "../services/api";
import { formatDate } from "../utils/displayHelpers";
import toast from "react-hot-toast";

const OTCSales = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [discountMargin, setDiscountMargin] = useState(0);
  const [finalizing, setFinalizing] = useState(false);

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

  const filteredProducts = products.filter((product) => {
    const normalizedTerm = searchTerm.toLowerCase();
    return (
      (product.name || '').toLowerCase().includes(normalizedTerm) ||
      (product.category || '').toLowerCase().includes(normalizedTerm)
    );
  });

  const handleAddToCart = (product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const calculateSubtotal = () =>
    cart.reduce((sum, item) => sum + (item.product.pricing_tier?.retail_price || item.product.price) * item.quantity, 0);

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return discountMargin > 0 ? subtotal * (1 - discountMargin / 100) : subtotal;
  };

  const renderPrice = (val) => {
    if (val === undefined || val === null) return "N/A";
    return `KSh ${parseFloat(val).toLocaleString()}`;
  };

  const handleFinalize = async () => {
    if (cart.length === 0) {
      toast.error("Add items to the cart before finalizing the OTC sale.");
      return;
    }

    setFinalizing(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        payment_mode: "CASH",
        pricing_tier: "RETAIL",
        discount: Number(discountMargin) || 0,
        patient_name: "Walk-in customer",
        notes: "OTC sale from admin dashboard",
      };
      await api.post("/inventory/dispense/otc/", payload);
      toast.success("OTC sale completed successfully.");
      setCart([]);
      setDiscountMargin(0);
    } catch (error) {
      const message = error.response?.data?.error || error.message || "Failed to finalize OTC sale.";
      toast.error(message);
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>
            OTC <span className="text-primary">Sales Dashboard</span>
          </h1>
          <p className="font-medium" style={{color:'var(--text-secondary)'}}>Quickly view explicit pricing and process over-the-counter metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Products Table */}
        <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 border shadow-premium" style={{borderColor:'var(--border-primary)'}}>
          <div className="mb-6 relative">
            <input
              type="text"
              placeholder="Search explicitly by medicine name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-12"
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{color:'var(--text-secondary)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{borderColor:'var(--border-primary)'}}>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Medicine Name</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Expiry Date</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-primary uppercase tracking-wider">B.P (Cost)</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-emerald-500 uppercase tracking-wider">WSP (1.15x)</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-rose-500 uppercase tracking-wider">SP (1.33x)</th>
                  <th className="pb-4 pt-2 px-4 text-right text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{borderColor:'var(--border-primary)'}}>
                {loading ? (
                  <tr><td colSpan="6" className="py-8 text-center" style={{color:'var(--text-secondary)'}}>Loading products...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center" style={{color:'var(--text-secondary)'}}>No matching medicines found.</td></tr>
                ) : (
                  filteredProducts.map((p) => {
                    const bp = p.pricing_tier?.buying_price;
                    const wsp = p.pricing_tier?.wholesale_price;
                    const sp = p.pricing_tier?.retail_price;

                    return (
                      <tr key={p.id} className="transition-colors" style={{}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-field)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                        <td className="py-4 px-4">
                          <p className="font-bold text-sm whitespace-nowrap" style={{color:'var(--text-primary)'}}>{p.name}</p>
                          <p className="text-[10px] uppercase" style={{color:'var(--text-secondary)'}}>{p.category}</p>
                        </td>
                        <td className="py-4 px-4 text-xs font-medium" style={{color:'var(--text-secondary)'}}>
                          {formatDate(p.expiry_date, "MMM dd, yyyy", "N/A")}
                        </td>
                        <td className="py-4 px-4 font-bold text-primary text-sm">{renderPrice(bp)}</td>
                        <td className="py-4 px-4 font-bold text-emerald-600 text-sm">{renderPrice(wsp)}</td>
                        <td className="py-4 px-4 font-bold text-rose-600 text-sm">{renderPrice(sp)}</td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleAddToCart(p)}
                            disabled={p.stock_quantity <= 0}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                              p.stock_quantity > 0
                                ? "text-primary"
                                : "cursor-not-allowed opacity-40"
                            }`}
                            style={p.stock_quantity > 0 ? {background:'var(--brand-mist)'} : {background:'var(--bg-field)', color:'var(--text-secondary)'}}
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

        {/* Cart Panel */}
        <div className="glass-card rounded-[2rem] p-6 border flex flex-col h-[500px]" style={{borderColor:'var(--border-primary)'}}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'var(--text-secondary)'}}>Current Quick Sale</h3>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6 scrollbar-custom">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>No items in sale</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="data-cell flex justify-between items-center p-3 rounded-xl">
                  <div>
                    <h4 className="font-bold text-sm" style={{color:'var(--text-primary)'}}>{item.product.name}</h4>
                    <p className="text-xs" style={{color:'var(--text-secondary)'}}>Qty: {item.quantity} × {renderPrice(item.product.pricing_tier?.retail_price || item.product.price)}</p>
                  </div>
                  <div className="font-bold text-primary text-sm">
                    {renderPrice((item.product.pricing_tier?.retail_price || item.product.price) * item.quantity)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t pt-4 mt-auto" style={{borderColor:'var(--border-primary)'}}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase" style={{color:'var(--text-secondary)'}}>Subtotal</span>
              <span className="font-bold" style={{color:'var(--text-primary)'}}>{renderPrice(calculateSubtotal())}</span>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold uppercase" style={{color:'var(--text-secondary)'}}>Discount Margin (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountMargin}
                onChange={(e) => setDiscountMargin(e.target.value)}
                className="w-20 pl-2 pr-1 py-1 text-right rounded-lg text-sm font-bold form-input"
              />
            </div>

            <div className="flex justify-between items-center mb-6 py-3 border-y border-dashed" style={{borderColor:'var(--border-primary)'}}>
              <span className="text-sm font-bold uppercase tracking-widest" style={{color:'var(--text-primary)'}}>Total SP</span>
              <span className="text-2xl font-display font-bold text-primary">
                {renderPrice(calculateTotal())}
              </span>
            </div>

            <button
              onClick={handleFinalize}
              disabled={cart.length === 0 || finalizing}
              className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                cart.length > 0 ? "btn-primary shadow-md hover:shadow-lg" : "opacity-40 cursor-not-allowed"
              } ${finalizing ? 'opacity-70 cursor-wait' : ''}`}
              style={cart.length === 0 ? {background:'var(--bg-field)', color:'var(--text-secondary)'} : {}}
            >
              {finalizing ? 'Finalizing...' : 'Finalize OTC Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTCSales;
