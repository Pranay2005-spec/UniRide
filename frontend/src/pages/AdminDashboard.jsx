import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return sessionStorage.getItem('adminToken');
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function shortRideId(ride) {
  if (ride.rideCode) return ride.rideCode.replace('RIDE-', '');
  return ride._id ? ride._id.slice(-5).toUpperCase() : '—';
}

function rideStatus(ride) {
  if (ride.status === 'completed') return { label: 'Completed', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' };
  if (ride.status === 'cancelled') return { label: 'Cancelled', badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
  if (ride.active) return { label: 'In Progress', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' };
  return { label: 'Scheduled', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' };
}

function rideDestination(ride) {
  if (ride.destination) return ride.destination;
  const lastStop = ride.route?.[ride.route.length - 1]?.college;
  return lastStop?.name || '—';
}

function rideTimeline(ride) {
  const steps = [{ label: 'Ride created', time: ride.createdAt }];
  if (ride.status === 'active') {
    steps.push({ label: ride.active ? 'In progress' : 'Scheduled', time: ride.updatedAt });
  }
  if (ride.status === 'completed') steps.push({ label: 'Completed', time: ride.updatedAt });
  if (ride.status === 'cancelled') steps.push({ label: 'Cancelled', time: ride.updatedAt });
  return steps;
}

const NAV = [
  { group: 'Live Monitor', items: [
    { id: 'overview', label: 'Overview', icon: <OverviewIcon /> },
  ]},
  { group: 'Management', items: [
    { id: 'students', label: 'Student Verifications', icon: <StudentsIcon /> },
    { id: 'riders', label: 'Rider Verifications', icon: <RidersIcon /> },
    { id: 'complaints', label: 'Complaints', icon: <ComplaintsIcon /> },
    { id: 'users', label: 'User Management', icon: <UsersIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    { id: 'broadcast', label: 'Broadcast', icon: <BroadcastIcon /> },
  ]},
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(() => {
    const s = searchParams.get('section');
    if (s) return s;
    const view = searchParams.get('view');
    const tab = searchParams.get('tab');
    if (view === 'management' && tab) return tab;
    return 'overview';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [riders, setRiders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [liveRides, setLiveRides] = useState([]);
  const [users, setUsers] = useState([]);
  const [ridersList, setRidersList] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedRide, setSelectedRide] = useState(null);
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) navigate('/admin');
  }, []);

  useEffect(() => {
    setSearchParams({ section }, { replace: true });
  }, [section]);

  useEffect(() => {
    if (section === 'overview') fetchOverview();
    else if (section === 'students') fetchStudents();
    else if (section === 'riders') fetchRiders();
    else if (section === 'complaints') fetchComplaints();
    else if (section === 'users') fetchUsers();
    else if (section === 'analytics') fetchAnalytics();
    else if (section === 'broadcast') fetchBroadcasts();
  }, [section]);

  async function fetchOverview() {
    setLoading(true);
    try {
      const [statsRes, ridesRes] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/admin/live-rides`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      const statsData = await statsRes.json();
      const ridesData = await ridesRes.json();
      if (statsData.success) setStats(statsData.stats);
      if (ridesData.success) setLiveRides(ridesData.rides);
    } catch {} finally { setLoading(false); }
  }

  async function fetchStudents() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/pending-students`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setStudents(data.students);
    } catch {} finally { setLoading(false); }
  }

  async function fetchRiders() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/pending-riders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setRiders(data.riders);
    } catch {} finally { setLoading(false); }
  }

  async function fetchComplaints() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/complaints`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setComplaints(data.complaints);
    } catch {} finally { setLoading(false); }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setRidersList(data.riders);
      }
    } catch {} finally { setLoading(false); }
  }

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/analytics`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setAnalytics(data.analytics);
    } catch {} finally { setLoading(false); }
  }

  async function fetchBroadcasts() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/broadcasts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setBroadcasts(data.notifications);
    } catch {} finally { setLoading(false); }
  }

  async function handleVerifyStudent(userId, action) {
    try {
      const res = await fetch(`${API}/admin/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Student ${action}`);
        fetchStudents();
      }
    } catch {}
  }

  async function handleVerifyRider(userId, action) {
    try {
      const res = await fetch(`${API}/admin/verify-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Rider ${action}`);
        fetchRiders();
      }
    } catch {}
  }

  async function handleResolveComplaint(complaintId, action) {
    try {
      const res = await fetch(`${API}/admin/resolve-complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ complaintId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Complaint ${action}`);
        fetchComplaints();
      }
    } catch {}
  }

  async function handleToggleBlock(id, model, blocked) {
    try {
      const res = await fetch(`${API}/admin/toggle-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ id, model, blocked }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`${model} ${blocked ? 'blocked' : 'unblocked'}`);
        fetchUsers();
      }
    } catch {}
  }

  async function handleSendBroadcast() {
    if (!bcTitle.trim() || !bcMessage.trim()) {
      setMessage('Title and message are required');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API}/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title: bcTitle.trim(), message: bcMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Broadcast sent to all users');
        setBcTitle('');
        setBcMessage('');
        fetchBroadcasts();
      } else {
        setMessage(data.error || 'Could not send broadcast');
      }
    } catch {} finally { setSending(false); }
  }

  function handleLogout() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
    navigate('/admin');
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '—', accent: 'bg-primary-100 text-primary-700' },
    { label: 'Total Riders', value: stats?.totalRiders ?? '—', accent: 'bg-purple-100 text-purple-700' },
    { label: "Today's Rides", value: stats?.todayRides ?? '—', accent: 'bg-success-50 text-green-700' },
    { label: 'Active Rides', value: stats?.activeRides ?? '—', accent: 'bg-orange-100 text-orange-700' },
  ];

  const filteredUsers = userSearch.trim()
    ? users.filter(u =>
        `${u.name || ''} ${u.phone || ''} ${u.collegeName || ''}`.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  const filteredRiders = userSearch.trim()
    ? ridersList.filter(r =>
        `${r.name || ''} ${r.phone || ''} ${r.collegeName || ''}`.toLowerCase().includes(userSearch.toLowerCase()))
    : ridersList;

  function renderContent() {
    if (loading) {
      return <div className="py-16 text-center text-gray-400">Loading...</div>;
    }

    if (section === 'overview') {
      return (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-border p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.accent}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-text">{card.value}</p>
                <p className="text-xs text-gray-400">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm text-text">Live Rides</h2>
                <p className="text-xs text-gray-400">Recently created rides across all colleges</p>
              </div>
              <button onClick={fetchOverview} className="text-xs text-primary font-semibold bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors">Refresh</button>
            </div>
            {liveRides.length === 0 ? (
              <div className="py-14 text-center text-gray-400">No rides yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-border bg-gray-50">
                      <th className="px-5 py-3 font-semibold">Ride ID</th>
                      <th className="px-3 py-3 font-semibold">Passenger</th>
                      <th className="px-3 py-3 font-semibold">Rider</th>
                      <th className="px-3 py-3 font-semibold">Pickup</th>
                      <th className="px-3 py-3 font-semibold">Destination</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Started</th>
                      <th className="px-3 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveRides.map(ride => {
                      const st = rideStatus(ride);
                      const firstPassenger = ride.passengers?.[0]?.user;
                      const extraCount = (ride.passengers?.length || 1) - 1;
                      return (
                        <tr key={ride._id} className="border-b border-border/50 last:border-0 hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs font-semibold text-text">#{shortRideId(ride)}</td>
                          <td className="px-3 py-3.5">
                            <p className="text-xs font-medium text-text">{firstPassenger?.name || '—'}</p>
                            {extraCount > 0 && <p className="text-[10px] text-gray-400">+{extraCount} more</p>}
                          </td>
                          <td className="px-3 py-3.5 text-xs text-text">{ride.driver?.name || '—'}</td>
                          <td className="px-3 py-3.5 text-xs text-gray-500 max-w-[140px] truncate">{ride.pickup || '—'}</td>
                          <td className="px-3 py-3.5 text-xs text-gray-500 max-w-[140px] truncate">{rideDestination(ride)}</td>
                          <td className="px-3 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-xs text-gray-500">{timeAgo(ride.createdAt)}</td>
                          <td className="px-3 py-3.5">
                            <button
                              onClick={() => setSelectedRide(ride)}
                              className="text-xs text-primary font-semibold bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      );
    }

    if (section === 'students') {
      return students.length === 0 ? (
        <EmptyState text="No pending student verifications" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {students.map(s => (
            <div key={s._id} className="bg-white rounded-xl border border-border p-5 shadow-sm">
              <p className="font-semibold text-sm text-text">{s.name || 'No name'}</p>
              <p className="text-xs text-gray-400">+91 {s.phone}</p>
              {s.collegeName && <p className="text-xs text-gray-500 mt-1">{s.collegeName} - {s.rollNumber}</p>}
              {s.email && <p className="text-xs text-gray-500">{s.email}</p>}
              {s.studentIdCard && (
                <img src={`${API.replace('/api', '')}/${s.studentIdCard}`} alt="ID" className="mt-3 h-40 w-full rounded-lg object-cover border" />
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleVerifyStudent(s._id, 'approved')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors">Approve</button>
                <button onClick={() => handleVerifyStudent(s._id, 'rejected')} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">Reject</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === 'riders') {
      return riders.length === 0 ? (
        <EmptyState text="No pending rider verifications" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {riders.map(r => (
            <div key={r._id} className="bg-white rounded-xl border border-border p-5 shadow-sm">
              <p className="font-semibold text-sm text-text">+91 {r.phone}</p>
              <div className="mt-1">
                <p className="text-xs text-gray-500">License: {r.licenseNumber}</p>
                {r.licensePhoto && (
                  <img src={`${API.replace('/api', '')}/${r.licensePhoto}`} alt="License" className="mt-3 h-40 w-full rounded-lg object-cover border" />
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleVerifyRider(r._id, 'approved')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors">Approve</button>
                <button onClick={() => handleVerifyRider(r._id, 'rejected')} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">Reject</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === 'complaints') {
      return complaints.length === 0 ? (
        <EmptyState text="No complaints" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {complaints.map(c => (
            <div key={c._id} className="bg-white rounded-xl border border-border p-5 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <p className="font-semibold text-sm text-text">{c.subject}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{c.description}</p>
              <p className="text-xs text-gray-400 mt-1">By: {c.userId?.name || c.userId?.phone || 'Unknown'}</p>
              {c.targetUserId && <p className="text-xs text-gray-400">Against: {c.targetUserId?.name || c.targetUserId?.phone || 'Unknown'}</p>}
              {c.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleResolveComplaint(c._id, 'resolved')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors">Resolve</button>
                  <button onClick={() => handleResolveComplaint(c._id, 'dismissed')} className="flex-1 py-2 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors">Dismiss</button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (section === 'users') {
      return (
        <div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name, phone, college..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'user', 'rider'].map(f => (
                <button
                  key={f}
                  onClick={() => setUserFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize ${userFilter === f ? 'bg-primary text-text' : 'bg-white text-gray-500 border border-border hover:bg-gray-50'}`}
                >
                  {f === 'all' ? 'All' : f + 's'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm text-text">
                {userFilter === 'all' ? 'All Accounts' : userFilter === 'rider' ? 'Riders' : 'Users'}
                <span className="ml-2 text-xs font-normal text-gray-400">({(userFilter === 'all' ? filteredUsers.length + filteredRiders.length : userFilter === 'rider' ? filteredRiders.length : filteredUsers.length)})</span>
              </h2>
            </div>
            {((userFilter === 'all' || userFilter === 'user') && filteredUsers.map(u => (
              <UserRow key={u._id} user={u} model="User" onToggleBlock={handleToggleBlock} avatarBase={API.replace('/api', '')} />
            )))}
            {((userFilter === 'all' || userFilter === 'rider') && filteredRiders.map(r => (
              <UserRow key={r._id} user={r} model="Rider" onToggleBlock={handleToggleBlock} avatarBase={API.replace('/api', '')} />
            )))}
            {(filteredUsers.length + filteredRiders.length) === 0 && (
              <div className="py-14 text-center text-gray-400">No users found</div>
            )}
          </div>
        </div>
      );
    }

    if (section === 'analytics') {
      if (!analytics) return <div className="py-16 text-center text-gray-400">Loading...</div>;
      return (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AnalyticsCard label="Total Rides" value={analytics.totals.total} accent="bg-primary-100 text-primary-700" />
            <AnalyticsCard label="Completed" value={analytics.totals.completed} accent="bg-green-100 text-green-700" />
            <AnalyticsCard label="Cancelled" value={analytics.totals.cancelled} accent="bg-gray-100 text-gray-500" />
            <AnalyticsCard label="Active Now" value={analytics.totals.active} accent="bg-orange-100 text-orange-700" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
              <h3 className="font-semibold text-sm text-text mb-4">Rides — Last 7 Days</h3>
              <BarChart data={analytics.ridesPerDay} />
            </div>

            <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
              <h3 className="font-semibold text-sm text-text mb-3">Top Destination Colleges</h3>
              {analytics.topColleges.length === 0 ? (
                <div className="py-8 text-center text-gray-400">No data yet</div>
              ) : (
                analytics.topColleges.map((c, i) => (
                  <div key={c._id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm text-text truncate">{c._id}</span>
                    <span className="text-xs font-semibold text-gray-400">{c.count} rides</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      );
    }

    if (section === 'broadcast') {
      return (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5 shadow-sm h-fit">
            <h3 className="font-semibold text-sm text-text mb-4">Send Broadcast</h3>
            <input
              value={bcTitle}
              onChange={e => setBcTitle(e.target.value)}
              placeholder="Title (e.g. App update)"
              className="w-full px-4 py-2.5 rounded-xl border border-border text-sm bg-white mb-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <textarea
              value={bcMessage}
              onChange={e => setBcMessage(e.target.value)}
              placeholder="Message"
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl border border-border text-sm bg-white mb-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <button
              onClick={handleSendBroadcast}
              disabled={sending}
              className="w-full py-2.5 bg-primary text-text rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending ? 'Sending...' : 'Send to all users'}
            </button>
            <p className="text-[11px] text-gray-400 mt-2">Users receive this instantly on their phones via a live notification.</p>
          </div>

          <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm text-text">Broadcast History</h3>
            </div>
            {broadcasts.length === 0 ? (
              <div className="py-14 text-center text-gray-400">No broadcasts sent yet</div>
            ) : (
              broadcasts.map(b => (
                <div key={b._id} className="px-5 py-4 border-b border-border/50 last:border-0 hover:bg-gray-50/70 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-text">{b.title}</p>
                    <span className="text-[11px] text-gray-400">{timeAgo(b.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{b.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-border flex items-center gap-3 px-4 py-3">
        <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-text">UniRide Admin</h1>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:sticky lg:bottom-auto lg:h-screen lg:flex-shrink-0`}>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#70b014" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-text leading-tight">UniRide</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {NAV.map(group => (
            <div key={group.group} className="mb-5">
              <p className="px-5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.group}</p>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setSection(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${section === item.id ? 'bg-primary/10 text-text border-r-2 border-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-text'}`}
                >
                  <span className={`${section === item.id ? 'text-primary' : 'text-gray-400'}`}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="px-4 md:px-8 py-5 md:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-text">{currentTitle(section)}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{currentSubtitle(section)}</p>
            </div>

            {message && (
              <div className="mb-4 px-4 py-2.5 bg-green-50 text-green-700 text-sm rounded-xl border border-green-200 flex justify-between items-center">
                <span>{message}</span>
                <button onClick={() => setMessage('')} className="font-bold ml-3">&times;</button>
              </div>
            )}

            {renderContent()}
          </div>
        </div>
      </main>

      {selectedRide && (
        <RideModal ride={selectedRide} onClose={() => setSelectedRide(null)} />
      )}
    </div>
  );
}

function currentTitle(section) {
  const map = {
    overview: 'Overview',
    students: 'Student Verifications',
    riders: 'Rider Verifications',
    complaints: 'Complaints',
    users: 'User Management',
    analytics: 'Analytics',
    broadcast: 'Broadcast',
  };
  return map[section] || 'Admin';
}

function currentSubtitle(section) {
  const map = {
    overview: 'Live monitoring — stats and active rides',
    students: 'Review and approve pending student ID cards',
    riders: 'Review and approve pending rider licenses',
    complaints: 'Resolve or dismiss user complaints',
    users: 'Search, review and manage all accounts',
    broadcast: 'Send notifications to every user instantly',
  };
  return map[section] || '';
}

function EmptyState({ text }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

function RideModal({ ride, onClose }) {
  const st = rideStatus(ride);
  const timeline = rideTimeline(ride);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-lg text-text">Ride #{shortRideId(ride)}</h3>
            <p className="text-xs text-gray-400">{ride.rideCode || ''}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">₹{ride.price || 0}</span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 capitalize">{ride.paymentMethod || 'cash'}</span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">{ride.paymentStatus || 'pending'}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Timeline</h4>
            <div>
              {timeline.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1 ${i === 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-gray-200" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-text">{step.label}</p>
                    <p className="text-[11px] text-gray-400">{new Date(step.time).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Rider</p>
              <p className="text-sm font-semibold text-text">{ride.driver?.name || '—'}</p>
              <p className="text-xs text-gray-500">{ride.driver?.collegeName || ride.driver?.vehicleModel || ''}</p>
              <p className="text-xs text-gray-400">{ride.driver?.phone ? `+91 ${ride.driver.phone}` : ''}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Route</p>
              <p className="text-sm text-text leading-snug">{ride.pickup || '—'}</p>
              <p className="text-xs text-gray-500 mt-1">→ {rideDestination(ride)}</p>
            </div>
          </div>
        </div>

        <h4 className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Passengers</h4>
        {ride.passengers?.length === 0 ? (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4">No passengers</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {ride.passengers.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
                  {p.user?.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{p.user?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{p.user?.collegeName || ''}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${p.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {p.verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${accent}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(1, ...data.map(d => d.count));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map(d => (
        <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400 font-semibold">{d.count}</span>
          <div
            className="w-full rounded-t bg-primary"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}px` }}
          />
          <span className="text-[9px] text-gray-400">{d._id.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function UserRow({ user, model, onToggleBlock, avatarBase }) {
  const blocked = !!user.blocked;
  const status =
    model === 'Rider'
      ? user.verificationStatus
      : user.studentVerificationStatus || (user.isVerified ? 'verified' : 'not_submitted');

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-gray-50/70 transition-colors">
      {user.profilePicture ? (
        <img src={`${avatarBase}/${user.profilePicture}`} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
          {user.name?.[0] || user.phone?.[0] || '?'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{user.name || 'No name'}</p>
        <p className="text-xs text-gray-400">+91 {user.phone}</p>
        <p className="text-xs text-gray-500 truncate">{user.collegeName || user.vehicleModel || ''}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${blocked ? 'bg-red-100 text-red-700' : status === 'verified' ? 'bg-green-100 text-green-700' : status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
          {blocked ? 'Blocked' : status}
        </span>
        <button
          onClick={() => onToggleBlock(user._id, model, !blocked)}
          className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg ${blocked ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-100 text-red-600 hover:bg-red-200'} transition-colors`}
        >
          {blocked ? 'Unblock' : 'Block'}
        </button>
      </div>
    </div>
  );
}

function OverviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function StudentsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function RidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" />
    </svg>
  );
}

function ComplaintsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
