import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Package, Shield, Truck, UserCheck, PlusCircle, Search, ListFilter } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield size={16} color="#818cf8" />;
      case 'driver': return <Truck size={16} color="#38bdf8" />;
      default: return <UserCheck size={16} color="#34d399" />;
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 32px',
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-glass)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Package size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              KINANA Express
            </h2>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Logistics & Parcel Platform</p>
          </div>
        </Link>

        {user && user.role === 'client' && (
          <nav style={{ display: 'flex', gap: '8px' }}>
            <Link to="/" className={isActive('/') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              Dashboard
            </Link>
            <Link to="/create-order" className={isActive('/create-order') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <PlusCircle size={14} /> Create Order
            </Link>
            <Link to="/my-shipments" className={isActive('/my-shipments') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <ListFilter size={14} /> My Shipments
            </Link>
            <Link to="/track" className={isActive('/track') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <Search size={14} /> Track Package
            </Link>
          </nav>
        )}

        {user && user.role === 'driver' && (
          <nav style={{ display: 'flex', gap: '8px' }}>
            <Link to="/" className={isActive('/') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <Truck size={14} /> Driver Hub
            </Link>
            <Link to="/driver-tour" className={isActive('/driver-tour') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              My Tour Route
            </Link>
            <Link to="/driver-profile" className={isActive('/driver-profile') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              Vehicle Specs
            </Link>
            <Link to="/track" className={isActive('/track') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <Search size={14} /> Public Tracker
            </Link>
          </nav>
        )}

        {user && user.role === 'admin' && (
          <nav style={{ display: 'flex', gap: '8px' }}>
            <Link to="/" className={isActive('/') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <Shield size={14} /> Admin Portal
            </Link>
            <Link to="/track" className={isActive('/track') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <Search size={14} /> Public Tracker
            </Link>
          </nav>
        )}

        {!user && (
          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link to="/create-order" className={isActive('/create-order') ? 'btn-primary' : 'btn-primary'} style={{ fontSize: '0.85rem', padding: '8px 16px', fontWeight: '700' }}>
              <PlusCircle size={15} style={{ marginRight: '4px' }} /> Create Shipment
            </Link>
            <Link to="/track" className={isActive('/track') ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '8px 14px' }}>
              <Search size={15} style={{ marginRight: '4px' }} /> Track Shipment
            </Link>
          </nav>
        )}
      </div>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NotificationCenter />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
            {getRoleIcon(user.role)}
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>{user.name}</p>
              <span className="badge badge-role" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>{user.role}</span>
            </div>
          </div>

          <button onClick={logout} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/login" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
            Login
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
