import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import Trips from './pages/Trips.jsx';
import Bookings from './pages/Bookings.jsx';
import Provider from './pages/Provider.jsx';
import Staff from './pages/Staff.jsx';
import Admin from './pages/Admin.jsx';

const Nav = () => {
  const { account, logout } = useAuth();
  const role = account?.role;
  return (
    <nav>
      <span className="brand">STS — Sarawak Tourism</span>
      <NavLink to="/" end>Explore</NavLink>
      {account?.role === 'tourist' && <NavLink to="/trips">My Trips</NavLink>}
      {account?.role === 'tourist' && <NavLink to="/bookings">My Bookings</NavLink>}
      {role === 'service_provider' && <NavLink to="/provider">My Listings</NavLink>}
      {role === 'staff' && <NavLink to="/staff">Staff Console</NavLink>}
      {role === 'admin' && <NavLink to="/admin">Admin Console</NavLink>}
      <span className="spacer" />
      {account ? (
        <>
          {role && <span className="role">{role.replace('_', ' ')}</span>}
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); window.location.href = '/'; }}>Logout</a>
        </>
      ) : (
        <>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Register</NavLink>
        </>
      )}
    </nav>
  );
};

const RequireRole = ({ roles, children }) => {
  const { account } = useAuth();
  if (!account) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(account.role)) return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/item/:itemType/:id" element={<ItemDetail />} />
          <Route path="/trips" element={<RequireRole roles={['tourist']}><Trips /></RequireRole>} />
          <Route path="/bookings" element={<RequireRole roles={['tourist']}><Bookings /></RequireRole>} />
          <Route path="/provider" element={<RequireRole roles={['service_provider']}><Provider /></RequireRole>} />
          <Route path="/staff" element={<RequireRole roles={['staff', 'admin']}><Staff /></RequireRole>} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><Admin /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
