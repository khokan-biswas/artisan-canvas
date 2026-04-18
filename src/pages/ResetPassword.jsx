import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Added useSearchParams
import authService from '../backend/auth';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Hook to read URL params

  const [step, setStep] = useState('email'); 
  const [email, setEmail] = useState(''); // This will act as userId
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 🔄 AUTO-DETECTION LOGIC
  useEffect(() => {
    const urlSecret = searchParams.get('secret');
    const urlUserId = searchParams.get('userId');

    if (urlSecret && urlUserId) {
      // If user clicked the email link, skip straight to password step
      setCode(urlSecret);
      setEmail(urlUserId); 
      setStep('password');
    }
  }, [searchParams]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    setError('');
    try {
      await authService.sendPasswordResetEmail(email);
      setStep('code');
      setTimer(30);
    } catch (err) {
      setError(err?.message || 'Failed to send reset email.');
    }
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (!code) return setError('Please enter the code/token.');
    setStep('password');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match.');

    try {
      await authService.updatePassword({
        userId: email, // This is the userId (from URL or entered email)
        secret: code,
        password: password
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError("Session expired or invalid token. Please request a new code.");
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-cream px-4 text-sans">
      <div className="w-full max-w-md bg-white p-8 shadow-lg rounded-sm border border-gray-100">
        <h2 className="text-2xl font-serif font-bold text-center mb-6 text-charcoal">
          {step === 'password' ? 'Set New Password' : 'Reset Password'}
        </h2>

        {error && <p className="text-red-500 text-xs text-center mb-4 bg-red-50 py-2 border border-red-100">{error}</p>}

        {success ? (
          <div className="text-center py-4">
            <div className="text-green-600 font-bold text-lg mb-2">✔ Success!</div>
            <p className="text-sm text-gray-500 font-medium">Your password has been updated. Redirecting...</p>
          </div>
        ) : (
          <>
            {step === 'email' && (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter registered email"
                  className="w-full p-3 border border-gray-300 rounded-sm outline-none focus:border-charcoal"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="w-full bg-charcoal text-white py-3 uppercase tracking-widest text-sm font-bold hover:bg-black transition">
                  Send Recovery Link
                </button>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-sm mb-4">
                    <p className="text-[11px] text-blue-700 leading-tight">
                        <strong>Note:</strong> Since you are using the token-flow, please click the link in your email to automatically verify, or paste the "secret" from the link here.
                    </p>
                </div>
                <input
                  type="text"
                  placeholder="Paste Secret Token"
                  className="w-full p-3 border border-gray-300 rounded-sm outline-none focus:border-charcoal text-xs"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                />
                <button type="submit" className="w-full bg-charcoal text-white py-3 uppercase tracking-widest text-sm font-bold">
                  Continue
                </button>
                <div className="text-center mt-4">
                    {timer > 0 ? (
                        <span className="text-xs text-gray-400">Resend available in {timer}s</span>
                    ) : (
                        <button type="button" onClick={handleSendEmail} className="text-xs text-charcoal underline font-bold">Resend Link</button>
                    )}
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-sm outline-none focus:border-charcoal"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-charcoal transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm Password"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-sm outline-none focus:border-charcoal"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-charcoal transition-colors"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <button type="submit" className="w-full bg-charcoal text-white py-3 uppercase tracking-widest text-sm font-bold">
                  Save New Password
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;