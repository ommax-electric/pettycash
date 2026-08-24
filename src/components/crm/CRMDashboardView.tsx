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
  CheckCircle2, 
  IndianRupee, 
  Clock, 
  ChevronRight,
  Filter,
  Calendar
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

  // Funnel by Stage
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
      color: s.color
    }));
  }, [opportunities, crmSettings]);

  // Lead Source Breakdown
  const leadSourceData = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    opportunities.forEach(o => {
      const src = o.leadSource || 'Direct Referral';
      sourceMap[src] = (sourceMap[src] || 0) + (Number(o.amount) || 0);
    });

    const colors = ['#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6'];
    return Object.entries(sourceMap).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));
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
    <div className="space-y-6">
      
      {/* 1. TOP SUMMARY CARDS (Matching Cash Book / Petty Cash Palette & Border Math) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Pipeline Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Pipeline</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Target className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 truncate">
              {currencySymbol}{totalPipelineValue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-medium truncate flex items-center gap-1">
              <span className="text-sky-600 font-bold">{openDealsCount} active</span> in progress
            </p>
          </div>
        </div>

        {/* Average Deal Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Average Deal Value</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <IndianRupee className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 truncate">
              {currencySymbol}{averageDealValue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-medium truncate">
              Across active pipeline
            </p>
          </div>
        </div>

        {/* Closed Won Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Won Revenue</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 truncate">
              {currencySymbol}{wonDealsValue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] sm:text-xs text-emerald-600 mt-0.5 sm:mt-1 font-bold truncate flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> Closed Deals
            </p>
          </div>
        </div>

        {/* Client Accounts & Contacts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Client Base</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Building2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 truncate">
              {accounts.length} <span className="text-xs sm:text-sm font-bold text-slate-400">Accounts</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-medium truncate flex items-center gap-1">
              <span className="text-amber-600 font-bold">{contacts.length}</span> Key contacts
            </p>
          </div>
        </div>

      </div>

      {/* 2. MAIN CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Deal Stage Funnel Distribution (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Deal Distribution by Stage</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Deal volume and total expected value per pipeline phase</p>
            </div>
            <button
              onClick={onNavigateToOpportunities}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              View Deals <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageStats} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="stage" 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  tickFormatter={(val) => `${currencySymbol}${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip 
                  formatter={(val: any) => [`${currencySymbol}${Number(val).toLocaleString('en-IN')}`, 'Value']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#f7b944', marginBottom: '4px' }}
                  itemStyle={{ color: '#ffffff' }}
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

        {/* Lead Source Breakdown (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Lead Source Channels</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Pipeline volume by source</p>

            <div className="h-48 w-full mt-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${currencySymbol}${Number(val).toLocaleString('en-IN')}`, 'Value']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#f7b944', marginBottom: '4px' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            {leadSourceData.slice(0, 4).map((src, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: src.color }}></span>
                  <span className="text-slate-600 font-medium truncate">{src.name}</span>
                </div>
                <span className="font-bold text-slate-900 shrink-0 font-mono">
                  {currencySymbol}{Math.round(src.value / 1000)}k
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. RECENT DEALS & HIGH PRIORITY PIPELINE */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Recent Opportunities</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-medium">Latest active sales deals and pipeline additions</p>
          </div>
          <button
            onClick={onNavigateToOpportunities}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
          >
            All Opportunities ({opportunities.length})
          </button>
        </div>

        {/* Mobile View: Responsive Cards List */}
        <div className="space-y-3 sm:hidden">
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
                  className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{opp.title}</p>
                      <span className="text-[10px] font-mono text-slate-400">{opp.id}</span>
                    </div>
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono shrink-0"
                      style={{ 
                        backgroundColor: `${stageConfig?.color || '#64748b'}15`,
                        color: stageConfig?.color || '#64748b',
                        border: `1px solid ${stageConfig?.color || '#64748b'}30`
                      }}
                    >
                      {stageConfig?.label || opp.stage}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Account & Contact</span>
                      <p className="font-bold text-slate-800 truncate">{opp.accountName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{opp.contactName || 'Direct'}</p>
                    </div>
                    <div className="text-right min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Deal Value</span>
                      <p className="font-bold text-slate-900 font-mono text-xs truncate">
                        {currencySymbol}{Number(opp.amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-500">{opp.probability}% prob.</p>
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
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Opportunity / Project</th>
                <th className="pb-3 px-3">Account & Contact</th>
                <th className="pb-3 px-3">Stage</th>
                <th className="pb-3 px-3 text-right">Value ({currencySymbol})</th>
                <th className="pb-3 px-3 text-center">Probability</th>
                <th className="pb-3 px-3">Target Close</th>
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
                    <tr key={opp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{opp.title}</p>
                        <span className="text-[10px] font-mono text-slate-400">{opp.id}</span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{opp.accountName}</p>
                        <p className="text-[10px] text-slate-400">{opp.contactName || 'Direct'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono"
                          style={{ 
                            backgroundColor: `${stageConfig?.color || '#64748b'}15`,
                            color: stageConfig?.color || '#64748b',
                            border: `1px solid ${stageConfig?.color || '#64748b'}30`
                          }}
                        >
                          {stageConfig?.label || opp.stage}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                        {currencySymbol}{Number(opp.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {opp.probability}%
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
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
  );
}
