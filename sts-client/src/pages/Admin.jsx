import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const Admin = () => {
  const [tab, setTab] = useState('moderation');
  const [type, setType] = useState('service');
  const [status, setStatus] = useState('pending');
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [report, setReport] = useState(null);
  const [dates, setDates] = useState({ dateFrom: '', dateTo: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadListings = () => {
    api(`/admin/listings?type=${type}&status=${status}`).then((d) => setListings(d.listings)).catch((e) => setError(e.message));
  };
  const loadReports = () => api('/admin/reports').then((d) => setReports(d.reports)).catch(() => {});

  useEffect(() => { loadListings(); loadReports(); }, [type, status]);

  const moderate = async (item, action) => {
    try {
      await api(`/admin/listings/${type}/${item._id}/${action}`, { method: 'POST' });
      setNotice(`Listing ${action === 'verify' ? 'verified' : 'rejected'}.`);
      loadListings();
    } catch (e) { setError(e.message); }
  };

  const generate = async () => {
    setError(''); setNotice('');
    try {
      const { report: r } = await api('/admin/reports', { method: 'POST', body: dates });
      setReport(r);
      setNotice('Report generated.');
      loadReports();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <h1>Admin Console</h1>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      <div className="tabs">
        <button className={tab === 'moderation' ? 'active' : ''} onClick={() => setTab('moderation')}>Listing Moderation</button>
        <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Tourism Reports</button>
      </div>

      {tab === 'moderation' && (
        <div className="card">
          <div className="row">
            <select style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="service">Services</option>
              <option value="package">Packages</option>
            </select>
            <select style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
              {['pending', 'verified', 'rejected', 'inactive', 'all'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {listings.map((l) => (
            <div key={l._id} className="row spread" style={{ borderTop: '1px solid #e2e8f0', padding: '0.7rem 0' }}>
              <div>
                <strong>{l.name}</strong>{' '}
                {l.type && <span className="badge">{l.type.replace('_', ' ')}</span>}{' '}
                <span className={`badge ${l.status}`}>{l.status}</span>
                <div className="muted">MYR {l.price} · by {l.provider?.businessName} ({l.provider?.contactEmail}) · {l.location || ''}</div>
                <div className="muted">{l.description}</div>
              </div>
              {l.status === 'pending' && (
                <div className="row">
                  <button onClick={() => moderate(l, 'verify')}>Verify</button>
                  <button className="danger" onClick={() => moderate(l, 'reject')}>Reject</button>
                </div>
              )}
            </div>
          ))}
          {listings.length === 0 && <p className="muted">No {status} {type}s.</p>}
        </div>
      )}

      {tab === 'reports' && (
        <>
          <div className="card">
            <h2>Generate report</h2>
            <div className="row">
              <div><label>From</label><input type="date" value={dates.dateFrom} onChange={(e) => setDates({ ...dates, dateFrom: e.target.value })} /></div>
              <div><label>To</label><input type="date" value={dates.dateTo} onChange={(e) => setDates({ ...dates, dateTo: e.target.value })} /></div>
              <button onClick={generate}>Generate</button>
            </div>
          </div>

          {report && (
            <div className="card">
              <h2>{report.title}</h2>
              <div className="grid">
                <div><h3>Bookings</h3><p className="price">{report.data.bookings.total}</p>
                  <p className="muted">{Object.entries(report.data.bookings.byStatus).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p></div>
                <div><h3>Revenue</h3><p className="price">MYR {report.data.revenue.totalMYR.toFixed(2)}</p>
                  <p className="muted">{report.data.revenue.successfulPayments} successful payments</p></div>
                <div><h3>Reviews</h3><p className="price">{report.data.reviews.count}</p>
                  <p className="muted">avg rating {report.data.reviews.averageRating ?? '—'}</p></div>
                <div><h3>Registrations</h3><p className="price">{report.data.registrations.tourists + report.data.registrations.serviceProviders}</p>
                  <p className="muted">{report.data.registrations.tourists} tourists · {report.data.registrations.serviceProviders} providers</p></div>
              </div>
              <h3>Services by type</h3>
              <p className="muted">{Object.entries(report.data.servicesByType).map(([k, v]) => `${k.replace('_', ' ')}: ${v}`).join(' · ') || '—'}</p>
              <h3>Top booked items</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ textAlign: 'left' }}><th>Name</th><th>Type</th><th>Bookings</th><th>Revenue (MYR)</th></tr></thead>
                <tbody>
                  {report.data.topItems.map((t, i) => (
                    <tr key={i}><td>{t.name}</td><td>{t.itemType}</td><td>{t.bookings}</td><td>{t.revenue.toFixed(2)}</td></tr>
                  ))}
                  {report.data.topItems.length === 0 && <tr><td colSpan={4} className="muted">No bookings in period.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {reports.length > 0 && (
            <div className="card">
              <h2>Saved reports</h2>
              {reports.map((r) => (
                <div key={r._id} className="row spread" style={{ borderTop: '1px solid #e2e8f0', padding: '0.5rem 0' }}>
                  <span>{r.title} <span className="muted">· {new Date(r.createdAt).toLocaleString()}</span></span>
                  <button className="secondary" onClick={() => setReport(r)}>View</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Admin;
