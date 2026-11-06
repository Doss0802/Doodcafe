import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, User, Phone, Trash2, RefreshCw, Sparkles } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmt12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayName = DAYS[new Date(dateStr + 'T00:00:00').getDay()];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y} · ${dayName}`;
}

export default function AdminEventBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null); // id being cancelled
  const [filter, setFilter] = useState('all'); // 'all' | 'booked' | 'cancelled'

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/event-bookings/admin');
      setBookings(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load event bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Event Bookings — Admin · Dood Cafe';
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this event booking? This will free the slot.')) return;
    setCancelling(id);
    try {
      await axiosInstance.patch(`/event-bookings/admin/${id}/cancel`);
      toast.success('Booking cancelled — slot is now free');
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  const displayed = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  const countBooked = bookings.filter((b) => b.status === 'booked').length;
  const countCancelled = bookings.filter((b) => b.status === 'cancelled').length;

  return (
    <main className="adm-page">
      <div className="container">

        {/* ── Admin Nav Tabs (same as AdminDashboard) ── */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-1.5 flex gap-2 mb-6 flex-wrap">
          <Link to="/admin" className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors">
            <span>Admin Panel</span>
          </Link>
          <Link to="/staff/orders" className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors">
            <span>Staff Orders &amp; Live Delivery</span>
          </Link>
          <Link to="/admin/menu-management" className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors">
            <span>Menu Management</span>
          </Link>
          <Link to="/admin/event-bookings" className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center bg-amber-500 text-white shadow-sm">
            <span>Event Bookings</span>
          </Link>
        </div>

        {/* ── Header ── */}
        <div className="adm-header">
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Event Bookings</h1>
            <p className="adm-sub" style={{ marginTop: '0.25rem', color: '#888', fontSize: '0.875rem' }}>
              {countBooked} upcoming · {countCancelled} cancelled
            </p>
          </div>
          <button
            className="btn btn-outline"
            onClick={fetchBookings}
            disabled={loading}
            style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={15} className={loading ? 'adm-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Filter Chips ── */}
        <div className="ev-admin-filter-row">
          {[
            { key: 'all', label: `All (${bookings.length})` },
            { key: 'booked', label: `Booked (${countBooked})` },
            { key: 'cancelled', label: `Cancelled (${countCancelled})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`ev-admin-chip ${filter === key ? 'ev-admin-chip--active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Table / Cards ── */}
        {loading ? (
          <div className="adm-loading-state">Loading event bookings…</div>
        ) : displayed.length === 0 ? (
          <div className="adm-empty-state">
            <Sparkles size={32} />
            <p>{filter === 'all' ? 'No event bookings yet.' : `No ${filter} bookings.`}</p>
          </div>
        ) : (
          <div className="ev-admin-table-wrap">
            {/* Desktop table */}
            <table className="ev-admin-table">
              <thead>
                <tr>
                  <th>Date &amp; Day</th>
                  <th>Time Slot</th>
                  <th>Event</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((b) => (
                  <tr key={b.id} className={b.status === 'cancelled' ? 'ev-admin-row--cancelled' : ''}>
                    <td>
                      <div className="ev-admin-cell-date">
                        <CalendarDays size={13} />
                        {formatDate(b.eventDate)}
                      </div>
                    </td>
                    <td>
                      <div className="ev-admin-cell-time">
                        <Clock size={13} />
                        {fmt12(b.startTime)} – {fmt12(b.endTime)}
                      </div>
                    </td>
                    <td className="ev-admin-cell-event">{b.eventName}</td>
                    <td>
                      <div className="ev-admin-cell-name">
                        <User size={13} />
                        {b.name}
                      </div>
                    </td>
                    <td>
                      <div className="ev-admin-cell-phone">
                        <Phone size={13} />
                        {b.phone}
                      </div>
                    </td>
                    <td>
                      <span className={`ev-status-badge ev-status-badge--${b.status}`}>
                        {b.status === 'booked' ? '✅ Booked' : '❌ Cancelled'}
                      </span>
                    </td>
                    <td>
                      {b.status === 'booked' ? (
                        <button
                          className="ev-cancel-btn"
                          onClick={() => handleCancel(b.id)}
                          disabled={cancelling === b.id}
                          title="Cancel this booking"
                        >
                          {cancelling === b.id ? (
                            <span className="loading-spinner" style={{ width: 14, height: 14 }} />
                          ) : (
                            <><Trash2 size={13} /> Cancel</>
                          )}
                        </button>
                      ) : (
                        <span className="text-stone-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards (hidden on desktop via CSS) */}
            <div className="ev-admin-mobile-cards">
              {displayed.map((b) => (
                <div key={b.id} className={`ev-admin-mcard ${b.status === 'cancelled' ? 'ev-admin-mcard--cancelled' : ''}`}>
                  <div className="ev-admin-mcard-top">
                    <span className="ev-admin-mcard-event">{b.eventName}</span>
                    <span className={`ev-status-badge ev-status-badge--${b.status}`}>
                      {b.status === 'booked' ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="ev-admin-mcard-row"><CalendarDays size={12} /> {formatDate(b.eventDate)}</div>
                  <div className="ev-admin-mcard-row"><Clock size={12} /> {fmt12(b.startTime)} – {fmt12(b.endTime)}</div>
                  <div className="ev-admin-mcard-row"><User size={12} /> {b.name}</div>
                  <div className="ev-admin-mcard-row"><Phone size={12} /> {b.phone}</div>
                  {b.status === 'booked' && (
                    <button
                      className="ev-cancel-btn"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancelling === b.id}
                      style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                    >
                      {cancelling === b.id ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : <><Trash2 size={13} /> Cancel Booking</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

