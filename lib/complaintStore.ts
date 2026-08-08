import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
} from "firebase/firestore";

export interface Complaint {
  id: string;
  complaintNumber: string;
  tenantName: string;
  tenantPhone: string;
  roomNumber: string;
  category: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  resolutionNotes?: string;
  photoUrl?: string;
  preferredTime?: string;
  createdAt: string;
  isRead: boolean;
}

// Initial fallback mock data if Firestore has no complaints yet
export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: "cmp-1001",
    complaintNumber: "CMP-1001",
    tenantName: "Rohan Gupta",
    tenantPhone: "9876543210",
    roomNumber: "Room 302 (Bed B)",
    category: "Plumbing",
    title: "Water Leakage in Bathroom Tap",
    description: "The main sink tap in room 302 bathroom is continuously dripping water and creating noise at night.",
    status: "OPEN",
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: "cmp-1002",
    complaintNumber: "CMP-1002",
    tenantName: "Sarah Jenkins",
    tenantPhone: "9876543211",
    roomNumber: "Room 104 (Bed A)",
    category: "Electrical",
    title: "Power Socket Sparking Near Desk",
    description: "Desk power strip socket emitted a small spark when laptop charger was plugged in. Needs inspection.",
    status: "IN_PROGRESS",
    resolutionNotes: "Caretaker Mahesh notified. Spare socket box dispatched.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: "cmp-1003",
    complaintNumber: "CMP-1003",
    tenantName: "Vikram Malhotra",
    tenantPhone: "9876543212",
    roomNumber: "Room 201 (Bed A)",
    category: "Wi-Fi & Net",
    title: "Wi-Fi Router Not Responding on 2nd Floor",
    description: "Signal drops frequently on 2nd floor corridor access point.",
    status: "RESOLVED",
    resolutionNotes: "Rebooted 2nd floor router and reset access point firmware. Speed test 150 Mbps restored.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
];

let inMemoryComplaintsStore: Complaint[] = [...INITIAL_COMPLAINTS];
const storeListeners: Set<(complaints: Complaint[]) => void> = new Set();

