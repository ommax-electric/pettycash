import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, User as UserIcon, Lock, AlertTriangle, Eye, EyeOff, IndianRupee } from 'lucide-react';
import { User } from '../types';
import { MOCK_USERS } from '../data';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  usersList?: User[];
}

export default function LoginScreen({ onLoginSuccess, usersList }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const activeUsers = usersList && usersList.length > 0 ? usersList : MOCK_USERS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Simulate network delay
    setTimeout(() => {
      const trimmedUser = username.trim().toLowerCase();
      const trimmedPassword = password.trim();

      const matchedUser = activeUsers.find(u => 
        (u.username && u.username.toLowerCase() === trimmedUser) || 
        (u.empId && u.empId.toLowerCase() === trimmedUser) ||
        (u.email && u.email.toLowerCase() === trimmedUser)
      );

      let isValidPassword = false;

      if (matchedUser) {
        if (matchedUser.password) {
          isValidPassword = password === matchedUser.password || trimmedPassword === matchedUser.password;
        } else {
          const userKey = (matchedUser.username || '').toLowerCase();
          isValidPassword = 
            (userKey === 'admin' && (trimmedPassword === 'admin123' || trimmedPassword === 'admin@123')) ||
            (userKey === 'manager' && (trimmedPassword === 'manager123' || trimmedPassword === 'manager@123')) ||
            (userKey === 'custodian' && (trimmedPassword === 'custodian123' || trimmedPassword === 'custodian@123')) ||
            (userKey === 'moorthi' && (trimmedPassword === 'user123' || trimmedPassword === 'user@123')) ||
            (userKey === 'auditor' && (trimmedPassword === 'auditor123' || trimmedPassword === 'auditor@123'));
        }
      }

      if (matchedUser && isValidPassword) {
        onLoginSuccess(matchedUser);
      } else {
        setError('Invalid username or password.');
        setIsSubmitting(false);
      }
    }, 400);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        {/* Header Banner */}
        <div className="bg-slate-900 px-8 py-8 text-white relative text-center flex flex-col items-center">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#f7b944] text-[#112231] font-bold shadow-md mb-3">
            <IndianRupee className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Petty Cash Register</h1>
          <span className="text-xs font-bold text-[#f7b944] tracking-wide uppercase mt-1">Ommax Electric Private Limited</span>
        </div>

        <div className="p-8">
          {/* Error Prompt */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{error}</div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username-field" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input 
                  id="username-field"
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white focus:outline-hidden rounded-xl text-sm transition-all" 
                  placeholder="Enter username" 
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-field" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  id="password-field"
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white focus:outline-hidden rounded-xl text-sm transition-all" 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authorizing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Log In
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>

      <div className="mt-6 text-center text-xs text-slate-400">
        Developed & Managed by <span className="font-extrabold text-[#ed3833]">Ommax</span> <span className="font-extrabold text-[#f7b944]">Electric</span> Private Limited
      </div>
    </div>
  );
}
