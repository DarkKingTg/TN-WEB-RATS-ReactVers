import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Check,
  Circle,
  Clock3,
  FileText,
  Info,
  ListChecks,
  Mail,
  Phone,
  Paperclip,
  QrCode,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, storage } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import AnimatedPaymentButton from "../../components/ui/AnimatedPaymentButton";
import BackButton from "../../components/ui/BackButton";
import { Button, Card, SectionHeading } from "../../components/ui/Primitives";
import { ScrollReveal, GradientText } from "../../components/ui/ScrollReveal";
import Stepper, { Step } from "../../components/ui/Stepper";
import QRPaymentStep from "../../components/temp/QRPaymentStep";
import { apiRequest } from "../../services/apiClient";
import { createOrder } from "../../services/orderService";
import { BOOKING_STEP_LABELS, buildPaymentBreakdown, CONTACT_INFO, getCategoryById, getServiceById, SERVICE_CATEGORIES, TERMS_POINTS } from "../../data/siteData";
import { buildReorderDraft } from "../../utils/orderHelpers";
import { clampReferralDiscountPercent, getEligibleReferralDiscount, getStudentStartupDiscount } from "../../utils/systemRules";

const formatPrice = (price) => `Rs ${price.toLocaleString("en-IN")}`;

const buildReferralState = ({
  code = "",
  discountPercent = 0,
  referredBy = null,
  source = "manual",
} = {}) => ({
  code: String(code || "").trim().toUpperCase(),
  discountPercent: clampReferralDiscountPercent(discountPercent),
  referredBy: referredBy || null,
  source,
});

const categoryGradients = {
  "presentation-design": "from-cyan-primary/15 to-teal-primary/10",
  "web-development": "from-white/10 to-cyan-primary/10",
  "fix-optimization": "from-teal-primary/15 to-white/5",
  "templates-assets": "from-cyan-primary/12 to-white/5",
};

