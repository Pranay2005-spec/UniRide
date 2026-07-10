import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const [role, setRole] = useState(sessionStorage.getItem('role') || 'user');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  function toggleRole() {
    const next = role === 'rider' ? 'user' : 'rider';
    setRole(next);
    sessionStorage.setItem('role', next);
  }

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  async function fetchProfile(t) {
    try {
      const res = await fetch(`${API}/auth/profile`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp(phone) {
    const res = await fetch(`${API}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return res.json();
  }

  async function verifyOtp(phone, code) {
    const res = await fetch(`${API}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (data.success) {
      setToken(data.token);
      sessionStorage.setItem('token', data.token);
      setUser(data.user);
    }
    return data;
  }

  async function completeProfile(formData) {
    const res = await fetch(`${API}/auth/complete-profile`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
    }
    return data;
  }

  async function updateProfile(formData) {
    const res = await fetch(`${API}/auth/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
    }
    return data;
  }

  function logout() {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('token');
    navigate('/');
  }

  return (
    <AuthContext.Provider value={{
      user, token, role, loading,
      sendOtp, verifyOtp, completeProfile, updateProfile, logout,
      setUser, toggleRole, setRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
