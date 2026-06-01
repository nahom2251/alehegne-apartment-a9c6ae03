import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import AppLayout from "@/components/AppLayout";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Apartments from "@/pages/Apartments";
import ElectricityBills from "@/pages/ElectricityBills";
import WaterBills from "@/pages/WaterBills";
import SecurityBills from "@/pages/SecurityBills";
import RentBilling from "@/pages/RentBilling";
import Revenue from "@/pages/Revenue";
import UtilityInvoices from "@/pages/UtilityInvoices";
import UserManagement from "@/pages/UserManagement";
import TenantPayments from "@/pages/TenantPayments";
import ResetPassword from "@/pages/ResetPassword";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const PendingApproval = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-background">
    <div className="max-w-md text-center space-y-3">
      <h1 className="text-2xl font-bold">Awaiting approval</h1>
      <p className="text-muted-foreground">Your account is pending approval by a super admin.</p>
    </div>
  </div>
);

const AuthRedirect = () => {
  const { user, profile, loading, isApproved } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved && profile) return <Navigate to="/pending-approval" replace />;
  return <Navigate to="/dashboard" replace />;
};

const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
  const { user, profile, loading, isApproved } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <>{children}</>;
  if (!isApproved && profile) return <Navigate to="/pending-approval" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AdminRoute = () => {
  const { user, profile, loading, isApproved } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved && profile) return <Navigate to="/pending-approval" replace />;
  return <Outlet />;
};

const PendingApprovalRoute = () => {
  const { user, profile, loading, isApproved } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved && profile) return <PendingApproval />;
  return <Navigate to="/dashboard" replace />;
};

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/login" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
      <Route path="/admin" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
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
          <Route path="/utility-invoices" element={<UtilityInvoices />} />
          <Route path="/tenant-payments" element={<TenantPayments />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
      </Route>

      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  );
};

// Sits inside AuthProvider so auth initializes immediately on page load.
// Splash only shows on a true cold start (first load of a tab session), never
// on client-side route changes. If the user backgrounds the tab for more than
// AWAY_TIMEOUT_MS, we sign them out and force a full reload so they see the
// splash + login flow again.
const AWAY_TIMEOUT_MS = 180_000;
const SPLASH_SESSION_KEY = 'as_apt_splash_shown';

const AppWithSplash = () => {
  const { signOut } = useAuth();
  const [showSplash, setShowSplash] = useState(
    () => typeof window !== 'undefined' && !sessionStorage.getItem(SPLASH_SESSION_KEY)
  );

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    setShowSplash(false);
  }, []);

  // Force re-auth + splash when the tab has been hidden for more than 3 minutes.
  useEffect(() => {
    let hiddenAt: number | null = null;

    const onVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAt !== null) {
        const away = Date.now() - hiddenAt;
        hiddenAt = null;
        if (away >= AWAY_TIMEOUT_MS) {
          sessionStorage.removeItem(SPLASH_SESSION_KEY);
          try {
            await signOut();
          } catch {
            // ignore — we are about to reload anyway
          }
          window.location.replace('/login');
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [signOut]);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {!showSplash && <AuthenticatedApp />}
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppWithSplash />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;