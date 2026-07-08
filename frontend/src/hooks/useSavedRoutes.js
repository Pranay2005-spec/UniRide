import { useState, useCallback } from 'react';

const STORAGE_KEY = 'uniride_saved_routes';

function load() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useSavedRoutes() {
  const [routes, setRoutes] = useState(load);

  function persist(updated) {
    setRoutes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  const addRoute = useCallback((pickup, college) => {
    const exists = routes.some(
      r => r.college.id === college.id && r.pickup.address === pickup.address
    );
    if (exists) return false;
    const route = {
      id: Date.now().toString(),
      pickup: { position: pickup.position, address: pickup.address },
      college: { id: college.id, name: college.name, short: college.short },
    };
    persist([route, ...routes]);
    return true;
  }, [routes]);

  const removeRoute = useCallback((routeId) => {
    persist(routes.filter(r => r.id !== routeId));
  }, [routes]);

  return { routes, addRoute, removeRoute };
}
