import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ role: 'tourist', name: '', businessName: '', email: '', password: '', phone: '', nationality: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 460, margin: '2rem auto' }}>
      <h1>Register</h1>
      {error && <div className="error">{error}</div>}
      <form className="stack" onSubmit={submit}>
        <label>I am a</label>
        <select value={form.role} onChange={set('role')}>
          <option value="tourist">Tourist</option>
          <option value="service_provider">Service Provider</option>
        </select>
        {form.role === 'tourist' ? (
          <>
            <label>Full name</label>
            <input value={form.name} onChange={set('name')} required />
            <label>Nationality</label>
            <input value={form.nationality} onChange={set('nationality')} />
          </>
        ) : (
          <>
            <label>Business name</label>
            <input value={form.businessName} onChange={set('businessName')} required />
          </>
        )}
        <label>Email</label>
        <input type="email" value={form.email} onChange={set('email')} required />
        <label>Password (min 8 characters)</label>
        <input type="password" value={form.password} onChange={set('password')} minLength={8} required />
        <label>Phone</label>
        <input value={form.phone} onChange={set('phone')} />
        <button disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="muted">Already registered? <Link to="/login">Login</Link></p>
    </div>
  );
};

export default Register;
