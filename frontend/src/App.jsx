import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import BottomNav from './components/BottomNav';
import LoadingSkeleton from './components/LoadingSkeleton';

const Welcome = lazy(() => import('./pages/Welcome'));
const OtpVerification = lazy(() => import('./pages/OtpVerification'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const Home = lazy(() => import('./pages/Home'));
const Rides = lazy(() => import('./pages/Rides'));
const OfferRide = lazy(() => import('./pages/OfferRide'));
const RiderDashboard = lazy(() => import('./pages/RiderDashboard'));
const RiderRide = lazy(() => import('./pages/RiderRide'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MyRides = lazy(() => import('./pages/MyRides'));
const Payments = lazy(() => import('./pages/Payments'));
const CollegeVerification = lazy(() => import('./pages/CollegeVerification'));
const Updates = lazy(() => import('./pages/Updates'));
const ProfileManagement = lazy(() => import('./pages/ProfileManagement'));
const CreateRiderAccount = lazy(() => import('./pages/CreateRiderAccount'));
const SwitchRole = lazy(() => import('./pages/SwitchRole'));
const LoginRider = lazy(() => import('./pages/LoginRider'));
const RiderSignup = lazy(() => import('./pages/RiderSignup'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Complaints = lazy(() => import('./pages/Complaints'));

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
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton count={1} type="profile" /></div>}>
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
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
