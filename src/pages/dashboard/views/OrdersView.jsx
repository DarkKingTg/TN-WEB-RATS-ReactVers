import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Info,
  RefreshCw,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/Primitives';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import OrderDetailsModal from '../../../components/dashboard/OrderDetailsModal';
import { useAuth } from '../../../context/AuthContext';
import { useDashboard } from '../../../context/DashboardContext';
import {
  buildOrderStatusPatch,
  getCustomerTypeLabel,
  getOrderDisplayId,
  getOrderPriorityBadgeClass,
  getOrderPriorityLabel,
  getOrderStatusOptions,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  normalizeOrderStatus,
} from '../../../utils/orderHelpers';

const OrdersView = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { searchQuery, setSearchQuery } = useDashboard();
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [assignModal, setAssignModal] = useState({ open: false, orderId: null });
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const statusOptions = getOrderStatusOptions(userProfile?.role);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchWorkers = async () => {
      try {
        const workerSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'worker')));
        setWorkers(workerSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching workers:', error);
      }
    };

    fetchWorkers();

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Orders snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredOrders = orders.filter((order) => {
    const queryText = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (order.name || order.customerName || '').toLowerCase().includes(queryText) ||
      (order.email || order.customerEmail || '').toLowerCase().includes(queryText) ||
      (order.service || '').toLowerCase().includes(queryText) ||
      getOrderDisplayId(order).toLowerCase().includes(queryText);
    const matchesStatus =
      !statusFilter || normalizeOrderStatus(order.status) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (order, nextStatus) => {
    try {
      const payload = buildOrderStatusPatch(nextStatus);

      await updateDoc(doc(db, 'orders', order.id), payload);

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, ...payload }
            : item
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleTogglePayment = async (order) => {
    const current = String(order.paymentStatus || '').toLowerCase();
    const next =
      current === 'paid' ? 'Pending' : current === 'pending' ? 'Partial' : 'Paid';

    try {
      await updateDoc(doc(db, 'orders', order.id), { paymentStatus: next });
      setOrders((currentOrders) =>
        currentOrders.map((item) =>
          item.id === order.id ? { ...item, paymentStatus: next } : item
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const openAssignModal = (order) => {
    setAssignModal({ open: true, orderId: order.id });
    const currentWorkers = Array.isArray(order.assignedWorkers)
      ? order.assignedWorkers
      : order.workerAssigned
      ? [order.workerAssigned]
      : [];
    setSelectedWorkers(currentWorkers);
  };

  const handleSaveAssignment = async () => {
    if (!assignModal.orderId) return;

    try {
      const selectedOrder = orders.find((order) => order.id === assignModal.orderId);
      const primaryWorkerId = selectedWorkers[0] || null;
      const primaryWorker = workers.find((worker) => worker.id === primaryWorkerId);
      const assignmentStatusPatch =
        normalizeOrderStatus(selectedOrder?.status) === "pending_assignment"
          ? buildOrderStatusPatch("assigned")
          : {};

      await updateDoc(doc(db, 'orders', assignModal.orderId), {
        ...assignmentStatusPatch,
        assignedWorkers: selectedWorkers,
        workerAssigned: primaryWorkerId,
        workerAssignedName: primaryWorker?.name || null,
        assignedTo: primaryWorkerId,
        assignedToName: primaryWorker?.name || null,
        assignmentStatus: 'approved',
        pendingAssignedWorkers: [],
        assignedAt: serverTimestamp(),
      });

      setAssignModal({ open: false, orderId: null });
      setOrders((current) =>
        current.map((order) =>
          order.id === assignModal.orderId
            ? {
                ...order,
                assignedWorkers: selectedWorkers,
                workerAssigned: primaryWorkerId,
                workerAssignedName: primaryWorker?.name || null,
                assignedTo: primaryWorkerId,
                assignedToName: primaryWorker?.name || null,
                assignmentStatus: 'approved',
                pendingAssignedWorkers: [],
                ...buildOrderStatusPatch(
                  normalizeOrderStatus(order.status) === "pending_assignment"
                    ? "assigned"
                    : normalizeOrderStatus(order.status)
                ),
              }
            : order
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white italic">
            Orders{' '}
            <span className="ml-2 text-sm font-mono uppercase tracking-[0.2em] text-cyan-primary not-italic">
              // Assignment Desk
            </span>
          </h2>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/20">
            Review bookings with priority, deadlines, customer type, payments,
            and worker assignment
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-primary"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search orders..."
              className="w-full rounded-xl border border-white/8 bg-[#1B241A] px-10 py-2.5 text-xs outline-none transition-colors hover:border-white/12 focus:border-cyan-primary sm:w-72"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-white/8 bg-[#1B241A] px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] outline-none focus:border-cyan-primary"
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-white/8 bg-[#1B241A] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-white/8 bg-white/5 text-[10px] font-mono uppercase tracking-[0.18em] text-white/35">
              <tr>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Client</th>
                <th className="px-5 py-4">Priority / Deadline</th>
                <th className="px-5 py-4">Customer Type</th>
                <th className="px-5 py-4">Payment</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Workers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-20 text-center text-xs font-mono uppercase tracking-[0.24em] text-white/20 animate-pulse"
                  >
                    Loading order ledger...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-20 text-center text-xs font-mono uppercase tracking-[0.24em] text-white/20"
                  >
                    No orders match the current filter
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="align-top hover:bg-white/2 cursor-pointer group"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-5 py-5">
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/70 group-hover:text-cyan-primary transition-colors">
                        {getOrderDisplayId(order)}
                      </div>
                      <div className="mt-2 text-base font-bold text-white group-hover:text-cyan-primary transition-colors">
                        {order.service}
                      </div>
                      <div className="mt-1 text-sm text-white/45">
                        {order.plan || order.package || 'Custom'} · ₹
                        {Number(
                          order.totalPrice || order.finalPrice || order.price || 0
                        ).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <div className="text-sm font-semibold text-white">
                        {order.name || order.customerName || 'Guest client'}
                      </div>
                      <div className="mt-1 text-xs text-white/40">
                        {order.email || order.customerEmail || 'No email'}
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] ${getOrderPriorityBadgeClass(
                          order
                        )}`}
                      >
                        {getOrderPriorityLabel(order)}
                      </span>
                      <div className="mt-3 text-sm font-semibold text-white">
                        {order.deadline || 'Flexible'}
                      </div>
                    </td>

                    <td className="px-5 py-5 text-sm font-semibold text-white">
                      {getCustomerTypeLabel(order)}
                    </td>

                    <td className="px-5 py-5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePayment(order);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/60 transition-colors hover:text-white"
                      >
                        {order.paymentStatus || 'Pending'}
                        <RefreshCw size={11} />
                      </button>
                    </td>

                    <td className="px-5 py-5">
                      <select
                        value={normalizeOrderStatus(order.status)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(event) =>
                          handleUpdateStatus(order, event.target.value)
                        }
                        className={`rounded-xl border bg-black/25 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] outline-none ${getOrderStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {getOrderStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-5">
                      <div className="space-y-2">
                        <div className="text-sm text-white/55">
                          {Array.isArray(order.assignedWorkers) &&
                          order.assignedWorkers.length > 0
                            ? order.assignedWorkers
                                .map(
                                  (workerId) =>
                                    workers.find((worker) => worker.id === workerId)
                                      ?.name || workerId.slice(0, 6)
                                )
                                .join(', ')
                            : 'Unassigned'}
                        </div>
                        {order.assignmentStatus === 'pending_approval' && (
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-yellow-400">
                            Approval Pending
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignModal(order);
                          }}
                          className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-primary"
                        >
                          <UserPlus size={12} /> Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onMouseDown={() => setAssignModal({ open: false, orderId: null })}
            className="absolute inset-0 bg-black/75 backdrop-blur"
          />
          <div
            className="relative z-10 w-full max-w-xl rounded-[28px] border border-white/10 bg-[#1B241A] p-6 shadow-2xl"
          >
              <button
                type="button"
                onClick={() => setAssignModal({ open: false, orderId: null })}
                className="absolute right-5 top-5 text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                Assign Workers
              </div>
              <h3 className="mt-3 text-2xl font-black text-white">
                Select team members
              </h3>

              <div className="mt-6 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                {workers.map((worker) => (
                  <label
                    key={worker.id}
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors ${
                      selectedWorkers.includes(worker.id)
                        ? 'border-cyan-primary bg-cyan-primary/10'
                        : 'border-white/8 bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedWorkers.includes(worker.id)}
                      onChange={() =>
                        setSelectedWorkers((current) =>
                          current.includes(worker.id)
                            ? current.filter((item) => item !== worker.id)
                            : [...current, worker.id]
                        )
                      }
                    />
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        selectedWorkers.includes(worker.id)
                          ? 'border-cyan-primary bg-cyan-primary text-primary-dark'
                          : 'border-white/20'
                      }`}
                    >
                      {selectedWorkers.includes(worker.id) && (
                        <CheckCircle size={12} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {worker.name}
                      </div>
                      <div className="text-xs text-white/40">{worker.email}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAssignModal({ open: false, orderId: null })}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveAssignment}>
                  Save Assignment
                </Button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersView;
