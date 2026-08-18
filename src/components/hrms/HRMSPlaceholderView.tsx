import React from 'react';
import { motion } from 'motion/react';
import { Users2 } from 'lucide-react';

export default function HRMSPlaceholderView() {
  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200/80 p-10 shadow-xs text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
          <Users2 className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Human Resources Management System (HRMS)
          </h2>
          <p className="text-sm font-bold text-[#f7b944]">
            Coming Soon
          </p>
        </div>
      </motion.div>
    </div>
  );
}
