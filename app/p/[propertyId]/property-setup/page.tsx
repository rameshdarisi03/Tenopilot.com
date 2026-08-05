"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, Occupant } from "@/constants/mockOccupants";
import {
  propertyStore,
  FloorConfig,
  RoomConfig,
  BedSlotConfig,
} from "@/constants/propertyLayoutStore";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Edit,
  Building2,
  Bed,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function PropertySetupPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Accordion open/close state for floors
  const [openFloorIds, setOpenFloorIds] = useState<string[]>([
    "fl-05",
    "fl-04",
    "fl-03",
    "fl-02",
    "fl-01",
    "fl-00",
  ]);

  // Reactive Property Layout Structure State
  const [propertyStructure, setPropertyStructure] = useState<FloorConfig[]>(() =>
    propertyStore.getStructure()
  );

  // Subscribe to propertyStore updates
  useEffect(() => {
    const unsubscribe = propertyStore.subscribe(() => {
      setPropertyStructure(propertyStore.getStructure());
    });
    return unsubscribe;
  }, []);

  // Update global store whenever structure mutates
  const updateLayoutStructure = (newStructure: FloorConfig[]) => {
    setPropertyStructure(newStructure);
    propertyStore.updateStructure(newStructure);
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
  const [newSharingCapacity, setNewSharingCapacity] = useState<number>(3);
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

  // Handle Deletion of Bed Slot
  const handleDeleteBed = (floorId: string, roomId: string, bed: BedSlotConfig) => {
    if (bed.status !== "Available" && bed.occupant) {
      setBlockedDeleteModal({
        title: `Cannot Delete Occupied ${bed.bedCode}`,
        itemName: `${bed.bedCode}`,
        occupantName: bed.occupant.name,
        occupantId: bed.occupant.id,
        reason: `This bed is currently ${bed.status.toLowerCase()} by ${bed.occupant.name}. Please transfer or check out the occupant before removing this bed slot.`,
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
            rooms: fl.rooms.map((rm) => {
              if (rm.id !== roomId) return rm;
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
    const occupiedBed = room.beds.find((b) => b.status !== "Available" && b.occupant);

    if (occupiedBed && occupiedBed.occupant) {
      setBlockedDeleteModal({
        title: `Cannot Delete Occupied Room ${room.roomNumber}`,
        itemName: `Room ${room.roomNumber}`,
        occupantName: occupiedBed.occupant.name,
        occupantId: occupiedBed.occupant.id,
        reason: `Room ${room.roomNumber} contains active occupied beds (including ${occupiedBed.bedCode} held by ${occupiedBed.occupant.name}). Please transfer or vacate all occupants first.`,
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
    let occupiedOccupant: Occupant | undefined = undefined;
    let roomNum = "";

    floor.rooms.forEach((rm) => {
      rm.beds.forEach((bd) => {
        if (bd.status !== "Available" && bd.occupant) {
          occupiedOccupant = bd.occupant;
          roomNum = rm.roomNumber;
        }
      });
    });

    if (occupiedOccupant) {
      setBlockedDeleteModal({
        title: `Cannot Delete ${floor.floorName}`,
        itemName: floor.floorName,
        occupantName: (occupiedOccupant as Occupant).name,
        occupantId: (occupiedOccupant as Occupant).id,
        reason: `${floor.floorName} contains occupied rooms (Room ${roomNum} held by ${(occupiedOccupant as Occupant).name}). You must vacate all floor beds before deleting the floor structure.`,
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

  // Handle Add Room Submit (Supports 1 to 26 Beds — Bed A to Bed Z)
  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAddRoomFloorId) return;

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
      roomNumber: newRoomNumber,
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
        totalBeds: fl.totalBeds + count,
        rooms: [...fl.rooms, newRoom],
      };
    });

    updateLayoutStructure(updated);
    triggerToast(`✓ Added Room ${newRoomNumber} (${count} Sharing - Bed A to ${bedLetters[count - 1]})`);
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
    const occupiedCount = room.beds.filter((b) => b.status !== "Available" && b.occupant).length;

    if (newSharingCapacity < occupiedCount) {
      triggerToast(`⚠️ Cannot reduce capacity below ${occupiedCount} beds! Room has ${occupiedCount} active occupant(s).`);
      return;
    }

    const bedLetters = Array.from({ length: 26 }, (_, i) => `BED ${String.fromCharCode(65 + i)}`);
    let updatedBeds = [...room.beds];

    if (newSharingCapacity > room.beds.length) {
      // Append new vacant beds
      for (let i = room.beds.length; i < newSharingCapacity; i++) {
        updatedBeds.push({
          id: `bed-${Date.now()}-${i}`,
          bedCode: bedLetters[i] || `BED ${i + 1}`,
          status: "Available",
        });
      }
    } else if (newSharingCapacity < room.beds.length) {
      // Safely trim vacant beds from the end
      updatedBeds = updatedBeds.slice(0, newSharingCapacity);
    }

    const customRent = newRoomCustomRent ? Number(newRoomCustomRent) : undefined;
    const specialTag = newRoomSpecialTag.trim() || undefined;

    const updatedStructure = propertyStructure.map((fl) => {
      if (fl.id !== floorId) return fl;
      const diff = updatedBeds.length - room.beds.length;
      return {
        ...fl,
        totalBeds: fl.totalBeds + diff,
        rooms: fl.rooms.map((rm) => {
          if (rm.id !== room.id) return rm;
          return {
            ...rm,
            roomNumber: newRoomNumber,
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
    triggerToast(`✓ Updated Room ${newRoomNumber} (${updatedBeds.length} Beds Capacity)`);
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
                Configure physical floors, rooms, and sharing bed capacity for Sunshine Heights PG
              </p>
            </div>

            <button
              onClick={() => setShowAddFloorModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-xs font-bold shadow-md flex items-center gap-2 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> + Add New Floor
            </button>
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
          <div className="space-y-6">
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
                        onClick={() => setActiveAddRoomFloorId(floor.id)}
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
                                    onClick={() => {
                                      setActiveEditRoom({ floorId: floor.id, room });
                                      setNewRoomNumber(room.roomNumber);
                                      setNewSharingCapacity(room.sharingType);
                                      setNewRoomSpecialTag(room.specialFeatureTag || "");
                                      setNewRoomCustomRent(room.customRentAmount ? String(room.customRentAmount) : "");
                                      setNewRoomPhotos(room.roomPhotos || []);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-[#c2652a] transition-colors"
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

                                return (
                                  <div className={`grid ${gridCols} gap-2 pt-1`}>
                                    {room.beds.map((bed) => {
                                      const isOccupied =
                                        bed.status !== "Available" && bed.occupant;

                                      return (
                                        <div
                                          key={bed.id}
                                          className={`p-2 rounded-xl border flex flex-col justify-between space-y-1 relative transition-all ${
                                            isOccupied
                                              ? "bg-[#f7f2ee] border-amber-200"
                                              : "bg-emerald-50 border-emerald-200"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-[11px] text-gray-900 truncate">
                                              {bed.bedCode}
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleDeleteBed(floor.id, room.id, bed)
                                              }
                                              className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                                              title="Delete Bed Slot"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>

                                          <div>
                                            {isOccupied ? (
                                              <div>
                                                <span className="block text-[9px] font-bold text-amber-900 truncate">
                                                  {bed.occupant?.name}
                                                </span>
                                                <span className="text-[8px] font-bold text-amber-700 uppercase">
                                                  {bed.status}
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-[9px] font-bold text-emerald-700 uppercase">
                                                VACANT
                                              </span>
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Bed Sharing Capacity (1 to 26 Beds — Bed A to Bed Z) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    required
                    value={newSharingCapacity}
                    onChange={(e) =>
                      setNewSharingCapacity(
                        Math.min(26, Math.max(1, Number(e.target.value)))
                      )
                    }
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
                    type="number"
                    placeholder="e.g. 16000 (Leave blank for default sharing rate)"
                    value={newRoomCustomRent}
                    onChange={(e) => setNewRoomCustomRent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Overrides property default rent for premium rooms (e.g. Rooms with Balcony/AC).
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
                    className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold shadow-md"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  {(() => {
                    const occupiedCount = activeEditRoom.room.beds.filter(
                      (b) => b.status !== "Available" && b.occupant
                    ).length;

                    return (
                      <>
                        <label className="block font-bold text-gray-700 mb-1">
                          Bed Sharing Capacity (Min {occupiedCount} Bed{occupiedCount > 1 ? "s" : ""} — Active Occupants) *
                        </label>
                        <input
                          type="number"
                          min={occupiedCount}
                          max={26}
                          required
                          value={newSharingCapacity}
                          onChange={(e) =>
                            setNewSharingCapacity(
                              Math.min(26, Math.max(occupiedCount, Number(e.target.value)))
                            )
                          }
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
                    type="number"
                    placeholder="e.g. 16000 (Leave blank for default sharing rate)"
                    value={newRoomCustomRent}
                    onChange={(e) => setNewRoomCustomRent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
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
                    className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
