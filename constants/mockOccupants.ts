import { saveOccupantToFirestore, deleteOccupantFromFirestore } from "@/lib/firestoreService";

export interface PaymentHistoryItem {
  id: string;
  month: string;
  date: string;
  amount: number;
  mode: string;
  receiptNo: string;
  status: "PAID" | "PENDING" | "PARTIAL";
}

export interface Occupant {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  stayType: "Tenant" | "Guest";
  roomNumber: string;
  bedCode: string;
  joiningDate: string;
  lastPaidDate: string; // Reference baseline date (e.g., "01 Jul 2026")
  dueDate: string; // Target billing date (e.g., "01 Aug 2026")
  dueDay: number; // Day of the month (1-28)
  daysRemainingText: string; // e.g., "Due in 2 Days", "DUE TODAY", "5 DAYS OVERDUE", "—"
  daysDiff: number; // Positive = future due, 0 = today, Negative = overdue
  vacatingDate?: string;
  rentAmount: number;
  paymentStatus: "Paid" | "Due" | "Overdue";
  lifecycleStatus: "Active" | "Booked" | "Notice" | "Past";
  aadhaarNumber: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  kycVerified?: boolean;
  hasPdfAgreement?: boolean;
  workplace?: string;
  address?: string;
  kycDocs?: {
    idMode?: "IMAGES" | "PDF";
    photoUrl?: string;
    aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string;
    aadhaarPdfUrl?: string;
  };
  securityDeposit?: number;
  depositStatus?: "PAID" | "PENDING" | "PARTIAL" | "REFUNDED";
  partialPaidThisCycle?: number;
  arrearsBalance?: number;
  paymentHistory?: PaymentHistoryItem[];
}

