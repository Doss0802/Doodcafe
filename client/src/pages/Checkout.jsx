import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MessageSquare, CheckCircle, Package, MapPin, Navigation, ExternalLink } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import axiosInstance from '../api/axiosInstance';
import InvoiceModal from '../components/InvoiceModal';
import toast from 'react-hot-toast';

export default function Checkout() {
  const {
    items, paymentMode, setPaymentMode,
    specialInstructions, setSpecialInstructions,
    clearCart,
  } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [locating, setLocating] = useState(false);

  // Address Form States
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 13.0827, lng: 80.2707 }); // Default: Chennai/Cafe default
  const [hasLiveCoords, setHasLiveCoords] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState('takeaway');

  // Post-order Invoice Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  useEffect(() => {
    document.title = 'Checkout & Live Location — Dood Cafe';
  }, []);

  const dummyItems = [
    { _id: 'dummy1', name: 'French Fries', price: 99, quantity: 1 },
    { _id: 'dummy2', name: 'Crispy chicken strips 4pcs', price: 199, quantity: 1 },
  ];

  const displayItems = items.length > 0 ? items : dummyItems;
  const totalAmount = displayItems.reduce((s, i) => s + i.price * i.quantity, 0);

  // ── Geolocation & Reverse Geocoding Auto-Fill ──────────────────────────────
  const handleFetchLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    const toastId = toast.loading('🛰️ Detecting your live GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        setHasLiveCoords(true);

        try {
          // Reverse geocoding via OpenStreetMap Nominatim API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          if (data && data.address) {
            const addr = data.address;
            const extractedStreet = [
              addr.road || addr.street || addr.neighbourhood || addr.suburb || addr.residential || '',
              addr.building || addr.house_number || '',
            ].filter(Boolean).join(' ') || data.display_name.split(',')[0] || '';

            const extractedCity = addr.city || addr.town || addr.village || addr.city_district || addr.county || '';
            const extractedState = addr.state || addr.state_district || '';
            const extractedZip = addr.postcode || '';

            setStreet(extractedStreet);
            setCity(extractedCity);
            setStateName(extractedState);
            setZipCode(extractedZip);

            toast.success('📍 Live address extracted and auto-filled!', { id: toastId });
          } else {
            setStreet(`Live Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            toast.success('📍 GPS location locked!', { id: toastId });
          }
        } catch (apiErr) {
          console.warn('[Geolocation] Reverse geocoding failed:', apiErr);
          setStreet(`Live Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          toast.success('📍 GPS Coordinates captured!', { id: toastId });
        } finally {
          setLocating(false);
        }
      },
      (geoErr) => {
        setLocating(false);
        let msg = 'Unable to retrieve location. Please check browser permissions.';
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser.';
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (geoErr.code === geoErr.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        toast.error(msg, { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    setPlacing(true);
    try {
      const isMongoId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

      const orderItems = (items.length > 0 ? items : dummyItems).map((i) => {
        const item = { name: i.name, price: i.price, quantity: i.quantity };
        if (isMongoId(i._id)) item.menuItemId = i._id;
        return item;
      });

      // Construct rich customer location string combining reverse geocoded address & maps link
      const addressParts = [street, city, stateName, zipCode].filter(Boolean);
      const textAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Dood Cafe Counter — Takeaway Pickup';
      const mapsUrl = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
      const customerLocationString = `${textAddress} | Maps: ${mapsUrl}`;

      const payload = {
        items: orderItems,
        orderType: selectedOrderType,
        paymentMode: ['cash', 'upi'].includes(paymentMode) ? paymentMode : 'cash',
        customer_location: customerLocationString,
        deliveryAddress: textAddress,
        coordinates: { lat: coordinates.lat, lng: coordinates.lng },
        specialInstructions,
      };

      const response = await axiosInstance.post('/orders', payload);
      const createdOrder = response?.data?.data || response?.data || {};

      // Prepare complete Invoice Payload for the popup modal
      const invoicePayload = {
        _id: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        customerName: user?.name || 'Valued Customer',
        customerPhone: user?.phone || 'Not Provided',
        customerEmail: user?.email || '',
        customerLocation: textAddress,
        orderTimestamp: createdOrder.createdAt ? new Date(createdOrder.createdAt) : new Date(),
        formattedDate: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        items: (createdOrder.items && createdOrder.items.length > 0 ? createdOrder.items : orderItems),
        totalAmount: createdOrder.totalAmount || totalAmount,
        paymentMode: payload.paymentMode,
        orderType: payload.orderType,
        specialInstructions,
      };

      setInvoiceData(invoicePayload);
      setShowInvoiceModal(true);
      clearCart();
      toast.success('🎉 Order placed and saved to database!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  // Google Maps embed URL
  const mapEmbedUrl = `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&hl=en&z=15&output=embed`;
  const externalMapsLink = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;

  return (
    <main className="checkout-page">
      <div className="container checkout-grid">
        {/* Form Section */}
        <section className="checkout-form-section">
          <h1 className="page-title">Checkout & Order Placement</h1>

          <form onSubmit={handlePlaceOrder} id="checkout-form">
            {/* ── Order Type Selection ── */}
            <div className="form-group">
              <label className="form-label"><Package size={15} /> Order Type</label>
              <div className="order-type-group">
                <button
                  type="button"
                  id="checkout-type-takeaway"
                  className={`order-type-btn ${selectedOrderType === 'takeaway' ? 'order-type-active' : ''}`}
                  onClick={() => setSelectedOrderType('takeaway')}
                >
                  📦 Takeaway
                </button>
                <button
                  type="button"
                  id="checkout-type-delivery"
                  className={`order-type-btn ${selectedOrderType === 'delivery' ? 'order-type-active' : ''}`}
                  onClick={() => setSelectedOrderType('delivery')}
                >
                  🛵 Live Delivery
                </button>
              </div>
            </div>

            {/* ── Address Entry Form Component with Live GPS Auto-Fill ── */}
            <div className="checkout-address-card">
              <div className="checkout-address-header">
                <div>
                  <h3 className="checkout-section-title">
                    <MapPin size={17} className="checkout-pin-icon" />
                    Customer Order Location & Delivery Address
                  </h3>
                  <p className="checkout-section-sub">
                    Fill in your physical address or click the button below to auto-fetch your exact live GPS coordinates.
                  </p>
                </div>
              </div>

              {/* Prominent Live GPS Location Button */}
              <div className="checkout-gps-action-wrap">
                <button
                  type="button"
                  id="live-location-gps-btn"
                  className="btn btn-gps-live"
                  onClick={handleFetchLiveLocation}
                  disabled={locating}
                >
                  <Navigation size={17} className={locating ? 'adm-spin' : 'gps-pulse-icon'} />
                  <span>
                    {locating ? 'Detecting GPS Coordinates...' : 'Order to Live Location'}
                  </span>
                </button>
              </div>

              {/* Address Form Inputs */}
              <div className="address-inputs-grid">
                <div className="form-field full-width">
                  <label htmlFor="address-street" className="input-label">Street / House / Area</label>
                  <input
                    type="text"
                    id="address-street"
                    className="form-input"
                    placeholder="e.g. 42 MG Road, Green Park"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="address-city" className="input-label">City</label>
                  <input
                    type="text"
                    id="address-city"
                    className="form-input"
                    placeholder="e.g. Chennai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="address-state" className="input-label">State</label>
                  <input
                    type="text"
                    id="address-state"
                    className="form-input"
                    placeholder="e.g. Tamil Nadu"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="address-zip" className="input-label">Zip Code / Pincode</label>
                  <input
                    type="text"
                    id="address-zip"
                    className="form-input"
                    placeholder="e.g. 600001"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                  />
                </div>
              </div>

              {/* ── Embedded Google Map Visual Module Container ── */}
              <div className="checkout-map-container">
                <div className="checkout-map-topbar">
                  <span className="checkout-map-lbl">
                    <MapPin size={14} /> Embedded Location Map Preview
                  </span>
                  <a
                    href={externalMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="checkout-map-ext-link"
                    title="Open in Google Maps"
                  >
                    <span>View in Google Maps</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div className="checkout-map-iframe-wrap">
                  <iframe
                    title="Live Location Map Preview"
                    src={mapEmbedUrl}
                    className="checkout-map-iframe"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>

            {/* ── Payment Mode ── */}
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
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

      {/* Invoice Popup Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoiceData={invoiceData}
      />
    </main>
  );
}
