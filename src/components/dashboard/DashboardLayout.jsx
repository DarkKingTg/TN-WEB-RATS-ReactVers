import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Menu, X, Home, List, Users, Ticket, Star, Wallet, 
  Bug, Box, CheckSquare, DollarSign, Briefcase, Key, AlertCircle,
  ExternalLink, Clock, Search, TrendingUp, Package,
  ArrowRightLeft, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  canAccessDashboardView,
  getAllowedDashboardViews,
  normalizeRole,
} from '../../utils/systemRules';
import ErrorBoundary from '../ui/ErrorBoundary';
import LogoutButton from '../ui/LogoutButton';

const DashboardLayout = ({ children }) => {
  const { user, userProfile, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useDashboard();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [currentView, setCurrentView] = useState('overview');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const navigate = useNavigate();


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const role = normalizeRole(userProfile?.role);
  const currentDateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const portalMeta = {
    admin: {
      title: "Admin Command",
      description: "Revenue, staffing, referrals, and approvals in one workspace.",
    },
    owner: {
      title: "Owner Command",
      description: "Full-system visibility for finance, roles, approvals, and delivery quality.",
    },
    worker: {
      title: "Production Queue",
      description: "Stay on top of active work, delivery status, and payout timing.",
    },
  }[role] || {
    title: "Workspace",
    description: "Manage the current queue with live order and finance data.",
  };
  
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Home size={18} />, roles: ['admin', 'owner', 'worker'] },
    { id: 'myorders', label: 'My Orders', icon: <Briefcase size={18} />, roles: ['worker'] },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} />, roles: ['admin', 'owner'] },
    { id: 'orders', label: 'Orders', icon: <List size={18} />, roles: ['admin', 'owner'] },
    { id: 'orderpool', label: 'Order Pool', icon: <Package size={18} />, roles: ['worker'] },
    { id: 'users', label: 'Users', icon: <Users size={18} />, roles: ['admin', 'owner'] },
    { id: 'referrals', label: 'Referrals', icon: <Ticket size={18} />, roles: ['admin', 'owner'] },
    { id: 'reviews', label: 'Reviews', icon: <Star size={18} />, roles: ['admin', 'owner', 'worker'] },
    { id: 'samples', label: 'Samples', icon: <Box size={18} />, roles: ['admin', 'owner', 'worker'] },
  ];

  const filteredNavItems = navItems.filter((item) =>
    canAccessDashboardView(role, item.id)
  );

  useEffect(() => {
    const allowedViews = getAllowedDashboardViews(role);
    if (!allowedViews.length) return;
    if (!allowedViews.includes(currentView)) {
      // Defer state update to avoid cascading render warning
      const firstView = allowedViews[0];
      setTimeout(() => setCurrentView(firstView), 0);
    }
  }, [role, currentView]);

  const handleLogout = async () => {
    await logout();
    navigate('/join?login=1');
  };

  return (
    <div className="min-h-screen text-light-gray flex bg-control-default overflow-hidden font-rajdhani relative">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 1024 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 bg-control-default border-r border-white/8 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-white/8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/Images/Icons/logo.jpg" alt="Rynix" className="w-8 h-8 rounded-full object-cover" />
            <div>
              <div className="text-sm font-black text-white leading-tight">RYNIX</div>
              <div className="text-[9px] font-mono text-cyan-primary uppercase tracking-widest">{role} Portal</div>
              <div className="mt-1 max-w-[180px] text-[10px] leading-4 text-white/32">
                {portalMeta.description}
              </div>
            </div>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-primary/40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="grow overflow-y-auto py-6 px-4 no-scrollbar">
          <div className="space-y-1">
            {filteredNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                   if (item.id === 'messages') {
                     navigate('/messages');
                   } else {
                     setCurrentView(item.id);
                   }
                   if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-all group ${
                  currentView === item.id 
                    ? 'border-cyan-primary/20 bg-cyan-primary/10 text-cyan-primary shadow-[0_0_20px_rgba(var(--rgb-accent),0.08)]' 
                    : 'border-transparent text-white/40 hover:border-white/8 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <span className={currentView === item.id ? 'text-cyan-primary' : 'text-white/20 group-hover:text-cyan-primary/60'}>
                  {item.icon}
                </span>
                <span className="text-sm font-semibold tracking-wide capitalize">{item.label}</span>
                {currentView === item.id && (
                   <motion.div layoutId="navIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-primary shadow-[0_0_10px_rgba(var(--rgb-accent),1)]" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User Card */}
        <div className="p-6 border-t border-white/8 bg-black/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-primary/10 flex items-center justify-center text-cyan-primary font-bold border border-cyan-primary/20">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{userProfile?.name || 'Loading...'}</div>
              <div className="text-[10px] text-white/30 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-primary/20 py-2.5 text-xs font-bold text-cyan-primary transition-colors hover:bg-cyan-primary/10"
          >
            <ArrowRightLeft size={14} /> Open Client Workspace
          </button>
          <div className="flex justify-center pt-1">
            <LogoutButton onClick={handleLogout} label="Sign Out" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="grow flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-control-default/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle navigation"
              className="text-white/40 transition-colors hover:text-cyan-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-primary/40 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-primary/72 mb-1">
                {portalMeta.title}
              </div>
              <div className="text-sm text-white/56">
                {portalMeta.description}
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="mb-1 text-[10px] font-mono uppercase tracking-widest text-white/20">
                {currentDateLabel}
              </div>
              <div className="text-sm font-mono text-cyan-primary">{currentTime}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 rounded-full border border-white/5 bg-black/30 px-4 py-2">
                <Search size={14} className="text-white/20" />
                <input
                  type="text"
                  placeholder="Search orders, users, IDs..."
                  className="w-48 bg-transparent border-none text-xs outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>

             <Link to="/" target="_blank" className="hidden sm:flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-cyan-primary transition-colors border border-white/5 px-4 py-2 rounded-full h-10">
                <ExternalLink size={14} /> Live Site
             </Link>
          </div>
        </header>

        {/* View Port */}
        <main className="grow overflow-y-auto px-6 py-8 lg:px-10 bg-primary-dark no-scrollbar relative z-10">
          <ErrorBoundary variant="module" key={currentView}>
            {children({ currentView })}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
