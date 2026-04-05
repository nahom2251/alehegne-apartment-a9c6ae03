import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
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
import Revenue from "@/pages/Revenue";
import UserManagement from "@/pages/UserManagement";
import PaymentReview from "@/pages/PaymentReview";
import TenantDashboard from "@/pages/TenantDashboard";
import TenantBills from "@/pages/TenantBills";
import TenantPayment from "@/pages/TenantPayment";
import TenantHistory from "@/pages/TenantHistory";
import TenantSettings from "@/pages/TenantSettings";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// Authenticated routing component
const AuthenticatedApp = () => {
  const { user, profile, loading, isApproved, isTenant } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Not logged in - show landing page with route choice
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin" element={<Auth />} />
        <Route path="/tenant-login" element={<TenantAuth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Tenant user
  if (isTenant && isApproved) {
    return (
      <Routes>
        <Route path="/tenant" element={<TenantLayout />}>
          <Route index element={<TenantDashboard />} />
          <Route path="bills" element={<TenantBills />} />
          <Route path="payment" element={<TenantPayment />} />
          <Route path="history" element={<TenantHistory />} />
          <Route path="settings" element={<TenantSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/tenant" replace />} />
      </Routes>
    );
  }

  // Pending approval (non-tenant)
  if (!isApproved && profile && !isTenant) return <PendingApproval />;

  // Admin/Super Admin user
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/apartments" element={<Apartments />} />
        <Route path="/electricity" element={<ElectricityBills />} />
        <Route path="/water" element={<WaterBills />} />
        <Route path="/revenue" element={<Revenue />} />
        <Route path="/payments" element={<PaymentReview />} />
        <Route path="/users" element={<UserManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
