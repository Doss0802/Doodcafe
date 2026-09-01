import { Plus, Minus, Trash2, Leaf, Star, Clock } from 'lucide-react';
import useCartStore from '../store/cartStore';
import { getItemImage } from '../utils/imageMapper';
import { flyToCart } from '../utils/flyToCart';
import toast from 'react-hot-toast';

export default function MenuCard({ item, onItemClick }) {
  const { items, addItem, updateQuantity, removeItem } = useCartStore();

  const cartItem = items.find((i) => i._id === item._id);
  // Prefer DB-served image (item.image or item.imageUrl), fall back to local mapper
  const imageSrc = item.image || item.imageUrl || getItemImage(item);

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(item);

    // Trigger visual flying cart animation
    const cardEl = e.currentTarget.closest('.menu-card');
    const imgEl = cardEl ? cardEl.querySelector('.menu-card-img') : e.currentTarget;
    flyToCart(imgEl || e.currentTarget, imageSrc, item.category?.icon || '🍽️');
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    updateQuantity(item._id, (cartItem?.quantity || 1) + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (cartItem?.quantity > 1) {
      updateQuantity(item._id, cartItem.quantity - 1);
    } else {
      removeItem(item._id);
      toast.success(`${item.name} removed from cart`);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    removeItem(item._id);
    toast.success(`${item.name} removed from cart`);
  };

  return (
    <article
      className="menu-card"
      id={`menu-item-${item._id}`}
      onClick={() => onItemClick && onItemClick(item)}
      style={{ cursor: onItemClick ? 'pointer' : 'default' }}
    >
      {/* Badges */}
      <div className="menu-card-badges">
        {item.isVeg ? (
          <span className="badge badge-veg" title="Vegetarian">
            <Leaf size={10} /> Veg
          </span>
        ) : (
          <span className="badge badge-nonveg" title="Non-Vegetarian">
            ● Non-Veg
          </span>
        )}
        {item.isBestseller && (
          <span className="badge badge-bestseller">
            <Star size={10} /> Bestseller
          </span>
        )}
      </div>

      {/* Image with fallback */}
      <div className="menu-card-img-wrapper">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name}
            className="menu-card-img"
            loading="lazy"
          />
        ) : (
          <div className="menu-card-img-placeholder">
            <span className="placeholder-icon">{item.category?.icon || '🍽️'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="menu-card-body">
        <div className="menu-card-top">
          <h3 className="menu-card-name">{item.name}</h3>
          <span className="menu-card-category">{item.category?.name}</span>
        </div>

        <p className="menu-card-desc">{item.description}</p>

        <div className="menu-card-tags">
          {item.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
        </div>

        <div className="menu-card-footer">
          <div className="menu-card-meta">
            <span className="menu-price">₹{item.price}</span>
            <span className="menu-time">
              <Clock size={12} />
              {item.preparationTime || 10} min
            </span>
          </div>

          {/* Cart controls: Add button or Quantity increase/decrease controls */}
          {cartItem ? (
            <div className="menu-card-cart-controls" onClick={(e) => e.stopPropagation()}>
              <button
                className="card-qty-btn"
                onClick={handleDecrement}
                aria-label="Decrease quantity"
                title="Decrease"
              >
                <Minus size={14} />
              </button>
              <span className="card-qty-val">{cartItem.quantity}</span>
              <button
                className="card-qty-btn"
                onClick={handleIncrement}
                aria-label="Increase quantity"
                title="Increase"
              >
                <Plus size={14} />
              </button>
              <button
                className="card-remove-btn"
                onClick={handleRemove}
                aria-label="Remove item"
                title="Remove from cart"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <button
              id={`add-to-cart-${item._id}`}
              className="btn-add-cart"
              onClick={handleAdd}
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus size={16} />
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
