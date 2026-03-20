import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import PendingApproval from "@/pages/PendingApproval";
import Dashboard from "@/pages/Dashboard";
import Apartments from "@/pages/Apartments";
import ElectricityBills from "@/pages/ElectricityBills";
import WaterBills from "@/pages/WaterBills";
import Revenue from "@/pages/Revenue";
import UserManagement from "@/pages/UserManagement";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AuthenticatedApp = () => {
  const { user, profile, loading, isApproved } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Auth />;

  if (!isApproved && profile) return <PendingApproval />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apartments" element={<Apartments />} />
        <Route path="/electricity" element={<ElectricityBills />} />
        <Route path="/water" element={<WaterBills />} />
        <Route path="/revenue" element={<Revenue />} />
        <Route path="/users" element={<UserManagement />} />
      </Route>
      <Route path="*" element={<NotFound />} />
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
