import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Link as LinkIcon,
  Lock,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Ticket,
  User,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BackButton from "../../components/ui/BackButton";
import { Button, Card } from "../../components/ui/Primitives";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { normalizeRole } from "../../utils/systemRules";

const ROLE_ROUTES = {
  client: "/profile",
  worker: "/profile",
  admin: "/profile",
  owner: "/profile",
};

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
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "voice", label: "Voice", icon: PhoneCall },
  { id: "video", label: "Video", icon: Video },
];

const initialRegister = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
  organizationType: "college",
  organizationName: "",
  organizationAddress: "",
  organizationEmail: "",
};

const initialStaff = {
  inviteKey: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  organizationType: "college",
  organizationName: "",
  organizationAddress: "",
  organizationEmail: "",
  skills: "",
  workingDays: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "18:00",
  contactMethods: ["chat"],
  portfolioLinks: "",
};

const inputBase =
  "w-full rounded-xl border border-white/10 bg-primary-dark px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-primary";

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const listFromText = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

function Field({ label, icon: Icon, children }) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-light-gray/40">
        {label}
      </span>
      <div className="relative">
        {Icon ? (
          <Icon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-primary/30"
            size={16}
          />
        ) : null}
        {children}
      </div>
    </label>
  );
}

function PasswordStrength({ value }) {
  const score = getStrength(value);
  const labels = ["", "Weak", "Fair", "Strong", "Excellent"];

  if (!value) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-light-gray/40">
        <span>Password strength</span>
        <span className={score < 2 ? "text-accent" : "text-accent"}>
          {labels[score]}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${score < 2 ? "bg-amber-400" : "bg-cyan-primary"}`}
          style={{ width: `${(score / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}

function OrganizationFields({ data, setData }) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/70">
        <Building2 size={13} /> College / Company Details
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" icon={Briefcase}>
          <select
            required
            className={`${inputBase} pl-10`}
            value={data.organizationType}
            onChange={(event) => setData({ ...data, organizationType: event.target.value })}
          >
            <option value="college">College</option>
            <option value="company">Company</option>
            <option value="startup">Startup</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Official Email" icon={Mail}>
          <input
            required
            type="email"
            className={`${inputBase} pl-10`}
            placeholder="you@college.edu"
            value={data.organizationEmail}
            onChange={(event) => setData({ ...data, organizationEmail: event.target.value })}
          />
        </Field>
      </div>

      <Field label="College / Company Name" icon={Building2}>
        <input
          required
          className={`${inputBase} pl-10`}
          placeholder="Institution or company name"
          value={data.organizationName}
          onChange={(event) => setData({ ...data, organizationName: event.target.value })}
        />
      </Field>

      <Field label="Address" icon={MapPin}>
        <textarea
          required
          className={`${inputBase} min-h-[92px] pl-10`}
          placeholder="Campus, office, or company address"
          value={data.organizationAddress}
          onChange={(event) => setData({ ...data, organizationAddress: event.target.value })}
        />
      </Field>
    </div>
  );
}

