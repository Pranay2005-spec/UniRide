import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import BottomNav from './components/BottomNav';
import Welcome from './pages/Welcome';
import OtpVerification from './pages/OtpVerification';
import CompleteProfile from './pages/CompleteProfile';
import Home from './pages/Home';
import Rides from './pages/Rides';
import OfferRide from './pages/OfferRide';
import RiderDashboard from './pages/RiderDashboard';
import RiderRide from './pages/RiderRide';
import ProfilePage from './pages/ProfilePage';
import MyRides from './pages/MyRides';
import Payments from './pages/Payments';
import CollegeVerification from './pages/CollegeVerification';
import Updates from './pages/Updates';
import ProfileManagement from './pages/ProfileManagement';
import CreateRiderAccount from './pages/CreateRiderAccount';
import SwitchRole from './pages/SwitchRole';
import LoginRider from './pages/LoginRider';
import RiderSignup from './pages/RiderSignup';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Complaints from './pages/Complaints';

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
        <SocketProvider>
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/otp" element={<OtpVerification />} />
            <Route path="/rider-login" element={<LoginRider />} />
            <Route path="/rider-signup" element={<RiderSignup />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/complete-profile" element={
              <ProtectedRoute><CompleteProfile /></ProtectedRoute>
            } />
            <Route path="/app/home" element={
              <ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/rides" element={
              <ProtectedRoute><AppLayout><Rides /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/offer-ride" element={
              <ProtectedRoute><AppLayout><OfferRide /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/rider-dashboard" element={
              <ProtectedRoute><AppLayout><RiderDashboard /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/rider-ride" element={
              <ProtectedRoute><AppLayout><RiderRide /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/profile" element={
              <ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/profile-management" element={
              <ProtectedRoute><AppLayout><ProfileManagement /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/my-rides" element={
              <ProtectedRoute><AppLayout><MyRides /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/payments" element={
              <ProtectedRoute><AppLayout><Payments /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/college-verification" element={
              <ProtectedRoute><AppLayout><CollegeVerification /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/complaints" element={
              <ProtectedRoute><AppLayout><Complaints /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/updates" element={
              <ProtectedRoute><AppLayout><Updates /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/switch-role" element={
              <ProtectedRoute><AppLayout><SwitchRole /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/create-rider-account" element={
              <ProtectedRoute><AppLayout><CreateRiderAccount /></AppLayout></ProtectedRoute>
            } />
            <Route path="/app/login-rider" element={
              <ProtectedRoute><AppLayout><LoginRider /></AppLayout></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
