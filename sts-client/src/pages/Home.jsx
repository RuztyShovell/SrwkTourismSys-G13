import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const TYPE_LABELS = { accommodation: 'Stay', transportation: 'Transport', food: 'Food', guided_tour: 'Tour' };

const Home = () => {
  const [tab, setTab] = useState('services');
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/services').then((d) => setServices(d.services)).catch((e) => setError(e.message));
    api('/packages').then((d) => setPackages(d.packages)).catch(() => {});
    api('/attractions').then((d) => setAttractions(d.attractions.filter((a) => a.status !== 'inactive'))).catch(() => {});
  }, []);

  const shownServices = typeFilter ? services.filter((s) => s.type === typeFilter) : services;

  return (
    <div>
      <h1>Explore Sarawak</h1>
      <p className="muted">Verified services, packages and attractions — book in MYR.</p>
      {error && <div className="error">{error} — is the API running?</div>}

      <div className="tabs">
        <button className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}>Services</button>
        <button className={tab === 'packages' ? 'active' : ''} onClick={() => setTab('packages')}>Packages</button>
        <button className={tab === 'attractions' ? 'active' : ''} onClick={() => setTab('attractions')}>Attractions</button>
        {tab === 'services' && (
          <select style={{ width: 'auto', margin: 0 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </div>

      {tab === 'services' && (
        <div className="grid">
          {shownServices.map((s) => (
            <Link key={s._id} to={`/item/service/${s._id}`} className="card" style={{ display: 'block', color: 'inherit' }}>
              <span className="badge">{TYPE_LABELS[s.type]}</span>
              <h3>{s.name}</h3>
              <p className="muted">{s.location} · by {s.provider?.businessName}</p>
              <p className="price">MYR {s.price}</p>
            </Link>
          ))}
          {shownServices.length === 0 && <p className="muted">No verified services yet.</p>}
        </div>
      )}

      {tab === 'packages' && (
        <div className="grid">
          {packages.map((p) => (
            <Link key={p._id} to={`/item/package/${p._id}`} className="card" style={{ display: 'block', color: 'inherit' }}>
              <span className="badge verified">Package</span>
              <h3>{p.name}</h3>
              <p className="muted">{p.description?.slice(0, 100)}</p>
              <p className="muted">Includes: {p.includedServices?.map((s) => s.name).join(', ') || '—'}</p>
              <p className="price">MYR {p.price}</p>
            </Link>
          ))}
          {packages.length === 0 && <p className="muted">No verified packages yet.</p>}
        </div>
      )}

      {tab === 'attractions' && (
        <div className="grid">
          {attractions.map((a) => (
            <div key={a._id} className="card">
              <span className={`badge ${a.status === 'open' ? 'open' : 'inactive'}`}>{a.status.replace('_', ' ')}</span>
              <h3>{a.name}</h3>
              <p className="muted">{a.location} · {a.type}</p>
              <p>{a.description}</p>
              <p className="muted">Hours: {a.openingHours || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
