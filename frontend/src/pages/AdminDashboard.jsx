import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return sessionStorage.getItem('adminToken');
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'students');
  const [students, setStudents] = useState([]);
  const [riders, setRiders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) navigate('/admin');
  }, []);

  useEffect(() => {
    setSearchParams({ tab }, { replace: true });
  }, [tab]);

  useEffect(() => {
    if (tab === 'students') fetchStudents();
    else if (tab === 'riders') fetchRiders();
    else if (tab === 'complaints') fetchComplaints();
  }, [tab]);

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

  function handleLogout() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
    navigate('/admin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-text">Admin Dashboard</h1>
        <button onClick={handleLogout} className="text-sm text-red-500 font-semibold">Logout</button>
      </div>

      <div className="flex border-b border-border bg-white">
        {['students', 'riders', 'complaints'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
          >
            {t === 'students' ? 'Student Verifications' : t === 'riders' ? 'Rider Verifications' : 'Complaints'}
          </button>
        ))}
      </div>

      {message && (
        <div className="px-4 py-2 bg-green-50 text-green-700 text-sm flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="font-bold">&times;</button>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Loading...</p>
        ) : tab === 'students' ? (
          students.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No pending student verifications</p>
          ) : (
            students.map(s => (
              <div key={s._id} className="bg-white rounded-xl border border-border p-4 mb-3">
                <p className="font-semibold text-sm">{s.name || 'No name'}</p>
                <p className="text-xs text-gray-400">+91 {s.phone}</p>
                {s.collegeName && <p className="text-xs text-gray-500 mt-1">{s.collegeName} - {s.rollNumber}</p>}
                {s.email && <p className="text-xs text-gray-500">{s.email}</p>}
                {s.studentIdCard && (
                  <img src={`${API.replace('/api', '')}/${s.studentIdCard}`} alt="ID" className="mt-2 h-32 rounded-lg object-cover border" />
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleVerifyStudent(s._id, 'approved')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold">Approve</button>
                  <button onClick={() => handleVerifyStudent(s._id, 'rejected')} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Reject</button>
                </div>
              </div>
            ))
          )
        ) : tab === 'riders' ? (
          riders.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No pending rider verifications</p>
          ) : (
            riders.map(r => (
              <div key={r._id} className="bg-white rounded-xl border border-border p-4 mb-3">
                <p className="font-semibold text-sm">+91 {r.phone}</p>
                {r.riderDocs?.map((doc, i) => (
                  <div key={i} className="mt-1">
                    <p className="text-xs text-gray-500 capitalize">{doc.docType}: {doc.docNumber}</p>
                    {doc.filePath && (
                      <img src={`${API.replace('/api', '')}/${doc.filePath}`} alt="Doc" className="mt-1 h-32 rounded-lg object-cover border" />
                    )}
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleVerifyRider(r._id, 'approved')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold">Approve</button>
                  <button onClick={() => handleVerifyRider(r._id, 'rejected')} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Reject</button>
                </div>
              </div>
            ))
          )
        ) : (
          complaints.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No complaints</p>
          ) : (
            complaints.map(c => (
              <div key={c._id} className="bg-white rounded-xl border border-border p-4 mb-3">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-sm">{c.subject}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                <p className="text-xs text-gray-400 mt-1">By: {c.userId?.name || c.userId?.phone || 'Unknown'}</p>
                {c.targetUserId && <p className="text-xs text-gray-400">Against: {c.targetUserId?.name || c.targetUserId?.phone || 'Unknown'}</p>}
                {c.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleResolveComplaint(c._id, 'resolved')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold">Resolve</button>
                    <button onClick={() => handleResolveComplaint(c._id, 'dismissed')} className="flex-1 py-2 bg-gray-500 text-white rounded-lg text-sm font-semibold">Dismiss</button>
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
