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
}

const firstNames = [
  "Rajesh", "Priya", "Vikram", "Ananya", "Kavya", "Arjun", "Suresh", "Fatima",
  "Rohan", "Harpreet", "Deepa", "Rahul", "Neha", "Amit", "Sneha", "Aditya",
  "Meera", "Siddharth", "Pooja", "Varun", "Ritu", "Karan", "Divya", "Manish",
  "Shweta", "Abhishek", "Aarti", "Gautam", "Tarun", "Tanvi", "Nikhil", "Bhavna",
  "Aakash", "Sunita", "Deepak", "Swati", "Venkatesh", "Kavita", "Ramesh", "Lakshmi",
  "Prashanth", "Anjali", "Sanjay", "Preeti", "Kiran", "Nisha", "Manoj", "Pallavi"
];

const lastNames = [
  "Sharma", "Patel", "Reddy", "Iyer", "Nair", "Mehta", "Kumar", "Begum",
  "Singh", "Kulkarni", "Verma", "Rao", "Joshi", "Deshmukh", "Gupta", "Agarwal",
  "Banerjee", "Chatterjee", "Pandey", "Mishra", "Choudhury", "Pillai", "Menon", "Sen"
];

const roomNumbers = [
  "101", "102", "103", "104", "105", "106", "107", "108",
  "201", "202", "203", "204", "205", "206", "207", "208",
  "301", "302", "303", "304", "305", "306", "307", "308"
];

const bedCodes = ["Bed A", "Bed B", "Bed C"];

export function generateMockOccupants(count = 200): Occupant[] {
  const occupants: Occupant[] = [];
  const currentYear = 2026;
  const currentMonth = 7; // August (0-indexed 7)
  const currentDay = 1; // August 1st 2026 reference

  for (let i = 1; i <= count; i++) {
    const fn = firstNames[(i * 3) % firstNames.length];
    const ln = lastNames[(i * 5) % lastNames.length];
    const name = `${fn} ${ln}`;
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

    const dueDay = (i % 10) + 1; // Days 1 to 10 of August 2026
    const daysDiff = dueDay - currentDay; // August 1 reference

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
      daysRemainingText = "—"; // Clean hyphen for paid occupants per user request
      lastPaidDate = `01 Aug 2026`;
    }

    const joiningDate = `10 Oct 2023`;
    const dueDateFormatted = `${dueDay.toString().padStart(2, "0")} Aug 2026`;

    occupants.push({
      id: `occ-${1000 + i}`,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fn}${ln}`,
      phone: `+91 ${9800000000 + (i * 123456) % 900000000}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
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

export const MOCK_OCCUPANTS_200 = generateMockOccupants(200);
