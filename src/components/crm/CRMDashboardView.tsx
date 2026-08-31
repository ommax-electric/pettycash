import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { 
  Briefcase, 
  Building2, 
  Users, 
  Target, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle2, 
  XCircle,
  IndianRupee, 
  Clock, 
  ChevronRight,
  Filter,
  Calendar,
  Percent
} from 'lucide-react';
import { CRMAccount, CRMContact, CRMOpportunity, CRMSettings } from '../../crm/types';
import { User, AppSettings, formatDateToDMY } from '../../types';

interface CRMDashboardViewProps {
  accounts: CRMAccount[];
  contacts: CRMContact[];
  opportunities: CRMOpportunity[];
  crmSettings: CRMSettings;
  currentUser: User;
  appSettings?: AppSettings;
  onNavigateToAccounts: () => void;
  onNavigateToContacts: () => void;
  onNavigateToOpportunities: () => void;
}

export default function CRMDashboardView({
  accounts,
  contacts,
  opportunities,
  crmSettings,
  currentUser,
  appSettings,
  onNavigateToAccounts,
  onNavigateToContacts,
  onNavigateToOpportunities
}: CRMDashboardViewProps) {
  const currencySymbol = appSettings?.currencySymbol || crmSettings.defaultCurrency || '₹';

  // Metrics computation
  const totalPipelineValue = useMemo(() => {
    return opportunities
      .filter(o => o.stage !== 'CLOSED_LOST')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }, [opportunities]);

  const averageDealValue = useMemo(() => {
    const activeOpps = opportunities.filter(o => o.stage !== 'CLOSED_LOST');
    if (activeOpps.length === 0) return 0;
    const sum = activeOpps.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
    return Math.round(sum / activeOpps.length);
  }, [opportunities]);

  const wonDealsValue = useMemo(() => {
    return opportunities
      .filter(o => o.stage === 'CLOSED_WON')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }, [opportunities]);

  const openDealsCount = useMemo(() => {
    return opportunities.filter(o => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST').length;
  }, [opportunities]);

  const activeAccountsCount = useMemo(() => {
    return accounts.filter(a => a.status === 'ACTIVE').length;
  }, [accounts]);

  // Conversion & Win Rate Stats (Dynamic calculation)
  const conversionStats = useMemo(() => {
    const wonOpps = opportunities.filter(o => o.stage === 'CLOSED_WON');
    const lostOpps = opportunities.filter(o => o.stage === 'CLOSED_LOST');
    const activeOpps = opportunities.filter(o => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST');

    const wonCount = wonOpps.length;
    const lostCount = lostOpps.length;
    const activeCount = activeOpps.length;
    const closedCount = wonCount + lostCount;

    const wonValue = wonOpps.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const lostValue = lostOpps.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const activeValue = activeOpps.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    const winRate = closedCount > 0 
      ? Math.round((wonCount / closedCount) * 1000) / 10 
      : (wonCount > 0 ? 100 : (opportunities.length > 0 ? 0 : 0));

    // Dynamic period comparison (Recent 30 days vs Prior 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    const currentPeriodClosed = opportunities.filter(o => {
      const isClosed = o.stage === 'CLOSED_WON' || o.stage === 'CLOSED_LOST';
      if (!isClosed) return false;
      const t = new Date(o.updatedAt || o.createdAt || 0).getTime();
      return t >= thirtyDaysAgo;
    });

    const previousPeriodClosed = opportunities.filter(o => {
      const isClosed = o.stage === 'CLOSED_WON' || o.stage === 'CLOSED_LOST';
      if (!isClosed) return false;
      const t = new Date(o.updatedAt || o.createdAt || 0).getTime();
      return t >= sixtyDaysAgo && t < thirtyDaysAgo;
    });

    let trendLabel = '';
    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (previousPeriodClosed.length > 0) {
      const currWon = currentPeriodClosed.filter(o => o.stage === 'CLOSED_WON').length;
      const currRate = currentPeriodClosed.length > 0 ? (currWon / currentPeriodClosed.length) * 100 : 0;
      const prevWon = previousPeriodClosed.filter(o => o.stage === 'CLOSED_WON').length;
      const prevRate = (prevWon / previousPeriodClosed.length) * 100;
      const diff = Math.round((currRate - prevRate) * 10) / 10;

      if (diff > 0) {
        trendLabel = `+${diff}% vs prev 30d`;
        trendDirection = 'up';
      } else if (diff < 0) {
        trendLabel = `${diff}% vs prev 30d`;
        trendDirection = 'down';
      } else {
        trendLabel = `0% vs prev 30d`;
        trendDirection = 'neutral';
      }
    } else if (closedCount > 0) {
      trendLabel = `${wonCount} of ${closedCount} closed`;
      trendDirection = 'neutral';
    } else {
      trendLabel = `0 closed`;
      trendDirection = 'neutral';
    }

    const pieData = [
      { name: 'Won', count: wonCount, value: wonCount || (lostCount === 0 && activeCount === 0 ? 1 : 0), amount: wonValue, color: '#10b981' },
      { name: 'Lost', count: lostCount, value: lostCount, amount: lostValue, color: '#f43f5e' },
      { name: 'In Pipeline', count: activeCount, value: activeCount, amount: activeValue, color: '#0ea5e9' }
    ].filter(d => d.value > 0);

    return {
      wonCount,
      lostCount,
      activeCount,
      closedCount,
      wonValue,
      lostValue,
      activeValue,
      winRate,
      trendLabel,
      trendDirection,
      pieData
    };
  }, [opportunities]);

  // Funnel by Stage (with counts and values)
  const stageStats = useMemo(() => {
    const stageMap: Record<string, { count: number; value: number }> = {};
    crmSettings.pipelineStages.forEach(s => {
      stageMap[s.id] = { count: 0, value: 0 };
    });

    opportunities.forEach(o => {
      if (stageMap[o.stage]) {
        stageMap[o.stage].count += 1;
        stageMap[o.stage].value += Number(o.amount) || 0;
      }
    });

    return crmSettings.pipelineStages.map(s => ({
      stage: s.label,
      rawStage: s.id,
      count: stageMap[s.id]?.count || 0,
      value: stageMap[s.id]?.value || 0,
      color: s.color,
      displayLabel: `${s.label} (${stageMap[s.id]?.count || 0})`
    }));
  }, [opportunities, crmSettings]);

  // Lead Source Breakdown (with counts and values)
  const leadSourceData = useMemo(() => {
    const sourceMap: Record<string, { value: number; count: number }> = {};
    opportunities.forEach(o => {
      const src = o.leadSource || 'Direct Referral';
      if (!sourceMap[src]) {
        sourceMap[src] = { value: 0, count: 0 };
      }
      sourceMap[src].value += Number(o.amount) || 0;
      sourceMap[src].count += 1;
    });

    const colors = ['#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6'];
    return Object.entries(sourceMap).map(([name, data], idx) => ({
      name,
      value: data.value,
      count: data.count,
      color: colors[idx % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [opportunities]);

  // Recent 10 Opportunities (Sorted by latest createdAt/date)
  const recentOpportunities = useMemo(() => {
    return [...opportunities]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      })
      .slice(0, 10);
  }, [opportunities]);

  return (
    <div className="space-y-4 pb-10 sm:pb-14">
      
      {/* 1. TOP SUMMARY CARDS (Matching Cash Book / Petty Cash Palette & Typography) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Pipeline Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Total Pipeline
            </span>
            <span className="text-sky-600 bg-sky-50 p-1.5 rounded-lg shrink-0">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {currencySymbol}{totalPipelineValue.toLocaleString('en-IN')}
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="text-sky-600 font-bold">{openDealsCount} active</span> deals in pipeline
            </p>
          </div>
        </div>

        {/* Average Deal Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Average Deal Value
            </span>
            <span className="text-purple-600 bg-purple-50 p-1.5 rounded-lg shrink-0">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {currencySymbol}{averageDealValue.toLocaleString('en-IN')}
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-purple-500 shrink-0" />
              Across active pipeline
            </p>
          </div>
        </div>

        {/* Closed Won Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Won Revenue
            </span>
            <span className="text-emerald-600 bg-emerald-50 p-1.5 rounded-lg shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-none">
              {currencySymbol}{wonDealsValue.toLocaleString('en-IN')}
            </p>
            <p className="text-[9px] text-emerald-600 mt-1.5 flex items-center gap-1 font-bold">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" />
              Closed won deals
            </p>
          </div>
        </div>

        {/* Client Accounts & Contacts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block leading-tight">
              Client Base
            </span>
            <span className="text-amber-600 bg-amber-50 p-1.5 rounded-lg shrink-0">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {accounts.length} <span className="text-xs font-bold text-slate-400">Accounts</span>
            </p>
            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="text-amber-600 font-bold">{contacts.length}</span> Key contacts
            </p>
          </div>
        </div>

      </div>

      {/* 2. MAIN CHARTS GRID (Stage Distribution : Sales Conversion : Lead Source Channels) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Chart 1: Deal Stage Funnel Distribution (6 cols - 50%) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[340px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Deal Distribution by Stage</h3>
              <p className="text-[11px] text-slate-400">Deal volume and total expected value per pipeline phase</p>
            </div>
            <button
              onClick={onNavigateToOpportunities}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              View Deals <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageStats} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="stage" 
                  interval={0}
                  tick={{ fontSize: 8.5, fill: '#64748b', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${currencySymbol}${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-1">
                          <p className="font-bold text-slate-900">{data.stage}</p>
                          <div className="flex items-center justify-between gap-4 text-slate-600 text-[11px]">
                            <span>Value:</span>
                            <span className="font-mono font-bold text-slate-900">{currencySymbol}{Number(data.value).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-600 text-[11px]">
                            <span>Opportunities:</span>
                            <span className="font-bold text-sky-600">{data.count} {data.count === 1 ? 'deal' : 'deals'}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stageStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Sales Conversion & Win Rate (3 cols - 25%) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Sales Conversion</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
                conversionStats.trendDirection === 'up'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  : conversionStats.trendDirection === 'down'
                  ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                  : 'bg-slate-50 text-slate-600 border-slate-200/60'
              }`}>
                {conversionStats.trendDirection === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />}
                {conversionStats.trendDirection === 'down' && <ArrowDownRight className="w-3 h-3 text-rose-600 shrink-0" />}
                {conversionStats.trendLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">Win rate & closure health</p>

            <div className="h-36 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionStats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {conversionStats.pieData.map((entry, index) => (
                      <Cell key={`cell-conv-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-md text-[11px]">
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-slate-600">{item.count} deals ({currencySymbol}{Math.round(item.amount / 1000)}k)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Win Rate Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 leading-none">
                  {conversionStats.winRate}%
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  Win Rate
                </span>
              </div>
            </div>
          </div>

          {/* Sub metrics breakdown */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-slate-600 font-medium truncate">Won</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                  {conversionStats.wonCount} {conversionStats.wonCount === 1 ? 'deal' : 'deals'}
                </span>
                <span className="font-bold text-slate-900 font-mono text-[11px]">
                  {currencySymbol}{Math.round(conversionStats.wonValue / 1000)}k
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                <span className="text-slate-600 font-medium truncate">Lost</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                  {conversionStats.lostCount} {conversionStats.lostCount === 1 ? 'deal' : 'deals'}
                </span>
                <span className="font-bold text-slate-900 font-mono text-[11px]">
                  {currencySymbol}{Math.round(conversionStats.lostValue / 1000)}k
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                <span className="text-slate-600 font-medium truncate">In Pipeline</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded">
                  {conversionStats.activeCount} {conversionStats.activeCount === 1 ? 'deal' : 'deals'}
                </span>
                <span className="font-bold text-slate-900 font-mono text-[11px]">
                  {currencySymbol}{Math.round(conversionStats.activeValue / 1000)}k
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Lead Source Channels (3 cols - 25%) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[340px]">
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-1">Lead Source Channels</h3>
            <p className="text-[11px] text-slate-400 mb-2">Pipeline volume & count by source</p>

            <div className="h-36 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-md text-[11px]">
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-slate-600">{item.count} {item.count === 1 ? 'deal' : 'deals'} · {currencySymbol}{Number(item.value).toLocaleString('en-IN')}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            {leadSourceData.slice(0, 4).map((src, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: src.color }}></span>
                  <span className="text-slate-600 font-medium truncate max-w-[90px] sm:max-w-[120px]">{src.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                    {src.count} {src.count === 1 ? 'deal' : 'deals'}
                  </span>
                  <span className="font-bold text-slate-900 shrink-0 font-mono text-[11px]">
                    {currencySymbol}{Math.round(src.value / 1000)}k
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. RECENT DEALS & HIGH PRIORITY PIPELINE */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[340px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Recent Opportunities</h3>
              <p className="text-[11px] text-slate-400">Latest active sales deals and pipeline additions</p>
            </div>
            <button
              onClick={onNavigateToOpportunities}
              className="py-1.5 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              All Opportunities ({opportunities.length})
            </button>
          </div>

          {/* Mobile View: Responsive Cards List */}
          <div className="space-y-3 sm:hidden pb-2">
            {recentOpportunities.length === 0 ? (
              <div className="text-center py-6 text-slate-400 font-medium text-xs">
                No recent opportunities found.
              </div>
            ) : (
              recentOpportunities.map(opp => {
                const stageConfig = crmSettings.pipelineStages.find(s => s.id === opp.stage);
                return (
                  <div 
                    key={opp.id} 
                    className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{opp.title}</p>
                        <span className="text-[10px] font-mono text-slate-400">{opp.id}</span>
                      </div>
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0"
                        style={{ 
                          backgroundColor: `${stageConfig?.color || '#64748b'}10`,
                          color: stageConfig?.color || '#64748b',
                          borderColor: `${stageConfig?.color || '#64748b'}30`
                        }}
                      >
                        {stageConfig?.label || opp.stage}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block font-medium">Account & Contact</span>
                        <p className="font-semibold text-slate-800 truncate">{opp.accountName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{opp.contactName || 'Direct'}</p>
                      </div>
                      <div className="text-right min-w-0">
                        <span className="text-[10px] text-slate-400 block font-medium">Deal Value</span>
                        <p className="font-extrabold text-slate-900 font-mono text-xs truncate">
                          {currencySymbol}{Number(opp.amount).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400">{opp.probability}% prob.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Target Close: <strong className="text-slate-600 font-medium">{opp.expectedCloseDate ? formatDateToDMY(opp.expectedCloseDate) : 'TBD'}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop / Tablet View: Table with smooth horizontal scroll container */}
          <div className="hidden sm:block overflow-x-auto pb-3 pt-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opportunity / Project</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account & Contact</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stage</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Value ({currencySymbol})</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Probability</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Close</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400 font-medium text-xs">
                      No recent opportunities found.
                    </td>
                  </tr>
                ) : (
                  recentOpportunities.map(opp => {
                    const stageConfig = crmSettings.pipelineStages.find(s => s.id === opp.stage);
                    return (
                      <tr key={opp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-slate-800">{opp.title}</p>
                          <span className="text-[10px] font-mono text-slate-400">{opp.id}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-slate-800">{opp.accountName}</p>
                          <p className="text-[10px] text-slate-400">{opp.contactName || 'Direct'}</p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span 
                            className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border"
                            style={{ 
                              backgroundColor: `${stageConfig?.color || '#64748b'}10`,
                              color: stageConfig?.color || '#64748b',
                              borderColor: `${stageConfig?.color || '#64748b'}30`
                            }}
                          >
                            {stageConfig?.label || opp.stage}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 font-mono text-xs whitespace-nowrap">
                          {currencySymbol}{Number(opp.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700 text-xs">
                          {opp.probability}%
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {opp.expectedCloseDate ? formatDateToDMY(opp.expectedCloseDate) : 'TBD'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
