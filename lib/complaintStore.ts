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
    roomNumber: "Room 302",
    category: "Plumbing",
    title: "Water Leakage in Bathroom Tap",
    description: "The main sink tap in room 302 bathroom is continuously dripping water and creating noise at night.",
    status: "OPEN",
    preferredTime: "Morning • 9:00 AM - 11:00 AM",
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: "cmp-1002",
    complaintNumber: "CMP-1002",
    tenantName: "Sarah Jenkins",
    tenantPhone: "9876543211",
    roomNumber: "Room 104",
    category: "Electrical",
    title: "Power Socket Sparking Near Desk",
    description: "Desk power strip socket emitted a small spark when laptop charger was plugged in. Needs inspection.",
    status: "IN_PROGRESS",
    resolutionNotes: "Caretaker Mahesh notified. Spare socket box dispatched.",
    preferredTime: "Immediate / Urgent",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: "cmp-1003",
    complaintNumber: "CMP-1003",
    tenantName: "Vikram Malhotra",
    tenantPhone: "9876543212",
    roomNumber: "Room 201",
    category: "Wi-Fi",
    title: "Wi-Fi Router Not Responding on 2nd Floor",
    description: "Signal drops frequently on 2nd floor corridor access point.",
    status: "RESOLVED",
    resolutionNotes: "Rebooted 2nd floor router and reset access point firmware. Speed test 150 Mbps restored.",
    preferredTime: "Evening • 6:00 PM - 8:00 PM",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
];

let inMemoryComplaintsStore: Complaint[] = [...INITIAL_COMPLAINTS];

/**
 * Subscribe to complaints in real-time from Firebase Cloud Firestore
 * Collection: properties/{propertyId}/complaints
 */
export function subscribeToComplaints(
  propertyId: string,
  onUpdate: (complaints: Complaint[]) => void
) {
  try {
    const complaintsCol = collection(db, "properties", propertyId, "complaints");
    const q = query(complaintsCol);

    return onSnapshot(
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
          onUpdate(list);
        } else {
          // If Firestore collection is empty, populate initial seeds
          INITIAL_COMPLAINTS.forEach((c) => {
            setDoc(doc(db, "properties", propertyId, "complaints", c.id), c).catch(
              () => {}
            );
          });
          onUpdate(INITIAL_COMPLAINTS);
        }
      },
      (error) => {
        console.warn("Firestore snapshot listener error, using in-memory:", error);
        onUpdate(inMemoryComplaintsStore);
      }
    );
  } catch (err) {
    console.warn("Firestore subscribe error fallback:", err);
    onUpdate(inMemoryComplaintsStore);
    return () => {};
  }
}

/**
 * Create a new complaint record logged by tenant or property manager
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

  try {
    const docRef = doc(db, "properties", propertyId, "complaints", newId);
    await setDoc(docRef, newComplaint);
  } catch (error) {
    console.warn("Firestore create complaint error, fallback to memory:", error);
  }

  inMemoryComplaintsStore.unshift(newComplaint);
  
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
    await updateDoc(docRef, updates);
  } catch (error) {
    console.warn("Firestore update complaint error, fallback to memory:", error);
  }

  const idx = inMemoryComplaintsStore.findIndex((c) => c.id === complaintId);
  if (idx !== -1) {
    inMemoryComplaintsStore[idx] = {
      ...inMemoryComplaintsStore[idx],
      ...updates,
    };

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
    "Preferred Time",
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
    `"${c.preferredTime || "N/A"}"`,
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
 * Future WhatsApp API Broadcast Stub
 * (Hook ready for WhatsApp Business API integration)
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