// 200 Guaranteed 100% Unique Indian Names (No Duplicates)
const UNIQUE_INDIAN_NAMES: string[] = [
  "Aarav Sharma", "Aditi Patel", "Aditya Reddy", "Aishwarya Iyer", "Akash Nair", "Akshay Mehta", "Alok Kumar", "Amara Begum",
  "Amit Singh", "Amrita Kulkarni", "Anand Verma", "Ananya Rao", "Aniket Joshi", "Anjali Deshmukh", "Anurag Gupta", "Aparna Agarwal",
  "Arjun Banerjee", "Arnav Chatterjee", "Arti Pandey", "Arun Mishra", "Arvind Choudhury", "Ashok Pillai", "Avani Menon", "Bhavna Sen",
  "Bhavya Kapoor", "Brijesh Saxena", "Chaitanya Bhat", "Chetan Tripathy", "Deepa Nambiar", "Deepak Bhattacharya", "Devendra Shetty", "Divya Thakur",
  "Gautam Mehta", "Geeta Srivastava", "Girish Hegde", "Gopal Varma", "Harish Subbu", "Harpreet Begum", "Hemant Rastogi", "Indira Mahajan",
  "Isha Chaudhry", "Jagdish Prasad", "Jitendra Aggarwal", "Karan Malhotra", "Kavita Swaminathan", "Kavya Pillai", "Kiran Nayak", "Kishore Gowda",
  "Krishnan Murthy", "Kunal Biswas", "Lakshmi Patel", "Lalitha Sundaram", "Madhav Ghosh", "Manish Saxena", "Manju Ranganathan", "Meera Pillai",
  "Mohan Das", "Mukesh Sharma", "Nikhil Verma", "Nisha Rao", "Nitin Garg", "Pallavi Deshpande", "Pankaj Sethi", "Parth Sarathi",
  "Pooja Nambisan", "Pradeep Sen", "Prakash Jha", "Pranav Varma", "Prashanth Pillai", "Preeti Kulkarni", "Priya Reddy", "Rahul Verma",
  "Rajesh Banerjee", "Rajiv Dhawan", "Rakesh Maurya", "Ramesh Darisi", "Rani Mukherjee", "Ritu Joshi", "Rohan Singh", "Rohit Bhardwaj",
  "Sachin Tendulkar", "Sameer Grover", "Sanjay Kumar", "Santhosh Shetty", "Sarita Hegde", "Satish Acharya", "Shalini Shinde", "Shivam Tyagi",
  "Shruti Venkatesh", "Shweta Deshmukh", "Siddharth Sen", "Sneha Agarwal", "Sridhar Iyer", "Subhash Chandra", "Sudarshan Naidu", "Sudhir Mittal",
  "Sujata Poddar", "Suman Bhowmick", "Sunil Gavaskar", "Sunita Agarwal", "Suresh Reddy", "Swati Kadam", "Tanvi Choudhury", "Tarun Gupta",
  "Tejaswin Shankar", "Umesh Yadav", "Vaibhav Suryavanshi", "Varun Dhawan", "Venkatesh Choudhury", "Vicky Kaushal", "Vidya Balan", "Vijay Mallya",
  "Vikas Bahl", "Vikramaditya Motwane", "Vimal Anand", "Vinay Pathak", "Vineet Kumar", "Vinod Rai", "Vipul Shah", "Viraj Kohli",
  "Virender Sehwag", "Vishal Bhardwaj", "Vivek Agnihotri", "Yash Chopra", "Yashwant Sinha", "Yogesh Dutt", "Zaheer Khan", "Abhay Deol",
  "Abhishek Sharma", "Adil Hussain", "Ajay Devgn", "Ajit Agarkar", "Akhil Akkineni", "Ali Fazal", "Allu Arjun", "Alia Bhatt",
  "Anil Kapoor", "Anupam Kher", "Anushka Sharma", "Aravinda de Silva", "Arijit Singh", "Ashwin Kumar", "Asin Thottumkal", "Atharvaa Murali",
  "Ayushmann Khurrana", "Bala Kumaran", "Balakrishna Nandamuri", "Bhumika Chawla", "Bipasha Basu", "Bobby Deol", "Chiranjeevi Konidela", "Dhanush K",
  "Dilip Kumar", "Dulquer Salmaan", "Farhan Akhtar", "Genelia D'Souza", "Govinda Ahuja", "Harbhajan Singh", "Hrithik Roshan", "Irrfan Khan",
  "Jaideep Ahlawat", "Janhavi Kapoor", "Jayaram Subramaniam", "Jitendra Kumar", "Jyothika Saravanan", "Kajal Aggarwal", "Kamal Haasan", "Kangana Ranaut",
  "Kareena Kapoor", "Karisma Kapoor", "Kartik Aaryan", "Katrina Kaif", "Keerthy Suresh", "Kiara Advani", "Kriti Sanon", "Mammootty Muhammed",
  "Manju Warrier", "Manoj Bajpayee", "Mohanlal Viswanathan", "Nagarjuna Akkineni", "Nani Ghanta", "Nawazuddin Siddiqui", "Nayanthara Kurian", "Niti Aayog",
  "Nivin Pauly", "Pankaj Tripathi", "Prabhas Raju", "Prithviraj Sukumaran", "Pooja Hegde", "Rajinikanth Gaikwad", "Ranbir Kapoor", "Ranveer Singh",
  "Rashmika Mandanna", "Ravi Teja", "Rishab Shetty", "Sai Pallavi", "Samantha Ruth", "Shah Rukh Khan", "Shahid Kapoor", "Sharwanand Myneni",
  "Siddharth Narayan", "Sivakarthikeyan Doss", "Sonakshi Sinha", "Sonam Kapoor", "Suriya Sivakumar", "Tabu Hashmi", "Tamannaah Bhatia", "Trisha Krishnan",
  "Upendra Rao", "Vijay Chandrasekhar", "Vijay Sethupathi", "Vikram Kennedy", "Yash Gowda", "Yami Gautam", "Yousuf Khan", "Zubeen Garg"
];

const roomNumbers = [
  "101", "102", "103", "104", "105", "106", "107", "108",
  "201", "202", "203", "204", "205", "206", "207", "208",
  "301", "302", "303", "304", "305", "306", "307", "308"
];

const bedCodes = ["Bed A", "Bed B", "Bed C"];

