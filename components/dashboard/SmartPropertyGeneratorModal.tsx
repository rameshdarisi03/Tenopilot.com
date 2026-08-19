"use client";

import { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  Building2,
  Bed,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Layers,
  Check,
} from "lucide-react";
import { FloorConfig, RoomConfig, BedSlotConfig, propertyStore } from "@/constants/propertyLayoutStore";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";

interface SmartPropertyGeneratorModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export type NamingFormatType = "SERIES_100" | "BLOCK_PREFIX" | "FLOOR_DASH" | "ALPHA_NUM";

export function SmartPropertyGeneratorModal({
  propertyId,
  isOpen,
  onClose,
  onSuccess,
}: SmartPropertyGeneratorModalProps) {
  // Questionnaire States
  const [includeGroundFloor, setIncludeGroundFloor] = useState<boolean>(false);
  const [namingFormat, setNamingFormat] = useState<NamingFormatType>("SERIES_100");
  const [blockPrefix, setBlockPrefix] = useState<string>("A");

  // Numeric states as string | number for smooth typing and zero leading-zero / backspace reset bugs
  const [numFloorsStr, setNumFloorsStr] = useState<string>("3");
  const [roomsPerFloorStr, setRoomsPerFloorStr] = useState<string>("4");
  const [defaultSharingStr, setDefaultSharingStr] = useState<string>("3");

  const [isGenerating, setIsGenerating] = useState(false);

  // Safe numerical parsers
  const numFloors = Math.min(12, Math.max(1, parseInt(numFloorsStr, 10) || 1));
  const roomsPerFloor = Math.min(30, Math.max(1, parseInt(roomsPerFloorStr, 10) || 1));
  const defaultSharing = Math.min(10, Math.max(1, parseInt(defaultSharingStr, 10) || 1));

  // Helper to handle text/slider input without leading zero or snapping bugs
  const handleNumericInput = (
    rawVal: string,
    setter: (val: string) => void,
    maxLimit: number = 99
  ) => {
    if (rawVal === "") {
      setter("");
      return;
    }
    // Remove non-digits and strip leading zero if followed by a number
    const cleaned = rawVal.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (cleaned === "") {
      setter("");
      return;
    }
    const valNum = parseInt(cleaned, 10);
    if (!isNaN(valNum)) {
      setter(String(Math.min(maxLimit, valNum)));
    }
  };

  // Helper to format floor name
  const getFloorName = (floorIndex: number, isGround: boolean) => {
    if (isGround) return "Ground Floor";
    const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
    return `${ordinals[floorIndex - 1] || `${floorIndex}th`} Floor`;
  };

  // Helper to format room number
  const formatRoomNumber = (
    floorNum: number,
    roomIdx: number,
    isGround: boolean,
    format: NamingFormatType,
    prefix: string
  ) => {
    const roomSeq = roomIdx + 1;
    const padSeq = roomSeq < 10 ? `0${roomSeq}` : `${roomSeq}`;

    if (isGround) {
      switch (format) {
        case "SERIES_100":
          return `G${padSeq}`;
        case "BLOCK_PREFIX":
          return `${prefix || "A"}-G${padSeq}`;
        case "FLOOR_DASH":
          return `G-${padSeq}`;
        case "ALPHA_NUM":
          return `G${roomSeq}`;
      }
    }

    switch (format) {
      case "SERIES_100":
        return `${floorNum}${padSeq}`;
      case "BLOCK_PREFIX":
        return `${prefix || "A"}${floorNum}${padSeq}`;
      case "FLOOR_DASH":
        return `F${floorNum}-${padSeq}`;
      case "ALPHA_NUM": {
        const floorLetter = String.fromCharCode(64 + floorNum); // A, B, C...
        return `${floorLetter}${roomSeq}`;
      }
    }
  };

  // Compute live layout preview
  const generatedStructure = useMemo((): FloorConfig[] => {
    const floors: FloorConfig[] = [];
    let startIdx = includeGroundFloor ? 0 : 1;
    let endIdx = includeGroundFloor ? numFloors - 1 : numFloors;

    let floorCounter = 1;
    for (let fl = startIdx; fl <= endIdx; fl++) {
      const isGround = includeGroundFloor && fl === 0;
      const floorName = getFloorName(isGround ? 0 : floorCounter, isGround);
      const rooms: RoomConfig[] = [];

      for (let r = 0; r < roomsPerFloor; r++) {
        const rmNumber = formatRoomNumber(
          isGround ? 0 : floorCounter,
          r,
          isGround,
          namingFormat,
          blockPrefix.trim().toUpperCase()
        );

        const beds: BedSlotConfig[] = [];
        for (let b = 0; b < defaultSharing; b++) {
          const bedLetter = String.fromCharCode(65 + b);
          beds.push({
            id: `bed_${rmNumber.toLowerCase()}_${bedLetter.toLowerCase()}_${b}`,
            bedCode: `Bed ${bedLetter}`,
            status: "Available",
          });
        }

        rooms.push({
          id: `room_${rmNumber.toLowerCase()}_${r}`,
          roomNumber: rmNumber,
          sharingType: defaultSharing,
          beds,
          specialFeatureTag: defaultSharing === 1 ? "Private Single" : `${defaultSharing}-Sharing Suite`,
        });
      }

      floors.push({
        id: `fl_${Date.now()}_${floorCounter}`,
        floorName: floorName.toUpperCase(),
        floorSubtitle: isGround ? "RECEPTION & RESIDENT SUITES" : "EXECUTIVE RESIDENT SUITES",
        totalBeds: rooms.reduce((acc, r) => acc + r.beds.length, 0),
        rooms,
      });

      floorCounter++;
    }

    return floors;
  }, [includeGroundFloor, namingFormat, blockPrefix, numFloors, roomsPerFloor, defaultSharing]);

  const totalCalculatedRooms = generatedStructure.reduce((acc, f) => acc + f.rooms.length, 0);
  const totalCalculatedBeds = generatedStructure.reduce((acc, f) => acc + f.totalBeds, 0);

  // Handle final 1-click layout generator submit
  const handleGenerateLayout = () => {
    setIsGenerating(true);
    try {
      propertyStore.updateStructure(generatedStructure, propertyId);
      fireCelebrationConfetti();
      onSuccess?.();
      onClose();
    } catch (e: any) {
      alert(`Could not generate layout: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-white to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c2652a] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-gray-900 text-base sm:text-lg">
                  1-Click Property Map Generator
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                  Smart Wizard
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Answer 4 quick questions to auto-create all floors, rooms, and beds in 5 seconds
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* QUESTION 1: GROUND FLOOR ROOMS */}
          <div className="p-4.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <span>1. Do you have residential rooms on the Ground Floor?</span>
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Select <span className="font-semibold text-gray-700">"No"</span> if Ground Floor is only for Reception, Dining, or Parking.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIncludeGroundFloor(false)}
                className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  !includeGroundFloor
                    ? "bg-white border-[#c2652a] text-[#c2652a] ring-2 ring-orange-500/10 shadow-xs"
                    : "bg-white/60 border-gray-200 text-gray-600 hover:bg-white"
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">No (Starts at 1st Floor)</div>
                  <div className="text-[10px] text-gray-400 font-normal">Ground is parking/reception</div>
                </div>
                {!includeGroundFloor && <CheckCircle2 className="w-4 h-4 text-[#c2652a] shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setIncludeGroundFloor(true)}
                className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  includeGroundFloor
                    ? "bg-white border-emerald-600 text-emerald-700 ring-2 ring-emerald-500/10 shadow-xs"
                    : "bg-white/60 border-gray-200 text-gray-600 hover:bg-white"
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">Yes (Include Ground Rooms)</div>
                  <div className="text-[10px] text-gray-400 font-normal">G01, G02, G03...</div>
                </div>
                {includeGroundFloor && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            </div>
          </div>

          {/* QUESTION 2: ROOM NUMBERING & NAMING STYLE */}
          <div className="p-4.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
            <div>
              <label className="font-bold text-sm text-gray-900">
                2. Room Numbering & Naming Style
              </label>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Pick the format that matches your building's door signs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: Standard 100 series */}
              <button
                type="button"
                onClick={() => setNamingFormat("SERIES_100")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  namingFormat === "SERIES_100"
                    ? "bg-white border-[#c2652a] ring-2 ring-orange-500/10 shadow-xs"
                    : "bg-white/60 border-gray-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Standard Floor Series</span>
                  {namingFormat === "SERIES_100" && <Check className="w-4 h-4 text-[#c2652a]" />}
                </div>
                <div className="text-[11px] font-mono text-[#c2652a] font-bold mt-1">
                  101, 102, 201, 202...
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Most common in 80%+ of PGs</div>
              </button>

              {/* Option B: Block / Wing prefix */}
              <button
                type="button"
                onClick={() => setNamingFormat("BLOCK_PREFIX")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  namingFormat === "BLOCK_PREFIX"
                    ? "bg-white border-purple-600 ring-2 ring-purple-500/10 shadow-xs"
                    : "bg-white/60 border-gray-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Block / Wing Prefix</span>
                  {namingFormat === "BLOCK_PREFIX" && <Check className="w-4 h-4 text-purple-600" />}
                </div>
                <div className="text-[11px] font-mono text-purple-700 font-bold mt-1">
                  {blockPrefix || "A"}101, {blockPrefix || "A"}102, {blockPrefix || "A"}201...
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">For multi-block or wings</div>
              </button>

              {/* Option C: Floor Dash */}
              <button
                type="button"
                onClick={() => setNamingFormat("FLOOR_DASH")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  namingFormat === "FLOOR_DASH"
                    ? "bg-white border-blue-600 ring-2 ring-blue-500/10 shadow-xs"
                    : "bg-white/60 border-gray-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Floor-Dash Number</span>
                  {namingFormat === "FLOOR_DASH" && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="text-[11px] font-mono text-blue-700 font-bold mt-1">
                  F1-01, F1-02, F2-01...
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Unambiguous format</div>
              </button>

              {/* Option D: Short Alpha-Numeric */}
              <button
                type="button"
                onClick={() => setNamingFormat("ALPHA_NUM")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  namingFormat === "ALPHA_NUM"
                    ? "bg-white border-emerald-600 ring-2 ring-emerald-500/10 shadow-xs"
                    : "bg-white/60 border-gray-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Alphabetical Floor Code</span>
                  {namingFormat === "ALPHA_NUM" && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="text-[11px] font-mono text-emerald-700 font-bold mt-1">
                  A1, A2, B1, B2...
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Compact for villas & homes</div>
              </button>
            </div>

            {/* If Block Prefix selected, show block letter input */}
            {namingFormat === "BLOCK_PREFIX" && (
              <div className="pt-2 flex items-center gap-2 animate-in fade-in">
                <span className="text-xs font-bold text-gray-700">Block / Wing Letter:</span>
                <input
                  type="text"
                  maxLength={4}
                  value={blockPrefix}
                  onChange={(e) => setBlockPrefix(e.target.value.toUpperCase())}
                  placeholder="A"
                  className="w-16 px-2.5 py-1.5 rounded-lg border border-gray-300 font-mono font-bold text-center text-xs uppercase focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-[11px] text-gray-400">(e.g. A, B, W1)</span>
              </div>
            )}
          </div>

          {/* QUESTION 3 & 4 & 5: BUILDING DIMENSIONS (SLIDER + CLEAN TEXT EDITABLE) */}
          <div className="p-4.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-5">
            <div>
              <label className="font-bold text-sm text-gray-900">
                3. Building Dimensions & Capacity
              </label>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Adjust sliders or type directly in the boxes (no leading zeros).
              </p>
            </div>

            {/* A. Number of Floors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#c2652a]" />
                  Total Number of Floors
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={numFloorsStr}
                    onChange={(e) => handleNumericInput(e.target.value, setNumFloorsStr, 12)}
                    onBlur={() => {
                      if (!numFloorsStr || parseInt(numFloorsStr, 10) < 1) setNumFloorsStr("1");
                    }}
                    className="w-16 px-2.5 py-1 rounded-lg border border-gray-300 font-mono font-bold text-center text-gray-900 text-xs focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] outline-hidden bg-white"
                  />
                  <span className="text-gray-500 text-xs">Floors</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={numFloors}
                onChange={(e) => setNumFloorsStr(e.target.value)}
                className="w-full accent-[#c2652a] cursor-pointer"
              />
            </div>

            {/* B. Rooms per Floor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  Rooms per Floor
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={roomsPerFloorStr}
                    onChange={(e) => handleNumericInput(e.target.value, setRoomsPerFloorStr, 25)}
                    onBlur={() => {
                      if (!roomsPerFloorStr || parseInt(roomsPerFloorStr, 10) < 1) setRoomsPerFloorStr("1");
                    }}
                    className="w-16 px-2.5 py-1 rounded-lg border border-gray-300 font-mono font-bold text-center text-gray-900 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-hidden bg-white"
                  />
                  <span className="text-gray-500 text-xs">Rooms / Fl</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={roomsPerFloor}
                onChange={(e) => setRoomsPerFloorStr(e.target.value)}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>

            {/* C. Default Sharing Capacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-emerald-600" />
                  Default Sharing Capacity
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={defaultSharingStr}
                    onChange={(e) => handleNumericInput(e.target.value, setDefaultSharingStr, 10)}
                    onBlur={() => {
                      if (!defaultSharingStr || parseInt(defaultSharingStr, 10) < 1) setDefaultSharingStr("1");
                    }}
                    className="w-16 px-2.5 py-1 rounded-lg border border-gray-300 font-mono font-bold text-center text-gray-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden bg-white"
                  />
                  <span className="text-gray-500 text-xs">Sharing</span>
                </div>
              </div>

              {/* Quick Pills for Sharing */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[1, 2, 3, 4].map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setDefaultSharingStr(String(cap))}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                      defaultSharing === cap
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {cap === 1 ? "1-Single" : `${cap}-Sharing`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LIVE ESTATE STRUCTURE SUMMARY */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-purple-500/10 border border-orange-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200/60 pb-2">
              <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#c2652a]" />
                Generated Layout Summary
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded-md bg-white text-gray-800 border border-gray-200">
                  {generatedStructure.length} Floors
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white text-gray-800 border border-gray-200">
                  {totalCalculatedRooms} Rooms
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#c2652a] text-white">
                  {totalCalculatedBeds} Beds Total
                </span>
              </div>
            </div>

            {/* Scrollable Mini Roster Preview */}
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {generatedStructure.map((fl) => (
                <div key={fl.id} className="p-2 bg-white rounded-xl border border-orange-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-gray-800">
                    {fl.floorName} ({fl.rooms.length} Rooms):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {fl.rooms.map((rm) => (
                      <span
                        key={rm.id}
                        className="px-2 py-0.5 rounded-md bg-orange-50 text-[#c2652a] border border-orange-200 font-semibold"
                      >
                        {rm.roomNumber} ({rm.beds.length}B)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REASSURANCE GUARANTEE BANNER */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold">Full Manual Flexibility Guarantee:</span> Don't worry about being 100% exact! This builds your instant base layout. You can freely rename rooms, delete or add custom rooms, change individual sharing, and attach photos manually anytime.
            </p>
          </div>
        </div>

        {/* FOOTER ACTION BAR */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isGenerating || totalCalculatedRooms === 0}
            onClick={handleGenerateLayout}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Generate Property Map ({totalCalculatedRooms} Rooms • {totalCalculatedBeds} Beds)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
