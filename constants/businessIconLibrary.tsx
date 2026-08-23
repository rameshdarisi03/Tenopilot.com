import React from "react";
import {
  Building2,
  Home,
  Key,
  DoorClosed,
  Warehouse,
  Hammer,
  Wrench,
  Paintbrush,
  Ruler,
  Truck,
  ShieldAlert,
  Sparkles,
  Layers,
  Box,
  Package,
  Zap,
  Flame,
  Fuel,
  Droplet,
  Sun,
  Wind,
  Plug,
  Battery,
  BatteryCharging,
  Power,
  Lightbulb,
  Thermometer,
  Gauge,
  Activity,
  Fan,
  Users,
  UserCheck,
  Shield,
  Lock,
  BadgeCheck,
  Briefcase,
  Contact,
  PhoneCall,
  UserPlus,
  HardHat,
  Camera,
  Bell,
  UserX,
  ShieldCheck,
  KeyRound,
  Wifi,
  Monitor,
  Tv,
  Laptop,
  Radio,
  Router,
  Signal,
  Cpu,
  Server,
  Smartphone,
  HardDrive,
  Satellite,
  Globe,
  Database,
  Utensils,
  Coffee,
  Pizza,
  Wine,
  Milk,
  ShoppingBag,
  ShoppingCart,
  Bed,
  Armchair,
  Cookie,
  Cake,
  GlassWater,
  Apple,
  Receipt,
  FileText,
  FileCheck,
  Scale,
  Landmark,
  Banknote,
  Coins,
  CreditCard,
  DollarSign,
  Percent,
  Calculator,
  FileSpreadsheet,
  Folder,
  FilePlus,
  Bookmark,
  Trash2,
  ShowerHead,
  Bath,
  Scissors,
  Recycle,
  RefreshCw,
  AlertTriangle,
  LifeBuoy,
  Car,
  Bus,
  Bike,
  ParkingCircle,
  Navigation,
  MapPin,
  Plane,
  Compass,
  Ticket,
  Train,
  Anchor,
  Luggage,
} from "lucide-react";

export interface IconCategoryGroup {
  category: string;
  icon: string;
  icons: { name: string; label: string; component: React.ComponentType<{ className?: string }> }[];
}

