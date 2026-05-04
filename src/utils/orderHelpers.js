import { serverTimestamp } from "firebase/firestore";
import { SERVICE_CATEGORIES } from "../data/siteData";
import {
  ORDER_STATUS_ALIASES,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_META,
  PAYMENT_STATUS_ALIASES,
  PAYMENT_STATUS_META,
  normalizeRole,
  normalizeValue,
} from "./systemRules";

export { ORDER_STATUS_META, PAYMENT_STATUS_META, ORDER_STATUS_FLOW };

export const normalizeOrderStatus = (value) => {
  const normalized = normalizeValue(value);
  if (!normalized) return "pending_assignment";
  return ORDER_STATUS_ALIASES[normalized] || "pending_assignment";
};

export const toFirestoreOrderStatus = (value) =>
  ORDER_STATUS_META[normalizeOrderStatus(value)]?.label || "Pending Assignment";

export const getOrderStatusLabel = (value) =>
  ORDER_STATUS_META[normalizeOrderStatus(value)]?.label || "Pending Assignment";

export const getOrderStatusBadgeClass = (value) =>
  ORDER_STATUS_META[normalizeOrderStatus(value)]?.badgeClass ||
  ORDER_STATUS_META.pending_assignment.badgeClass;

export const getOrderProgress = (value) =>
  ORDER_STATUS_META[normalizeOrderStatus(value)]?.progress ?? 0;

export const isCompletedOrder = (order) =>
  ["completed", "closed"].includes(
    normalizeOrderStatus(order?.status || order?.orderStatus)
  );

export const isOpenOrder = (order) =>
  !["completed", "closed", "cancelled"].includes(
    normalizeOrderStatus(order?.status || order?.orderStatus)
  );

export const normalizePaymentStatus = (value) => {
  const normalized = normalizeValue(value);
  if (!normalized) return "pending";
  return PAYMENT_STATUS_ALIASES[normalized] || "pending";
};

export const getPaymentStatusLabel = (value) =>
  PAYMENT_STATUS_META[normalizePaymentStatus(value)]?.label || "Pending";

export const getPaymentStatusBadgeClass = (value) =>
  PAYMENT_STATUS_META[normalizePaymentStatus(value)]?.badgeClass ||
  PAYMENT_STATUS_META.pending.badgeClass;

export const formatCurrency = (amount = 0) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export const toDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const sortRecordsByCreatedAtDesc = (records = []) =>
  [...records].sort((left, right) => {
    const leftTime = toDateValue(left?.createdAt)?.getTime() || 0;
    const rightTime = toDateValue(right?.createdAt)?.getTime() || 0;
    return rightTime - leftTime;
  });

export const getAssignedWorkerIds = (order) =>
  Array.from(
    new Set(
      [
        ...(Array.isArray(order?.assignedWorkers) ? order.assignedWorkers : []),
        order?.workerAssigned,
        order?.assignedTo,
      ].filter(Boolean)
    )
  );

export const getPrimaryAssignedWorkerId = (order) =>
  getAssignedWorkerIds(order)[0] || null;

export const isOrderAssignedToWorker = (order, userId) =>
  Boolean(userId) && getAssignedWorkerIds(order).includes(userId);

export const isUnassignedOrder = (order) =>
  getAssignedWorkerIds(order).length === 0;

export const isClaimablePoolOrder = (order) => {
  const normalizedStatus = normalizeOrderStatus(
    order?.statusKey || order?.status || order?.orderStatus
  );
  const assignmentState = normalizeValue(order?.assignmentStatus || "unassigned");

  return (
    isUnassignedOrder(order) &&
    assignmentState !== "pending_approval" &&
    ["created", "pending_assignment"].includes(normalizedStatus)
  );
};

export const formatDate = (value, options) => {
  const date = toDateValue(value);
  if (!date) return "—";

  return date.toLocaleDateString(
    "en-IN",
    options || { day: "numeric", month: "short", year: "numeric" }
  );
};

