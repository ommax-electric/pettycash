import React from 'react';
import { motion } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Clock, ChevronRight, Wallet, Landmark, Activity, Calendar, ChevronDown } from 'lucide-react';
import { Transaction, CategoryLimit, User, AppSettings } from '../types';
import { MOCK_MONTHLY_TRENDS } from '../data';

const formatDateFormatted = (dateStr: string, formatStr: string = 'DD/MM/YYYY') => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2];
    if (formatStr === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
    if (formatStr === 'DD-MM-YYYY') return `${dd}-${mm}-${yyyy}`;
    if (formatStr === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
    if (formatStr === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
    if (formatStr === 'DD-MMM-YYYY') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(mm, 10) - 1;
      const mmm = monthNames[monthIdx] || mm;
      return `${dd}-${mmm}-${yyyy}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
};

interface DashboardViewProps {
  transactions: Transaction[];
  categories: CategoryLimit[];
  currentUser: User;
  onNavigateToRegister: () => void;
  appSettings?: AppSettings;
}

export default function DashboardView({ transactions, categories, currentUser, onNavigateToRegister, appSettings }: DashboardViewProps) {
  const symbol = appSettings?.currencySymbol || '₹';
  const dateFormat = appSettings?.dateFormat || 'DD/MM/YYYY';

  // 1. Calculate actual current year and dynamic available years from transactions
  const actualCurrentYear = new Date().getFullYear().toString();

  const availableYears = React.useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(actualCurrentYear);

    transactions.forEach(t => {
      if (t.date && t.date.length >= 4) {
        const y = t.date.split('-')[0];
        if (/^\d{4}$/.test(y)) {
          yearsSet.add(y);
        }
      }
    });

    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [transactions, actualCurrentYear]);

  const [selectedYear, setSelectedYear] = React.useState<string>(actualCurrentYear);

  // Fallback to actualCurrentYear if selectedYear is not present
  const effectiveYear = availableYears.includes(selectedYear) ? selectedYear : actualCurrentYear;

  // 2. Calculations based on APPROVED transactions
  // Overall Deposit (for selected year)
  const overallDepositSelectedYear = transactions
    .filter(t => t.type === 'IN' && t.status === 'APPROVED' && t.date.startsWith(effectiveYear))
    .reduce((sum, t) => sum + t.amount, 0);

  // Overall Expenses (for selected year)
  const overallExpensesSelectedYear = transactions
    .filter(t => t.type === 'OUT' && t.status === 'APPROVED' && t.date.startsWith(effectiveYear))
    .reduce((sum, t) => sum + t.amount, 0);

  const cashExpensesSelectedYear = transactions
    .filter(t => t.type === 'OUT' && t.status === 'APPROVED' && t.date.startsWith(effectiveYear) && t.paymentType !== 'ONLINE')
    .reduce((sum, t) => sum + t.amount, 0);

  const onlineExpensesSelectedYear = transactions
    .filter(t => t.type === 'OUT' && t.status === 'APPROVED' && t.date.startsWith(effectiveYear) && t.paymentType === 'ONLINE')
    .reduce((sum, t) => sum + t.amount, 0);

  // Cash on hand accumulated up to the end of selected year (since balance carries forward)
  const approvedInflowUpToSelectedYear = transactions
    .filter(t => t.type === 'IN' && t.status === 'APPROVED' && t.date && t.date <= `${effectiveYear}-12-31`)
    .reduce((sum, t) => sum + t.amount, 0);

  const approvedOutflowCashUpToSelectedYear = transactions
    .filter(t => t.type === 'OUT' && t.status === 'APPROVED' && t.paymentType !== 'ONLINE' && t.date && t.date <= `${effectiveYear}-12-31`)
    .reduce((sum, t) => sum + t.amount, 0);

  const cashOnHandSelectedYear = approvedInflowUpToSelectedYear - approvedOutflowCashUpToSelectedYear;

  // Avg. Expenses for the selected year
  const selectedYearExpenses = transactions
    .filter(t => t.type === 'OUT' && t.status === 'APPROVED' && t.date.startsWith(effectiveYear));
  const avgExpensesSelectedYear = selectedYearExpenses.length > 0
    ? selectedYearExpenses.reduce((sum, t) => sum + t.amount, 0) / selectedYearExpenses.length
    : 0;

  // Monthly trend data for the selected year (strict calculation, no mock fallback)
  const monthlyTrendData = React.useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames.map((m, idx) => {
      const monthStr = String(idx + 1).padStart(2, '0');
      const prefix = `${effectiveYear}-${monthStr}`;
      const inflow = transactions
        .filter(t => t.type === 'IN' && t.status === 'APPROVED' && t.date && t.date.startsWith(prefix))
        .reduce((sum, t) => sum + t.amount, 0);
      const outflow = transactions
        .filter(t => t.type === 'OUT' && t.status === 'APPROVED' && t.date && t.date.startsWith(prefix))
        .reduce((sum, t) => sum + t.amount, 0);
      return { month: m, inflow, outflow };
    });
  }, [transactions, effectiveYear]);

  // Format Category Spent data for Pie Chart (for the selected year, outward categories only)
  const categoryChartData = categories
    .filter(cat => cat.type !== 'IN')
    .map(cat => ({
      name: cat.name,
      value: transactions
        .filter(t => t.category === cat.name && t.type === 'OUT' && t.status === 'APPROVED' && t.date.startsWith(effectiveYear))
        .reduce((sum, t) => sum + t.amount, 0),
      color: cat.color
    })).filter(data => data.value > 0);

  // Fallback pie data if no expenses recorded for selected year
  const activePieData = categoryChartData.length > 0 ? categoryChartData : [
    { name: 'No Expenses', value: 1, color: '#cbd5e1' }
  ];

  // Dynamic calculations for progress bars (for the selected year, outward categories sorted by spent descending)
  const computedCategories = categories
    .filter(cat => cat.type !== 'IN')
    .map(cat => {
      const currentSpent = transactions
        .filter(t => t.category === cat.name && t.type === 'OUT' && t.status === 'APPROVED' && t.date.startsWith(effectiveYear))
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...cat,
        spent: currentSpent
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-auto pb-10 sm:pb-14">
      {/* YEAR SELECTOR FILTER HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:col-span-4 col-span-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#f7b944] flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Financial Year Overview
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                FY {effectiveYear}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Filter deposit, disbursements & trends by year</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="dashboard-year-select" className="text-xs font-bold text-slate-500 whitespace-nowrap">
            Select Year:
          </label>
          <select
            id="dashboard-year-select"
            value={effectiveYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-200 focus:border-slate-300 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-700 transition-all h-[34px] cursor-pointer shadow-2xs"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year} {year === actualCurrentYear ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* 4 STATS CARDS GRID - 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-4 col-span-1">
        {/* CARD 1: OVERALL DEPOSIT */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Overall Deposit ({effectiveYear})
            </span>
            <span className="text-emerald-600 bg-emerald-50 p-1.5 rounded-lg shrink-0">
              <Landmark className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-none">
              {symbol}{overallDepositSelectedYear.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" />
              Annual float deposits
            </p>
          </div>
        </motion.div>

        {/* CARD 2: OVERALL EXPENSES */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Overall Expenses ({effectiveYear})
            </span>
            <span className="text-rose-600 bg-rose-50 p-1.5 rounded-lg shrink-0">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight leading-none">
              {symbol}{overallExpensesSelectedYear.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-semibold text-slate-500 mt-1.5 leading-snug">
              (Cash: {symbol}{cashExpensesSelectedYear.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Online: {symbol}{onlineExpensesSelectedYear.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </p>
            <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3 text-rose-500 shrink-0" />
              Annual disbursements
            </p>
          </div>
        </motion.div>

        {/* CARD 3: CASH ON HAND */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Cash on Hand
            </span>
            <span className="text-blue-600 bg-blue-50 p-1.5 rounded-lg shrink-0">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {symbol}{cashOnHandSelectedYear.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-500 shrink-0" />
              Active balance as of {effectiveYear}
            </p>
          </div>
        </motion.div>

        {/* CARD 4: AVG. EXPENSES */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Avg. Expense's
            </span>
            <span className="text-amber-600 bg-amber-50 p-1.5 rounded-lg shrink-0 font-bold text-[11px] font-mono">
              {symbol}
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none">
              {symbol}{avgExpensesSelectedYear.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-500 shrink-0" />
              Average per expense ({effectiveYear})
            </p>
          </div>
        </motion.div>
      </div>

      {/* GROUP CONTAINER FOR CHART (60%) AND BREAKDOWN (40%) SIDE-BY-SIDE ON LARGE SCREENS */}
      <div className="md:col-span-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* CARD 4: OUTFLOW ANALYTICS GRAPH (BENTO CELL 4 - SPANS 3 OF 5 COLS) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[320px]"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Cash Deposits & Expenses Trend</h3>
              <p className="text-[11px] text-slate-400">Petty cash flow trend for FY {effectiveYear}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Ledger Activity</span>
            </div>
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', fontFamily: 'Inter', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                <Area type="monotone" name={`Cash Deposits (${symbol})`} dataKey="inflow" stroke="#10b981" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                <Area type="monotone" name={`Expenses (${symbol})`} dataKey="outflow" stroke="#f43f5e" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* CARD 7: DEPARTMENTAL BREAKDOWN & PIE (BENTO CELL 7 - SPANS 2 OF 5 COLS) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[320px]"
        >
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-1">Category Wise Breakdown</h3>
            <p className="text-[11px] text-slate-400 mb-4">Expenses across categories for {effectiveYear}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
            {/* Recharts Pie */}
            <div className="h-36 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${symbol}${value.toFixed(2)}`} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest text-center leading-none">Spent ({effectiveYear})</span>
                <span className="text-sm font-black text-slate-800 mt-0.5">
                  {symbol}{overallExpensesSelectedYear.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Department Progress list - Top 5 Outward Categories */}
            <div className="space-y-2.5">
              {computedCategories.slice(0, 5).map((cat, idx) => {
                const ratio = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
                const percent = Math.min(ratio, 100);
                return (
                  <div key={cat.id || idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="font-mono text-slate-700">
                        {symbol}{cat.spent.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: cat.color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Showing top {Math.min(5, computedCategories.length)} outward categories</span>
          </div>
        </motion.div>
      </div>

      {/* CARD 6: RECENT TRANSACTIONS LEDGER (BENTO CELL 6 - SPANS ALL 4 COLS FOR FULL CARD WIDTH) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="md:col-span-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[340px]"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Recent Transactions</h3>
              <p className="text-[11px] text-slate-400">Recent petty cash deposits and disbursements</p>
            </div>
          </div>
          
          <div className="overflow-x-auto pb-3 pt-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Particulars</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((txn) => {
                  const parts = txn.id.split('-');
                  const lastPart = parts[parts.length - 1];
                  const formattedId = txn.reference || `${txn.type === 'IN' ? 'IW' : 'OW'}-${lastPart}`;
                  const isInflow = txn.type === 'IN';
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {formatDateFormatted(txn.date, dateFormat)}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
                        {formattedId}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                          isInflow 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isInflow ? 'Inward' : 'Outward'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1 max-w-[250px]" title={txn.description}>
                          {txn.description}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 max-w-[200px]" title={txn.merchant}>
                          {txn.merchant}
                        </div>
                      </td>
                      <td className={`py-3.5 px-4 text-xs font-extrabold text-right whitespace-nowrap ${
                        isInflow ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {symbol}{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {isInflow ? 'Cash Source' : txn.category}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