export const CATEGORIZED_ICON_LIBRARY: IconCategoryGroup[] = [
  {
    category: "Property & Building",
    icon: "Building2",
    icons: [
      { name: "Building2", label: "Building", component: Building2 },
      { name: "Home", label: "House", component: Home },
      { name: "Key", label: "Key", component: Key },
      { name: "DoorClosed", label: "Door", component: DoorClosed },
      { name: "Warehouse", label: "Warehouse", component: Warehouse },
      { name: "Hammer", label: "Hammer", component: Hammer },
      { name: "Wrench", label: "Wrench", component: Wrench },
      { name: "Paintbrush", label: "Paint", component: Paintbrush },
      { name: "Ruler", label: "Ruler", component: Ruler },
      { name: "Truck", label: "Truck", component: Truck },
      { name: "ShieldAlert", label: "Alert", component: ShieldAlert },
      { name: "Sparkles", label: "Sparkle", component: Sparkles },
      { name: "Layers", label: "Structure", component: Layers },
      { name: "Box", label: "Storage", component: Box },
      { name: "Package", label: "Package", component: Package },
    ],
  },
  {
    category: "Utilities & Energy",
    icon: "Zap",
    icons: [
      { name: "Zap", label: "Power", component: Zap },
      { name: "Droplet", label: "Water", component: Droplet },
      { name: "Flame", label: "Gas/Fire", component: Flame },
      { name: "Fuel", label: "Fuel/Diesel", component: Fuel },
      { name: "Sun", label: "Solar", component: Sun },
      { name: "Wind", label: "HVAC", component: Wind },
      { name: "Plug", label: "Plug", component: Plug },
      { name: "Battery", label: "Battery", component: Battery },
      { name: "BatteryCharging", label: "UPS", component: BatteryCharging },
      { name: "Power", label: "Power Switch", component: Power },
      { name: "Lightbulb", label: "Lighting", component: Lightbulb },
      { name: "Thermometer", label: "Cooling", component: Thermometer },
      { name: "Gauge", label: "Meter", component: Gauge },
      { name: "Activity", label: "Generator", component: Activity },
      { name: "Fan", label: "Exhaust Fan", component: Fan },
    ],
  },
  {
    category: "Staff & Security",
    icon: "Users",
    icons: [
      { name: "Users", label: "Staff", component: Users },
      { name: "UserCheck", label: "Guard", component: UserCheck },
      { name: "Shield", label: "Security", component: Shield },
      { name: "Lock", label: "Lock", component: Lock },
      { name: "BadgeCheck", label: "Badge", component: BadgeCheck },
      { name: "Briefcase", label: "Vendor", component: Briefcase },
      { name: "Contact", label: "Manager", component: Contact },
      { name: "PhoneCall", label: "Helpdesk", component: PhoneCall },
      { name: "UserPlus", label: "Onboard", component: UserPlus },
      { name: "HardHat", label: "Labour", component: HardHat },
      { name: "Camera", label: "CCTV", component: Camera },
      { name: "Bell", label: "Alarm", component: Bell },
      { name: "UserX", label: "Terminated", component: UserX },
      { name: "ShieldCheck", label: "Safety", component: ShieldCheck },
      { name: "KeyRound", label: "Passcode", component: KeyRound },
    ],
  },
  {
    category: "Network & Tech",
    icon: "Wifi",
    icons: [
      { name: "Wifi", label: "Broadband", component: Wifi },
      { name: "Monitor", label: "Monitor", component: Monitor },
      { name: "Tv", label: "DTH / Cable", component: Tv },
      { name: "Laptop", label: "Laptop", component: Laptop },
      { name: "Radio", label: "Intercom", component: Radio },
      { name: "Router", label: "Router", component: Router },
      { name: "Signal", label: "5G Signal", component: Signal },
      { name: "Cpu", label: "Automation", component: Cpu },
      { name: "Server", label: "IT Server", component: Server },
      { name: "Smartphone", label: "Mobile", component: Smartphone },
      { name: "HardDrive", label: "Storage", component: HardDrive },
      { name: "Satellite", label: "Dish TV", component: Satellite },
      { name: "Globe", label: "Internet", component: Globe },
      { name: "Database", label: "Database", component: Database },
    ],
  },
  {
    category: "Food & Provisions",
    icon: "Utensils",
    icons: [
      { name: "Utensils", label: "Mess / Food", component: Utensils },
      { name: "Coffee", label: "Tea/Coffee", component: Coffee },
      { name: "Pizza", label: "Snacks", component: Pizza },
      { name: "Wine", label: "Beverages", component: Wine },
      { name: "Milk", label: "Dairy / Milk", component: Milk },
      { name: "ShoppingBag", label: "Grocery", component: ShoppingBag },
      { name: "ShoppingCart", label: "Provisions", component: ShoppingCart },
      { name: "Bed", label: "Bedding", component: Bed },
      { name: "Armchair", label: "Furniture", component: Armchair },
      { name: "Cookie", label: "Bakery", component: Cookie },
      { name: "Cake", label: "Events", component: Cake },
      { name: "GlassWater", label: "Drinking Water", component: GlassWater },
      { name: "Apple", label: "Produce", component: Apple },
    ],
  },
  {
    category: "Tax, Legal & Audit",
    icon: "Receipt",
    icons: [
      { name: "Receipt", label: "Receipt", component: Receipt },
      { name: "FileText", label: "Invoice", component: FileText },
      { name: "FileCheck", label: "Permit", component: FileCheck },
      { name: "Scale", label: "Legal", component: Scale },
      { name: "Landmark", label: "Govt / Municipal", component: Landmark },
      { name: "Banknote", label: "Cash Flow", component: Banknote },
      { name: "Coins", label: "Petty Cash", component: Coins },
      { name: "CreditCard", label: "Card Pay", component: CreditCard },
      { name: "DollarSign", label: "Revenue", component: DollarSign },
      { name: "Percent", label: "GST / Tax", component: Percent },
      { name: "Calculator", label: "Audit", component: Calculator },
      { name: "FileSpreadsheet", label: "Ledger", component: FileSpreadsheet },
      { name: "Folder", label: "Documents", component: Folder },
      { name: "FilePlus", label: "Agreement", component: FilePlus },
      { name: "Bookmark", label: "License", component: Bookmark },
    ],
  },
  {
    category: "Cleaning & Hygiene",
    icon: "Trash2",
    icons: [
      { name: "Trash2", label: "Waste Disposal", component: Trash2 },
      { name: "ShowerHead", label: "Plumbing", component: ShowerHead },
      { name: "Bath", label: "Restroom", component: Bath },
      { name: "Scissors", label: "Lawn / Garden", component: Scissors },
      { name: "Recycle", label: "Recycling", component: Recycle },
      { name: "RefreshCw", label: "Pest Control", component: RefreshCw },
      { name: "AlertTriangle", label: "Hazard", component: AlertTriangle },
      { name: "LifeBuoy", label: "Safety Equipment", component: LifeBuoy },
    ],
  },
  {
    category: "Transport & Vehicles",
    icon: "Car",
    icons: [
      { name: "Car", label: "Cab / Car", component: Car },
      { name: "Bus", label: "Staff Shuttle", component: Bus },
      { name: "Bike", label: "Delivery Bike", component: Bike },
      { name: "ParkingCircle", label: "Parking", component: ParkingCircle },
      { name: "Navigation", label: "Logistics", component: Navigation },
      { name: "MapPin", label: "Location", component: MapPin },
      { name: "Plane", label: "Travel", component: Plane },
      { name: "Compass", label: "Direction", component: Compass },
      { name: "Ticket", label: "Passes", component: Ticket },
      { name: "Train", label: "Transit", component: Train },
      { name: "Anchor", label: "Freight", component: Anchor },
      { name: "Luggage", label: "Guest Luggage", component: Luggage },
    ],
  },
];

// Custom Pixel-Perfect Indian Rupee Receipt Icon (No Dollar Sign)
export function ReceiptRupeeIcon({
  className = "w-4 h-4",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M9 7.5h6" />
      <path d="M9 10.5h6" />
      <path d="M9 7.5v3a2.5 2.5 0 0 0 2.5 2.5h0.5" />
      <path d="M11.5 13.5L15 17.5" />
    </svg>
  );
}

// Plain Bill / Receipt with Text Lines (Neutral, No Currency)
export function ReceiptPlainIcon({
  className = "w-4 h-4",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

// Helper Component to render dynamic icon by string name
export function RenderDynamicCategoryIcon({
  iconName,
  className = "w-4 h-4",
}: {
  iconName: string;
  className?: string;
}) {
  if (iconName === "Receipt" || iconName === "ReceiptRupee") {
    return React.createElement(ReceiptRupeeIcon, { className });
  }

  if (iconName === "ReceiptPlain" || iconName === "Bill" || iconName === "ReceiptText") {
    return React.createElement(ReceiptPlainIcon, { className });
  }

  for (const group of CATEGORIZED_ICON_LIBRARY) {
    const found = group.icons.find((i) => i.name === iconName);
    if (found) {
      return React.createElement(found.component, { className });
    }
  }

  // Default Fallback: Rupee Receipt Icon
  return React.createElement(ReceiptRupeeIcon, { className });
}
