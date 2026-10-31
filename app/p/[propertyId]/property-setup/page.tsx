"use client";

import { use, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { Occupant, occupantStore } from "@/constants/mockOccupants";
import { subscribeOccupantsFromFirestore } from "@/lib/firestoreService";
import { selfKycStore, SelfKycInvite, SelfKycSubmission } from "@/lib/selfKycStore";
import {
  propertyStore,
  FloorConfig,
  RoomConfig,
  BedSlotConfig,
} from "@/constants/propertyLayoutStore";
import {
  getBedOccupantsTimeline,
  getCanonicalBedIndex,
  normalizeBedCode,
  normalizeRoomNumber,
} from "@/utils/domainSSOT";
import { propertySettingsStore } from "@/constants/propertySettings";
import { staffStore, UserRole } from "@/lib/staffStore";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Edit,
  Building2,
  Bed,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Save,
  RotateCcw,
} from "lucide-react";
import { SmartPropertyGeneratorModal } from "@/components/dashboard/SmartPropertyGeneratorModal";
import { FastTrackImportModal } from "@/components/dashboard/FastTrackImportModal";

export default function PropertySetupPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  const [activeRole, setActiveRole] = useState<UserRole>(() => staffStore.getActiveRole());

  useEffect(() => {
    const unsub = staffStore.subscribe(() => {
      setActiveRole(staffStore.getActiveRole());
    });
    return unsub;
  }, []);

  // 🔒 Receptionist Route Guard: Bounce to Property Map
  useEffect(() => {
    if (activeRole === "receptionist") {
      router.replace(`/p/${propertyId}/property-map`);
    }
  }, [activeRole, propertyId, router]);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Accordion open/close state for floors (Auto-expands all active floors)
  const [openFloorIds, setOpenFloorIds] = useState<string[]>([]);
  const [showSmartGeneratorModal, setShowSmartGeneratorModal] = useState(false);
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);

  // Reactive Property Layout Structure State
  const [propertyStructure, setPropertyStructure] = useState<FloorConfig[]>(() =>
    typeof window !== "undefined" ? propertyStore.getStructure(propertyId) : []
  );

  // Reactive Property Settings State
  const [settings, setSettings] = useState(() =>
    typeof window !== "undefined" ? propertySettingsStore.getSettings(propertyId) : propertySettingsStore.getSettings()
  );

  // Reactive Occupants & KYC Stores
  const [occupantsList, setOccupantsList] = useState<Occupant[]>(() =>
    typeof window !== "undefined" ? occupantStore.getOccupants(propertyId) : []
  );
  const [kycInvites, setKycInvites] = useState<SelfKycInvite[]>(() =>
    typeof window !== "undefined" ? selfKycStore.getInvites(propertyId) : []
  );
  const [kycSubmissions, setKycSubmissions] = useState<SelfKycSubmission[]>(() =>
    typeof window !== "undefined" ? selfKycStore.getSubmissions(propertyId) : []
  );

  useEffect(() => {
    propertyStore.initFirebaseListener(propertyId);
    propertySettingsStore.initFirebaseListener(propertyId);

    const initialStructure = propertyStore.getStructure(propertyId);
    setPropertyStructure(initialStructure);
    if (initialStructure && initialStructure.length > 0) {
      setOpenFloorIds((prev) => Array.from(new Set([...prev, ...initialStructure.map((f) => f.id)])));
    }
    setSettings(propertySettingsStore.getSettings(propertyId));
    setOccupantsList(occupantStore.getOccupants(propertyId));
    setKycInvites(selfKycStore.getInvites(propertyId));
    setKycSubmissions(selfKycStore.getSubmissions(propertyId));

    const unsubscribeProperty = propertyStore.subscribe(() => {
      // Do not overwrite user's local draft changes if they have unsaved modifications pending
      if (hasUnsavedChangesRef.current) return;
      const updated = propertyStore.getStructure(propertyId);
      setPropertyStructure(updated);
      if (updated && updated.length > 0) {
        setOpenFloorIds((prev) => Array.from(new Set([...prev, ...updated.map((f) => f.id)])));
      }
    });
    const unsubscribeSettings = propertySettingsStore.subscribe(() => {
      setSettings(propertySettingsStore.getSettings(propertyId));
    });
    const unsubscribeOccupantsFirestore = subscribeOccupantsFromFirestore(propertyId, (fsOccupants) => {
      if (fsOccupants && fsOccupants.length > 0) {
        occupantStore.setOccupantsFromFirestore(fsOccupants, propertyId);
      } else {
        occupantStore.setOccupantsFromFirestore([], propertyId);
      }
      setOccupantsList(occupantStore.getOccupants(propertyId));
    });
    const unsubscribeOccupants = occupantStore.subscribe(() => {
      setOccupantsList(occupantStore.getOccupants(propertyId));
    });
    const unsubscribeSubmissions = selfKycStore.subscribeSubmissions(propertyId, (list) => {
      setKycSubmissions(list);
    });
    const unsubscribeInvites = selfKycStore.subscribeInvites(propertyId, (list) => {
      setKycInvites(list);
    });

    return () => {
      unsubscribeProperty();
      unsubscribeSettings();
      unsubscribeOccupantsFirestore();
      unsubscribeOccupants();
      unsubscribeSubmissions();
      unsubscribeInvites();
    };
  }, [propertyId]);

  // Helper to resolve real live occupant and state for a bed slot (PMS Enterprise Parity with Property Map)
  const resolveBedSlotInfo = (
    roomNumber: string,
    bed: BedSlotConfig,
    allRoomBeds?: BedSlotConfig[],
    claimedOccIds?: Set<string>
  ) => {
    const cleanRm = normalizeRoomNumber(roomNumber);
    const cleanBd = normalizeBedCode(bed.bedCode);
    const bedCanonicalIdx = getCanonicalBedIndex(bed.bedCode);

    const timeline = getBedOccupantsTimeline(roomNumber, bed.bedCode, bed, propertyId, allRoomBeds);

    // 1. Live occupant lookup (highest priority)
    let liveOcc =
      timeline.activeOccupant ||
      (bed.occupant &&
       bed.occupant.lifecycleStatus !== "Past" &&
       bed.occupant.lifecycleStatus !== "Booked" &&
       (!bed.occupant.bedCode || (bedCanonicalIdx !== -1 && getCanonicalBedIndex(bed.occupant.bedCode) === bedCanonicalIdx) || normalizeBedCode(bed.occupant.bedCode) === cleanBd)
        ? bed.occupant
        : undefined);

    // 🔒 Enterprise Occupant Deduplication: Prevent a resident from being replicated across multiple beds in the same room!
    if (liveOcc) {
      if (claimedOccIds && claimedOccIds.has(liveOcc.id)) {
        liveOcc = undefined; // Already claimed by an earlier bed in this room!
      } else if (claimedOccIds) {
        claimedOccIds.add(liveOcc.id);
      }
    }

    // 2. Active invite lookup
    const activeInvite = kycInvites.find(
      (i) =>
        i.status === "ACTIVE" &&
        normalizeRoomNumber(i.roomNumber) === cleanRm &&
        normalizeBedCode(i.bedCode) === cleanBd
    );

    // 3. Pending KYC submission lookup
    const pendingSub = kycSubmissions.find(
      (s) =>
        s.status === "PENDING" &&
        normalizeRoomNumber(s.roomNumber) === cleanRm &&
        normalizeBedCode(s.bedCode) === cleanBd
    );

    // 4. Rejected submission (awaiting revision) lookup
    const rejectedSub = kycSubmissions.find(
      (s) =>
        s.status === "REJECTED" &&
        normalizeRoomNumber(s.roomNumber) === cleanRm &&
        normalizeBedCode(s.bedCode) === cleanBd
    );

    const isLiveOccupied = Boolean(liveOcc);
    const isNotice = liveOcc?.lifecycleStatus === "Notice";
    const isGuest = liveOcc?.stayType === "Guest";
    const isBooked =
      !liveOcc && Boolean(activeInvite || pendingSub || bed.status === "Booked" || bed.status === "Hold");

    let effectiveStatus: "Available" | "Occupied" | "Booked" | "Vacating" | "Guest" = "Available";
    if (isNotice) effectiveStatus = "Vacating";
    else if (isGuest) effectiveStatus = "Guest";
    else if (isLiveOccupied) effectiveStatus = "Occupied";
    else if (isBooked) effectiveStatus = "Booked";
    else if (
      bed.status === "Occupied" &&
      bed.occupant &&
      (!bed.occupant.bedCode || (bedCanonicalIdx !== -1 && getCanonicalBedIndex(bed.occupant.bedCode) === bedCanonicalIdx) || normalizeBedCode(bed.occupant.bedCode) === cleanBd)
    ) {
      effectiveStatus = "Occupied";
    }

    let badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
    let statusBadge = "VACANT";
    let displayName = "";

    if (effectiveStatus === "Occupied") {
      badgeStyle = "bg-[#f7f2ee] text-amber-900 border-amber-200 hover:bg-amber-100";
      statusBadge = "OCCUPIED";
      displayName = liveOcc?.name || bed.occupant?.name || "Occupied";
    } else if (effectiveStatus === "Vacating") {
      badgeStyle = "bg-orange-50 text-orange-950 border-2 border-orange-400 hover:bg-orange-100 shadow-2xs";
      statusBadge = "NOTICE";
      displayName = liveOcc?.name || "Notice";
    } else if (effectiveStatus === "Guest") {
      badgeStyle = "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100";
      statusBadge = "GUEST";
      displayName = liveOcc?.name || "Guest";
    } else if (effectiveStatus === "Booked") {
      badgeStyle = "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 shadow-2xs";
      statusBadge = pendingSub ? "KYC REVIEW" : rejectedSub ? "CORRECTION" : "BOOKED";
      displayName = pendingSub?.name || activeInvite?.candidateName || bed.holdCandidate?.name || "Incoming Resident";
    }

    return {
      isOccupied: effectiveStatus !== "Available",
      effectiveStatus,
      occupant: liveOcc || bed.occupant,
      displayName,
      statusBadge,
      badgeStyle,
      activeInvite,
      pendingSub,
      rejectedSub,
    };
  };

  // 🛡️ Draft & Save Changes State (Prevents dangerous instant auto-saves)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSavingChanges, setIsSavingChanges] = useState<boolean>(false);
  const [unsavedChangeCount, setUnsavedChangeCount] = useState<number>(0);
  const hasUnsavedChangesRef = useRef(false);

  // Warn user before closing or navigating away with unsaved layout modifications
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Update local draft structure without auto-persisting to Cloud Firestore
  const updateLayoutStructure = (newStructure: FloorConfig[]) => {
    setPropertyStructure(newStructure);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
    setUnsavedChangeCount((prev) => prev + 1);
  };

  // 💾 Persist all pending layout changes to Cloud Firestore SSOT
  const handleSaveAllStructureChanges = async () => {
    if (!propertyId || isSavingChanges) return;
    setIsSavingChanges(true);
    try {
      await propertyStore.updateStructure(propertyStructure, propertyId);
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      setUnsavedChangeCount(0);
      triggerToast("✅ Building layout saved successfully!");
    } catch (err) {
      console.error("Failed to save layout changes:", err);
      triggerToast("❌ Failed to save layout changes. Please try again.");
    } finally {
      setIsSavingChanges(false);
    }
  };

  // ↺ Discard uncommitted layout changes and revert back to Cloud Firestore SSOT
  const handleDiscardStructureChanges = () => {
    const cleanStructure = propertyStore.getStructure(propertyId);
    setPropertyStructure(cleanStructure);
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    setUnsavedChangeCount(0);
    triggerToast("↺ Reverted all changes to last saved layout");
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Deletion Protection Modal State
  const [blockedDeleteModal, setBlockedDeleteModal] = useState<{
    title: string;
    itemName: string;
    occupantName: string;
    occupantId: string;
    reason: string;
  } | null>(null);

  // Confirm Vacant Delete Modal State
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Add Floor Modal State
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorSub, setNewFloorSub] = useState("DELUXE SUITES");

  // Add Room & Edit Room Modal State (Supports Custom Rent, Feature Tag, and Max 8 Compressed Photos)
  const [activeAddRoomFloorId, setActiveAddRoomFloorId] = useState<string | null>(null);
  const [activeEditRoom, setActiveEditRoom] = useState<{
    floorId: string;
    room: RoomConfig;
  } | null>(null);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newSharingCapacityStr, setNewSharingCapacityStr] = useState<string>("3");
  const newSharingCapacity = Math.min(26, Math.max(1, parseInt(newSharingCapacityStr, 10) || 1));
  const [newRoomSpecialTag, setNewRoomSpecialTag] = useState("");
  const [newRoomCustomRent, setNewRoomCustomRent] = useState("");
  const [newRoomPhotos, setNewRoomPhotos] = useState<string[]>([]);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  // Auto canvas image compressor (max 1200px, 0.85 JPEG quality)
  const compressRoomImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
      };
    });
  };

  const handleRoomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (newRoomPhotos.length >= 8) {
      triggerToast("⚠️ Maximum 8 photos allowed per room!");
      return;
    }

    setIsCompressingImage(true);
    const files = Array.from(e.target.files).slice(0, 8 - newRoomPhotos.length);
    const compressedList: string[] = [];

    for (const f of files) {
      try {
        const compressed = await compressRoomImage(f);
        compressedList.push(compressed);
      } catch (err) {
        console.warn("Failed to compress image", err);
      }
    }

    setNewRoomPhotos((prev) => [...prev, ...compressedList].slice(0, 8));
    setIsCompressingImage(false);
    triggerToast(`📸 ${compressedList.length} photo(s) added & compressed!`);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleFloorAccordion = (id: string) => {
    if (openFloorIds.includes(id)) {
      setOpenFloorIds(openFloorIds.filter((item) => item !== id));
    } else {
      setOpenFloorIds([...openFloorIds, id]);
    }
  };

  // 1-Click Direct Bed Addition on Room Card
  const handleAddBedDirect = (floorId: string, room: RoomConfig) => {
    const currentBeds = room.beds || [];
    const usedIndices = new Set<number>();
    currentBeds.forEach((b) => {
      const idx = getCanonicalBedIndex(b.bedCode);
      if (idx !== -1) usedIndices.add(idx);
    });

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let nextIdx = 0;
    while (usedIndices.has(nextIdx) && nextIdx < alphabet.length) {
      nextIdx++;
    }
    const nextLetter = alphabet[nextIdx] || String(nextIdx + 1);
    const nextCode = `Bed ${nextLetter}`;

    const newBed: BedSlotConfig = {
      id: `bed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      bedCode: nextCode,
      status: "Available",
      occupant: undefined,
    };

    const newBedList = [...currentBeds, newBed].sort((a, b) => {
      const idxA = getCanonicalBedIndex(a.bedCode);
      const idxB = getCanonicalBedIndex(b.bedCode);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return (a.bedCode || "").localeCompare(b.bedCode || "");
    });
    const newCapacity = newBedList.length;

    const updated = propertyStructure.map((fl) => {
      if (fl.id !== floorId) return fl;
      return {
        ...fl,
        totalBeds: (fl.totalBeds || 0) + 1,
        rooms: fl.rooms.map((rm) => {
          if (rm.id !== room.id) return rm;
          return {
            ...rm,
            sharingType: newCapacity,
            beds: newBedList,
          };
        }),
      };
    });

    updateLayoutStructure(updated);
    triggerToast(`✓ Added ${nextCode} (Vacant) to Room ${room.roomNumber}!`);
  };

  // Handle Deletion of Bed Slot
  const handleDeleteBed = (floorId: string, room: RoomConfig, bed: BedSlotConfig) => {
    const info = resolveBedSlotInfo(room.roomNumber, bed, room.beds);

    if (info.isOccupied) {
      setBlockedDeleteModal({
        title: `Cannot Delete ${info.statusBadge} ${bed.bedCode}`,
        itemName: `${bed.bedCode}`,
        occupantName: info.displayName,
        occupantId: info.occupant?.id || "",
        reason: `This bed is currently ${info.statusBadge.toLowerCase()} by ${info.displayName}. Please transfer, check out, or revoke hold before removing this bed slot.`,
      });
      return;
    }

    setConfirmDeleteModal({
      title: `Delete Vacant ${bed.bedCode}`,
      message: `Are you sure you want to remove ${bed.bedCode}? This action cannot be undone.`,
      onConfirm: () => {
        const updated = propertyStructure.map((fl) => {
          if (fl.id !== floorId) return fl;
          return {
            ...fl,
            totalBeds: Math.max(0, (fl.totalBeds || 0) - 1),
            rooms: fl.rooms.map((rm) => {
              if (rm.id !== room.id) return rm;
              return {
                ...rm,
                sharingType: Math.max(1, rm.beds.length - 1),
                beds: rm.beds.filter((b) => b.id !== bed.id),
              };
            }),
          };
        });

        updateLayoutStructure(updated);
        triggerToast(`✓ Deleted vacant ${bed.bedCode}`);
        setConfirmDeleteModal(null);
      },
    });
  };

  // Handle Deletion of Room
  const handleDeleteRoom = (floorId: string, room: RoomConfig) => {
    const occupiedBedItem = room.beds
      .map((b) => ({ bed: b, info: resolveBedSlotInfo(room.roomNumber, b, room.beds) }))
      .find((item) => item.info.isOccupied);

    if (occupiedBedItem) {
      setBlockedDeleteModal({
        title: `Cannot Delete Occupied Room ${room.roomNumber}`,
        itemName: `Room ${room.roomNumber}`,
        occupantName: occupiedBedItem.info.displayName,
        occupantId: occupiedBedItem.info.occupant?.id || "",
        reason: `Room ${room.roomNumber} contains active occupied beds (including ${occupiedBedItem.bed.bedCode} held by ${occupiedBedItem.info.displayName}). Please transfer or vacate all occupants first.`,
      });
      return;
    }

    setConfirmDeleteModal({
      title: `Delete Room ${room.roomNumber}`,
      message: `Are you sure you want to remove Room ${room.roomNumber} and all its vacant beds?`,
      onConfirm: () => {
        const updated = propertyStructure.map((fl) => {
          if (fl.id !== floorId) return fl;
          return {
            ...fl,
            rooms: fl.rooms.filter((rm) => rm.id !== room.id),
          };
        });

        updateLayoutStructure(updated);
        triggerToast(`✓ Deleted Room ${room.roomNumber}`);
        setConfirmDeleteModal(null);
      },
    });
  };

  // Handle Deletion of Floor
  const handleDeleteFloor = (floor: FloorConfig) => {
    let occupiedBedInfo: { roomNum: string; bedCode: string; displayName: string; occupantId: string } | null = null;

    for (const rm of floor.rooms) {
      for (const bd of rm.beds) {
        const info = resolveBedSlotInfo(rm.roomNumber, bd, rm.beds);
        if (info.isOccupied) {
          occupiedBedInfo = {
            roomNum: rm.roomNumber,
            bedCode: bd.bedCode,
            displayName: info.displayName,
            occupantId: info.occupant?.id || "",
          };
          break;
        }
      }
      if (occupiedBedInfo) break;
    }

    if (occupiedBedInfo) {
      setBlockedDeleteModal({
        title: `Cannot Delete ${floor.floorName}`,
        itemName: floor.floorName,
        occupantName: occupiedBedInfo.displayName,
        occupantId: occupiedBedInfo.occupantId,
        reason: `${floor.floorName} contains occupied rooms (Room ${occupiedBedInfo.roomNum} held by ${occupiedBedInfo.displayName}). You must vacate all floor beds before deleting the floor structure.`,
      });
      return;
    }

    setConfirmDeleteModal({
      title: `Delete ${floor.floorName}`,
      message: `Are you sure you want to delete ${floor.floorName} and all its vacant rooms?`,
      onConfirm: () => {
        const updated = propertyStructure.filter((fl) => fl.id !== floor.id);
        updateLayoutStructure(updated);
        triggerToast(`✓ Deleted ${floor.floorName}`);
        setConfirmDeleteModal(null);
      },
    });
  };

  // Handle Add Floor Submit
  const handleAddFloorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newFloorId = `fl-${Date.now()}`;
    const newFloor: FloorConfig = {
      id: newFloorId,
      floorName: newFloorName.toUpperCase(),
      floorSubtitle: newFloorSub,
      totalBeds: 0,
      rooms: [],
    };

    const updated = [newFloor, ...propertyStructure];
    updateLayoutStructure(updated);
    setOpenFloorIds([...openFloorIds, newFloorId]);
    triggerToast(`✓ Added ${newFloor.floorName}`);
    setShowAddFloorModal(false);
    setNewFloorName("");
  };

  // Real-time Room Number Conflict Checkers
  const isRoomDuplicateInAddModal = useMemo(() => {
    const clean = newRoomNumber.trim().toLowerCase();
    if (!clean) return false;
    return propertyStructure.some((fl) =>
      (fl.rooms || []).some((r) => r.roomNumber.trim().toLowerCase() === clean)
    );
  }, [newRoomNumber, propertyStructure]);

  const isRoomDuplicateInEditModal = useMemo(() => {
    if (!activeEditRoom) return false;
    const clean = newRoomNumber.trim().toLowerCase();
    if (!clean) return false;
    return propertyStructure.some((fl) =>
      (fl.rooms || []).some(
        (r) =>
          r.id !== activeEditRoom.room.id &&
          r.roomNumber.trim().toLowerCase() === clean
      )
    );
  }, [newRoomNumber, activeEditRoom, propertyStructure]);

  // Handle Add Room Submit (Supports 1 to 26 Beds — Bed A to Bed Z)
  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAddRoomFloorId) return;

    const cleanRoomNum = newRoomNumber.trim();
    if (!cleanRoomNum) {
      triggerToast("⚠️ Please enter a valid room number.");
      return;
    }

    // Uniqueness validation across property
    const isConflict = propertyStructure.some((fl) =>
      (fl.rooms || []).some((r) => r.roomNumber.trim().toLowerCase() === cleanRoomNum.toLowerCase())
    );
    if (isConflict) {
      triggerToast(`⚠️ Room "${cleanRoomNum}" already exists! Please choose a unique room number.`);
      return;
    }

    const bedLetters = Array.from({ length: 26 }, (_, i) => `BED ${String.fromCharCode(65 + i)}`);
    const beds: BedSlotConfig[] = [];
    const count = Math.min(26, Math.max(1, newSharingCapacity));

    for (let i = 0; i < count; i++) {
      beds.push({
        id: `bed-${Date.now()}-${i}`,
        bedCode: bedLetters[i],
        status: "Available",
      });
    }

    const customRent = newRoomCustomRent ? Number(newRoomCustomRent) : undefined;
    const specialTag = newRoomSpecialTag.trim() || undefined;

    const newRoom: RoomConfig = {
      id: `rm-${Date.now()}`,
      roomNumber: cleanRoomNum,
      sharingType: count,
      beds,
      customRentAmount: customRent,
      specialFeatureTag: specialTag,
      roomPhotos: newRoomPhotos.length > 0 ? newRoomPhotos : undefined,
    };

    const updated = propertyStructure.map((fl) => {
      if (fl.id !== activeAddRoomFloorId) return fl;
      return {
        ...fl,
        totalBeds: (fl.totalBeds || 0) + count,
        rooms: [...(fl.rooms || []), newRoom],
      };
    });

    updateLayoutStructure(updated);
    setOpenFloorIds((prev) => Array.from(new Set([...prev, activeAddRoomFloorId])));
    triggerToast(`✓ Added Room ${cleanRoomNum} (${count} Sharing - Bed A to ${bedLetters[count - 1]})`);
    setActiveAddRoomFloorId(null);
    setNewRoomNumber("");
    setNewRoomSpecialTag("");
    setNewRoomCustomRent("");
    setNewRoomPhotos([]);
  };

  // Handle Edit Room Submit (With Smart Capacity Threshold Guard for Occupied Beds)
  const handleEditRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditRoom) return;

    const { floorId, room } = activeEditRoom;
    const cleanRoomNum = newRoomNumber.trim();
    if (!cleanRoomNum) {
      triggerToast("⚠️ Please enter a valid room number.");
      return;
    }

    // Uniqueness validation across other rooms in the property
    const isConflict = propertyStructure.some((fl) =>
      (fl.rooms || []).some(
        (r) =>
          r.id !== room.id &&
          r.roomNumber.trim().toLowerCase() === cleanRoomNum.toLowerCase()
      )
    );
    if (isConflict) {
      triggerToast(`⚠️ Room "${cleanRoomNum}" already exists! Please choose a unique room number.`);
      return;
    }

    const occupiedCount = room.beds.filter(
      (b) => resolveBedSlotInfo(room.roomNumber, b, room.beds).isOccupied
    ).length;

    if (newSharingCapacity < occupiedCount) {
      triggerToast(`⚠️ Cannot reduce capacity below ${occupiedCount} beds! Room has ${occupiedCount} active occupant(s).`);
      return;
    }

    let updatedBeds = [...room.beds];

    if (newSharingCapacity > room.beds.length) {
      const usedIndices = new Set<number>();
      updatedBeds.forEach((b) => {
        const idx = getCanonicalBedIndex(b.bedCode);
        if (idx !== -1) usedIndices.add(idx);
      });
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      // Append new vacant beds
      for (let i = room.beds.length; i < newSharingCapacity; i++) {
        let nextIdx = 0;
        while (usedIndices.has(nextIdx) && nextIdx < alphabet.length) {
          nextIdx++;
        }
        const nextLetter = alphabet[nextIdx] || String(nextIdx + 1);
        usedIndices.add(nextIdx);

        updatedBeds.push({
          id: `bed-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          bedCode: `Bed ${nextLetter}`,
          status: "Available",
          occupant: undefined,
        });
      }
    } else if (newSharingCapacity < room.beds.length) {
      // Safely ensure none of the beds being trimmed are occupied
      const bedsToKeep = updatedBeds.slice(0, newSharingCapacity);
      const bedsToTrim = updatedBeds.slice(newSharingCapacity);
      const occupiedTrimmed = bedsToTrim.find((b) => resolveBedSlotInfo(room.roomNumber, b, room.beds).isOccupied);
      if (occupiedTrimmed) {
        const occInfo = resolveBedSlotInfo(room.roomNumber, occupiedTrimmed, room.beds);
        triggerToast(`⚠️ Cannot trim ${occupiedTrimmed.bedCode} because it is held by ${occInfo.displayName}!`);
        return;
      }
      updatedBeds = bedsToKeep;
    }

    const customRent = newRoomCustomRent ? Number(newRoomCustomRent) : undefined;
    const specialTag = newRoomSpecialTag.trim() || undefined;

    const updatedStructure = propertyStructure.map((fl) => {
      if (fl.id !== floorId) return fl;
      const diff = updatedBeds.length - room.beds.length;
      return {
        ...fl,
        totalBeds: (fl.totalBeds || 0) + diff,
        rooms: (fl.rooms || []).map((rm) => {
          if (rm.id !== room.id) return rm;
          return {
            ...rm,
            roomNumber: cleanRoomNum,
            sharingType: updatedBeds.length,
            beds: updatedBeds,
            customRentAmount: customRent,
            specialFeatureTag: specialTag,
            roomPhotos: newRoomPhotos.length > 0 ? newRoomPhotos : undefined,
          };
        }),
      };
    });

    updateLayoutStructure(updatedStructure);
    triggerToast(`✓ Updated Room ${cleanRoomNum} (${updatedBeds.length} Beds Capacity)`);
    setActiveEditRoom(null);
    setNewRoomNumber("");
    setNewRoomSpecialTag("");
    setNewRoomCustomRent("");
    setNewRoomPhotos([]);
  };

  return (
    <div className="flex min-h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* Left Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        <PropertyHeader
          title="Property Setup"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Setup Content Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1 pb-28">
          {/* Top Breadcrumb & Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <Link href={`/p/${propertyId}/property-map`} className="hover:text-[#c2652a] flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Property Map
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-bold">Property Setup</span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-gray-900 mt-1">
                Property Setup & Layout
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                Configure physical floors, rooms, and sharing bed capacity for {propertySettingsStore.getSettings(propertyId)?.propertyName || (propertyId === "sunshine-pg" ? "Sunshine Heights PG" : "your property")}
              </p>
            </div>

            {/* Top Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSmartGeneratorModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>⚡ 1-Click Smart Layout Generator</span>
                <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-extrabold tracking-wider">
                  Wizard
                </span>
              </button>

              <button
                onClick={() => setShowAddFloorModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-xs font-bold shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Add New Floor
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* Floor Accordion List */}
          {propertyStructure.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-[#d7c2b9] p-8 text-center max-w-xl mx-auto my-10 space-y-5 shadow-sm animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-[#f8ede3] text-[#964407] flex items-center justify-center mx-auto border border-[#d7c2b9]">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-xl text-[#201a17]">
                  Start Building Your Estate Layout
                </h3>
                <p className="text-xs text-[#554339] leading-relaxed max-w-md mx-auto">
                  Build all your floors, rooms, and bed configurations automatically in 5 seconds with our 1-Click Property Map Generator!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSmartGeneratorModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>⚡ 1-Click Smart Layout Generator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddFloorModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Floor Manually</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Color Consistency Status Legend */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-gray-400 uppercase text-[9px] tracking-wider mr-1">Bed Legend:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f7f2ee] text-amber-900 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span> Occupied
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span> Booked / KYC
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-950 border border-orange-400">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> Notice / Vacating
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> Guest Stay
                </span>
              </div>

              {propertyStructure.map((floor) => {
              const isOpen = openFloorIds.includes(floor.id);
              const totalFloorBeds = floor.rooms.reduce(
                (acc, r) => acc + r.beds.length,
                0
              );

              return (
                <div
                  key={floor.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs"
                >
                  {/* Floor Header Bar */}
                  <div className="p-5 bg-gray-50/70 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => toggleFloorAccordion(floor.id)}
                    >
                      <button className="p-1 rounded hover:bg-gray-200 text-gray-500">
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <div>
                        <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                          {floor.floorName}
                          <span className="text-xs font-sans font-normal text-gray-500">
                            — {floor.floorSubtitle}
                          </span>
                        </h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          {floor.rooms.length} ROOMS • {totalFloorBeds} BEDS TOTAL
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => {
                          setActiveAddRoomFloorId(floor.id);
                          setNewRoomNumber("");
                          setNewSharingCapacityStr("3");
                          setNewRoomSpecialTag("");
                          setNewRoomCustomRent("");
                          setNewRoomPhotos([]);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-orange-50 text-[#c2652a] hover:bg-orange-100 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Room
                      </button>

                      <button
                        onClick={() => handleDeleteFloor(floor)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Floor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Floor Body (Rooms & Beds Grid) */}
                  {isOpen && (
                    <div className="p-6 space-y-6 bg-white animate-in fade-in">
                      {floor.rooms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {floor.rooms.map((room) => (
                            <div
                              key={room.id}
                              className="p-5 rounded-2xl border border-gray-200 bg-[#fcfcfc] space-y-4 relative"
                            >
                              {/* Room Top Header */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-serif font-bold text-lg text-gray-900">
                                    Room {room.roomNumber}
                                  </h3>
                                  <p className="text-[10px] text-gray-400 uppercase font-bold">
                                    {room.sharingType} SHARING CAPACITY ({room.beds.length} BEDS)
                                  </p>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddBedDirect(floor.id, room)}
                                    className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-500 hover:text-[#c2652a] transition-colors cursor-pointer"
                                    title="Add Bed to this Room"
                                  >
                                    <Plus className="w-4 h-4 text-[#c2652a]" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveEditRoom({ floorId: floor.id, room });
                                      setNewRoomNumber(room.roomNumber);
                                      setNewSharingCapacityStr(String(room.beds.length));
                                      setNewRoomSpecialTag(room.specialFeatureTag || "");
                                      setNewRoomCustomRent(room.customRentAmount ? String(room.customRentAmount) : "");
                                      setNewRoomPhotos(room.roomPhotos || []);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-[#c2652a] transition-colors cursor-pointer"
                                    title="Edit Room Configuration, Photos & Capacity"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRoom(floor.id, room)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete Room"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Bed Slot Cards Grid (Dynamic Grid Sizing for 1 to 26 Beds) */}
                              {(() => {
                                const bedCount = room.beds.length;
                                const gridCols =
                                  bedCount <= 4
                                    ? "grid-cols-2"
                                    : bedCount <= 8
                                    ? "grid-cols-3"
                                    : bedCount <= 16
                                    ? "grid-cols-4 sm:grid-cols-4"
                                    : "grid-cols-4 sm:grid-cols-5";

                                const sortedBeds = [...(room.beds || [])].sort((a, b) =>
                                  getCanonicalBedIndex(a.bedCode) - getCanonicalBedIndex(b.bedCode)
                                );
                                const roomClaimedOccIds = new Set<string>();

                                return (
                                  <div className={`grid ${gridCols} gap-2 pt-1`}>
                                    {sortedBeds.map((bed) => {
                                      const info = resolveBedSlotInfo(room.roomNumber, bed, room.beds, roomClaimedOccIds);

                                      return (
                                        <div
                                          key={bed.id}
                                          className={`p-2 rounded-xl border flex flex-col justify-between space-y-1 relative transition-all shadow-2xs ${info.badgeStyle}`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-[11px] truncate">
                                              {bed.bedCode}
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleDeleteBed(floor.id, room, bed)
                                              }
                                              className="p-0.5 rounded hover:bg-black/10 text-gray-400 hover:text-red-600 transition-colors"
                                              title="Delete Bed Slot"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>

                                          <div>
                                            {info.effectiveStatus === "Available" ? (
                                              <span className="text-[9px] font-bold text-emerald-700 uppercase">
                                                VACANT
                                              </span>
                                            ) : (
                                              <div>
                                                <span className="block text-[9px] font-bold truncate">
                                                  {info.displayName}
                                                </span>
                                                <span className="text-[8px] font-extrabold uppercase opacity-90">
                                                  {info.statusBadge}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">
                          No rooms added to {floor.floorName} yet. Click "+ Add Room" to configure.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* ⚠️ OCCUPIED DELETION PROTECTION MODAL */}
        {blockedDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3 text-red-600 pb-3 border-b border-gray-100">
                <div className="p-2.5 rounded-full bg-red-100 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    {blockedDeleteModal.title}
                  </h3>
                  <p className="text-xs text-red-500 font-semibold">
                    Protected Deletion Guard
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-700">
                <p className="leading-relaxed">{blockedDeleteModal.reason}</p>

                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 space-y-1">
                  <p className="font-bold text-gray-900">
                    Active Occupant: {blockedDeleteModal.occupantName}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    You must transfer or check out this tenant before removing the physical bed or room structure.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setBlockedDeleteModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-xs"
                >
                  Close
                </button>
                <Link
                  href={`/p/${propertyId}/tenants/${blockedDeleteModal.occupantId}`}
                  className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  View Tenant Profile & Transfer <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM VACANT DELETE MODAL */}
        {confirmDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
              <h3 className="font-serif font-bold text-lg text-gray-900">
                {confirmDeleteModal.title}
              </h3>
              <p className="text-xs text-gray-600">
                {confirmDeleteModal.message}
              </p>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 text-xs">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteModal(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteModal.onConfirm}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD FLOOR MODAL */}
        {showAddFloorModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-serif font-bold text-lg text-gray-900">
                  Add New Floor
                </h3>
                <button
                  onClick={() => setShowAddFloorModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddFloorSubmit} className="space-y-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Floor Name (e.g. FLOOR 06, BASEMENT) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="FLOOR 06"
                    value={newFloorName}
                    onChange={(e) => setNewFloorName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Floor Subtitle / Category
                  </label>
                  <input
                    type="text"
                    value={newFloorSub}
                    onChange={(e) => setNewFloorSub(e.target.value)}
                    placeholder="DELUXE SUITES"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddFloorModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold shadow-md"
                  >
                    Create Floor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD ROOM MODAL (Supports 1 to 26 Beds — Bed A to Bed Z) */}
        {activeAddRoomFloorId && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-serif font-bold text-lg text-gray-900">
                  Add Room to Floor
                </h3>
                <button
                  onClick={() => setActiveAddRoomFloorId(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddRoomSubmit} className="space-y-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Room Number (e.g. 601) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="601"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border font-semibold text-gray-900 focus:ring-1 ${
                      isRoomDuplicateInAddModal
                        ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500"
                        : "border-gray-300 focus:ring-[#c2652a]"
                    }`}
                  />
                  {isRoomDuplicateInAddModal && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Room "{newRoomNumber.trim()}" already exists in this property! Please enter a unique room number.</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Bed Sharing Capacity (1 to 26 Beds — Bed A to Bed Z) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newSharingCapacityStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                      setNewSharingCapacityStr(val);
                    }}
                    onBlur={() => {
                      const num = parseInt(newSharingCapacityStr, 10);
                      if (isNaN(num) || num < 1) {
                        setNewSharingCapacityStr("1");
                      } else if (num > 26) {
                        setNewSharingCapacityStr("26");
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Enter any number of beds up to 26 (Bed A through Bed Z). Bed icons scale dynamically!
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Room Special Feature / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Balcony & Park View, Corner Room"
                    value={newRoomSpecialTag}
                    onChange={(e) => setNewRoomSpecialTag(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Appears as a feature pill badge on top-right of room cards (e.g. "Balcony View 🌿").
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Custom Monthly Rent (₹) (Optional Override)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={`e.g. 16000 (Default ${newSharingCapacity}-sharing: ₹${((settings?.rentalTiers as any)?.[`sharing${newSharingCapacity}`] || 12000).toLocaleString("en-IN")})`}
                    value={newRoomCustomRent}
                    onChange={(e) => setNewRoomCustomRent(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Overrides property default rent (Default is ₹{((settings?.rentalTiers as any)?.[`sharing${newSharingCapacity}`] || 12000).toLocaleString("en-IN")}/mo per bed).
                  </p>
                </div>

                {/* 📷 Max 8 Room Photos Uploader */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Upload Room Photos (Max 8 Images • Auto-Compressed)
                  </label>
                  <div className="space-y-2">
                    {newRoomPhotos.length < 8 && (
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#c2652a] hover:bg-orange-50/50 cursor-pointer transition-all text-center">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#c2652a]">
                          <span>📷 Upload Room Photo</span>
                          <span className="text-[10px] bg-orange-100 px-2 py-0.5 rounded-full">
                            {newRoomPhotos.length}/8
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleRoomImageUpload}
                          className="hidden"
                          disabled={isCompressingImage}
                        />
                      </label>
                    )}

                    {isCompressingImage && (
                      <p className="text-[10px] font-bold text-[#c2652a] animate-pulse text-center">
                        ⚡ Auto-compressing room photos without quality loss...
                      </p>
                    )}

                    {newRoomPhotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {newRoomPhotos.map((photo, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
                            <img src={photo} alt={`Room photo ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewRoomPhotos(newRoomPhotos.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 text-[9px]"
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setActiveAddRoomFloorId(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRoomDuplicateInAddModal || !newRoomNumber.trim()}
                    className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-md cursor-pointer transition-all"
                  >
                    Create Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ✏️ EDIT ROOM MODAL (With Smart Capacity Threshold Guard for Occupied Beds) */}
        {activeEditRoom && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                    <Edit className="w-4 h-4 text-[#c2652a]" /> Edit Room {activeEditRoom.room.roomNumber} Configuration
                  </h3>
                  <p className="text-[10px] text-gray-400 font-semibold">
                    UPDATE ROOM ATTRIBUTES & CAPACITY
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveEditRoom(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditRoomSubmit} className="space-y-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Room Number (e.g. 501) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border font-semibold text-gray-900 focus:ring-1 ${
                      isRoomDuplicateInEditModal
                        ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500"
                        : "border-gray-300 focus:ring-[#c2652a]"
                    }`}
                  />
                  {isRoomDuplicateInEditModal && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Room "{newRoomNumber.trim()}" already exists in this property! Please enter a unique room number.</span>
                    </p>
                  )}
                </div>

                <div>
                  {(() => {
                    const occupiedCount = activeEditRoom.room.beds.filter(
                      (b) => resolveBedSlotInfo(activeEditRoom.room.roomNumber, b, activeEditRoom.room.beds).isOccupied
                    ).length;

                    return (
                      <>
                        <label className="block font-bold text-gray-700 mb-1">
                          Bed Sharing Capacity (Min {occupiedCount} Bed{occupiedCount > 1 ? "s" : ""} — Active Occupants) *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={newSharingCapacityStr}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                            setNewSharingCapacityStr(val);
                          }}
                          onBlur={() => {
                            const num = parseInt(newSharingCapacityStr, 10);
                            if (isNaN(num) || num < Math.max(1, occupiedCount)) {
                              setNewSharingCapacityStr(String(Math.max(1, occupiedCount)));
                            } else if (num > 26) {
                              setNewSharingCapacityStr("26");
                            }
                          }}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        />
                        {occupiedCount > 0 ? (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 font-semibold mt-1.5 space-y-0.5">
                            <span className="font-extrabold block">🛡️ Smart Capacity Threshold Guard Active:</span>
                            <span>
                              Room contains {occupiedCount} active tenant(s). You can increase capacity to add new vacant beds, but capacity cannot drop below {occupiedCount} to protect active tenants.
                            </span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 mt-1">
                            All beds are vacant. You can adjust capacity freely from 1 to 26 beds.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Room Special Feature / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Balcony & Park View, Corner Room"
                    value={newRoomSpecialTag}
                    onChange={(e) => setNewRoomSpecialTag(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Custom Monthly Rent (₹) (Optional Override)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={`e.g. 16000 (Default ${newSharingCapacity}-sharing: ₹${((settings?.rentalTiers as any)?.[`sharing${newSharingCapacity}`] || 12000).toLocaleString("en-IN")})`}
                    value={newRoomCustomRent}
                    onChange={(e) => setNewRoomCustomRent(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Overrides property default rent (Default is ₹{((settings?.rentalTiers as any)?.[`sharing${newSharingCapacity}`] || 12000).toLocaleString("en-IN")}/mo per bed).
                  </p>
                </div>

                {/* 📷 Room Photos Uploader */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Room Photos (Max 8 Images • Auto-Compressed)
                  </label>
                  <div className="space-y-2">
                    {newRoomPhotos.length < 8 && (
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#c2652a] hover:bg-orange-50/50 cursor-pointer transition-all text-center">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#c2652a]">
                          <span>📷 Upload / Add Room Photo</span>
                          <span className="text-[10px] bg-orange-100 px-2 py-0.5 rounded-full">
                            {newRoomPhotos.length}/8
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleRoomImageUpload}
                          className="hidden"
                          disabled={isCompressingImage}
                        />
                      </label>
                    )}

                    {isCompressingImage && (
                      <p className="text-[10px] font-bold text-[#c2652a] animate-pulse text-center">
                        ⚡ Auto-compressing room photos without quality loss...
                      </p>
                    )}

                    {newRoomPhotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {newRoomPhotos.map((photo, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
                            <img src={photo} alt={`Room photo ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewRoomPhotos(newRoomPhotos.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 text-[9px]"
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setActiveEditRoom(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRoomDuplicateInEditModal || !newRoomNumber.trim()}
                    className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-md cursor-pointer transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ⚡ 1-Click Smart Property Map Generator Modal */}
        <SmartPropertyGeneratorModal
          propertyId={propertyId}
          isOpen={showSmartGeneratorModal}
          onClose={() => setShowSmartGeneratorModal(false)}
          onSuccess={() => {
            triggerToast("✨ Property layout generated successfully! All floors, rooms, and beds are live.");
          }}
        />

        {/* ⚡ FastTrack 1-Click Migration Modal (Kept for optional direct migration) */}
        <FastTrackImportModal
          propertyId={propertyId}
          isOpen={showFastTrackModal}
          onClose={() => setShowFastTrackModal(false)}
          onSuccess={() => {
            triggerToast("🎉 FastTrack Migration Complete! Building layout and tenants are now live.");
          }}
        />

        {/* 💾 Responsive Sticky Bottom Save Bar (Visible across all devices and screen sizes when changes are pending) */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-8 max-w-4xl mx-auto z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-[#1c140e]/95 backdrop-blur-md text-white px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl shadow-2xl border border-amber-500/40 ring-1 ring-black/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto text-left">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>Unsaved Layout Changes</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-semibold">
                      {unsavedChangeCount} {unsavedChangeCount === 1 ? "change" : "changes"}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-300">
                    Changes are in draft mode. Click Save to persist to live building map.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  type="button"
                  onClick={handleDiscardStructureChanges}
                  disabled={isSavingChanges}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllStructureChanges}
                  disabled={isSavingChanges}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-[#c2652a] to-[#d97736] hover:from-[#b05822] hover:to-[#c2652a] text-white font-bold text-xs shadow-lg shadow-orange-950/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingChanges ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Structure Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
