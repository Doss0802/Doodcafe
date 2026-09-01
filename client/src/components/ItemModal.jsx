import { X, Plus, Minus, Leaf, Star, Clock, ShoppingBag, Check } from 'lucide-react';
import { useState } from 'react';
import useCartStore from '../store/cartStore';
import { getItemImage } from '../utils/imageMapper';
import { flyToCart } from '../utils/flyToCart';
import toast from 'react-hot-toast';

export default function ItemModal({ item, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();

  if (!item) return null;

  const handleAddToCart = (e) => {
    for (let i = 0; i < quantity; i++) {
      addItem(item);
    }

    const modalImg = document.querySelector('.modal-img');
    const imageSrc = item.imageUrl || item.image || getItemImage(item);
    flyToCart(modalImg || e?.currentTarget, imageSrc, item.category?.icon || '🍽️');

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header close button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Modal Image / Hero Graphic */}
        <div className="modal-img-wrapper">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="modal-img" />
          ) : (
            <div className="modal-img-placeholder">
              <span className="modal-placeholder-icon">{item.category?.icon || '🍽️'}</span>
            </div>
          )}
          <div className="modal-badges">
            {item.isVeg ? (
              <span className="badge badge-veg"><Leaf size={11} /> Veg</span>
            ) : (
              <span className="badge badge-nonveg">● Non-Veg</span>
            )}
            {item.isBestseller && (
              <span className="badge badge-bestseller"><Star size={11} /> Bestseller</span>
            )}
          </div>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          <div className="modal-category">{item.category?.icon} {item.category?.name}</div>
          <h2 className="modal-title">{item.name}</h2>
          <p className="modal-desc">{item.description || 'Prepared fresh using hand-picked ingredients at Dood Cafe.'}</p>

          {/* Meta Information Grid */}
          <div className="modal-meta-grid">
            <div className="meta-box">
              <Clock size={16} className="meta-icon" />
              <div>
                <span className="meta-label">Prep Time</span>
                <span className="meta-val">{item.preparationTime || 10} mins</span>
              </div>
            </div>
            <div className="meta-box">
              <span className="meta-icon-text">🔥</span>
              <div>
                <span className="meta-label">Category</span>
                <span className="meta-val">{item.category?.name}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div className="modal-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
          )}

          {/* Footer Controls */}
          <div className="modal-footer">
            <div className="modal-qty-selector">
              <button
                className="qty-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <span className="modal-qty-val">{quantity}</span>
              <button
                className="qty-btn"
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>

            <button
              id={`modal-add-btn-${item._id}`}
              className="btn btn-primary btn-modal-add"
              onClick={handleAddToCart}
            >
              <ShoppingBag size={18} />
              Add to Cart · ₹{item.price * quantity}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
