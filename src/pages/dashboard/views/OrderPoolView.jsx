import { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock3,
  Filter,
  Loader2,
  Package,
  Zap,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../context/AuthContext";
import OrderDetailsModal from "../../../components/dashboard/OrderDetailsModal";
import {
  buildOrderStatusPatch,
  formatCurrency,
  formatDate,
  getCustomerTypeLabel,
  getOrderAmount,
  getOrderDisplayId,
  getOrderPriorityBadgeClass,
  getOrderPriorityLabel,
  getOrderStatusLabel,
  isClaimablePoolOrder,
} from "../../../utils/orderHelpers";

const OrderPoolView = () => {
  const { user, userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [claimError, setClaimError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [orderForAssignment, setOrderForAssignment] = useState(null);

  useEffect(() => {
    if (!user?.uid) return undefined;

    setLoading(true);

    const unsubscribe = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(80)),
      (snapshot) => {
        const nextOrders = snapshot.docs
          .map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          }))
          .filter(isClaimablePoolOrder);

        setOrders(nextOrders);
        setLoading(false);
      },
      (error) => {
        console.error("Order pool error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!successMessage && !claimError) return undefined;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setClaimError("");
    }, 3200);

    return () => clearTimeout(timer);
  }, [successMessage, claimError]);

  const filteredOrders = orders.filter((order) => {
    if (filter === "priority") return Boolean(order.isPriority);
    if (filter === "standard") return !order.isPriority;
    return true;
  });

  const handleClaimOrder = async (orderId) => {
    if (!user?.uid) return;

    setClaimingId(orderId);
    setClaimError("");

    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        throw new Error("Order no longer exists.");
      }

      const orderData = { id: orderSnap.id, ...orderSnap.data() };
      if (!isClaimablePoolOrder(orderData)) {
        throw new Error("This order has already been assigned.");
      }

      const workerName = userProfile?.name || user.email || "Worker";

      await updateDoc(orderRef, {
        ...buildOrderStatusPatch("assigned"),
        assignedWorkers: [user.uid],
        workerAssigned: user.uid,
        workerAssignedName: workerName,
        assignedTo: user.uid,
        assignedToName: workerName,
        assignmentStatus: "approved",
        assignedAt: serverTimestamp(),
      });

      setSuccessMessage(`${getOrderDisplayId(orderData)} claimed successfully.`);
    } catch (error) {
      console.error("Claim error:", error);
      setClaimError(error.message || "Failed to claim order. Please try again.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white italic">
            Order Pool{" "}
            <span className="ml-2 text-sm font-mono uppercase tracking-[0.2em] text-cyan-primary not-italic">
              // Claim Queue
            </span>
          </h1>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
            Unassigned orders waiting for a worker to claim them
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#1B241A] px-4 py-3">
          <Filter size={14} className="text-white/35" />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="bg-transparent text-[10px] font-mono uppercase tracking-[0.16em] text-white/60 outline-none"
          >
            <option value="all">All Orders</option>
            <option value="priority">Priority Only</option>
            <option value="standard">Standard Only</option>
          </select>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-500/20 bg-[#0f1f15] px-4 py-3 text-sm text-green-400">
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}

      {claimError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-[#1a0f0f] px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} /> {claimError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={30} className="animate-spin text-cyan-primary" />
          <span className="ml-3 text-sm text-white/35">Loading order pool...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-[2rem] border border-white/8 bg-[#1B241A] px-8 py-20 text-center">
          <Package size={48} className="mx-auto mb-5 text-white/15" />
          <div className="text-xl font-black text-white/55">No claimable orders right now</div>
          <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-white/20">
            New unassigned bookings will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {filteredOrders.map((order) => {
            const orderTotal = getOrderAmount(order);
            const isClaiming = claimingId === order.id;

            return (
              <div
                key={order.id}
                className="rounded-[30px] border border-white/8 bg-[#1B241A] p-7 shadow-2xl cursor-pointer hover:border-white/20 transition-colors"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-primary/70">
                      {getOrderDisplayId(order)}
                    </div>
                    <h3 className="mt-3 text-2xl font-black text-white">
                      {order.service || "Untitled Service"}
                    </h3>
                    <div className="mt-2 text-sm text-white/45">
                      {order.plan || order.package || "Custom"} · {formatCurrency(orderTotal)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] ${getOrderPriorityBadgeClass(
                        order
                      )}`}
                    >
                      {getOrderPriorityLabel(order)}
                    </span>
                    <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-amber-300">
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetaCard
                    icon={Calendar}
                    label="Deadline"
                    value={order.deadline || "Flexible"}
                  />
                  <MetaCard
                    icon={Package}
                    label="Customer Type"
                    value={getCustomerTypeLabel(order)}
                  />
                  <MetaCard
                    icon={Clock3}
                    label="Created"
                    value={formatDate(order.createdAt)}
                  />
                </div>

                <div className="mt-6 rounded-[24px] border border-white/8 bg-black/25 p-5">
                  <p className="text-sm leading-7 text-white/60">
                    {order.projectDescription ||
                      order.requirements?.projectDescription ||
                      "The client did not add a detailed brief yet."}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/28">
                    <Zap size={12} className="text-cyan-primary" />
                    Claiming this order moves it into your worker queue immediately
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(null);
                      setOrderForAssignment(order);
                      setShowAssignModal(true);
                    }}
                    disabled={isClaiming}
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-primary px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-primary-dark transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Claiming
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} /> Claim Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Assignment Confirmation Modal */}
      {showAssignModal && orderForAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[30px] border border-white/8 bg-[#1B241A] p-8 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-4">
              Claim Order
            </h2>
            <p className="text-white/60 mb-6">
              Are you sure you want to claim{' '}
              <span className="text-cyan-primary font-semibold">
                {orderForAssignment.service || 'this order'}
              </span>
              ? This will assign it to your queue immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setOrderForAssignment(null);
                }}
                className="flex-1 rounded-2xl border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleClaimOrder(orderForAssignment.id);
                  setShowAssignModal(false);
                  setOrderForAssignment(null);
                }}
                disabled={claimingId === orderForAssignment.id}
                className="flex-1 rounded-2xl bg-cyan-primary px-5 py-3 text-sm font-black uppercase tracking-wider text-primary-dark hover:opacity-90 disabled:opacity-50"
              >
                {claimingId === orderForAssignment.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Claiming...
                  </span>
                ) : (
                  'Confirm Claim'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetaCard = ({ icon, label, value }) => (
  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/35 text-cyan-primary">
        {icon({ size: 16 })}
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

export default OrderPoolView;
