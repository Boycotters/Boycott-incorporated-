import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { AIChatbot } from "@/components/ai/AIChatbot";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Earn from "./pages/Earn";
import Marketplace from "./pages/Marketplace";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Install from "./pages/Install";
import TransactionHistory from "./pages/TransactionHistory";
import Referrals from "./pages/Referrals";
import Settings from "./pages/Settings";
import Achievements from "./pages/Achievements";
import Analytics from "./pages/Analytics";
import VIP from "./pages/VIP";
import Withdraw from "./pages/Withdraw";
import Surveys from "./pages/Surveys";
import Videos from "./pages/Videos";
import Admin from "./pages/Admin";
import Games from "./pages/Games";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import About from "./pages/About";
import Leaderboard from "./pages/Leaderboard";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const hideNavRoutes = ['/auth', '/reset-password', '/install', '/transactions', '/referrals', '/settings', '/achievements', '/analytics', '/vip', '/withdraw', '/surveys', '/videos', '/admin', '/games', '/faq', '/terms', '/privacy', '/about', '/leaderboard'];
  const showNav = !hideNavRoutes.includes(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/install" element={<Install />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/earn" element={<ProtectedRoute><Earn /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
        <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/vip" element={<ProtectedRoute><VIP /></ProtectedRoute>} />
        <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
        <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
        <Route path="/videos" element={<ProtectedRoute><Videos /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
        <Route path="/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} />
        <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
        <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showNav && <BottomNav />}
      {!hideNavRoutes.includes(location.pathname) && <AIChatbot />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
