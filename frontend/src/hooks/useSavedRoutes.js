import { useState, useCallback } from 'react';

function load(userId) {
  try {
    const key = userId ? `uniride_saved_routes_${userId}` : 'uniride_saved_routes';
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useSavedRoutes(userId) {
  const [routes, setRoutes] = useState(() => load(userId));

  function persist(updated) {
    setRoutes(updated);
    const key = userId ? `uniride_saved_routes_${userId}` : 'uniride_saved_routes';
    localStorage.setItem(key, JSON.stringify(updated));
  }

  const addRoute = useCallback((pickup, collegeOrDest) => {
    if (collegeOrDest?.id) {
      const exists = routes.some(
        r => r.college?.id === collegeOrDest.id && r.pickup.address === pickup.address
      );
      if (exists) return false;
      const route = {
        id: Date.now().toString(),
        pickup: { position: pickup.position, address: pickup.address },
        college: { id: collegeOrDest.id, name: collegeOrDest.name, short: collegeOrDest.short, lat: collegeOrDest.lat, lng: collegeOrDest.lng },
      };
      persist([route, ...routes]);
    } else {
      const dest = collegeOrDest || pickup;
      const exists = routes.some(
        r => r.destination?.address === dest.address && r.pickup.address === pickup.address
      );
      if (exists) return false;
      const route = {
        id: Date.now().toString(),
        pickup: { position: pickup.position, address: pickup.address },
        destination: { position: dest.position, address: dest.address },
      };
      persist([route, ...routes]);
    }
    return true;
  }, [routes]);

  const removeRoute = useCallback((routeId) => {
    persist(routes.filter(r => r.id !== routeId));
  }, [routes]);

  return { routes, addRoute, removeRoute };
}
