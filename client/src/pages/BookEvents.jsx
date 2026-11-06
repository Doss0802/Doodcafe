import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, User, Phone, Sparkles, CheckCircle } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function fmt12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function BookEvents() {
  const today = new Date().toISOString().slice(0, 10);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventName, setEventName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Booked slots
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Auto-compute day of week
  const dayOfWeek = eventDate ? DAYS[new Date(eventDate + 'T00:00:00').getDay()] : '';

  useEffect(() => {
    document.title = 'Book an Event — Dood Cafe';
    fetchBookedSlots();
  }, []);

  const fetchBookedSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await axiosInstance.get('/event-bookings/booked');
      setBookedSlots(res.data?.data || []);
    } catch {
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Slots for the currently selected date
  const slotsForDate = bookedSlots.filter((s) => s.eventDate === eventDate);

  // Check if user's chosen time overlaps any booked slot
  const hasConflict = () => {
    if (!startTime || !endTime || !eventDate) return false;
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    return slotsForDate.some((s) => toMin(startTime) < toMin(s.endTime) && toMin(endTime) > toMin(s.startTime));
  };

  const conflict = hasConflict();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) { toast.error('Customer name is required'); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error('Enter a valid 10-digit Indian mobile number'); return; }
    if (!eventDate) { toast.error('Please select an event date'); return; }
    if (!startTime) { toast.error('Please enter a start time'); return; }
    if (!endTime) { toast.error('Please enter an end time'); return; }
    if (startTime >= endTime) { toast.error('Start time must be before end time'); return; }
    if (!eventName.trim()) { toast.error('Event name/type is required'); return; }
    if (conflict) { toast.error('This time slot overlaps a booked slot. Please choose a different time.'); return; }

    setSubmitting(true);
    try {
      await axiosInstance.post('/event-bookings', {
        name: name.trim(),
        phone,
        eventDate,
        startTime,
        endTime,
        eventName: eventName.trim(),
        notes: notes.trim() || undefined,
      });
      setSubmitted(true);
      await fetchBookedSlots(); // refresh booked list
      toast.success('🎉 Event booked successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="ev-page">
        <div className="container ev-container">
          <div className="ev-success-card">
            <CheckCircle size={56} className="ev-success-icon" />
            <h2 className="ev-success-title">Booking Confirmed!</h2>
            <p className="ev-success-sub">
              Your event <strong>{eventName}</strong> on <strong>{formatDate(eventDate)}</strong> ({dayOfWeek}) from{' '}
              <strong>{fmt12(startTime)}</strong> to <strong>{fmt12(endTime)}</strong> has been booked.
            </p>
            <p className="ev-success-note">We'll reach you at <strong>{phone}</strong> for confirmation.</p>
            <div className="ev-success-actions">
              <button className="btn btn-primary" onClick={() => { setSubmitted(false); setName(''); setPhone(''); setEventDate(''); setStartTime(''); setEndTime(''); setEventName(''); setNotes(''); }}>
                Book Another Event
              </button>
              <a href="/" className="btn btn-outline">Back to Home</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ev-page">
      <div className="container ev-container">

        {/* Page Header */}
        <div className="ev-header">
          <span className="ev-header-emoji">🎉</span>
          <h1 className="ev-title">Book an Event</h1>
          <p className="ev-subtitle">
            Reserve the cafe for your special occasion — birthday parties, celebrations, corporate gatherings and more.
          </p>
        </div>

        <div className="ev-grid">
          {/* ── Form ── */}
          <section className="ev-form-section">
            <form onSubmit={handleSubmit} noValidate>

              {/* Customer Info */}
              <div className="ev-card">
                <h3 className="ev-card-title"><User size={16} /> Contact Details</h3>
                <div className="ev-fields-row">
                  <div className="form-field">
                    <label className="input-label">
                      Your Name <span className="ev-req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Priya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="input-label">
                      Mobile Number <span className="ev-req">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="ev-card">
                <h3 className="ev-card-title"><CalendarDays size={16} /> Event Details</h3>

                <div className="ev-fields-row">
                  <div className="form-field">
                    <label className="input-label">
                      Event Date <span className="ev-req">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={eventDate}
                      min={today}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="input-label">Day (auto-filled)</label>
                    <input
                      type="text"
                      className="form-input ev-readonly"
                      value={dayOfWeek}
                      readOnly
                      placeholder="Select a date"
                    />
                  </div>
                </div>

                <div className="form-field" style={{ marginTop: '0.75rem' }}>
                  <label className="input-label">
                    Event Name / Type <span className="ev-req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Birthday party, Corporate meet, Anniversary"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    maxLength={150}
                    required
                  />
                </div>
              </div>

              {/* Time Selection */}
              <div className="ev-card">
                <h3 className="ev-card-title"><Clock size={16} /> Time Slot</h3>

                {/* Show booked slots for selected date */}
                {eventDate && slotsForDate.length > 0 && (
                  <div className="ev-slots-warn">
                    <span className="ev-slots-warn-icon">⚠️</span>
                    <span>These slots are already booked for {formatDate(eventDate)}:</span>
                    <div className="ev-slots-mini-list">
                      {slotsForDate.map((s) => (
                        <span key={s.id} className="ev-slot-pill">
                          {fmt12(s.startTime)}–{fmt12(s.endTime)} · {s.eventName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ev-fields-row">
                  <div className="form-field">
                    <label className="input-label">
                      Start Time <span className="ev-req">*</span>
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="input-label">
                      End Time <span className="ev-req">*</span>
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {conflict && (
                  <div className="ev-conflict-alert">
                    ⚠️ Your chosen time overlaps with an existing booking. Please adjust start or end time.
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="ev-card">
                <h3 className="ev-card-title"><Sparkles size={16} /> Additional Notes (Optional)</h3>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. We'll need a projector, decorations setup, 20 guests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="ev-char-hint">{notes.length}/500</p>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full ev-submit-btn"
                disabled={submitting || conflict}
              >
                {submitting ? <span className="loading-spinner" /> : <><CalendarDays size={17} /> Confirm Event Booking</>}
              </button>
            </form>
          </section>

          {/* ── Booked Slots Panel ── */}
          <aside className="ev-slots-panel">
            <h3 className="ev-slots-panel-title">📅 Upcoming Bookings</h3>
            <p className="ev-slots-panel-sub">These dates are already reserved.</p>

            {loadingSlots ? (
              <div className="ev-slots-loading">Loading…</div>
            ) : bookedSlots.length === 0 ? (
              <div className="ev-slots-empty">No upcoming bookings yet. Be the first!</div>
            ) : (
              <div className="ev-slots-list">
                {bookedSlots.map((slot) => (
                  <div key={slot.id} className="ev-slot-card">
                    <div className="ev-slot-date">
                      <CalendarDays size={13} />
                      {formatDate(slot.eventDate)}&nbsp;·&nbsp;{DAYS[new Date(slot.eventDate + 'T00:00:00').getDay()]}
                    </div>
                    <div className="ev-slot-time">
                      <Clock size={13} />
                      {fmt12(slot.startTime)} – {fmt12(slot.endTime)}
                    </div>
                    <div className="ev-slot-name">{slot.eventName}</div>
                    <span className="ev-slot-badge">Booked</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