export const formatDateTime = (value) => {
  const date = toDateValue(value);
  if (!date) return "—";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getOrderAmount = (order) =>
  Number(order?.totalPrice || order?.finalPrice || order?.price || 0);

export const getOrderDisplayId = (order) => {
  const rawId = order?.orderId || order?.id || "";
  if (!rawId) return "TNWR-NEW";
  if (String(rawId).startsWith("TNWR-")) return rawId;

  return `TNWR-${String(rawId).slice(-6).toUpperCase()}`;
};

export const getOrderPlanLabel = (order) =>
  order?.plan || order?.package || "Custom";

export const getOrderPriorityLabel = (order) =>
  order?.isPriority ||
  normalizeValue(order?.priorityLabel) === "high" ||
  normalizeValue(order?.priority) === "high"
    ? "High Priority"
    : "Normal";

export const getOrderPriorityBadgeClass = (order) =>
  order?.isPriority ||
  normalizeValue(order?.priorityLabel) === "high" ||
  normalizeValue(order?.priority) === "high"
    ? "border-accent/20 bg-accent/10 text-accent"
    : "border-white/10 bg-white/5 text-white/55";

export const getCustomerTypeLabel = (order, fallback = "new") => {
  const value = normalizeValue(order?.customerType || fallback);
  return value === "returning" ? "Returning" : "New";
};

export const getPrimaryAssetLink = (order) =>
  order?.deliveryLink ||
  order?.downloadUrl ||
  order?.filesUrl ||
  order?.driveLink ||
  order?.references ||
  null;

export const getRequirementFields = (order) => ({
  name: order?.name || order?.customerName || "",
  email: order?.email || order?.customerEmail || "",
  phone: order?.phone || order?.customerPhone || "",
  projectDescription:
    order?.requirements?.projectDescription || order?.projectDescription || "",
  features: order?.requirements?.features || order?.features || "",
  references: order?.requirements?.references || order?.references || "",
  deadline: order?.requirements?.deadline || order?.deadline || "",
});

export const resolveServiceSelection = (order) => {
  const categoryById = SERVICE_CATEGORIES.find(
    (category) => category.id === order?.categoryId
  );
  const serviceById = categoryById?.services.find(
    (service) => service.id === order?.serviceId
  );

  if (categoryById && serviceById) {
    const plan =
      serviceById.plans.find((item) => item.id === order?.planId) ||
      serviceById.plans.find(
        (item) => normalizeValue(item.label) === normalizeValue(order?.plan)
      ) ||
      null;

    return {
      categoryId: categoryById.id,
      serviceId: serviceById.id,
      planId: plan?.id || null,
    };
  }

  for (const category of SERVICE_CATEGORIES) {
    const matchesCategory =
      normalizeValue(category.name) === normalizeValue(order?.category) ||
      normalizeValue(category.shortName) === normalizeValue(order?.category);

    for (const service of category.services) {
      const matchesService =
        service.id === order?.serviceId ||
        normalizeValue(service.name) === normalizeValue(order?.service) ||
        normalizeValue(service.shortName) === normalizeValue(order?.service);

      if (!matchesCategory && !matchesService) continue;

      const plan =
        service.plans.find((item) => item.id === order?.planId) ||
        service.plans.find(
          (item) => normalizeValue(item.label) === normalizeValue(order?.plan)
        ) ||
        null;

      return {
        categoryId: category.id,
        serviceId: service.id,
        planId: plan?.id || null,
      };
    }
  }

  return {
    categoryId: null,
    serviceId: null,
    planId: null,
  };
};

export const buildReorderDraft = (order) => {
  const selection = resolveServiceSelection(order);

  return {
    ...selection,
    isPriority: !!order?.isPriority,
    isReorder: true,
    parentOrderId: getOrderDisplayId(order),
    previousOrderId: order?.id || null,
    requirements: getRequirementFields(order),
  };
};

export const getOrderTimeline = (order) => {
  const current = normalizeOrderStatus(order?.status || order?.orderStatus);

  return [
    {
      key: "pending_assignment",
      label: "Pending Assignment",
      done: !["created"].includes(current),
      date: toDateValue(order?.createdAt),
    },
    {
      key: "assigned",
      label: "Assigned",
      done: [
        "assigned",
        "in_progress",
        "delivered_preview",
        "revision_requested",
        "awaiting_final_payment",
        "completed",
        "closed",
      ].includes(current),
      date: toDateValue(order?.assignedAt || order?.acceptedAt),
    },
    {
      key: "in_progress",
      label: "In Progress",
      done: [
        "in_progress",
        "delivered_preview",
        "revision_requested",
        "awaiting_final_payment",
        "completed",
        "closed",
      ].includes(current),
      date: toDateValue(order?.startedAt || order?.inProgressAt),
    },
    {
      key: "delivered_preview",
      label: "Preview Delivered",
      done: [
        "delivered_preview",
        "revision_requested",
        "awaiting_final_payment",
        "completed",
        "closed",
      ].includes(current),
      date: toDateValue(order?.previewDeliveredAt || order?.deliveredPreviewAt),
    },
    {
      key: "awaiting_final_payment",
      label: "Awaiting Final Payment",
      done: ["awaiting_final_payment", "completed", "closed"].includes(current),
      date: toDateValue(order?.awaitingFinalPaymentAt),
    },
    {
      key: "completed",
      label: "Completed",
      done: ["completed", "closed"].includes(current),
      date: toDateValue(order?.completedAt || order?.closedAt),
    },
  ];
};

export const getOrderPaymentSummary = (order) => {
  const total = getOrderAmount(order);
  const advance = Number(order?.advancePaid ?? order?.advancePayment ?? 0);
  const remaining = Number(
    order?.remainingAmount ??
      order?.remainingPayment ??
      Math.max(total - advance, 0)
  );
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);

  if (paymentStatus === "paid") {
    return {
      total,
      paid: Number(order?.totalPaid || total),
      pending: 0,
      dueNow: 0,
      status: paymentStatus,
    };
  }

  if (paymentStatus === "partial") {
    return {
      total,
      paid: advance,
      pending: remaining,
      dueNow: remaining,
      status: paymentStatus,
    };
  }

  return {
    total,
    paid: 0,
    pending: advance || total,
    dueNow: advance || total,
    status: paymentStatus,
  };
};

