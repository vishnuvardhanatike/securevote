/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, Hammer, CheckCircle, Clock, Calendar, 
  MapPin, Send, MessageSquare, Bot, ArrowRight, User, Sparkles, ChevronDown 
} from 'lucide-react';
import { AppState, User as UserType, Complaint } from '../types';
import { Timeline } from './Timeline';
import { InteractiveMap } from './InteractiveMap';

interface OfficerPortalProps {
  state: AppState;
  currentUser: UserType;
  onUpdateProgress: (complaintId: string, percentage: number, note: string) => Promise<void>;
  onAskCopilot: (query: string) => Promise<{ reply: string }>;
}

export function OfficerPortal({
  state,
  currentUser,
  onUpdateProgress,
  onAskCopilot
}: OfficerPortalProps) {
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  
  // Progress Manager Fields
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressNote, setProgressNote] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Copilot Assistant Fields
  const [copilotQuery, setCopilotQuery] = useState<string>('');
  const [copilotReply, setCopilotReply] = useState<string>('');
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);

  // Get active department of logged-in officer
  const officerDept = state.departments.find(d => d.id === currentUser.departmentId);
  const departmentName = officerDept ? officerDept.name : '';

  // Filter complaints assigned ONLY to this officer's department
  const departmentComplaints = state.complaints.filter(c => c.department === departmentName);

  // Core KPI Stats
  const backlogCount = departmentComplaints.filter(c => c.status !== 'resolved').length;
  const criticalCount = departmentComplaints.filter(c => c.status !== 'resolved' && (c.severity === 'critical' || c.severity === 'high')).length;
  const resolvedCount = departmentComplaints.filter(c => c.status === 'resolved').length;

  const handleSelectComplaint = (comp: Complaint) => {
    setSelectedCompId(comp.id);
    setProgressPercent(comp.progressPercent);
    setProgressNote('');
  };

  const selectedComp = departmentComplaints.find(c => c.id === selectedCompId);
  const selectedCompAI = selectedComp ? state.complaintAI[selectedComp.id] : null;

  // Handle Progress Update submit
  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompId) return;

    setUpdating(true);
    await onUpdateProgress(selectedCompId, progressPercent, progressNote || `Progress updated by Officer ${currentUser.name}`);
    setUpdating(false);
    setProgressNote('');
    alert('Progress updated and dispatched successfully!');
  };

  // Submit AI Copilot request
  const handleCopilotSubmit = async (queryText: string) => {
    const q = queryText || copilotQuery;
    if (!q) return;

    setCopilotLoading(true);
    setCopilotReply('');
    const res = await onAskCopilot(q);
    setCopilotReply(res.reply);
    setCopilotLoading(false);
    setCopilotQuery('');
  };

  // Calculate SLA countdown style
  const getSLADeadlineString = (comp: Complaint) => {
    if (comp.status === 'resolved') return { text: 'Resolved SLA Met', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    
    const deadline = new Date(comp.slaDeadline || '');
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffHrs < 0) {
      return { text: `OVERDUE by ${Math.abs(diffHrs)}h`, class: 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse' };
    }
    return { text: `${diffHrs}h remaining`, class: diffHrs <= 6 ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600 border border-slate-200' };
  };

  return (
    <div className="space-y-8" id="officer-portal-main">
      
      {/* Officer Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 border border-blue-200 rounded-lg font-mono font-bold uppercase tracking-wider">
            {departmentName.toUpperCase()} DEPARTMENT
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-1.5 font-sans tracking-tight">
            Officer Console: {currentUser.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Dispatch team allocations, update completion metrics, and review Gemini AI incident triage logs.
          </p>
        </div>

        {/* Small KPI indicators */}
        <div className="flex gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-w-24 text-center font-mono">
            <span className="text-xs text-slate-400 block">Backlog</span>
            <span className="text-xl font-extrabold text-slate-800">{backlogCount}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-w-24 text-center font-mono">
            <span className="text-xs text-slate-400 block">Critical</span>
            <span className="text-xl font-extrabold text-rose-600">{criticalCount}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-w-24 text-center font-mono">
            <span className="text-xs text-slate-400 block">Resolved</span>
            <span className="text-xl font-extrabold text-emerald-600">{resolvedCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Complaints Assigned List & Map */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-sans tracking-tight text-slate-800 flex items-center gap-1.5">
              <Hammer className="w-4 h-4 text-blue-500" /> Department Tickets ({departmentComplaints.length})
            </h3>
          </div>

          {/* Interactive Map Overlay focused on Assigned complaints */}
          <InteractiveMap 
            complaints={departmentComplaints}
            selectedComplaintId={selectedCompId || undefined}
            onSelectComplaint={handleSelectComplaint}
          />

          {/* Ticket queue checklist cards */}
          <div className="space-y-3 h-[450px] overflow-y-auto pr-1">
            {departmentComplaints.map((item) => {
              const isSelected = item.id === selectedCompId;
              const slaBadge = getSLADeadlineString(item);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectComplaint(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex flex-col gap-2.5 cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-100 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  id={`officer-ticket-${item.id}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                      Ticket #{item.id.replace('comp_', '')}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${slaBadge.class}`}>
                      {slaBadge.text}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {item.address.split(',')[0]}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 w-full text-[10px] font-mono text-slate-500">
                    <span>Upvotes: <strong className="text-slate-800">{item.supportCount}</strong></span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> {item.progressPercent}% Done
                    </span>
                  </div>
                </button>
              );
            })}
            
            {departmentComplaints.length === 0 && (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl shadow-sm">
                <p className="text-xs text-slate-400 italic font-sans">No tickets currently assigned to {departmentName || 'your department'}.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Complaint details & Copilot Assistant */}
        <div className="lg:col-span-2 space-y-8">
          
          {selectedComp ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="officer-detail-card">
              
              {/* Card Header metadata */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-snug">{selectedComp.title}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" /> {selectedComp.address}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block">Reported By</span>
                  <span className="text-xs font-semibold text-slate-700">{selectedComp.citizenName}</span>
                </div>
              </div>

              {/* Gemini AI summary metadata card */}
              {selectedCompAI && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <p className="text-[10px] text-blue-600 font-mono uppercase tracking-wider font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Dispatch Analysis Report
                    </p>
                    <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono uppercase">
                      Confidence: {Math.floor(selectedCompAI.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans italic">
                    "{selectedCompAI.summary}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-500 pt-1.5">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase">Impact Assessment</span>
                      <p className="text-slate-750 text-xs leading-relaxed">Estimated <strong>{selectedCompAI.citizensAffected}</strong> citizens affected locally.</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase">Urgent Safety Risks</span>
                      <p className="text-rose-600 text-xs leading-relaxed font-semibold">{selectedCompAI.safetyRisk}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline status visualizer */}
              <Timeline complaint={selectedComp} />

              {/* Progress Update Adjuster slider Form */}
              <form onSubmit={handleProgressSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-mono font-bold uppercase text-slate-500 tracking-wider">
                  Update Progress & Dispatch Note
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-1 space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Percentage Done:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={progressPercent}
                        onChange={(e) => setProgressPercent(parseInt(e.target.value))}
                        className="w-full accent-blue-600 bg-slate-200 rounded-lg cursor-pointer h-1.5 focus:outline-none"
                      />
                      <span className="font-mono text-xs font-bold text-slate-700 min-w-10 text-right">{progressPercent}%</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Field Note:</span>
                    <input
                      type="text"
                      placeholder="e.g. Inspector dispatched, repairing asphalt morning block"
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-100 transition-all cursor-pointer"
                  >
                    {updating ? 'Updating...' : 'Publish Progress Update'}
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-600">Select an assigned ticket to manage</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">Click on any active ticket in the left dispatch panel to load timeline, images, AI summaries, and sliders.</p>
            </div>
          )}

          {/* AI Officer Copilot Interactive Assistant section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="copilot-section">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">AI Officer Copilot</h3>
                  <p className="text-[10px] text-slate-400 font-mono">POWERED BY GEMINI 3.5 FLASH</p>
                </div>
              </div>
            </div>

            {/* Quick Prompt Suggesters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCopilotSubmit('Show overdue complaints.')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-mono text-slate-500 border border-slate-200 hover:text-slate-800 hover:border-slate-350 transition-all cursor-pointer"
              >
                🚨 Show overdue complaints
              </button>
              <button
                onClick={() => handleCopilotSubmit("Which complaints require immediate action?")}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-mono text-slate-500 border border-slate-200 hover:text-slate-800 hover:border-slate-350 transition-all cursor-pointer"
              >
                🔥 Show critical alerts
              </button>
              <button
                onClick={() => handleCopilotSubmit("Summarize unresolved complaints.")}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-mono text-slate-500 border border-slate-200 hover:text-slate-800 hover:border-slate-350 transition-all cursor-pointer"
              >
                📊 Summarize pending backlog
              </button>
            </div>

            {/* Response Area */}
            {copilotReply && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed max-h-[300px] overflow-y-auto font-sans shadow-inner border-l-4 border-l-blue-600">
                <div className="markdown-body space-y-2">
                  {copilotReply.split('\n').map((line, idx) => {
                    if (line.startsWith('###')) {
                      return <h4 key={idx} className="text-xs font-bold text-slate-800 pt-2 border-b border-slate-200 pb-1 font-mono uppercase tracking-wider">{line.replace('###', '').trim()}</h4>;
                    }
                    if (line.startsWith('##')) {
                      return <h3 key={idx} className="text-sm font-bold text-blue-600 pt-2 font-sans">{line.replace('##', '').trim()}</h3>;
                    }
                    if (line.startsWith('-')) {
                      return <li key={idx} className="ml-4 list-disc pl-1 text-slate-600">{line.replace('-', '').trim()}</li>;
                    }
                    return <p key={idx} className="text-slate-600 leading-normal">{line}</p>;
                  })}
                </div>
              </div>
            )}

            {copilotLoading && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                <span>Copilot is inspecting database records...</span>
              </div>
            )}

            {/* Input field */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask copilot: 'Show overdue complaints' or 'Recommend work priority'..."
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCopilotSubmit(''); }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 text-slate-800 text-xs rounded-xl px-4 py-3 outline-none font-sans"
              />
              <button
                onClick={() => handleCopilotSubmit('')}
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-100 hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
