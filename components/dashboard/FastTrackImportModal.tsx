"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  Camera,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Trash2,
  Check,
  Building2,
  Users,
  CreditCard,
  Layers,
  FileText,
  Share2,
  ExternalLink,
  MessageSquare,
  Maximize2,
  Minimize2,
  Plus,
  Save,
} from "lucide-react";
import { parseRawSpreadsheetText, FastTrackParsedRow, FastTrackParseResult } from "@/lib/fastTrackHeuristicParser";
import { executeFastTrackBatchIngest, BatchIngestResult } from "@/lib/fastTrackBatchIngest";
import { propertySettingsStore } from "@/constants/propertySettings";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";

interface FastTrackImportModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_PG_MESSY_SHEET = `SRI BALAJI LUXURY PG - RESIDENTS AUGUST LIST
Name\tMobile Number\tRoom No\tMonthly Rent\tAdvance
Rahul Sharma\t9876543210\t101\t13500\t27000
Suresh Reddy\t9811223344\t101\t13500\t27000
Ananya Deshmukh\t9922334455\t102\t9000\t18000
Vikram Malhotra\t9833445566\t102\t9000\t18000
Deepak Joshi\t9744556677\t102\t9000\t18000
Priya Verma\t9855667788\t201\t22000\t44000
Kiran Patel\t9866778899\t202\t13500\t27000
Amit Kumar\t9877889900\t202\t13500\t27000`;

