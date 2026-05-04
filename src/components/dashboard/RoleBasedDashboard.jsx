import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { normalizeRole } from '../../utils/systemRules';

const AdminDashboard = lazy(() => import('../../pages/dashboard/AdminDashboard'));
const WorkerDashboard = lazy(() => import('../../pages/dashboard/WorkerDashboard'));

const RoleBasedDashboard = () => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
    <div className="min-h-screen bg-control-hover flex items-center justify-center">
      <div className="text-cyan-primary text-sm font-mono animate-pulse">Loading dashboard...</div>
    </div>
    );
  }

  const role = normalizeRole(userProfile?.role);

  const dashboardFallback = (
    <div className="min-h-screen bg-[#2F5E22] flex items-center justify-center">
      <div className="text-cyan-primary text-sm font-mono animate-pulse">Loading dashboard...</div>
    </div>
  );

  if (role === 'admin' || role === 'owner') {
    return (
      <Suspense fallback={dashboardFallback}>
        <AdminDashboard />
      </Suspense>
    );
  }

  if (role === 'worker') {
    return (
      <Suspense fallback={dashboardFallback}>
        <WorkerDashboard />
      </Suspense>
    );
  }

  return <Navigate to="/profile" replace />;
};

export default RoleBasedDashboard;
