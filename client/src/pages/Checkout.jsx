import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MessageSquare, CheckCircle, Package, MapPin, Navigation, ExternalLink, User, Phone, Utensils } from 'lucide-react';
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

  // Address Form States (Restricted to Coimbatore City Limits)
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Coimbatore');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [zipCode, setZipCode] = useState('641001');
  const [coordinates, setCoordinates] = useState({ lat: 11.0168, lng: 76.9558 }); // Default: Coimbatore central coordinates
  const [hasLiveCoords, setHasLiveCoords] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState('takeaway'); // 'takeaway' | 'dine-in' | 'delivery'
  const [isOutOfDeliveryBoundary, setIsOutOfDeliveryBoundary] = useState(false);

  // Customer Contact Fields (Required for Staff Verification)
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [paymentOption, setPaymentOption] = useState('cod'); // 'cod' | 'paid' | 'pending'

  useEffect(() => {
    if (user?.name && !customerName) setCustomerName(user.name);
    if (user?.phone && !customerPhone) setCustomerPhone(user.phone);
  }, [user]);

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
            const extractedState = addr.state || addr.state_district || 'Tamil Nadu';
            const extractedZip = addr.postcode || '641001';

            // Geofence verification: Check if geocoded location is within Coimbatore city boundary
            const fullAddressText = `${data.display_name || ''} ${extractedCity} ${addr.county || ''} ${addr.state_district || ''}`.toLowerCase();
            const isInCoimbatore = fullAddressText.includes('coimbatore');

            setStreet(extractedStreet);
            setStateName(extractedState);
            setZipCode(extractedZip);

            if (!isInCoimbatore) {
              setCity(extractedCity || 'Outside Coimbatore');
              setIsOutOfDeliveryBoundary(true);
              toast.error('Delivery currently available in Coimbatore city limits only', { id: toastId });
            } else {
              setCity(extractedCity ? (extractedCity.toLowerCase().includes('coimbatore') ? extractedCity : `${extractedCity}, Coimbatore`) : 'Coimbatore');
              setIsOutOfDeliveryBoundary(false);
              toast.success('📍 Live address verified within Coimbatore!', { id: toastId });
            }
          } else {
            setStreet(`Live Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            // Check approximate coordinate boundary for Coimbatore
            const isCoordInCbe = latitude >= 10.85 && latitude <= 11.20 && longitude >= 76.80 && longitude <= 77.15;
            if (!isCoordInCbe) {
              setIsOutOfDeliveryBoundary(true);
              toast.error('Delivery currently available in Coimbatore city limits only', { id: toastId });
            } else {
              setIsOutOfDeliveryBoundary(false);
              toast.success('📍 GPS location locked in Coimbatore!', { id: toastId });
            }
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
    if (placing) return; // Prevent double-submit

    // 1. Customer Name Validation
    if (!customerName || !customerName.trim()) {
      toast.error('Please enter customer full name');
      return;
    }

    // 2. 10-Digit Indian Mobile Number Validation
    const cleanPhone = (customerPhone || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      return;
    }

    // 3. Geofence Check: Only enforced for delivery orders
    if (selectedOrderType === 'delivery') {
      if (isOutOfDeliveryBoundary || !city || !city.toLowerCase().includes('coimbatore')) {
        toast.error('Delivery currently available in Coimbatore city limits only');
        return;
      }
    }

    setPlacing(true);
    try {
      const isMongoId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

      const orderItems = (items.length > 0 ? items : dummyItems).map((i) => {
        const item = { name: i.name, price: i.price, quantity: i.quantity };
        if (isMongoId(i._id)) item.menuItemId = i._id;
        return item;
      });

      // Construct rich customer location string
      const addressParts = [street, city, stateName, zipCode].filter(Boolean);
      const textAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Dood Cafe Counter — Coimbatore, Tamil Nadu';
      const mapsUrl = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
      const customerLocationString = `${textAddress} | Maps: ${mapsUrl}`;

      const resolvedMode = paymentOption === 'paid' ? 'upi' : 'cash';

      const payload = {
        items: orderItems,
        orderType: selectedOrderType,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        paymentMode: resolvedMode,
        paymentStatus: paymentOption,
        customer_location: selectedOrderType === 'dine-in' ? 'Dood Cafe Counter — Dine-in' : customerLocationString,
        deliveryAddress: selectedOrderType === 'dine-in' ? 'Dood Cafe — Dine-in' : textAddress,
        coordinates: { lat: coordinates.lat, lng: coordinates.lng },
        specialInstructions,
      };

      const response = await axiosInstance.post('/orders', payload);
      const createdOrder = response?.data?.data || response?.data || {};

      // Prepare complete Invoice Payload for the popup modal
      const invoicePayload = {
        _id: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        billNumber: createdOrder.billNumber,
        customerName: createdOrder.customerName || customerName.trim(),
        customerPhone: createdOrder.customerPhone || cleanPhone,
        customerEmail: user?.email || '',
        customerLocation: selectedOrderType === 'dine-in' ? 'Dood Cafe — Dine-in' : textAddress,
        orderTimestamp: createdOrder.createdAt ? new Date(createdOrder.createdAt) : new Date(),
        formattedDate: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        items: (createdOrder.items && createdOrder.items.length > 0 ? createdOrder.items : orderItems),
        totalAmount: createdOrder.totalAmount || totalAmount,
        paymentMode: payload.paymentMode,
        paymentStatus: payload.paymentStatus,
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

  // Google Maps embed URL tightly configured for Coimbatore city limits (zoom: 13)
  const mapEmbedUrl = `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&hl=en&z=13&output=embed`;
  const externalMapsLink = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;

  return (
    <main className="checkout-page">
      <div className="container checkout-grid">
        {/* Form Section */}
        <section className="checkout-form-section">
          <h1 className="page-title">Checkout & Order Placement</h1>

          <form onSubmit={handlePlaceOrder} id="checkout-form">
            {/* ── Customer Contact Information (Required for counter staff) ── */}
            <div className="checkout-address-card" style={{ marginBottom: '1.25rem' }}>
              <div className="checkout-address-header" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h3 className="checkout-section-title">
                    <User size={17} className="checkout-pin-icon" />
                    Customer Contact Details
                  </h3>
                  <p className="checkout-section-sub">
                    Provide customer name & mobile number for order verification and parcel handover.
                  </p>
                </div>
              </div>
              <div className="address-inputs-grid">
                <div className="form-field">
                  <label htmlFor="customer-name" className="input-label">
                    Customer Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="customer-name"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="customer-phone" className="input-label">
                    10-Digit Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    id="customer-phone"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

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
                  id="checkout-type-dinein"
                  className={`order-type-btn ${selectedOrderType === 'dine-in' ? 'order-type-active' : ''}`}
                  onClick={() => setSelectedOrderType('dine-in')}
                >
                  🍽️ Dine-in
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

              {/* Service Boundary User-Alert Banner */}
              {(isOutOfDeliveryBoundary || !city || !city.toLowerCase().includes('coimbatore')) && (
                <div className="coimbatore-alert-banner" role="alert" id="coimbatore-boundary-alert">
                  <div className="coimbatore-alert-icon">⚠️</div>
                  <div className="coimbatore-alert-body">
                    <span className="coimbatore-alert-title">Service Boundary Alert</span>
                    <span className="coimbatore-alert-msg">Delivery currently available in Coimbatore city limits only</span>
                  </div>
                </div>
              )}

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
                  <label htmlFor="address-street" className="input-label">Street / House / Area (max 120)</label>
                  <input
                    type="text"
                    id="address-street"
                    className="form-input"
                    placeholder="e.g. 42 Avinashi Road, Peelamedu"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    maxLength={120}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="address-city" className="input-label">City / Delivery Zone (Coimbatore Only)</label>
                  <select
                    id="address-city"
                    className="form-input"
                    value={city}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCity(val);
                      if (val && !val.toLowerCase().includes('coimbatore')) {
                        setIsOutOfDeliveryBoundary(true);
                      } else {
                        setIsOutOfDeliveryBoundary(false);
                      }
                    }}
                  >
                    <option value="Coimbatore">Coimbatore (Central / City Limits)</option>
                    <option value="RS Puram, Coimbatore">RS Puram, Coimbatore</option>
                    <option value="Gandhipuram, Coimbatore">Gandhipuram, Coimbatore</option>
                    <option value="Peelamedu, Coimbatore">Peelamedu, Coimbatore</option>
                    <option value="Saibaba Colony, Coimbatore">Saibaba Colony, Coimbatore</option>
                    <option value="Saravanampatti, Coimbatore">Saravanampatti, Coimbatore</option>
                    <option value="Ramanathapuram, Coimbatore">Ramanathapuram, Coimbatore</option>
                    <option value="Singanallur, Coimbatore">Singanallur, Coimbatore</option>
                    <option value="Race Course, Coimbatore">Race Course, Coimbatore</option>
                    <option value="Town Hall, Coimbatore">Town Hall, Coimbatore</option>
                    <option value="Outside Coimbatore (Unsupported)">Outside Coimbatore (Unsupported)</option>
                    {city && ![
                      'Coimbatore', 'RS Puram, Coimbatore', 'Gandhipuram, Coimbatore',
                      'Peelamedu, Coimbatore', 'Saibaba Colony, Coimbatore', 'Saravanampatti, Coimbatore',
                      'Ramanathapuram, Coimbatore', 'Singanallur, Coimbatore', 'Race Course, Coimbatore',
                      'Town Hall, Coimbatore', 'Outside Coimbatore (Unsupported)'
                    ].includes(city) && (
                      <option value={city}>{city}</option>
                    )}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="address-state" className="input-label">State (max 50)</label>
                  <input
                    type="text"
                    id="address-state"
                    className="form-input"
                    placeholder="e.g. Tamil Nadu"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="address-zip" className="input-label">Pincode / Zip Code (5-6 digits)</label>
                  <input
                    type="text"
                    id="address-zip"
                    className="form-input"
                    placeholder="e.g. 641001"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={10}
                    pattern="[0-9]{5,6}"
                    title="Please enter a valid 5 or 6 digit pincode"
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

            {/* ── Payment Mode & Status Selection ── */}
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label"><CreditCard size={15} /> Payment Mode & Option</label>
              <div className="payment-group">
                {[
                  { value: 'cod', label: '💵 Cash on Delivery / Counter (COD)' },
                  { value: 'paid', label: '📱 UPI / Online (Paid)' },
                  { value: 'pending', label: '⏳ Pay at Counter (Pending)' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    id={`payment-${value}`}
                    className={`payment-btn ${paymentOption === value ? 'payment-btn-active' : ''}`}
                    onClick={() => {
                      setPaymentOption(value);
                      if (value === 'paid') setPaymentMode('upi');
                      else setPaymentMode('cash');
                    }}
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
              disabled={placing || (selectedOrderType === 'delivery' && (isOutOfDeliveryBoundary || !city || !city.toLowerCase().includes('coimbatore')))}
              title={selectedOrderType === 'delivery' && (isOutOfDeliveryBoundary || !city || !city.toLowerCase().includes('coimbatore')) ? 'Delivery currently available in Coimbatore city limits only' : ''}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="special-instructions" className="form-label" style={{ margin: 0 }}>
                <MessageSquare size={15} /> Special Instructions
              </label>
              <span style={{ fontSize: '0.75rem', color: specialInstructions.length >= 190 ? '#ef4444' : '#888' }}>
                {specialInstructions.length}/200
              </span>
            </div>
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
            disabled={placing || isOutOfDeliveryBoundary || !city || !city.toLowerCase().includes('coimbatore')}
            title={isOutOfDeliveryBoundary || !city || !city.toLowerCase().includes('coimbatore') ? 'Delivery currently available in Coimbatore city limits only' : ''}
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
