import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Ticket,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Button, Card } from "../../components/ui/Primitives";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useDashboard } from "../../context/DashboardContext";
import { apiRequest } from "../../services/apiClient";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getOrderAmount,
  getOrderDisplayId,
  getOrderPaymentSummary,
  getOrderPlanLabel,
  getOrderProgress,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  getPaymentStatusBadgeClass,
  getPaymentStatusLabel,
  isCompletedOrder,
  isOpenOrder,
} from "../../utils/orderHelpers";
import { normalizeRole } from "../../utils/systemRules";

const WEEK_DAYS = [
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
  { id: 0, label: "Sun" },
];

const CONTACT_METHODS = [
  { id: "chat", label: "Chat" },
  { id: "voice", label: "Voice" },
  { id: "video", label: "Video" },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-primary";

const listFromText = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const textFromList = (value) => (Array.isArray(value) ? value.join("\n") : "");

const sortByCreated = (records = []) =>
  [...records].sort((left, right) => {
    const leftTime = left.createdAt?.toDate?.()?.getTime?.() || 0;
    const rightTime = right.createdAt?.toDate?.()?.getTime?.() || 0;
    return rightTime - leftTime;
  });

const buildProfileForm = (profile = {}, user = null) => ({
  name: profile.name || user?.displayName || "",
  phone: profile.phone || "",
  customerType: profile.customerType || "new",
  organizationType: profile.organizationType || "college",
  organizationName: profile.organizationName || "",
  organizationAddress: profile.organizationAddress || "",
  organizationEmail: profile.organizationEmail || profile.email || user?.email || "",
});

const buildWorkerForm = (worker = {}) => ({
  skills: textFromList(worker.skills),
  portfolioLinks: textFromList(worker.portfolioLinks),
  workingDays: Array.isArray(worker.workingDays) && worker.workingDays.length
    ? worker.workingDays
    : [1, 2, 3, 4, 5],
  contactMethods: Array.isArray(worker.contactMethods) && worker.contactMethods.length
    ? worker.contactMethods
    : ["chat"],
  start: worker.availableHours?.start || "09:00",
  end: worker.availableHours?.end || "18:00",
  timezone: worker.availableHours?.timezone || "Asia/Kolkata",
  maxActiveOrders: Number(worker.maxActiveOrders || 3),
  availabilityStatus: worker.availabilityStatus || "available",
});

const Profile = () => {
  const { user, userProfile, logout, refreshProfile, fetchError } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useDashboard();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("overview");
  const [orderFilter, setOrderFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [workerApplications, setWorkerApplications] = useState([]);
  const [profileBundle, setProfileBundle] = useState({
    profile: null,
    workerProfile: null,
    workerApplication: null,
  });
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(userProfile, user));
  const [workerForm, setWorkerForm] = useState(() => buildWorkerForm());
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    whatsapp: true,
    inApp: true,
  });
  const [ticketForm, setTicketForm] = useState({
    orderId: "",
    type: "order",
    priority: "medium",
    title: "",
    description: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState("");

  const profile = profileBundle.profile || userProfile || {};
  const role = normalizeRole(profile.role || userProfile?.role);
  const isAdminLike = ["admin", "owner"].includes(role);
  const hasWorkerSurface =
    role === "worker" ||
    profile.workerApprovalStatus === "pending" ||
    Boolean(profileBundle.workerApplication);

  const activeOrders = orders.filter(isOpenOrder);
  const completedOrders = orders.filter(isCompletedOrder);
  const pendingPaymentOrders = orders
    .map((order) => ({ order, summary: getOrderPaymentSummary(order) }))
    .filter(({ summary }) => summary.pending > 0);
  const totalPaid = orders.reduce(
    (sum, order) => sum + getOrderPaymentSummary(order).paid,
    0
  );
  const totalPending = pendingPaymentOrders.reduce(
    (sum, item) => sum + item.summary.pending,
    0
  );

  const profileCompletion = useMemo(() => {
    const fields = [
      profile.name,
      profile.phone,
      profile.organizationName,
      profile.organizationAddress,
      profile.organizationEmail,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);

  const visibleOrders =
    orderFilter === "completed"
      ? completedOrders
      : orderFilter === "all"
        ? orders
        : activeOrders;

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: Package },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "profile", label: "Profile", icon: User },
    ...(hasWorkerSurface ? [{ id: "worker", label: "Worker Setup", icon: Briefcase }] : []),
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "support", label: "Tickets", icon: LifeBuoy },
    ...(isAdminLike ? [{ id: "admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  useEffect(() => {
    if (!user) {
      navigate("/join?login=1&return=/profile", { replace: true });
      return;
    }

    const loadProfileData = async () => {
      setLoading(true);
      try {
        const [bundle, prefs, ticketData] = await Promise.all([
          apiRequest("/profile", { authMode: "required" }).catch(() => null),
          apiRequest("/notification-settings", { authMode: "required" }).catch(() => null),
          apiRequest("/tickets", { authMode: "required" }).catch(() => null),
        ]);

        const nextProfile = bundle?.profile || userProfile || {};
        const nextWorker = bundle?.workerProfile || {};

        setProfileBundle({
          profile: nextProfile,
          workerProfile: bundle?.workerProfile || null,
          workerApplication: bundle?.workerApplication || null,
        });
        setProfileForm(buildProfileForm(nextProfile, user));
        setWorkerForm(buildWorkerForm(nextWorker));
        if (prefs?.preferences) setNotificationPrefs(prefs.preferences);
        if (ticketData?.tickets) setTickets(ticketData.tickets);
      } catch (error) {
        setStatus({
          type: "error",
          message: error.message || "Could not load profile data.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [navigate, user, userProfile]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const results = new Map();
    const updateOrders = (key, snapshot) => {
      results.set(
        key,
        snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      );
      const merged = new Map();
      Array.from(results.values())
        .flat()
        .forEach((order) => merged.set(order.id, order));
      setOrders(sortByCreated(Array.from(merged.values())));
    };

    const orderQueries = [
      ["userId", query(collection(db, "orders"), where("userId", "==", user.uid))],
      ["customerId", query(collection(db, "orders"), where("customerId", "==", user.uid))],
      ["workerAssigned", query(collection(db, "orders"), where("workerAssigned", "==", user.uid))],
      ["assignedTo", query(collection(db, "orders"), where("assignedTo", "==", user.uid))],
      [
        "assignedWorkers",
        query(collection(db, "orders"), where("assignedWorkers", "array-contains", user.uid)),
      ],
    ];

    const unsubscribes = orderQueries.map(([key, orderQuery]) =>
      onSnapshot(
        orderQuery,
        (snapshot) => updateOrders(key, snapshot),
        (error) => console.error("Order listener failed:", error)
      )
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    return onSnapshot(
      query(collection(db, "payments"), where("userId", "==", user.uid)),
      (snapshot) => {
        setPayments(
          sortByCreated(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
        );
      },
      (error) => console.error("Payments listener failed:", error)
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!isAdminLike) return;

    apiRequest("/users/worker-applications", { authMode: "required" })
      .then((data) => setWorkerApplications(data?.applications || []))
      .catch((error) => console.error("Worker application load failed:", error));
  }, [isAdminLike]);

  const showStatus = (type, message) => {
    setStatus({ type, message });
    window.setTimeout(() => setStatus({ type: "", message: "" }), 4500);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/join?login=1", { replace: true });
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaving("profile");
    try {
      const data = await apiRequest("/profile", {
        method: "PATCH",
        authMode: "required",
        body: profileForm,
      });
      setProfileBundle((current) => ({
        ...current,
        profile: { ...(current.profile || profile), ...(data?.profile || profileForm) },
      }));
      await refreshProfile(user.uid);
      showStatus("success", "Profile saved.");
    } catch (error) {
      showStatus("error", error.message || "Could not save profile.");
    } finally {
      setSaving("");
    }
  };

  const handleSaveWorker = async (event) => {
    event.preventDefault();
    setSaving("worker");
    try {
      const payload = {
        skills: listFromText(workerForm.skills),
        portfolioLinks: listFromText(workerForm.portfolioLinks),
        workingDays: workerForm.workingDays,
        contactMethods: workerForm.contactMethods,
        availableHours: {
          start: workerForm.start,
          end: workerForm.end,
          timezone: workerForm.timezone,
        },
        maxActiveOrders: Number(workerForm.maxActiveOrders || 3),
      };

      await apiRequest("/worker-profile", {
        method: "PUT",
        authMode: "required",
        body: payload,
      });
      await apiRequest("/worker-profile/availability", {
        method: "PATCH",
        authMode: "required",
        body: { status: workerForm.availabilityStatus },
      }).catch(() => null);

      setProfileBundle((current) => ({
        ...current,
        workerProfile: {
          ...(current.workerProfile || {}),
          ...payload,
          availabilityStatus: workerForm.availabilityStatus,
        },
      }));
      showStatus("success", "Worker preferences saved.");
    } catch (error) {
      showStatus("error", error.message || "Could not save worker preferences.");
    } finally {
      setSaving("");
    }
  };

  const handleNotificationToggle = async (key) => {
    const nextPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(nextPrefs);
    try {
      await apiRequest("/notification-settings", {
        method: "PATCH",
        authMode: "required",
        body: nextPrefs,
      });
      showStatus("success", "Notification settings saved.");
    } catch (error) {
      setNotificationPrefs(notificationPrefs);
      showStatus("error", error.message || "Could not save notification settings.");
    }
  };

  const handleTicketSubmit = async (event) => {
    event.preventDefault();
    setSaving("ticket");
    try {
      const data = await apiRequest("/tickets", {
        method: "POST",
        authMode: "required",
        body: {
          ...ticketForm,
          orderId: ticketForm.orderId || null,
        },
      });

      setTicketForm({
        orderId: "",
        type: "order",
        priority: "medium",
        title: "",
        description: "",
      });
      const ticketData = await apiRequest("/tickets", { authMode: "required" });
      setTickets(ticketData?.tickets || tickets);
      showStatus("success", `Ticket created: ${data?.ticketId || "saved"}.`);
    } catch (error) {
      showStatus("error", error.message || "Could not create ticket.");
    } finally {
      setSaving("");
    }
  };

  const handleCashfreePayment = async (order, amount) => {
    setSaving(`pay-${order.id}`);
    try {
      const data = await apiRequest("/payment/create-order", {
        method: "POST",
        authMode: "optional",
        body: {
          amount,
          orderId: order.id,
          userDetails: {
            name: profile.name || order.name || user.email,
            email: profile.email || user.email || order.email,
            phone: profile.phone || order.phone || "",
          },
        },
      });

      if (data?.paymentSessionId) {
        window.location.href = `https://payments.cashfree.com/checkout?session_id=${data.paymentSessionId}`;
        return;
      }

      throw new Error("Cashfree did not return a payment session.");
    } catch (error) {
      showStatus("error", `${error.message || "Payment could not start."} Use QR fallback from booking or raise a payment ticket.`);
    } finally {
      setSaving("");
    }
  };

  const reviewWorkerApplication = async (applicationUid, decision) => {
    setSaving(`${decision}-${applicationUid}`);
    try {
      await apiRequest("/users/approve-worker", {
        method: "POST",
        authMode: "required",
        body: { applicationUid, decision },
      });
      setWorkerApplications((current) =>
        current.map((item) =>
          item.uid === applicationUid || item.id === applicationUid
            ? { ...item, status: decision }
            : item
        )
      );
      showStatus("success", `Application ${decision}.`);
    } catch (error) {
      showStatus("error", error.message || "Could not review application.");
    } finally {
      setSaving("");
    }
  };

  const toggleWorkerDay = (dayId) => {
    setWorkerForm((current) => ({
      ...current,
      workingDays: current.workingDays.includes(dayId)
        ? current.workingDays.filter((item) => item !== dayId)
        : [...current.workingDays, dayId],
    }));
  };

  const toggleContactMethod = (methodId) => {
    setWorkerForm((current) => {
      const next = current.contactMethods.includes(methodId)
        ? current.contactMethods.filter((item) => item !== methodId)
        : [...current.contactMethods, methodId];
      return { ...current, contactMethods: next.length ? next : ["chat"] };
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#101318] text-light-gray">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-white/8 bg-black/20 px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <div>
              <Link to="/" className="text-2xl font-black text-white">
                RyNix
              </Link>
              <p className="mt-1 text-xs font-mono uppercase tracking-[0.18em] text-cyan-primary/70">
                {role} portal
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-colors hover:text-cyan-primary"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-lg font-black text-white">
              {profile.name || user.email}
            </div>
            <div className="mt-1 text-xs text-white/40">{profile.organizationName || "Profile not completed"}</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-cyan-primary"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-white/35">
              Profile {profileCompletion}% complete
            </div>
          </div>

          <nav className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
                    active
                      ? "border-cyan-primary/25 bg-cyan-primary/10 text-cyan-primary"
                      : "border-transparent text-white/45 hover:border-white/10 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {item.id === "notifications" && unreadCount > 0 ? (
                    <span className="ml-auto rounded-full bg-cyan-primary px-2 py-0.5 text-[10px] text-primary-dark">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {["worker", "admin", "owner"].includes(role) ? (
            <Link
              to="/dashboard"
              className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-cyan-primary/20 bg-cyan-primary/8 px-4 py-3 text-sm font-bold text-cyan-primary transition-colors hover:bg-cyan-primary/12"
            >
              Work Dashboard <ExternalLink size={15} />
            </Link>
          ) : null}
        </aside>

        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">
          <header className="mb-6 flex flex-col gap-4 border-b border-white/8 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-white md:text-4xl">
                {activeSection === "overview"
                  ? "Dashboard"
                  : navItems.find((item) => item.id === activeSection)?.label}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                Manage your RyNix profile, orders, payments, notifications, and support tickets from one role-aware page.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => refreshProfile(user.uid)}>
                <RefreshCcw size={15} /> Refresh
              </Button>
              <Button onClick={() => navigate("/book")}>
                New Project <Package size={15} />
              </Button>
            </div>
          </header>

          {(status.message || fetchError) && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                status.type === "success"
                  ? "border-cyan-primary/20 bg-cyan-primary/10 text-cyan-primary"
                  : "border-amber-500/20 bg-accent/10 text-amber-200"
              }`}
            >
              {status.message || fetchError}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeSection === "overview" && (
                <section className="space-y-6">
                  {profile.workerApprovalStatus === "pending" ? (
                    <NoticeCard
                      icon={Clock3}
                      title="Worker application pending"
                      description="Your client account is active. Admin approval will unlock worker access and the 10% worker referral code."
                    />
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Active Orders" value={activeOrders.length} icon={Package} />
                    <MetricCard label="Completed" value={completedOrders.length} icon={CheckCircle2} />
                    <MetricCard label="Paid" value={formatCurrency(totalPaid)} icon={Wallet} />
                    <MetricCard label="Pending" value={formatCurrency(totalPending)} icon={CreditCard} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                    <Card className="p-6">
                      <SectionHeader title="Recent Orders" action="View all" onAction={() => setActiveSection("orders")} />
                      <div className="mt-5 space-y-3">
                        {orders.slice(0, 4).map((order) => (
                          <CompactOrderRow key={order.id} order={order} />
                        ))}
                        {!orders.length && (
                          <EmptyBlock title="No orders yet" description="Start with a service booking and it will appear here." />
                        )}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <SectionHeader title="Account Snapshot" />
                      <div className="mt-5 space-y-3">
                        <InfoRow label="Role" value={role} />
                        <InfoRow label="Referral Code" value={profile.referralCode || "Not generated"} />
                        <InfoRow label="Discount Given" value={`${profile.discountPercent || 0}%`} />
                        <InfoRow label="Official Email" value={profile.organizationEmail || user.email} />
                      </div>
                    </Card>
                  </div>
                </section>
              )}

              {activeSection === "orders" && (
                <section className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["active", `Active (${activeOrders.length})`],
                      ["completed", `Completed (${completedOrders.length})`],
                      ["all", `All (${orders.length})`],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setOrderFilter(id)}
                        className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                          orderFilter === id
                            ? "border-cyan-primary/25 bg-cyan-primary/10 text-cyan-primary"
                            : "border-white/10 text-white/45 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {visibleOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onPay={(amount) => handleCashfreePayment(order, amount)}
                        paying={saving === `pay-${order.id}`}
                      />
                    ))}
                    {!visibleOrders.length && (
                      <EmptyBlock
                        title="Nothing in this view"
                        description="When orders match this filter, they will show here with status, payment, and delivery progress."
                      />
                    )}
                  </div>
                </section>
              )}

              {activeSection === "payments" && (
                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <Card className="p-6">
                    <SectionHeader title="Pending Payments" />
                    <div className="mt-5 space-y-3">
                      {pendingPaymentOrders.map(({ order, summary }) => (
                        <div key={order.id} className="rounded-xl border border-white/8 bg-black/25 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-black text-white">{order.service}</div>
                              <div className="mt-1 text-xs text-white/35">{getOrderDisplayId(order)}</div>
                            </div>
                            <div className="text-right text-sm font-black text-cyan-primary">
                              {formatCurrency(summary.dueNow)}
                            </div>
                          </div>
                          <Button
                            className="mt-4 w-full"
                            disabled={saving === `pay-${order.id}`}
                            onClick={() => handleCashfreePayment(order, summary.dueNow)}
                          >
                            {saving === `pay-${order.id}` ? "Starting..." : "Pay with Cashfree"}
                          </Button>
                        </div>
                      ))}
                      {!pendingPaymentOrders.length && (
                        <EmptyBlock title="No dues" description="All visible orders are settled or waiting for verification." />
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader title="Payment History" />
                    <div className="mt-5 space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/25 px-4 py-3">
                          <div>
                            <div className="text-sm font-bold text-white">{payment.title || payment.kind || "Payment"}</div>
                            <div className="mt-1 text-xs text-white/35">{formatDateTime(payment.createdAt || payment.updatedAt)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-cyan-primary">{formatCurrency(payment.amount)}</div>
                            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{payment.paymentStatus || payment.status}</div>
                          </div>
                        </div>
                      ))}
                      {!payments.length && (
                        <EmptyBlock title="No payment records" description="Cashfree and QR fallback records will appear after payment events." />
                      )}
                    </div>
                  </Card>
                </section>
              )}

              {activeSection === "profile" && (
                <form onSubmit={handleSaveProfile} className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
                  <Card className="p-6">
                    <SectionHeader title="Identity" />
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <Field label="Full Name" icon={User}>
                        <input className={`${inputClass} pl-10`} value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} required />
                      </Field>
                      <Field label="Phone" icon={Phone}>
                        <input className={`${inputClass} pl-10`} value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} required />
                      </Field>
                      <Field label="Customer Type" icon={Ticket}>
                        <select className={`${inputClass} pl-10`} value={profileForm.customerType} onChange={(event) => setProfileForm({ ...profileForm, customerType: event.target.value })}>
                          <option value="new">New</option>
                          <option value="returning">Returning</option>
                        </select>
                      </Field>
                      <Field label="Official Email" icon={Mail}>
                        <input type="email" className={`${inputClass} pl-10`} value={profileForm.organizationEmail} onChange={(event) => setProfileForm({ ...profileForm, organizationEmail: event.target.value })} required />
                      </Field>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader title="College / Company" />
                    <div className="mt-5 space-y-4">
                      <Field label="Type" icon={Briefcase}>
                        <select className={`${inputClass} pl-10`} value={profileForm.organizationType} onChange={(event) => setProfileForm({ ...profileForm, organizationType: event.target.value })}>
                          <option value="college">College</option>
                          <option value="company">Company</option>
                          <option value="startup">Startup</option>
                          <option value="other">Other</option>
                        </select>
                      </Field>
                      <Field label="Name" icon={Building2}>
                        <input className={`${inputClass} pl-10`} value={profileForm.organizationName} onChange={(event) => setProfileForm({ ...profileForm, organizationName: event.target.value })} required />
                      </Field>
                      <Field label="Address" icon={MapPin}>
                        <textarea className={`${inputClass} min-h-[130px] pl-10`} value={profileForm.organizationAddress} onChange={(event) => setProfileForm({ ...profileForm, organizationAddress: event.target.value })} required />
                      </Field>
                      <Button type="submit" disabled={saving === "profile"} className="w-full">
                        {saving === "profile" ? "Saving..." : "Save Profile"} <Check size={15} />
                      </Button>
                    </div>
                  </Card>
                </form>
              )}

              {activeSection === "worker" && (
                <form onSubmit={handleSaveWorker} className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
                  <Card className="p-6">
                    <SectionHeader title="Worker Availability" />
                    <div className="mt-5 space-y-5">
                      <Field label="Skills" icon={Briefcase}>
                        <textarea
                          className={`${inputClass} min-h-[130px] pl-10`}
                          placeholder="React, UI design, WordPress"
                          value={workerForm.skills}
                          onChange={(event) => setWorkerForm({ ...workerForm, skills: event.target.value })}
                          required
                        />
                      </Field>
                      <div className="grid gap-4 md:grid-cols-3">
                        <Field label="Start" icon={Clock3}>
                          <input type="time" className={`${inputClass} pl-10`} value={workerForm.start} onChange={(event) => setWorkerForm({ ...workerForm, start: event.target.value })} />
                        </Field>
                        <Field label="End" icon={Clock3}>
                          <input type="time" className={`${inputClass} pl-10`} value={workerForm.end} onChange={(event) => setWorkerForm({ ...workerForm, end: event.target.value })} />
                        </Field>
                        <Field label="Status" icon={ShieldCheck}>
                          <select className={`${inputClass} pl-10`} value={workerForm.availabilityStatus} onChange={(event) => setWorkerForm({ ...workerForm, availabilityStatus: event.target.value })}>
                            <option value="available">Available</option>
                            <option value="busy">Busy</option>
                            <option value="unavailable">Unavailable</option>
                          </select>
                        </Field>
                      </div>
                      <div>
                        <div className="mb-2 text-[10px] font-mono uppercase tracking-widest text-white/40">Working Days</div>
                        <div className="flex flex-wrap gap-2">
                          {WEEK_DAYS.map((day) => (
                            <ToggleChip key={day.id} active={workerForm.workingDays.includes(day.id)} onClick={() => toggleWorkerDay(day.id)}>
                              {day.label}
                            </ToggleChip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-[10px] font-mono uppercase tracking-widest text-white/40">Contact Methods</div>
                        <div className="flex flex-wrap gap-2">
                          {CONTACT_METHODS.map((method) => (
                            <ToggleChip key={method.id} active={workerForm.contactMethods.includes(method.id)} onClick={() => toggleContactMethod(method.id)}>
                              {method.label}
                            </ToggleChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader title="Portfolio" />
                    <div className="mt-5 space-y-4">
                      <Field label="Portfolio Links" icon={ExternalLink}>
                        <textarea
                          className={`${inputClass} min-h-[150px] pl-10`}
                          placeholder="One link per line"
                          value={workerForm.portfolioLinks}
                          onChange={(event) => setWorkerForm({ ...workerForm, portfolioLinks: event.target.value })}
                        />
                      </Field>
                      <Field label="Max Active Orders" icon={Package}>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className={`${inputClass} pl-10`}
                          value={workerForm.maxActiveOrders}
                          onChange={(event) => setWorkerForm({ ...workerForm, maxActiveOrders: event.target.value })}
                        />
                      </Field>
                      <NoticeCard
                        icon={AlertCircle}
                        title={profile.workerApprovalStatus === "pending" ? "Waiting for admin approval" : "Worker setup active"}
                        description={profile.workerApprovalStatus === "pending" ? "You can update preferences now. Work access opens after approval." : "Keep this accurate so admins can assign the right work."}
                      />
                      <Button type="submit" disabled={saving === "worker"} className="w-full">
                        {saving === "worker" ? "Saving..." : "Save Worker Setup"} <Check size={15} />
                      </Button>
                    </div>
                  </Card>
                </form>
              )}

              {activeSection === "notifications" && (
                <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                  <Card className="p-6">
                    <SectionHeader title="Preferences" />
                    <div className="mt-5 space-y-3">
                      {[
                        ["email", "Email updates"],
                        ["whatsapp", "WhatsApp updates"],
                        ["inApp", "In-app notifications"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleNotificationToggle(key)}
                          className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-black/25 px-4 py-3 text-left"
                        >
                          <span className="text-sm font-bold text-white">{label}</span>
                          <span className={`h-6 w-11 rounded-full p-1 transition-colors ${notificationPrefs[key] ? "bg-cyan-primary" : "bg-white/10"}`}>
                            <span className={`block h-4 w-4 rounded-full bg-primary-dark transition-transform ${notificationPrefs[key] ? "translate-x-5" : ""}`} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader title="Inbox" action={unreadCount ? "Mark all read" : ""} onAction={markAllAsRead} />
                    <div className="mt-5 space-y-3">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                            notification.read
                              ? "border-white/8 bg-black/20 text-white/45"
                              : "border-cyan-primary/18 bg-cyan-primary/8 text-white"
                          }`}
                        >
                          <div className="text-sm font-bold">{notification.title || "Notification"}</div>
                          <div className="mt-1 text-xs leading-5 text-white/45">{notification.message || notification.body}</div>
                        </button>
                      ))}
                      {!notifications.length && (
                        <EmptyBlock title="No notifications" description="Order updates and admin notices will collect here." />
                      )}
                    </div>
                  </Card>
                </section>
              )}

              {activeSection === "support" && (
                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <Card className="p-6">
                    <SectionHeader title="Create Ticket" />
                    <form onSubmit={handleTicketSubmit} className="mt-5 space-y-4">
                      <Field label="Related Order" icon={Package}>
                        <select className={`${inputClass} pl-10`} value={ticketForm.orderId} onChange={(event) => setTicketForm({ ...ticketForm, orderId: event.target.value })}>
                          <option value="">General ticket</option>
                          {orders.map((order) => (
                            <option key={order.id} value={order.id}>
                              {getOrderDisplayId(order)} - {order.service}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Type" icon={Ticket}>
                          <select className={`${inputClass} pl-10`} value={ticketForm.type} onChange={(event) => setTicketForm({ ...ticketForm, type: event.target.value })}>
                            <option value="order">Order</option>
                            <option value="payment">Payment</option>
                            <option value="worker">Worker</option>
                            <option value="client">Client</option>
                            <option value="bug">Bug</option>
                            <option value="other">Other</option>
                          </select>
                        </Field>
                        <Field label="Priority" icon={AlertCircle}>
                          <select className={`${inputClass} pl-10`} value={ticketForm.priority} onChange={(event) => setTicketForm({ ...ticketForm, priority: event.target.value })}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Title" icon={FileText}>
                        <input className={`${inputClass} pl-10`} value={ticketForm.title} onChange={(event) => setTicketForm({ ...ticketForm, title: event.target.value })} required />
                      </Field>
                      <Field label="Description" icon={LifeBuoy}>
                        <textarea className={`${inputClass} min-h-[150px] pl-10`} value={ticketForm.description} onChange={(event) => setTicketForm({ ...ticketForm, description: event.target.value })} required />
                      </Field>
                      <Button type="submit" disabled={saving === "ticket"} className="w-full">
                        {saving === "ticket" ? "Creating..." : "Create Ticket"} <Ticket size={15} />
                      </Button>
                    </form>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader title="Recent Tickets" />
                    <div className="mt-5 space-y-3">
                      {tickets.map((ticket) => (
                        <div key={ticket.id} className="rounded-xl border border-white/8 bg-black/25 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-black text-white">{ticket.title}</div>
                              <div className="mt-1 text-xs text-white/35">{ticket.type} - {formatDate(ticket.createdAt)}</div>
                            </div>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-white/45">
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {!tickets.length && (
                        <EmptyBlock title="No tickets yet" description="Tickets are the support channel for now. Chat is reserved for a later release." />
                      )}
                    </div>
                  </Card>
                </section>
              )}

              {activeSection === "admin" && (
                <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                  <Card className="p-6">
                    <SectionHeader title="Admin Shortcuts" />
                    <div className="mt-5 space-y-3">
                      <LinkButton to="/dashboard" icon={LayoutDashboard} label="Open operations dashboard" />
                      <LinkButton to="/dashboard?view=users" icon={Users} label="Manage users" />
                      <LinkButton to="/dashboard?view=orders" icon={Package} label="Manage orders" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader title="Worker Applications" />
                    <div className="mt-5 space-y-3">
                      {workerApplications.map((application) => {
                        const appUid = application.uid || application.id;
                        return (
                          <div key={appUid} className="rounded-xl border border-white/8 bg-black/25 p-4">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div>
                                <div className="text-sm font-black text-white">{application.name}</div>
                                <div className="mt-1 text-xs text-white/35">{application.email} - {application.organizationName}</div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {(application.skills || []).slice(0, 6).map((skill) => (
                                    <span key={skill} className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/45">{skill}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  disabled={saving === `approved-${appUid}` || application.status === "approved"}
                                  onClick={() => reviewWorkerApplication(appUid, "approved")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  disabled={saving === `rejected-${appUid}` || application.status === "rejected"}
                                  onClick={() => reviewWorkerApplication(appUid, "rejected")}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!workerApplications.length && (
                        <EmptyBlock title="No applications" description="Worker applications submitted without invite keys will show here." />
                      )}
                    </div>
                  </Card>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, action, onAction }) => (
  <div className="flex items-center justify-between gap-4">
    <h2 className="text-xl font-black text-white">{title}</h2>
    {action ? (
      <button type="button" onClick={onAction} className="text-xs font-bold text-cyan-primary">
        {action}
      </button>
    ) : null}
  </div>
);

const MetricCard = ({ label, value, icon: Icon }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">
          {label}
        </div>
        <div className="mt-3 text-2xl font-black text-white">{value}</div>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-primary/18 bg-cyan-primary/8 text-cyan-primary">
        <Icon size={19} />
      </div>
    </div>
  </Card>
);

const NoticeCard = ({ icon: Icon, title, description }) => (
  <div className="rounded-xl border border-cyan-primary/18 bg-cyan-primary/8 p-4">
    <div className="flex gap-3">
      <Icon className="mt-0.5 shrink-0 text-cyan-primary" size={18} />
      <div>
        <div className="text-sm font-black text-white">{title}</div>
        <div className="mt-1 text-xs leading-5 text-white/50">{description}</div>
      </div>
    </div>
  </div>
);

const EmptyBlock = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center">
    <div className="text-base font-black text-white">{title}</div>
    <div className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/40">{description}</div>
  </div>
);

const Field = ({ label, icon: Icon, children }) => (
  <label className="block space-y-2">
    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
      {label}
    </span>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-primary/35" size={16} />
      {children}
    </div>
  </label>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/25 px-4 py-3">
    <span className="text-xs text-white/35">{label}</span>
    <span className="text-right text-sm font-bold text-white">{value || "Not set"}</span>
  </div>
);

const ToggleChip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
      active
        ? "border-cyan-primary/25 bg-cyan-primary/10 text-cyan-primary"
        : "border-white/10 text-white/40 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const CompactOrderRow = ({ order }) => (
  <div className="rounded-xl border border-white/8 bg-black/25 p-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm font-black text-white">{order.service}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/35">
          <span>{getOrderDisplayId(order)}</span>
          <span>{getOrderPlanLabel(order)}</span>
          <span>{formatDate(order.createdAt)}</span>
        </div>
      </div>
      <StatusBadge value={order.status || order.statusKey} />
    </div>
  </div>
);

const StatusBadge = ({ value }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] ${getOrderStatusBadgeClass(value)}`}>
    {getOrderStatusLabel(value)}
  </span>
);

const PaymentBadge = ({ value }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] ${getPaymentStatusBadgeClass(value)}`}>
    {getPaymentStatusLabel(value)}
  </span>
);

const OrderCard = ({ order, onPay, paying }) => {
  const summary = getOrderPaymentSummary(order);
  const progress = getOrderProgress(order.status || order.statusKey);
  const needsPayment = summary.dueNow > 0;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-primary/75">
              {getOrderDisplayId(order)}
            </span>
            <StatusBadge value={order.status || order.statusKey} />
            <PaymentBadge value={order.paymentStatus} />
          </div>
          <h3 className="mt-3 text-xl font-black text-white">{order.service}</h3>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/45">
            <span>{getOrderPlanLabel(order)}</span>
            <span>{formatCurrency(getOrderAmount(order))}</span>
            <span>Deadline {order.deadline || "Flexible"}</span>
          </div>
        </div>

        <div className="min-w-[220px]">
          <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-white/35">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-cyan-primary" style={{ width: `${progress}%` }} />
          </div>
          {needsPayment ? (
            <Button className="mt-4 w-full" disabled={paying} onClick={() => onPay(summary.dueNow)}>
              {paying ? "Starting..." : `Pay ${formatCurrency(summary.dueNow)}`}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

const LinkButton = ({ to, icon: Icon, label }) => (
  <Link
    to={to}
    className="flex items-center justify-between rounded-xl border border-white/8 bg-black/25 px-4 py-3 text-sm font-bold text-white/65 transition-colors hover:border-cyan-primary/20 hover:text-cyan-primary"
  >
    <span className="flex items-center gap-3">
      <Icon size={16} /> {label}
    </span>
    <ExternalLink size={14} />
  </Link>
);

export default Profile;