const BookingStepperIndicator = ({ step, currentStep }) => {
  const isComplete = currentStep > step;
  const isActive = currentStep === step;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-colors ${
          isComplete || isActive
            ? "border-cyan-primary bg-cyan-primary text-primary-dark"
            : "border-white/10 bg-white/5 text-white/35"
        }`}
      >
        {isComplete ? <Check size={16} /> : step}
      </div>
      <div
        className={`text-[10px] font-mono uppercase tracking-[0.14em] ${
          isActive || isComplete ? "text-cyan-primary" : "text-white/28"
        }`}
      >
        {BOOKING_STEP_LABELS[step - 1]}
      </div>
    </div>
  );
};

const BookService = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [reorderDraft] = useState(() =>
    location.state?.reorderOrder
      ? buildReorderDraft(location.state.reorderOrder)
      : null
  );
  const previousRequirements = reorderDraft?.requirements || null;

  const requestedServiceId = searchParams.get("service");
  const requestedCategoryId = searchParams.get("category");
  const requestedPlanId = searchParams.get("plan");

  const requestedService = requestedServiceId
    ? getServiceById(requestedServiceId)
    : null;
  const initialCategoryId =
    reorderDraft?.categoryId || requestedCategoryId || requestedService?.categoryId || null;
  const initialServiceId = reorderDraft?.serviceId || requestedService?.id || null;
  const initialPlanId =
    reorderDraft?.planId ||
    (initialServiceId && requestedPlanId
      ? requestedService?.plans.find((plan) => plan.id === requestedPlanId)?.id ||
        null
      : null);

  const getInitialStep = () => {
    if (initialPlanId) return 4;
    if (initialServiceId) return 3;
    if (initialCategoryId) return 2;
    return 1;
  };

  const [step, setStep] = useState(getInitialStep());
  const [direction, setDirection] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [isPriority, setIsPriority] = useState(Boolean(reorderDraft?.isPriority));
  const [paymentMethod, setPaymentMethod] = useState("cashfree");
  const [utrNumber, setUtrNumber] = useState("");
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [demoRequested, setDemoRequested] = useState(false);
  const [customerType] = useState(
    reorderDraft ? "returning" : userProfile?.customerType || "new"
  );
  const [reusePreviousData, setReusePreviousData] = useState(Boolean(reorderDraft));
  const [stepErrors, setStepErrors] = useState({
    step3: "",
    step4: "",
    step5: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [referralState, setReferralState] = useState(() => buildReferralState());
  const [referralFeedback, setReferralFeedback] = useState("");
  const [referralError, setReferralError] = useState("");
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    projectDescription: "",
    features: "",
    references: "",
  });
  const [formData, setFormData] = useState({
    name:
      userProfile?.name ||
      user?.displayName ||
      previousRequirements?.name ||
      "",
    email: user?.email || previousRequirements?.email || "",
    phone: userProfile?.phone || previousRequirements?.phone || "",
    projectDescription: previousRequirements?.projectDescription || "",
    features: previousRequirements?.features || "",
    references: previousRequirements?.references || "",
    deadline: previousRequirements?.deadline || "",
  });

  useEffect(() => {
    if (!previousRequirements) return;

    setFormData((current) => ({
      ...current,
      projectDescription: reusePreviousData
        ? previousRequirements.projectDescription || ""
        : "",
      features: reusePreviousData ? previousRequirements.features || "" : "",
      references: reusePreviousData
        ? previousRequirements.references || ""
        : "",
      deadline: reusePreviousData ? previousRequirements.deadline || "" : "",
    }));
  }, [previousRequirements, reusePreviousData]);

  useEffect(() => {
    const profileDiscount = getEligibleReferralDiscount(userProfile);
    const profileCode = String(userProfile?.usedReferralCode || "").trim().toUpperCase();

    if (!profileCode || profileDiscount <= 0) {
      return;
    }

    setReferralInput((current) => current || profileCode);
    setReferralState((current) =>
      current.code
        ? current
        : buildReferralState({
            code: profileCode,
            discountPercent: profileDiscount,
            referredBy: userProfile?.referredBy || null,
            source: "account",
          })
    );
    setReferralFeedback((current) =>
      current || `${profileDiscount}% referral discount is linked to this order.`
    );
  }, [userProfile]);

  const selectedCategory = selectedCategoryId
    ? getCategoryById(selectedCategoryId)
    : null;
  const selectedService = selectedServiceId
    ? getServiceById(selectedServiceId)
    : null;
  const selectedPlan =
    selectedService?.plans.find((plan) => plan.id === selectedPlanId) || null;
  const resolvedCustomerType = reorderDraft ? "returning" : customerType;
  const studentStartupDiscountPercent = getStudentStartupDiscount(
    userProfile?.organizationType || userProfile?.customerSegment || ""
  );
  const appliedDiscountPercent = Math.max(
    referralState.discountPercent,
    studentStartupDiscountPercent
  );
  const payment = buildPaymentBreakdown({
    basePrice: selectedPlan?.price ?? 0,
    isPriority: Boolean(selectedPlan && isPriority),
    customerType: resolvedCustomerType,
    referralDiscountPercent: appliedDiscountPercent,
  });
  const hasReferralDiscount = referralState.discountPercent > 0;
  const hasStudentStartupDiscount = studentStartupDiscountPercent > 0;
  const isStudentStartupDiscountApplied =
    studentStartupDiscountPercent > referralState.discountPercent;

  const goToStep = (nextStep) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedServiceId(null);
    setSelectedPlanId(null);
    setIsPriority(false);
    goToStep(2);
  };

  const handleServiceSelect = (serviceId) => {
    setSelectedServiceId(serviceId);
    setSelectedPlanId(null);
    setIsPriority(false);
    goToStep(3);
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
  };

  const handleBack = (targetStep) => {
    goToStep(targetStep);
  };

  const handleNextWithValidation = (targetStep, validationFn, errorKey, errorMessage) => {
    if (validationFn()) {
      setStepErrors((prev) => ({ ...prev, [errorKey]: "" }));
      goToStep(targetStep);
    } else {
      setStepErrors((prev) => ({ ...prev, [errorKey]: errorMessage }));
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    
    // Real-time validation
    if (name === "projectDescription") {
      setFieldErrors(prev => ({ ...prev, projectDescription: value.trim().length >= 50 ? "" : `Need ${50 - value.trim().length} more characters` }));
    } else if (name === "features") {
      setFieldErrors(prev => ({ ...prev, features: value.trim().length >= 30 ? "" : `Need ${30 - value.trim().length} more characters` }));
    } else if (name === "references" && value.trim().length > 0) {
      setFieldErrors(prev => ({ ...prev, references: value.trim().length >= 20 ? "" : `Need ${20 - value.trim().length} more characters` }));
    } else if (name === "references") {
      setFieldErrors(prev => ({ ...prev, references: "" }));
    }

    // Clear step errors
    if (stepErrors.step4) {
      setStepErrors((prev) => ({ ...prev, step4: "" }));
    }
  };

  const handleApplyReferral = async () => {
    const normalizedCode = referralInput.trim().toUpperCase();

    setReferralError("");
    setReferralFeedback("");

    if (!normalizedCode) {
      setReferralState(buildReferralState());
      return;
    }

    setIsApplyingReferral(true);

    try {
      const referralData = await apiRequest(`/auth/validate-referral/${normalizedCode}`);
      const discountPercent = clampReferralDiscountPercent(referralData?.discountPercent);

      if (discountPercent <= 0) {
        setReferralError("This code does not include a discount.");
        return;
      }

      setReferralInput(normalizedCode);
      setReferralState(
        buildReferralState({
          code: normalizedCode,
          discountPercent,
          referredBy: referralData.ownerUid || referralData.referredBy || null,
        })
      );
      setReferralFeedback(
        `${discountPercent}% referral discount applied.`
      );
    } catch (error) {
      console.error("Referral validation failed:", error);
      setReferralError("Could not verify the referral code right now.");
    } finally {
      setIsApplyingReferral(false);
    }
  };

  const handleClearReferral = () => {
    setReferralInput("");
    setReferralState(buildReferralState());
    setReferralFeedback("");
    setReferralError("");
  };

  const handleReferenceFilesChange = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 6);
    setReferenceFiles(files);
  };

  const uploadReferenceFiles = async (orderDocId) => {
    if (!referenceFiles.length) return [];

    if (!user?.uid) {
      throw new Error("Please sign in before uploading reference files.");
    }

    const uploadedFiles = await Promise.all(
      referenceFiles.map(async (file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `orders/${orderDocId}/references/${Date.now()}-${safeName}`;
        const fileRef = storageRef(storage, path);

        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        return {
          name: file.name,
          url,
          path,
          size: file.size,
          type: file.type || "application/octet-stream",
        };
      })
    );

    await updateDoc(doc(db, "orders", orderDocId), {
      referenceFiles: uploadedFiles,
      "requirements.referenceFiles": uploadedFiles,
    });

    return uploadedFiles;
  };

  const createWhatsAppMessage = (newOrderId) => {
    if (!selectedCategory || !selectedService || !selectedPlan) {
      return "";
    }

    return [
      "Hi Rynix, a new booking was created.",
      "",
      `Order ID: ${newOrderId}`,
      `Category: ${selectedCategory.name}`,
      `Service: ${selectedService.name}`,
      `Plan: ${selectedPlan.label}`,
      `Priority: ${isPriority ? "High" : "Normal"}`,
      `Customer Type: ${resolvedCustomerType}`,
      hasReferralDiscount
        ? `Referral: ${referralState.code} (${referralState.discountPercent}% off)`
        : null,
      hasStudentStartupDiscount
        ? `Student/Startup Discount: ${studentStartupDiscountPercent}% ${
            isStudentStartupDiscountApplied ? "applied" : "available"
          }`
        : null,
      `Total: ${formatPrice(payment.total)}`,
      `Advance: ${formatPrice(payment.advancePayment)}`,
      `Payment Method: ${paymentMethod === "cashfree" ? "Cashfree" : "QR fallback"}`,
      demoRequested ? "Company demo requested before final scope lock." : null,
      referenceFiles.length ? `Reference Files: ${referenceFiles.length}` : null,
      "",
      `Name: ${formData.name}`,
      `Email: ${formData.email}`,
      `Phone: ${formData.phone}`,
      `Deadline: ${formData.deadline}`,
      "",
      `Project: ${formData.projectDescription}`,
      `Features: ${formData.features}`,
      formData.references ? `References: ${formData.references}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleSubmit = async () => {
    if (!payment || !selectedCategory || !selectedService || !selectedPlan) {
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const isTextBypass = utrNumber === "TEST_BYPASS";
      const referralDiscountAmount = isStudentStartupDiscountApplied
        ? 0
        : payment.discountAmount;
      const studentStartupDiscountAmount = isStudentStartupDiscountApplied
        ? payment.discountAmount
        : 0;

      const orderPayload = {
        userId: user?.uid || "guest",
        customerId: user?.uid || null,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        category: selectedCategory.name,
        categoryId: selectedCategory.id,
        service: selectedService.name,
        serviceId: selectedService.id,
        plan: selectedPlan.label,
        planId: selectedPlan.id,
        package: selectedPlan.label,
        price: payment.total,
        basePrice: payment.basePrice,
        priorityFee: payment.priorityFee,
        subtotalPrice: payment.subtotal,
        totalPrice: payment.total,
        discountPercent: payment.discountPercent,
        discountAmount: payment.discountAmount,
        referralDiscountPercent: referralState.discountPercent,
        referralDiscountAmount,
        studentStartupDiscountPercent,
        studentStartupDiscountAmount,
        usedReferralCode: referralState.code || null,
        referredBy: referralState.referredBy || null,
        advancePayment: payment.advancePayment,
        advancePaid: isTextBypass ? payment.advancePayment : 0,
        remainingPayment: payment.remainingPayment,
        remainingAmount: payment.remainingPayment,
        totalPaid: isTextBypass ? payment.advancePayment : 0,
        advanceRate: payment.advanceRate,
        customerType: resolvedCustomerType,
        isPriority,
        priorityLabel: isPriority ? "High" : "Normal",
        isReorder: Boolean(reorderDraft),
        parentOrderId: reorderDraft?.parentOrderId || null,
        projectDescription: formData.projectDescription.trim(),
        features: formData.features.trim(),
        references: formData.references.trim(),
        referenceFiles: [],
        referenceFileCount: referenceFiles.length,
        deadline: formData.deadline,
        requirements: {
          projectDescription: formData.projectDescription.trim(),
          features: formData.features.trim(),
          references: formData.references.trim(),
          referenceFiles: [],
          deadline: formData.deadline,
        },
        paymentStatus: isTextBypass ? "Test Paid" : "Pending",
        assignmentStatus: "unassigned",
        paymentMethod,
        paymentProvider: paymentMethod === "cashfree" ? "cashfree" : "qpay",
        utrNumber,
        demoRequested,
        status: (paymentMethod === "qpay" && utrNumber && !isTextBypass) ? "Awaiting Payment Verification" : "Pending Assignment",
        orderStatus: (paymentMethod === "qpay" && utrNumber && !isTextBypass) ? "Awaiting Payment Verification" : "Pending Assignment",
        statusKey: (paymentMethod === "qpay" && utrNumber && !isTextBypass) ? "pending_payment_verification" : "pending_assignment",
        isTestOrder: isTextBypass,
      };

      const createdOrder = await createOrder(orderPayload);
      const orderDocId = createdOrder?.id;

      if (!orderDocId) {
        throw new Error("Order could not be created.");
      }

      await uploadReferenceFiles(orderDocId);

      if (paymentMethod === "qpay") {
        const whatsappMessage = createWhatsAppMessage(orderDocId);

        if (whatsappMessage) {
          window.open(
            `https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodeURIComponent(
              whatsappMessage
            )}`,
            "_blank"
          );
        }

        setOrderId(orderDocId);
        setOrderConfirmed(true);
        setIsSubmitting(false);
        return;
      }

      const cashfreeResponse = await apiRequest("/payment/create-order", {
        method: "POST",
        authMode: "optional",
        body: {
          amount: payment.advancePayment,
          orderId: orderDocId,
          userDetails: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
          },
        },
      });

      if (cashfreeResponse?.paymentSessionId) {
        window.location.href = `https://payments.cashfree.com/checkout?session_id=${cashfreeResponse.paymentSessionId}`;
      } else {
        throw new Error("No payment session created");
      }

    } catch (error) {
      console.error("Booking error:", error);
      setSubmitError(
        `We're having trouble processing your payment right now (${error.message || "Server Busy"}). Switch to QR fallback or try again in 30 seconds.`
      );
      setIsSubmitting(false);
    }
  };

  if (orderConfirmed) {
    return (
      <div className="container mx-auto px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Card className="border-cyan-primary/15 bg-black/75 p-12 text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-primary bg-cyan-primary/10 text-cyan-primary">
              <Check size={34} />
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-primary/72">
              Order Confirmed
            </div>
            <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">
              Your project request is locked in.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-light-gray/68">
              We saved the booking and generated a
              new order reference for follow-up.
            </p>
            <div className="mx-auto mt-8 w-fit rounded-2xl border border-cyan-primary/18 bg-cyan-primary/8 px-6 py-4 font-mono text-lg tracking-[0.18em] text-cyan-primary">
              {orderId.toUpperCase()}
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {user ? (
                <Button onClick={() => navigate("/profile")}>
                  Go To Dashboard
                </Button>
              ) : (
                <Link to="/join">
                  <Button>Create Account To Track It</Button>
                </Link>
              )}
              <BackButton to="/" label="Back to home" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 pb-28 pt-10">
      <SectionHeading subtitle="Choose a category, pick a service, select a plan, and confirm the order step by step.">
        Book Your <span className="text-white">Project</span>
      </SectionHeading>

      <Stepper
        currentStep={step}
        direction={direction}
        showButtons={false}
        disableStepIndicators={true}
        renderStepIndicator={({ step: current, currentStep }) => (
          <BookingStepperIndicator step={current} currentStep={currentStep} />
        )}
        className="p-0"
        contentClassName="relative min-h-[520px]"
      >
        <Step>
          <div className="space-y-8">
            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
              Step 1 - Choose a service category
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {SERVICE_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className={`rounded-[2rem] border border-white/8 bg-gradient-to-br ${
                    categoryGradients[category.id]
                  } p-8 text-left transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-primary/20`}
                >
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                    {category.pricingHint}
                  </div>
                  <h2 className="mt-4 text-3xl font-black text-white">
                    {category.name}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-light-gray/68">
                    {category.description}
                  </p>
                  <div className="mt-6 grid gap-3">
                    {category.services.map((service) => (
                      <div
                        key={service.id}
                        className="rounded-[1.5rem] border border-white/8 bg-black/45 px-5 py-4 text-sm text-light-gray/72"
                      >
                        {service.name}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-8">
            <BackButton onClick={() => handleBack(1)} label="Back to categories" />

            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
              Step 2 - Choose a service
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {selectedCategory?.services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceSelect(service.id)}
                  className="rounded-[2rem] border border-white/8 bg-black/65 p-8 text-left transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-primary/20 hover:bg-black/75"
                >
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                    From {formatPrice(Math.min(...service.plans.map((plan) => plan.price)))}
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-white">
                    {service.name}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-light-gray/68">
                    {service.summary}
                  </p>
                  <div className="mt-6 text-sm text-light-gray/56">
                    Best for: {service.bestFor}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-8">
            <BackButton onClick={() => handleBack(2)} label="Back to services" />

            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
              Step 3 - Choose your plan
            </div>

            <div className="space-y-6">
              <div className="grid gap-5 lg:grid-cols-3">
                {selectedService?.plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => handlePlanSelect(plan.id)}
                      className={`rounded-[2rem] border p-8 text-left transition-all duration-300 ${
                        isSelected
                          ? "border-cyan-primary bg-cyan-primary/10 shadow-[0_0_30px_rgba(155,255,87,0.15)]"
                          : "border-white/8 bg-black/65 hover:border-cyan-primary/18 hover:bg-black/80"
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                        {plan.badge}
                      </div>
                      <h2 className="mt-4 text-3xl font-black text-white">
                        {plan.label}
                      </h2>
                      <div className="mt-4 text-4xl font-black text-cyan-primary">
                        {formatPrice(plan.price)}
                      </div>
                      <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-light-gray/42">
                        Delivery {plan.delivery}
                      </div>
                      <div className="mt-6 space-y-3">
                        {plan.features.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-start gap-3 text-sm leading-6 text-light-gray/68"
                          >
                            {isSelected ? (
                              <Check
                                size={16}
                                className="mt-1 shrink-0 text-cyan-primary"
                              />
                            ) : (
                              <Circle
                                size={16}
                                className="mt-1 shrink-0 text-white/30"
                              />
                            )}
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Card className="border-white/8 bg-secondary-dark/70">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
                      Optional Add-on
                    </div>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      Priority delivery
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-light-gray/68">
                      Get your project handled faster. Extra fee: +10% (min ₹10)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPriority((current) => !current)}
                    className={`flex shrink-0 items-start gap-4 rounded-[1.5rem] border p-5 text-left transition-colors md:w-auto ${
                      isPriority
                        ? "border-cyan-primary bg-cyan-primary/10"
                        : "border-white/8 bg-black/50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                        isPriority
                          ? "border-cyan-primary bg-cyan-primary text-primary-dark"
                          : "border-white/20 bg-transparent text-transparent"
                      }`}
                    >
                      <Check size={13} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        Add priority
                      </div>
                      <div className="mt-1 text-sm text-cyan-primary">
                        {selectedPlan
                          ? `+${formatPrice(payment.priorityFee)}`
                          : "Select plan first"}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={() =>
                      handleNextWithValidation(
                        4,
                        () => selectedPlanId !== null,
                        "step3",
                        "Please select a plan before continuing."
                      )
                    }
                    className="w-full"
                  >
                    Next <ArrowRight size={16} />
                  </Button>
                  {stepErrors.step3 && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-accent/10 px-4 py-3 text-sm text-amber-300">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {stepErrors.step3}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-8">
            <BackButton onClick={() => handleBack(3)} label="Back to plan" />

            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
               Your details and requirements
            </div>

            {reorderDraft && (
              <Card className="border-amber-400/15 bg-amber-400/5">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-300/80">
                      Reorder Mode
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-white">
                      Reordering {reorderDraft.parentOrderId}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-light-gray/66">
                      We prefilled the previous requirements so you can update
                      only what changed before confirming the new order.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReusePreviousData((current) => !current)}
                    className={`flex items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-colors ${
                      reusePreviousData
                        ? "border-cyan-primary bg-cyan-primary/10"
                        : "border-white/10 bg-black/35"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                        reusePreviousData
                          ? "border-cyan-primary bg-cyan-primary text-primary-dark"
                          : "border-white/20 bg-transparent text-transparent"
                      }`}
                    >
                      <Check size={13} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        Reuse previous data
                      </div>
                      <div className="mt-1 text-sm text-light-gray/58">
                        Turn this off if you want to write the requirements from
                        scratch.
                      </div>
                    </div>
                  </button>
                </div>
              </Card>
            )}

            <Card className="border-white/8 bg-black/72">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                    Referral Code
                  </div>
                  <h2 className="mt-3 text-2xl font-black text-white">
                    Apply up to 40% off
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-light-gray/64">
                    Client codes apply 5%, worker codes 10%, and admin codes 15%.
                    Student and new startup discounts are considered automatically.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      name="referralCode"
                      value={referralInput}
                      onChange={(event) => {
                        setReferralInput(event.target.value.toUpperCase());
                        setReferralError("");
                        setReferralFeedback("");
                      }}
                      placeholder="Enter referral code"
                      className="w-full rounded-2xl border border-white/10 bg-secondary-dark/70 px-4 py-3.5 text-sm uppercase tracking-[0.12em] text-white outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-white/28 focus:border-cyan-primary"
                    />
                    <Button
                      type="button"
                      onClick={handleApplyReferral}
                      disabled={isApplyingReferral}
                      className="sm:min-w-[180px]"
                    >
                      {isApplyingReferral ? "Checking..." : "Apply Code"}
                    </Button>
                    {hasReferralDiscount && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearReferral}
                        className="sm:min-w-[140px]"
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {referralFeedback && (
                    <div className="mt-4 rounded-2xl border border-cyan-primary/16 bg-cyan-primary/8 px-4 py-3 text-sm text-cyan-primary">
                      {referralFeedback}
                    </div>
                  )}
                  {referralError && (
                    <div className="mt-4 rounded-2xl border border-red-500/18 bg-red-500/8 px-4 py-3 text-sm text-red-300">
                      {referralError}
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-white/8 bg-black/35 p-5">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/38">
                    Live Pricing
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between text-sm text-light-gray/58">
                      <span>Subtotal</span>
                      <span className="font-semibold text-white">
                        {formatPrice(payment.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-light-gray/58">
                      <span>Referral discount</span>
                      <span
                        className={
                          hasReferralDiscount
                            ? "font-semibold text-emerald-300"
                            : "font-semibold text-white"
                        }
                      >
                        {hasReferralDiscount
                          ? `- ${formatPrice(payment.discountAmount)}`
                          : "Not applied"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/8 pt-4 text-sm text-light-gray/58">
                      <span>Total to invoice</span>
                      <span className="text-xl font-black text-cyan-primary">
                        {formatPrice(payment.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-white/8 bg-black/72">
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  {
                    name: "name",
                    label: "Name",
                    icon: User,
                    placeholder: "Your full name",
                  },
                  {
                    name: "email",
                    label: "Email",
                    icon: Mail,
                    placeholder: "you@example.com",
                    type: "email",
                  },
                  {
                    name: "phone",
                    label: "Phone",
                    icon: Phone,
                    placeholder: "+91 98765 43210",
                  },
                  {
                    name: "deadline",
                    label: "Deadline",
                    icon: Clock3,
                    type: "date",
                  },
                ].map((field) => {
                  const Icon = field.icon;
                  return (
                    <label key={field.name} className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-light-gray/42">
                        {field.label}
                      </span>
                      <div className="relative">
                        <Icon
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-primary/35"
                        />
                        <input
                          type={field.type || "text"}
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleChange}
                          placeholder={field.placeholder}
                          className="w-full rounded-2xl border border-white/10 bg-secondary-dark/70 px-12 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-primary"
                        />
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-6">
                <label className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-light-gray/42">
                    Project Description
                  </span>
                  <div className="relative">
                    <FileText
                      size={16}
                      className="absolute left-4 top-4 text-cyan-primary/35"
                    />
                    <textarea
                      name="projectDescription"
                      value={formData.projectDescription}
                      onChange={handleChange}
                      placeholder="What are you trying to build and who is it for? (Min 50 chars)"
                      className={`min-h-[140px] w-full rounded-2xl border bg-secondary-dark/70 px-12 py-4 text-sm text-white outline-none transition-colors ${
                        fieldErrors.projectDescription ? "border-amber-500/50" : "border-white/10 focus:border-cyan-primary"
                      }`}
                    />
                    {fieldErrors.projectDescription && (
                      <p className="mt-2 text-[10px] font-mono text-accent/80 uppercase tracking-wider pl-12 flex items-center gap-2">
                        <Info size={10} /> {fieldErrors.projectDescription}
                      </p>
                    )}
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-light-gray/42">
                    Features / Scope
                  </span>
                  <div className="relative">
                    <ListChecks
                      size={16}
                      className="absolute left-4 top-4 text-cyan-primary/35"
                    />
                    <textarea
                      name="features"
                      value={formData.features}
                      onChange={handleChange}
                      placeholder="List the sections, pages, assets, or expectations. (Min 30 chars)"
                      className={`min-h-[130px] w-full rounded-2xl border bg-secondary-dark/70 px-12 py-4 text-sm text-white outline-none transition-colors ${
                        fieldErrors.features ? "border-amber-500/50" : "border-white/10 focus:border-cyan-primary"
                      }`}
                    />
                    {fieldErrors.features && (
                      <p className="mt-2 text-[10px] font-mono text-accent/80 uppercase tracking-wider pl-12 flex items-center gap-2">
                        <Info size={10} /> {fieldErrors.features}
                      </p>
                    )}
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-light-gray/42">
                    References
                  </span>
                  <div className="relative">
                    <Sparkles
                      size={16}
                      className="absolute left-4 top-4 text-cyan-primary/35"
                    />
                    <textarea
                      name="references"
                      value={formData.references}
                      onChange={handleChange}
                      placeholder="Drop inspiration links or style references. (Optional, min 20 chars if entered)"
                      className={`min-h-[120px] w-full rounded-2xl border bg-secondary-dark/70 px-12 py-4 text-sm text-white outline-none transition-colors ${
                        fieldErrors.references ? "border-amber-500/50" : "border-white/10 focus:border-cyan-primary"
                      }`}
                    />
                    {fieldErrors.references && (
                      <p className="mt-2 text-[10px] font-mono text-accent/80 uppercase tracking-wider pl-12 flex items-center gap-2">
                        <Info size={10} /> {fieldErrors.references}
                      </p>
                    )}
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-light-gray/42">
                    Reference Files
                  </span>
                  <div className="rounded-2xl border border-dashed border-white/12 bg-secondary-dark/70 px-5 py-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-primary/20 bg-cyan-primary/8 text-cyan-primary">
                          <Paperclip size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">
                            Upload inspiration, docs, screenshots, or PDFs
                          </div>
                          <div className="mt-1 text-xs text-light-gray/42">
                            Up to 6 files. Links in the text box still work too.
                          </div>
                        </div>
                      </div>
                      <span className="relative inline-flex">
                        <input
                          type="file"
                          multiple
                          onChange={handleReferenceFilesChange}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-primary/35 px-5 py-3 text-sm font-bold text-cyan-primary">
                          <Upload size={15} /> Choose Files
                        </span>
                      </span>
                    </div>
                    {referenceFiles.length ? (
                      <div className="mt-4 grid gap-2">
                        {referenceFiles.map((file) => (
                          <div
                            key={`${file.name}-${file.size}`}
                            className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/30 px-4 py-3 text-xs"
                          >
                            <span className="truncate text-white/70">{file.name}</span>
                            <span className="shrink-0 text-light-gray/36">
                              {Math.ceil(file.size / 1024)} KB
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => setDemoRequested((current) => !current)}
                  className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition-colors ${
                    demoRequested
                      ? "border-cyan-primary bg-cyan-primary/10"
                      : "border-white/8 bg-secondary-dark/70"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                      demoRequested
                        ? "border-cyan-primary bg-cyan-primary text-primary-dark"
                        : "border-white/20 text-transparent"
                    }`}
                  >
                    <Check size={13} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Request a company demo before final scope lock
                    </div>
                    <div className="mt-1 text-xs leading-5 text-light-gray/45">
                      Useful for companies that want a quick walkthrough before the full build begins.
                    </div>
                  </div>
                </button>
              </div>
            </Card>

            <div className="flex justify-between gap-4">
              <BackButton onClick={() => handleBack(3)} label="Back" className="min-w-[150px]" />
              <Button
                onClick={() =>
                  handleNextWithValidation(
                    5,
                    () => {
                      const descLen = formData.projectDescription.trim().length;
                      const featLen = formData.features.trim().length;
                      const refLen = formData.references.trim().length;
                      return (
                        formData.name.trim() &&
                        formData.email.trim() &&
                        formData.phone.trim() &&
                        descLen >= 50 &&
                        featLen >= 30 &&
                        (refLen === 0 || refLen >= 20) &&
                        formData.deadline
                      );
                    },
                    "step4",
                    "Please provide more detail: Description (50+), Features (30+), and References (20+ if used)."
                  )
                }
              >
                Next <ArrowRight size={16} />
              </Button>
            </div>
            {stepErrors.step4 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-accent/10 px-4 py-3 text-sm text-amber-300">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {stepErrors.step4}
              </div>
            )}
          </div>
        </Step>

        <Step>
          <div className="space-y-8">
            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
             Secure your order
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-2">
              {[
                {
                  id: "cashfree",
                  icon: CreditCard,
                  title: "Cashfree Checkout",
                  description: "Recommended for cards, UPI, netbanking, and wallets.",
                },
                {
                  id: "qpay",
                  icon: QrCode,
                  title: "QR Fallback",
                  description: "Use this if checkout is unavailable or you prefer UPI QR.",
                },
              ].map((method) => {
                const Icon = method.icon;
                const active = paymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method.id);
                      setUtrNumber("");
                    }}
                    className={`rounded-2xl border p-5 text-left transition-colors ${
                      active
                        ? "border-cyan-primary/35 bg-cyan-primary/10"
                        : "border-white/8 bg-black/40 hover:border-white/16"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-primary">
                        <Icon size={19} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">
                          {method.title}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-light-gray/45">
                          {method.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
              {paymentMethod === "qpay" ? (
                <QRPaymentStep
                  amount={payment.advancePayment}
                  onUtrSubmit={(utr) => {
                    setUtrNumber(utr);
                    goToStep(6);
                  }}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <Card className="border-cyan-primary/20 bg-cyan-primary/5 p-6 md:p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-primary/20 bg-cyan-primary/10 text-cyan-primary">
                    <CreditCard size={24} />
                  </div>
                  <h3 className="mt-6 text-2xl font-black text-white">
                    Cashfree secure checkout
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-light-gray/60">
                    We will create your order first, then redirect you to Cashfree
                    for the advance payment. If checkout fails, return here and
                    switch to QR fallback.
                  </p>
                  <div className="mt-8 rounded-2xl border border-white/8 bg-black/35 p-5">
                    <div className="flex items-center justify-between text-sm text-light-gray/66">
                      <span>Advance due now</span>
                      <span className="text-2xl font-black text-cyan-primary">
                        {formatPrice(payment.advancePayment)}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="mt-8 w-full"
                    onClick={() => {
                      setUtrNumber("");
                      goToStep(6);
                    }}
                  >
                    Continue to Review <ArrowRight size={16} />
                  </Button>
                </Card>
              )}

              <div className="space-y-6">
                <Card className="border-white/8 bg-black/72">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-primary/72">
                    Payment Breakdown
                  </div>
                  <div className="mt-8 space-y-5">
                    <div className="flex items-center justify-between text-sm text-light-gray/66">
                      <span>Base price</span>
                      <span className="font-semibold text-white">
                        {formatPrice(payment.basePrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-light-gray/66">
                      <span>Priority fee</span>
                      <span className="font-semibold text-white">
                        {payment.priorityFee > 0
                          ? formatPrice(payment.priorityFee)
                          : "Not added"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-light-gray/66">
                      <span>Referral discount</span>
                      <span
                        className={
                          hasReferralDiscount
                            ? "font-semibold text-emerald-300"
                            : "font-semibold text-white"
                        }
                      >
                        {hasReferralDiscount
                          ? `- ${formatPrice(payment.discountAmount)}`
                          : "Not applied"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/8 pt-5 text-sm text-light-gray/66">
                      <span>Total price</span>
                      <span className="text-2xl font-black text-cyan-primary">
                        {formatPrice(payment.total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-light-gray/66">
                      <span>Advance payment</span>
                      <span className="font-semibold text-white underline decoration-cyan-primary/30 decoration-2 underline-offset-4">
                        {formatPrice(payment.advancePayment)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-light-gray/66">
                      <span>Remaining payment</span>
                      <span className="font-semibold text-white">
                        {formatPrice(payment.remainingPayment)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl border border-cyan-primary/12 bg-black/45 p-5 text-sm leading-7 text-light-gray/64">
                    Please pay the <strong className="text-cyan-primary">Advance Payment</strong> amount to proceed. The remaining amount will be due upon project completion.
                    {hasReferralDiscount ? (
                      <span className="mt-3 block text-emerald-300">
                        Referral saved: {referralState.discountPercent}% off.
                      </span>
                    ) : null}
                    {hasStudentStartupDiscount ? (
                      <span className="mt-3 block text-emerald-300">
                        Student/startup discount: {studentStartupDiscountPercent}% {isStudentStartupDiscountApplied ? "applied" : "available but referral is higher"}.
                      </span>
                    ) : null}
                  </div>
                </Card>
                
                <BackButton onClick={() => handleBack(4)} label="Back to requirements" className="w-full min-w-0" />
              </div>
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-8">
            <BackButton onClick={() => handleBack(5)} label="Back to payment" />

            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
              Step 6 - Review and confirm
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-white/8 bg-black/72">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-primary/72">
                  Order Review
                </div>
                <div className="mt-8 space-y-4">
                  {[
                    ...(reorderDraft
                      ? [["Reorder Of", reorderDraft.parentOrderId]]
                      : []),
                    ["Category", selectedCategory?.name],
                    ["Service", selectedService?.name],
                    ["Plan", selectedPlan?.label],
                    ["Priority", isPriority ? "High" : "Normal"],
                    [
                      "Customer Type",
                      resolvedCustomerType === "returning"
                        ? "Returning customer"
                        : "New customer",
                    ],
                    ...(hasReferralDiscount
                      ? [[
                          "Referral",
                          `${referralState.code} (${referralState.discountPercent}% off)`,
                        ]]
                      : []),
                    ...(hasStudentStartupDiscount
                      ? [[
                          "Student/Startup Discount",
                          `${studentStartupDiscountPercent}% ${
                            isStudentStartupDiscountApplied ? "applied" : "available"
                          }`,
                        ]]
                      : []),
                    [
                      "Payment",
                      paymentMethod === "cashfree" ? "Cashfree checkout" : "QR fallback",
                    ],
                    ...(demoRequested ? [["Demo", "Requested"]] : []),
                    ...(referenceFiles.length
                      ? [["Reference Files", `${referenceFiles.length} selected`]]
                      : []),
                    ["Advance", formatPrice(payment.advancePayment)],
                    ["Remaining", formatPrice(payment.remainingPayment)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 border-b border-white/8 pb-4 text-sm"
                    >
                      <span className="text-light-gray/54">{label}</span>
                      <span className="font-semibold text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-white/8 bg-black/72">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-primary/72">
                  Requirements
                </div>
                <div className="mt-6 space-y-5 text-sm leading-7 text-light-gray/68">
                  <div>
                    <div className="font-semibold text-white">Name</div>
                    <div>{formData.name}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Email</div>
                    <div>{formData.email}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Phone</div>
                    <div>{formData.phone}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      Project description
                    </div>
                    <div>{formData.projectDescription}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Features</div>
                    <div>{formData.features}</div>
                  </div>
                  {formData.references && (
                    <div>
                      <div className="font-semibold text-white">References</div>
                      <div>{formData.references}</div>
                    </div>
                  )}
                  {referenceFiles.length ? (
                    <div>
                      <div className="font-semibold text-white">Reference Files</div>
                      <div>{referenceFiles.map((file) => file.name).join(", ")}</div>
                    </div>
                  ) : null}
                  {demoRequested ? (
                    <div>
                      <div className="font-semibold text-white">Demo Request</div>
                      <div>Requested before final scope lock</div>
                    </div>
                  ) : null}
                  <div>
                    <div className="font-semibold text-white">Deadline</div>
                    <div>{formData.deadline}</div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="border-cyan-primary/10 bg-secondary-dark/75">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-primary/72">
                Terms & Conditions
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {TERMS_POINTS.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-black/45 px-5 py-4 text-sm leading-7 text-light-gray/68"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setTermsAccepted((current) => !current)}
                className={`mt-8 flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-colors ${
                  termsAccepted
                    ? "border-cyan-primary bg-cyan-primary/10"
                    : "border-white/8 bg-black/50"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                    termsAccepted
                      ? "border-cyan-primary bg-cyan-primary text-primary-dark"
                      : "border-white/20 bg-transparent text-transparent"
                  }`}
                >
                  <Check size={13} />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <ShieldCheck size={16} className="text-cyan-primary" />
                    <span>
                      I agree to the{" "}
                      <Link
                        to="/terms"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-cyan-primary underline hover:text-cyan-primary/80"
                      >
                        Terms & Conditions
                      </Link>
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-light-gray/58">
                    The booking will only be confirmed once this is accepted.
                  </div>
                </div>
              </button>
            </Card>

            {submitError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-black/65 p-6 md:flex-row md:items-center md:justify-between">
              <div className="text-sm leading-7 text-light-gray/64">
                Confirming now saves the booking and starts the selected payment path.
                Cashfree redirects to checkout; QR fallback opens the WhatsApp summary
                after you submit the UTR.
              </div>
              <div className="flex flex-wrap gap-4">
                <BackButton onClick={() => handleBack(5)} label="Edit Review" className="min-w-[170px]" />
                <AnimatedPaymentButton
                  onClick={() => {
                    if (!termsAccepted) {
                      setSubmitError("Please accept the Terms & Conditions to confirm your order.");
                      return;
                    }
                    handleSubmit();
                  }}
                  disabled={false}
                  processing={isSubmitting}
                  idleIcon={ShieldCheck}
                  idleLabel="Confirm Order"
                  processingLabel={
                    paymentMethod === "qpay"
                      ? "Submitting order..."
                      : "Starting payment..."
                  }
                  className="min-w-[220px]"
                />
              </div>
            </div>
          </div>
        </Step>
      </Stepper>

      <div className="mt-12 rounded-[28px] border border-white/8 bg-black/55 px-6 py-5 text-sm leading-7 text-light-gray/64">
        Need help before confirming? Message us on{" "}
        <a
          href={`https://wa.me/${CONTACT_INFO.whatsappNumber}`}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-cyan-primary"
        >
          WhatsApp
        </a>{" "}
        or go back and adjust the scope.
      </div>
    </div>
  );
};

export default BookService;
