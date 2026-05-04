import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Users,
  DollarSign,
  Package,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import {
  formatCurrency,
  getOrderPaymentSummary,
  isCompletedOrder,
  isOpenOrder,
  normalizeOrderStatus,
  toDateValue,
} from '../../../utils/orderHelpers';

const PIPELINE_ORDER = [
  { key: 'pending_assignment', label: 'Pending' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'delivered_preview', label: 'Preview' },
  { key: 'awaiting_final_payment', label: 'Final Pay' },
  { key: 'completed', label: 'Completed' },
];

const COLORS = ['#9BFF57', '#2F5E22', '#1B241A', '#F4FFF1', '#396927', '#0B120C'];

const AnalyticsView = () => {
  const [data, setData] = useState({
    revenue: [],
    services: [],
    performance: [],
    stats: {
      totalRevenue: 0,
      totalOrders: 0,
      registeredUsers: 0,
      completionRate: 0,
      activeOrders: 0,
      completedOrders: 0,
      paidOrders: 0,
      clientCount: 0,
      staffCount: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [orderSnapshot, userSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'asc'))),
          getDocs(collection(db, 'users')),
        ]);

        const orders = orderSnapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        const users = userSnapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        const revenueMap = new Map();
        const serviceMap = new Map();
        const pipelineMap = new Map(PIPELINE_ORDER.map((item) => [item.key, 0]));

        let totalRevenue = 0;
        let paidOrders = 0;

        orders.forEach((order) => {
          const paymentSummary = getOrderPaymentSummary(order);
          const paidAmount = Number(paymentSummary.paid || 0);

          if (paidAmount > 0) {
            totalRevenue += paidAmount;
            paidOrders += 1;

            const paymentDate = toDateValue(
              paymentSummary.status === 'paid'
                ? order.completedAt ||
                    order.closedAt ||
                    order.updatedAt ||
                    order.advancePaidAt ||
                    order.createdAt
                : order.advancePaidAt || order.createdAt || order.updatedAt
            );

            if (paymentDate) {
              const label = paymentDate.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              });
              revenueMap.set(label, (revenueMap.get(label) || 0) + paidAmount);
            }
          }

          const serviceName = order.service || 'Unknown';
          serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + 1);

          const statusKey = normalizeOrderStatus(
            order.statusKey || order.status || order.orderStatus
          );
          if (pipelineMap.has(statusKey)) {
            pipelineMap.set(statusKey, (pipelineMap.get(statusKey) || 0) + 1);
          }
        });

        const revenueData = Array.from(revenueMap.entries()).map(([date, amount]) => ({
          date,
          amount,
        }));
        const serviceData = Array.from(serviceMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((left, right) => right.value - left.value)
          .slice(0, 6);
        const performanceData = PIPELINE_ORDER.map((item) => ({
          label: item.label,
          value: pipelineMap.get(item.key) || 0,
        }));

        const completedOrders = orders.filter(isCompletedOrder).length;
        const activeOrders = orders.filter(isOpenOrder).length;
        const staffCount = users.filter(
          (item) => item.role && String(item.role).toLowerCase() !== 'client'
        ).length;
        const clientCount = users.length - staffCount;

        setData({
          revenue: revenueData,
          services: serviceData,
          performance: performanceData,
          stats: {
            totalRevenue,
            totalOrders: orders.length,
            registeredUsers: users.length,
            completionRate: Math.round((completedOrders / orders.length) * 100) || 0,
            activeOrders,
            completedOrders,
            paidOrders,
            clientCount,
            staffCount,
          },
        });
      } catch (error) {
        console.error('Analytics Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            Decrypting Business Intel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white italic">
            Business{' '}
            <span className="text-cyan-primary not-italic font-mono uppercase text-sm tracking-[0.2em] ml-2">
              // Intelligence
            </span>
          </h1>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1 italic font-bold">
            // Strategic oversight & growth metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Platform Revenue',
            value: formatCurrency(data.stats.totalRevenue),
            icon: <DollarSign />,
            meta: `${data.stats.paidOrders} orders with payment logged`,
            color: 'text-accent',
          },
          {
            label: 'Booking Volume',
            value: data.stats.totalOrders,
            icon: <Package />,
            meta: `${data.stats.activeOrders} orders still in motion`,
            color: 'text-cyan-primary',
          },
          {
            label: 'Registered Users',
            value: data.stats.registeredUsers,
            icon: <Users />,
            meta: `${data.stats.clientCount} clients / ${data.stats.staffCount} staff`,
            color: 'text-secondary-dark',
          },
          {
            label: 'Fulfillment Rate',
            value: `${data.stats.completionRate}%`,
            icon: <CheckCircle />,
            meta: `${data.stats.completedOrders} completed orders`,
            color: 'text-secondary-dark',
          },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="bg-[#1B241A] border border-white/5 p-8 rounded-[2rem] shadow-2xl"
          >
            <div className="flex justify-between items-start mb-6 gap-4">
              <div
                className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}
              >
                {stat.icon}
              </div>
              <div className="text-[9px] text-right font-mono text-white/20 uppercase tracking-widest">
                {stat.meta}
              </div>
            </div>
            <div className="text-2xl font-black text-white mb-1 font-mono">{stat.value}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/20">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1B241A] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl h-[400px] min-h-[300px]">
          <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-primary mb-8 flex items-center gap-3">
            <TrendingUp size={16} /> Revenue Intake
          </h3>
          {data.revenue.length === 0 ? (
            <div className="flex h-[80%] min-h-[240px] items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
              Payment activity will appear here once orders start clearing
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="80%" minHeight={240}>
              <AreaChart data={data.revenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9BFF57" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9BFF57" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Collected']}
                  contentStyle={{
                    backgroundColor: '#2F5E22',
                    border: '1px solid rgba(155, 255, 87,0.2)',
                    borderRadius: '12px',
                  }}
                  itemStyle={{ color: '#9BFF57', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#9BFF57"
                  fillOpacity={1}
                  fill="url(#colorRev)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[#1B241A] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl h-[400px] min-h-[300px]">
          <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-primary mb-8 flex items-center gap-3">
            <Activity size={16} /> Service Dominance
          </h3>
          {data.services.length === 0 ? (
            <div className="flex h-[80%] min-h-[240px] items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
              Service distribution unlocks after the first booking batch
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="80%" minHeight={240}>
              <PieChart>
                <Pie
                  data={data.services}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.services.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    backgroundColor: '#2F5E22',
                    border: '1px solid rgba(155, 255, 87,0.2)',
                    borderRadius: '12px',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 bg-[#1B241A] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl h-[400px] min-h-[300px]">
          <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-primary mb-8 flex items-center gap-3">
            <Package size={16} /> Order Pipeline
          </h3>
          <ResponsiveContainer width="100%" height="80%" minHeight={240}>
            <BarChart data={data.performance}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.2)"
                fontSize={10}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.2)"
                fontSize={10}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                formatter={(value) => [value, 'Orders']}
                contentStyle={{
                  backgroundColor: '#2F5E22',
                  border: '1px solid rgba(155, 255, 87,0.2)',
                  borderRadius: '12px',
                }}
              />
              <Bar dataKey="value" fill="#9BFF57" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