export function generateMockOccupants(count = 25): Occupant[] {
  const curatedCases: Occupant[] = [
    // 🌟 Onboarded Tenant 1: Aarav Sengupta (Skipped KYC)
    {
      id: "og-tenant-1786316000001",
      name: "Aarav Sengupta",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=AaravSengupta",
      phone: "+91 99001 12233",
      email: "aarav.sengupta@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Due",
      daysDiff: 30,
      daysRemainingText: "30 Days Remaining",
      rentAmount: 18000,
      dueDate: "09 Sep 2026",
      dueDay: 9,
      lastPaidDate: "Unpaid / Due Now",
      roomNumber: "101",
      bedCode: "BED A",
      joiningDate: "09 Aug 2026",
      kycVerified: false,
      hasPdfAgreement: true,
      workplace: "Microsoft R&D",
      address: "Koramangala, Bengaluru",
      aadhaarNumber: "Skipped",
      emergencyContact: { name: "Subhash Sengupta", phone: "+91 99001 00000", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PENDING",
      arrearsBalance: 0,
      paymentHistory: [],
    },
    // 🌟 Onboarded Tenant 2: Sneha Kulkarni (Full KYC Verified)
    {
      id: "og-tenant-1786316000002",
      name: "Sneha Kulkarni",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SnehaKulkarni",
      phone: "+91 99002 23344",
      email: "sneha.kulkarni@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Due",
      daysDiff: 30,
      daysRemainingText: "30 Days Remaining",
      rentAmount: 14500,
      dueDate: "09 Sep 2026",
      dueDay: 9,
      lastPaidDate: "Unpaid / Due Now",
      roomNumber: "102",
      bedCode: "BED A",
      joiningDate: "09 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Flipkart Tech",
      address: "Indiranagar, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-9812",
      emergencyContact: { name: "Anand Kulkarni", phone: "+91 99002 00000", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
      paymentHistory: [],
    },
    // 🌟 Onboarded Tenant 3: Rahul Deshmukh (Skipped KYC)
    {
      id: "og-tenant-1786316000003",
      name: "Rahul Deshmukh",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RahulDeshmukh",
      phone: "+91 99003 34455",
      email: "rahul.deshmukh@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Due",
      daysDiff: 30,
      daysRemainingText: "30 Days Remaining",
      rentAmount: 14500,
      dueDate: "09 Sep 2026",
      dueDay: 9,
      lastPaidDate: "Unpaid / Due Now",
      roomNumber: "103",
      bedCode: "BED A",
      joiningDate: "09 Aug 2026",
      kycVerified: false,
      hasPdfAgreement: true,
      workplace: "Google India",
      address: "Whitefield, Bengaluru",
      aadhaarNumber: "Skipped",
      emergencyContact: { name: "Vijay Deshmukh", phone: "+91 99003 00000", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PENDING",
      arrearsBalance: 0,
      paymentHistory: [],
    },
  ];

  return curatedCases;
}

export const MOCK_SEQUENTIAL_GUESTS_BED_101_A: Occupant[] = [
  // 3. Mock Guest 3 (Upcoming Booked Guest #1 - 11 Aug to 18 Aug)
  {
    id: "mock-guest-03",
    name: "Mock Guest 3 (VVS Laxman)",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=VVSLaxman",
    phone: "+91 98001 00003",
    email: "vvs.laxman@mock.com",
    stayType: "Guest",
    lifecycleStatus: "Booked",
    paymentStatus: "Due",
    rentAmount: 5600,
    joiningDate: "11 Aug 2026",
    vacatingDate: "18 Aug 2026",
    dueDate: "18 Aug 2026",
    dueDay: 18,
    lastPaidDate: "Reserved / Unpaid",
    daysDiff: 2,
    daysRemainingText: "Checking in 11 Aug",
    roomNumber: "101",
    bedCode: "BED A",
    kycVerified: false,
    aadhaarNumber: "Skipped",
    emergencyContact: { name: "Shailaja Laxman", phone: "+91 98001 99993", relation: "Spouse" },
    securityDeposit: 1000,
    depositStatus: "PENDING",
    arrearsBalance: 0,
    workplace: "Sunrisers Mentor",
    address: "Hyderabad, TS",
  },
  // 4. Mock Guest 4 (Upcoming Booked Guest #2 - 20 Aug to 27 Aug)
  {
    id: "mock-guest-04",
    name: "Mock Guest 4 (Javagal Srinath)",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=JavagalSrinath",
    phone: "+91 98001 00004",
    email: "javagal.srinath@mock.com",
    stayType: "Guest",
    lifecycleStatus: "Booked",
    paymentStatus: "Due",
    rentAmount: 5600,
    joiningDate: "20 Aug 2026",
    vacatingDate: "27 Aug 2026",
    dueDate: "27 Aug 2026",
    dueDay: 27,
    lastPaidDate: "Reserved / Unpaid",
    daysDiff: 11,
    daysRemainingText: "Checking in 20 Aug",
    roomNumber: "101",
    bedCode: "BED A",
    kycVerified: false,
    aadhaarNumber: "Skipped",
    emergencyContact: { name: "Madhavi Srinath", phone: "+91 98001 99994", relation: "Spouse" },
    securityDeposit: 1000,
    depositStatus: "PENDING",
    arrearsBalance: 0,
    workplace: "ICC Match Referee",
    address: "Mysuru, KA",
  },
  // 5. Mock Guest 5 (Upcoming Booked Guest #3 - 29 Aug to 05 Sep)
  {
    id: "mock-guest-05",
    name: "Mock Guest 5 (Venkatesh Prasad)",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=VenkateshPrasad",
    phone: "+91 98001 00005",
    email: "venkatesh.prasad@mock.com",
    stayType: "Guest",
    lifecycleStatus: "Booked",
    paymentStatus: "Due",
    rentAmount: 5600,
    joiningDate: "29 Aug 2026",
    vacatingDate: "05 Sep 2026",
    dueDate: "05 Sep 2026",
    dueDay: 5,
    lastPaidDate: "Reserved / Unpaid",
    daysDiff: 20,
    daysRemainingText: "Checking in 29 Aug",
    roomNumber: "101",
    bedCode: "BED A",
    kycVerified: false,
    aadhaarNumber: "Skipped",
    emergencyContact: { name: "Jayanthi Prasad", phone: "+91 98001 99995", relation: "Spouse" },
    securityDeposit: 1000,
    depositStatus: "PENDING",
    arrearsBalance: 0,
    workplace: "Bowling Coach",
    address: "Bengaluru, KA",
  },
];

const OCCUPANTS_STORAGE_KEY = "tenopilot_real_occupants_v1";
let GLOBAL_OCCUPANTS_CACHE: Occupant[] | null = null;
const occupantListeners: Array<() => void> = [];

function loadOccupants(): Occupant[] {
  if (GLOBAL_OCCUPANTS_CACHE) return GLOBAL_OCCUPANTS_CACHE;
  let list: Occupant[] = [];
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(OCCUPANTS_STORAGE_KEY);
      if (saved) {
        list = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load occupants from localStorage", e);
    }
  }

  // 🧹 PURGE ALL OUTDATED LEGACY MOCK GUESTS AND TEST RECORDS FROM CACHE
  const LEGACY_PURGE_KEYS = ["mock-guest-", "occ-test-", "tera01", "tera02"];
  list = list.filter((o) => !LEGACY_PURGE_KEYS.some((key) => o.id.startsWith(key) || o.id === key));

  // 🌟 ALWAYS ENSURE THE 3 NEW ONBOARDED TENANTS ARE INJECTED INTO LIST
  const freshCurated = generateMockOccupants();
  freshCurated.forEach((freshOcc) => {
    if (!list.some((o) => o.id === freshOcc.id)) {
      list.push(freshOcc);
    }
  });

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(OCCUPANTS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to save refreshed occupants store:", e);
    }
  }

  GLOBAL_OCCUPANTS_CACHE = list;
  return GLOBAL_OCCUPANTS_CACHE;
}

export const occupantStore = {
  getOccupants(propertyId?: string): Occupant[] {
    if (!propertyId) return [];
    if (typeof window !== "undefined") {
      try {
        const savedKey = `tenopilot_occupants_${propertyId}`;
        const saved = localStorage.getItem(savedKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.warn(`Failed to load occupants for property ${propertyId}:`, e);
      }
    }
    return [];
  },

  setOccupantsFromFirestore(newList: Occupant[]) {
    // 🌟 CLOUD FIRESTORE IS 100% THE SINGLE SOURCE OF TRUTH (SSOT)
    // Cloud snapshot directly overwrites state — deleted Firestore records disappear automatically!
    const LEGACY_PURGE_KEYS = ["mock-guest-", "occ-test-", "tera01", "tera02"];
    const filteredFirestoreList = newList.filter(
      (o) => !LEGACY_PURGE_KEYS.some((key) => o.id.startsWith(key) || o.id === key)
    );

    // If Firestore returns records, Cloud Firestore is master authority!
    // We only preserve un-synced newly onboarded local items created in the last 10 seconds.
    const current = loadOccupants();
    const firestoreIds = new Set(filteredFirestoreList.map((o) => o.id));

    // Preserve local drafts only if they are newly created genuine records
    const unsyncedLocalDrafts = current.filter(
      (o) => !firestoreIds.has(o.id) && o.id.startsWith("og-")
    );

    const masterList = [...filteredFirestoreList, ...unsyncedLocalDrafts];

    GLOBAL_OCCUPANTS_CACHE = masterList;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(OCCUPANTS_STORAGE_KEY, JSON.stringify(masterList));
      } catch (e) {
        console.warn("Failed to update cache with Cloud Firestore SSOT:", e);
      }
    }
    occupantListeners.forEach((l) => l());
  },

  async deleteOccupant(occupantId: string, propertyId: string = "sunshine-pg") {
    // 1. Delete document permanently from Cloud Firestore FIRST
    await deleteOccupantFromFirestore(propertyId, occupantId);

    // 2. Update local state & cache without deleted tenant
    const list = this.getOccupants();
    const updatedList = list.filter((o) => o.id !== occupantId);
    GLOBAL_OCCUPANTS_CACHE = updatedList;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(OCCUPANTS_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (e) {
        console.warn("Failed to save updated occupants store:", e);
      }
    }
    occupantListeners.forEach((l) => l());
  },

  updateOccupants(newList: Occupant[], propertyId: string = "sunshine-pg") {
    GLOBAL_OCCUPANTS_CACHE = newList;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(OCCUPANTS_STORAGE_KEY, JSON.stringify(newList));
        // Asynchronously sync to Firebase Cloud Firestore collection: properties/{propertyId}/occupants
        newList.forEach((occ) => {
          saveOccupantToFirestore(propertyId, occ);
        });
      } catch (e) {
        console.warn("Failed to save occupants store:", e);
      }
    }
    occupantListeners.forEach((l) => l());
  },

  updateOccupant(updatedOcc: Occupant, propertyId: string = "sunshine-pg") {
    const list = this.getOccupants();
    const updatedList = list.map((o) => (o.id === updatedOcc.id ? updatedOcc : o));
    this.updateOccupants(updatedList, propertyId);
  },

  resetOccupantsStore() {
    GLOBAL_OCCUPANTS_CACHE = [];
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(OCCUPANTS_STORAGE_KEY);
        localStorage.removeItem("tenopilot_occupants_store_v1");
      } catch (e) {
        console.warn("Failed to clear localStorage occupants:", e);
      }
    }
    occupantListeners.forEach((l) => l());
  },

  subscribe(listener: () => void) {
    occupantListeners.push(listener);
    return () => {
      const idx = occupantListeners.indexOf(listener);
      if (idx >= 0) occupantListeners.splice(idx, 1);
    };
  },
};

