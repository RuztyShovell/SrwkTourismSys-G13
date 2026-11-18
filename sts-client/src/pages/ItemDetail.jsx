import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const TYPE_LABELS = { accommodation: 'Stay', transportation: 'Transport', food: 'Food', guided_tour: 'Tour' };
const today = () => new Date().toISOString().slice(0, 10);

const ItemDetail = () => {
  const { itemType, id } = useParams();
  const { account } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ startDate: today(), endDate: today(), guests: 1, method: 'card' });
  const [review, setReview] = useState({ bookingId: '', rating: 5, comment: '' });
  const [myBookings, setMyBookings] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/${itemType === 'service' ? 'services' : 'packages'}/${id}`)
      .then((d) => setItem(d[itemType] || d.service || d.package))
      .catch((e) => setError(e.message));
    api(`/reviews?itemType=${itemType}&itemId=${id}`).then((d) => setReviews(d.reviews)).catch(() => {});
    if (account?.role === 'tourist') {
      api('/bookings').then((d) =>
        setMyBookings(d.bookings.filter((b) =>
          b.itemType === itemType &&
          ['confirmed', 'completed'].includes(b.status) &&
          String(b.item?._id || b.item) === String(id)
        ))
      ).catch(() => {});
    }
  }, [itemType, id, account]);

  if (error) return <div className="error">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;

  const book = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (account?.role !== 'tourist') {
        navigate('/login');
        return;
      }
      const { booking } = await api('/bookings', {
        method: 'POST',
        body: { itemType, itemId: item._id, startDate: form.startDate, endDate: form.endDate, guests: form.guests },
      });
      setNotice(`Booking ${booking.bookingRef} created (pending). Complete payment to confirm.`);
      // Proceed straight to payment
      const paid = await api(`/bookings/${booking._id}/pay`, { method: 'POST', body: { method: form.method } });
      if (paid.booking.status === 'confirmed') setNotice(`Booking ${booking.bookingRef} confirmed! Total MYR ${paid.booking.totalCost}.`);
      else setNotice(`Payment failed for booking ${booking.bookingRef}. You can retry from My Bookings.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/reviews', { method: 'POST', body: { bookingId: review.bookingId, rating: review.rating, comment: review.comment } });
      setNotice('Review submitted.');
      setReview({ bookingId: '', rating: 5, comment: '' });
      api(`/reviews?itemType=${itemType}&itemId=${id}`).then((d) => setReviews(d.reviews)).catch(() => {});
    } catch (err) {
      setError(err.message);
    }
  };

  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div>
      <p><a href="/">← Back to explore</a></p>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="card">
        <span className={`badge ${item.status}`}>{item.status}</span>
        {item.type && <span className="badge">{TYPE_LABELS[item.type]}</span>}
        <h1>{item.name}</h1>
        <p className="muted">by {item.provider?.businessName} · {item.location || 'Sarawak'}</p>
        <p>{item.description}</p>
        {item.includedServices && (
          <p className="muted">Includes: {item.includedServices.map((s) => s.name).join(', ')}</p>
        )}
        <p className="price" style={{ fontSize: '1.3rem' }}>MYR {item.price} <span className="muted" style={{ fontWeight: 400 }}>/ person</span></p>
        <p className="muted">Cancellation: free cancel up to {item.cancellationPolicy?.freeCancelHours ?? 24}h before start → {item.cancellationPolicy?.refundPercent ?? 100}% refund. Max {item.maxGuests} guests.</p>
        {avg && <p><span className="stars">★</span> {avg} ({reviews.length} reviews)</p>}
      </div>

      {item.status === 'verified' && (
        <div className="card">
          <h2>Book now</h2>
          {account?.role !== 'tourist' && <p className="muted">You need a tourist account to book. <a href="/login">Login</a> or <a href="/register">register</a>.</p>}
          <form className="stack" onSubmit={book}>
            <label>Start date</label>
            <input type="date" value={form.startDate} min={today()} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            <label>End date</label>
            <input type="date" value={form.endDate} min={form.startDate || today()} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            <label>Guests (max {item.maxGuests})</label>
            <input type="number" min={1} max={item.maxGuests} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} required />
            <label>Payment method</label>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="card">Card</option>
              <option value="fpx">FPX (online banking)</option>
              <option value="duitnow">DuitNow QR</option>
            </select>
            <button disabled={busy}>{busy ? 'Processing…' : `Pay MYR ${(item.price * form.guests).toFixed(2)}`}</button>
          </form>
        </div>
      )}

      {account?.role === 'tourist' && (
        <div className="card">
          <h2>Write a review</h2>
          {myBookings.length === 0 ? (
            <p className="muted">You can review this after a confirmed booking for it.</p>
          ) : (
          <form className="stack" onSubmit={submitReview}>
            <label>Booking</label>
            <select value={review.bookingId} onChange={(e) => setReview({ ...review, bookingId: e.target.value })} required>
              <option value="">Select a booking…</option>
              {myBookings.map((b) => (
                <option key={b._id} value={b._id}>{b.bookingRef} — {new Date(b.startDate).toLocaleDateString()}</option>
              ))}
            </select>
            <label>Rating</label>
            <select value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
            </select>
            <label>Comment</label>
            <textarea rows={3} value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
            <button>Submit review</button>
          </form>
          )}
        </div>
      )}

      <div className="card">
        <h2>Reviews</h2>
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r._id} style={{ borderTop: '1px solid #e2e8f0', padding: '0.6rem 0' }}>
            <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>{' '}
            <strong>{r.tourist?.name}</strong> <span className="muted">{new Date(r.createdAt).toLocaleDateString()}</span>
            <p>{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemDetail;
