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

export function generateMockOccupants(count = 200): Occupant[] {
  const occupants: Occupant[] = [];
  const currentDay = 1; // August 1st 2026 reference

  for (let i = 1; i <= count; i++) {
    const name = UNIQUE_INDIAN_NAMES[(i - 1) % UNIQUE_INDIAN_NAMES.length];
    const nameParts = name.split(" ");
    const fn = nameParts[0];
    const ln = nameParts.slice(1).join(" ") || "Kumar";
    const room = roomNumbers[i % roomNumbers.length];
    const bed = bedCodes[i % bedCodes.length];

    let stayType: "Tenant" | "Guest" = "Tenant";
    let lifecycleStatus: "Active" | "Booked" | "Notice" | "Past" = "Active";
    let paymentStatus: "Paid" | "Due" | "Overdue" = "Paid";
    let rentAmount = 14500;

    if (i % 6 === 0) {
      stayType = "Guest";
      rentAmount = 2500;
    }

    const dueDay = (i % 10) + 1;
    const daysDiff = dueDay - currentDay;

    let daysRemainingText = "—";
    let lastPaidDate = `01 Jul 2026`;

    if (i <= 10) {
      lifecycleStatus = "Past";
      paymentStatus = "Paid";
      daysRemainingText = "—";
      lastPaidDate = `30 May 2025`;
    } else if (i > 10 && i <= 25) {
      lifecycleStatus = "Notice";
      if (daysDiff < 0) {
        paymentStatus = "Overdue";
        daysRemainingText = `${Math.abs(daysDiff)} DAYS OVERDUE`;
        lastPaidDate = `01 Jun 2026`;
      } else {
        paymentStatus = "Due";
        daysRemainingText = daysDiff === 0 ? "DUE TODAY" : daysDiff === 1 ? "DUE TOMORROW" : `Due in ${daysDiff} Days`;
        lastPaidDate = `01 Jul 2026`;
      }
    } else if (i > 25 && i <= 40) {
      lifecycleStatus = "Booked";
      paymentStatus = "Paid";
      daysRemainingText = "—";
      lastPaidDate = `15 Jul 2026`;
    } else if (i > 40 && i <= 60) {
      paymentStatus = "Overdue";
      const overdueDays = (i % 5) + 1;
      daysRemainingText = `${overdueDays} DAYS OVERDUE`;
      lastPaidDate = `01 Jun 2026`;
    } else if (i > 60 && i <= 120) {
      paymentStatus = "Due";
      lastPaidDate = `01 Jul 2026`;
      if (daysDiff === 0) {
        daysRemainingText = "DUE TODAY";
      } else if (daysDiff === 1) {
        daysRemainingText = "DUE TOMORROW";
      } else {
        daysRemainingText = `Due in ${daysDiff} Days`;
      }
    } else {
      paymentStatus = "Paid";
      daysRemainingText = "—";
      lastPaidDate = `01 Aug 2026`;
    }

    const joiningDate = `10 Oct 2023`;
    const dueDateFormatted = `${dueDay.toString().padStart(2, "0")} Aug 2026`;

    occupants.push({
      id: `occ-${1000 + i}`,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fn}${ln}${i}`,
      phone: `+91 ${9800000000 + (i * 123456) % 900000000}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase().replace(/\s+/g, "")}${i}@example.com`,
      stayType,
      roomNumber: room,
      bedCode: bed,
      joiningDate,
      lastPaidDate,
      dueDate: dueDateFormatted,
      dueDay,
      daysRemainingText,
      daysDiff,
      vacatingDate: lifecycleStatus === "Notice" ? "15 Aug 2026" : undefined,
      rentAmount,
      paymentStatus,
      lifecycleStatus,
      aadhaarNumber: `XXXX-XXXX-${(1000 + i * 7) % 9000 + 1000}`,
      emergencyContact: {
        name: `Suresh ${ln}`,
        phone: `+91 98765${(10000 + i * 3) % 90000}`,
        relation: i % 2 === 0 ? "Father" : "Mother",
      },
    });
  }

  return occupants;
}

const OCCUPANTS_STORAGE_KEY = "tenopilot_occupants_store_v1";
let GLOBAL_OCCUPANTS_CACHE: Occupant[] | null = null;
const occupantListeners: Array<() => void> = [];

function loadOccupants(): Occupant[] {
  if (GLOBAL_OCCUPANTS_CACHE) return GLOBAL_OCCUPANTS_CACHE;
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(OCCUPANTS_STORAGE_KEY);
      if (saved) {
        GLOBAL_OCCUPANTS_CACHE = JSON.parse(saved);
        return GLOBAL_OCCUPANTS_CACHE!;
      }
    } catch (e) {
      console.warn("Failed to load occupants from localStorage", e);
    }
  }
  GLOBAL_OCCUPANTS_CACHE = generateMockOccupants(200);
  return GLOBAL_OCCUPANTS_CACHE;
}

export const occupantStore = {
  getOccupants(): Occupant[] {
    return loadOccupants();
  },

  updateOccupants(newList: Occupant[]) {
    GLOBAL_OCCUPANTS_CACHE = newList;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(OCCUPANTS_STORAGE_KEY, JSON.stringify(newList));
      } catch (e) {
        console.warn("Failed to save occupants to localStorage", e);
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
