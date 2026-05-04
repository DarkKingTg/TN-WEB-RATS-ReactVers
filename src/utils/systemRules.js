export const ROLE_HIERARCHY = [
  "client",
  "worker",
  "admin",
  "owner",
];

export const STAFF_ROLES = ROLE_HIERARCHY.filter((role) => role !== "client");

export const ROLE_PERMISSIONS = {
  client: ["create_order", "request_revision", "pay"],
  worker: ["accept_work", "receive_revision"],
  admin: [
    "view_all_orders",
    "assign_work",
    "manage_users",
    "view_full_system_analytics",
  ],
  owner: [
    "view_all_orders",
    "assign_work",
    "manage_users",
    "view_full_system_analytics",
    "manage_admins",
    "manage_billing",
  ],
};

export const DASHBOARD_VIEW_RULES = {
  overview: STAFF_ROLES,
  analytics: ["admin", "owner"],
  orders: ["admin", "owner"],
  orderpool: ["worker"],
  users: ["admin", "owner"],
  referrals: ["admin", "owner"],
  reviews: STAFF_ROLES,
  samples: STAFF_ROLES,
  myorders: ["worker"],
};

export const ORDER_STATUS_META = {
  new: {
    label: "New",
    progress: 0,
    badgeClass: "border-white/15 bg-white/5 text-white/60",
  },
  in_progress: {
    label: "In Progress",
    progress: 50,
    badgeClass: "border-secondary-dark/20 bg-secondary-dark/10 text-secondary-dark",
  },
  review: {
    label: "Review",
    progress: 75,
    badgeClass: "border-secondary-dark/20 bg-secondary-dark/10 text-secondary-dark",
  },
  complete: {
    label: "Complete",
    progress: 100,
    badgeClass: "border-accent/20 bg-accent/10 text-accent",
  },
  cancelled: {
    label: "Cancelled",
    progress: 0,
    badgeClass: "border-white/10 bg-white/5 text-white/40",
  },
};

export const ORDER_STATUS_FLOW = ["new", "in_progress", "review", "complete"];

export const ORDER_STATUS_ALIASES = {
  new: "new",
  created: "new",
  pending: "new",
  assigned: "in_progress",
  in_progress: "in_progress",
  working: "in_progress",
  progress: "in_progress",
  delivered: "review",
  review: "review",
  preview: "review",
  complete: "complete",
  completed: "complete",
  done: "complete",
  closed: "complete",
  cancelled: "cancelled",
  canceled: "cancelled",
};

export const PAYMENT_STATUS_META = {
  pending: {
    label: "Pending",
    badgeClass: "border-secondary-dark/20 bg-secondary-dark/10 text-secondary-dark",
  },
  partial: {
    label: "Partial",
    badgeClass: "border-accent/20 bg-accent/10 text-accent",
  },
  paid: {
    label: "Paid",
    badgeClass: "border-accent/20 bg-accent/10 text-accent",
  },
  failed: {
    label: "Failed",
    badgeClass: "border-control-active/20 bg-control-active/10 text-control-active",
  },
};

export const PAYMENT_STATUS_ALIASES = {
  pending: "pending",
  unpaid: "pending",
  due: "pending",
  partial: "partial",
  partially_paid: "partial",
  pending_verification: "pending",
  paid: "paid",
  success: "paid",
  completed: "paid",
  failed: "failed",
  rejected: "failed",
};

export const FINANCIAL_RULES = {
  workerPercent: 90,
  companyPercent: 10,
};

const randomSegment = () =>
  Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, "X");

export const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export const normalizeRole = (role) => {
  const normalized = normalizeValue(role);
  return ROLE_HIERARCHY.includes(normalized) ? normalized : "client";
};

export const getRoleRank = (role) =>
  ROLE_HIERARCHY.indexOf(normalizeRole(role));

export const hasRoleAccess = (role, allowedRoles = []) =>
  allowedRoles.map(normalizeRole).includes(normalizeRole(role));

export const canManageRole = (actorRole, targetRole) =>
  getRoleRank(actorRole) > getRoleRank(targetRole);

export const canGenerateInviteForRole = (actorRole, targetRole) => {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);

  if (target === "client") return false;
  if (actor === "admin") {
    return ["admin", "worker"].includes(target);
  }
  if (actor === "owner") {
    return ["admin", "worker"].includes(target);
  }

  return false;
};

export const getAllowedDashboardViews = (role) =>
  Object.entries(DASHBOARD_VIEW_RULES)
    .filter(([, allowedRoles]) => hasRoleAccess(role, allowedRoles))
    .map(([viewId]) => viewId);

export const canAccessDashboardView = (role, viewId) =>
  hasRoleAccess(role, DASHBOARD_VIEW_RULES[viewId] || []);

export const ROLE_REFERRAL_CONFIG = {
  client: { code: "CLT", pct: 5 },
  worker: { code: "WRK", pct: 10 },
  admin: { code: "ADM", pct: 15 },
  owner: { code: "OWN", pct: 15 },
};

export const STUDENT_STARTUP_DISCOUNT_RANGE = {
  min: 10,
  max: 30,
};

export const makeReferralCode = (role = "client") => {
  const normalizedRole = normalizeRole(role);
  const prefix =
    ROLE_REFERRAL_CONFIG[normalizedRole]?.code || ROLE_REFERRAL_CONFIG.client.code;
  return `RYNX-${prefix}-${randomSegment()}`;
};

export const MAX_REFERRAL_DISCOUNT = 40;

export const clampReferralDiscountPercent = (discountPercent) =>
  Math.min(
    MAX_REFERRAL_DISCOUNT,
    Math.max(0, Math.round(Number(discountPercent || 0)))
  );

export const getRoleReferralDiscount = (role = "client") =>
  clampReferralDiscountPercent(
    ROLE_REFERRAL_CONFIG[normalizeRole(role)]?.pct || ROLE_REFERRAL_CONFIG.client.pct
  );

export const getEligibleReferralDiscount = (userProfile) => {
  if (!userProfile) return 0;
  const code = String(userProfile?.usedReferralCode || "").trim();
  if (!code) return 0;
  const discount = Number(
    userProfile?.referralDiscountPercent || userProfile?.discountPercent || 0
  );
  return clampReferralDiscountPercent(discount);
};

export const getStudentStartupDiscount = (seed = "") => {
  const value = String(seed || "").trim().toLowerCase();
  if (!value || !["student", "college", "startup", "new_startup"].includes(value)) {
    return 0;
  }

  const source = value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const span = STUDENT_STARTUP_DISCOUNT_RANGE.max - STUDENT_STARTUP_DISCOUNT_RANGE.min;
  return STUDENT_STARTUP_DISCOUNT_RANGE.min + (source % (span + 1));
};
