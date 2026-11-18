import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const STATUS_LABEL = { pending: 'Awaiting payment', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    api('/bookings').then((d) => setBookings(d.bookings)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const pay = async (b) => {
    setError(''); setNotice('');
    try {
      const data = await api(`/bookings/${b._id}/pay`, { method: 'POST', body: { method: 'card' } });
      setNotice(data.booking.status === 'confirmed'
        ? `Payment successful — booking ${b.bookingRef} confirmed.`
        : `Payment failed for ${b.bookingRef}. Please try again.`);
      load();
    } catch (e) { setError(e.message); }
  };

  const cancel = async (b) => {
    setError(''); setNotice('');
    if (!window.confirm(`Cancel booking ${b.bookingRef}?`)) return;
    try {
      const data = await api(`/bookings/${b._id}/cancel`, { method: 'POST' });
      setNotice(data.refund
        ? `Booking cancelled. Refund of MYR ${data.refund.amount} (${data.refundPercent}%) issued.`
        : 'Booking cancelled. No refund applicable under the provider\'s cancellation policy.');
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <h1>My Bookings</h1>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      {bookings.map((b) => (
        <div className="card" key={b._id}>
          <div className="row spread">
            <div>
              <strong>{b.item?.name || 'Listing'}</strong>{' '}
              <span className="badge">{b.itemType}</span>{' '}
              <span className={`badge ${b.status}`}>{STATUS_LABEL[b.status] || b.status}</span>
            </div>
            <span className="price">MYR {b.totalCost}</span>
          </div>
          <p className="muted">
            Ref: {b.bookingRef} · {new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()} · {b.guests} guest(s)
            {b.item?.provider?.businessName && ` · ${b.item.provider.businessName}`}
          </p>
          <div className="row">
            {b.status === 'pending' && <button onClick={() => pay(b)}>Pay now</button>}
            {['pending', 'confirmed'].includes(b.status) && <button className="danger" onClick={() => cancel(b)}>Cancel</button>}
            {['confirmed', 'completed'].includes(b.status) && (
              <Link className="btn secondary" to={`/item/${b.itemType}/${b.item?._id || b.item}`}>Review / view</Link>
            )}
          </div>
        </div>
      ))}
      {bookings.length === 0 && <p className="muted">No bookings yet. <Link to="/">Explore services</Link>.</p>}
    </div>
  );
};

export default Bookings;
