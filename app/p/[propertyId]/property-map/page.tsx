"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, Occupant } from "@/constants/mockOccupants";
import {
  ChevronLeft,
  Settings,
  User,
  Phone,
  MessageSquare,
  X,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  ChevronDown,
  Info,
} from "lucide-react";

interface BedSlot {
  id: string;
  bedCode: string;
  status: "Available" | "Occupied" | "Vacating" | "Booked" | "Guest";
  occupant?: Occupant;
  vacatingDate?: string;
  guestCheckoutDate?: string;
}

interface RoomData {
  id: string;
  roomNumber: string;
  sharingType: string;
  totalBeds: number;
  beds: BedSlot[];
}

interface FloorData {
  id: string;
  floorName: string;
  floorSubtitle: string;
  totalBeds: number;
  rooms: RoomData[];
}

export default function PropertyMapPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters state
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL FLOORS");
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL ROOMS");
  const [activeFilterStatus, setActiveFilterStatus] = useState<
    "ALL" | "Available" | "Occupied" | "Vacating" | "Booked" | "Guest"
  >("ALL");

  // Selected Bed Slot state for Quick-View Drawer
  const [activeBedSlot, setActiveBedSlot] = useState<{
    bed: BedSlot;
    roomNumber: string;
    floorName: string;
  } | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate Complete Property Grid dynamically linked to all 200 Mock Occupants (200 Beds Total across 6 Floors)
  const propertyGrid: FloorData[] = useMemo(() => {
    const floors: FloorData[] = [];
    const floorConfigs = [
      { name: "FLOOR 05", sub: "PENTHOUSE & TERRACE", roomStart: 501, count: 4 },
      { name: "FLOOR 04", sub: "EXECUTIVE SUITES", roomStart: 401, count: 4 },
      { name: "FLOOR 03", sub: "EXECUTIVE SUITES", roomStart: 301, count: 4 },
      { name: "FLOOR 02", sub: "PREMIUM SUITES", roomStart: 201, count: 4 },
      { name: "FLOOR 01", sub: "DELUXE SUITES", roomStart: 101, count: 4 },
      { name: "GROUND FLOOR", sub: "STANDARD SUITES", roomStart: 1, count: 4 },
    ];

    let occIndex = 0;

    floorConfigs.forEach((fConfig, fIdx) => {
      const rooms: RoomData[] = [];
      let floorBedCount = 0;

      for (let r = 0; r < fConfig.count; r++) {
        const roomNumStr =
          fConfig.roomStart < 10
            ? `00${fConfig.roomStart + r}`
            : `${fConfig.roomStart + r}`;
        const sharing = (r % 3 === 0 ? 4 : r % 2 === 0 ? 3 : 2);
        const beds: BedSlot[] = [];

        const bedLetters = ["BED A", "BED B", "BED C", "BED D"];

        for (let b = 0; b < sharing; b++) {
          floorBedCount++;
          const currentOcc = MOCK_OCCUPANTS_200[occIndex % MOCK_OCCUPANTS_200.length];
          occIndex++;

          let status: "Available" | "Occupied" | "Vacating" | "Booked" | "Guest" = "Occupied";
          let vacatingDate: string | undefined = undefined;
          let guestCheckoutDate: string | undefined = undefined;

          if (currentOcc.lifecycleStatus === "Notice") {
            status = "Vacating";
            vacatingDate = currentOcc.vacatingDate || "15 Aug";
          } else if (currentOcc.lifecycleStatus === "Booked") {
            status = "Booked";
          } else if (currentOcc.stayType === "Guest") {
            status = "Guest";
            guestCheckoutDate = "12 Aug";
          } else if (occIndex % 7 === 0) {
            status = "Available";
          } else {
            status = "Occupied";
          }

          beds.push({
            id: `bed-${fIdx}-${r}-${b}`,
            bedCode: bedLetters[b],
            status,
            occupant: status === "Available" ? undefined : currentOcc,
            vacatingDate,
            guestCheckoutDate,
          });
        }

        rooms.push({
          id: `room-${fIdx}-${r}`,
          roomNumber: roomNumStr,
          sharingType: `${sharing} SHARING`,
          totalBeds: sharing,
          beds,
        });
      }

      floors.push({
        id: `floor-${fIdx}`,
        floorName: fConfig.name,
        floorSubtitle: fConfig.sub,
        totalBeds: floorBedCount,
        rooms,
      });
    });

    return floors;
  }, []);

  // Compute exact bed counts for Donut Ring Chart & Filter Badges across all 200 beds
  const bedCounts = useMemo(() => {
    let available = 0;
    let occupied = 0;
    let vacating = 0;
    let booked = 0;
    let guest = 0;

    propertyGrid.forEach((floor) => {
      floor.rooms.forEach((room) => {
        room.beds.forEach((bed) => {
          if (bed.status === "Available") available++;
          if (bed.status === "Occupied") occupied++;
          if (bed.status === "Vacating") vacating++;
          if (bed.status === "Booked") booked++;
          if (bed.status === "Guest") guest++;
        });
      });
    });

    const total = available + occupied + vacating + booked + guest;

    return { total, available, occupied, vacating, booked, guest };
  }, [propertyGrid]);

  // Exact SVG Donut Ring Arc Calculations (No grey gaps - 100% split between color arcs)
  const ringArcs = useMemo(() => {
    const total = bedCounts.total || 1;
    const circumference = 238.76; // 2 * PI * 38

    const pOccupied = (bedCounts.occupied / total) * circumference;
    const pAvailable = (bedCounts.available / total) * circumference;
    const pVacating = (bedCounts.vacating / total) * circumference;
    const pBooked = (bedCounts.booked / total) * circumference;
    const pGuest = (bedCounts.guest / total) * circumference;

    let offset = 0;
    const oOccupied = offset;
    offset -= pOccupied;

    const oAvailable = offset;
    offset -= pAvailable;

    const oVacating = offset;
    offset -= pVacating;

    const oBooked = offset;
    offset -= pBooked;

    const oGuest = offset;

    return {
      circumference,
      occupied: { dash: `${pOccupied} ${circumference - pOccupied}`, offset: oOccupied },
      available: { dash: `${pAvailable} ${circumference - pAvailable}`, offset: oAvailable },
      vacating: { dash: `${pVacating} ${circumference - pVacating}`, offset: oVacating },
      booked: { dash: `${pBooked} ${circumference - pBooked}`, offset: oBooked },
      guest: { dash: `${pGuest} ${circumference - pGuest}`, offset: oGuest },
    };
  }, [bedCounts]);

  // Filtered Floors & Rooms according to Floor, Room, and Status Pill selections
  const filteredGrid = useMemo(() => {
    return propertyGrid
      .filter((fl) => {
        if (selectedFloor !== "ALL FLOORS" && fl.floorName !== selectedFloor)
          return false;
        return true;
      })
      .map((fl) => ({
        ...fl,
        rooms: fl.rooms
          .filter((rm) => {
            if (selectedRoom !== "ALL ROOMS" && rm.roomNumber !== selectedRoom)
              return false;
            return true;
          })
          .map((rm) => ({
            ...rm,
            beds: rm.beds.filter((bd) => {
              if (activeFilterStatus === "ALL") return true;
              return bd.status === activeFilterStatus;
            }),
          }))
          .filter((rm) => rm.beds.length > 0),
      }))
      .filter((fl) => fl.rooms.length > 0);
  }, [propertyGrid, selectedFloor, selectedRoom, activeFilterStatus]);

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
          title="Property Map"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Property Map Content Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1 pb-28">
          {/* Top Breadcrumb & Setup Button */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <span>Dashboard</span>
                <span>›</span>
                <span>Properties</span>
                <span>›</span>
                <span className="text-gray-800 font-bold">Sunshine Heights PG</span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-gray-900 mt-1">
                Sunshine Heights PG
              </h1>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 font-medium">
                📍 122 Luxury Estates, Marigold District, West Sahara
              </p>
            </div>

            <button
              onClick={() => triggerToast("Opened Property Setup Settings")}
              className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-xs font-bold shadow-md flex items-center gap-2 active:scale-95 transition-all"
            >
              <Settings className="w-4 h-4" /> Property Setup
            </button>
          </div>

          {/* Toast Callout */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* Compact Floor Navigation & Native Donut Ring Header Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left Controls & Status Filters */}
            <div className="space-y-4 flex-1 w-full">
              <div>
                <h2 className="font-serif font-bold text-xl text-gray-900">
                  Floor Navigation
                </h2>
                <p className="text-xs text-gray-500">
                  Real-time bed-level tracking across all {bedCounts.total} property beds
                </p>
              </div>

              {/* Floor & Room Dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="text-xs font-bold py-2 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:ring-1 focus:ring-[#c2652a] cursor-pointer"
                  >
                    <option value="ALL FLOORS">ALL FLOORS</option>
                    <option value="FLOOR 05">FLOOR 05</option>
                    <option value="FLOOR 04">FLOOR 04</option>
                    <option value="FLOOR 03">FLOOR 03</option>
                    <option value="FLOOR 02">FLOOR 02</option>
                    <option value="FLOOR 01">FLOOR 01</option>
                    <option value="GROUND FLOOR">GROUND FLOOR</option>
                  </select>
                </div>

                <div className="relative">
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="text-xs font-bold py-2 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:ring-1 focus:ring-[#c2652a] cursor-pointer"
                  >
                    <option value="ALL ROOMS">ALL ROOMS</option>
                    <option value="101">ROOM 101</option>
                    <option value="102">ROOM 102</option>
                    <option value="201">ROOM 201</option>
                    <option value="202">ROOM 202</option>
                    <option value="301">ROOM 301</option>
                    <option value="302">ROOM 302</option>
                    <option value="401">ROOM 401</option>
                    <option value="501">ROOM 501</option>
                  </select>
                </div>
              </div>

              {/* Color-Coded Bed Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold pt-1">
                <button
                  onClick={() => setActiveFilterStatus("ALL")}
                  className={`px-4 py-1.5 rounded-full transition-all ${
                    activeFilterStatus === "ALL"
                      ? "bg-[#c2652a] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ALL ({bedCounts.total})
                </button>

                <button
                  onClick={() => setActiveFilterStatus("Available")}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                    activeFilterStatus === "Available"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> AVAILABLE ({bedCounts.available})
                </button>

                <button
                  onClick={() => setActiveFilterStatus("Occupied")}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                    activeFilterStatus === "Occupied"
                      ? "bg-amber-900 text-white shadow-xs"
                      : "bg-[#f7f2ee] text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-700"></span> OCCUPIED ({bedCounts.occupied})
                </button>

                <button
                  onClick={() => setActiveFilterStatus("Vacating")}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                    activeFilterStatus === "Vacating"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> VACATING ({bedCounts.vacating})
                </button>

                <button
                  onClick={() => setActiveFilterStatus("Booked")}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                    activeFilterStatus === "Booked"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> BOOKED ({bedCounts.booked})
                </button>

                <button
                  onClick={() => setActiveFilterStatus("Guest")}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                    activeFilterStatus === "Guest"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> GUESTS ({bedCounts.guest})
                </button>
              </div>
            </div>

            {/* Right: Native SVG Donut Ring Chart (Fixed 100% split between color-coded arcs with ZERO grey filler gaps!) */}
            <div className="relative flex items-center justify-center shrink-0 w-36 h-36">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                {/* 1. Occupied Arc (Terracotta/Warm Amber) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#c2652a"
                  strokeWidth="11"
                  strokeDasharray={ringArcs.occupied.dash}
                  strokeDashoffset={ringArcs.occupied.offset}
                  fill="transparent"
                />
                {/* 2. Available Arc (Emerald Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#10b981"
                  strokeWidth="11"
                  strokeDasharray={ringArcs.available.dash}
                  strokeDashoffset={ringArcs.available.offset}
                  fill="transparent"
                />
                {/* 3. Vacating Arc (Orange) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f97316"
                  strokeWidth="11"
                  strokeDasharray={ringArcs.vacating.dash}
                  strokeDashoffset={ringArcs.vacating.offset}
                  fill="transparent"
                />
                {/* 4. Booked Arc (Blue) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#3b82f6"
                  strokeWidth="11"
                  strokeDasharray={ringArcs.booked.dash}
                  strokeDashoffset={ringArcs.booked.offset}
                  fill="transparent"
                />
                {/* 5. Guests Arc (Purple) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#a855f7"
                  strokeWidth="11"
                  strokeDasharray={ringArcs.guest.dash}
                  strokeDashoffset={ringArcs.guest.offset}
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-serif text-2xl font-bold text-gray-900 leading-none">
                  {bedCounts.total}
                </span>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">
                  BEDS TOTAL
                </span>
              </div>
            </div>
          </div>

          {/* Floors & Rooms Grid Section */}
          <div className="space-y-8">
            {filteredGrid.length > 0 ? (
              filteredGrid.map((floor) => (
                <div key={floor.id} className="space-y-4">
                  {/* Floor Header Bar */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-800">
                        {floor.floorName}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">
                        — {floor.floorSubtitle}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {floor.totalBeds} BEDS TOTAL ({floor.floorName.toLowerCase()})
                    </span>
                  </div>

                  {/* Rooms Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {floor.rooms.map((room) => (
                      <div
                        key={room.id}
                        className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4"
                      >
                        {/* Room Title Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-serif text-xl font-bold text-gray-900">
                              Room {room.roomNumber}
                            </h3>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">
                              TOTAL BEDS: {room.totalBeds}
                            </span>
                          </div>
                          <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            {room.sharingType}
                          </span>
                        </div>

                        {/* Bed Slots Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {room.beds.map((bed) => {
                            let badgeStyle = "";
                            let icon = <User className="w-4 h-4" />;
                            let statusLabel: string = bed.status;

                            if (bed.status === "Available") {
                              badgeStyle =
                                "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
                              statusLabel = "Available";
                            } else if (bed.status === "Occupied") {
                              badgeStyle =
                                "bg-[#f7f2ee] text-amber-900 border-amber-200 hover:bg-amber-100";
                              statusLabel = "Occupied";
                            } else if (bed.status === "Vacating") {
                              badgeStyle =
                                "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100";
                              statusLabel = `Vacating ${bed.vacatingDate || "15 Aug"}`;
                            } else if (bed.status === "Booked") {
                              badgeStyle =
                                "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100";
                              statusLabel = "Booked";
                            } else if (bed.status === "Guest") {
                              badgeStyle =
                                "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100";
                              statusLabel = `Guest (Until ${
                                bed.guestCheckoutDate || "10 Aug"
                              })`;
                            }

                            return (
                              <button
                                key={bed.id}
                                onClick={() =>
                                  setActiveBedSlot({
                                    bed,
                                    roomNumber: room.roomNumber,
                                    floorName: floor.floorName,
                                  })
                                }
                                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer active:scale-95 ${badgeStyle}`}
                              >
                                <div className="p-1.5 rounded-full bg-white/70 shadow-2xs">
                                  {icon}
                                </div>
                                <span className="font-bold text-xs">
                                  {bed.bedCode}
                                </span>
                                <span className="text-[10px] font-semibold opacity-90 leading-tight">
                                  {bed.occupant ? bed.occupant.name : statusLabel}
                                </span>
                                {(bed.status === "Vacating" || bed.status === "Guest") && (
                                  <span className="text-[9px] font-bold underline opacity-80">
                                    {statusLabel}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
                No matching beds or rooms found for the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Quick-View Slide-Over Drawer */}
        {activeBedSlot && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in"
            onClick={() => setActiveBedSlot(null)}
          >
            <div
              className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-xl text-gray-900">
                    {activeBedSlot.floorName} • Room {activeBedSlot.roomNumber} ({activeBedSlot.bed.bedCode})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Bed Details & Occupant Overview
                  </p>
                </div>
                <button
                  onClick={() => setActiveBedSlot(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeBedSlot.bed.occupant ? (
                <div className="space-y-6 text-xs">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                    <img
                      src={activeBedSlot.bed.occupant.avatar}
                      alt={activeBedSlot.bed.occupant.name}
                      className="w-14 h-14 rounded-full border border-gray-300 object-cover"
                    />
                    <div>
                      <h4 className="font-serif font-bold text-lg text-gray-900">
                        {activeBedSlot.bed.occupant.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            activeBedSlot.bed.occupant.stayType === "Guest"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {activeBedSlot.bed.occupant.stayType === "Guest" ? "🟣 GUEST" : "🟢 TENANT"}
                        </span>
                        <span className="text-gray-500 font-medium">
                          {activeBedSlot.bed.occupant.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-2xl border border-gray-200 bg-white">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Rent Status</span>
                      <span className="font-bold text-green-600">
                        {activeBedSlot.bed.occupant.paymentStatus === "Paid" ? "PAID 🟢" : "PENDING 🟡"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Monthly Rent</span>
                      <span className="font-mono font-bold text-[#c2652a]">
                        ₹{activeBedSlot.bed.occupant.rentAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Last Paid Date</span>
                      <span className="font-semibold text-gray-900">
                        {activeBedSlot.bed.occupant.lastPaidDate}
                      </span>
                    </div>
                    {activeBedSlot.bed.vacatingDate && (
                      <div className="flex justify-between border-t border-gray-100 pt-2 text-orange-600 font-bold">
                        <span>Notice Vacating Date</span>
                        <span>{activeBedSlot.bed.vacatingDate}</span>
                      </div>
                    )}
                    {activeBedSlot.bed.guestCheckoutDate && (
                      <div className="flex justify-between border-t border-gray-100 pt-2 text-purple-700 font-bold">
                        <span>Guest Checkout Date</span>
                        <span>{activeBedSlot.bed.guestCheckoutDate}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        triggerToast(`Calling ${activeBedSlot.bed.occupant?.phone}`)
                      }
                      className="flex-1 py-2.5 rounded-xl bg-orange-50 text-[#c2652a] font-bold flex items-center justify-center gap-2 hover:bg-orange-100"
                    >
                      <Phone className="w-4 h-4" /> Call
                    </button>
                    <button
                      onClick={() =>
                        triggerToast(`WhatsApp sent to ${activeBedSlot.bed.occupant?.phone}`)
                      }
                      className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center gap-2 hover:bg-emerald-100"
                    >
                      <MessageSquare className="w-4 h-4" /> WhatsApp
                    </button>
                  </div>

                  <Link
                    href={`/p/${propertyId}/tenants/${activeBedSlot.bed.occupant.id}`}
                    className="w-full py-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all block text-center"
                  >
                    View Full Profile <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-6 text-xs text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg text-gray-900">
                      Bed is Vacant & Ready
                    </h4>
                    <p className="text-gray-500 mt-1">
                      No occupant is assigned to {activeBedSlot.floorName} Room {activeBedSlot.roomNumber} ({activeBedSlot.bed.bedCode})
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      triggerToast(
                        `Initiated Tenant Onboarding for Room ${activeBedSlot.roomNumber} ${activeBedSlot.bed.bedCode}`
                      )
                    }
                    className="w-full py-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" /> + Onboard Tenant / Guest to Bed
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
