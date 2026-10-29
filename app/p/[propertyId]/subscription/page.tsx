"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { useAuth } from "@/providers/AuthProvider";
import { evaluateSubscription, calculateStackedExpiry } from "@/lib/subscriptionEngine";
import { usePlatformConfig } from "@/lib/usePlatformConfig";
import { RazorpayModalMockup } from "@/components/dashboard/RazorpayModalMockup";
import { WhatsAppWalletModal } from "@/components/dashboard/WhatsAppWalletModal";
import {
  Sparkles,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  QrCode,
  Layers,
  FileText,
  Download,
  Zap,
  Building2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Phone,
  HelpCircle,
  Lock,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  Eye,
  Trash2,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import {
  whatsappCreditStore,
  WHATSAPP_CREDIT_PACKAGES,
  WhatsAppCreditPackage,
  WhatsAppCreditTransaction,
} from "@/constants/whatsappCreditStore";
import {
  emailCreditStore,
  EmailCreditTransaction,
} from "@/constants/emailCreditStore";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TenoPilotInvoiceModal, InvoiceData } from "@/components/billing/TenoPilotInvoiceModal";

export default function SubscriptionBillingPage() {
  const params = useParams();
  const propertyId = (params?.propertyId as string) || "sunshine-pg";
  const { profile } = useAuth();
  const router = useRouter();
  const { config: platformConfig } = usePlatformConfig();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<
    "PRO_MONTHLY" | "PRO_QUARTERLY" | "PRO_SEMI_ANNUAL" | "PRO_ANNUAL"
  >("PRO_MONTHLY");
  const [mobilePlanIndex, setMobilePlanIndex] = useState<number>(0);
  const [paymentChannel, setPaymentChannel] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);

  // Auto-slide mobile plan carousel across all 5 plans (including Custom Tailored Plan)
  useEffect(() => {
    const timer = setInterval(() => {
      setMobilePlanIndex((prev) => (prev + 1) % 5);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const getPlanPrice = (plan: "PRO_MONTHLY" | "PRO_QUARTERLY" | "PRO_SEMI_ANNUAL" | "PRO_ANNUAL") => {
    switch (plan) {
      case "PRO_QUARTERLY":
        return platformConfig.proQuarterlyPrice ?? 3299;
      case "PRO_SEMI_ANNUAL":
        return platformConfig.proSemiAnnualPrice ?? 6299;
      case "PRO_ANNUAL":
        return platformConfig.proAnnualPrice ?? 11999;
      case "PRO_MONTHLY":
      default:
        return platformConfig.proMonthlyPrice ?? 1199;
    }
  };

  const getPlanDurationDays = (plan: "PRO_MONTHLY" | "PRO_QUARTERLY" | "PRO_SEMI_ANNUAL" | "PRO_ANNUAL") => {
    switch (plan) {
      case "PRO_QUARTERLY":
        return 90;
      case "PRO_SEMI_ANNUAL":
        return 180;
      case "PRO_ANNUAL":
        return 365;
      case "PRO_MONTHLY":
      default:
        return 30;
    }
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case "PRO_QUARTERLY":
        return "Pro Quarterly (90 Days)";
      case "PRO_SEMI_ANNUAL":
        return "Pro Semi-Annual (180 Days)";
      case "PRO_ANNUAL":
        return "Pro Annual (365 Days)";
      case "PRO_MONTHLY":
      default:
        return "Pro Monthly (30 Days)";
    }
  };

  const customPlanWhatsappUrl = `https://wa.me/91${platformConfig.founderWhatsapp}?text=${encodeURIComponent(
    `Hi Ramesh, I manage ${profile?.propertyName || "our property"} (Property ID: ${propertyId}) and have 300+ beds (e.g. 380 tenants). I would like to discuss a custom tailored Pro plan for our operations.`
  )}`;

  // Offline Verification State
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [isCompressingScreenshot, setIsCompressingScreenshot] = useState(false);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isCancellingProof, setIsCancellingProof] = useState(false);

  // Pending Request Tracking
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null);
  const [loadingPending, setLoadingPending] = useState(true);
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<InvoiceData | null>(null);

  const sub = evaluateSubscription(profile);

  // 💬 WhatsApp & ✉️ Email Cloud Communication Wallets State
  const [whatsappCredits, setWhatsappCredits] = useState<number>(() =>
    whatsappCreditStore.getCredits(propertyId)
  );
  const [whatsappTransactions, setWhatsappTransactions] = useState<WhatsAppCreditTransaction[]>(() => whatsappCreditStore.getTransactions(propertyId));

  const [emailCredits, setEmailCredits] = useState<number>(() =>
    emailCreditStore.getCredits(propertyId)
  );
  const [emailTransactions, setEmailTransactions] = useState<EmailCreditTransaction[]>(() => emailCreditStore.getTransactions(propertyId));
  const [activeLedgerTab, setActiveLedgerTab] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP");

  const [selectedCreditPack, setSelectedCreditPack] = useState<WhatsAppCreditPackage | null>(null);
  const [showCreditRechargeModal, setShowCreditRechargeModal] = useState(false);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState(false);

  // Sync WhatsApp & Email Credits in Real-Time
  useEffect(() => {
    whatsappCreditStore.initFirebaseListener(propertyId);
    whatsappCreditStore.fetchWalletFromFirestore(propertyId);
    setWhatsappCredits(whatsappCreditStore.getCredits(propertyId));
    setWhatsappTransactions(whatsappCreditStore.getTransactions(propertyId));
    const unsubWa = whatsappCreditStore.subscribe(() => {
      setWhatsappCredits(whatsappCreditStore.getCredits(propertyId));
      setWhatsappTransactions(whatsappCreditStore.getTransactions(propertyId));
    });

    emailCreditStore.initFirebaseListener(propertyId);
    emailCreditStore.fetchWalletFromFirestore(propertyId);
    setEmailCredits(emailCreditStore.getCredits(propertyId));
    setEmailTransactions(emailCreditStore.getTransactions(propertyId));
    const unsubEmail = emailCreditStore.subscribe(() => {
      setEmailCredits(emailCreditStore.getCredits(propertyId));
      setEmailTransactions(emailCreditStore.getTransactions(propertyId));
    });

    return () => {
      unsubWa();
      unsubEmail();
    };
  }, [propertyId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBuyCreditPack = (pack: WhatsAppCreditPackage) => {
    setSelectedCreditPack(pack);
    setShowCreditRechargeModal(true);
  };

  const handleConfirmCreditRecharge = async () => {
    if (!selectedCreditPack) return;
    setIsPurchasingCredits(true);
    try {
      whatsappCreditStore.addCredits(
        propertyId,
        selectedCreditPack.credits,
        `${selectedCreditPack.name} (+${selectedCreditPack.credits} WhatsApp messages)`
      );
      triggerToast(`🎉 Successfully added +${selectedCreditPack.credits} WhatsApp credits to your property wallet!`);
      setShowCreditRechargeModal(false);
      setSelectedCreditPack(null);
    } catch (err: any) {
      triggerToast(`⚠️ Failed to recharge: ${err.message}`);
    } finally {
      setIsPurchasingCredits(false);
    }
  };

  // 1. Fetch pending verification request if any
  const loadPendingRequest = async () => {
    if (!profile?.email && !profile?.uid) return;
    try {
      setLoadingPending(true);
      const url = `/api/subscription/pending?${profile.uid ? `userId=${profile.uid}&` : ""}${
        profile.email ? `email=${encodeURIComponent(profile.email)}` : ""
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hasPending && data.request) {
        setPendingRequest(data.request);
        setRejectedNotice(null);
      } else {
        setPendingRequest(null);
        if (data.hasRejected && data.rejectedReason) {
          setRejectedNotice(data.rejectedReason);
        }
      }
    } catch (err) {
      console.warn("Notice checking pending subscription request:", err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    loadPendingRequest();
  }, [profile?.email, profile?.uid]);

  // 2. Fetch past subscription transactions for this customer
  useEffect(() => {
    async function loadTransactions() {
      const email = profile?.email?.toLowerCase().trim();
      const uid = profile?.uid?.trim();

      const foundList: any[] = [];
      const seenIds = new Set<string>();

      // A. Query apex subscription-history endpoint (searches subscription_transactions, platform_admin, and approved requests)
      try {
        const phone = profile?.phone?.replace(/\D/g, "").slice(-10);
        const queryParams = new URLSearchParams();
        if (email) queryParams.set("email", email);
        if (uid) queryParams.set("userId", uid);
        if (phone) queryParams.set("phone", phone);
        if (email || uid || phone) {
          const res = await fetch(`/api/apex/subscription-history?${queryParams.toString()}`);
          if (res.ok) {
            const data = await res.json();
            if (data.history && Array.isArray(data.history)) {
              data.history.forEach((item: any) => {
                if (!seenIds.has(item.id)) {
                  seenIds.add(item.id);
                  foundList.push(item);
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn("Notice fetching from apex subscription-history:", err);
      }

      // B. Direct Firestore fallback check for platform_admin/billing/transactions
      try {
        if (email) {
          const qAdmin = query(
            collection(db, "platform_admin", "billing", "transactions"),
            where("customerEmail", "==", email)
          );
          const snapAdmin = await getDocs(qAdmin);
          snapAdmin.docs.forEach((d) => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              foundList.push({ id: d.id, ...d.data() });
            }
          });
        }
      } catch (e) {}

      // C. Direct Firestore fallback check for subscription_transactions
      try {
        if (email) {
          const qSub = query(
            collection(db, "subscription_transactions"),
            where("customerEmail", "==", email)
          );
          const snapSub = await getDocs(qSub);
          snapSub.docs.forEach((d) => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              foundList.push({ id: d.id, ...d.data() });
            }
          });
        }
      } catch (e) {}

      foundList.sort(
        (a: any, b: any) =>
          new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      );
      setHistoryTransactions(foundList);
    }
    loadTransactions();
  }, [profile?.email, profile?.uid, profile?.phone]);

  // Comprehensive Invoices Matrix: Merges active plan invoice, historical records, and WhatsApp credit recharges
  const allInvoices = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    // 1. Current Active Pro Subscription Invoice (guarantees an active Pro owner always has an invoice available)
    const isAnnualPlan = profile?.plan === "PRO_ANNUAL" || sub.plan === "PRO_ANNUAL";
    if (
      sub.isPro ||
      profile?.subscriptionStatus === "ACTIVE_PRO" ||
      profile?.plan === "PRO_ANNUAL" ||
      profile?.plan === "PRO_MONTHLY" ||
      profile?.plan === "VIP_PASS"
    ) {
      const activeId = `active-sub-${profile?.uid || propertyId}`;
      const activeInvNo = `INV-TP-2026-${(profile?.uid || propertyId || "10029").replace(/\D/g, "").slice(-5) || "10029"}`;
      seen.add(activeInvNo);
      seen.add(activeId);
      list.push({
        id: activeId,
        invoiceNumber: activeInvNo,
        createdAt: profile?.createdAt || new Date().toISOString(),
        date: profile?.createdAt || new Date().toISOString(),
        plan: profile?.plan || (isAnnualPlan ? "PRO_ANNUAL" : "PRO_MONTHLY"),
        durationDays: isAnnualPlan ? 365 : 30,
        amountPaid: isAnnualPlan ? 11489 : 999,
        amount: isAnnualPlan ? 11489 : 999,
        paymentMode: "Razorpay / UPI (Verified Active)",
        receiptNumber: `REC-${(profile?.uid || propertyId || "88412").slice(-6).toUpperCase()}`,
        status: "COMPLETED",
        planExpiresAt: profile?.planExpiresAt || null,
        customerName: profile?.displayName || "Property Partner",
        customerEmail: profile?.email || "",
        customerPhone: profile?.phone || "",
        propertyName: profile?.propertyName || "TenoPilot PG",
        notes: "Official Tax Invoice for active TenoPilot Pro Subscription",
        isCurrentActive: true,
      });
    }

    // 2. Add fetched transactions from Firestore and Apex
    historyTransactions.forEach((tx) => {
      const invNo =
        tx.invoiceNumber ||
        `INV-TP-2026-${(tx.receiptNumber || tx.id || "94821")
          .toString()
          .replace(/\D/g, "")
          .slice(-5) || "10029"}`;
      if (!seen.has(invNo) && !seen.has(tx.id)) {
        seen.add(invNo);
        seen.add(tx.id);
        list.push({
          ...tx,
          invoiceNumber: invNo,
          customerName: tx.customerName || profile?.displayName || "Property Partner",
          customerEmail: tx.customerEmail || profile?.email || "",
          customerPhone: tx.customerPhone || profile?.phone || "",
          propertyName: tx.propertyName || profile?.propertyName || "TenoPilot PG",
        });
      }
    });

    // 3. Add WhatsApp Credit Pack purchases from whatsappCreditStore
    whatsappTransactions.forEach((wt) => {
      if (
        wt.type === "PURCHASE" ||
        wt.description?.toLowerCase().includes("pack") ||
        wt.description?.toLowerCase().includes("recharge")
      ) {
        const wtId = `wa-${wt.id}`;
        if (!seen.has(wtId)) {
          seen.add(wtId);
          const creditCount = Math.abs(wt.amount);
          const matchedPkg = WHATSAPP_CREDIT_PACKAGES.find((p) => p.credits === creditCount);
          const inrAmount = matchedPkg ? matchedPkg.priceInr : creditCount >= 2000 ? 1699 : creditCount >= 750 ? 749 : 299;

          list.push({
            id: wtId,
            invoiceNumber: `INV-WA-2026-${wt.id.replace(/\D/g, "").slice(-5) || "30041"}`,
            createdAt: wt.timestamp || new Date().toISOString(),
            date: wt.timestamp || new Date().toISOString(),
            plan: wt.description || "WhatsApp Cloud Message Credit Pack",
            durationDays: 365,
            amountPaid: inrAmount,
            amount: inrAmount,
            paymentMode: "Razorpay / UPI",
            receiptNumber: `WA-REC-${wt.id.slice(-6).toUpperCase()}`,
            status: "COMPLETED",
            creditsAdded: creditCount,
            customerName: profile?.displayName || "Property Partner",
            customerEmail: profile?.email || "",
            customerPhone: profile?.phone || "",
            propertyName: profile?.propertyName || "TenoPilot PG",
            notes: `WhatsApp Cloud Credits Invoice: ${wt.description}`,
            isCreditPack: true,
          });
        }
      }
    });

    list.sort(
      (a, b) =>
        new Date(b.date || b.createdAt).getTime() -
        new Date(a.date || a.createdAt).getTime()
    );
    return list;
  }, [sub.isPro, sub.plan, profile, propertyId, historyTransactions, whatsappTransactions]);

  // Compression utility: scales to max 1280px (crisp UTR & amounts) and 0.85 JPEG quality
  const compressPaymentScreenshot = async (
    file: File
  ): Promise<{ base64: string; sizeKb: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            const rawBase64 = event.target?.result as string;
            resolve({
              base64: rawBase64,
              sizeKb: Math.round((rawBase64.length * 3) / 4 / 1024),
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          const sizeKb = Math.round((compressedBase64.length * 3) / 4 / 1024);
          resolve({ base64: compressedBase64, sizeKb });
        };
        img.onerror = () => reject(new Error("Unable to parse image for compression."));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Unable to read image file."));
      reader.readAsDataURL(file);
    });
  };

  // Process and compress image file
  const processSelectedFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      triggerToast("⚠️ Please upload a valid image file (PNG, JPG, JPEG, WebP).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      triggerToast("⚠️ File exceeds 20MB. Please choose a smaller image.");
      return;
    }

    setIsCompressingScreenshot(true);
    setScreenshotFileName(file.name);

    try {
      const { base64, sizeKb } = await compressPaymentScreenshot(file);
      setScreenshotPreview(base64);
      setCompressedSizeKb(sizeKb);
      triggerToast(`✓ Image optimized to ${sizeKb} KB (crisp HD quality ready for review)`);
    } catch (err: any) {
      console.error("Screenshot compression notice:", err);
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result as string;
        setScreenshotPreview(raw);
        setCompressedSizeKb(Math.round((raw.length * 3) / 4 / 1024));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingScreenshot(false);
    }
  };

  // Handle Screenshot Selection from Input
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  // Handle Screenshot Drag & Drop
  const handleScreenshotDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Submit Offline Payment Proof for Manual Founder Approval
  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!screenshotPreview) {
      triggerToast("⚠️ Please upload your payment screenshot before proceeding.");
      return;
    }

    setIsSubmittingProof(true);

    try {
      const res = await fetch("/api/subscription/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.uid,
          customerEmail: profile?.email,
          customerName: profile?.displayName || "PG Owner",
          customerPhone: profile?.phone || "",
          propertyId,
          propertyName: "TenoPilot PG",
          plan: selectedPlan,
          amount: getPlanPrice(selectedPlan),
          paymentMode: "UPI / Bank Transfer (Offline)",
          screenshotData: screenshotPreview,
          notes: receiptNotes || "Payment screenshot submitted via client subscription portal",
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("🎉 Payment proof submitted! Founder review typically takes under 15 minutes.");
        setScreenshotPreview(null);
        setScreenshotFileName(null);
        setReceiptNotes("");
        setPendingRequest(data.request);
      } else {
        triggerToast(`⚠️ Notice: ${data.message}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Submission failed: ${err.message}`);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Cancel Pending Request to re-upload
  const handleCancelPendingRequest = async () => {
    if (!pendingRequest?.id) return;
    setIsCancellingProof(true);

    try {
      const res = await fetch(
        `/api/subscription/request?requestId=${pendingRequest.id}&userId=${profile?.uid || ""}&email=${encodeURIComponent(
          profile?.email || ""
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        triggerToast("Request cancelled. You can now submit a new payment proof.");
        setPendingRequest(null);
      } else {
        triggerToast(`⚠️ Could not cancel: ${data.message}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Error: ${err.message}`);
    } finally {
      setIsCancellingProof(false);
    }
  };

  const proFeatures = [
    "Unlimited Tenants & Multi-Bed Management",
    "Dual-Ledger Accounting (Rent vs Security Deposit)",
    "1-Tap WhatsApp Cloud & Official Email Reminders",
    "Dynamic UPI QR Code Generation per Room/Bed",
    "Instant E-Receipt Auto-Dispatch with PDF Invoices",
    "Instant Multi-Property Portfolio Switching",
    "24/7 Dedicated Priority Phone & WhatsApp Support",
  ];

  return (
    <div className="flex h-screen bg-[#fff8f6] text-[#201a17] overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#fff8f6]">
        <PropertyHeader
          title="Subscription & Billing Hub"
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        <div className="p-4 sm:p-8 space-y-8 max-w-[1280px] mx-auto w-full pb-28">
          {/* Header Banner */}
          <div className="space-y-3 border-b border-[#d7c2b9]/40 pb-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/15 text-[#964407] px-2.5 py-0.5 rounded-full border border-amber-500/30">
                OFFICIAL SUBSCRIPTION HUB 💎
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Live Status
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#201a17]">
              Subscription & Plan Management
            </h1>
            <p className="text-xs text-gray-500">
              Manage your Pro subscription, download GST-compliant tax invoices, and recharge WhatsApp Cloud message credits.
            </p>

            {/* Quick Navigation Anchor Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href="#active-plan"
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-[#d7c2b9]/70 hover:bg-[#faf4f0] text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <span>⚡ Active Plan</span>
              </a>
              <a
                href="#invoices-section"
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-amber-300 hover:bg-amber-50/50 text-[#964407] transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Tax Invoices</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black leading-none">
                  {allInvoices.length}
                </span>
              </a>
              <a
                href="#whatsapp-wallet"
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-[#d7c2b9]/70 hover:bg-[#faf4f0] text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <span>💬 WhatsApp Wallet</span>
              </a>
              <a
                href="#payment-options"
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-[#d7c2b9]/70 hover:bg-[#faf4f0] text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <span>💳 Renew / Extend</span>
              </a>
            </div>
          </div>

          {/* ❌ REJECTED PAYMENT PROOF NOTICE CARD (Rendered if founder rejected previous submission) */}
          {rejectedNotice && !pendingRequest && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-rose-50/95 via-rose-100/60 to-red-50/80 border-2 border-rose-300 shadow-md animate-in fade-in space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-rose-500/20">
                    ❌
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 font-black text-[10px] uppercase tracking-wider">
                        Payment Proof Not Approved
                      </span>
                    </div>
                    <h3 className="text-base font-black text-rose-950 font-serif">
                      Previous Payment Verification Failed
                    </h3>
                    <p className="text-xs text-rose-900 leading-relaxed max-w-2xl font-medium">
                      <strong>Reason from Founder:</strong> "{rejectedNotice}"
                    </p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      Please verify your bank UTR / transaction and submit a fresh payment receipt below for immediate re-verification.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                  <a
                    href="#payment-options"
                    onClick={() => setRejectedNotice(null)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>🔄 Upload New Payment Proof</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ⏳ PENDING VERIFICATION NOTICE CARD (Rendered if customer has an offline proof under review) */}
          {pendingRequest && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-100/40 border-2 border-amber-300 shadow-md animate-in fade-in space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-amber-500/20 animate-pulse">
                    ⏳
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-[10px] uppercase tracking-wider">
                        Verification In Progress
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">
                        Request ID: <strong>{pendingRequest.id}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-black text-gray-900 font-serif">
                      Your Payment Screenshot is Under Review
                    </h3>
                    <p className="text-xs text-gray-700 leading-relaxed max-w-2xl">
                      We have safely received your proof for <strong>{getPlanDisplayName(pendingRequest.plan)}</strong>. Our founder team verifies transactions directly with bank records. Your workspace will automatically unlock immediately upon approval.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                  <a
                    href={`https://wa.me/91${platformConfig.founderWhatsapp}?text=${encodeURIComponent(
                      `Hi Ramesh, I have submitted payment proof for TenoPilot Pro (${pendingRequest.plan}) for my PG. Request ID: ${pendingRequest.id}. Please verify.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>📱 Priority WhatsApp Ping</span>
                  </a>

                  <button
                    type="button"
                    disabled={isCancellingProof}
                    onClick={handleCancelPendingRequest}
                    className="text-[11px] text-gray-500 hover:text-rose-600 underline font-medium cursor-pointer transition-colors"
                  >
                    {isCancellingProof ? "Cancelling..." : "Cancel & Re-Upload Proof"}
                  </button>
                </div>
              </div>

              {/* Uploaded Proof Preview Bar */}
              {pendingRequest.screenshotUrl && (
                <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setZoomedScreenshot(pendingRequest.screenshotUrl)}
                      className="relative w-16 h-12 rounded-xl bg-gray-200 border border-amber-300 overflow-hidden cursor-pointer hover:opacity-90 shadow-2xs group"
                      title="Click to zoom screenshot"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pendingRequest.screenshotUrl}
                        alt="Payment Proof"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-[11px]">Payment Proof Attached</p>
                      <p className="text-[10px] text-gray-500">
                        Submitted: {new Date(pendingRequest.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} • Click thumbnail to inspect
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-900 font-mono text-[10px] font-bold">
                    Pending Founder Approval
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE PLAN STATUS CARD */}
          <div
            id="active-plan"
            className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-xs ${
              sub.status === "ACTIVE_PRO"
                ? "bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 border-emerald-500/30"
                : sub.inGracePeriod
                ? "bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 border-amber-500/40"
                : sub.isPreExpiry
                ? "bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30 border-blue-500/30"
                : "bg-gradient-to-br from-amber-50/60 via-white to-orange-50/20 border-amber-400/30"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide border flex items-center gap-1.5 shadow-2xs ${
                      sub.status === "ACTIVE_PRO"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : sub.inGracePeriod
                        ? "bg-amber-100 text-amber-900 border-amber-400 animate-pulse"
                        : sub.isPreExpiry
                        ? "bg-blue-100 text-blue-900 border-blue-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {sub.inGracePeriod ? (
                      <Clock className="w-3 h-3" />
                    ) : sub.isPro ? (
                      <ShieldCheck className="w-3 h-3" />
                    ) : (
                      <Zap className="w-3 h-3 text-[#c2652a]" />
                    )}
                    <span>
                      {sub.status === "ACTIVE_PRO"
                        ? "💎 Pro Monthly Active"
                        : sub.inGracePeriod
                        ? `⏳ 7-Day Pro Grace (${sub.graceDaysRemaining}d Left)`
                        : sub.isPreExpiry
                        ? `💎 Pro (Expires in ${sub.daysRemaining}d)`
                        : `⚡ 10-Day Free Express Trial (${sub.daysRemaining === 0 ? "Ends Today" : `${sub.daysRemaining}d Left`})`}
                    </span>
                  </span>

                  <span className="text-[11px] font-mono text-gray-500">
                    Cycle Validity: <strong>{sub.expiryDateFormatted}</strong>
                  </span>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed">
                  {sub.inGracePeriod
                    ? `Your Pro cycle completed on ${sub.expiryDateFormatted}. All operations remain active during your 7-day grace period.`
                    : sub.isPreExpiry
                    ? `Your Pro subscription expires on ${sub.expiryDateFormatted}. Early renewals seamlessly stack +30 days without losing current days.`
                    : sub.isPro
                    ? `Enjoy uninterrupted access to automated WhatsApp reminders, verified email dispatches, and multi-bed management.`
                    : `You have full access to explore TenoPilot features. Upgrade to Pro (₹999/mo) to unlock automated multi-channel batch reminders.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href="#invoices-section"
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#d7c2b9] hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Tax Invoices ({allInvoices.length})</span>
                </a>

                <a
                  href="#payment-options"
                  className="px-5 py-2.5 rounded-xl bg-[#201a17] hover:bg-[#342924] text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{sub.isPro ? "Extend / Stack Renewal" : `Upgrade to Pro (₹${platformConfig.proMonthlyPrice})`}</span>
                </a>
              </div>
            </div>
          </div>

          {/* 💬 WHATSAPP CLOUD MESSAGE WALLET & CREDITS HUB */}
          <div id="whatsapp-wallet" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#d7c2b9]/60 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-black text-lg sm:text-xl text-gray-900">
                      WhatsApp Message Wallet & Credits
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Meta Cloud API Live
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Official automated WhatsApp dispatches (Welcome Notices, Rent Reminders & Verified Payment Receipts)
                  </p>
                </div>
              </div>

              {/* Dual-Channel Live Balance Cards */}
              <div className="flex flex-col sm:items-end gap-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  {/* WhatsApp Wallet Pill */}
                  <div className="flex items-center gap-2.5 bg-[#fcf9f8] p-2 px-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">💬 WhatsApp Balance</span>
                      <span className={`font-mono font-black text-lg tabular-nums ${whatsappCredits <= 0 ? "text-rose-600" : "text-emerald-800"}`}>
                        {whatsappCredits} <span className="text-[11px] font-semibold text-gray-600">Credits</span>
                      </span>
                      {whatsappCredits <= 0 && (
                        <span className="block text-[9px] font-black text-rose-600 tracking-wide uppercase">Gateway Locked 🔒</span>
                      )}
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${whatsappCredits > 50 ? "bg-emerald-500" : whatsappCredits > 10 ? "bg-amber-500 animate-pulse" : "bg-rose-500 animate-ping"}`} />
                  </div>

                  {/* Email Wallet Pill */}
                  <div className="flex items-center gap-2.5 bg-[#fcf9f8] p-2 px-3.5 rounded-2xl border border-cyan-200 shadow-2xs">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">✉️ Email Balance</span>
                        <span className="text-[9px] font-bold text-cyan-700 bg-cyan-100 px-1.5 py-0.2 rounded font-mono">{profile?.emailMultiplier || platformConfig.emailMultiplier || 3}X</span>
                      </div>
                      <span className={`font-mono font-black text-lg tabular-nums ${emailCredits <= 0 ? "text-rose-600" : "text-cyan-800"}`}>
                        {emailCredits} <span className="text-[11px] font-semibold text-gray-600">Credits</span>
                      </span>
                      {emailCredits <= 0 && (
                        <span className="block text-[9px] font-black text-rose-600 tracking-wide uppercase">Gateway Locked 🔒</span>
                      )}
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${emailCredits > 50 ? "bg-cyan-500" : emailCredits > 10 ? "bg-amber-500 animate-pulse" : "bg-rose-500 animate-ping"}`} />
                  </div>
                </div>
                <p className="text-[10.5px] text-gray-500 font-medium text-right">
                  Unused balance carries forward up to next {platformConfig.creditRolloverMonths || 4} months
                </p>
              </div>
            </div>

            {/* 3 Metric Summary Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                  <span>Pro Plan Allocation</span>
                  <span>💎 Active</span>
                </div>
                <p className="font-black text-base text-emerald-950">
                  {platformConfig.proWhatsAppCredits || 300} WA + {((platformConfig.proWhatsAppCredits || 300) * (profile?.emailMultiplier || platformConfig.emailMultiplier || 3)).toLocaleString()} Emails
                </p>
                <p className="text-[10px] text-emerald-700">Combined communications with {profile?.emailMultiplier || platformConfig.emailMultiplier || 3}X dynamic Email ratio</p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                  <span>Outbound Rate</span>
                  <span>Metered Pool</span>
                </div>
                <p className="font-black text-base text-blue-950">1 Credit / Sent Message</p>
                <p className="text-[10px] text-blue-700">Covers verified WhatsApp and Central Amazon SES dispatches</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                  <span>Multi-Channel Gateway</span>
                  <span>100% Automated</span>
                </div>
                <p className="font-black text-base text-amber-950">Included</p>
                <p className="text-[10px] text-amber-700">Instant digital rent receipts & reminders dispatch</p>
              </div>
            </div>

            {/* Top-up Packs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Top-Up WhatsApp Message Credits</h4>
                  <p className="text-[11px] text-gray-500">Credits never expire and stack directly onto your wallet balance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {WHATSAPP_CREDIT_PACKAGES.map((pack) => (
                  <div
                    key={pack.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative ${
                      pack.popular
                        ? "bg-gradient-to-b from-amber-50/60 to-white border-amber-400 shadow-sm ring-2 ring-amber-400/20"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {pack.badge && (
                      <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow-2xs">
                        {pack.badge}
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-black text-sm text-gray-900">{pack.name}</h5>
                          <span className="text-[10px] text-gray-500">{pack.pricePerCredit} per message</span>
                        </div>
                        <span className="font-mono font-black text-lg text-gray-900">₹{pack.priceInr}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-bold text-xs text-gray-800">+{pack.credits.toLocaleString("en-IN")} Credits</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => handleBuyCreditPack(pack)}
                        className={`w-full py-2 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer ${
                          pack.popular
                            ? "bg-[#201a17] hover:bg-[#342924] text-white shadow-xs"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                        }`}
                      >
                        Recharge +{pack.credits}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-Channel Activity & Audit Ledger */}
            {(whatsappTransactions.length > 0 || emailTransactions.length > 0) && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveLedgerTab("WHATSAPP")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeLedgerTab === "WHATSAPP"
                          ? "bg-white text-emerald-800 shadow-2xs border border-emerald-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      💬 WhatsApp Ledger ({whatsappTransactions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLedgerTab("EMAIL")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeLedgerTab === "EMAIL"
                          ? "bg-white text-cyan-800 shadow-2xs border border-cyan-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      ✉️ Email Ledger ({emailTransactions.length})
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    {activeLedgerTab === "WHATSAPP" ? whatsappTransactions.length : emailTransactions.length} events logged
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase tracking-wider">
                        <th className="py-2 px-2.5">Date & Time</th>
                        <th className="py-2 px-2.5">Recipient</th>
                        <th className="py-2 px-2.5">Type</th>
                        <th className="py-2.5 px-2.5">Description</th>
                        <th className="py-2 px-2.5 text-right">Credit Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(activeLedgerTab === "WHATSAPP" ? whatsappTransactions : emailTransactions).slice(0, 5).map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-2.5 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                            {new Date(tx.timestamp).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-2.5 font-bold text-gray-900 whitespace-nowrap">
                            {tx.recipientName || "System / Wallet"}
                            {(tx.recipientPhone || tx.recipientEmail) && (
                              <span className="block text-[10px] font-mono text-gray-400 font-normal">
                                {tx.recipientPhone || tx.recipientEmail}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              tx.type === "PURCHASE" || tx.type === "STARTER_BONUS"
                                ? "bg-emerald-100 text-emerald-800"
                                : activeLedgerTab === "EMAIL"
                                ? "bg-cyan-100 text-cyan-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {tx.type === "PURCHASE" ? "TOP-UP" : tx.type === "STARTER_BONUS" ? "STARTER BONUS" : tx.messageType || "OUTBOUND"}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-gray-600 text-[11px]">
                            {tx.description}
                          </td>
                          <td className={`py-2.5 px-2.5 text-right font-mono font-bold whitespace-nowrap ${
                            tx.amount > 0 ? "text-emerald-700" : "text-gray-700"
                          }`}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* PLAN SELECTION CARDS */}
          <div className="space-y-4" id="payment-options">
            <div>
              <h3 className="text-lg font-black text-[#201a17]">1. Choose Your Plan</h3>
              <p className="text-xs text-gray-500">
                Select your billing frequency. Early renewals stack seamlessly onto your current days.
              </p>
            </div>

            {/* Desktop / Tablet View (Hidden on Mobile) - 4 Plans Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Plan 1: Pro Monthly */}
              <div
                onClick={() => setSelectedPlan("PRO_MONTHLY")}
                className={`p-5 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPlan === "PRO_MONTHLY"
                    ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                    : "bg-white/60 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                }`}
              >
                {selectedPlan === "PRO_MONTHLY" && (
                  <span className="absolute -top-3 right-5 bg-[#c2652a] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                    SELECTED
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-[#201a17]">Pro Monthly</h4>
                      <p className="text-[11px] text-gray-500">Flexible 30-day recurring</p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 text-[#c2652a]">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#201a17]">
                      ₹{platformConfig.proMonthlyPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">/ Month</span>
                  </div>

                  <p className="text-[11px] text-gray-500 font-medium">
                    Zero lock-in • 30 days full access
                  </p>

                  <ul className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100/60">
                    {proFeatures.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    className={`w-full py-2 rounded-xl font-bold text-xs transition-all ${
                      selectedPlan === "PRO_MONTHLY"
                        ? "bg-[#201a17] text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {selectedPlan === "PRO_MONTHLY" ? "✓ Plan Selected" : `Select Monthly (₹${platformConfig.proMonthlyPrice.toLocaleString("en-IN")})`}
                  </button>
                </div>
              </div>

              {/* Plan 2: Pro Quarterly */}
              <div
                onClick={() => setSelectedPlan("PRO_QUARTERLY")}
                className={`p-5 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPlan === "PRO_QUARTERLY"
                    ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                    : "bg-white/60 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                }`}
              >
                {selectedPlan === "PRO_QUARTERLY" ? (
                  <span className="absolute -top-3 right-5 bg-[#c2652a] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                    SELECTED
                  </span>
                ) : (
                  <span className="absolute -top-3 right-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                    SAVE ₹{(platformConfig.proMonthlyPrice * 3 - platformConfig.proQuarterlyPrice).toLocaleString("en-IN")} (~8% OFF)
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-[#201a17]">Pro Quarterly</h4>
                      <p className="text-[11px] text-gray-500">90 days quarterly flexibility</p>
                    </div>
                    <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#201a17]">
                      ₹{platformConfig.proQuarterlyPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">/ 90 Days</span>
                  </div>

                  <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                    ≈ ₹{Math.round(platformConfig.proQuarterlyPrice / 3).toLocaleString("en-IN")}/mo
                  </p>

                  <ul className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100/60">
                    {proFeatures.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    className={`w-full py-2 rounded-xl font-bold text-xs transition-all ${
                      selectedPlan === "PRO_QUARTERLY"
                        ? "bg-[#201a17] text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {selectedPlan === "PRO_QUARTERLY" ? "✓ Plan Selected" : `Select Quarterly (₹${platformConfig.proQuarterlyPrice.toLocaleString("en-IN")})`}
                  </button>
                </div>
              </div>

              {/* Plan 3: Pro Semi-Annual */}
              <div
                onClick={() => setSelectedPlan("PRO_SEMI_ANNUAL")}
                className={`p-5 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPlan === "PRO_SEMI_ANNUAL"
                    ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                    : "bg-white/60 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                }`}
              >
                {selectedPlan === "PRO_SEMI_ANNUAL" ? (
                  <span className="absolute -top-3 right-5 bg-[#c2652a] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                    SELECTED
                  </span>
                ) : (
                  <span className="absolute -top-3 right-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                    SAVE ₹{(platformConfig.proMonthlyPrice * 6 - platformConfig.proSemiAnnualPrice).toLocaleString("en-IN")} (~13% OFF)
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-[#201a17]">Pro Semi-Annual</h4>
                      <p className="text-[11px] text-gray-500">180 days half-year operations</p>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#201a17]">
                      ₹{platformConfig.proSemiAnnualPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">/ 180 Days</span>
                  </div>

                  <p className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                    ≈ ₹{Math.round(platformConfig.proSemiAnnualPrice / 6).toLocaleString("en-IN")}/mo
                  </p>

                  <ul className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100/60">
                    {proFeatures.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    className={`w-full py-2 rounded-xl font-bold text-xs transition-all ${
                      selectedPlan === "PRO_SEMI_ANNUAL"
                        ? "bg-[#201a17] text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {selectedPlan === "PRO_SEMI_ANNUAL" ? "✓ Plan Selected" : `Select Semi-Annual (₹${platformConfig.proSemiAnnualPrice.toLocaleString("en-IN")})`}
                  </button>
                </div>
              </div>

              {/* Plan 4: Pro Annual */}
              <div
                onClick={() => setSelectedPlan("PRO_ANNUAL")}
                className={`p-5 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPlan === "PRO_ANNUAL"
                    ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                    : "bg-white/60 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                }`}
              >
                {selectedPlan === "PRO_ANNUAL" ? (
                  <span className="absolute -top-3 right-5 bg-[#c2652a] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                    SELECTED
                  </span>
                ) : (
                  <span className="absolute -top-3 right-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                    SAVE ₹{(platformConfig.proMonthlyPrice * 12 - platformConfig.proAnnualPrice).toLocaleString("en-IN")} (2 MO FREE) 🏆
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-[#201a17]">Pro Annual</h4>
                      <p className="text-[11px] text-gray-500">365 days full peace of mind</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#201a17]">
                      ₹{platformConfig.proAnnualPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">/ Year</span>
                  </div>

                  <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                    ≈ ₹{Math.round(platformConfig.proAnnualPrice / 12).toLocaleString("en-IN")}/mo • Only &lt; ₹1,000/mo
                  </p>

                  <ul className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100/60">
                    {proFeatures.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    className={`w-full py-2 rounded-xl font-bold text-xs transition-all ${
                      selectedPlan === "PRO_ANNUAL"
                        ? "bg-[#201a17] text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {selectedPlan === "PRO_ANNUAL" ? "✓ Plan Selected" : `Select Annual (₹${platformConfig.proAnnualPrice.toLocaleString("en-IN")})`}
                  </button>
                </div>
              </div>
            </div>

            {/* 👑 CUSTOMISE PLAN BANNER (FOR 300+ TENANTS / MULTI-BRANCH OPERATORS) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#201a17] via-[#2c221e] to-[#1a1412] text-white border-2 border-amber-500/30 shadow-xl relative overflow-hidden">
              {/* Subtle Ambient Glow */}
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xs">
                      <span>👑</span>
                      <span>ENTERPRISE & CAMPUS TAILORED FLIGHT DECK</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                      300+ Beds / Multi-Building
                    </span>
                  </div>

                  <h3 className="font-serif font-black text-xl sm:text-2xl text-white">
                    Need a Custom Tailored Plan for 300+ Tenants?
                  </h3>

                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
                    Operating a large 380-bed hostel, multiple PG wings, or a corporate co-living campus? Talk directly with founder Ramesh to craft a customized plan with tailored bed capacity, dedicated WhatsApp/Email quotas, and personalized onboarding.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-gray-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Custom Bed Limits (300 to 1,000+ beds)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>High-Volume Meta WhatsApp & SES Email Pool</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{platformConfig.creditRolloverMonths || 4}-Month Credit Rollover Included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Dedicated Priority SLA & Direct Founder Onboarding</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
                  <a
                    href={customPlanWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 text-center"
                  >
                    <Smartphone className="w-4 h-4 text-white" />
                    <span>Talk with Founder Ramesh (WhatsApp)</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>

                  <a
                    href={`tel:+91${platformConfig.founderWhatsapp}`}
                    className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-300" />
                    <span>Call +91 ${platformConfig.founderWhatsapp.slice(0, 5)} ${platformConfig.founderWhatsapp.slice(5)}</span>
                  </a>

                  <span className="text-[10px] text-gray-400 text-center lg:text-right font-medium">
                    ⚡ Same-day activation with official GST invoice
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile / Smartphone Carousel View (Sliding Left-Right Across 4 Plans) */}
            <div className="block md:hidden">
              <div className="relative overflow-hidden pt-3 pb-1">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${mobilePlanIndex * 100}%)` }}
                >
                  {/* Slide 0: Pro Monthly */}
                  <div className="w-full shrink-0 px-1">
                    <div
                      onClick={() => {
                        setSelectedPlan("PRO_MONTHLY");
                        setMobilePlanIndex(0);
                      }}
                      className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between min-h-[360px] ${
                        selectedPlan === "PRO_MONTHLY"
                          ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                          : "bg-white/80 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                      }`}
                    >
                      {selectedPlan === "PRO_MONTHLY" && (
                        <span className="absolute -top-3 right-6 bg-[#c2652a] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-xs">
                          SELECTED
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-base text-[#201a17]">Pro Monthly Plan</h4>
                            <p className="text-[11px] text-gray-500">Flexible 30-day recurring subscription</p>
                          </div>
                          <div className="p-2 rounded-xl bg-amber-50 text-[#c2652a]">
                            <Zap className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-[#201a17]">₹{platformConfig.proMonthlyPrice.toLocaleString("en-IN")}</span>
                          <span className="text-xs text-gray-500 font-bold">/ Month</span>
                        </div>

                        <ul className="space-y-1.5 text-xs text-gray-600 pt-1">
                          {proFeatures.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan("PRO_MONTHLY");
                            setMobilePlanIndex(0);
                          }}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                            selectedPlan === "PRO_MONTHLY"
                              ? "bg-[#201a17] text-white shadow-xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {selectedPlan === "PRO_MONTHLY" ? "✓ Plan Selected" : `Select Monthly (₹${platformConfig.proMonthlyPrice.toLocaleString("en-IN")})`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Slide 1: Pro Quarterly */}
                  <div className="w-full shrink-0 px-1">
                    <div
                      onClick={() => {
                        setSelectedPlan("PRO_QUARTERLY");
                        setMobilePlanIndex(1);
                      }}
                      className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between min-h-[360px] ${
                        selectedPlan === "PRO_QUARTERLY"
                          ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                          : "bg-white/80 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                      }`}
                    >
                      {selectedPlan === "PRO_QUARTERLY" ? (
                        <span className="absolute -top-3 right-6 bg-[#c2652a] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-xs">
                          SELECTED
                        </span>
                      ) : (
                        <span className="absolute -top-3 right-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                          SAVE ₹{(platformConfig.proMonthlyPrice * 3 - platformConfig.proQuarterlyPrice).toLocaleString("en-IN")} (~8% OFF)
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-base text-[#201a17]">Pro Quarterly Plan</h4>
                            <p className="text-[11px] text-gray-500">90 days quarterly flexibility</p>
                          </div>
                          <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                            <Sparkles className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-[#201a17]">₹{platformConfig.proQuarterlyPrice.toLocaleString("en-IN")}</span>
                          <span className="text-xs text-gray-500 font-bold">/ 90 Days</span>
                        </div>

                        <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                          ≈ ₹{Math.round(platformConfig.proQuarterlyPrice / 3).toLocaleString("en-IN")}/mo
                        </p>

                        <ul className="space-y-1.5 text-xs text-gray-600 pt-1">
                          {proFeatures.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan("PRO_QUARTERLY");
                            setMobilePlanIndex(1);
                          }}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                            selectedPlan === "PRO_QUARTERLY"
                              ? "bg-[#201a17] text-white shadow-xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {selectedPlan === "PRO_QUARTERLY" ? "✓ Plan Selected" : `Select Quarterly (₹${platformConfig.proQuarterlyPrice.toLocaleString("en-IN")})`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Slide 2: Pro Semi-Annual */}
                  <div className="w-full shrink-0 px-1">
                    <div
                      onClick={() => {
                        setSelectedPlan("PRO_SEMI_ANNUAL");
                        setMobilePlanIndex(2);
                      }}
                      className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between min-h-[360px] ${
                        selectedPlan === "PRO_SEMI_ANNUAL"
                          ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                          : "bg-white/80 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                      }`}
                    >
                      {selectedPlan === "PRO_SEMI_ANNUAL" ? (
                        <span className="absolute -top-3 right-6 bg-[#c2652a] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-xs">
                          SELECTED
                        </span>
                      ) : (
                        <span className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                          SAVE ₹{(platformConfig.proMonthlyPrice * 6 - platformConfig.proSemiAnnualPrice).toLocaleString("en-IN")} (~13% OFF)
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-base text-[#201a17]">Pro Semi-Annual</h4>
                            <p className="text-[11px] text-gray-500">180 days half-year operations</p>
                          </div>
                          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                            <Layers className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-[#201a17]">₹{platformConfig.proSemiAnnualPrice.toLocaleString("en-IN")}</span>
                          <span className="text-xs text-gray-500 font-bold">/ 180 Days</span>
                        </div>

                        <p className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                          ≈ ₹{Math.round(platformConfig.proSemiAnnualPrice / 6).toLocaleString("en-IN")}/mo
                        </p>

                        <ul className="space-y-1.5 text-xs text-gray-600 pt-1">
                          {proFeatures.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan("PRO_SEMI_ANNUAL");
                            setMobilePlanIndex(2);
                          }}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                            selectedPlan === "PRO_SEMI_ANNUAL"
                              ? "bg-[#201a17] text-white shadow-xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {selectedPlan === "PRO_SEMI_ANNUAL" ? "✓ Plan Selected" : `Select Semi-Annual (₹${platformConfig.proSemiAnnualPrice.toLocaleString("en-IN")})`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Slide 3: Pro Annual */}
                  <div className="w-full shrink-0 px-1">
                    <div
                      onClick={() => {
                        setSelectedPlan("PRO_ANNUAL");
                        setMobilePlanIndex(3);
                      }}
                      className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between min-h-[360px] ${
                        selectedPlan === "PRO_ANNUAL"
                          ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                          : "bg-white/80 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                      }`}
                    >
                      {selectedPlan === "PRO_ANNUAL" ? (
                        <span className="absolute -top-3 right-6 bg-[#c2652a] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-xs">
                          SELECTED
                        </span>
                      ) : (
                        <span className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                          SAVE ₹{(platformConfig.proMonthlyPrice * 12 - platformConfig.proAnnualPrice).toLocaleString("en-IN")} (2 MO FREE) 🏆
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-base text-[#201a17]">Pro Annual Plan</h4>
                            <p className="text-[11px] text-gray-500">365 days uninterrupted peace of mind</p>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-[#201a17]">₹{platformConfig.proAnnualPrice.toLocaleString("en-IN")}</span>
                          <span className="text-xs text-gray-500 font-bold">/ Year</span>
                        </div>

                        <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                          ≈ ₹{Math.round(platformConfig.proAnnualPrice / 12).toLocaleString("en-IN")}/mo
                        </p>

                        <ul className="space-y-1.5 text-xs text-gray-600 pt-1">
                          {proFeatures.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan("PRO_ANNUAL");
                            setMobilePlanIndex(3);
                          }}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                            selectedPlan === "PRO_ANNUAL"
                              ? "bg-[#201a17] text-white shadow-xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {selectedPlan === "PRO_ANNUAL" ? "✓ Plan Selected" : `Select Annual (₹${platformConfig.proAnnualPrice.toLocaleString("en-IN")})`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Slide 4: Custom Tailored Plan */}
                  <div className="w-full shrink-0 px-1">
                    <div
                      className="p-5 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-[#201a17] to-[#2c221e] text-white relative flex flex-col justify-between min-h-[360px] shadow-lg"
                    >
                      <span className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                        👑 300+ BEDS TAILORED
                      </span>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-base text-white">Custom Enterprise</h4>
                            <p className="text-[11px] text-amber-300/80">Tailored for 380+ beds & multi-branch</p>
                          </div>
                          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                            <Building2 className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/10 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-amber-400 font-serif">Tailored Pricing</span>
                        </div>

                        <ul className="space-y-1.5 text-xs text-gray-300 pt-1">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>Exact bed capacity (e.g. 380 beds)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>High-volume WhatsApp & Email pool</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>{platformConfig.creditRolloverMonths || 4}-month rollover included</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>1-on-1 direct onboarding with Ramesh</span>
                          </li>
                        </ul>
                      </div>

                      <div className="pt-4">
                        <a
                          href={customPlanWhatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>Talk with Founder Ramesh (WhatsApp)</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Carousel Arrow Controls & Pagination Dots */}
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <button
                  type="button"
                  onClick={() => setMobilePlanIndex((prev) => (prev - 1 + 5) % 5)}
                  className="w-8 h-8 rounded-full bg-white border border-[#d7c2b9] text-[#201a17] shadow-xs flex items-center justify-center active:scale-90 transition-all hover:bg-amber-50 cursor-pointer"
                  aria-label="Previous plan"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMobilePlanIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        mobilePlanIndex === idx ? "w-6 bg-[#c2652a]" : "w-2 bg-stone-300"
                      }`}
                      aria-label={`Plan ${idx + 1} indicator`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setMobilePlanIndex((prev) => (prev + 1) % 5)}
                  className="w-8 h-8 rounded-full bg-white border border-[#d7c2b9] text-[#201a17] shadow-xs flex items-center justify-center active:scale-90 transition-all hover:bg-amber-50 cursor-pointer"
                  aria-label="Next plan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* DUAL PAYMENT METHOD HUB: ONLINE (RAZORPAY) vs OFFLINE (PROOF APPROVAL) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#d7c2b9]/60 shadow-xs space-y-6">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-black text-[#201a17] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#c2652a]" />
                  <span>2. Select Payment Method & Activate</span>
                </h3>
                <span className="text-[11px] font-bold text-gray-500">
                  Total Due: <strong className="text-slate-900 font-mono text-xs">₹{getPlanPrice(selectedPlan).toLocaleString("en-IN")}</strong>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose between Instant Automated Activation via Online Gateway (Razorpay) or Direct Bank/UPI Transfer with manual proof verification.
              </p>
            </div>

            {/* Payment Channel Selector Tabs (Horizontal Side-by-Side on all devices, no description) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              <button
                type="button"
                onClick={() => setPaymentChannel("ONLINE")}
                className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-3 transition-all cursor-pointer justify-center sm:justify-start ${
                  paymentChannel === "ONLINE"
                    ? "bg-gradient-to-br from-blue-50/60 to-white border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                    : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  paymentChannel === "ONLINE" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-200 text-slate-700"
                }`}>
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-black text-xs sm:text-sm text-slate-900 block leading-tight">
                    Online Razorpay
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentChannel("OFFLINE")}
                className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-3 transition-all cursor-pointer justify-center sm:justify-start ${
                  paymentChannel === "OFFLINE"
                    ? "bg-gradient-to-br from-amber-50/60 to-white border-amber-600 shadow-sm ring-2 ring-amber-500/20"
                    : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  paymentChannel === "OFFLINE" ? "bg-amber-600 text-white shadow-sm" : "bg-slate-200 text-slate-700"
                }`}>
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-black text-xs sm:text-sm text-slate-900 block leading-tight">
                    Offline UPI/Bank
                  </span>
                </div>
              </button>
            </div>

            {/* CHANNEL 1: ONLINE GATEWAY (RAZORPAY MOCKUP) */}
            {paymentChannel === "ONLINE" && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0c2340] text-white space-y-5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block">
                      RECOMMENDED FOR FASTEST ACCESS
                    </span>
                    <h4 className="text-xl font-black text-white font-serif">
                      Instant Automated Activation via Razorpay
                    </h4>
                    <p className="text-xs text-slate-300 max-w-lg">
                      Pay securely with Google Pay, PhonePe, Paytm, RuPay, Visa, Mastercard, or NetBanking. Instant webhook verification unlocks your Pro plan automatically.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-white font-mono">
                      ₹{getPlanPrice(selectedPlan).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-slate-400 block font-sans">
                      {getPlanDurationDays(selectedPlan)} Days Access
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>256-Bit SSL Encrypted</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span>Zero Manual Wait Time</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Official GST Invoice Generated</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRazorpayModal(true)}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 via-[#3399cc] to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Pay ₹{getPlanPrice(selectedPlan).toLocaleString("en-IN")} via Razorpay Gateway (Instant)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* CHANNEL 2: OFFLINE UPI / BANK TRANSFER (MANUAL PROOF APPROVAL) */}
            {paymentChannel === "OFFLINE" && (
              <div className="space-y-5 animate-in fade-in">
                {/* Official Bank / VPA Details */}
                <div className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">OFFICIAL UPI ID / VPA</span>
                    <div className="p-2.5 bg-white rounded-xl border border-[#eedad0] flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-xs text-[#201a17]">{platformConfig.founderUpiVpa}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(platformConfig.founderUpiVpa);
                          triggerToast("UPI ID copied to clipboard!");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#f8ede3] hover:bg-[#eedad0] text-[#964407] text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Copy VPA
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Scan or pay <strong>₹{getPlanPrice(selectedPlan).toLocaleString("en-IN")}</strong> from PhonePe, Google Pay, Paytm, or BHIM.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">DIRECT FOUNDER WHATSAPP</span>
                    <div className="p-2.5 bg-white rounded-xl border border-[#eedad0] flex items-center justify-between">
                      <p className="font-mono font-bold text-xs text-emerald-700">
                        +91 {platformConfig.founderWhatsapp.slice(0, 5)} {platformConfig.founderWhatsapp.slice(5)}
                      </p>
                      <a
                        href={`https://wa.me/91${platformConfig.founderWhatsapp}?text=Hi%20Ramesh%2C%20I%20have%20a%20question%20regarding%20TenoPilot%20Pro%20subscription.`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Chat
                      </a>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Have questions or need offline invoice? WhatsApp founder directly.
                    </p>
                  </div>
                </div>

                {/* Proof Upload & Submission Form */}
                <form onSubmit={handleSubmitPaymentProof} className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-800 text-xs flex items-center justify-between">
                      <span>Upload Payment Screenshot (Receipt / UTR) *</span>
                      <span className="text-[10px] text-gray-500 font-normal">PNG, JPG, WebP (Auto-Compressed)</span>
                    </label>

                    {isCompressingScreenshot ? (
                      /* Compression Loading Card */
                      <div className="p-6 rounded-2xl bg-amber-50/70 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-center gap-2 animate-pulse">
                        <RefreshCw className="w-6 h-6 text-[#c2652a] animate-spin" />
                        <p className="font-bold text-gray-800 text-xs">Optimizing & Compressing Screenshot...</p>
                        <p className="text-[11px] text-gray-500">Sharpening receipt text clarity and reducing upload payload</p>
                      </div>
                    ) : screenshotPreview ? (
                      /* Preview Box */
                      <div className="p-4 rounded-2xl bg-slate-50 border-2 border-emerald-300 flex items-center justify-between gap-3 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={screenshotPreview}
                            alt="Screenshot Preview"
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setZoomedScreenshot(screenshotPreview)}
                          />
                          <div>
                            <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[180px] sm:max-w-xs">{screenshotFileName || "payment_screenshot.jpg"}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {compressedSizeKb && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  {compressedSizeKb} KB (Compressed)
                                </span>
                              )}
                              <span className="text-[10px] text-emerald-700 font-medium">
                                Ready for verification. Click thumbnail to zoom.
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setScreenshotPreview(null);
                            setScreenshotFileName(null);
                            setCompressedSizeKb(null);
                          }}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                          title="Remove screenshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Dropzone */
                      <label
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleScreenshotDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${
                          isDragOver
                            ? "border-[#c2652a] bg-amber-50/70 scale-[1.01]"
                            : "border-gray-300 hover:border-[#c2652a] bg-white"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-[#c2652a] flex items-center justify-center mb-2 transition-colors">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-gray-800 text-xs">
                          Click to upload or drag payment screenshot here
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5">
                          Screenshots from GPay, PhonePe, Paytm, or NetBanking (auto-compressed for instant review)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">
                      Payment Remarks / Account Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      placeholder="e.g. Paid via GPay from Ramesh account (UTR: 20260906...)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-[#c2652a]"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Reviewed & approved by founder. Turnaround typically under 15 minutes.</span>
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmittingProof || !screenshotPreview}
                      className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#201a17] hover:bg-[#342924] text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmittingProof ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Proof for Review...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Proceed for Approval 🚀</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* PAYMENT HISTORY & RECEIPTS TABLE */}
          <div id="invoices-section" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#d7c2b9]/60 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#201a17]">Billing & Invoices History</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                    {allInvoices.length} {allInvoices.length === 1 ? "Invoice" : "Invoices"} Available
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Official GST-compliant digital tax invoices for all active plans, renewals, and WhatsApp message credit packs.
                </p>
              </div>

              {allInvoices.length > 0 && (
                <div className="text-[11px] text-gray-500 flex items-center gap-1.5 self-start sm:self-center font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>GSTIN: 36ABCDE1234F1Z5 • 100% Tax Compliant</span>
                </div>
              )}
            </div>

            {allInvoices.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-3 bg-[#fff8f6] rounded-2xl border border-dashed border-[#d7c2b9]/80 max-w-xl mx-auto my-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">No Paid Invoices Yet</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    You are currently enjoying the complimentary 10-day full access. Official GST-compliant tax invoices are automatically generated and archived here whenever you activate Pro or purchase WhatsApp message credit packs.
                  </p>
                </div>
                <div className="pt-2">
                  <a
                    href={`/api/subscription/invoice/pdf?invoiceNo=INV-TP-SAMPLE-2026&ownerName=${encodeURIComponent(
                      profile?.displayName || "Ramesh Darisi"
                    )}&propertyName=${encodeURIComponent(
                      profile?.propertyName || "Ramesh Residencies"
                    )}&amount=999`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-white border border-[#d7c2b9] hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-2xs transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                    title="View Sample GST Tax Invoice PDF"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>Preview Sample Tax Invoice (PDF)</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#d7c2b9]/60 text-gray-500 text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Invoice & Receipt</th>
                      <th className="py-2.5 px-3">Plan / Item</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3">Amount (Incl. GST)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d7c2b9]/30">
                    {allInvoices.map((tx: any) => {
                      const isCreditPack =
                        tx.isCreditPack ||
                        tx.plan?.startsWith("WA_") ||
                        tx.type === "CREDIT_PACK" ||
                        tx.plan?.includes("WHATSAPP");

                      const planTitle =
                        tx.plan === "VIP_PASS"
                          ? "TenoPilot VIP Access Pass (Lifetime Founder License)"
                          : tx.plan === "PRO_ANNUAL"
                          ? "TenoPilot Pro Annual Subscription (365 Days Access)"
                          : tx.plan === "PRO_SEMI_ANNUAL"
                          ? "TenoPilot Pro Semi-Annual Subscription (180 Days Access)"
                          : tx.plan === "PRO_QUARTERLY"
                          ? "TenoPilot Pro Quarterly Subscription (90 Days Access)"
                          : tx.plan === "PRO_MONTHLY"
                          ? "TenoPilot Pro Monthly Subscription (30 Days Access)"
                          : isCreditPack
                          ? `WhatsApp Cloud Message Credit Pack (${tx.creditsAdded || 750} Credits)`
                          : tx.plan || "TenoPilot Pro Subscription";

                      const dateFormatted = tx.createdAt || tx.date
                        ? new Date(tx.createdAt || tx.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent";

                      const pdfDownloadUrl = `/api/subscription/invoice/pdf?invoiceNo=${encodeURIComponent(
                        tx.invoiceNumber
                      )}&ownerName=${encodeURIComponent(
                        tx.customerName || profile?.displayName || "PG Owner"
                      )}&propertyName=${encodeURIComponent(
                        tx.propertyName || profile?.propertyName || "TenoPilot PG"
                      )}&ownerEmail=${encodeURIComponent(
                        tx.customerEmail || profile?.email || ""
                      )}&ownerPhone=${encodeURIComponent(
                        tx.customerPhone || profile?.phone || ""
                      )}&planName=${encodeURIComponent(planTitle)}&amount=${encodeURIComponent(
                        tx.amountPaid || tx.amount || 999
                      )}&invoiceDate=${encodeURIComponent(dateFormatted)}`;

                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-3 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                            {dateFormatted}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-gray-900 text-xs">
                              {tx.invoiceNumber}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {tx.receiptNumber || tx.id}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-gray-800">
                                {tx.plan === "PRO_ANNUAL"
                                  ? "💎 Pro Annual"
                                  : tx.plan === "PRO_SEMI_ANNUAL"
                                  ? "🥈 Pro Semi-Annual"
                                  : tx.plan === "PRO_QUARTERLY"
                                  ? "🥉 Pro Quarterly"
                                  : tx.plan === "PRO_MONTHLY"
                                  ? "💎 Pro Monthly"
                                  : isCreditPack
                                  ? "💬 WhatsApp Credits Pack"
                                  : tx.plan || "Pro Subscription"}
                              </span>
                              {tx.isCurrentActive && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider">
                                  Current Active
                                </span>
                              )}
                              {isCreditPack && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[9px] uppercase tracking-wider">
                                  +{tx.creditsAdded || 750} WA Credits
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-gray-600 text-[11px]">
                            {tx.paymentMode || "UPI / Razorpay"}
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-gray-900 whitespace-nowrap">
                            ₹{Number(tx.amountPaid || tx.amount || 999).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              {tx.status || "COMPLETED"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap">
                              <a
                                href={pdfDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-[#201a17] hover:bg-[#342924] text-white font-bold text-[10.5px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
                                title="View Official GST Tax Invoice PDF"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                <span>View (PDF)</span>
                              </a>

                              <a
                                href={pdfDownloadUrl}
                                download={`TenoPilot_Invoice_${tx.invoiceNumber}.pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                                title="Direct Download Official Tax Invoice PDF"
                              >
                                <Download className="w-3 h-3 text-emerald-600" />
                                <span className="hidden sm:inline">Download</span>
                              </a>

                              {tx.receiptUrl && (
                                <button
                                  type="button"
                                  onClick={() => setZoomedScreenshot(tx.receiptUrl)}
                                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 text-[10px] flex items-center cursor-pointer transition-colors"
                                  title="View Payment Proof Screenshot"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RAZORPAY GATEWAY CHECKOUT MODAL MOCKUP */}
      <RazorpayModalMockup
        isOpen={showRazorpayModal}
        onClose={() => setShowRazorpayModal(false)}
        onSuccess={() => {
          setShowRazorpayModal(false);
          triggerToast("🎉 Instant activation verified! Pro plan extended.");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
        plan={selectedPlan}
        amount={getPlanPrice(selectedPlan)}
        customerEmail={profile?.email}
        customerName={profile?.displayName || "PG Owner"}
        customerPhone={profile?.phone || "9876543210"}
        userId={profile?.uid}
      />

      {/* SCREENSHOT ZOOM MODAL */}
      {zoomedScreenshot && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setZoomedScreenshot(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomedScreenshot(null)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedScreenshot}
              alt="Payment Proof Full View"
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl object-contain border border-white/20"
            />
          </div>
        </div>
      )}

      {/* 💬 WHATSAPP CREDIT RECHARGE & WALLET MODAL */}
      <WhatsAppWalletModal
        propertyId={propertyId}
        isOpen={showCreditRechargeModal}
        onClose={() => {
          setShowCreditRechargeModal(false);
          setSelectedCreditPack(null);
        }}
        onRechargeSuccess={(newCredits) => {
          setWhatsappCredits(newCredits);
          triggerToast(`🎉 Successfully updated WhatsApp wallet balance to ${newCredits} messages!`);
        }}
      />

      {/* 📄 OFFICIAL TENOPILOT TAX INVOICE MODAL */}
      <TenoPilotInvoiceModal
        isOpen={!!selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        invoice={selectedInvoiceForModal}
      />
    </div>
  );
}
