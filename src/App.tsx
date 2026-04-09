import { useState, useCallback, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import AppLayout from "@/components/AppLayout";
import TenantLayout from "@/components/TenantLayout";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import TenantAuth from "@/pages/TenantAuth";
import PendingApproval from "@/pages/PendingApproval";
import Dashboard from "@/pages/Dashboard";
import Apartments from "@/pages/Apartments";
import ElectricityBills from "@/pages/ElectricityBills";
import WaterBills from "@/pages/WaterBills";
import SecurityBills from "@/pages/SecurityBills";
import RentBilling from "@/pages/RentBilling";
import Revenue from "@/pages/Revenue";
import UserManagement from "@/pages/UserManagement";
import PaymentReview from "@/pages/PaymentReview";
import TenantDashboard from "@/pages/TenantDashboard";
import TenantBills from "@/pages/TenantBills";
import TenantPayment from "@/pages/TenantPayment";
import TenantHistory from "@/pages/TenantHistory";
import TenantSettings from "@/pages/TenantSettings";
import ResetPassword from "@/pages/ResetPassword";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AuthRedirect = () => {
  const { user, profile, loading, isApproved, isTenant } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (isTenant && isApproved) return <Navigate to="/tenant" replace />;
  if (!isApproved && profile && !isTenant) return <Navigate to="/pending-approval" replace />;
  return <Navigate to="/dashboard" replace />;
};

const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
  const { user, profile, loading, isApproved, isTenant } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <>{children}</>;
  if (isTenant && isApproved) return <Navigate to="/tenant" replace />;
  if (!isApproved && profile && !isTenant) return <Navigate to="/pending-approval" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AdminRoute = () => {
  const { user, profile, loading, isApproved, isTenant } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/admin" replace />;
  if (isTenant && isApproved) return <Navigate to="/tenant" replace />;
  if (!isApproved && profile && !isTenant) return <Navigate to="/pending-approval" replace />;
  return <Outlet />;
};

const TenantRoute = () => {
  const { user, profile, loading, isApproved, isTenant } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/tenant-login" replace />;
  if (!isTenant) {
    if (!isApproved && profile) return <Navigate to="/pending-approval" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  if (!isApproved) return <Navigate to="/tenant-login" replace />;
  return <Outlet />;
};

const PendingApprovalRoute = () => {
  const { user, profile, loading, isApproved, isTenant } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/admin" replace />;
  if (isTenant && isApproved) return <Navigate to="/tenant" replace />;
  if (!isApproved && profile && !isTenant) return <PendingApproval />;
  return <Navigate to="/dashboard" replace />;
};

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/login" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
      <Route path="/tenant-login" element={<PublicOnlyRoute><TenantAuth /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
      <Route path="/pending-approval" element={<PendingApprovalRoute />} />

      <Route element={<AdminRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/apartments" element={<Apartments />} />
          <Route path="/electricity" element={<ElectricityBills />} />
          <Route path="/water" element={<WaterBills />} />
          <Route path="/security" element={<SecurityBills />} />
          <Route path="/rent" element={<RentBilling />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/payments" element={<PaymentReview />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
      </Route>

      <Route element={<TenantRoute />}>
        <Route path="/tenant" element={<TenantLayout />}>
          <Route index element={<TenantDashboard />} />
          <Route path="bills" element={<TenantBills />} />
          <Route path="payment" element={<TenantPayment />} />
          <Route path="history" element={<TenantHistory />} />
          <Route path="settings" element={<TenantSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          <BrowserRouter>
            <AuthProvider>
              <AuthenticatedApp />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;

