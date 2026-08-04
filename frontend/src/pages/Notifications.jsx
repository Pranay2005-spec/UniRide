import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (!data || !data._id) return;
      setNotifications(prev => {
        if (prev.some(n => n._id === data._id)) return prev;
        return [data, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    };
    socket.on('broadcast', handler);
    return () => socket.off('broadcast', handler);
  }, [socket]);

  async function handleMarkAllRead() {
    try {
      await fetch(`${API}/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  }

  async function handleRead(id) {
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => (n._id === id && !n.read ? { ...n, read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }

  async function handleDismiss(id) {
    try {
      await fetch(`${API}/notifications/${id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => {
        const target = prev.find(n => n._id === id);
        if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n._id !== id);
      });
    } catch {}
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="ml-auto text-xs text-primary font-semibold">Mark all read</button>
        )}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl py-14 px-6 text-center border border-dashed border-gray-200">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-text mb-1">No notifications yet</h3>
            <p className="text-sm text-gray-400">Announcements from UniRide will show up here.</p>
          </div>
        ) : (
          notifications.map(n => {
            const isUnread = !n.read && !n.readBy?.includes(userId(token));
            return (
              <div
                key={n._id}
                onClick={() => isUnread && handleRead(n._id)}
                className={`bg-white rounded-2xl border p-4 shadow-sm flex items-start gap-2 ${isUnread ? 'border-primary/60 cursor-pointer' : 'border-border'}`}
              >
                <div className="flex-1 min-w-0 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text text-sm">{n.title}</h3>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500">{n.message}</p>
                    <p className="text-[11px] text-gray-400 mt-2">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDismiss(n._id); }}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                  aria-label="Delete notification"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function userId(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)).userId;
  } catch {
    return '';
  }
}
