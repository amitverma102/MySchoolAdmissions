import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Users, User, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'Parent' | 'Student'>('Parent');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide both your First and Last name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and retry.');
      return;
    }

    if (!agreedTerms) {
      setError('Please accept the admission communication terms to proceed.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/api/auth/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role
      });

      const data = response.data;
      const roles: string[] = data.roles || [role];
      const fullName = data.fullName || `${firstName.trim()} ${lastName.trim()}`;

      // Save credentials & user profile to localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      localStorage.setItem('userEmail', email.trim().toLowerCase());
      localStorage.setItem('userName', fullName);
      localStorage.setItem('userRoles', JSON.stringify(roles));
      if (phone.trim()) {
        localStorage.setItem('userPhone', phone.trim());
      }
      if (firstName.trim()) localStorage.setItem('userFirstName', firstName.trim());
      if (lastName.trim()) localStorage.setItem('userLastName', lastName.trim());

      // Redirect immediately to the Parent & Student Portal
      navigate('/portal');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(
        err?.response?.data?.Message ||
        err?.response?.data?.message ||
        'Registration failed. An account may already exist with this email.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-100">
        <div className="flex items-center justify-between">
          <Link 
            to="/login" 
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Sign In
          </Link>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Step 1 of 1 • Instant Access
          </span>
        </div>

        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/25">
              <GraduationCap className="h-9 w-9" />
            </div>
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Admission Account
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Register to submit applications, track your children's admission stages, and verify sibling fee concessions.
          </p>
        </div>

        {/* Account Type Selector (Parent / Student only) */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            I am registering as:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('Parent')}
              className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                role === 'Parent'
                  ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`p-2 rounded-xl ${role === 'Parent' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Users className="w-4 h-4" />
                </div>
                {role === 'Parent' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">
                    Selected
                  </span>
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">Parent / Guardian</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Manage 1 or multiple children</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('Student')}
              className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                role === 'Student'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`p-2 rounded-xl ${role === 'Student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <User className="w-4 h-4" />
                </div>
                {role === 'Student' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                    Selected
                  </span>
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">Student Applicant</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Track your own admission</div>
              </div>
            </button>
          </div>
          <div className="text-[11px] text-slate-400 italic">
            * Note: School staff & administrative accounts are provisioned separately by IT Admin.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                placeholder="e.g. Suresh"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                placeholder="e.g. Sharma"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Registered Email Address *
            </label>
            <input
              type="email"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
              placeholder="e.g. suresh.sharma@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Phone Number Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Mobile / Contact Phone
            </label>
            <input
              type="tel"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
              placeholder="+91 98112 33445"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Create Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              id="terms"
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
            />
            <label htmlFor="terms" className="text-xs text-slate-600 leading-tight">
              I agree to receive SMS, WhatsApp & email notifications regarding application progress, entrance interactions, and admission offers.
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Register & Open Admission Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Already have an admission account?{' '}
            <Link to="/login" className="font-bold text-purple-600 hover:text-purple-800 hover:underline">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
