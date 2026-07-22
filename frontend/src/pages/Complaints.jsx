import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Complaints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myComplaints, setMyComplaints] = useState([]);
  const [view, setView] = useState(() => searchParams.get('view') || 'new');

  useEffect(() => {
    fetchMyComplaints();
  }, []);

  useEffect(() => {
    setSearchParams({ view }, { replace: true });
  }, [view]);

  async function fetchMyComplaints() {
    try {
      const res = await fetch(`${API}/complaints/mine`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) setMyComplaints(data.complaints);
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!subject || !description) { setError('Fill all fields'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ subject, description }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Complaint submitted');
        setSubject('');
        setDescription('');
        fetchMyComplaints();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to submit');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="pb-20">
      <div className="bg-gradient-to-b from-primary-100/40 to-white px-5 pt-8 pb-6">
        <h1 className="text-xl font-bold text-text">Help & Support</h1>
      </div>

      <div className="px-4 -mt-2">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setView('new')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${view === 'new' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>New Complaint</button>
          <button onClick={() => setView('history')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${view === 'history' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>My Complaints</button>
        </div>

        {success && <p className="text-green-600 text-sm text-center mb-3 bg-green-50 py-2 rounded-lg">{success}</p>}

        {view === 'new' ? (
          <div className="bg-white rounded-2xl border border-border p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief title" className="input-field !py-3 !text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue in detail" rows={4} className="input-field !py-3 !text-sm resize-none" />
              </div>
              {error && <p className="text-red-500 text-xs text-center">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary !py-3 !text-sm w-full">{loading ? 'Submitting...' : 'Submit Complaint'}</button>
            </form>
          </div>
        ) : (
          myComplaints.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No complaints yet</p>
          ) : (
            myComplaints.map(c => (
              <div key={c._id} className="bg-white rounded-xl border border-border p-4 mb-3">
                <div className="flex justify-between">
                  <p className="font-semibold text-sm">{c.subject}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                <p className="text-[10px] text-gray-400 mt-2">{new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
