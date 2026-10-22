import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Building2, 
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
  Plus,
  Loader2,
  Receipt,
  GraduationCap,
  Users,
  Search,
  Send,
  Edit2,
  Trash2,
  X,
  Save
} from 'lucide-react';

export default function App() {
  // Session & User Profile State
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Authentication Form State
  const [authMode, setAuthMode] = useState('signin');
  const [selectedRole, setSelectedRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [department, setDepartment] = useState('BCA');
  const [authError, setAuthError] = useState('');

  // Portal Dashboard State
  const [activeTab, setActiveTab] = useState('studentView');
  const [fees, setFees] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);

  // Admin Data State (Student Directory & Selection)
  const [studentsList, setStudentsList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Publish Fee Form State
  const [targetType, setTargetType] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeDesc, setNewFeeDesc] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDueDate, setNewFeeDueDate] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Admin Edit Fee Modal State
  const [editingFee, setEditingFee] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState('Pending');
  const [savingEdit, setSavingEdit] = useState(false);

  // Payment State
  const [payingFee, setPayingFee] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && profile) {
      fetchFees();
      if (profile.role === 'admin') {
        fetchAllStudents();
      }
    }
  }, [session, profile, activeTab]);

  const fetchProfile = async (userId) => {
    try {
      setLoading(true);
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) console.error('Error fetching profile from DB:', error);

      if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          data = {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'YOUR NAME',
            role: user.user_metadata?.role || 'student',
            reg_no: user.user_metadata?.reg_no || 'N/A',
            department: user.user_metadata?.department || 'BCA'
          };
        }
      }

      if (data) {
        setProfile(data);
        setActiveTab(data.role === 'admin' ? 'adminPanel' : 'studentView');
      }
    } catch (err) {
      console.error('Failed to resolve profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fixed: Admin sees all fees in Student View, Student sees only their assigned fees
  const fetchFees = async () => {
    if (!session) return;
    setFeesLoading(true);
    try {
      let query = supabase.from('fee_records').select('*');
      
      // Filter by student_id ONLY if logged-in user is a real student
      if (profile?.role === 'student') {
        query = query.eq('student_id', session.user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setFees(data || []);
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setFeesLoading(false);
    }
  };

  const fetchAllStudents = async () => {
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
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || 'YOUR NAME',
              role: selectedRole,
              reg_no: selectedRole === 'student' ? regNo : 'ADMIN-OFFICER',
              department: department
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          setTimeout(() => {
            fetchProfile(authData.user.id);
          }, 600);
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (signInData.user) {
          await fetchProfile(signInData.user.id);
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please check your details.');
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
  };

  const handleInitiateRazorpay = (feeItem) => {
    setPayingFee(feeItem);

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
        name: profile?.full_name || 'YOUR NAME',
        email: session?.user?.email || '',
      },
      theme: { color: '#1d4ed8' }
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
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
      setPayingFee(null);
      alert(`Payment Successful! Receipt ID: ${razorpayPaymentId}`);
    } catch (err) {
      console.error('Payment processing failed:', err);
      alert('Payment succeeded on gateway but failed to update status.');
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
        if (studentsList.length === 0) {
          alert('No students found in the database to publish fees to.');
          setPublishing(false);
          return;
        }

        payload = studentsList.map((st) => ({
          student_id: st.id,
          title: newFeeTitle,
          description: newFeeDesc || 'Scheduled college fee payment notice.',
          amount: Number(newFeeAmount),
          due_date: newFeeDueDate,
          status: 'Pending'
        }));
      } else {
        payload = [
          {
            student_id: selectedStudentId,
            title: newFeeTitle,
            description: newFeeDesc || 'Scheduled college fee payment notice.',
            amount: Number(newFeeAmount),
            due_date: newFeeDueDate,
            status: 'Pending'
          }
        ];
      }

      const { error } = await supabase.from('fee_records').insert(payload);
      if (error) throw error;

      alert(
        targetType === 'all'
          ? `Fee successfully published to all ${payload.length} students!`
          : `Fee successfully published to selected student!`
      );

      setNewFeeTitle('');
      setNewFeeDesc('');
      setNewFeeAmount('');
      setNewFeeDueDate('');
      fetchFees();
    } catch (err) {
      console.error('Failed to publish fee:', err);
      alert(err.message || 'Error publishing fee schedule.');
    } finally {
      setPublishing(false);
    }
  };

  // Admin Edit Fee Handler
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

      alert('Fee statement updated successfully!');
      setEditingFee(null);
      fetchFees();
    } catch (err) {
      console.error('Failed to update fee:', err);
      alert(err.message || 'Error updating fee.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteFee = async (feeId) => {
    if (!window.confirm('Are you sure you want to delete this fee statement?')) return;

    try {
      const { error } = await supabase
        .from('fee_records')
        .delete()
        .eq('id', feeId);

      if (error) throw error;

      alert('Fee record deleted successfully.');
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
                selectedRole === 'admin' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
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

          <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-base font-bold text-slate-900">
              {authMode === 'signin' ? `${selectedRole === 'admin' ? 'Admin' : 'Student'} Sign In` : `Create ${selectedRole === 'admin' ? 'Admin' : 'Student'} Account`}
            </h2>
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="text-xs text-blue-700 hover:underline font-bold"
            >
              {authMode === 'signin' ? "Need an account? Sign Up" : "Existing user? Sign In"}
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder={selectedRole === 'admin' ? "Prof. / Office Officer Name" : "YOUR NAME"}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                {selectedRole === 'student' && (
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
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white transition-all font-mono font-medium"
                      />
                    </div>
                  </div>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white transition-all font-medium"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:border-blue-700 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-700/25 text-sm mt-2 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {authMode === 'signin' ? `Sign In as ${selectedRole === 'admin' ? 'Admin' : 'Student'}` : 'Complete Registration'}
            </button>
          </form>

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
                <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">Mar Gregorios College, Punnapra</h1>
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

              {/* Published Fees View */}
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
                                onClick={() => handleDeleteFee(fee.id)}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                                title="Delete Fee Statement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                <p className="text-xs text-slate-500 mb-6">Publish fee notices either to all registered college students or to a specific student selected by name.</p>

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
                      <Users className="w-5 h-5 text-blue-700" /> Student Directory
                    </h3>
                    <p className="text-xs text-slate-500">View registered students and select individuals directly for fee assignment.</p>
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
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> Fetching student records...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                    No students found matching <strong className="text-slate-800">"{searchQuery}"</strong>.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-3">Student Name</th>
                          <th className="py-3 px-3">Register No</th>
                          <th className="py-3 px-3">Department</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredStudents.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50 transition-all">
                            <td className="py-3 px-3 font-bold text-slate-900">{st.full_name}</td>
                            <td className="py-3 px-3 font-mono text-slate-700">{st.reg_no || 'N/A'}</td>
                            <td className="py-3 px-3 font-semibold text-blue-700">{st.department || 'BCA'}</td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setTargetType('specific');
                                  setSelectedStudentId(st.id);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg font-bold transition-all text-[11px]"
                              >
                                Select for Fee
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Admin Edit Fee Modal Overlay */}
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