function loadFromLocalStorage(propertyId: string): Complaint[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`tenopilot_complaints_${propertyId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("LocalStorage complaints load error:", e);
  }
  return null;
}

function saveToLocalStorage(propertyId: string, complaints: Complaint[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`tenopilot_complaints_${propertyId}`, JSON.stringify(complaints));
  } catch (e) {
    console.warn("LocalStorage complaints save error:", e);
  }
}

function notifyStoreListeners(complaints: Complaint[]) {
  storeListeners.forEach((fn) => fn(complaints));
}

/**
 * Clean object of undefined fields before sending to Cloud Firestore
 */
function sanitizeForFirestore(obj: any): any {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}

/**
 * Subscribe to complaints in real-time from Firebase Cloud Firestore & Local Storage
 * Collection: properties/{propertyId}/complaints
 */
export function subscribeToComplaints(
  propertyId: string,
  onUpdate: (complaints: Complaint[]) => void
) {
  storeListeners.add(onUpdate);

  // Initialize with local storage if available
  const localSaved = loadFromLocalStorage(propertyId);
  if (localSaved && localSaved.length > 0) {
    inMemoryComplaintsStore = localSaved;
    onUpdate(localSaved);
  } else {
    onUpdate(inMemoryComplaintsStore);
  }

  try {
    const complaintsCol = collection(db, "properties", propertyId, "complaints");
    const q = query(complaintsCol);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Complaint[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Complaint;
            return {
              ...data,
              id: docSnap.id,
            };
          });

          // Sort by creation date descending (latest first)
          list.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          inMemoryComplaintsStore = list;
          saveToLocalStorage(propertyId, list);
          notifyStoreListeners(list);
        } else {
          // If Firestore collection is empty, populate initial seeds
          INITIAL_COMPLAINTS.forEach((c) => {
            setDoc(doc(db, "properties", propertyId, "complaints", c.id), sanitizeForFirestore(c)).catch(
              () => {}
            );
          });
        }
      },
      (error) => {
        console.warn("Firestore snapshot listener error, using in-memory:", error);
      }
    );

    return () => {
      storeListeners.delete(onUpdate);
      unsubscribe();
    };
  } catch (err) {
    console.warn("Firestore subscribe error fallback:", err);
    return () => {
      storeListeners.delete(onUpdate);
    };
  }
}

/**
 * Create a new complaint record logged by resident or property manager
 */
export async function createComplaintInFirestore(
  propertyId: string,
  complaintData: Omit<Complaint, "id" | "complaintNumber" | "createdAt" | "status" | "isRead">
): Promise<Complaint> {
  const newId = `cmp-${Date.now()}`;
  const complaintNumber = `CMP-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const newComplaint: Complaint = {
    ...complaintData,
    id: newId,
    complaintNumber,
    status: "OPEN",
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  // Sanitize undefined fields to prevent Firestore setDoc crashes
  const sanitizedDoc = sanitizeForFirestore(newComplaint);

  try {
    const docRef = doc(db, "properties", propertyId, "complaints", newId);
    await setDoc(docRef, sanitizedDoc);
  } catch (error) {
    console.warn("Firestore create complaint error, fallback to local store:", error);
  }

  inMemoryComplaintsStore = [newComplaint, ...inMemoryComplaintsStore];
  saveToLocalStorage(propertyId, inMemoryComplaintsStore);
  notifyStoreListeners(inMemoryComplaintsStore);
  
  // Future WhatsApp API Hook Trigger
  sendWhatsAppNotificationStub(newComplaint, "OPEN");

  return newComplaint;
}

/**
 * Update complaint status (OPEN, IN_PROGRESS, RESOLVED, REJECTED)
 */
export async function updateComplaintStatusInFirestore(
  propertyId: string,
  complaintId: string,
  newStatus: Complaint["status"],
  resolutionNotes?: string
): Promise<boolean> {
  const updates: Partial<Complaint> = {
    status: newStatus,
    isRead: true,
  };

  if (resolutionNotes !== undefined) {
    updates.resolutionNotes = resolutionNotes;
  }

  try {
    const docRef = doc(db, "properties", propertyId, "complaints", complaintId);
    await updateDoc(docRef, sanitizeForFirestore(updates));
  } catch (error) {
    console.warn("Firestore update complaint error, fallback to local store:", error);
  }

  const idx = inMemoryComplaintsStore.findIndex((c) => c.id === complaintId);
  if (idx !== -1) {
    inMemoryComplaintsStore[idx] = {
      ...inMemoryComplaintsStore[idx],
      ...updates,
    };

    saveToLocalStorage(propertyId, inMemoryComplaintsStore);
    notifyStoreListeners(inMemoryComplaintsStore);

    // Trigger WhatsApp notification stub
    sendWhatsAppNotificationStub(inMemoryComplaintsStore[idx], newStatus);
  }

  return true;
}

/**
 * Toggle read state for a complaint
 */
export async function markComplaintAsReadInFirestore(
  propertyId: string,
  complaintId: string,
  isRead: boolean
): Promise<boolean> {
  try {
    const docRef = doc(db, "properties", propertyId, "complaints", complaintId);
    await updateDoc(docRef, { isRead });
  } catch (error) {
    console.warn("Firestore mark read error:", error);
  }

  const idx = inMemoryComplaintsStore.findIndex((c) => c.id === complaintId);
  if (idx !== -1) {
    inMemoryComplaintsStore[idx].isRead = isRead;
    saveToLocalStorage(propertyId, inMemoryComplaintsStore);
    notifyStoreListeners(inMemoryComplaintsStore);
  }

  return true;
}

/**
 * Delete a complaint record
 */
export async function deleteComplaintInFirestore(
  propertyId: string,
  complaintId: string
): Promise<boolean> {
  try {
    const docRef = doc(db, "properties", propertyId, "complaints", complaintId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn("Firestore delete complaint error:", error);
  }

  inMemoryComplaintsStore = inMemoryComplaintsStore.filter((c) => c.id !== complaintId);
  saveToLocalStorage(propertyId, inMemoryComplaintsStore);
  notifyStoreListeners(inMemoryComplaintsStore);
  return true;
}

/**
 * Export all complaints as CSV format
 */
export function exportComplaintsCSV(complaints: Complaint[]) {
  const headers = [
    "Ticket Number",
    "Tenant Name",
    "Phone",
    "Room / Bed",
    "Category",
    "Title",
    "Description",
    "Status",
    "Date Logged",
    "Resolution Notes",
  ];

  const rows = complaints.map((c) => [
    c.complaintNumber,
    `"${c.tenantName.replace(/"/g, '""')}"`,
    c.tenantPhone,
    `"${c.roomNumber}"`,
    c.category,
    `"${c.title.replace(/"/g, '""')}"`,
    `"${c.description.replace(/"/g, '""')}"`,
    c.status,
    new Date(c.createdAt).toLocaleString("en-IN"),
    `"${(c.resolutionNotes || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Tenopilot_Complaints_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper to construct WhatsApp Direct wa.me URL for resident status notification
 */
export function buildComplaintWhatsAppUrl(complaint: Complaint, customStatus?: string, customNotes?: string): string {
  const cleanDigits = complaint.tenantPhone.replace(/\D/g, "");
  const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
  
  const statusText = customStatus || complaint.status;
  const statusEmoji = statusText === "RESOLVED" ? "🟢" : statusText === "IN_PROGRESS" ? "🟡" : statusText === "REJECTED" ? "⚪" : "🔴";
  
  const notesText = customNotes !== undefined ? customNotes : complaint.resolutionNotes;

  const message = `Hello ${complaint.tenantName},

Your maintenance request for TenoPilot.com has been updated:

🎫 *Ticket ID*: ${complaint.complaintNumber}
🏠 *Room Location*: ${complaint.roomNumber}
🔧 *Category*: ${complaint.category}
📝 *Title*: ${complaint.title}

📌 *Current Status*: ${statusEmoji} *${statusText.replace("_", " ")}*${notesText ? `\n💬 *Management Note*: ${notesText}` : ""}

Thank you,
TenoPilot.com Management`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Future WhatsApp API Broadcast Stub
 */
function sendWhatsAppNotificationStub(complaint: Complaint, actionStatus: string) {
  console.log(
    `[WhatsApp API Hook] Broadcast event triggered for ${complaint.complaintNumber}:`,
    {
      toTenant: complaint.tenantPhone,
      room: complaint.roomNumber,
      status: actionStatus,
      message: `Dear ${complaint.tenantName}, your complaint ${complaint.complaintNumber} (${complaint.category}) for ${complaint.roomNumber} has been updated to ${actionStatus}.`,
    }
  );
}

