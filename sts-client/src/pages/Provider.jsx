import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const TYPES = ['accommodation', 'transportation', 'food', 'guided_tour'];

const Provider = () => {
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [svcForm, setSvcForm] = useState({ name: '', description: '', type: 'guided_tour', price: '', location: '', maxGuests: 10, freeCancelHours: 24, refundPercent: 100 });
  const [pkgForm, setPkgForm] = useState({ name: '', description: '', price: '', maxGuests: 10, freeCancelHours: 24, refundPercent: 100, includedServices: [] });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('services');

  const load = () => {
    api('/mine/services').then((d) => setServices(d.services)).catch((e) => setError(e.message));
    api('/mine/packages').then((d) => setPackages(d.packages)).catch(() => {});
  };
  useEffect(load, []);

  const createService = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      await api('/services', {
        method: 'POST',
        body: { ...svcForm, price: Number(svcForm.price), maxGuests: Number(svcForm.maxGuests), cancellationPolicy: { freeCancelHours: Number(svcForm.freeCancelHours), refundPercent: Number(svcForm.refundPercent) } },
      });
      setNotice('Service submitted for admin verification.');
      setSvcForm({ name: '', description: '', type: 'guided_tour', price: '', location: '', maxGuests: 10, freeCancelHours: 24, refundPercent: 100 });
      load();
    } catch (err) { setError(err.message); }
  };

  const createPackage = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      await api('/packages', {
        method: 'POST',
        body: { ...pkgForm, price: Number(pkgForm.price), maxGuests: Number(pkgForm.maxGuests), includedServices: pkgForm.includedServices, cancellationPolicy: { freeCancelHours: Number(pkgForm.freeCancelHours), refundPercent: Number(pkgForm.refundPercent) } },
      });
      setNotice('Package submitted for admin verification.');
      setPkgForm({ name: '', description: '', price: '', maxGuests: 10, freeCancelHours: 24, refundPercent: 100, includedServices: [] });
      load();
    } catch (err) { setError(err.message); }
  };

  const ListingRow = ({ item, kind }) => (
    <tr>
      <td>{item.name}</td>
      <td>{kind === 'service' ? item.type : 'package'}</td>
      <td>MYR {item.price}</td>
      <td><span className={`badge ${item.status}`}>{item.status}</span></td>
      <td className="muted">{item.cancellationPolicy ? `free cancel ${item.cancellationPolicy.freeCancelHours}h → ${item.cancellationPolicy.refundPercent}%` : '—'}</td>
    </tr>
  );

  return (
    <div>
      <h1>Provider Console</h1>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="tabs">
        <button className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}>Services</button>
        <button className={tab === 'packages' ? 'active' : ''} onClick={() => setTab('packages')}>Packages</button>
        <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>+ New listing</button>
      </div>

      {tab === 'services' && (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left' }}><th>Name</th><th>Type</th><th>Price</th><th>Status</th><th>Policy</th></tr></thead>
            <tbody>
              {services.map((s) => <ListingRow key={s._id} item={s} kind="service" />)}
              {services.length === 0 && <tr><td colSpan={5} className="muted">No services yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'packages' && (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left' }}><th>Name</th><th>Type</th><th>Price</th><th>Status</th><th>Policy</th></tr></thead>
            <tbody>
              {packages.map((p) => <ListingRow key={p._id} item={p} kind="package" />)}
              {packages.length === 0 && <tr><td colSpan={5} className="muted">No packages yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'new' && (
        <div className="grid">
          <div className="card">
            <h2>New service</h2>
            <form className="stack" onSubmit={createService}>
              <label>Name</label><input value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} required />
              <label>Description</label><input value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} />
              <label>Type</label>
              <select value={svcForm.type} onChange={(e) => setSvcForm({ ...svcForm, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
              <label>Price (MYR)</label><input type="number" min="0" step="0.01" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} required />
              <label>Location</label><input value={svcForm.location} onChange={(e) => setSvcForm({ ...svcForm, location: e.target.value })} />
              <label>Max guests</label><input type="number" min="1" value={svcForm.maxGuests} onChange={(e) => setSvcForm({ ...svcForm, maxGuests: e.target.value })} />
              <div className="row">
                <div style={{ flex: 1 }}><label>Free cancel (hours before)</label><input type="number" min="0" value={svcForm.freeCancelHours} onChange={(e) => setSvcForm({ ...svcForm, freeCancelHours: e.target.value })} /></div>
                <div style={{ flex: 1 }}><label>Refund %</label><input type="number" min="0" max="100" value={svcForm.refundPercent} onChange={(e) => setSvcForm({ ...svcForm, refundPercent: e.target.value })} /></div>
              </div>
              <button>Submit for verification</button>
            </form>
          </div>
          <div className="card">
            <h2>New package</h2>
            <form className="stack" onSubmit={createPackage}>
              <label>Name</label><input value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} required />
              <label>Description</label><input value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })} />
              <label>Price (MYR)</label><input type="number" min="0" step="0.01" value={pkgForm.price} onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })} required />
              <label>Max guests</label><input type="number" min="1" value={pkgForm.maxGuests} onChange={(e) => setPkgForm({ ...pkgForm, maxGuests: e.target.value })} />
              <label>Included service IDs (comma separated)</label>
              <input value={pkgForm.includedServices.join(',')} onChange={(e) => setPkgForm({ ...pkgForm, includedServices: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="MongoDB ObjectIds" />
              <div className="row">
                <div style={{ flex: 1 }}><label>Free cancel (hours before)</label><input type="number" min="0" value={pkgForm.freeCancelHours} onChange={(e) => setPkgForm({ ...pkgForm, freeCancelHours: e.target.value })} /></div>
                <div style={{ flex: 1 }}><label>Refund %</label><input type="number" min="0" max="100" value={pkgForm.refundPercent} onChange={(e) => setPkgForm({ ...pkgForm, refundPercent: e.target.value })} /></div>
              </div>
              <button>Submit for verification</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Provider;
