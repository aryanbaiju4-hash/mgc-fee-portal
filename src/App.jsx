import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { sendFeeEmailNotification } from './services/emailService';
import { 
  UserCheck, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  LogOut,
  Mail,
  Lock,
  User,
  BookOpen,
  Loader2,
  Receipt,
  GraduationCap,
  Users,
  Search,
  Send,
  Edit2,
  Trash2,
  X,
  Save,
  MapPin,
  Award,
  Globe,
  KeyRound,
  UserX,
  Key,
  Wifi
} from 'lucide-react';

export default function App() {
  const SECRET_ADMIN_KEY = "MGC-ADMIN-SECRET-2026";

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // Session & Profile State
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Auth Form State
  const [authMode, setAuthMode] = useState('signin');
  const [selectedRole, setSelectedRole] = useState('student');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [department, setDepartment] = useState('BCA (AI & Machine Learning)');
  const [semester, setSemester] = useState('Semester 3 (Year 2)');
  const [authError, setAuthError] = useState('');

  // OTP Verification State
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Dashboard & Fee State
  const [activeTab, setActiveTab] = useState('studentView');
  const [fees, setFees] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);

  // Admin Directory State
  const [studentsList, setStudentsList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingStudentId, setDeletingStudentId] = useState(null);

  // Admin Publish Fee Form State
  const [targetType, setTargetType] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeDesc, setNewFeeDesc] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDueDate, setNewFeeDueDate] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Fee Edit Modal State
  const [editingFee, setEditingFee] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState('Pending');
  const [savingEdit, setSavingEdit] = useState(false);

  const collegeDepartments = [
    'BCA (AI & Machine Learning)',
    'BCA (Cyber Security & Data Science)',
    'B.Com Taxation & GST',
    'B.Com Finance (ACCA)',
    'B.Com Logistics & Supply Chain',
    'B.Sc Psychology with Hospital Admin',
    'B.A English Language & Literature',
    'BBA Aviation & Corporate Admin',
    'M.Com Corporate Management',
    'M.A English Literature'
  ];

  const collegeSemesters = [
    'Semester 1 (Year 1)',
    'Semester 2 (Year 1)',
    'Semester 3 (Year 2)',
    'Semester 4 (Year 2)',
    'Semester 5 (Year 3)',
    'Semester 6 (Year 3)'
  ];

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (data && !error) {
        setProfile(data);
        setActiveTab(data.role === 'admin' ? 'adminPanel' : 'studentView');
      } else {
        const fallbackProfile = {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || (selectedRole === 'admin' ? 'College Administrator' : 'Student Name'),
          role: authUser.user_metadata?.role || selectedRole,
          reg_no: authUser.user_metadata?.reg_no || (selectedRole === 'admin' ? 'ADMIN-OFFICER' : 'N/A'),
          department: authUser.user_metadata?.department || 'BCA (AI & Machine Learning)',
          semester: authUser.user_metadata?.semester || 'Semester 3 (Year 2)'
        };
        setProfile(fallbackProfile);
        setActiveTab(fallbackProfile.role === 'admin' ? 'adminPanel' : 'studentView');
      }
    } catch (err) {
      console.warn('Profile fetch warning (using fallback):', err);
      const fallbackProfile = {
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || 'Portal User',
        role: selectedRole,
        reg_no: 'N/A',
        department: 'BCA',
        semester: 'Semester 3'
      };
      setProfile(fallbackProfile);
      setActiveTab(selectedRole === 'admin' ? 'adminPanel' : 'studentView');
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  const syncGlobalFeesToStudent = useCallback(async (studentId) => {
    try {
      const { data: globalFees, error: fetchErr } = await supabase
        .from('fee_records')
        .select('*')
        .eq('target_type', 'all')
        .is('student_id', null);

      if (fetchErr || !globalFees || globalFees.length === 0) return;

      const { data: existingFees } = await supabase
        .from('fee_records')
        .select('title, due_date')
        .eq('student_id', studentId);

      const existingSet = new Set(
        (existingFees || []).map((f) => `${f.title}-${f.due_date}`)
      );

      const missingFees = [];
      globalFees.forEach((gf) => {
        const key = `${gf.title}-${gf.due_date}`;
        if (!existingSet.has(key)) {
          missingFees.push({
            student_id: studentId,
            title: gf.title,
            description: gf.description,
            amount: gf.amount,
            due_date: gf.due_date,
            status: 'Pending',
            target_type: 'all'
          });
          existingSet.add(key);
        }
      });

      if (missingFees.length > 0) {
        await supabase.from('fee_records').insert(missingFees);
      }
    } catch (err) {
      console.error('Error syncing fees:', err);
    }
  }, []);

  const fetchFees = useCallback(async () => {
    if (!session) return;
    setFeesLoading(true);
    try {
      if (profile?.role === 'student') {
        await syncGlobalFeesToStudent(session.user.id);
      }

      let { data, error } = await supabase
        .from('fee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (profile?.role === 'student') {
        data = (data || []).filter((f) => f.student_id === session.user.id);
      } else if (profile?.role === 'admin') {
        data = (data || []).filter(
          (f) => f.target_type === 'specific' || (f.target_type === 'all' && f.student_id === null)
        );
      }

      const uniqueFeesMap = new Map();
      (data || []).forEach((item) => {
        const key = `${item.title}-${item.due_date}`;
        if (!uniqueFeesMap.has(key)) {
          uniqueFeesMap.set(key, item);
        }
      });

      setFees(Array.from(uniqueFeesMap.values()));
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setFeesLoading(false);
    }
  }, [profile, session, syncGlobalFeesToStudent]);

  const fetchAllStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStudentsList(data || []);
      if (data && data.length > 0 && !selectedStudentId) {
        setSelectedStudentId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching student directory:', err);
    } finally {
      setStudentsLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (session && profile) {
      void (async () => {
        await fetchFees();
        if (profile.role === 'admin') {
          await fetchAllStudents();
        }
      })();

      const feeChannel = supabase
        .channel('realtime_fee_updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fee_records' },
          () => fetchFees()
        )
        .subscribe();

      const profileChannel = supabase
        .channel('realtime_profile_updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            if (profile.role === 'admin') fetchAllStudents();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(feeChannel);
        supabase.removeChannel(profileChannel);
      };
    }
  }, [session, profile, fetchFees, fetchAllStudents]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        if (selectedRole === 'admin') {
          if (adminSecretKey.trim() !== SECRET_ADMIN_KEY) {
            throw new Error("Invalid Secret Admin Key! Access denied.");
          }
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || (selectedRole === 'admin' ? 'College Administrator' : 'Student Name'),
              role: selectedRole,
              reg_no: selectedRole === 'admin' ? 'ADMIN-OFFICER' : regNo,
              department: selectedRole === 'admin' ? 'Administration' : department,
              semester: selectedRole === 'admin' ? 'N/A' : semester
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          setAwaitingOtp(true);
          alert(`Verification OTP sent to ${email}. Check your inbox.`);
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (signInData.user) {
          await fetchProfile(signInData.user);
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup'
      });

      if (error) throw error;

      if (data.session) {
        setAwaitingOtp(false);
        if (selectedRole === 'student') {
          await syncGlobalFeesToStudent(data.session.user.id);
        }
        await fetchProfile(data.session.user);
      }
    } catch (err) {
      setAuthError(err.message || 'Invalid OTP code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setEmail('');
    setPassword('');
    setAdminSecretKey('');
    setAwaitingOtp(false);
    setOtpCode('');
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete "${studentName}"?`)) {
      return;
    }

    setDeletingStudentId(studentId);
    try {
      await supabase.from('fee_records').delete().eq('student_id', studentId);
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', studentId);

      if (profileDeleteError) throw profileDeleteError;

      setStudentsList((prevList) => prevList.filter((st) => st.id !== studentId));

      alert(`Student account for "${studentName}" deleted successfully.`);
      fetchFees();
    } catch (err) {
      console.error('Error removing student:', err);
      alert(err.message || 'Failed to remove student record.');
    } finally {
      setDeletingStudentId(null);
    }
  };

  const handleInitiateRazorpay = (feeItem) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
      amount: feeItem.amount * 100,
      currency: 'INR',
      name: 'Mar Gregorios College, Punnapra',
      description: `Payment for ${feeItem.title}`,
      image: '/logo.png',
      handler: async function (response) {
        await handlePaymentSuccess(feeItem.id, response.razorpay_payment_id, feeItem.amount);
      },
      prefill: {
        name: profile?.full_name || 'Student Name',
        email: session?.user?.email || ''
      },
      theme: { color: '#1d4ed8' }
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      alert('Razorpay SDK failed to load.');
    }
  };

  const handlePaymentSuccess = async (feeId, razorpayPaymentId, feeAmount) => {
    try {
      const { error: feeErr } = await supabase
        .from('fee_records')
        .update({ status: 'Paid' })
        .eq('id', feeId);

      if (feeErr) throw feeErr;

      const { error: txErr } = await supabase
        .from('transactions')
        .insert([
          {
            fee_id: feeId,
            student_id: session.user.id,
            razorpay_payment_id: razorpayPaymentId,
            amount: feeAmount,
            status: 'success'
          }
        ]);

      if (txErr) throw txErr;

      await fetchFees();
      alert(`Payment Successful! Receipt ID: ${razorpayPaymentId}`);
    } catch (err) {
      console.error('Payment processing failed:', err);
      alert('Payment succeeded on gateway but failed to update status locally.');
    }
  };

  const handlePublishFee = async (e) => {
    e.preventDefault();
    if (!newFeeTitle || !newFeeAmount || !newFeeDueDate) {
      alert('Please fill out all required fee fields.');
      return;
    }

    if (targetType === 'specific' && !selectedStudentId) {
      alert('Please select a student from the list.');
      return;
    }

    setPublishing(true);
    try {
      let payload = [];

      if (targetType === 'all') {
        payload = [{
          student_id: null,
          title: newFeeTitle,
          description: newFeeDesc || 'Scheduled college fee payment notice.',
          amount: Number(newFeeAmount),
          due_date: newFeeDueDate,
          status: 'Pending',
          target_type: 'all'
        }];
      } else {
        payload = [{
          student_id: selectedStudentId,
          title: newFeeTitle,
          description: newFeeDesc || 'Scheduled college fee payment notice.',
          amount: Number(newFeeAmount),
          due_date: newFeeDueDate,
          status: 'Pending',
          target_type: 'specific'
        }];
      }

      const { error } = await supabase.from('fee_records').insert(payload);
      if (error) throw error;

      await sendFeeEmailNotification({
        targetType,
        selectedStudentId,
        title: newFeeTitle,
        description: newFeeDesc,
        amount: newFeeAmount,
        dueDate: newFeeDueDate
      });

      alert('Fee published & email notifications dispatched successfully!');

      setNewFeeTitle('');
      setNewFeeDesc('');
      setNewFeeAmount('');
      setNewFeeDueDate('');
      await fetchFees();
    } catch (err) {
      console.error('Failed to publish fee:', err);
      alert(err.message || 'Error publishing fee schedule.');
    } finally {
      setPublishing(false);
    }
  };

  const openEditModal = (fee) => {
    setEditingFee(fee);
    setEditTitle(fee.title);
    setEditDesc(fee.description || '');
    setEditAmount(fee.amount);
    setEditDueDate(fee.due_date);
    setEditStatus(fee.status || 'Pending');
  };

  const handleUpdateFee = async (e) => {
    e.preventDefault();
    if (!editingFee) return;

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('fee_records')
        .update({
          title: editTitle,
          description: editDesc,
          amount: Number(editAmount),
          due_date: editDueDate,
          status: editStatus
        })
        .eq('id', editingFee.id);

      if (error) throw error;

      alert('Fee statement updated & pushed live to website!');
      setEditingFee(null);
      fetchFees();
    } catch (err) {
      console.error('Failed to update fee:', err);
      alert(err.message || 'Error updating fee.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteFee = async (feeItem) => {
    if (!window.confirm(`Are you sure you want to delete "${feeItem.title}"?`)) return;

    try {
      if (feeItem.target_type === 'all') {
        await supabase
          .from('fee_records')
          .delete()
          .eq('title', feeItem.title)
          .eq('due_date', feeItem.due_date);
      } else {
        await supabase
          .from('fee_records')
          .delete()
          .eq('id', feeItem.id);
      }

      setFees((prevFees) => prevFees.filter((f) => f.id !== feeItem.id));
      alert('Fee record removed live from website!');
      fetchFees();
    } catch (err) {
      console.error('Failed to delete fee:', err);
      alert(err.message || 'Error deleting fee record.');
    }
  };

  const filteredStudents = studentsList.filter((st) => 
    st.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.reg_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPaid = fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + Number(f.amount), 0);
  const totalUnpaid = fees.filter(f => f.status !== 'Paid').reduce((sum, f) => sum + Number(f.amount), 0);
  const overdueTotal = fees.filter(f => f.status === 'Overdue').reduce((sum, f) => sum + Number(f.amount), 0);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-28 h-28 bg-white rounded-3xl p-3 shadow-2xl flex items-center justify-center mb-6 border border-blue-100 animate-pulse">
          <img 
            src="/logo.png" 
            alt="Mar Gregorios College Logo" 
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '<div class="text-blue-700 font-bold text-2xl">MGC</div>';
            }}
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight text-center">Mar Gregorios College</h1>
        <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mt-1">Arts & Science, Punnapra</p>
        <p className="text-[11px] text-slate-400 mt-6 font-medium flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-ping" /> Loading Live Sync Fee Portal...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 font-sans">
        <Loader2 className="w-10 h-10 text-blue-700 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600">Loading Mar Gregorios Fee Portal...</p>
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 font-sans text-slate-800 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url('/college-bg.jpg')` }}
      >
        <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm"></div>

        <div className="relative z-10 w-full max-w-md bg-white/95 border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-50/90 rounded-2xl p-2.5 mx-auto mb-3 shadow-md border border-blue-100 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Mar Gregorios College Logo" 
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<div class="text-blue-700 font-bold text-xl">MGC</div>';
                }}
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Mar Gregorios College</h1>
            <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider mt-0.5">Arts & Science, Punnapra</p>
            <p className="text-xs text-slate-500 mt-1">Student & Admin Fee Management Portal</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedRole('student')}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                selectedRole === 'student' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Student
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                selectedRole === 'admin' ? 'bg-purple-700 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Admin
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          {awaitingOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <KeyRound className="w-8 h-8 text-blue-700 mx-auto mb-1" />
                <h3 className="text-sm font-bold text-slate-900">Verify Email Address</h3>
                <p className="text-xs text-slate-500">Enter the 6-digit OTP code sent to <strong>{email}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Enter Verification Code</label>
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2"
              >
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm OTP & Sign In
              </button>

              <button
                type="button"
                onClick={() => setAwaitingOtp(false)}
                className="w-full text-xs text-slate-500 hover:text-slate-800 font-bold"
              >
                Back to Registration
              </button>
            </form>
          ) : (
            <>
              <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  {authMode === 'signin' ? `${selectedRole === 'admin' ? 'Admin' : 'Student'} Sign In` : `${selectedRole === 'admin' ? 'Admin' : 'Student'} Registration`}
                </h2>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-xs text-blue-700 hover:underline font-bold"
                >
                  {authMode === 'signin' ? "Create Account" : "Sign In"}
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {authMode === 'signup' && selectedRole === 'admin' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl space-y-1">
                    <label className="block text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-purple-700" /> Secret Admin Invitation Key
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter Admin Security Key"
                      value={adminSecretKey}
                      onChange={(e) => setAdminSecretKey(e.target.value)}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-700"
                    />
                    <p className="text-[10px] text-purple-700 font-medium">Default key is: <strong className="font-mono">MGC-ADMIN-SECRET-2026</strong></p>
                  </div>
                )}

                {authMode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder={selectedRole === 'admin' ? "Admin Full Name" : "Student Full Name"}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:border-blue-700 font-medium"
                        />
                      </div>
                    </div>

                    {selectedRole === 'student' && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Register Number</label>
                          <div className="relative">
                            <BookOpen className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                              type="text"
                              required
                              placeholder="210021088492"
                              value={regNo}
                              onChange={(e) => setRegNo(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:border-blue-700 font-mono font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                          <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-700"
                          >
                            {collegeDepartments.map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Semester / Year</label>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-700"
                          >
                            {collegeSemesters.map((sem) => (
                              <option key={sem} value={sem}>{sem}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">College Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder={selectedRole === 'admin' ? "admin@mgcollege.ac.in" : "student@mgcollege.ac.in"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:border-blue-700 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:border-blue-700 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className={`w-full ${selectedRole === 'admin' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-blue-700 hover:bg-blue-800'} text-white font-bold py-3 rounded-xl transition-all shadow-lg text-sm mt-2 flex items-center justify-center gap-2 active:scale-[0.98]`}
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {authMode === 'signin' 
                    ? `Sign In as ${selectedRole === 'admin' ? 'Admin' : 'Student'}` 
                    : `Register as ${selectedRole === 'admin' ? 'Admin' : 'Student'}`}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-[11px] font-medium text-slate-500 mt-6">
            Mar Gregorios College of Arts and Science, Punnapra
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen font-sans bg-cover bg-center bg-fixed text-slate-800 relative pb-12"
      style={{ backgroundImage: `url('/college-bg.jpg')` }}
    >
      <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-sm pointer-events-none"></div>

      <div className="relative z-10">
        <header className="bg-white/95 border-b border-slate-200 shadow-sm sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl p-1 shadow-sm flex items-center justify-center shrink-0">
                <img 
                  src="/logo.png" 
                  alt="MGC Logo" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<div class="text-blue-700 font-bold text-xs">MGC</div>';
                  }}
                />
              </div>
              <div>
                <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight flex items-center gap-2">
                  Mar Gregorios College, Punnapra
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-semibold">
                    <Wifi className="w-2.5 h-2.5 text-emerald-600" /> Live Sync
                  </span>
                </h1>
                <p className="text-[11px] text-blue-700 font-semibold">Student Online Fee Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
              {profile.role === 'admin' ? (
                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" /> Admin
                </span>
              ) : (
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
                  <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0">
                    {profile.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <p className="font-bold text-slate-900 leading-tight">{profile.full_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{profile.reg_no}</p>
                  </div>
                </div>
              )}

              {profile.role === 'admin' && (
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('studentView')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeTab === 'studentView' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600'}`}
                  >
                    Student View
                  </button>
                  <button
                    onClick={() => setActiveTab('adminPanel')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeTab === 'adminPanel' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-600'}`}
                  >
                    Admin Panel
                  </button>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-3 sm:px-4 pt-6">
          {activeTab === 'studentView' ? (
            <div className="space-y-5">
              <div className="bg-white/95 border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> {profile.role === 'admin' ? 'Viewing Student Dashboard' : 'Verified Student'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{profile.full_name}</h2>
                  <p className="text-xs font-semibold text-slate-600 flex flex-wrap items-center gap-2">
                    <span>Reg No: <strong className="text-slate-900 font-mono">{profile.reg_no || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>Department: <strong className="text-blue-700">{profile.department || 'BCA'}</strong></span>
                    <span>•</span>
                    <span>Active: <strong className="text-purple-700">{profile.semester || 'Semester 3 (Year 2)'}</strong></span>
                  </p>
                  <p className="text-xs text-slate-500">{session.user.email}</p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center flex-1 sm:min-w-[120px]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Fee Status</p>
                    <p className="text-xs font-bold text-emerald-700 mt-0.5">
                      {totalUnpaid === 0 ? 'Fully Cleared' : 'Dues Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* COLLEGE INFO BANNER */}
              <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-5 text-white shadow-lg space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm tracking-wide">Mar Gregorios College of Arts & Science</h3>
                      <p className="text-[11px] text-blue-200">Motto: "Thy Truth Our Light" • Affiliated to University of Kerala</p>
                    </div>
                  </div>
                  <a 
                    href="https://mgcollegepunnapra.ac.in" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                  >
                    <Globe className="w-3.5 h-3.5" /> Official Website
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-blue-100">Campus Location</p>
                      <p className="text-blue-200 text-[11px]">Punnapra, Alappuzha, Kerala - 688004</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-blue-100">Official Contact</p>
                      <p className="text-blue-200 text-[11px]">mgcollegepunnapra@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white/95 border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600">Total Unpaid Dues</p>
                    <div className="p-2 bg-amber-50 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-amber-600 mt-2">₹{totalUnpaid.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">Pending payment clearance</p>
                </div>

                <div className="bg-white/95 border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600">Total Fees Paid</p>
                    <div className="p-2 bg-emerald-50 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 mt-2">₹{totalPaid.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">Verified Gateway Receipts</p>
                </div>

                <div className="bg-white/95 border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600">Overdue Dues</p>
                    <div className="p-2 bg-rose-50 rounded-xl">
                      <Clock className="w-5 h-5 text-rose-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-rose-600 mt-2">₹{overdueTotal.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">Past designated deadline</p>
                </div>
              </div>

              <div className="bg-white/95 border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-blue-700" /> Published Fee Statements ({fees.length})
                  </h3>
                </div>
                
                {feesLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> Fetching payment records...
                  </div>
                ) : fees.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                    No fee statements published yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fees.map((fee) => (
                      <div key={fee.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              fee.status === 'Paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                              fee.status === 'Overdue' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                              {fee.status}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{fee.title}</h4>
                          </div>
                          <p className="text-xs text-slate-600">{fee.description}</p>
                          <p className="text-[11px] text-slate-500 font-medium">Due Date: <span className="text-slate-800 font-mono font-bold">{fee.due_date}</span></p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                          <div className="text-left sm:text-right mr-2">
                            <p className="text-[10px] uppercase font-bold text-slate-500">Amount</p>
                            <p className="text-base font-bold text-slate-900">₹{Number(fee.amount).toLocaleString('en-IN')}</p>
                          </div>

                          {profile.role === 'admin' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openEditModal(fee)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                                title="Edit Fee Statement"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFee(fee)}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                                title="Delete Fee Statement"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          ) : (
                            fee.status !== 'Paid' ? (
                              <button
                                onClick={() => handleInitiateRazorpay(fee)}
                                className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 shrink-0"
                              >
                                <CreditCard className="w-4 h-4" /> Pay via Razorpay
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Paid
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white/95 border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Send className="w-5 h-5 text-purple-700" /> Publish Fee Schedule
                </h3>
                <p className="text-xs text-slate-500 mb-6">Publish fee notices to registered students. Selecting 'All Students' assigns this fee to every student profile.</p>

                <form onSubmit={handlePublishFee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Publish Target</label>
                    <div className="grid grid-cols-2 gap-2 max-w-md">
                      <button
                        type="button"
                        onClick={() => setTargetType('all')}
                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                          targetType === 'all' 
                            ? 'bg-purple-700 text-white border-purple-700 shadow-sm' 
                            : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Users className="w-4 h-4" /> All Students ({studentsList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetType('specific')}
                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                          targetType === 'specific' 
                            ? 'bg-purple-700 text-white border-purple-700 shadow-sm' 
                            : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <User className="w-4 h-4" /> Specific Student
                      </button>
                    </div>
                  </div>

                  {targetType === 'specific' && (
                    <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl">
                      <label className="block text-xs font-bold text-purple-900 mb-1">Select Student by Name</label>
                      {studentsList.length === 0 ? (
                        <p className="text-xs text-purple-700">No student accounts registered yet.</p>
                      ) : (
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-700"
                        >
                          {studentsList.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.full_name} ({st.reg_no || 'Reg: N/A'} - {st.department || 'BCA'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fee Title</label>
                      <input
                        type="text"
                        required
                        placeholder="Semester 4 Tuition Fee"
                        value={newFeeTitle}
                        onChange={(e) => setNewFeeTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-700 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fee Amount (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="20000"
                        value={newFeeAmount}
                        onChange={(e) => setNewFeeAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-700 font-medium"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fee Description</label>
                      <input
                        type="text"
                        placeholder="Core practical labs, library charges, and IT infrastructure fees."
                        value={newFeeDesc}
                        onChange={(e) => setNewFeeDesc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-700 font-medium"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        required
                        value={newFeeDueDate}
                        onChange={(e) => setNewFeeDueDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-700 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={publishing}
                    className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-purple-700/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {targetType === 'all' ? `Publish Fee to All ${studentsList.length} Students` : 'Publish Fee to Selected Student'}
                  </button>
                </form>
              </div>

              <div className="bg-white/95 border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-700" /> Registered Student Directory ({studentsList.length})
                    </h3>
                    <p className="text-xs text-slate-500">Manage registered students, issue individual fee notices, or remove student accounts.</p>
                  </div>

                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student or Reg No..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 focus:outline-none focus:border-blue-700 font-medium"
                    />
                  </div>
                </div>

                {studentsLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> Fetching student directory...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                    No student records found matching <strong className="text-slate-800">"{searchQuery}"</strong>.
                  </div>
                ) : (
                  <>
                    <div className="block md:hidden space-y-3">
                      {filteredStudents.map((st) => (
                        <div key={st.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">{st.full_name}</h4>
                              <p className="text-xs font-mono text-slate-500">Reg: {st.reg_no || 'N/A'}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg">
                              {st.semester || 'Sem 3'}
                            </span>
                          </div>

                          <div className="text-xs space-y-0.5 text-slate-600">
                            <p>Dept: <span className="font-bold text-blue-700">{st.department || 'BCA'}</span></p>
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex gap-2">
                            <button
                              onClick={() => {
                                setTargetType('specific');
                                setSelectedStudentId(st.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 py-2 rounded-xl font-bold text-xs text-center"
                            >
                              Select Fee
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(st.id, st.full_name)}
                              disabled={deletingStudentId === st.id}
                              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                            >
                              {deletingStudentId === st.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />} Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-3">Student Name</th>
                            <th className="py-3 px-3">Register No</th>
                            <th className="py-3 px-3">Department</th>
                            <th className="py-3 px-3">Semester</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredStudents.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50 transition-all">
                              <td className="py-3 px-3 font-bold text-slate-900">{st.full_name}</td>
                              <td className="py-3 px-3 font-mono text-slate-700">{st.reg_no || 'N/A'}</td>
                              <td className="py-3 px-3 font-semibold text-blue-700">{st.department || 'BCA'}</td>
                              <td className="py-3 px-3 font-semibold text-purple-700">{st.semester || 'Semester 3 (Year 2)'}</td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setTargetType('specific');
                                      setSelectedStudentId(st.id);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px]"
                                  >
                                    Select Fee
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStudent(st.id, st.full_name)}
                                    disabled={deletingStudentId === st.id}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1"
                                    title="Delete Student Profile"
                                  >
                                    {deletingStudentId === st.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />} Delete Student
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {editingFee && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-purple-700" /> Edit Published Fee Statement
              </h3>
              <button 
                onClick={() => setEditingFee(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFee} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fee Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Override</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-700"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFee(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 flex items-center gap-1.5 shadow-md shadow-purple-700/20"
                >
                  {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}