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
  "Prashanth", "Anjali", "Sanjay", "Preeti", "Kiran", "Nisha", "Manoj", "Pallavi",
  "Yash", "Roshni", "Ashok", "Sita", "Vijay", "Usha", "Vinay", "Radha"
];

const lastNames = [
  "Sharma", "Patel", "Reddy", "Iyer", "Nair", "Mehta", "Kumar", "Begum",
  "Singh", "Kulkarni", "Verma", "Rao", "Joshi", "Deshmukh", "Gupta", "Agarwal",
  "Banerjee", "Chatterjee", "Pandey", "Mishra", "Choudhury", "Pillai", "Menon", "Sen",
  "Dhar", "Bhat", "Hegde", "Shetty", "Gowda", "Naidu", "Chowdary", "Kapoor",
  "Khanna", "Malhotra", "Bhasin", "Seth", "Gill", "Dhillon", "Saini", "Chawla"
];

const roomNumbers = [
  "101", "102", "103", "104", "105", "106", "107", "108",
  "201", "202", "203", "204", "205", "206", "207", "208",
  "301", "302", "303", "304", "305", "306", "307", "308",
  "401", "402", "403", "404", "405", "406", "407", "408"
];

const bedCodes = ["Bed A", "Bed B", "Bed C"];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(startYear = 2023, endYear = 2026): string {
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day.toString().padStart(2, "0")} ${months[month - 1]} ${year}`;
}

export function generateMockOccupants(count = 200): Occupant[] {
  const occupants: Occupant[] = [];

  for (let i = 1; i <= count; i++) {
    const fn = firstNames[(i * 3) % firstNames.length];
    const ln = lastNames[(i * 5) % lastNames.length];
    const name = `${fn} ${ln}`;
    const room = roomNumbers[i % roomNumbers.length];
    const bed = bedCodes[i % bedCodes.length];

    // Determine stay type & lifecycle status
    let stayType: "Tenant" | "Guest" = "Tenant";
    let lifecycleStatus: "Active" | "Booked" | "Notice" | "Past" = "Active";
    let paymentStatus: "Paid" | "Due" | "Overdue" = "Paid";
    let rentAmount = 12500;

    if (i % 6 === 0) {
      stayType = "Guest"; // ~33 Guests
      rentAmount = 1800; // daily / short stay
    }

    if (i <= 10) {
      lifecycleStatus = "Past";
      paymentStatus = "Paid";
    } else if (i > 10 && i <= 25) {
      lifecycleStatus = "Notice";
      paymentStatus = "Due";
    } else if (i > 25 && i <= 40) {
      lifecycleStatus = "Booked";
      paymentStatus = "Paid";
    } else if (i > 40 && i <= 60) {
      paymentStatus = "Overdue";
      rentAmount = 14000;
    } else if (i > 60 && i <= 100) {
      paymentStatus = "Due";
    }

    const joiningDate = getRandomDate(2023, 2026);
    let vacatingDate: string | undefined = undefined;
    if (lifecycleStatus === "Notice") {
      vacatingDate = "15 Aug 2026";
    } else if (lifecycleStatus === "Past") {
      vacatingDate = "30 May 2025";
    }

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
      vacatingDate,
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
