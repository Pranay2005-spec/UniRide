import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return sessionStorage.getItem('token');
}

export function useSavedRoutes(userId) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`${API}/saved-routes`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => { if (data.success) setRoutes(data.routes); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const addRoute = useCallback(async (pickup, collegeOrDest) => {
    const body = { pickup };
    if (collegeOrDest?.id) {
      body.college = { id: collegeOrDest.id, name: collegeOrDest.name, short: collegeOrDest.short, lat: collegeOrDest.lat, lng: collegeOrDest.lng };
    } else {
      body.destination = { position: collegeOrDest.position, address: collegeOrDest.address };
    }

    try {
      const res = await fetch(`${API}/saved-routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setRoutes(prev => [data.route, ...prev]);
        return true;
      }
      return false;
    } catch { return false; }
  }, []);

  const removeRoute = useCallback(async (routeId) => {
    try {
      await fetch(`${API}/saved-routes/${routeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setRoutes(prev => prev.filter(r => r._id !== routeId));
    } catch {}
  }, []);

  return { routes, addRoute, removeRoute, loading };
}
