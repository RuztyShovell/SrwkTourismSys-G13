import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const ATTRACTION_STATUSES = ['open', 'temporarily_unavailable', 'inactive'];
const ATTRACTION_TYPES = ['nature', 'culture', 'historical', 'event_venue', 'other'];

const Staff = () => {
  const [tab, setTab] = useState('attractions');
  const [attractions, setAttractions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [attrForm, setAttrForm] = useState({ name: '', location: '', type: 'nature', description: '', openingHours: '', status: 'open' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    api('/attractions').then((d) => setAttractions(d.attractions)).catch((e) => setError(e.message));
    api('/auth/accounts').then((d) => setAccounts(d.accounts)).catch(() => {});
    api('/bookings').then((d) => setBookings(d.bookings)).catch(() => {});
  };
  useEffect(load, []);

  const createAttraction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/attractions', { method: 'POST', body: attrForm });
      setAttrForm({ name: '', location: '', type: 'nature', description: '', openingHours: '', status: 'open' });
      setNotice('Attraction created.');
      load();
    } catch (err) { setError(err.message); }
  };

  const setStatus = async (a, status) => {
    await api(`/attractions/${a._id}`, { method: 'PUT', body: { ...a, name: a.name, location: a.location, type: a.type, description: a.description, openingHours: a.openingHours, status } });
    load();
  };

  const toggleAccount = async (acc) => {
    const status = acc.status === 'active' ? 'suspended' : 'active';
    await api(`/auth/accounts/${acc._id}/status`, { method: 'PATCH', body: { status } });
    load();
  };

  const cancelBooking = async (b) => {
    if (!window.confirm(`Cancel booking ${b.bookingRef} on behalf of the tourist?`)) return;
    try {
      const data = await api(`/bookings/${b._id}/cancel`, { method: 'POST' });
      setNotice(data.refund ? `Cancelled. Refund MYR ${data.refund.amount} issued.` : 'Cancelled. No refund applicable.');
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Staff Console</h1>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      <div className="tabs">
        <button className={tab === 'attractions' ? 'active' : ''} onClick={() => setTab('attractions')}>Attractions</button>
        <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Accounts</button>
        <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>Bookings</button>
      </div>

      {tab === 'attractions' && (
        <>
          <div className="card">
            <h2>Add attraction</h2>
            <form className="stack" onSubmit={createAttraction}>
              <div className="row">
                <div style={{ flex: 2 }}><label>Name</label><input value={attrForm.name} onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })} required /></div>
                <div style={{ flex: 1 }}><label>Location</label><input value={attrForm.location} onChange={(e) => setAttrForm({ ...attrForm, location: e.target.value })} /></div>
              </div>
              <div className="row">
                <div style={{ flex: 1 }}><label>Type</label>
                  <select value={attrForm.type} onChange={(e) => setAttrForm({ ...attrForm, type: e.target.value })}>
                    {ATTRACTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}><label>Opening hours</label><input value={attrForm.openingHours} onChange={(e) => setAttrForm({ ...attrForm, openingHours: e.target.value })} placeholder="09:00-17:00" /></div>
              </div>
              <label>Description</label><input value={attrForm.description} onChange={(e) => setAttrForm({ ...attrForm, description: e.target.value })} />
              <button>Add attraction</button>
            </form>
          </div>
          <div className="card">
            {attractions.map((a) => (
              <div key={a._id} className="row spread" style={{ borderTop: '1px solid #e2e8f0', padding: '0.6rem 0' }}>
                <div>
                  <strong>{a.name}</strong> <span className="muted">{a.location} · {a.type}</span>
                  <div className="muted">{a.description} · Hours: {a.openingHours || '—'}</div>
                </div>
                <div className="row">
                  <span className={`badge ${a.status}`}>{a.status.replace('_', ' ')}</span>
                  <select value={a.status} onChange={(e) => setStatus(a, e.target.value)}>
                    {ATTRACTION_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'accounts' && (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left' }}><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a._id}>
                  <td>{a.email}</td>
                  <td>{a.role.replace('_', ' ')}</td>
                  <td><span className={`badge ${a.status === 'active' ? 'verified' : 'rejected'}`}>{a.status}</span></td>
                  <td><button className="secondary" onClick={() => toggleAccount(a)}>{a.status === 'active' ? 'Suspend' : 'Activate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="card">
          {bookings.map((b) => (
            <div key={b._id} className="row spread" style={{ borderTop: '1px solid #e2e8f0', padding: '0.6rem 0' }}>
              <div>
                <strong>{b.bookingRef}</strong> — {b.item?.name || 'listing'} <span className="muted">({b.itemType})</span><br />
                <span className="muted">{b.tourist?.name} · {b.guests} guest(s) · {new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()} · MYR {b.totalCost}</span>
              </div>
              <div className="row">
                <span className={`badge ${b.status}`}>{b.status}</span>
                {['pending', 'confirmed'].includes(b.status) && <button className="danger" onClick={() => cancelBooking(b)}>Cancel</button>}
              </div>
            </div>
          ))}
          {bookings.length === 0 && <p className="muted">No bookings.</p>}
        </div>
      )}
    </div>
  );
};

export default Staff;
