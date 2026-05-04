import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock3,
  ExternalLink,
  Package,
  UserRound,
} from 'lucide-react';
import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import OrderDetailsModal from '../../../components/dashboard/OrderDetailsModal';
import {
  buildOrderStatusPatch,
  getCustomerTypeLabel,
  getOrderDisplayId,
  getNextWorkerOrderStatus,
  getOrderPriorityBadgeClass,
  getOrderPriorityLabel,
  getOrderProgress,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  getWorkerVisibleStatuses,
  normalizeOrderStatus,
  sortRecordsByCreatedAtDesc,
} from '../../../utils/orderHelpers';

const FILTERS = getWorkerVisibleStatuses();

const MyOrdersView = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('assigned');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'orders'), 
      where('assignedWorkers', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(
        sortRecordsByCreatedAtDesc(
          snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        )
      );
      setLoading(false);
    }, (err) => {
      console.error("MyOrders snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredOrders = orders.filter(
    (order) => normalizeOrderStatus(order.status) === statusFilter
  );

  const handleUpdateStatus = async (order, nextStatus) => {
    try {
      const payload = buildOrderStatusPatch(nextStatus);
      await updateDoc(doc(db, 'orders', order.id), payload);

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                ...payload,
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white italic">
            My Orders{' '}
            <span className="ml-2 text-sm font-mono uppercase tracking-[0.2em] text-cyan-primary not-italic">
              // Worker Queue
            </span>
          </h2>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/20">
            Priority tags, deadlines, customer type, and delivery progress for
            your assigned work
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-xl border px-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] transition-all ${
                statusFilter === filter
                  ? 'border-cyan-primary bg-cyan-primary text-primary-dark'
                  : 'border-white/8 bg-white/5 text-white/40 hover:border-white/16'
              }`}
            >
              {getOrderStatusLabel(filter)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {loading ? (
          <div className="col-span-full py-32 text-center font-mono text-[10px] uppercase tracking-[0.4em] text-white/20 animate-pulse">
            Loading assigned orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="col-span-full rounded-[32px] border border-dashed border-white/10 bg-white/2 px-8 py-24 text-center">
            <Package size={56} className="mx-auto mb-5 text-white/12" />
            <div className="text-lg font-black text-white/50">
              No orders in this stage
            </div>
            <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-white/20">
              When new assignments land, they will appear here first.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const progress = getOrderProgress(order.status);
            const nextStatus = getNextWorkerOrderStatus(order);

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="rounded-[30px] border border-white/8 bg-[#1B241A] p-7 shadow-2xl cursor-pointer group hover:border-cyan-primary/20 transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-primary/70 group-hover:text-cyan-primary transition-colors">
                      {getOrderDisplayId(order)}
                    </div>
                    <h3 className="mt-3 text-2xl font-black text-white group-hover:text-cyan-primary transition-colors">
                      {order.service}
                    </h3>
                    <div className="mt-2 text-sm text-white/45">
                      {order.plan || order.package || 'Custom'} plan
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] ${getOrderStatusBadgeClass(
                        order.status
                      )}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] ${getOrderPriorityBadgeClass(
                        order
                      )}`}
                    >
                      {getOrderPriorityLabel(order)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <InfoCard
                    icon={Calendar}
                    label="Deadline"
                    value={order.deadline || 'Flexible'}
                  />
                  <InfoCard
                    icon={UserRound}
                    label="Customer Type"
                    value={getCustomerTypeLabel(order)}
                  />
                  <InfoCard
                    icon={Clock3}
                    label="Payment"
                    value={order.paymentStatus || 'Pending'}
                  />
                </div>

                <div className="mt-6 rounded-[24px] border border-white/8 bg-black/30 p-5">
                  <div className="flex items-center justify-between gap-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-cyan-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/55">
                    {order.projectDescription ||
                      order.requirements?.projectDescription ||
                      'No requirement notes were added for this order.'}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {order.driveLink || order.references ? (
                    <a
                      href={order.driveLink || order.references}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/60 transition-colors hover:text-white"
                      >
                        <ExternalLink size={14} /> Open Assets
                      </button>
                    </a>
                  ) : null}

                  {nextStatus ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order, nextStatus)}
                      className="flex items-center gap-2 rounded-2xl bg-cyan-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-primary-dark transition-transform hover:scale-[1.01]"
                    >
                      <CheckCircle size={14} /> Mark {getOrderStatusLabel(nextStatus)}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-green-400">
                      <CheckCircle size={14} /> Waiting On Client / Admin
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-start gap-4 rounded-[28px] border border-white/8 bg-[#1B241A]/70 p-6">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-cyan-primary" />
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] leading-relaxed text-white/28">
          Priority orders should be accepted first. Keep the order status moving
          as soon as work actually begins so the client dashboard and
          notifications stay accurate.
        </p>
      </div>

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder}
          userRole={userProfile?.role}
          onClose={() => setSelectedOrder(null)}
          onContact={() => {
            setSelectedOrder(null);
            navigate(`/messages?id=${selectedOrder.id}`);
          }}
          onUpdateStatus={(o, s) => handleUpdateStatus(o, s)}
        />
      )}
    </div>
  );
};

const InfoCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/35 text-cyan-primary">
        <Icon size={16} />
      </div>
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/30">
          {label}
        </div>
        <div className="mt-1 text-sm font-semibold text-white">{value}</div>
      </div>
    </div>
  </div>
);

export default MyOrdersView;
