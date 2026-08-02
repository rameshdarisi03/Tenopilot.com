"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, Occupant } from "@/constants/mockOccupants";
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

interface BedSlotConfig {
  id: string;
  bedCode: string;
  status: "Available" | "Occupied" | "Vacating" | "Booked" | "Guest";
  occupant?: Occupant;
}

interface RoomConfig {
  id: string;
  roomNumber: string;
  sharingType: number; // 1, 2, 3, or 4
  beds: BedSlotConfig[];
}

interface FloorConfig {
  id: string;
  floorName: string;
  floorSubtitle: string;
  rooms: RoomConfig[];
}

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
  const [openFloorIds, setOpenFloorIds] = useState<string[]>(["fl-02", "fl-01"]);

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

  // Add Room Modal State
  const [activeAddRoomFloorId, setActiveAddRoomFloorId] = useState<string | null>(null);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newSharingCapacity, setNewSharingCapacity] = useState<number>(3);

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

  // Property Layout State
  const [propertyStructure, setPropertyStructure] = useState<FloorConfig[]>(() => {
    const occMap = MOCK_OCCUPANTS_200;
    return [
      {
        id: "fl-03",
        floorName: "FLOOR 03",
        floorSubtitle: "EXECUTIVE SUITES",
        rooms: [
          {
            id: "rm-301",
            roomNumber: "301",
            sharingType: 4,
            beds: [
              { id: "b-301a", bedCode: "BED A", status: "Occupied", occupant: occMap[0] },
              { id: "b-301b", bedCode: "BED B", status: "Available" },
              { id: "b-301c", bedCode: "BED C", status: "Booked", occupant: occMap[26] },
              { id: "b-301d", bedCode: "BED D", status: "Guest", occupant: occMap[5] },
            ],
          },
          {
            id: "rm-302",
            roomNumber: "302",
            sharingType: 3,
            beds: [
              { id: "b-302a", bedCode: "BED A", status: "Vacating", occupant: occMap[11] },
              { id: "b-302b", bedCode: "BED B", status: "Occupied", occupant: occMap[1] },
              { id: "b-302c", bedCode: "BED C", status: "Available" },
            ],
          },
        ],
      },
      {
        id: "fl-02",
        floorName: "FLOOR 02",
        floorSubtitle: "PREMIUM SUITES",
        rooms: [
          {
            id: "rm-201",
            roomNumber: "201",
            sharingType: 4,
            beds: [
              { id: "b-201a", bedCode: "BED A", status: "Occupied", occupant: occMap[4] },
              { id: "b-201b", bedCode: "BED B", status: "Available" },
              { id: "b-201c", bedCode: "BED C", status: "Booked", occupant: occMap[27] },
              { id: "b-201d", bedCode: "BED D", status: "Occupied", occupant: occMap[6] },
            ],
          },
          {
            id: "rm-202",
            roomNumber: "202",
            sharingType: 2,
            beds: [
              { id: "b-202a", bedCode: "BED A", status: "Vacating", occupant: occMap[12] },
              { id: "b-202b", bedCode: "BED B", status: "Occupied", occupant: occMap[7] },
            ],
          },
        ],
      },
      {
        id: "fl-01",
        floorName: "FLOOR 01",
        floorSubtitle: "DELUXE SUITES",
        rooms: [
          {
            id: "rm-101",
            roomNumber: "101",
            sharingType: 3,
            beds: [
              { id: "b-101a", bedCode: "BED A", status: "Occupied", occupant: occMap[9] },
              { id: "b-101b", bedCode: "BED B", status: "Occupied", occupant: occMap[10] },
              { id: "b-101c", bedCode: "BED C", status: "Available" },
            ],
          },
        ],
      },
    ];
  });

  // Handle Deletion of Bed Slot
  const handleDeleteBed = (floorId: string, roomId: string, bed: BedSlotConfig) => {
    // 1. Check if bed is occupied
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

    // 2. If Vacant, prompt confirm
    setConfirmDeleteModal({
      title: `Delete Vacant ${bed.bedCode}`,
      message: `Are you sure you want to remove ${bed.bedCode}? This action cannot be undone.`,
      onConfirm: () => {
        setPropertyStructure((prev) =>
          prev.map((fl) => {
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
          })
        );
        triggerToast(`✓ Deleted vacant ${bed.bedCode}`);
        setConfirmDeleteModal(null);
      },
    });
  };

  // Handle Deletion of Room
  const handleDeleteRoom = (floorId: string, room: RoomConfig) => {
    // Check if any bed in room is occupied
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
        setPropertyStructure((prev) =>
          prev.map((fl) => {
            if (fl.id !== floorId) return fl;
            return {
              ...fl,
              rooms: fl.rooms.filter((rm) => rm.id !== room.id),
            };
          })
        );
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
        setPropertyStructure((prev) => prev.filter((fl) => fl.id !== floor.id));
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
      rooms: [],
    };

    setPropertyStructure([newFloor, ...propertyStructure]);
    setOpenFloorIds([...openFloorIds, newFloorId]);
    triggerToast(`✓ Added ${newFloor.floorName}`);
    setShowAddFloorModal(false);
    setNewFloorName("");
  };

  // Handle Add Room Submit
  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAddRoomFloorId) return;

    const bedLetters = ["BED A", "BED B", "BED C", "BED D"];
    const beds: BedSlotConfig[] = [];
    for (let i = 0; i < newSharingCapacity; i++) {
      beds.push({
        id: `bed-${Date.now()}-${i}`,
        bedCode: bedLetters[i] || `BED ${i + 1}`,
        status: "Available",
      });
    }

    const newRoom: RoomConfig = {
      id: `rm-${Date.now()}`,
      roomNumber: newRoomNumber,
      sharingType: newSharingCapacity,
      beds,
    };

    setPropertyStructure((prev) =>
      prev.map((fl) => {
        if (fl.id !== activeAddRoomFloorId) return fl;
        return {
          ...fl,
          rooms: [...fl.rooms, newRoom],
        };
      })
    );

    triggerToast(`✓ Added Room ${newRoomNumber} (${newSharingCapacity} Sharing)`);
    setActiveAddRoomFloorId(null);
    setNewRoomNumber("");
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
                                    {room.sharingType} SHARING CAPACITY
                                  </p>
                                </div>

                                <button
                                  onClick={() => handleDeleteRoom(floor.id, room)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete Room"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Bed Slot Cards Grid */}
                              <div className="grid grid-cols-2 gap-2.5 pt-1">
                                {room.beds.map((bed) => {
                                  const isOccupied =
                                    bed.status !== "Available" && bed.occupant;

                                  return (
                                    <div
                                      key={bed.id}
                                      className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 relative transition-all ${
                                        isOccupied
                                          ? "bg-[#f7f2ee] border-amber-200"
                                          : "bg-emerald-50 border-emerald-200"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-gray-900">
                                          {bed.bedCode}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleDeleteBed(floor.id, room.id, bed)
                                          }
                                          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                                          title="Delete Bed Slot"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      <div>
                                        {isOccupied ? (
                                          <div>
                                            <span className="block text-[10px] font-bold text-amber-900 truncate">
                                              {bed.occupant?.name}
                                            </span>
                                            <span className="text-[9px] font-bold text-amber-700 uppercase">
                                              {bed.status}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                            VACANT
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
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

        {/* ⚠️ OCCUPIED DELETION PROTECTION MODAL (User Directive Requirement) */}
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
                    Floor Name (e.g. FLOOR 04, GROUND FLOOR) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="FLOOR 04"
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

        {/* ADD ROOM MODAL */}
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
                    Room Number (e.g. 401) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="401"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Bed Sharing Capacity *
                  </label>
                  <select
                    value={newSharingCapacity}
                    onChange={(e) => setNewSharingCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  >
                    <option value={1}>1 Sharing (Single Bed)</option>
                    <option value={2}>2 Sharing (Double Bed)</option>
                    <option value={3}>3 Sharing (Triple Bed)</option>
                    <option value={4}>4 Sharing (Four Beds)</option>
                  </select>
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
      </div>
    </div>
  );
}