export default function JoinHub() {
  const { login, signup, staffSignup, user, userProfile, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initTab =
    params.get("tab") === "staff"
      ? "staff"
      : params.get("login") === "1"
        ? "login"
        : "register";

  const [tab, setTab] = useState(initTab);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState(initialRegister);
  const [staffData, setStaffData] = useState(initialStaff);
  const [refStatus, setRefStatus] = useState({ valid: false, msg: "" });
  const [inviteStatus, setInviteStatus] = useState({ valid: false, msg: "" });

  useEffect(() => {
    if (!user) return;
    const resolvedRole = normalizeRole(role || userProfile?.role);
    navigate(ROLE_ROUTES[resolvedRole] || "/profile", { replace: true });
  }, [navigate, role, user, userProfile]);

  const reset = () => {
    setError("");
    setSuccess("");
  };

  const switchTab = (nextTab) => {
    reset();
    setShowPass(false);
    setTab(nextTab);
  };

  const validateReferral = async (code) => {
    const value = String(code || "").trim().toUpperCase();
    if (!value) {
      setRefStatus({ valid: false, msg: "" });
      return;
    }

    try {
      const data = await apiRequest(`/auth/validate-referral/${value}`);
      setRefStatus({
        valid: true,
        msg: `Referral verified. ${data.discountPercent || 0}% will be linked to your account.`,
      });
    } catch {
      setRefStatus({ valid: false, msg: "Referral code not found." });
    }
  };

  const validateInvite = async (key) => {
    const value = String(key || "").trim().toUpperCase();
    if (!value) {
      setInviteStatus({
        valid: false,
        msg: "No invite key? Submit the form and admin can approve your worker application.",
      });
      return;
    }

    try {
      const data = await apiRequest(`/auth/validate-invite/${value}`);
      setInviteStatus({
        valid: Boolean(data.valid),
        msg: data.valid
          ? `Invite verified. This grants ${data.role} access.`
          : "Invite is not active. Submit without a key for admin approval.",
      });
    } catch {
      setInviteStatus({
        valid: false,
        msg: "Invite not found. Submit without a key for admin approval.",
      });
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    reset();
    setLoading(true);
    try {
      const data = await login(loginData.email, loginData.password);
      const nextRole = normalizeRole(data?.role || "client");
      navigate(ROLE_ROUTES[nextRole] || "/profile", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    reset();

    if (regData.password !== regData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (getStrength(regData.password) < 2) {
      setError("Your password is too weak. Add numbers or special characters.");
      return;
    }

    setLoading(true);
    try {
      await signup(regData.email, regData.password, {
        name: `${regData.firstName} ${regData.lastName}`.trim(),
        phone: regData.phone,
        customerType: "new",
        organizationType: regData.organizationType,
        organizationName: regData.organizationName,
        organizationAddress: regData.organizationAddress,
        organizationEmail: regData.organizationEmail,
        usedReferralCode: regData.referralCode || null,
      });

      setSuccess(`Account created. Welcome, ${regData.firstName}.`);
      setTimeout(() => navigate("/profile"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSignup = async (event) => {
    event.preventDefault();
    reset();

    if (staffData.password !== staffData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (getStrength(staffData.password) < 2) {
      setError("Your password is too weak. Add numbers or special characters.");
      return;
    }

    setLoading(true);
    try {
      const result = await staffSignup(staffData.email, staffData.password, {
        inviteKey: staffData.inviteKey,
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        phone: staffData.phone,
        organizationType: staffData.organizationType,
        organizationName: staffData.organizationName,
        organizationAddress: staffData.organizationAddress,
        organizationEmail: staffData.organizationEmail,
        skills: listFromText(staffData.skills),
        workingDays: staffData.workingDays,
        availableHours: {
          start: staffData.startTime,
          end: staffData.endTime,
          timezone: "Asia/Kolkata",
        },
        contactMethods: staffData.contactMethods,
        portfolioLinks: listFromText(staffData.portfolioLinks),
      });

      setSuccess(
        result.approvalPending
          ? "Worker application sent for admin approval."
          : "Staff account created. Redirecting..."
      );
      setTimeout(() => navigate(ROLE_ROUTES[result.role] || "/profile"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayId) => {
    setStaffData((current) => ({
      ...current,
      workingDays: current.workingDays.includes(dayId)
        ? current.workingDays.filter((item) => item !== dayId)
        : [...current.workingDays, dayId],
    }));
  };

  const toggleContactMethod = (methodId) => {
    setStaffData((current) => {
      const next = current.contactMethods.includes(methodId)
        ? current.contactMethods.filter((item) => item !== methodId)
        : [...current.contactMethods, methodId];

      return {
        ...current,
        contactMethods: next.length ? next : ["chat"],
      };
    });
  };

  const tabs = [
    { id: "register", label: "Create Account", icon: UserPlus },
    { id: "login", label: "Sign In", icon: LogIn },
    { id: "staff", label: "Join as Worker", icon: Users },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <div className="mb-10 text-center">
        <div className="mb-4 text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-primary">
          RyNix Portal
        </div>
        <h1 className="text-4xl font-black text-white md:text-5xl">
          {tab === "login" ? "Welcome Back" : tab === "staff" ? "Join RyNix" : "Create Account"}
        </h1>
        <p className="mt-3 text-sm font-mono text-light-gray/50">
          {tab === "login"
            ? "Sign in to manage orders and profile details."
            : tab === "staff"
              ? "Use an invite key for instant access, or apply for admin approval."
              : "Register freely and start booking services."}
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-primary-dark/60 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold transition-colors ${
                tab === id
                  ? "border border-cyan-primary/20 bg-cyan-primary/10 text-cyan-primary"
                  : "text-white/35 hover:text-white/70"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Icon size={14} /> {label}
              </span>
            </button>
          ))}
        </div>

        <Card className="p-6 sm:p-8">
          <AnimatePresence>
            {(error || success) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mb-5 rounded-xl border px-4 py-3 text-xs font-mono ${
                  error
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-cyan-primary/20 bg-cyan-primary/10 text-cyan-primary"
                }`}
              >
                {error || success}
              </motion.div>
            )}
          </AnimatePresence>

          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <Field label="Email" icon={Mail}>
                <input
                  required
                  type="email"
                  className={`${inputBase} pl-10`}
                  placeholder="you@example.com"
                  value={loginData.email}
                  onChange={(event) => setLoginData({ ...loginData, email: event.target.value })}
                />
              </Field>

              <Field label="Password" icon={Lock}>
                <input
                  required
                  type={showPass ? "text" : "password"}
                  className={`${inputBase} pl-10 pr-10`}
                  placeholder="Your password"
                  value={loginData.password}
                  onChange={(event) => setLoginData({ ...loginData, password: event.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 transition-colors hover:text-cyan-primary"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </Field>

              <Button type="submit" className="w-full py-3" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"} <LogIn size={16} />
              </Button>

              <p className="text-center text-[10px] font-mono text-white/25">
                <Link to="/forgot-password" className="transition-colors hover:text-cyan-primary">
                  Forgot your password?
                </Link>
              </p>
            </form>
          )}

          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name" icon={User}>
                  <input
                    required
                    className={`${inputBase} pl-10`}
                    placeholder="Aarav"
                    value={regData.firstName}
                    onChange={(event) => setRegData({ ...regData, firstName: event.target.value })}
                  />
                </Field>
                <Field label="Last Name" icon={User}>
                  <input
                    required
                    className={`${inputBase} pl-10`}
                    placeholder="Kumar"
                    value={regData.lastName}
                    onChange={(event) => setRegData({ ...regData, lastName: event.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" icon={Mail}>
                  <input
                    required
                    type="email"
                    className={`${inputBase} pl-10`}
                    placeholder="you@example.com"
                    value={regData.email}
                    onChange={(event) => setRegData({ ...regData, email: event.target.value })}
                  />
                </Field>
                <Field label="WhatsApp / Phone" icon={Smartphone}>
                  <input
                    required
                    type="tel"
                    className={`${inputBase} pl-10`}
                    placeholder="+91 98765 43210"
                    value={regData.phone}
                    onChange={(event) => setRegData({ ...regData, phone: event.target.value })}
                  />
                </Field>
              </div>

              <OrganizationFields data={regData} setData={setRegData} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Password" icon={Lock}>
                  <input
                    required
                    type={showPass ? "text" : "password"}
                    className={`${inputBase} pl-10`}
                    placeholder="Min 8 chars"
                    value={regData.password}
                    onChange={(event) => setRegData({ ...regData, password: event.target.value })}
                  />
                  <PasswordStrength value={regData.password} />
                </Field>
                <Field label="Confirm" icon={Lock}>
                  <input
                    required
                    type={showPass ? "text" : "password"}
                    className={`${inputBase} pl-10`}
                    placeholder="Repeat password"
                    value={regData.confirmPassword}
                    onChange={(event) => setRegData({ ...regData, confirmPassword: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Referral Code Optional" icon={Ticket}>
                <input
                  className={`${inputBase} pl-10 uppercase tracking-widest`}
                  placeholder="RYNX-CLT-XXXX"
                  value={regData.referralCode}
                  onBlur={() => validateReferral(regData.referralCode)}
                  onChange={(event) =>
                    setRegData({ ...regData, referralCode: event.target.value.toUpperCase() })
                  }
                />
                {refStatus.msg ? (
                  <p className={`mt-2 text-[10px] font-mono ${refStatus.valid ? "text-cyan-primary" : "text-red-300"}`}>
                    {refStatus.msg}
                  </p>
                ) : null}
              </Field>

              <Button type="submit" className="w-full py-3" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"} <ArrowRight size={16} />
              </Button>
            </form>
          )}

          {tab === "staff" && (
            <form onSubmit={handleStaffSignup} className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-cyan-primary/15 bg-cyan-primary/5 p-3">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cyan-primary" />
                <p className="text-[10px] leading-relaxed text-light-gray/55">
                  Invite keys activate staff accounts immediately. Without a key, RyNix stores your worker application for admin approval.
                </p>
              </div>

              <Field label="Invite Key Optional" icon={KeyRound}>
                <input
                  className={`${inputBase} pl-10 uppercase tracking-widest`}
                  placeholder="RYNX-INVITE"
                  value={staffData.inviteKey}
                  onBlur={() => validateInvite(staffData.inviteKey)}
                  onChange={(event) =>
                    setStaffData({ ...staffData, inviteKey: event.target.value.toUpperCase() })
                  }
                />
                {inviteStatus.msg ? (
                  <p className={`mt-2 text-[10px] font-mono ${inviteStatus.valid ? "text-cyan-primary" : "text-amber-300"}`}>
                    {inviteStatus.msg}
                  </p>
                ) : null}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name" icon={User}>
                  <input
                    required
                    className={`${inputBase} pl-10`}
                    placeholder="First"
                    value={staffData.firstName}
                    onChange={(event) => setStaffData({ ...staffData, firstName: event.target.value })}
                  />
                </Field>
                <Field label="Last Name" icon={User}>
                  <input
                    required
                    className={`${inputBase} pl-10`}
                    placeholder="Last"
                    value={staffData.lastName}
                    onChange={(event) => setStaffData({ ...staffData, lastName: event.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" icon={Mail}>
                  <input
                    required
                    type="email"
                    className={`${inputBase} pl-10`}
                    placeholder="you@rynix.com"
                    value={staffData.email}
                    onChange={(event) => setStaffData({ ...staffData, email: event.target.value })}
                  />
                </Field>
                <Field label="Phone" icon={Smartphone}>
                  <input
                    required
                    type="tel"
                    className={`${inputBase} pl-10`}
                    placeholder="+91 98765 43210"
                    value={staffData.phone}
                    onChange={(event) => setStaffData({ ...staffData, phone: event.target.value })}
                  />
                </Field>
              </div>

              <OrganizationFields data={staffData} setData={setStaffData} />

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/70">
                  <Users size={13} /> Worker Profile
                </div>

                <Field label="Skills" icon={Briefcase}>
                  <textarea
                    required
                    className={`${inputBase} min-h-[88px] pl-10`}
                    placeholder="React, UI design, PPT design, landing pages"
                    value={staffData.skills}
                    onChange={(event) => setStaffData({ ...staffData, skills: event.target.value })}
                  />
                </Field>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Start Time" icon={Clock3}>
                    <input
                      type="time"
                      className={`${inputBase} pl-10`}
                      value={staffData.startTime}
                      onChange={(event) => setStaffData({ ...staffData, startTime: event.target.value })}
                    />
                  </Field>
                  <Field label="End Time" icon={Clock3}>
                    <input
                      type="time"
                      className={`${inputBase} pl-10`}
                      value={staffData.endTime}
                      onChange={(event) => setStaffData({ ...staffData, endTime: event.target.value })}
                    />
                  </Field>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-light-gray/40">
                    <CalendarDays size={13} /> Working Days
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map((day) => {
                      const active = staffData.workingDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`h-9 rounded-lg border px-3 text-[10px] font-bold transition-colors ${
                            active
                              ? "border-cyan-primary/30 bg-cyan-primary/15 text-cyan-primary"
                              : "border-white/10 bg-white/5 text-white/35"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-light-gray/40">
                    Contact Methods
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {CONTACT_METHODS.map(({ id, label, icon: Icon }) => {
                      const active = staffData.contactMethods.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleContactMethod(id)}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition-colors ${
                            active
                              ? "border-cyan-primary/30 bg-cyan-primary/15 text-cyan-primary"
                              : "border-white/10 bg-white/5 text-white/40"
                          }`}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <Field label="Portfolio Links" icon={LinkIcon}>
                    <textarea
                      className={`${inputBase} min-h-[88px] pl-10`}
                      placeholder="One link per line"
                      value={staffData.portfolioLinks}
                      onChange={(event) => setStaffData({ ...staffData, portfolioLinks: event.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Password" icon={Lock}>
                  <input
                    required
                    type={showPass ? "text" : "password"}
                    className={`${inputBase} pl-10`}
                    placeholder="Min 8 chars"
                    value={staffData.password}
                    onChange={(event) => setStaffData({ ...staffData, password: event.target.value })}
                  />
                  <PasswordStrength value={staffData.password} />
                </Field>
                <Field label="Confirm" icon={Lock}>
                  <input
                    required
                    type={showPass ? "text" : "password"}
                    className={`${inputBase} pl-10`}
                    placeholder="Repeat password"
                    value={staffData.confirmPassword}
                    onChange={(event) => setStaffData({ ...staffData, confirmPassword: event.target.value })}
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={() => setShowPass((current) => !current)}
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-light-gray/40"
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${showPass ? "border-cyan-primary bg-cyan-primary/20 text-cyan-primary" : "border-white/20"}`}>
                  {showPass ? <Check size={10} /> : null}
                </span>
                Show passwords
              </button>

              <Button type="submit" className="w-full py-3" disabled={loading}>
                {loading ? "Submitting..." : "Create Staff / Apply"} <ArrowRight size={16} />
              </Button>
            </form>
          )}
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <BackButton to="/" label="Back to home" className="min-w-[170px] h-12" />
          <Link
            to="/book"
            className="text-[10px] font-mono uppercase tracking-widest text-light-gray/30 transition-colors hover:text-cyan-primary"
          >
            Book a Service
          </Link>
        </div>
      </div>
    </div>
  );
}
