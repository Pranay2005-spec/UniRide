import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import Welcome from './pages/Welcome';
import OtpVerification from './pages/OtpVerification';
import CompleteProfile from './pages/CompleteProfile';
import Home from './pages/Home';
import Rides from './pages/Rides';
import ProfilePage from './pages/ProfilePage';
import LoadingSkeleton from './components/LoadingSkeleton';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <LoadingSkeleton count={1} type="profile" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white relative">
      {children}
      <BottomNav />
    </div>
  );
}

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSkeleton count={1} type="profile" />
      </div>
    );
  }
  if (user) return <Navigate to="/app/home" replace />;
  return <Welcome />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/otp" element={<OtpVerification />} />
          <Route path="/complete-profile" element={
            <ProtectedRoute><CompleteProfile /></ProtectedRoute>
          } />
          <Route path="/app/home" element={
            <ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>
          } />
          <Route path="/app/rides" element={
            <ProtectedRoute><AppLayout><Rides /></AppLayout></ProtectedRoute>
          } />
          <Route path="/app/profile" element={
            <ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
