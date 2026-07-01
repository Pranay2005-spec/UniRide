import { useState } from 'react';

const STORAGE_KEY = 'uniride_saved_colleges';

function loadSaved() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useSavedColleges() {
  const [savedIds, setSavedIds] = useState(loadSaved);

  function persist(ids) {
    setSavedIds(ids);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  function toggleSave(collegeId) {
    if (savedIds.includes(collegeId)) {
      persist(savedIds.filter(id => id !== collegeId));
    } else {
      persist([...savedIds, collegeId]);
    }
  }

  function isSaved(collegeId) {
    return savedIds.includes(collegeId);
  }

  return { savedIds, toggleSave, isSaved };
}