export const getPaymentSummary = getOrderPaymentSummary;

export const getOrderStatusOptions = (role = "admin") => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "worker") {
    return ["assigned", "in_progress", "delivered_preview"];
  }

  if (["admin", "owner"].includes(normalizedRole)) {
    return ORDER_STATUS_FLOW;
  }

  return [];
};

export const getWorkerVisibleStatuses = () => [
  "assigned",
  "in_progress",
  "delivered_preview",
  "revision_requested",
  "awaiting_final_payment",
  "completed",
];

export const getNextWorkerOrderStatus = (order) => {
  const normalizedStatus = normalizeOrderStatus(order?.status || order?.orderStatus);

  switch (normalizedStatus) {
    case "pending_assignment":
    case "assigned":
      return "in_progress";
    case "in_progress":
    case "revision_requested":
      return "delivered_preview";
    default:
      return null;
  }
};

export const buildOrderStatusPatch = (nextStatus) => {
  const normalized = normalizeOrderStatus(nextStatus);
  const label = toFirestoreOrderStatus(normalized);

  return {
    status: label,
    orderStatus: label,
    statusKey: normalized,
    updatedAt: serverTimestamp(),
    ...(normalized === "assigned" ? { assignedAt: serverTimestamp() } : {}),
    ...(normalized === "in_progress" ? { inProgressAt: serverTimestamp() } : {}),
    ...(normalized === "delivered_preview"
      ? { previewDeliveredAt: serverTimestamp() }
      : {}),
    ...(normalized === "revision_requested"
      ? { revisionRequestedAt: serverTimestamp() }
      : {}),
    ...(normalized === "awaiting_final_payment"
      ? { awaitingFinalPaymentAt: serverTimestamp() }
      : {}),
    ...(normalized === "completed" ? { completedAt: serverTimestamp() } : {}),
    ...(normalized === "closed" ? { closedAt: serverTimestamp() } : {}),
    ...(normalized === "cancelled" ? { cancelledAt: serverTimestamp() } : {}),
  };
};
