import { saveOccupantToFirestore } from "@/lib/firestoreService";

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
  depositStatus?: "PAID" | "PENDING" | "PARTIAL";
  partialPaidThisCycle?: number;
  arrearsBalance?: number;
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
    // Case 1: Rohan Varma (Tenant - Active, 6 Months Tenure, Fully Paid)
    {
      id: "occ-test-tenant-6m",
      name: "Rohan Varma",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RohanVarma",
      phone: "+91 98222 33445",
      email: "rohan.v@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 30,
      daysRemainingText: "—",
      rentAmount: 18000,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "02 Aug 2026",
      roomNumber: "101",
      bedCode: "BED A",
      joiningDate: "01 Feb 2026", // Joined 6 months ago!
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Infosys Labs",
      address: "Koramangala, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-3344",
      emergencyContact: { name: "Sunita Varma", phone: "+91 98222 88888", relation: "Mother" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 2: Kavya Sharma (Tenant - Active, 5 Months Tenure, Skipped Month 3, Arrears Accumulated)
    {
      id: "occ-test-tenant-skipped-month",
      name: "Kavya Sharma",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=KavyaSharma",
      phone: "+91 98333 11223",
      email: "kavya.s@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Overdue",
      daysDiff: -5,
      daysRemainingText: "5 DAYS OVERDUE",
      rentAmount: 18000,
      dueDate: "01 Aug 2026",
      dueDay: 1,
      lastPaidDate: "01 Jun 2026",
      roomNumber: "101",
      bedCode: "BED B",
      joiningDate: "01 Mar 2026", // Joined 5 months ago! Skipped May payment!
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "TCS Innovation",
      address: "Indiranagar, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-9911",
      emergencyContact: { name: "Rajesh Sharma", phone: "+91 98333 99999", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 18000, // 1 month arrears accumulated
    },
    // Case 3: Amit Singh (Tenant - Active, 4 Months Tenure, Due Today)
    {
      id: "occ-test-tenant-due-today",
      name: "Amit Singh",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=AmitSingh",
      phone: "+91 98444 22334",
      email: "amit.s@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Due",
      daysDiff: 0,
      daysRemainingText: "DUE TODAY",
      rentAmount: 14500,
      dueDate: "05 Aug 2026",
      dueDay: 5,
      lastPaidDate: "05 Jul 2026",
      roomNumber: "102",
      bedCode: "BED A",
      joiningDate: "01 Apr 2026", // Joined 4 months ago!
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Wipro Tech",
      address: "HSR Layout, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-2233",
      emergencyContact: { name: "Mahesh Singh", phone: "+91 98444 88888", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 4: Priya Nair (Tenant - Active, 3 Months Tenure, Due in 2 Days)
    {
      id: "occ-test-tenant-due-soon",
      name: "Priya Nair",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaNair",
      phone: "+91 98555 33445",
      email: "priya.n@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Due",
      daysDiff: 2,
      daysRemainingText: "Due in 2 Days",
      rentAmount: 14500,
      dueDate: "07 Aug 2026",
      dueDay: 7,
      lastPaidDate: "07 Jul 2026",
      roomNumber: "102",
      bedCode: "BED B",
      joiningDate: "01 May 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Accenture Digital",
      address: "Whitefield, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-4455",
      emergencyContact: { name: "Geeta Nair", phone: "+91 98555 77777", relation: "Mother" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 5: Vikram Patel (Tenant - Active, 2 Months Tenure, Overdue 5 Days)
    {
      id: "occ-test-tenant-overdue",
      name: "Vikram Patel",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=VikramPatel",
      phone: "+91 98666 44556",
      email: "vikram.p@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Overdue",
      daysDiff: -5,
      daysRemainingText: "5 DAYS OVERDUE",
      rentAmount: 14500,
      dueDate: "31 Jul 2026",
      dueDay: 31,
      lastPaidDate: "30 Jun 2026",
      roomNumber: "103",
      bedCode: "BED A",
      joiningDate: "01 Jun 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Amazon Dev",
      address: "Bellandur, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-5566",
      emergencyContact: { name: "Ramesh Patel", phone: "+91 98666 66666", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 14500,
    },
    // Case 6: Neha Gupta (Tenant - Notice Period, 5 Months Tenure)
    {
      id: "occ-test-tenant-notice",
      name: "Neha Gupta",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=NehaGupta",
      phone: "+91 98777 55667",
      email: "neha.g@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Notice",
      paymentStatus: "Paid",
      daysDiff: 10,
      daysRemainingText: "Vacating on 15 Aug",
      rentAmount: 14500,
      dueDate: "15 Aug 2026",
      dueDay: 15,
      lastPaidDate: "01 Jul 2026",
      roomNumber: "103",
      bedCode: "BED B",
      joiningDate: "01 Mar 2026",
      vacatingDate: "15 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Flipkart Internet",
      address: "Electronic City, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-6677",
      emergencyContact: { name: "Sanjay Gupta", phone: "+91 98777 55555", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 7: Siddharth Roy (Tenant - Booked, Future Check-In 15 Aug)
    {
      id: "occ-test-tenant-booked",
      name: "Siddharth Roy",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SiddharthRoy",
      phone: "+91 98888 66778",
      email: "siddharth.r@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Booked",
      paymentStatus: "Due",
      daysDiff: 10,
      daysRemainingText: "Due on Check-In",
      rentAmount: 14500,
      dueDate: "15 Aug 2026",
      dueDay: 15,
      lastPaidDate: "Pending Check-In",
      roomNumber: "104",
      bedCode: "BED A",
      joiningDate: "15 Aug 2026",
      kycVerified: false,
      hasPdfAgreement: true,
      workplace: "Swiggy Tech",
      address: "BTM Layout, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-7788",
      emergencyContact: { name: "Alok Roy", phone: "+91 98888 44444", relation: "Father" },
      securityDeposit: 5000,
      depositStatus: "PARTIAL",
      arrearsBalance: 0,
    },
    // Case 8: Ananya Reddy (Tenant - Past Vacated Tenant)
    {
      id: "occ-test-tenant-past",
      name: "Ananya Reddy",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=AnanyaReddy",
      phone: "+91 98999 77889",
      email: "ananya.r@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Past",
      paymentStatus: "Paid",
      daysDiff: 0,
      daysRemainingText: "Vacated",
      rentAmount: 14500,
      dueDate: "31 Jul 2026",
      dueDay: 31,
      lastPaidDate: "01 Jul 2026",
      roomNumber: "104",
      bedCode: "BED B",
      joiningDate: "01 Jan 2026",
      vacatingDate: "31 Jul 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Deloitte India",
      address: "Marathahalli, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-8899",
      emergencyContact: { name: "Venkatesh Reddy", phone: "+91 98999 33333", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 9: Bobby Deol (Guest - Active 7-Day Package, Fully Paid)
    {
      id: "occ-test-guest-today",
      name: "Bobby Deol",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=BobbyDeol",
      phone: "+91 98185 18400",
      email: "bobby.deol150@example.com",
      stayType: "Guest",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 4,
      daysRemainingText: "4 Days Remaining",
      rentAmount: 2500,
      dueDate: "09 Aug 2026",
      dueDay: 9,
      lastPaidDate: "02 Aug 2026",
      roomNumber: "107",
      bedCode: "BED A",
      joiningDate: "02 Aug 2026",
      vacatingDate: "09 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: false,
      workplace: "Exam / Corporate Visit",
      address: "Bandra West, Mumbai",
      aadhaarNumber: "XXXX-XXXX-8821",
      emergencyContact: { name: "Dharmendra Singh", phone: "+91 98185 00000", relation: "Father" },
      securityDeposit: 500,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 10: Karan Johar (Guest - Active 3-Day Package, Partial Paid)
    {
      id: "occ-test-guest-partial",
      name: "Karan Johar",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=KaranJohar",
      phone: "+91 98444 55667",
      email: "karan.j@guest.com",
      stayType: "Guest",
      lifecycleStatus: "Active",
      paymentStatus: "Due",
      daysDiff: 2,
      daysRemainingText: "2 Days Remaining",
      rentAmount: 2100,
      dueDate: "07 Aug 2026",
      dueDay: 7,
      lastPaidDate: "04 Aug 2026",
      roomNumber: "107",
      bedCode: "BED B",
      joiningDate: "04 Aug 2026",
      vacatingDate: "07 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: false,
      workplace: "Film Shooting Visit",
      address: "Juhu, Mumbai",
      aadhaarNumber: "XXXX-XXXX-7788",
      emergencyContact: { name: "Hiroo Johar", phone: "+91 98444 66666", relation: "Mother" },
      securityDeposit: 500,
      depositStatus: "PAID",
      arrearsBalance: 1100,
    },
    // Case 11: Ranbir Kapoor (Guest - Booked, Joining Tomorrow 06 Aug)
    {
      id: "occ-test-guest-booked-tomorrow",
      name: "Ranbir Kapoor",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RanbirKapoor",
      phone: "+91 98111 55443",
      email: "ranbir.k@guest.com",
      stayType: "Guest",
      lifecycleStatus: "Booked",
      paymentStatus: "Due",
      daysDiff: 1,
      daysRemainingText: "Due on Check-In",
      rentAmount: 3000,
      dueDate: "12 Aug 2026",
      dueDay: 12,
      lastPaidDate: "Pending Check-In",
      roomNumber: "606",
      bedCode: "BED B",
      joiningDate: "06 Aug 2026",
      vacatingDate: "12 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: false,
      workplace: "Pali Hill, Mumbai",
      address: "Mumbai",
      aadhaarNumber: "XXXX-XXXX-3321",
      emergencyContact: { name: "Neetu Kapoor", phone: "+91 98111 00000", relation: "Mother" },
      securityDeposit: 500,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 12: Deepika Padukone (Guest - Checkout Candidate)
    {
      id: "occ-test-guest-checkout",
      name: "Deepika Padukone",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DeepikaPadukone",
      phone: "+91 98222 66554",
      email: "deepika.p@guest.com",
      stayType: "Guest",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 0,
      daysRemainingText: "CHECKOUT TODAY",
      rentAmount: 3500,
      dueDate: "05 Aug 2026",
      dueDay: 5,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "108",
      bedCode: "BED B",
      joiningDate: "01 Aug 2026",
      vacatingDate: "05 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: false,
      workplace: "Prabhadevi, Mumbai",
      address: "Mumbai",
      aadhaarNumber: "XXXX-XXXX-4432",
      emergencyContact: { name: "Prakash Padukone", phone: "+91 98222 11111", relation: "Father" },
      securityDeposit: 500,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 13: Shah Rukh Khan (Guest - Candidate for Promotion to Tenant)
    {
      id: "occ-test-guest-promote",
      name: "Shah Rukh Khan",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ShahRukhKhan",
      phone: "+91 98333 77665",
      email: "srk@guest.com",
      stayType: "Guest",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 5,
      daysRemainingText: "5 Days Remaining",
      rentAmount: 5000,
      dueDate: "10 Aug 2026",
      dueDay: 10,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "201",
      bedCode: "BED C",
      joiningDate: "01 Aug 2026",
      vacatingDate: "10 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: false,
      workplace: "Mannat, Mumbai",
      address: "Mumbai",
      aadhaarNumber: "XXXX-XXXX-5543",
      emergencyContact: { name: "Gauri Khan", phone: "+91 98333 22222", relation: "Spouse" },
      securityDeposit: 500,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 14: Tarun Mehta (Tenant - Same Tariff Transfer Candidate)
    {
      id: "occ-test-tenant-transfer-same",
      name: "Tarun Mehta",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TarunMehta",
      phone: "+91 98444 88776",
      email: "tarun.m@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 14500,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "202",
      bedCode: "BED A",
      joiningDate: "01 Jun 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Ather Energy",
      address: "Indiranagar, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-6654",
      emergencyContact: { name: "Anand Mehta", phone: "+91 98444 33333", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 15: Meera Iyer (Tenant - Tariff Upgrade Transfer Candidate)
    {
      id: "occ-test-tenant-transfer-upgrade",
      name: "Meera Iyer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MeeraIyer",
      phone: "+91 98555 99887",
      email: "meera.i@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 14500,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "203",
      bedCode: "BED A",
      joiningDate: "01 May 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "KPMG Advisory",
      address: "MG Road, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-7765",
      emergencyContact: { name: "Srinivasan Iyer", phone: "+91 98555 44444", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 16: Arjun Das (Tenant - Tariff Downgrade Transfer Candidate)
    {
      id: "occ-test-tenant-transfer-downgrade",
      name: "Arjun Das",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ArjunDas",
      phone: "+91 98666 00998",
      email: "arjun.d@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 18000,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "108",
      bedCode: "BED A",
      joiningDate: "01 Apr 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Cisco Systems",
      address: "Outer Ring Road, Bengaluru",
      aadhaarNumber: "XXXX-XXXX-8876",
      emergencyContact: { name: "Bikram Das", phone: "+91 98666 55555", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 17: Suresh Raina (Guest - Guest Room Transfer Candidate)
    {
      id: "occ-test-guest-transfer",
      name: "Suresh Raina",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SureshRaina",
      phone: "+91 98777 11009",
      email: "suresh.r@guest.com",
      stayType: "Guest",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 6,
      daysRemainingText: "6 Days Remaining",
      rentAmount: 3500,
      dueDate: "11 Aug 2026",
      dueDay: 11,
      lastPaidDate: "04 Aug 2026",
      roomNumber: "301",
      bedCode: "BED C",
      joiningDate: "04 Aug 2026",
      vacatingDate: "11 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: false,
      workplace: "Cricket Coaching",
      address: "Ghaziabad, UP",
      aadhaarNumber: "XXXX-XXXX-9987",
      emergencyContact: { name: "Priyanka Raina", phone: "+91 98777 66666", relation: "Spouse" },
      securityDeposit: 500,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 18: Gautam Gambhir (Tenant - Privacy Mode Test Case)
    {
      id: "occ-test-tenant-privacy",
      name: "Gautam Gambhir",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GautamGambhir",
      phone: "+91 98888 22110",
      email: "gautam.g@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 14500,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "302",
      bedCode: "BED A",
      joiningDate: "01 Mar 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "BCCI Coach",
      address: "New Delhi",
      aadhaarNumber: "XXXX-XXXX-1109",
      emergencyContact: { name: "Natasha Gambhir", phone: "+91 98888 77777", relation: "Spouse" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 19: Hardik Pandya (Tenant - Batch WhatsApp Reminder Test Case)
    {
      id: "occ-test-tenant-batch-wa",
      name: "Hardik Pandya",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=HardikPandya",
      phone: "+91 98999 33221",
      email: "hardik.p@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Overdue",
      daysDiff: -3,
      daysRemainingText: "3 DAYS OVERDUE",
      rentAmount: 14500,
      dueDate: "02 Aug 2026",
      dueDay: 2,
      lastPaidDate: "02 Jul 2026",
      roomNumber: "303",
      bedCode: "BED A",
      joiningDate: "01 Jan 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "MI Captain",
      address: "Baroda, Gujarat",
      aadhaarNumber: "XXXX-XXXX-2210",
      emergencyContact: { name: "Krunal Pandya", phone: "+91 98999 88888", relation: "Brother" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 14500,
    },
    // Case 20: KL Rahul (Tenant - Multi-Attribute Search Test Case)
    {
      id: "occ-test-tenant-search",
      name: "KL Rahul",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed-[#112233]",
      phone: "+91 99887 76655",
      email: "kl.rahul@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 18000,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "401",
      bedCode: "BED A",
      joiningDate: "01 Feb 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "LSG Captain",
      address: "Mangaluru, Karnataka",
      aadhaarNumber: "4433-2211-0099",
      emergencyContact: { name: "Athiya Shetty", phone: "+91 99887 11111", relation: "Spouse" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 21: Jasprit Bumrah (Tenant - Executive Suite Floor 04)
    {
      id: "occ-test-tenant-fl4",
      name: "Jasprit Bumrah",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=JaspritBumrah",
      phone: "+91 98111 44332",
      email: "jasprit.b@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 18000,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "402",
      bedCode: "BED A",
      joiningDate: "01 Dec 2025",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Speedster Bowler",
      address: "Ahmedabad, Gujarat",
      aadhaarNumber: "XXXX-XXXX-3322",
      emergencyContact: { name: "Sanjana Ganesan", phone: "+91 98111 77777", relation: "Spouse" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 22: Ravindra Jadeja (Tenant - Penthouse Floor 05)
    {
      id: "occ-test-tenant-fl5",
      name: "Ravindra Jadeja",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RavindraJadeja",
      phone: "+91 98222 55443",
      email: "jaddu@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 18000,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "501",
      bedCode: "BED A",
      joiningDate: "01 Nov 2025",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "CSK Allrounder",
      address: "Jamnagar, Gujarat",
      aadhaarNumber: "XXXX-XXXX-4433",
      emergencyContact: { name: "Rivaba Jadeja", phone: "+91 98222 66666", relation: "Spouse" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 23: Shubman Gill (Tenant - Notice Floor 05)
    {
      id: "occ-test-tenant-fl5-notice",
      name: "Shubman Gill",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ShubmanGill",
      phone: "+91 98333 66554",
      email: "shubman.g@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Notice",
      paymentStatus: "Paid",
      daysDiff: 10,
      daysRemainingText: "Vacating on 15 Aug",
      rentAmount: 14500,
      dueDate: "15 Aug 2026",
      dueDay: 15,
      lastPaidDate: "01 Jul 2026",
      roomNumber: "502",
      bedCode: "BED A",
      joiningDate: "01 Jan 2026",
      vacatingDate: "15 Aug 2026",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "GT Captain",
      address: "Fazilka, Punjab",
      aadhaarNumber: "XXXX-XXXX-5544",
      emergencyContact: { name: "Lakhwinder Singh", phone: "+91 98333 88888", relation: "Father" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 24: Mohammed Shami (Tenant - Ground Floor Standard Suite)
    {
      id: "occ-test-tenant-fl0-1",
      name: "Mohammed Shami",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MohammedShami",
      phone: "+91 98444 77665",
      email: "shami@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 11000,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "001",
      bedCode: "BED A",
      joiningDate: "01 Oct 2025",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "Fast Bowler",
      address: "Amroha, UP",
      aadhaarNumber: "XXXX-XXXX-6655",
      emergencyContact: { name: "Touseef Ali", phone: "+91 98444 99999", relation: "Brother" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
    // Case 25: Rishabh Pant (Tenant - Ground Floor Standard Suite)
    {
      id: "occ-test-tenant-fl0-2",
      name: "Rishabh Pant",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RishabhPant",
      phone: "+91 98555 88776",
      email: "pant@example.com",
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 25,
      daysRemainingText: "—",
      rentAmount: 11000,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: "01 Aug 2026",
      roomNumber: "002",
      bedCode: "BED A",
      joiningDate: "01 Sep 2025",
      kycVerified: true,
      hasPdfAgreement: true,
      workplace: "DC Captain",
      address: "Roorkee, Uttarakhand",
      aadhaarNumber: "XXXX-XXXX-7766",
      emergencyContact: { name: "Saroj Pant", phone: "+91 98555 11111", relation: "Mother" },
      securityDeposit: 25000,
      depositStatus: "PAID",
      arrearsBalance: 0,
    },
  ];

  return curatedCases;
}

const OCCUPANTS_STORAGE_KEY = "tenopilot_occupants_store_clean_v3";
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
  // Initialize with 25 curated test cases covering full scenario range!
  GLOBAL_OCCUPANTS_CACHE = generateMockOccupants(25);
  return GLOBAL_OCCUPANTS_CACHE;
}

export const occupantStore = {
  getOccupants(): Occupant[] {
    return loadOccupants();
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
