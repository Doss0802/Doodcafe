import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MessageSquare, CheckCircle, Package } from 'lucide-react';
import useCartStore from '../store/cartStore';
import axiosInstance from '../api/axiosInstance';
import toast from 'react-hot-toast';

export default function Checkout() {
  const {
    items, orderType, paymentMode, setPaymentMode,
    specialInstructions, setSpecialInstructions,
    clearCart,
  } = useCartStore();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    document.title = 'Checkout — Dood Cafe';
  }, []);

  const dummyItems = [
    { _id: 'dummy1', name: 'French Fries', price: 99, quantity: 1 },
    { _id: 'dummy2', name: 'Crispy chicken strips 4pcs', price: 199, quantity: 1 },
  ];

  const displayItems = items.length > 0 ? items : dummyItems;
  const totalAmount = displayItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    setPlacing(true);
    try {
      // Only send menuItemId when it's a real MongoDB ObjectId (24-char hex)
      const isMongoId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

      const orderItems = (items.length > 0 ? items : dummyItems).map((i) => {
        const item = { name: i.name, price: i.price, quantity: i.quantity };
        if (isMongoId(i._id)) item.menuItemId = i._id;
        return item;
      });

      const payload = {
        items: orderItems,
        orderType: 'takeaway',
        paymentMode: ['cash', 'upi'].includes(paymentMode) ? paymentMode : 'cash',
        specialInstructions,
      };

      await axiosInstance.post('/orders', payload);
      clearCart();
      toast.success('🎉 Order placed and saved to database!');
      navigate('/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <main className="checkout-page">
      <div className="container checkout-grid">
        {/* Form */}
        <section className="checkout-form-section">
          <h1 className="page-title">Checkout</h1>

          <form onSubmit={handlePlaceOrder} id="checkout-form">
            {/* Order Type */}
            <div className="form-group">
              <label className="form-label"><Package size={15} /> Order Type</label>
              <div className="order-type-group">
                <button
                  type="button"
                  id="checkout-type-takeaway"
                  className="order-type-btn order-type-active"
                  disabled
                >
                  📦 Takeaway
                </button>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="form-group">
              <label className="form-label"><CreditCard size={15} /> Payment Mode</label>
              <div className="payment-group">
                {[
                  { value: 'cash', label: '💵 Cash' },
                  { value: 'upi', label: '📱 UPI' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    id={`payment-${value}`}
                    className={`payment-btn ${paymentMode === value ? 'payment-btn-active' : ''}`}
                    onClick={() => setPaymentMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </section>

        {/* Right Column: Order Summary & Special Instructions (Sticky on Desktop) */}
        <aside className="checkout-sidebar">
          <div className="order-summary">
            <h2 className="summary-title">Order Summary</h2>
            <div className="summary-items">
              {displayItems.map((item) => (
                <div key={item._id} className="summary-item">
                  <div className="summary-item-info">
                    <span className="summary-item-name">{item.name}</span>
                    <span className="summary-item-qty">× {item.quantity}</span>
                  </div>
                  <span className="summary-item-price">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="summary-divider" />
            <div className="summary-total">
              <span>Total</span>
              <span className="total-amount">₹{totalAmount}</span>
            </div>
            <p className="summary-note">✦ Thank you for being a part of our cafe family!</p>

            {/* Desktop Place Order Button inside Order Summary card */}
            <button
              type="submit"
              form="checkout-form"
              id="place-order-btn"
              className="btn btn-primary btn-full checkout-summary-btn"
              disabled={placing}
            >
              {placing ? (
                <span className="loading-spinner" />
              ) : (
                <><CheckCircle size={18} /> Place Order · ₹{totalAmount}</>
              )}
            </button>
          </div>

          {/* Special Instructions (Directly under Order Summary) */}
          <div className="special-instructions-card">
            <label htmlFor="special-instructions" className="form-label">
              <MessageSquare size={15} /> Special Instructions
            </label>
            <textarea
              id="special-instructions"
              form="checkout-form"
              className="form-textarea"
              placeholder="e.g. Extra spicy, no onions..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </div>
        </aside>
      </div>

      {/* Fixed Sticky Bottom Action Bar for Mobile */}
      <div className="checkout-mobile-bar">
        <div className="checkout-mobile-bar-inner">
          <div className="checkout-mobile-total">
            <span className="checkout-mobile-total-label">Total</span>
            <span className="checkout-mobile-total-val">₹{totalAmount}</span>
          </div>
          <button
            type="submit"
            form="checkout-form"
            id="place-order-mobile-btn"
            className="btn btn-primary checkout-mobile-btn"
            disabled={placing}
          >
            {placing ? (
              <span className="loading-spinner" />
            ) : (
              <><CheckCircle size={17} /> Place Order</>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
