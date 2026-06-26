/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Check, Clock, Bot, Hammer, ShieldCheck, HelpCircle } from 'lucide-react';
import { Complaint, ComplaintStatus } from '../types';

interface TimelineProps {
  complaint: Complaint;
}

export function Timeline({ complaint }: TimelineProps) {
  const { status, createdAt, verifiedAt, assignedAt, resolvedAt } = complaint;

  // Order of statuses
  const steps: { key: ComplaintStatus; label: string; desc: string; icon: any }[] = [
    { key: 'reported', label: 'Reported', desc: 'Complaint registered by citizen', icon: Clock },
    { key: 'ai_processing', label: 'AI Processing', desc: 'Gemini AI automated analysis', icon: Bot },
    { key: 'verified', label: 'Verified', desc: 'Validated by community consensus', icon: ShieldCheck },
    { key: 'assigned', label: 'Assigned', desc: 'Dispatched to responsible department', icon: Hammer },
    { key: 'in_progress', label: 'In Progress', desc: `Crew active (${complaint.progressPercent}% completed)`, icon: Hammer },
    { key: 'resolved', label: 'Resolved', desc: 'Issue cleared & verified closed', icon: Check }
  ];

  // Calculate index of current status
  const statusIndices: Record<ComplaintStatus, number> = {
    'reported': 0,
    'ai_processing': 1,
    'verified': 2,
    'assigned': 3,
    'in_progress': 4,
    'resolved': 5
  };

  const currentIndex = statusIndices[status];

  const getStepTimestamp = (stepKey: ComplaintStatus) => {
    switch (stepKey) {
      case 'reported': return createdAt;
      case 'ai_processing': return createdAt; // Processed almost instantly
      case 'verified': return verifiedAt || '';
      case 'assigned': return assignedAt || '';
      case 'in_progress': return assignedAt || '';
      case 'resolved': return resolvedAt || '';
      default: return '';
    }
  };

  return (
    <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-5" id="timeline-container">
      <div className="flex flex-col gap-6">
        <h4 className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">
          Incident Audit Timeline
        </h4>

        <div className="relative pl-8 border-l border-slate-200 space-y-6">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentIndex || status === 'resolved';
            const isActive = idx === currentIndex && status !== 'resolved';
            const timestamp = getStepTimestamp(step.key);
            const StepIcon = step.icon;

            return (
              <div key={step.key} className="relative" id={`timeline-step-${step.key}`}>
                {/* Node circle wrapper */}
                <div className={`absolute -left-[45px] top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm' :
                  isActive ? 'bg-blue-600 border-blue-400 text-white animate-pulse shadow-sm' :
                  'bg-white border-slate-200 text-slate-400'
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-1">
                  <div>
                    <h5 className={`text-sm font-semibold font-sans ${
                      isCompleted ? 'text-slate-700' :
                      isActive ? 'text-blue-600 font-bold' :
                      'text-slate-400'
                    }`}>
                      {step.label}
                    </h5>
                    <p className="text-xs text-slate-500 leading-normal mt-0.5 max-w-md">
                      {step.desc}
                    </p>
                  </div>
                  {timestamp && (
                    <span className="text-[10px] font-mono text-slate-400 md:text-right mt-1 md:mt-0 whitespace-nowrap">
                      {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="block text-[9px] text-slate-400">
                        {new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
