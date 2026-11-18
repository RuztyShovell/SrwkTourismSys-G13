import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [form, setForm] = useState({ title: '', startDate: '', endDate: '', preferences: '', stops: [] });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    api('/trips').then((d) => setTrips(d.trips)).catch((e) => setError(e.message));
    api('/attractions').then((d) => setAttractions(d.attractions.filter((a) => a.status === 'open'))).catch(() => {});
  };
  useEffect(load, []);

  const addStop = () => setForm({ ...form, stops: [...form.stops, { attraction: '', visitDate: '' }] });
  const setStop = (i, k, v) => {
    const stops = [...form.stops];
    stops[i] = { ...stops[i], [k]: v };
    setForm({ ...form, stops });
  };
  const removeStop = (i) => setForm({ ...form, stops: form.stops.filter((_, j) => j !== i) });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      const stops = form.stops.filter((s) => s.attraction);
      const { trip, conflicts } = await api('/trips', {
        method: 'POST',
        body: {
          title: form.title,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          preferences: form.preferences,
          stops,
        },
      });
      setNotice(`Trip "${trip.title}" saved.`);
      if (conflicts?.length) setNotice((n) => `${n} Schedule conflicts: ${conflicts.join('; ')}`);
      setForm({ title: '', startDate: '', endDate: '', preferences: '', stops: [] });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    await api(`/trips/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <h1>My Trips</h1>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="card">
        <h2>Plan a new trip</h2>
        <form className="stack" onSubmit={submit}>
          <label>Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="row">
            <div style={{ flex: 1 }}><label>Start date</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label>End date</label><input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <label>Preferences</label>
          <input value={form.preferences} onChange={(e) => setForm({ ...form, preferences: e.target.value })} placeholder="e.g. nature, food, budget" />
          <h3>Attractions</h3>
          {form.stops.map((s, i) => (
            <div className="row" key={i}>
              <select style={{ flex: 2 }} value={s.attraction} onChange={(e) => setStop(i, 'attraction', e.target.value)}>
                <option value="">Select attraction…</option>
                {attractions.map((a) => <option key={a._id} value={a._id}>{a.name} ({a.location})</option>)}
              </select>
              <input style={{ flex: 1 }} type="date" value={s.visitDate} onChange={(e) => setStop(i, 'visitDate', e.target.value)} />
              <button type="button" className="secondary" onClick={() => removeStop(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={addStop}>+ Add attraction</button>
          <button>Save trip</button>
        </form>
      </div>

      {trips.map((t) => (
        <div className="card" key={t._id}>
          <div className="row spread">
            <h2>{t.title}</h2>
            <button className="danger" onClick={() => remove(t._id)}>Delete</button>
          </div>
          <p className="muted">
            {t.startDate ? new Date(t.startDate).toLocaleDateString() : '—'} → {t.endDate ? new Date(t.endDate).toLocaleDateString() : '—'}
            {t.preferences ? ` · ${t.preferences}` : ''}
          </p>
          <ul>
            {t.stops?.map((s, i) => (
              <li key={i}>
                {s.attraction?.name} — {s.attraction?.location}
                {s.visitDate && <> · visit {new Date(s.visitDate).toLocaleDateString()}</>}
                {s.attraction?.status !== 'open' && <span className="badge inactive">{s.attraction?.status?.replace('_', ' ')}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {trips.length === 0 && <p className="muted">No trips yet — plan your first Sarawak adventure above.</p>}
    </div>
  );
};

export default Trips;
