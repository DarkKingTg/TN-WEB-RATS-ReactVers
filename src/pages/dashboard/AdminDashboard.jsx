import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Box,
  Calendar,
  Clock,
  DollarSign,
  Inbox,
  TrendingUp,
  Users,
} from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { db } from '../../config/firebase';
import {
  getCustomerTypeLabel,
  getOrderAmount,
  getOrderPriorityBadgeClass,
  getOrderPriorityLabel,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  normalizeOrderStatus,
} from '../../utils/orderHelpers';
import OrdersView from './views/OrdersView';
import OrderPoolView from './views/OrderPoolView';
import UsersView from './views/UsersView';
import ReferralsView from './views/ReferralsView';
import ReviewsView from './views/ReviewsView';
import MyOrdersView from './views/MyOrdersView';
import AnalyticsView from './views/AnalyticsView';

const AdminDashboard = () => (
  <DashboardLayout>
    {({ currentView }) => (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="h-full w-full"
        >
          {currentView === 'overview' && <OverviewTab />}
          {currentView === 'orders' && <OrdersView />}
          {currentView === 'users' && <UsersView />}
          {currentView === 'referrals' && <ReferralsView />}
          {currentView === 'reviews' && <ReviewsView />}
          {currentView === 'orderpool' && <OrderPoolView />}
          {currentView === 'analytics' && <AnalyticsView />}
        </motion.div>
      </AnimatePresence>
    )}
  </DashboardLayout>
);

const OverviewTab = () => {
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);

      try {
        const [orderSnapshot, userSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'users')),
        ]);

        const orders = orderSnapshot.docs.map((orderDoc) => ({
          id: orderDoc.id,
          ...orderDoc.data(),
        }));
        const users = userSnapshot.docs.map((userDoc) => userDoc.data());

        const activeOrders = orders.filter(
          (order) => !['completed', 'cancelled'].includes(normalizeOrderStatus(order.status))
        );
        const bookedValue = orders.reduce(
          (sum, order) => sum + getOrderAmount(order),
          0
        );
        const staffCount = users.filter(
          (account) => account.role && account.role !== 'client'
        ).length;

        setRecentOrders(orders.slice(0, 6));
        setStats([
          { label: 'Total Orders', value: String(orders.length), icon: Inbox, color: 'text-cyan-primary' },
          { label: 'Active Orders', value: String(activeOrders.length), icon: Clock, color: 'text-secondary-dark' },
          { label: 'Booked Value', value: `₹${bookedValue.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-accent' },
          { label: 'Staff Count', value: String(staffCount), icon: Users, color: 'text-light-gray' },
        ]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic">
            Overview{' '}
            <span className="ml-2 text-sm font-mono uppercase tracking-[0.2em] text-cyan-primary not-italic">
              // Operations
            </span>
          </h1>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/20">
            One operational view for orders, referrals, delivery flow, and team load
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-control-default px-6 py-3 text-[10px] font-mono uppercase tracking-widest transition-colors hover:bg-control-hover">
            <Calendar size={14} /> Live Range
          </button>
          <button className="rounded-xl border border-cyan-primary/20 bg-secondary-dark/10 px-6 py-3 text-[10px] font-mono uppercase tracking-widest text-cyan-primary transition-colors hover:bg-secondary-dark/30">
            Export Snapshot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const displayValue =
            typeof stat.value === "string"
              ? stat.value.replace(/[^\x00-\x7F]+/g, "Rs ")
              : stat.value;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-control-default p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-control-default ${stat.color}`}>
                  <Icon size={22} />
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono font-black text-green-400">
                  <TrendingUp size={12} /> live
                </div>
              </div>
              <div className="text-3xl font-black text-white">{displayValue}</div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/28">
                {stat.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 pb-20 lg:grid-cols-3">
        <div className="overflow-hidden rounded-[2.5rem] border border-white/8 bg-control-default shadow-2xl lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/8 bg-primary-dark p-8">
            <h3 className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-cyan-primary">
              <Box size={16} /> Latest Orders
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/8 bg-control-hover text-[9px] font-mono uppercase tracking-widest text-white/20">
                  <th className="px-8 py-5">Order</th>
                  <th className="px-8 py-5">Service</th>
                  <th className="px-8 py-5">Priority / Deadline</th>
                  <th className="px-8 py-5">Customer Type</th>
                  <th className="px-8 py-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {loading ? (
                  Array(6)
                    .fill(0)
                    .map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td colSpan="5" className="h-12 bg-control-default px-8 py-6" />
                      </tr>
                    ))
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-8 py-20 text-center text-xs font-mono uppercase tracking-widest text-white/10 italic"
                    >
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-control-default">
                      <td className="px-8 py-6 font-mono text-[11px] text-cyan-primary/50">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-white">{order.service}</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-white/25">
                          {order.plan || order.package}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`w-fit rounded-full border px-3 py-1 text-[8px] font-mono font-black uppercase tracking-[0.2em] ${getOrderPriorityBadgeClass(
                              order
                            )}`}
                          >
                            {getOrderPriorityLabel(order)}
                          </span>
                          <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                            {order.deadline || 'Flexible'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-[10px] font-mono uppercase tracking-widest text-white/40">
                        {getCustomerTypeLabel(order)}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          <span
                            className={`rounded-full border px-3 py-1 text-[8px] font-mono font-black uppercase tracking-[0.2em] ${getOrderStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/8 bg-control-default p-8 shadow-2xl">
            <h3 className="mb-8 flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-cyan-primary">
              <Bell size={16} /> Operations Notes
            </h3>
            <div className="space-y-6">
              {[
                'Priority orders should be assigned first.',
                'Returning customers now use a 50 percent upfront split.',
                'Student referral pricing is stored directly on the order.',
              ].map((message, index) => (
                <div key={message} className="flex gap-4">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-primary" />
                  <div>
                    <div className="text-sm font-semibold text-white/75">{message}</div>
                    <div className="mt-1 text-[9px] font-mono uppercase tracking-widest text-white/20">
                      note {index + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-white/8 bg-gradient-to-br from-control-default to-control-hover p-10 shadow-2xl">
            <h4 className="text-lg font-black text-white italic">
              Booking Flow <span className="text-cyan-primary">Synced</span>
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
