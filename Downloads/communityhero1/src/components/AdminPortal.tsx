/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, Users, Bot, History, PlusCircle, Trash2, 
  Settings, RefreshCw, BarChart2, ShieldCheck, Activity, Terminal
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { AppState } from '../types';

interface AdminPortalProps {
  state: AppState;
  onAdminConfig: (action: 'reset' | 'add_department', payload?: any) => Promise<any>;
}

export function AdminPortal({
  state,
  onAdminConfig
}: AdminPortalProps) {
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');
  const [newDeptPhone, setNewDeptPhone] = useState('');
  
  // Settings values
  const [threshold, setThreshold] = useState('0.5km');
  const [temperature, setTemperature] = useState(0.2);

  const handleAddDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;

    const res = await onAdminConfig('add_department', {
      name: newDeptName,
      head: newDeptHead,
      phone: newDeptPhone
    });

    if (res && res.success) {
      setNewDeptName('');
      setNewDeptHead('');
      setNewDeptPhone('');
      alert('Department registered successfully!');
    }
  };

  const handleSystemReset = async () => {
    if (confirm('Are you absolutely sure you want to reset the database and state logs? All current custom complaints will be lost.')) {
      await onAdminConfig('reset');
      alert('Database reset completed successfully!');
    }
  };

  // Prepare Analytics Data for Recharts
  const departmentChartData = state.departments.map(d => ({
    name: d.name.split(' ')[0], // short name
    Tickets: d.complaintsCount
  }));

  const statusChartData = [
    { name: 'Reported', value: state.complaints.filter(c => c.status === 'reported').length },
    { name: 'In Progress', value: state.complaints.filter(c => c.status === 'in_progress').length },
    { name: 'Resolved', value: state.complaints.filter(c => c.status === 'resolved').length },
    { name: 'Verifying', value: state.complaints.filter(c => c.status === 'ai_processing').length }
  ];

  const COLORS = ['#f59e0b', '#2563eb', '#10b981', '#8b5cf6'];

  return (
    <div className="space-y-8" id="admin-portal-main">
      
      {/* Admin Title Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 border border-rose-200 rounded-lg font-mono font-bold uppercase tracking-wider">
            ADMIN CENTRAL PORTAL
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-1.5 font-sans tracking-tight">
            City Command Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Monitor municipal service level agreement compliance, define department heads, inspect system audit trail logs, and adjust AI parameters.
          </p>
        </div>

        <button
          onClick={handleSystemReset}
          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl transition-all font-mono text-xs flex items-center gap-2 cursor-pointer"
          id="admin-reset-state"
        >
          <Trash2 className="w-4 h-4" />
          <span>Reset All State</span>
        </button>
      </div>

      {/* Analytics Recharts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="analytics-grid">
        
        {/* Ticket load per Department - BarChart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between col-span-2">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Department Ticket Load</h3>
            <span className="text-[10px] text-slate-400">Distributed counts of active and closed reports</span>
          </div>
          
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData}>
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#1e293b' }} />
                <Bar dataKey="Tickets" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution - PieChart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between col-span-1">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Incident Status Mix</h3>
            <span className="text-[10px] text-slate-400">Live share of ticket states in resolution cycle</span>
          </div>

          <div className="h-44 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#1e293b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-3 border-t border-slate-100">
            {statusChartData.map((s, idx) => (
              <span key={s.name} className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="admin-management-row">
        
        {/* Department Manager & Creation Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold font-sans tracking-tight text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-500" /> Municipal Department Agencies
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
              {state.departments.map((dept) => (
                <div key={dept.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-300 transition-all">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 font-sans">{dept.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Head: <span className="text-slate-700">{dept.head}</span></p>
                    <p className="text-[9px] text-slate-400 font-mono">☎️ {dept.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-blue-600 block">{dept.complaintsCount}</span>
                    <span className="text-[9px] text-slate-400 font-mono uppercase">Tickets</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Department Form */}
            <form onSubmit={handleAddDeptSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <h4 className="text-[10px] font-mono font-semibold uppercase text-slate-500 tracking-wider">Register New Department</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Department Name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Officer Head Name"
                  value={newDeptHead}
                  onChange={(e) => setNewDeptHead(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Direct Hotline"
                  value={newDeptPhone}
                  onChange={(e) => setNewDeptPhone(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register Agency</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* AI & System Settings Parameters panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold font-sans tracking-tight text-slate-800 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-blue-500" /> AI Pipeline Configuration
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Duplicate Suppression Proximity:</span>
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-blue-500"
                >
                  <option value="0.25km">0.25 km Radius (Strict)</option>
                  <option value="0.5km">0.5 km Radius (Recommended)</option>
                  <option value="1km">1.0 km Radius (Broad)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Gemini Generative Temperature:</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 bg-slate-200 rounded-lg cursor-pointer h-1.5"
                  />
                  <span className="font-mono text-xs font-bold text-slate-700 min-w-10 text-right">{temperature}</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                <p className="text-[10px] text-blue-600 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> Pipeline Model Alias
                </p>
                <p className="text-[11px] text-slate-800 font-mono font-bold">gemini-3.5-flash</p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">Configured for structural JSON parsing and instant duplicate suppression scoring.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Audit Trail Logs list */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="audit-trail-section">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold font-sans tracking-tight text-slate-800 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-blue-500 animate-pulse" /> System Audit Trail Logs
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">PERSISTENT SYSTEM LEDGER</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-[240px] overflow-y-auto font-mono text-[10px] p-4 space-y-2.5 shadow-inner">
          {state.auditLogs.map((log) => (
            <div key={log.id} className="border-b border-slate-100 pb-2 hover:bg-slate-100/50 px-1 rounded flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
              <span className="text-slate-400 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
              <span className="text-blue-600 shrink-0 min-w-28">
                [{log.action.toUpperCase()}]
              </span>
              <div className="text-slate-600 flex-1 leading-normal">
                {log.details} <span className="text-[9px] text-slate-400 italic">({log.userName} - {log.userRole})</span>
              </div>
            </div>
          ))}
          {state.auditLogs.length === 0 && (
            <div className="text-center py-6 text-slate-400 italic">No audit trail records compiled.</div>
          )}
        </div>
      </div>

    </div>
  );
}
