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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FloorConfig, RoomConfig, BedSlotConfig, propertyStore } from "@/constants/propertyLayoutStore";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";

interface SmartPropertyGeneratorModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Intelligent Room Numbering Generator based on User's Sample Input
 * Supports:
 * - Standard 3-digit: "101" -> 101, 102... / 201, 202...
 * - 4-digit: "1001" -> 1001, 1002... / 2001, 2002...
 * - Block prefix: "A101" -> A101, A102... / A201, A202...
 * - Block dash: "A-101" -> A-101, A-102... / A-201, A-202...
 * - Floor dash: "F1-01" -> F1-01, F1-02... / F2-01, F2-02...
 * - Alphabetical: "A1" -> A1, A2... / B1, B2... / C1, C2...
 * - Single/sequential: "1" -> 1, 2... / 11, 12...
 */
function generateRoomNumberFromSample(
  sample: string,
  floorIndex: number, // 1-based (1, 2, 3...) or 0 for Ground Floor
  roomIndex: number, // 0-based (0, 1, 2...)
  isGround: boolean
): string {
  const clean = (sample || "101").trim();
  const roomSeq = roomIndex + 1;
  const pad2 = roomSeq < 10 ? `0${roomSeq}` : `${roomSeq}`;
  const pad3 = roomSeq < 10 ? `00${roomSeq}` : roomSeq < 100 ? `0${roomSeq}` : `${roomSeq}`;

  // Ground Floor special handling
  if (isGround) {
    if (/^[A-Za-z]+-\d+$/.test(clean)) {
      const prefix = clean.split("-")[0].toUpperCase();
      return `${prefix}-G${pad2}`;
    }
    if (/^[A-Za-z]+\d+$/.test(clean) && !/^[A-Za-z]\d{1,2}$/.test(clean)) {
      const prefixMatch = clean.match(/^([A-Za-z]+)/);
      const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : "A";
      return `${prefix}G${pad2}`;
    }
    if (/^F\d+-\d+$/i.test(clean)) {
      return `G-${pad2}`;
    }
    if (/^[A-Za-z]\d{1,2}$/.test(clean)) {
      return `G${roomSeq}`;
    }
    return `G${pad2}`;
  }

  // 1. Floor-Dash Format (e.g. F1-01, F1-1, FL1-01)
  const floorDashMatch = clean.match(/^(F|FL)(\d+)-(\d+)$/i);
  if (floorDashMatch) {
    const prefix = floorDashMatch[1].toUpperCase();
    const isPadded = floorDashMatch[3].length >= 2;
    return `${prefix}${floorIndex}-${isPadded ? pad2 : roomSeq}`;
  }

  // 2. Alphabetical Floor Code (e.g. A1, A2 / B1, B2 or A-1, B-1)
  const alphaMatch = clean.match(/^([A-Za-z])(-?)(\d{1,2})$/);
  if (alphaMatch) {
    const startLetterCode = alphaMatch[1].toUpperCase().charCodeAt(0);
    const targetLetterCode = startLetterCode + (floorIndex - 1);
    const floorLetter = String.fromCharCode(Math.min(90, Math.max(65, targetLetterCode)));
    const sep = alphaMatch[2]; // "" or "-"
    return `${floorLetter}${sep}${roomSeq}`;
  }

  // 3. Block Prefix with Dash (e.g. A-101, B-101, WING-101)
  const blockDashMatch = clean.match(/^([A-Za-z0-9]+)-(\d+)$/);
  if (blockDashMatch) {
    const block = blockDashMatch[1].toUpperCase();
    const numPart = blockDashMatch[2];
    const is4Digit = numPart.length >= 4;
    return is4Digit
      ? `${block}-${floorIndex}${pad3}`
      : `${block}-${floorIndex}${pad2}`;
  }

  // 4. Block Prefix attached to number (e.g. A101, B201, W101)
  const blockAlphaMatch = clean.match(/^([A-Za-z]+)(\d{2,4})$/);
  if (blockAlphaMatch) {
    const block = blockAlphaMatch[1].toUpperCase();
    const numPart = blockAlphaMatch[2];
    const is4Digit = numPart.length >= 4;
    return is4Digit
      ? `${block}${floorIndex}${pad3}`
      : `${block}${floorIndex}${pad2}`;
  }

  // 5. 4-Digit Standard Series (e.g. 1001, 1002 / 2001, 2002)
  if (/^\d{4}$/.test(clean)) {
    return `${floorIndex}${pad3}`;
  }

  // 6. Standard 3-Digit Floor Series (e.g. 101, 102 / 201, 202) - DEFAULT
  if (/^\d{3}$/.test(clean)) {
    return `${floorIndex}${pad2}`;
  }

  // 7. Simple 1 or 2 Digit (e.g. 1, 2, 3...)
  if (/^\d{1,2}$/.test(clean)) {
    return `${floorIndex}${pad2}`;
  }

  // Fallback: prefix + floor + pad2
  return `${clean.replace(/\d+$/, "")}${floorIndex}${pad2}`;
}

