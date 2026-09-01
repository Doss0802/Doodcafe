import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, orderType, setOrderType } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleCheckout = () => {
    closeCart();
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="cart-overlay"
          onClick={closeCart}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`cart-drawer ${isOpen ? 'cart-drawer-open' : ''}`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-title">
            <ShoppingBag size={20} />
            <h2>Your Order</h2>
            {totalItems > 0 && <span className="cart-count-pill">{totalItems}</span>}
          </div>
          <button className="cart-close-btn" onClick={closeCart} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {/* Order Type Badge */}
        <div className="cart-order-type">
          <button
            type="button"
            id="order-type-takeaway"
            className="order-type-btn order-type-active"
            style={{ width: '100%', cursor: 'default' }}
            disabled
          >
            📦 Takeaway Order
          </button>
        </div>

        {/* Cart Items */}
        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <span className="cart-empty-icon">🛒</span>
              <p>Your cart is empty</p>
              <button className="btn btn-primary-sm" onClick={closeCart}>Browse Menu</button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item._id} className="cart-item">
                <div className="cart-item-icon">{item.category?.icon || '🍽️'}</div>
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.name}</p>
                  <p className="cart-item-price">₹{item.price} each</p>
                </div>
                <div className="cart-item-controls">
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="cart-item-right">
                  <span className="cart-item-total">₹{item.price * item.quantity}</span>
                  <button
                    className="remove-btn"
                    onClick={() => removeItem(item._id)}
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-footer">
            <p className="cart-note">Taxes & charges may apply</p>
            <div className="cart-footer-row">
              <div className="cart-subtotal">
                <span>Subtotal:</span>
                <span className="subtotal-amount"> ₹{totalAmount}</span>
              </div>
              <button
                id="checkout-btn"
                className="btn btn-checkout"
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