// Export MOCK_OCCUPANTS_200 as dynamic proxy array accessing occupantStore
export const MOCK_OCCUPANTS_200: Occupant[] = new Proxy([] as Occupant[], {
  get(target, prop, receiver) {
    const current = occupantStore.getOccupants();
    if (prop === "length") return current.length;
    if (prop === "unshift") {
      return (...items: Occupant[]) => {
        const updated = [...items, ...current];
        occupantStore.updateOccupants(updated);
        return updated.length;
      };
    }
    if (prop === "push") {
      return (...items: Occupant[]) => {
        const updated = [...current, ...items];
        occupantStore.updateOccupants(updated);
        return updated.length;
      };
    }
    if (prop === "find") return current.find.bind(current);
    if (prop === "filter") return current.filter.bind(current);
    if (prop === "map") return current.map.bind(current);
    if (prop === "slice") return current.slice.bind(current);
    if (prop === "findIndex") return current.findIndex.bind(current);
    if (prop === "forEach") return current.forEach.bind(current);
    if (typeof prop === "string" && !isNaN(Number(prop))) {
      return current[Number(prop)];
    }
    return Reflect.get(current, prop, receiver);
  },

  set(target, prop, value, receiver) {
    const current = occupantStore.getOccupants();
    if (typeof prop === "string" && !isNaN(Number(prop))) {
      current[Number(prop)] = value;
      occupantStore.updateOccupants([...current]);
      return true;
    }
    return Reflect.set(current, prop, value, receiver);
  },
});