export function SmartPropertyGeneratorModal({
  propertyId,
  isOpen,
  onClose,
  onSuccess,
}: SmartPropertyGeneratorModalProps) {
  // Questionnaire States
  const [includeGroundFloor, setIncludeGroundFloor] = useState<boolean>(false);
  const [sampleRoomNumber, setSampleRoomNumber] = useState<string>("101");

  // Numeric states as string for smooth typing and zero leading-zero / backspace reset bugs
  const [numFloorsStr, setNumFloorsStr] = useState<string>("3");
  const [roomsPerFloorStr, setRoomsPerFloorStr] = useState<string>("4");
  const [defaultSharingStr, setDefaultSharingStr] = useState<string>("3");

  // Collapsible preview accordion (default collapsed for ultra-compact view)
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Safe numerical parsers (Floors up to 20)
  const numFloors = Math.min(20, Math.max(1, parseInt(numFloorsStr, 10) || 1));
  const roomsPerFloor = Math.min(25, Math.max(1, parseInt(roomsPerFloorStr, 10) || 1));
  const defaultSharing = Math.min(10, Math.max(1, parseInt(defaultSharingStr, 10) || 1));

  // Helper to handle text/slider input without leading zero or snapping bugs
  const handleNumericInput = (
    rawVal: string,
    setter: (val: string) => void,
    maxLimit: number = 20
  ) => {
    if (rawVal === "") {
      setter("");
      return;
    }
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
    const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th", "20th"];
    return `${ordinals[floorIndex - 1] || `${floorIndex}th`} Floor`;
  };

  // Compute live layout preview
  const generatedStructure = useMemo((): FloorConfig[] => {
    const floors: FloorConfig[] = [];
    const totalCount = includeGroundFloor ? numFloors : numFloors;

    let floorCounter = 1;
    for (let fl = 0; fl < totalCount; fl++) {
      const isGround = includeGroundFloor && fl === 0;
      const currentFloorNum = isGround ? 0 : floorCounter;
      const floorName = getFloorName(currentFloorNum, isGround);
      const rooms: RoomConfig[] = [];

      for (let r = 0; r < roomsPerFloor; r++) {
        const rmNumber = generateRoomNumberFromSample(
          sampleRoomNumber,
          currentFloorNum,
          r,
          isGround
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
        id: `fl_${Date.now()}_${fl + 1}`,
        floorName: floorName.toUpperCase(),
        floorSubtitle: isGround ? "RECEPTION & RESIDENT SUITES" : "EXECUTIVE RESIDENT SUITES",
        totalBeds: rooms.reduce((acc, r) => acc + r.beds.length, 0),
        rooms,
      });

      if (!isGround) {
        floorCounter++;
      }
    }

    return floors;
  }, [includeGroundFloor, sampleRoomNumber, numFloors, roomsPerFloor, defaultSharing]);

  const totalCalculatedRooms = generatedStructure.reduce((acc, f) => acc + f.rooms.length, 0);
  const totalCalculatedBeds = generatedStructure.reduce((acc, f) => acc + f.totalBeds, 0);

  // Quick 1-line sample preview string
  const quickPreviewSummary = useMemo(() => {
    return generatedStructure.slice(0, 3).map((f) => {
      const firstRoom = f.rooms[0]?.roomNumber || "";
      const lastRoom = f.rooms[f.rooms.length - 1]?.roomNumber || "";
      return `${f.floorName} (${firstRoom} to ${lastRoom})`;
    }).join(" • ");
  }, [generatedStructure]);

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
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* COMPACT HEADER */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/80 via-white to-purple-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c2652a] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-gray-900 text-sm sm:text-base">
                  1-Click Property Map Generator
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[9px] font-extrabold uppercase">
                  Fast Wizard
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Setup all floors, rooms, and beds in 5 seconds
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COMPACT BODY */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* QUESTION 1: GROUND FLOOR (SINGLE-LINE ROW) */}
          <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="font-bold text-gray-900 text-xs block">
                1. Rooms on Ground Floor?
              </span>
              <span className="text-[10px] text-gray-500">
                Choose No if Ground floor is only reception/parking
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIncludeGroundFloor(false)}
                className={`py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  !includeGroundFloor
                    ? "bg-white border-[#c2652a] text-[#c2652a] shadow-xs ring-1 ring-[#c2652a]/20"
                    : "bg-white/60 border-gray-200 text-gray-600 hover:bg-white"
                }`}
              >
                ⚪ No (Starts 1st Fl)
              </button>
              <button
                type="button"
                onClick={() => setIncludeGroundFloor(true)}
                className={`py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  includeGroundFloor
                    ? "bg-white border-emerald-600 text-emerald-700 shadow-xs ring-1 ring-emerald-600/20"
                    : "bg-white/60 border-gray-200 text-gray-600 hover:bg-white"
                }`}
              >
                🟢 Yes (G01, G02...)
              </button>
            </div>
          </div>

          {/* QUESTION 2: SMART SAMPLE ROOM NUMBER INPUT */}
          <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-200/80 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-gray-900 text-xs block">
                  2. Sample First Room Number on 1st Floor
                </span>
                <span className="text-[10px] text-gray-500">
                  Type your 1st room (e.g. 101 or A-101) & we auto-number all floors
                </span>
              </div>

              {/* Sample Input Box */}
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="text"
                  value={sampleRoomNumber}
                  onChange={(e) => setSampleRoomNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 101"
                  className="w-24 px-3 py-1.5 rounded-xl border border-gray-300 font-mono font-bold text-center text-xs text-gray-900 bg-white focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] outline-hidden shadow-2xs"
                />
              </div>
            </div>

            {/* Quick Example Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-gray-400 font-medium mr-1">Quick presets:</span>
              {["101", "A101", "A-101", "F1-01", "A1"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSampleRoomNumber(preset)}
                  className={`px-2 py-0.5 rounded-lg border font-mono text-[10px] font-bold transition-all cursor-pointer ${
                    sampleRoomNumber === preset
                      ? "bg-[#c2652a] text-white border-[#c2652a]"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* QUESTION 3: BUILDING DIMENSIONS (SLIDERS WITH TEXT FIELDS BESIDE THEM) */}
          <div className="p-3.5 rounded-2xl bg-gray-50/90 border border-gray-200/80 space-y-3">
            <span className="font-bold text-gray-900 text-xs block">
              3. Building Dimensions & Capacity
            </span>

            {/* 1. Total Floors (Limit up to 20) */}
            <div className="flex items-center gap-3">
              <div className="w-28 shrink-0 flex items-center gap-1.5 font-bold text-gray-700 text-xs">
                <Layers className="w-3.5 h-3.5 text-[#c2652a]" />
                <span>Total Floors</span>
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={numFloors}
                  onChange={(e) => setNumFloorsStr(e.target.value)}
                  className="w-full accent-[#c2652a] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                />
              </div>
              <div className="w-20 shrink-0 flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={numFloorsStr}
                  onChange={(e) => handleNumericInput(e.target.value, setNumFloorsStr, 20)}
                  onBlur={() => {
                    if (!numFloorsStr || parseInt(numFloorsStr, 10) < 1) setNumFloorsStr("1");
                  }}
                  className="w-11 px-1.5 py-1 rounded-lg border border-gray-300 font-mono font-bold text-center text-xs text-gray-900 bg-white"
                />
                <span className="text-[10px] text-gray-500">Fl</span>
              </div>
            </div>

            {/* 2. Rooms per Floor */}
            <div className="flex items-center gap-3">
              <div className="w-28 shrink-0 flex items-center gap-1.5 font-bold text-gray-700 text-xs">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Rooms / Floor</span>
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={roomsPerFloor}
                  onChange={(e) => setRoomsPerFloorStr(e.target.value)}
                  className="w-full accent-purple-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                />
              </div>
              <div className="w-20 shrink-0 flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={roomsPerFloorStr}
                  onChange={(e) => handleNumericInput(e.target.value, setRoomsPerFloorStr, 25)}
                  onBlur={() => {
                    if (!roomsPerFloorStr || parseInt(roomsPerFloorStr, 10) < 1) setRoomsPerFloorStr("1");
                  }}
                  className="w-11 px-1.5 py-1 rounded-lg border border-gray-300 font-mono font-bold text-center text-xs text-gray-900 bg-white"
                />
                <span className="text-[10px] text-gray-500">Rms</span>
              </div>
            </div>

            {/* 3. Default Sharing per Room */}
            <div className="flex items-center gap-3">
              <div className="w-28 shrink-0 flex items-center gap-1.5 font-bold text-gray-700 text-xs">
                <Bed className="w-3.5 h-3.5 text-emerald-600" />
                <span>Beds / Room</span>
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={defaultSharing}
                  onChange={(e) => setDefaultSharingStr(e.target.value)}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                />
              </div>
              <div className="w-20 shrink-0 flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={defaultSharingStr}
                  onChange={(e) => handleNumericInput(e.target.value, setDefaultSharingStr, 10)}
                  onBlur={() => {
                    if (!defaultSharingStr || parseInt(defaultSharingStr, 10) < 1) setDefaultSharingStr("1");
                  }}
                  className="w-11 px-1.5 py-1 rounded-lg border border-gray-300 font-mono font-bold text-center text-xs text-gray-900 bg-white"
                />
                <span className="text-[10px] text-gray-500">Beds</span>
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE LIVE GENERATED PREVIEW */}
          <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-purple-50/40 overflow-hidden">
            {/* Clickable Summary Accordion Header */}
            <button
              type="button"
              onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
              className="w-full p-3 flex items-center justify-between gap-2 text-left hover:bg-orange-100/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#c2652a]" />
                <span className="font-bold text-gray-900 text-xs">
                  Layout: {generatedStructure.length} Floors • {totalCalculatedRooms} Rooms • {totalCalculatedBeds} Beds
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-[#c2652a]">
                <span>{isPreviewExpanded ? "Hide Breakdown" : "View Breakdown"}</span>
                {isPreviewExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Quick 1-line summary when collapsed */}
            {!isPreviewExpanded && (
              <div className="px-3 pb-2.5 text-[10px] font-mono text-gray-600 truncate border-t border-orange-100/60 pt-1.5">
                ⚡ Sample: {quickPreviewSummary}
              </div>
            )}

            {/* Full detailed breakdown when expanded */}
            {isPreviewExpanded && (
              <div className="p-3 pt-0 space-y-1.5 border-t border-orange-200/60 max-h-40 overflow-y-auto font-mono text-[11px] animate-in fade-in">
                {generatedStructure.map((fl) => (
                  <div
                    key={fl.id}
                    className="p-2 bg-white rounded-xl border border-orange-100 flex flex-wrap items-center justify-between gap-1.5 shadow-2xs"
                  >
                    <span className="font-bold text-gray-800 text-[10px]">
                      {fl.floorName} ({fl.rooms.length}R):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {fl.rooms.map((rm) => (
                        <span
                          key={rm.id}
                          className="px-1.5 py-0.5 rounded-md bg-orange-50 text-[#c2652a] border border-orange-200 text-[10px] font-semibold"
                        >
                          {rm.roomNumber} ({rm.beds.length}B)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COMPACT REASSURANCE NOTE */}
          <div className="px-3 py-2 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center gap-2 text-blue-900">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <p className="text-[10px] leading-tight">
              <span className="font-bold">Manual Flexibility:</span> You can freely rename rooms, delete or add extra rooms, and adjust bed sharing anytime later.
            </p>
          </div>
        </div>

        {/* FOOTER ACTION BAR */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isGenerating || totalCalculatedRooms === 0}
            onClick={handleGenerateLayout}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Generate Map ({totalCalculatedRooms} Rooms • {totalCalculatedBeds} Beds)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