export function FastTrackImportModal({
  propertyId,
  isOpen,
  onClose,
  onSuccess,
}: FastTrackImportModalProps) {
  const [activeTab, setActiveTab] = useState<"SHEET" | "CAMERA">("SHEET");
  const [step, setStep] = useState<"INPUT" | "PROCESSING" | "REVIEW" | "SUCCESS">("INPUT");

  // Sheet / Text paste input
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  // Camera / Ledger images
  const [selectedImages, setSelectedImages] = useState<{ name: string; base64: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop state
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);

  // Parsing & Progress state
  const [processingStatus, setProcessingStatus] = useState<string>("Analyzing document structure...");
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<FastTrackParseResult | null>(null);
  const [editableRows, setEditableRows] = useState<FastTrackParsedRow[]>([]);

  // Options
  const [autoProvisionBuilding, setAutoProvisionBuilding] = useState<boolean>(true);
  const [markDepositsPaid, setMarkDepositsPaid] = useState<boolean>(true);
  const [markCurrentMonthRentPaid, setMarkCurrentMonthRentPaid] = useState<boolean>(false);

  // Ingestion final result
  const [ingestResult, setIngestResult] = useState<BatchIngestResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [dateFormatMode, setDateFormatMode] = useState<"DD-MMM-YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD">("DD-MMM-YYYY");

  // Draft & Multi-Page Append State
  const [savedDraft, setSavedDraft] = useState<{
    rows: FastTrackParsedRow[];
    updatedAt: string;
    dateFormatMode: "DD-MMM-YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  } | null>(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState<string | null>(null);

  // Append Drawer state
  const [showAppendDrawer, setShowAppendDrawer] = useState<boolean>(false);
  const [appendMode, setAppendMode] = useState<"CAMERA" | "SHEET">("CAMERA");
  const [appendImages, setAppendImages] = useState<{ name: string; base64: string }[]>([]);
  const [appendText, setAppendText] = useState<string>("");
  const [isAppending, setIsAppending] = useState<boolean>(false);
  const [isDraggingAppendCamera, setIsDraggingAppendCamera] = useState<boolean>(false);
  const [isDraggingAppendSheet, setIsDraggingAppendSheet] = useState<boolean>(false);
  const [appendSuccessNotice, setAppendSuccessNotice] = useState<string | null>(null);
  const appendCameraInputRef = useRef<HTMLInputElement>(null);
  const appendSheetInputRef = useRef<HTMLInputElement>(null);

  const DRAFT_STORAGE_KEY = `tenopilot_fasttrack_draft_${propertyId}`;

  // Helper to format ISO date (YYYY-MM-DD) into user's chosen display format
  const formatDisplayDate = (isoDate: string | undefined): string => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    const [y, m, d] = parts;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monIdx = parseInt(m, 10) - 1;
    const monStr = months[monIdx] || m;

    if (dateFormatMode === "DD-MMM-YYYY") {
      return `${d} ${monStr} ${y}`;
    }
    if (dateFormatMode === "DD/MM/YYYY") {
      return `${d}/${m}/${y}`;
    }
    return `${y}-${m}-${d}`;
  };

  // Explicit action to swap Day and Month across all rows if inverted
  const handleSwapDayAndMonth = () => {
    setEditableRows((prev) =>
      prev.map((row) => {
        if (!row.joiningDate) return row;
        const parts = row.joiningDate.split("-");
        if (parts.length === 3) {
          const [y, m, d] = parts;
          const numM = parseInt(m, 10);
          const numD = parseInt(d, 10);
          // Only swap if both are <= 12 (otherwise day cannot become month)
          if (numM <= 12 && numD <= 12) {
            return { ...row, joiningDate: `${y}-${String(numD).padStart(2, "0")}-${String(numM).padStart(2, "0")}` };
          }
        }
        return row;
      })
    );
  };

  const settings = propertySettingsStore.getSettings(propertyId);

  // Save draft to localStorage
  const handleSaveDraft = (rowsToSave?: FastTrackParsedRow[]) => {
    const targetRows = rowsToSave || editableRows;
    if (targetRows.length === 0) return;
    try {
      const draftData = {
        rows: targetRows,
        updatedAt: new Date().toISOString(),
        dateFormatMode,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      setSavedDraft(draftData);
      setDraftSaveStatus(`Draft saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      setTimeout(() => setDraftSaveStatus(null), 3000);
    } catch (e) {
      console.warn("Could not save draft:", e);
    }
  };

  // Resume saved draft
  const handleResumeDraft = () => {
    if (savedDraft && savedDraft.rows.length > 0) {
      setEditableRows(savedDraft.rows);
      if (savedDraft.dateFormatMode) setDateFormatMode(savedDraft.dateFormatMode);
      setStep("REVIEW");
    }
  };

  // Discard saved draft
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setSavedDraft(null);
    } catch (e) {
      console.warn("Could not clear draft:", e);
    }
  };

  // Auto-Fix all warnings by filling missing placeholders automatically
  const handleAutoFixAllPlaceholders = () => {
    setEditableRows((prev) => {
      const updated = prev.map((row, i) => {
        let phone = row.phone;
        if (!phone || phone.length !== 10) {
          phone = `98000${String(10000 + (i % 89999)).slice(-5)}`;
        }
        let room = row.roomNumber || `10${(i % 4) + 1}`;
        let rent = row.rentAmount > 0 ? row.rentAmount : settings?.rentalTiers?.sharing2 || 12000;
        let deposit = row.securityDeposit > 0 ? row.securityDeposit : rent * 2;
        return {
          ...row,
          phone,
          roomNumber: room,
          rentAmount: rent,
          securityDeposit: deposit,
          isValid: true,
          warnings: [],
        };
      });
      handleSaveDraft(updated);
      return updated;
    });
  };

  // Append a brand new manual resident row on the fly
  const handleAddNewManualRow = () => {
    const newIdx = editableRows.length;
    const defaultRent = settings?.rentalTiers?.sharing2 || 12000;
    const todayStr = new Date().toISOString().split("T")[0];
    const roomNum = editableRows.length > 0 ? editableRows[editableRows.length - 1].roomNumber : "101";

    const newRow: FastTrackParsedRow = {
      id: `ft_manual_${Date.now()}_${newIdx}`,
      fullName: `Resident ${newIdx + 1}`,
      phone: "",
      roomNumber: roomNum,
      bedCode: `Bed A`,
      sharingType: 2,
      sharingLabel: "2-Sharing",
      rentAmount: defaultRent,
      securityDeposit: defaultRent * 2,
      joiningDate: todayStr,
      paymentMode: "UPI",
      isValid: false,
      warnings: ["Enter 10-digit mobile number"],
    };

    setEditableRows((prev) => {
      const updated = [...prev, newRow];
      handleSaveDraft(updated);
      return updated;
    });
  };

  // Process and append next page of ledger / sheet
  const handleExecuteAppend = async () => {
    if (appendMode === "CAMERA" && appendImages.length === 0) {
      alert("Please capture or choose a photo of the next page first.");
      return;
    }
    if (appendMode === "SHEET" && !appendText.trim()) {
      alert("Please paste spreadsheet text or upload a sheet first.");
      return;
    }

    setIsAppending(true);
    try {
      let newRows: FastTrackParsedRow[] = [];

      if (appendMode === "CAMERA") {
        const apiRes = await fetch("/api/fasttrack/ai-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: appendImages.map((img) => ({
              data: img.base64,
              mimeType: "image/jpeg",
            })),
            propertyId,
            defaultRentalTiers: settings.rentalTiers,
          }),
        });

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || `Server returned ${apiRes.status}`);
        }

        const apiJson = await apiRes.json();
        if (apiJson.success && apiJson.rows?.length > 0) {
          newRows = apiJson.rows;
        } else {
          throw new Error("No readable entries could be extracted from this photo.");
        }
      } else {
        const parsed = parseRawSpreadsheetText(appendText, settings.rentalTiers);
        newRows = parsed.rows;
      }

      // Room-scoped bed allocation across existing + newly appended rows:
      const roomOccupancy = new Map<string, number>();
      editableRows.forEach((r) => {
        const rm = r.roomNumber.toUpperCase().trim();
        roomOccupancy.set(rm, (roomOccupancy.get(rm) || 0) + 1);
      });

      const normalizedNewRows = newRows.map((nr, idx) => {
        const rm = nr.roomNumber.toUpperCase().trim();
        const currentCount = (roomOccupancy.get(rm) || 0) + 1;
        roomOccupancy.set(rm, currentCount);

        const autoBedLetter = String.fromCharCode(64 + Math.min(currentCount, 26));
        const finalBedCode = nr.bedCode && nr.bedCode.trim() ? nr.bedCode.trim() : `Bed ${autoBedLetter}`;

        return {
          ...nr,
          id: `ft_appended_${Date.now()}_${idx}`,
          bedCode: finalBedCode,
        };
      });

      const combined = [...editableRows, ...normalizedNewRows];
      setEditableRows(combined);
      handleSaveDraft(combined);

      // Reset append drawer state
      setAppendImages([]);
      setAppendText("");
      setShowAppendDrawer(false);
      setAppendSuccessNotice(`Successfully appended ${normalizedNewRows.length} residents from Page ${Math.floor(combined.length / 4) + 1}!`);
      setTimeout(() => setAppendSuccessNotice(null), 4500);
    } catch (err: any) {
      alert(`Append Error: ${err.message}`);
    } finally {
      setIsAppending(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Check for saved draft in localStorage
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
            setSavedDraft(parsed);
          } else {
            setSavedDraft(null);
          }
        }
      } catch (e) {
        setSavedDraft(null);
      }

      setStep("INPUT");
      setPastedText("");
      setFileName(null);
      setSelectedImages([]);
      setParsedResult(null);
      setEditableRows([]);
      setIngestResult(null);
      setIsMaximized(false);
      setProcessingError(null);
      setProcessingProgress(0);
      setShowAppendDrawer(false);
      setAppendImages([]);
      setAppendText("");
    }
  }, [isOpen, propertyId]);

  if (!isOpen) return null;

  // Helper: Client-side Image Optimizer (prevents huge payloads, zero storage in firebase)
  const compressImageForAi = async (file: File): Promise<{ name: string; base64: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1600;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve({ name: file.name, base64: e.target?.result as string });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.88);
          resolve({
            name: file.name,
            base64: compressedBase64,
          });
        };
        img.onerror = () => {
          resolve({ name: file.name, base64: e.target?.result as string });
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve({ name: file.name, base64: "" });
      };
      reader.readAsDataURL(file);
    });
  };

  // Helper: Native Spreadsheet / CSV / Excel reader
  const processSpreadsheetFile = async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "xlsx" || ext === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        setPastedText(csvText);
      } else {
        const text = await file.text();
        setPastedText(text);
      }
    } catch (err: any) {
      console.error("Spreadsheet read error:", err);
      alert(`Could not read spreadsheet file: ${err.message}`);
    }
  };

  // 1. Handle File Upload (.xlsx, .csv, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSpreadsheetFile(file);
  };

  // 2. Handle Image Upload / Camera Capture
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const optimized = await compressImageForAi(file);
      if (optimized.base64) {
        setSelectedImages((prev) => [...prev, optimized]);
      }
    }
  };

  // 3. Drag & Drop Handlers for Sheet & Camera
  const handleSheetDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSheet(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // If dropped an image onto sheet tab, switch to camera tab seamlessly!
    if (file.type.startsWith("image/")) {
      setActiveTab("CAMERA");
      for (const imgFile of Array.from(files)) {
        const optimized = await compressImageForAi(imgFile);
        if (optimized.base64) {
          setSelectedImages((prev) => [...prev, optimized]);
        }
      }
      return;
    }

    processSpreadsheetFile(file);
  };

  const handleCameraDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCamera(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        const optimized = await compressImageForAi(file);
        if (optimized.base64) {
          setSelectedImages((prev) => [...prev, optimized]);
        }
      } else {
        // Dropped spreadsheet onto camera tab -> switch to sheet tab!
        setActiveTab("SHEET");
        processSpreadsheetFile(file);
        return;
      }
    }
  };

  // Drag & drop handlers specifically for Append Drawer
  const handleAppendCameraDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAppendCamera(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const newImages: { name: string; base64: string }[] = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|bmp|avif|gif)$/i.test(file.name);
      if (isImage) {
        const optimized = await compressImageForAi(file);
        if (optimized.base64) {
          newImages.push(optimized);
        }
      } else {
        // Dropped spreadsheet onto camera tab in append drawer -> switch to sheet tab!
        setAppendMode("SHEET");
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "xlsx" || ext === "xls") {
          const ab = await file.arrayBuffer();
          const XLSX = await import("xlsx");
          const wb = XLSX.read(ab, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          setAppendText(XLSX.utils.sheet_to_csv(ws));
        } else {
          setAppendText(await file.text());
        }
        return;
      }
    }
    if (newImages.length > 0) {
      setAppendImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleAppendSheetDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAppendSheet(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|bmp|avif|gif)$/i.test(file.name);
    if (isImage) {
      // Dropped image onto sheet tab in append drawer -> switch to camera tab!
      setAppendMode("CAMERA");
      const newImages: { name: string; base64: string }[] = [];
      for (const imgFile of Array.from(files)) {
        const optimized = await compressImageForAi(imgFile);
        if (optimized.base64) newImages.push(optimized);
      }
      if (newImages.length > 0) {
        setAppendImages((prev) => [...prev, ...newImages]);
      }
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "xlsx" || ext === "xls") {
        const ab = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(ab, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        setAppendText(XLSX.utils.sheet_to_csv(ws));
      } else {
        setAppendText(await file.text());
      }
    } catch (err: any) {
      console.error("Append sheet drop error:", err);
    }
  };

  // 4. Run Intelligent Parser (Waterfall Router)
  const handleProcessInput = async () => {
    setStep("PROCESSING");
    setProcessingError(null);
    setProcessingProgress(15);

    if (activeTab === "SHEET") {
      setProcessingStatus("Running Fast Pattern Engine...");
      setProcessingProgress(40);
      await new Promise((r) => setTimeout(r, 300));

      const res = parseRawSpreadsheetText(pastedText, settings.rentalTiers);

      // If confidence is good, go straight to review
      if (res.success && res.confidenceScore >= 60) {
        setProcessingProgress(100);
        setParsedResult(res);
        setEditableRows(res.rows);
        setStep("REVIEW");
        return;
      }

      // If messy, attempt AI escalation via API route
      setProcessingStatus("Engaging Gemini AI for Deep Unstructured Parsing...");
      setProcessingProgress(70);
      try {
        const apiRes = await fetch("/api/fasttrack/ai-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawText: pastedText,
            propertyId,
            defaultRentalTiers: settings.rentalTiers,
          }),
        });
        const apiJson = await apiRes.json();
        if (apiJson.success && apiJson.rows?.length > 0) {
          setProcessingProgress(100);
          setParsedResult(apiJson);
          setEditableRows(apiJson.rows);
          setStep("REVIEW");
          return;
        }
      } catch (e) {
        console.warn("AI parse route fallback:", e);
      }

      // Fallback to heuristic result
      setProcessingProgress(100);
      setParsedResult(res);
      setEditableRows(res.rows);
      setStep("REVIEW");
    } else {
      // Camera / Ledger photo path: Invoke Gemini Vision AI
      if (selectedImages.length === 0) {
        setProcessingError("Please upload or take at least one ledger photo first.");
        return;
      }

      setProcessingStatus("Optimizing & preparing ledger images...");
      setProcessingProgress(25);
      await new Promise((r) => setTimeout(r, 200));

      setProcessingStatus("Transmitting ledger images to Gemini 3.7 Flash Vision AI...");
      setProcessingProgress(60);

      try {
        const apiRes = await fetch("/api/fasttrack/ai-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: selectedImages.map((img) => ({
              data: img.base64,
              mimeType: "image/jpeg",
            })),
            propertyId,
            defaultRentalTiers: settings.rentalTiers,
          }),
        });

        setProcessingStatus("Extracting tenant rows, rooms, bed slots & normalizing dates...");
        setProcessingProgress(85);

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || errData.message || `Server responded with status ${apiRes.status}`);
        }

        const apiJson = await apiRes.json();
        if (apiJson.success && apiJson.rows?.length > 0) {
          setProcessingProgress(100);
          setParsedResult(apiJson);
          setEditableRows(apiJson.rows);
          setStep("REVIEW");
          return;
        } else {
          throw new Error("No readable tenant entries could be extracted from this photo. Please ensure the handwriting is legible and well-lit.");
        }
      } catch (e: any) {
        console.error("AI vision error:", e);
        setProcessingError(e.message || "Failed to process photo with AI. Please check your internet connection or try again.");
      }
    }
  };

  // 4. Update row values during review
  const updateRowField = (idx: number, field: keyof FastTrackParsedRow, value: any) => {
    setEditableRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[idx], [field]: value };
      // Re-validate row
      const warnings: string[] = [];
      if (!row.phone || row.phone.length !== 10) warnings.push("Invalid phone");
      if (!row.roomNumber) warnings.push("Missing room");
      row.isValid = warnings.length === 0;
      row.warnings = warnings;
      updated[idx] = row;
      return updated;
    });
  };

  const removeRow = (idx: number) => {
    setEditableRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // 5. Execute 1-Click Commit
  const handleCommitIngest = async () => {
    setIsSubmitting(true);
    try {
      const result = await executeFastTrackBatchIngest(propertyId, editableRows, {
        autoProvisionBuilding,
        markDepositsPaid,
        markCurrentMonthRentPaid,
      });

      setIngestResult(result);
      setStep("SUCCESS");
      handleClearDraft();
      fireCelebrationConfetti();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Ingest Error: ${err.message || "Failed to commit tenants."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate WhatsApp Blast Text
  const totalTenantsCount = editableRows.length;
  const totalRentAmount = editableRows.reduce((acc, r) => acc + (Number(r.rentAmount) || 0), 0);
  const uniqueRoomsCount = new Set(editableRows.map((r) => r.roomNumber)).size;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in overflow-y-auto">
      <div
        className={`bg-white rounded-3xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden my-auto animate-in zoom-in-95 transition-all duration-200 ${
          isMaximized ? "w-[98vw] h-[96vh] max-w-none" : "max-w-6xl w-full h-[90vh] max-h-[92vh]"
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-purple-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#c2652a] to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-gray-900">FastTrack 1-Click Migration</h2>
                <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Powered
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Instantly import your existing tenants & auto-create your building in 10 seconds
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
              title={isMaximized ? "Restore window" : "Maximize window"}
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: INPUT MODE */}
        {step === "INPUT" && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Resume Draft Banner */}
            {savedDraft && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-orange-50 to-amber-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-900">
                        Saved Draft Available ({savedDraft.rows.length} Residents)
                      </h4>
                      <span className="text-[9px] bg-purple-200/80 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Last saved {new Date(savedDraft.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Resume to continue editing, append next pages, or commit.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleResumeDraft}
                    className="px-4 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a8451f] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Resume Draft ({savedDraft.rows.length})
                  </button>
                </div>
              </div>
            )}

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-2xl max-w-md mx-auto">
              <button
                onClick={() => setActiveTab("SHEET")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "SHEET"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#c2652a]" />
                Excel / Google Sheet / Paste
              </button>
              <button
                onClick={() => setActiveTab("CAMERA")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "CAMERA"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Camera className="w-4 h-4 text-purple-600" />
                AI Ledger Photo Scan
              </button>
            </div>

            {/* TAB A: SPREADSHEET & CLIPBOARD PASTE */}
            {activeTab === "SHEET" && (
              <div className="space-y-4">
                {/* File Dropzone & Paste Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingSheet(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingSheet(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingSheet(false);
                  }}
                  onDrop={handleSheetDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 transition-all bg-gray-50/50 space-y-3 ${
                    isDraggingSheet
                      ? "border-[#c2652a] bg-orange-50/60 ring-4 ring-orange-500/10 scale-[0.99]"
                      : "border-gray-200 hover:border-[#c2652a]/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-100 text-[#c2652a]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">
                          {fileName ? `Selected File: ${fileName}` : "Drag & drop your CSV or Excel file here"}
                        </p>
                        <p className="text-[11px] text-gray-500">Supports .xlsx, .xls, .csv, or paste your copied table below</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv,.tsv,.txt,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all shadow-2xs cursor-pointer"
                      >
                        Choose File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPastedText(SAMPLE_PG_MESSY_SHEET);
                          setFileName("sample_balaji_pg_sheet.tsv");
                        }}
                        className="px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-[#c2652a] hover:bg-orange-100 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Try Sample Data
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={7}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste table cells here (e.g. from Google Sheets, Excel, or WhatsApp text)...
Rahul Sharma   9876543210   Room 101   13500
Suresh Reddy   9811223344   Room 101   13500
Priya Verma    9855667788   Room 201   22000"
                    className="w-full p-3.5 bg-white rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Auto-detects Name, Phone, Room & Rent even with messy or missing headers
                  </span>
                  <span>{pastedText.split("\n").filter((l) => l.trim()).length} rows detected</span>
                </div>
              </div>
            )}

            {/* TAB B: AI LEDGER & NOTEBOOK PHOTO SCAN */}
            {activeTab === "CAMERA" && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCamera(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCamera(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCamera(false);
                  }}
                  onDrop={handleCameraDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-4 transition-all ${
                    isDraggingCamera
                      ? "border-purple-600 bg-purple-100/60 ring-4 ring-purple-500/10 scale-[0.99]"
                      : "border-purple-200 bg-purple-50/30"
                  }`}
                >
                  <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Drag & Drop or Snap Photos of Your Register</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                      Our Gemini 2.5 Vision AI reads handwritten tenant rows, room numbers, and advance deposits directly from physical registers. (Images are processed ephemerally in RAM and never stored in Firebase).
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden"
                  />

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Take / Choose Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImages([
                          {
                            name: "sample_handwritten_ledger_page.jpg",
                            base64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...",
                          },
                        ]);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-50 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Try Sample Ledger Photo
                    </button>
                  </div>
                </div>

                {/* Uploaded Thumbnails */}
                {selectedImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-700">Ready to Scan ({selectedImages.length} Photos):</p>
                    <div className="flex flex-wrap gap-3">
                      {selectedImages.map((img, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-2xs text-xs font-semibold text-gray-800"
                        >
                          <FileText className="w-4 h-4 text-purple-600" />
                          <span className="truncate max-w-[140px]">{img.name}</span>
                          <button
                            onClick={() => setSelectedImages((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-gray-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PROCESSING RADAR WITH LIVE PROGRESS BAR & ERROR RETRY */}
        {step === "PROCESSING" && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-6 text-center flex-1 max-w-lg mx-auto w-full">
            {!processingError ? (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-[#c2652a]/20 border-t-[#c2652a] animate-spin flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-[#c2652a] animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2 w-full">
                  <h3 className="font-serif font-bold text-lg text-gray-900">Ingesting & Structuring Roster</h3>
                  <p className="text-xs text-gray-500 font-mono min-h-[1.5rem]">{processingStatus}</p>

                  {/* Dynamic Live Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200 mt-4 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-[#c2652a] via-amber-500 to-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.max(processingProgress, 10)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono pt-1">
                    <span>Zero Storage (RAM Only)</span>
                    <span className="font-bold text-[#c2652a]">{processingProgress}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 w-full animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-rose-900">Scan Ingestion Notice</h4>
                  <p className="text-xs text-rose-700 mt-1">{processingError}</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("INPUT");
                      setProcessingError(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer shadow-2xs"
                  >
                    Back to Upload
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessInput}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer shadow-md shadow-rose-600/20 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry AI Scan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: INTERACTIVE REVIEW & VALIDATION GRID */}
        {step === "REVIEW" && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {/* Top Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100">
                <p className="text-[10px] uppercase font-bold text-[#c2652a]">Tenants Detected</p>
                <p className="font-serif text-xl font-bold text-gray-900">{totalTenantsCount}</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                <p className="text-[10px] uppercase font-bold text-blue-600">Unique Rooms</p>
                <p className="font-serif text-xl font-bold text-gray-900">{uniqueRoomsCount}</p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100">
                <p className="text-[10px] uppercase font-bold text-purple-600">Detection Confidence</p>
                <p className="font-serif text-xl font-bold text-gray-900">{parsedResult?.confidenceScore || 95}%</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] uppercase font-bold text-emerald-600">Monthly Revenue</p>
                <p className="font-serif text-xl font-bold text-gray-900">₹{totalRentAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Ingestion Options Bar & Auto-Fix Banner */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-gray-700">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoProvisionBuilding}
                    onChange={(e) => setAutoProvisionBuilding(e.target.checked)}
                    className="rounded text-[#c2652a] focus:ring-[#c2652a]"
                  />
                  <span>✨ Auto-generate Floors & Rooms in Property Setup if missing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markDepositsPaid}
                    onChange={(e) => setMarkDepositsPaid(e.target.checked)}
                    className="rounded text-[#c2652a] focus:ring-[#c2652a]"
                  />
                  <span>Mark Security Deposits as Paid</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markCurrentMonthRentPaid}
                    onChange={(e) => setMarkCurrentMonthRentPaid(e.target.checked)}
                    className="rounded text-[#c2652a] focus:ring-[#c2652a]"
                  />
                  <span>Mark Current Month Rent as Paid</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveDraft()}
                  className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Save draft so you can resume anytime"
                >
                  <Save className="w-3.5 h-3.5 text-gray-500" />
                  <span>{draftSaveStatus || "Save Draft"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAppendDrawer(!showAppendDrawer)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    showAppendDrawer
                      ? "bg-purple-700 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
                  }`}
                  title="Scan another ledger page or paste more rows to append to this list"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showAppendDrawer ? "Close Append Drawer" : "➕ Append Next Page"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddNewManualRow}
                  className="px-3 py-1.5 rounded-xl bg-[#c2652a] text-white hover:bg-[#a8451f] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Resident</span>
                </button>

                {editableRows.some((r) => !r.isValid) && (
                  <button
                    type="button"
                    onClick={handleAutoFixAllPlaceholders}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Auto-Fill Missing Details</span>
                  </button>
                )}
              </div>
            </div>

            {/* Append Success Notification */}
            {appendSuccessNotice && (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {appendSuccessNotice}
                </span>
                <button
                  type="button"
                  onClick={() => setAppendSuccessNotice(null)}
                  className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Multi-Page Append Drawer */}
            {showAppendDrawer && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/90 via-white to-orange-50/80 border-2 border-purple-300 shadow-md space-y-3 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-700" />
                    <h4 className="font-bold text-xs text-gray-900">
                      Append Next Page to This List
                    </h4>
                    <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                      Currently {editableRows.length} Residents
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAppendMode("CAMERA")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        appendMode === "CAMERA" ? "bg-white text-purple-700 shadow-xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      📸 Ledger Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppendMode("SHEET")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        appendMode === "SHEET" ? "bg-white text-[#c2652a] shadow-xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      📄 Sheet / Paste
                    </button>
                  </div>
                </div>

                {appendMode === "CAMERA" ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAppendCamera(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAppendCamera(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAppendCamera(false);
                    }}
                    onDrop={handleAppendCameraDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center space-y-3 transition-all ${
                      isDraggingAppendCamera
                        ? "border-purple-600 bg-purple-100/70 ring-4 ring-purple-500/10 scale-[0.99]"
                        : "border-purple-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">
                            {appendImages.length > 0 ? `${appendImages.length} Photos Selected for Append` : "Drag & Drop Next Ledger Page Photo Here"}
                          </p>
                          <p className="text-[11px] text-gray-500">Supports .jpg, .png, .jpeg from mobile camera or notebook photos</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={appendCameraInputRef}
                          accept="image/*"
                          multiple
                          capture="environment"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files) return;
                            for (const f of Array.from(files)) {
                              const opt = await compressImageForAi(f);
                              if (opt.base64) setAppendImages((prev) => [...prev, opt]);
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => appendCameraInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <Camera className="w-4 h-4" />
                          Choose Photo
                        </button>
                        <button
                          type="button"
                          disabled={isAppending || appendImages.length === 0}
                          onClick={handleExecuteAppend}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer flex items-center gap-1.5"
                        >
                          {isAppending ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              <span>Scanning in 2s...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Scan & Append</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Thumbnails of selected append images */}
                    {appendImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {appendImages.map((img, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 rounded-lg border border-purple-200 text-[11px] font-semibold text-purple-900"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-600" />
                            <span className="truncate max-w-[140px]">{img.name}</span>
                            <button
                              type="button"
                              onClick={() => setAppendImages((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-gray-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAppendSheet(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAppendSheet(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAppendSheet(false);
                    }}
                    onDrop={handleAppendSheetDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 space-y-3 transition-all ${
                      isDraggingAppendSheet
                        ? "border-orange-500 bg-orange-50/70 ring-4 ring-orange-500/10 scale-[0.99]"
                        : "border-orange-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#c2652a] flex items-center justify-center shrink-0">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Drag & Drop Next CSV / Excel File or Paste Below</p>
                          <p className="text-[11px] text-gray-500">Supports .xlsx, .xls, .csv, or paste copied cells from Google Sheets</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={appendSheetInputRef}
                          accept=".csv,.tsv,.txt,.xlsx,.xls"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const ext = file.name.split(".").pop()?.toLowerCase();
                            if (ext === "xlsx" || ext === "xls") {
                              const ab = await file.arrayBuffer();
                              const XLSX = await import("xlsx");
                              const wb = XLSX.read(ab, { type: "array" });
                              const ws = wb.Sheets[wb.SheetNames[0]];
                              setAppendText(XLSX.utils.sheet_to_csv(ws));
                            } else {
                              setAppendText(await file.text());
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => appendSheetInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-200 text-[#c2652a] text-xs font-bold hover:bg-orange-100 transition-all cursor-pointer shadow-2xs"
                        >
                          Choose File
                        </button>
                        <button
                          type="button"
                          disabled={isAppending || !appendText.trim()}
                          onClick={handleExecuteAppend}
                          className="px-4 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a8451f] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Append to List</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={appendText}
                      onChange={(e) => setAppendText(e.target.value)}
                      placeholder="Paste additional table rows here (e.g. from Page 2 or Excel sheet)...
Ravi Kumar   9845011223   Room 103   12000
Anil Verma   9812345678   Room 103   12000"
                      className="w-full p-3 bg-gray-50/50 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] transition-all resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Reassuring Bed Allocation Notification */}
            <div className="px-3.5 py-2 rounded-xl bg-purple-50/70 border border-purple-200/60 text-[11px] text-purple-900 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span><strong>Auto-Bed & Sharing Allocation Active:</strong> Room sharing capacity and beds are assigned automatically. No manual bed input needed!</span>
              </span>
              <span className="text-[10px] text-purple-600 font-bold shrink-0 hidden sm:inline">Zero Friction</span>
            </div>

            {/* Editable Data Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto overflow-y-auto max-h-[52vh] sm:max-h-[58vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100/90 backdrop-blur-xs sticky top-0 z-10 text-[11px] font-bold text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Tenant Name</th>
                      <th className="py-2.5 px-3 min-w-[125px]">10-Digit Mobile</th>
                      <th className="py-2.5 px-3 min-w-[80px] text-center">Room</th>
                      <th className="py-2.5 px-3 min-w-[90px] text-center">Bed Slot</th>
                      <th className="py-2.5 px-3 min-w-[105px] text-center">Sharing</th>
                      <th className="py-2.5 px-3 min-w-[150px]">
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Joining Date</span>
                          <select
                            value={dateFormatMode}
                            onChange={(e) => setDateFormatMode(e.target.value as any)}
                            title="Choose display date format"
                            className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-[10px] font-mono text-gray-800 cursor-pointer transition-colors border-0"
                          >
                            <option value="DD-MMM-YYYY">DD Mon YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          </select>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 min-w-[100px]">Monthly Rent</th>
                      <th className="py-2.5 px-3 min-w-[100px]">Deposit</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {editableRows.map((row, idx) => (
                      <tr key={row.id} className={!row.isValid ? "bg-amber-50/40" : "hover:bg-gray-50/50"}>
                        <td className="py-2 px-3 font-mono text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.fullName}
                            onChange={(e) => updateRowField(idx, "fullName", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-900 text-xs focus:ring-1 focus:ring-[#c2652a]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="tel"
                            maxLength={10}
                            value={row.phone}
                            onChange={(e) => updateRowField(idx, "phone", e.target.value)}
                            placeholder="9876543210"
                            className={`w-30 px-2.5 py-1.5 rounded-lg border font-mono text-xs focus:ring-1 focus:ring-[#c2652a] ${
                              !row.phone || row.phone.length !== 10
                                ? "border-amber-400 bg-amber-50 text-amber-900"
                                : "border-gray-200 text-gray-900"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="text"
                            value={row.roomNumber}
                            onChange={(e) => updateRowField(idx, "roomNumber", e.target.value)}
                            className="w-18 px-2 py-1.5 rounded-lg border border-gray-200 font-mono font-bold text-gray-900 text-xs text-center focus:ring-1 focus:ring-[#c2652a]"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="text"
                            value={row.bedCode || "Bed A"}
                            onChange={(e) => updateRowField(idx, "bedCode", e.target.value)}
                            placeholder="Bed A"
                            title="Bed Slot Identifier (Editable)"
                            className="w-20 px-2 py-1.5 rounded-lg border border-purple-200/90 bg-purple-50/60 font-mono font-bold text-purple-800 text-xs text-center focus:ring-1 focus:ring-[#c2652a] focus:bg-white"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={row.sharingType || 2}
                            onChange={(e) => {
                              const count = Number(e.target.value);
                              updateRowField(idx, "sharingType", count);
                              updateRowField(idx, "sharingLabel", count === 1 ? "Single Room" : `${count}-Sharing`);
                            }}
                            title="Room Sharing Capacity (Editable)"
                            className="px-2 py-1.5 rounded-lg border border-blue-200/90 bg-blue-50/60 font-semibold text-blue-800 text-xs focus:ring-1 focus:ring-[#c2652a] focus:bg-white cursor-pointer"
                          >
                            <option value={1}>1-Sharing</option>
                            <option value={2}>2-Sharing</option>
                            <option value={3}>3-Sharing</option>
                            <option value={4}>4-Sharing</option>
                            <option value={5}>5-Sharing</option>
                            <option value={6}>6-Sharing</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-between gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-[#c2652a] focus-within:border-[#c2652a] transition-all min-w-[145px]">
                            <span className="font-mono text-xs font-semibold text-gray-900">
                              {formatDisplayDate(row.joiningDate)}
                            </span>
                            <input
                              type="date"
                              value={row.joiningDate || new Date().toISOString().split("T")[0]}
                              onChange={(e) => updateRowField(idx, "joiningDate", e.target.value)}
                              className="w-5 h-5 opacity-60 hover:opacity-100 cursor-pointer border-0 p-0 bg-transparent shrink-0"
                              title="Pick a date"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={row.rentAmount}
                            onChange={(e) => updateRowField(idx, "rentAmount", Number(e.target.value))}
                            className="w-22 px-2 py-1.5 rounded-lg border border-gray-200 font-mono font-bold text-gray-900 text-xs focus:ring-1 focus:ring-[#c2652a]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={row.securityDeposit}
                            onChange={(e) => updateRowField(idx, "securityDeposit", Number(e.target.value))}
                            className="w-22 px-2 py-1.5 rounded-lg border border-gray-200 font-mono text-gray-700 text-xs focus:ring-1 focus:ring-[#c2652a]"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Check className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span
                              title={row.warnings.join(", ")}
                              className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            >
                              <AlertTriangle className="w-3 h-3" /> Fix Info
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => removeRow(idx)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Quick Append Action */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddNewManualRow}
                  className="text-xs font-bold text-[#c2652a] hover:text-[#a8451f] flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg hover:bg-orange-50 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Resident Manually</span>
                </button>
                <span className="text-[11px] text-gray-500 font-medium">
                  {editableRows.length} Total Residents Queued
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS / CELEBRATION */}
        {step === "SUCCESS" && ingestResult && (
          <div className="p-8 flex flex-col items-center justify-center space-y-6 text-center flex-1 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif font-bold text-2xl text-gray-900">
                🎉 Successfully Onboarded {ingestResult.enrolledCount} Tenants!
              </h3>
              <p className="text-xs text-gray-500 max-w-md">
                Your building layout and tenant roster are now live in TenoPilot with full financial & bed allocation tracking.
              </p>
            </div>

            {/* Metrics pills */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-3.5 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#c2652a]" /> {ingestResult.enrolledCount} Active Residents
              </span>
              <span className="px-3.5 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" /> {ingestResult.createdRoomsCount} Rooms Created
              </span>
              <span className="px-3.5 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> ₹{ingestResult.totalMonthlyRevenue.toLocaleString("en-IN")} Monthly Rent
              </span>
            </div>

            {/* Distributed WhatsApp Self-KYC Card */}
            <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-left max-w-lg w-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-xs text-emerald-950">Next Step: Collect Aadhaar & KYC via WhatsApp</span>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                  Zero Paperwork
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Send a pre-filled WhatsApp link to all {ingestResult.enrolledCount} tenants. They can snap their Aadhaar card & selfie in 60 seconds from their phones.
              </p>
              <button
                onClick={() => {
                  const samplePhone = ingestResult.occupants[0]?.phone || "9876543210";
                  const text = encodeURIComponent(
                    `Hello! Your room at ${propertyId} has been setup on TenoPilot. Please click here to verify your details and upload your Aadhaar: https://tenopilot.com/self-onboard/${propertyId}`
                  );
                  window.open(`https://wa.me/91${samplePhone}?text=${text}`, "_blank");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Share WhatsApp Onboarding Link
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {step === "INPUT" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={activeTab === "SHEET" ? !pastedText.trim() : selectedImages.length === 0}
                onClick={handleProcessInput}
                className="px-6 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
              >
                <span>Process & Preview Roster</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === "REVIEW" && (
            <>
              <button
                type="button"
                onClick={() => setStep("INPUT")}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                Back to Edit
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveDraft()}
                  className="px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Save draft so you can resume anytime"
                >
                  <Save className="w-4 h-4 text-gray-500" />
                  <span>{draftSaveStatus || "Save Draft"}</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || editableRows.length === 0}
                  onClick={handleCommitIngest}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enrolling {totalTenantsCount} Tenants...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Enroll {totalTenantsCount} Tenants</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === "SUCCESS" && (
            <div className="w-full flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close & View Tenants
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
