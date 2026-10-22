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
  QrCode,
  Loader2
} from 'lucide-react';

export default function App() {
  // Session & User Profile State
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Authentication Form State
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' | 'admin'
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

  // Payment Modal State
  const [payingFee, setPayingFee] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Admin Publish Fee Form State
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeDesc, setNewFeeDesc] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDueDate, setNewFeeDueDate] = useState('');
  const [targetStudentId, setTargetStudentId] = useState('');

  // ---------------------------------------------------------
  // INITIAL LOAD & AUTH LISTENER
  // ---------------------------------------------------------
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

  // Fetch Profile and Fee Records when Session Active
  useEffect(() => {
    if (session && profile) {
      fetchFees();
    }
  }, [session, profile]);

 const fetchProfile = async (userId) => {
    try {
      setLoading(true);
      
      // Use .maybeSingle() to prevent PGRST116 single-row errors
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile from database:', error);
      }

      // Fallback: If database trigger has not finished creating the profile row,
      // reconstruct profile using the metadata stored during signup
      if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          data = {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Student User',
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
  // ---------------------------------------------------------
  // AUTHENTICATION HANDLERS (SUPABASE)
  // ---------------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        // Sign Up passing metadata so SQL trigger populates profiles cleanly
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: selectedRole,
              reg_no: selectedRole === 'student' ? regNo : 'ADMIN-OFFICER',
              department: department
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Wait briefly for trigger execution before fetching profile
          setTimeout(() => {
            fetchProfile(authData.user.id);
          }, 600);
        }
      } else {
        // Sign In
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

  // ---------------------------------------------------------
  // RAZORPAY INTEGRATION & PAYMENT SETTLEMENT
  // ---------------------------------------------------------
  const handleInitiateRazorpay = (feeItem) => {
    setPayingFee(feeItem);

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
      amount: feeItem.amount * 100, // Amount in paise
      currency: 'INR',
      name: 'Mar Gregorios College, Punnapra',
      description: `Payment for ${feeItem.title}`,
      image: '/logo.png',
      handler: async function (response) {
        await handlePaymentSuccess(feeItem.id, response.razorpay_payment_id);
      },
      prefill: {
        name: profile?.full_name || '',
        email: session?.user?.email || '',
      },
      theme: {
        color: '#2563eb'
      }
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
    }
  };

  const handlePaymentSuccess = async (feeId, razorpayPaymentId) => {
    setProcessingPayment(true);
    try {
      // 1. Update Fee Status to 'Paid'
      const { error: feeErr } = await supabase
        .from('fee_records')
        .update({ status: 'Paid' })
        .eq('id', feeId);

      if (feeErr) throw feeErr;

      // 2. Log Payment Record in Transactions Table
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([
          {
            fee_id: feeId,
            student_id: session.user.id,
            razorpay_payment_id: razorpayPaymentId,
            amount: payingFee.amount,
            status: 'success'
          }
        ]);

      if (txErr) throw txErr;

      // Refresh Local Dues
      await fetchFees();
      setPayingFee(null);
      alert(`Payment Successful! Receipt ID: ${razorpayPaymentId}`);
    } catch (err) {
      console.error('Payment processing failed:', err);
      alert('Payment recorded in gateway but failed to update portal status.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // ---------------------------------------------------------
  // ADMIN HANDLER: PUBLISH FEE ITEM
  // ---------------------------------------------------------
  const handlePublishFee = async (e) => {
    e.preventDefault();
    if (!newFeeTitle || !newFeeAmount || !newFeeDueDate || !targetStudentId) {
      alert('Please fill all required fee details including Student UUID.');
      return;
    }

    try {
      const { error } = await supabase
        .from('fee_records')
        .insert([
          {
            student_id: targetStudentId,
            title: newFeeTitle,
            description: newFeeDesc || 'Scheduled college fee payment notice.',
            amount: Number(newFeeAmount),
            due_date: newFeeDueDate,
            status: 'Pending'
          }
        ]);

      if (error) throw error;

      alert('Fee published successfully!');
      setNewFeeTitle('');
      setNewFeeDesc('');
      setNewFeeAmount('');
      setNewFeeDueDate('');
      setTargetStudentId('');
      fetchFees();
    } catch (err) {
      console.error('Failed to publish fee:', err);
      alert(err.message || 'Error publishing fee item.');
    }
  };

  // Financial Summary Calculations
  const totalPaid = fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + Number(f.amount), 0);
  const totalUnpaid = fees.filter(f => f.status !== 'Paid').reduce((sum, f) => sum + Number(f.amount), 0);
  const overdueTotal = fees.filter(f => f.status === 'Overdue').reduce((sum, f) => sum + Number(f.amount), 0);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">Loading Mar Gregorios Portal...</p>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: SIGN IN / SIGN UP SCREEN WITH BACKGROUND & LOGO
  // ---------------------------------------------------------
  if (!session || !profile) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 font-sans text-slate-100 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url('/college-bg.jpg')` }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>

        <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl p-8 backdrop-blur-md">
          {/* Header Branding */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-white/10 rounded-2xl p-2 mx-auto mb-3 shadow-xl border border-white/20 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Mar Gregorios College Logo" 
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<div class="text-blue-400 font-bold text-xl">MGC</div>';
                }}
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Mar Gregorios College</h1>
            <p className="text-xs text-blue-400 font-medium">Arts and Science, Punnapra</p>
            <p className="text-xs text-slate-400 mt-1">Student & Admin Fee Management Portal</p>
          </div>

          {/* Role Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => setSelectedRole('student')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                selectedRole === 'student' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Student
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                selectedRole === 'admin' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Admin
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Auth Switcher */}
          <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-6">
            <h2 className="text-lg font-bold text-white">
              {authMode === 'signin' ? `${selectedRole === 'admin' ? 'Admin' : 'Student'} Sign In` : `Create ${selectedRole === 'admin' ? 'Admin' : 'Student'} Account`}
            </h2>
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="text-xs text-blue-400 hover:underline font-medium"
            >
              {authMode === 'signin' ? "Need an account? Sign Up" : "Existing user? Sign In"}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder={selectedRole === 'admin' ? "Prof. / Office Officer Name" : "student name"}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {selectedRole === 'student' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Register Number</label>
                    <div className="relative">
                      <BookOpen className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="210021088492"
                        value={regNo}
                        onChange={(e) => setRegNo(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">College Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder={selectedRole === 'admin' ? "admin@mgcollege.ac.in" : "student@mgcollege.ac.in"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 text-sm mt-2 flex items-center justify-center gap-2"
            >
              {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {authMode === 'signin' ? `Sign In as ${selectedRole === 'admin' ? 'Admin' : 'Student'}` : 'Complete Registration'}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            Mar Gregorios College of Arts and Science, Punnapra
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: LOGGED-IN PORTAL DASHBOARD
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* Top Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white leading-tight">Mar Gregorios College, Punnapra</h1>
              <p className="text-xs text-blue-400 font-medium">Online Fee Payment & Management Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile.role === 'admin' ? (
              <span className="bg-purple-950 text-purple-300 border border-purple-800/60 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" /> Admin Officer
              </span>
            ) : (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white text-[10px]">
                  {profile.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-white">{profile.full_name}</p>
                  <p className="text-[10px] text-slate-400">{profile.reg_no}</p>
                </div>
              </div>
            )}

            {profile.role === 'admin' && (
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setActiveTab('studentView')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg ${activeTab === 'studentView' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Student View
                </button>
                <button
                  onClick={() => setActiveTab('adminPanel')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg ${activeTab === 'adminPanel' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                >
                  Admin Panel
                </button>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-8">
        {activeTab === 'studentView' ? (
          <div className="space-y-6">
            {/* Student Profile Overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-950 text-blue-400 border border-blue-800 rounded-md">
                  {profile.role === 'admin' ? 'Viewing as Student' : 'Active Student'}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">{profile.full_name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reg No: <span className="text-slate-200 font-mono">{profile.reg_no || 'N/A'}</span> • {profile.department || 'BCA'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{session.user.email}</p>
              </div>

              <div className="flex gap-4">
                <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl text-center min-w-[120px]">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">System UUID</p>
                  <p className="text-[10px] font-mono text-blue-400 mt-1 truncate max-w-[100px]" title={session.user.id}>{session.user.id}</p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl text-center min-w-[120px]">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Standard Rate</p>
                  <p className="text-xs font-bold text-emerald-400 mt-1">₹20,000 / Sem</p>
                </div>
              </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Total Unpaid Dues</p>
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-400 mt-2">₹{totalUnpaid.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-500 mt-1">Pending clearance</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Total Fees Paid</p>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400 mt-2">₹{totalPaid.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-500 mt-1">Verified Gateway Receipts</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Overdue Fines</p>
                  <Clock className="w-5 h-5 text-rose-400" />
                </div>
                <p className="text-2xl font-bold text-rose-400 mt-2">₹{overdueTotal.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-500 mt-1">Past designated deadline</p>
              </div>
            </div>

            {/* Fee Statement List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4">Active & Historical Fee Statements</h3>
              
              {feesLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Fetching database records...
                </div>
              ) : fees.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
                  No fee statements assigned to this account yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {fees.map((fee) => (
                    <div key={fee.id} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            fee.status === 'Paid' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' :
                            fee.status === 'Overdue' ? 'bg-rose-950 border-rose-800 text-rose-400' : 'bg-amber-950 border-amber-800 text-amber-400'
                          }`}>
                            {fee.status}
                          </span>
                          <h4 className="text-sm font-bold text-white">{fee.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{fee.description}</p>
                        <p className="text-[11px] text-slate-500 mt-1">Due Date: <span className="text-slate-300 font-mono">{fee.due_date}</span></p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Amount</p>
                          <p className="text-base font-bold text-white">₹{Number(fee.amount).toLocaleString('en-IN')}</p>
                        </div>

                        {fee.status !== 'Paid' ? (
                          <button
                            onClick={() => handleInitiateRazorpay(fee)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                          >
                            <CreditCard className="w-4 h-4" /> Pay via Razorpay
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-xl font-medium">
                            Receipt Issued
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Admin Panel View */
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> Create & Publish Fee Notice
              </h3>
              <p className="text-xs text-slate-400 mb-6">Generated fee items will be stored in PostgreSQL and synced to the student's portal.</p>

              <form onSubmit={handlePublishFee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Student User UUID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fee Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Semester 4 Tuition Fee"
                    value={newFeeTitle}
                    onChange={(e) => setNewFeeTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fee Description</label>
                  <input
                    type="text"
                    placeholder="Core practical labs, library fees, and IT infrastructure charges."
                    value={newFeeDesc}
                    onChange={(e) => setNewFeeDesc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fee Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="20000"
                    value={newFeeAmount}
                    onChange={(e) => setNewFeeAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newFeeDueDate}
                    onChange={(e) => setNewFeeDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-600/20"
                  >
                    Publish Fee Schedule to Supabase
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}