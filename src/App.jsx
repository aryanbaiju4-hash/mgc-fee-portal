import React, { useState, useMemo, useRef } from 'react';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  ShieldCheck,
  Building2,
  User,
  Search,
  Filter,
  TrendingUp,
  Mail,
  Smartphone,
  ChevronRight,
  X,
  Sparkles,
  Bell,
  RefreshCw,
  Award,
  Printer,
  QrCode,
  Landmark,
  IndianRupee,
  FileText
} from 'lucide-react';

// Sample initial data tailored for Mar Gregorios College
const INITIAL_STUDENT = {
  id: 'MGC-2024-BCA102',
  name: 'Anandhu S. Nair',
  email: 'anandhu.bca24@mgcollege.ac.in',
  department: 'Department of Computer Applications',
  course: 'Bachelor of Computer Applications (BCA)',
  semester: 'Semester 4',
  regNo: '210021088492'
};

const INITIAL_FEES = [
  {
    id: 'FEE-MGC-001',
    studentId: 'MGC-2024-BCA102',
    title: 'Semester 4 Tuition Fee',
    category: 'Tuition',
    amount: 20000,
    dueDate: '2026-11-15',
    status: 'DUE_SOON', // PAID, PENDING, DUE_SOON, OVERDUE
    semester: 'Semester 4',
    description: '4th Semester tuition, core practical labs, and IT infrastructure charges.'
  },
  {
    id: 'FEE-MGC-002',
    studentId: 'MGC-2024-BCA102',
    title: 'Semester 3 Tuition Fee',
    category: 'Tuition',
    amount: 20000,
    dueDate: '2026-06-10',
    status: 'PAID',
    paidAt: '2026-06-04 11:20:15',
    transactionId: 'TXN-MGC-982140',
    method: 'UPI (anandhu@okaxis)',
    semester: 'Semester 3',
    description: '3rd Semester tuition and web technology lab fee.'
  },
  {
    id: 'FEE-MGC-003',
    studentId: 'MGC-2024-BCA102',
    title: 'Semester 4 University Exam & Lab Fee',
    category: 'Examination',
    amount: 2500,
    dueDate: '2026-10-30',
    status: 'OVERDUE',
    semester: 'Semester 4',
    description: 'University examination registration and practical evaluation fees.'
  },
  {
    id: 'FEE-MGC-004',
    studentId: 'MGC-2024-BCA102',
    title: 'Semester 2 Tuition Fee',
    category: 'Tuition',
    amount: 20000,
    dueDate: '2025-12-05',
    status: 'PAID',
    paidAt: '2025-11-28 15:45:00',
    transactionId: 'TXN-MGC-774102',
    method: 'Net Banking (South Indian Bank)',
    semester: 'Semester 2',
    description: '2nd Semester tuition and C++ programming lab facility charges.'
  },
  {
    id: 'FEE-MGC-005',
    studentId: 'MGC-2024-BCA102',
    title: 'Semester 1 Tuition Fee',
    category: 'Tuition',
    amount: 20000,
    dueDate: '2025-06-20',
    status: 'PAID',
    paidAt: '2025-06-12 10:10:32',
    transactionId: 'TXN-MGC-551099',
    method: 'Debit Card (**** 8821)',
    semester: 'Semester 1',
    description: '1st Semester admission and tuition fees.'
  },
  {
    id: 'FEE-MGC-006',
    studentId: 'MGC-2024-BCA102',
    title: 'Annual Library & Digital Portal Fee',
    category: 'Library',
    amount: 1500,
    dueDate: '2026-12-01',
    status: 'PENDING',
    semester: 'Semester 4',
    description: 'Central library book lending and online journal subscription fee.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'admin'
  const [fees, setFees] = useState(INITIAL_FEES);
  const [student, setStudent] = useState(INITIAL_STUDENT);
  const [logs, setLogs] = useState([
    {
      id: 'LOG-MGC-1',
      type: 'EMAIL_ALERT',
      recipient: 'anandhu.bca24@mgcollege.ac.in',
      subject: 'Reminder: Semester 4 University Exam & Lab Fee Overdue',
      timestamp: '2026-10-31 09:00:00',
      status: 'DELIVERED',
      amount: 2500
    }
  ]);

  // Payment Modal & Receipt State
  const [selectedFee, setSelectedFee] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card', 'netbanking'
  const [upiVpa, setUpiVpa] = useState('anandhu@okaxis');
  const [selectedBank, setSelectedBank] = useState('South Indian Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Admin New Fee Form State
  const [newFee, setNewFee] = useState({
    title: 'Semester 5 Tuition Fee',
    category: 'Tuition',
    amount: '20000',
    dueDate: '2027-05-15',
    semester: 'Semester 5',
    description: '5th Semester tuition and software engineering project lab.'
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Computed Financial Metrics (in Rupees)
  const metrics = useMemo(() => {
    let totalDue = 0;
    let totalPaid = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let nextDue = null;

    fees.forEach((fee) => {
      if (fee.status === 'PAID') {
        totalPaid += fee.amount;
      } else {
        totalDue += fee.amount;
        if (fee.status === 'OVERDUE') {
          overdueCount++;
          overdueAmount += fee.amount;
        }

        const feeDate = new Date(fee.dueDate);
        if (!nextDue || feeDate < new Date(nextDue.dueDate)) {
          nextDue = fee;
        }
      }
    });

    return { totalDue, totalPaid, overdueAmount, overdueCount, nextDue };
  }, [fees]);

  // Filtered Fee Schedule
  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      const matchesSearch =
        fee.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fee.semester.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fee.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ? true : fee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [fees, searchQuery, statusFilter]);

  // Handle Pay Modal Opening
  const handleOpenPayModal = (fee) => {
    setSelectedFee(fee);
    setPaymentSuccessData(null);
    setIsPayModalOpen(true);
  };

  // Simulate Razorpay Gateway Processing
  const handleProcessPayment = () => {
    if (!selectedFee) return;
    setIsProcessing(true);

    setTimeout(() => {
      const now = new Date();
      const formattedTimestamp = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}-${String(now.getDate()).padStart(
        2,
        '0'
      )} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const mockTxnId =
        'TXN-MGC-' + Math.floor(100000 + Math.random() * 900000);

      let methodLabel = `UPI (${upiVpa})`;
      if (paymentMethod === 'card') methodLabel = 'Credit/Debit Card (**** 4242)';
      if (paymentMethod === 'netbanking') methodLabel = `Net Banking (${selectedBank})`;

      // Update Fee Record
      setFees((prevFees) =>
        prevFees.map((f) =>
          f.id === selectedFee.id
            ? {
                ...f,
                status: 'PAID',
                paidAt: formattedTimestamp,
                transactionId: mockTxnId,
                method: methodLabel
              }
            : f
        )
      );

      // Log Payment Dispatch
      const newLog = {
        id: 'LOG-MGC-' + (logs.length + 1),
        type: 'RECEIPT_SENT',
        recipient: student.email,
        subject: `Payment Confirmation: ${selectedFee.title}`,
        timestamp: formattedTimestamp,
        status: 'DELIVERED',
        amount: selectedFee.amount
      };
      setLogs((prev) => [newLog, ...prev]);

      setPaymentSuccessData({
        txnId: mockTxnId,
        paidAt: formattedTimestamp,
        amount: selectedFee.amount,
        title: selectedFee.title,
        method: methodLabel,
        semester: selectedFee.semester
      });

      setIsProcessing(false);
    }, 1800);
  };

  // Simulate Automated Reminder Alerts
  const handleTriggerAutomatedReminders = () => {
    const today = new Date();
    const upcomingDays = new Date();
    upcomingDays.setDate(today.getDate() + 7);

    const targetFees = fees.filter(
      (f) =>
        f.status === 'OVERDUE' ||
        f.status === 'DUE_SOON' ||
        (f.status === 'PENDING' && new Date(f.dueDate) <= upcomingDays)
    );

    if (targetFees.length === 0) {
      alert('No pending or upcoming fees require reminders at this time.');
      return;
    }

    const newLogs = targetFees.map((fee, idx) => ({
      id: `LOG-MGC-${logs.length + idx + 1}`,
      type: 'AUTO_REMINDER',
      recipient: student.email,
      subject: `Urgent Payment Notice: ${fee.title} due on ${fee.dueDate}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'DELIVERED',
      amount: fee.amount
    }));

    setLogs((prev) => [...newLogs, ...prev]);
    alert(
      `Automated email alerts sent successfully to ${student.email} for ${targetFees.length} fee item(s).`
    );
  };

  // Admin: Post New Fee Schedule
  const handleCreateFee = (e) => {
    e.preventDefault();
    if (!newFee.title || !newFee.amount || !newFee.dueDate) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let initialStatus = 'PENDING';
    if (newFee.dueDate < todayStr) {
      initialStatus = 'OVERDUE';
    } else if (
      new Date(newFee.dueDate).getTime() - new Date().getTime() <
      10 * 24 * 60 * 60 * 1000
    ) {
      initialStatus = 'DUE_SOON';
    }

    const createdItem = {
      id: 'FEE-MGC-00' + (fees.length + 1),
      studentId: student.id,
      title: newFee.title,
      category: newFee.category,
      amount: parseFloat(newFee.amount),
      dueDate: newFee.dueDate,
      status: initialStatus,
      semester: newFee.semester,
      description:
        newFee.description || 'Assigned by MGC Financial Administration Office.'
    };

    setFees([createdItem, ...fees]);

    setLogs((prev) => [
      {
        id: 'LOG-MGC-' + (logs.length + 1),
        type: 'NEW_FEE_POSTED',
        recipient: student.email,
        subject: `New Fee Assessed: ${newFee.title} (₹${parseFloat(
          newFee.amount
        ).toLocaleString('en-IN')})`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'DELIVERED',
        amount: parseFloat(newFee.amount)
      },
      ...prev
    ]);

    setNewFee({
      title: 'Semester 5 Tuition Fee',
      category: 'Tuition',
      amount: '20000',
      dueDate: '',
      semester: 'Semester 5',
      description: ''
    });
  };

  // Helper function for status badges
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 size={12} /> Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
            <AlertCircle size={12} /> Overdue
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock size={12} /> Due Soon
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-12">
      {/* College Branded Sticky Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
            {/* College Logo & Name */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-tr from-amber-500 to-indigo-600 p-2.5 rounded-2xl text-white shadow-lg">
                <Landmark className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex flex-wrap items-center gap-2">
                  Mar Gregorios College of Arts and Science, Punnapra
                </h1>
                <p className="text-xs text-indigo-300 font-medium">
                  Student Online Fee Payment & Management Portal
                </p>
              </div>
            </div>

            {/* Portal Navigation Toggle */}
            <div className="flex items-center self-end md:self-auto bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setActiveTab('student')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'student'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User size={14} />
                <span>Student View</span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck size={14} />
                <span>Admin Panel</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Student Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-900 text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-indigo-200 dark:border-indigo-800">
              {student.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {student.name}
                </h2>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200 dark:border-indigo-800">
                  Reg No: {student.regNo}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {student.course} &bull; {student.semester}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                <Mail size={12} /> {student.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 w-full md:w-auto">
            <div className="pr-4 border-r border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block">Student ID</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {student.id}
              </span>
            </div>
            <div className="pl-1">
              <span className="text-slate-400 block">Standard Fee Rate</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                ₹20,000 / Sem
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Financial Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Total Unpaid Dues */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Unpaid Dues
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <IndianRupee size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{metrics.totalDue.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock size={12} /> Pending payment clearance
            </p>
          </div>

          {/* Card 2: Total Paid */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Fees Paid
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{metrics.totalPaid.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> Verified College Receipts
            </p>
          </div>

          {/* Card 3: Overdue Amount */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Overdue Amount
              </span>
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <AlertCircle size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-2xl font-black text-red-600 dark:text-red-400">
                ₹{metrics.overdueAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              {metrics.overdueCount > 0
                ? `${metrics.overdueCount} fee item(s) past deadline`
                : 'No overdue fees'}
            </p>
          </div>

          {/* Card 4: Next Due Date Countdown */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Next Upcoming Due
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Calendar size={20} />
              </div>
            </div>
            <div className="mt-3">
              {metrics.nextDue ? (
                <div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {metrics.nextDue.dueDate}
                  </span>
                  <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                    {metrics.nextDue.title}
                  </p>
                </div>
              ) : (
                <span className="text-base font-semibold text-slate-500">
                  All fees cleared!
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Sparkles size={12} /> Auto-reminder active
            </p>
          </div>
        </div>

        {/* Dynamic Views */}
        {activeTab === 'student' ? (
          /* =========================================================
                             STUDENT PORTAL VIEW
             ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Fee Schedule List (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter and Search Bar */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search
                    className="absolute left-3 top-2.5 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search by fee title, semester..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OVERDUE">Overdue Only</option>
                    <option value="DUE_SOON">Due Soon</option>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
              </div>

              {/* Fee Cards List */}
              <div className="space-y-3">
                {filteredFees.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 text-xs">
                      No fee records found matching your filter options.
                    </p>
                  </div>
                ) : (
                  filteredFees.map((fee) => (
                    <div
                      key={fee.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800">
                              {fee.semester}
                            </span>
                            <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                              {fee.category}
                            </span>
                            {renderStatusBadge(fee.status)}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                            {fee.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                            {fee.description}
                          </p>
                        </div>

                        {/* Amount & Action Button */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                              Fee Amount
                            </span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                              ₹{fee.amount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="mt-2">
                            {fee.status === 'PAID' ? (
                              <button
                                onClick={() => handleOpenPayModal(fee)}
                                className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              >
                                <FileText size={13} /> View Receipt
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenPayModal(fee)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                              >
                                <CreditCard size={14} />
                                Pay ₹{fee.amount.toLocaleString('en-IN')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} />
                          <span>
                            Due Date:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {fee.dueDate}
                            </strong>
                          </span>
                        </div>
                        {fee.status === 'PAID' && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            Cleared on {fee.paidAt}
                          </div>
                        )}
                        {fee.status !== 'PAID' && (
                          <span className="text-[11px] text-slate-400">
                            Pay via Razorpay / UPI / NetBanking
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notification Activity Feed & Quick Actions (Right Column) */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                    <Bell size={16} className="text-indigo-500" /> Automated Alert Logs
                  </h3>
                  <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Log of email notifications dispatched regarding due dates and receipts.
                </p>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-[11px]">
                          <Mail size={12} /> {log.type}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {log.timestamp}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {log.subject}
                      </p>
                      <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                        <span>{log.recipient}</span>
                        <span className="text-emerald-600 font-bold">
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* College Treasury Notice */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800 shadow-sm">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
                  <Award size={16} /> Mar Gregorios Financial Instructions
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Semester tuition fees (₹20,000 per term) must be paid before
                  the announced terminal examination date. Online payments via UPI and
                  NetBanking generate instant official bank digital receipts.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================
                              ADMIN PANEL VIEW
             ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Admin Form: Add Fee Schedule */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                <Plus className="text-indigo-600" size={18} /> Assign New Fee
                Schedule
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Assign a semester fee assessment to student{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {student.name} ({student.regNo})
                </strong>
                .
              </p>

              <form onSubmit={handleCreateFee} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Fee Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Semester 5 Tuition Fee"
                    value={newFee.title}
                    onChange={(e) =>
                      setNewFee({ ...newFee, title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Semester
                    </label>
                    <select
                      value={newFee.semester}
                      onChange={(e) =>
                        setNewFee({ ...newFee, semester: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                      <option value="Semester 3">Semester 3</option>
                      <option value="Semester 4">Semester 4</option>
                      <option value="Semester 5">Semester 5</option>
                      <option value="Semester 6">Semester 6</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="20000"
                      value={newFee.amount}
                      onChange={(e) =>
                        setNewFee({ ...newFee, amount: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Category
                    </label>
                    <select
                      value={newFee.category}
                      onChange={(e) =>
                        setNewFee({ ...newFee, category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Tuition">Tuition</option>
                      <option value="Examination">Examination</option>
                      <option value="Library">Library</option>
                      <option value="Special Lab">Special Lab</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newFee.dueDate}
                      onChange={(e) =>
                        setNewFee({ ...newFee, dueDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Fee Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details..."
                    value={newFee.description}
                    onChange={(e) =>
                      setNewFee({ ...newFee, description: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Post Fee Assessment
                </button>
              </form>
            </div>

            {/* Admin Master List & Automated Reminders Bar */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    College Fee Ledger & Reminder Controls
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live database register for student {student.name} ({student.regNo}).
                  </p>
                </div>

                <button
                  onClick={handleTriggerAutomatedReminders}
                  className="px-3.5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send size={13} /> Send Automated Reminder Alerts
                </button>
              </div>

              {/* Master Register Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-3 py-2.5 rounded-l-lg">Title & ID</th>
                      <th className="px-3 py-2.5">Semester</th>
                      <th className="px-3 py-2.5">Amount (₹)</th>
                      <th className="px-3 py-2.5">Due Date</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fees.map((fee) => (
                      <tr
                        key={fee.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-3 py-3">
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {fee.id}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {fee.title}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-medium">
                          {fee.semester}
                        </td>
                        <td className="px-3 py-3 font-black text-slate-900 dark:text-white">
                          ₹{fee.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                          {fee.dueDate}
                        </td>
                        <td className="px-3 py-3">
                          {renderStatusBadge(fee.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================
               RAZORPAY PAYMENT GATEWAY MODAL & DIGITAL RECEIPT
         ========================================================= */}
      {isPayModalOpen && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative">
            {/* Modal Top Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <Landmark size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    Mar Gregorios College Online Payment
                  </h3>
                  <p className="text-[10px] text-indigo-300 font-medium">
                    Powered by Razorpay / Gateway Sandbox
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {paymentSuccessData || selectedFee.status === 'PAID' ? (
                /* Printable Official Digital Fee Receipt */
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-5 rounded-2xl text-center relative">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 size={28} />
                    </div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      OFFICIAL PAYMENT RECEIPT
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Mar Gregorios College of Arts and Science, Punnapra
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-left text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Student Name:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {student.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Register No:</span>
                        <span className="font-mono">{student.regNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fee Assessment:</span>
                        <span className="font-bold">{selectedFee.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Transaction ID:</span>
                        <span className="font-mono font-semibold text-indigo-600">
                          {selectedFee.transactionId ||
                            paymentSuccessData?.txnId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payment Method:</span>
                        <span className="font-medium">
                          {selectedFee.method || paymentSuccessData?.method}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date & Time:</span>
                        <span>
                          {selectedFee.paidAt || paymentSuccessData?.paidAt}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          Total Amount Paid:
                        </span>
                        <span className="font-black text-emerald-600 text-base">
                          ₹
                          {selectedFee.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Printer size={14} /> Print Receipt
                    </button>
                    <button
                      onClick={() => setIsPayModalOpen(false)}
                      className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Razorpay Gateway Simulator View */
                <>
                  {/* Fee Summary Banner */}
                  <div className="bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider block">
                        Assessed Amount
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                        {selectedFee.title}
                      </h4>
                      <span className="text-xs text-slate-500">
                        {selectedFee.semester}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                        ₹{selectedFee.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector Tabs */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Choose Payment Method
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          paymentMethod === 'upi'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <QrCode size={18} className="mx-auto mb-1" />
                        <span className="text-[11px] block">UPI / QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('netbanking')}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          paymentMethod === 'netbanking'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <Landmark size={18} className="mx-auto mb-1" />
                        <span className="text-[11px] block">NetBanking</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          paymentMethod === 'card'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <CreditCard size={18} className="mx-auto mb-1" />
                        <span className="text-[11px] block">Card</span>
                      </button>
                    </div>
                  </div>

                  {/* Method Content */}
                  {paymentMethod === 'upi' && (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <label className="text-slate-600 dark:text-slate-400 block font-medium mb-1">
                          Enter UPI ID (VPA)
                        </label>
                        <input
                          type="text"
                          value={upiVpa}
                          onChange={(e) => setUpiVpa(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">
                        Supports Google Pay, PhonePe, Paytm, BHIM UPI
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                      <label className="text-slate-600 dark:text-slate-400 block font-medium">
                        Select Kerala / Preferred Bank
                      </label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                      >
                        <option value="South Indian Bank">South Indian Bank</option>
                        <option value="Federal Bank">Federal Bank</option>
                        <option value="State Bank of India">State Bank of India (SBI)</option>
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="Canara Bank">Canara Bank</option>
                      </select>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="text-slate-500 block mb-1">
                          Test Card Number
                        </label>
                        <input
                          type="text"
                          readOnly
                          value="4532 •••• •••• 8821"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-500 block mb-1">
                            Expiry
                          </label>
                          <input
                            type="text"
                            readOnly
                            value="08 / 29"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            readOnly
                            value="882"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Pay Button */}
                  <button
                    onClick={handleProcessPayment}
                    disabled={isProcessing}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Verifying Signature & Processing...
                      </>
                    ) : (
                      <>
                        Pay ₹{selectedFee.amount.toLocaleString('en-IN')} Now
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}