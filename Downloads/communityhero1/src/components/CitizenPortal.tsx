/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  PlusCircle, ShieldCheck, Trophy, Sparkles, MapPin, 
  Image as ImageIcon, Mic, AlertCircle, CheckCircle, AlertTriangle,
  ChevronRight, Compass, Flame, ArrowRight, UserPlus, FileText, Play,
  Bold, Italic, List, Quote, Eye, Edit2, Eraser, Heading,
  ChevronDown, ChevronUp, Calendar, Clock, Wrench, User as UserIcon
} from 'lucide-react';
import { z } from 'zod';
import { AppState, User, Complaint } from '../types';
import { InteractiveMap } from './InteractiveMap';
import { Timeline } from './Timeline';

const citizenComplaintSchema = z.object({
  title: z.string()
    .min(5, "Title must be at least 5 characters long")
    .max(100, "Title cannot exceed 100 characters"),
  description: z.string()
    .min(10, "Detailed description must be at least 10 characters long")
    .max(5000, "Description cannot exceed 5000 characters"),
  latitude: z.number({ message: "Latitude coordinates are required" }),
  longitude: z.number({ message: "Longitude coordinates are required" }),
  address: z.string().min(1, "Location address is required")
});

interface CitizenPortalProps {
  state: AppState;
  currentUser: User;
  onSubmitComplaint: (payload: any) => Promise<any>;
  onCastVote: (complaintId: string, vote: 'yes' | 'no' | 'unable') => Promise<void>;
  onRedeemReward: (rewardId: string) => Promise<any>;
}

export function CitizenPortal({
  state,
  currentUser,
  onSubmitComplaint,
  onCastVote,
  onRedeemReward
}: CitizenPortalProps) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [duplicateState, setDuplicateState] = useState<{ active: boolean; message: string; payload: any } | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [address, setAddress] = useState('San Francisco, CA');
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);

  // Rich Text & Zod Validation State
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'my-reports' | 'all-reports' | 'rewards'>('my-reports');
  const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null);

  // Helper for applying markdown tags to description textarea
  const applyFormatting = (tag: 'bold' | 'italic' | 'heading' | 'list' | 'quote' | 'clear') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    switch (tag) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'heading':
        replacement = `\n### ${selectedText || 'Heading'}\n`;
        break;
      case 'list':
        replacement = `\n- ${selectedText || 'List item'}`;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || 'Blockquote'}`;
        break;
      case 'clear':
        replacement = selectedText
          .replace(/\*\*|__/g, '')
          .replace(/\*|_/g, '')
          .replace(/^###\s+/gm, '')
          .replace(/^-\s+/gm, '')
          .replace(/^>\s+/gm, '');
        break;
      default:
        return;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setDescription(newText);

    // Refocus and select
    setTimeout(() => {
      textarea.focus();
      const offset = replacement.length - selectedText.length;
      textarea.setSelectionRange(start, end + offset);
    }, 0);
  };

  // Safe inline markdown parser for visual preview
  const parseMarkdownInline = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let keyIdx = 0;

    while (currentText.length > 0) {
      const boldMatch = currentText.match(/\*\*(.*?)\*\*/);
      const italicMatch = currentText.match(/\*(.*?)\*/);

      if (boldMatch && (!italicMatch || boldMatch.index! < italicMatch.index!)) {
        const startIdx = boldMatch.index!;
        if (startIdx > 0) {
          parts.push(currentText.substring(0, startIdx));
        }
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-extrabold text-slate-900">
            {boldMatch[1]}
          </strong>
        );
        currentText = currentText.substring(startIdx + boldMatch[0].length);
      } else if (italicMatch) {
        const startIdx = italicMatch.index!;
        if (startIdx > 0) {
          parts.push(currentText.substring(0, startIdx));
        }
        parts.push(
          <em key={`i-${keyIdx++}`} className="italic font-semibold text-slate-800">
            {italicMatch[1]}
          </em>
        );
        currentText = currentText.substring(startIdx + italicMatch[0].length);
      } else {
        parts.push(currentText);
        break;
      }
    }

    return parts.length > 0 ? parts : text;
  };

  // Safe multiline custom markdown rendering
  const renderRichText = (mdText: string) => {
    if (!mdText) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-1 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <FileText className="w-6 h-6 stroke-1" />
          <p className="italic text-xs">No description text provided yet.</p>
        </div>
      );
    }

    const lines = mdText.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed font-sans bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[100px] overflow-y-auto">
        {lines.map((line, idx) => {
          let trimmed = line.trim();
          
          if (trimmed.startsWith('>')) {
            const content = trimmed.substring(1).trim();
            return (
              <blockquote key={idx} className="border-l-4 border-blue-400 bg-blue-50/50 px-3 py-1.5 italic text-slate-600 rounded-r-lg my-1.5 font-sans">
                {parseMarkdownInline(content)}
              </blockquote>
            );
          }

          if (trimmed.startsWith('###')) {
            const content = trimmed.substring(3).trim();
            return (
              <h4 key={idx} className="text-xs font-bold text-slate-800 mt-3 mb-1 font-sans">
                {parseMarkdownInline(content)}
              </h4>
            );
          }

          if (trimmed.startsWith('-')) {
            const content = trimmed.substring(1).trim();
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-2 my-0.5">
                <span className="text-blue-500 shrink-0 mt-1">•</span>
                <span className="text-slate-700 text-xs font-sans">{parseMarkdownInline(content)}</span>
              </div>
            );
          }

          if (trimmed === '') {
            return <div key={idx} className="h-1.5" />;
          }

          return (
            <p key={idx} className="leading-relaxed font-sans">
              {parseMarkdownInline(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Handle Mock Image Upload converting to Base64
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileList = Array.from(files) as File[];
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageFiles((prev) => [...prev, reader.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Simulated Voice Record
  const triggerVoiceRecord = () => {
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      setHasVoice(true);
    }, 2500);
  };

  // Submit Complaint Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Zod Validation schema check
    const validation = citizenComplaintSchema.safeParse({
      title,
      description,
      latitude,
      longitude,
      address
    });

    if (!validation.success) {
      const errors: { [key: string]: string } = {};
      validation.error.issues.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    
    // Staggered status messages during AI pipeline
    const steps = [
      'Initializing Citizen Incident submission...',
      'Synthesizing text description elements...',
      'Converting attached image assets (base64)...',
      'Contacting Gemini AI Triage Engine...',
      'Performing Deep Duplicate Proximity check...',
      'Applying severity rating SLA metrics...',
      'Routing dispatcher ticket mapping...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setSubmittingStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const payload = {
      title,
      description,
      latitude,
      longitude,
      address,
      images: imageFiles,
      videos: [],
      voiceUrl: hasVoice ? 'mock_voice_memo.mp3' : undefined
    };

    const res = await onSubmitComplaint(payload);

    setSubmitting(false);
    if (res && !res.error) {
      if (res.duplicate) {
        setDuplicateState({
          active: true,
          message: res.message,
          payload: payload
        });
      } else {
        setAiAnalysisResult(res.aiAnalysis);
      }
    } else {
      alert('Error: ' + (res?.error || 'Could not report issue.'));
      setShowSubmitModal(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLatitude(37.7749);
    setLongitude(-122.4194);
    setAddress('San Francisco, CA');
    setImageFiles([]);
    setHasVoice(false);
    setAiAnalysisResult(null);
    setFormErrors({});
    setEditorTab('write');
  };

  // Filter complaints based on Tab selection (includes submitted complaints and supported duplicates)
  const filteredComplaints = state.complaints.filter((c) => {
    if (activeTab === 'my-reports') {
      return c.citizenId === currentUser.id || (c.supporters && c.supporters.includes(currentUser.id));
    }
    return true; // all reports
  });

  // Verification Backlog: unassigned complaints reported by other users in local area
  const verificationQueue = state.complaints.filter(
    (c) => c.citizenId !== currentUser.id && c.status === 'reported'
  );

  return (
    <div className="space-y-8" id="citizen-portal-main">
      
      {/* Top Welcome Panel */}
      <div className="bg-gradient-to-r from-slate-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Compass className="w-48 h-48 animate-spin-slow" />
        </div>
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-mono text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Civic Guardian Active
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold font-sans tracking-tight">
            Hi {currentUser.name}, you are making a difference today!
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Write a detailed text description or attach a voice memo, pin the location on our interactive map, and upload visual evidence.
            Our Gemini AI engine automatically triages, routes, and alerts your local ward officers to respond within hours.
          </p>

          <div className="pt-2">
            <button
              onClick={() => { resetForm(); setShowSubmitModal(true); }}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-blue-800/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
              id="report-issue-btn"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Report Civic Issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gamification Level & Achievements Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="gamification-row">
        
        {/* Level and Achievements Progress Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold font-sans tracking-tight text-slate-800 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" /> Progression Level
              </h3>
              <span className="font-mono text-xs font-bold text-slate-500">Level {currentUser.level}</span>
            </div>
            
            {/* XP progress bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, (currentUser.xp / (currentUser.level * 500)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>{currentUser.xp} XP</span>
                <span>Next level: {currentUser.level * 500} XP</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-5 pt-4">
            <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider mb-2">Earned Badges</h4>
            <div className="flex flex-wrap gap-2">
              {currentUser.badges.map((badge) => (
                <div 
                  key={badge.id}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all text-slate-700 flex items-center gap-1.5 cursor-help"
                  title={`${badge.name}: ${badge.description}`}
                >
                  <span className="text-xs">🏆</span>
                  <span className="text-[10px] font-semibold">{badge.name}</span>
                </div>
              ))}
              {currentUser.badges.length === 0 && (
                <p className="text-[11px] text-slate-500 italic">No badges earned yet. Submit issues to unlock badges!</p>
              )}
            </div>
          </div>
        </div>

        {/* Verification backlog list */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold font-sans tracking-tight text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Community Verification Hub
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono px-2 py-0.5 border border-emerald-200 rounded-lg font-bold">
                Earn 25 XP per Vote
              </span>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
              Verify pending complaints reported by other residents in your district. This builds community truth consensus and expedites department dispatching!
            </p>

            <div className="space-y-3">
              {verificationQueue.slice(0, 2).map((item) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col gap-3 hover:border-slate-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                        {item.department}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 leading-snug">{item.title}</h4>
                      <p className="text-[11px] text-slate-600 line-clamp-1">{item.description}</p>
                      <p className="text-[9px] text-slate-500 font-mono">📍 {item.address}</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => onCastVote(item.id, 'yes')}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Yes, Active
                      </button>
                      <button
                        onClick={() => onCastVote(item.id, 'no')}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        No, Fake
                      </button>
                      <button
                        onClick={() => onCastVote(item.id, 'unable')}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Skip
                      </button>
                    </div>
                  </div>

                  {item.nearbyCheckQuestion && (
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-2.5 mt-1">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono text-blue-600 font-bold uppercase tracking-wider">AI Verification Request</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed italic">
                          "{item.nearbyCheckQuestion}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {verificationQueue.length === 0 && (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-400 italic">All community complaints are verified! Outstanding consensus achieved.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Main Filterable Incident Reports List */}
      <div className="space-y-4" id="incident-list-section">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('my-reports')}
              className={`pb-3 text-sm font-bold tracking-tight transition-all relative cursor-pointer ${
                activeTab === 'my-reports' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              id="btn-my-rep"
            >
              My Reported Incidents ({state.complaints.filter(c => c.citizenId === currentUser.id || (c.supporters && c.supporters.includes(currentUser.id))).length})
              {activeTab === 'my-reports' && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-blue-600 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('all-reports')}
              className={`pb-3 text-sm font-bold tracking-tight transition-all relative cursor-pointer ${
                activeTab === 'all-reports' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              id="btn-all-rep"
            >
              All District Feeds
              {activeTab === 'all-reports' && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-blue-600 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`pb-3 text-sm font-bold tracking-tight transition-all relative cursor-pointer ${
                activeTab === 'rewards' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              id="btn-rewards-tab"
            >
              Voucher Rewards Store
              {activeTab === 'rewards' && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-blue-600 rounded-full" />}
            </button>
          </div>
        </div>

        {/* Rewards Tab content */}
        {activeTab === 'rewards' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="rewards-store-grid">
            {state.rewards.map((reward) => (
              <div key={reward.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                      {reward.xpCost} XP Required
                    </span>
                    <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">{reward.category}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 mb-1.5">{reward.name}</h4>
                  <p className="text-xs text-slate-500 font-sans leading-relaxed mb-4">{reward.description}</p>
                </div>

                <button
                  disabled={currentUser.xp < reward.xpCost || reward.redeemed}
                  onClick={() => onRedeemReward(reward.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    reward.redeemed 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : currentUser.xp < reward.xpCost
                      ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-100'
                  }`}
                >
                  {reward.redeemed ? 'Redeemed & Active' : currentUser.xp < reward.xpCost ? 'Insufficient XP Balance' : 'Redeem Voucher'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Incidents feeds list */}
        {activeTab !== 'rewards' && (
          <div className="space-y-4">
            {filteredComplaints.map((item) => {
              const aiDetails = state.complaintAI[item.id];
              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    
                    <div className="space-y-2.5 flex-1">
                      {/* Meta stats tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                          {item.id.toUpperCase()}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded uppercase tracking-wider">
                          {item.department}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.severity === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          item.severity === 'high' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          Severity: {item.severity}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-800 tracking-tight leading-snug">{item.title}</h3>
                      <div className="my-1">
                        {renderRichText(item.description)}
                      </div>
                      
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                        <MapPin className="w-3.5 h-3.5" /> {item.address}
                      </div>

                      {/* AI triaged summary banner */}
                      {aiDetails && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-3 space-y-1.5">
                          <p className="text-[10px] text-blue-600 font-mono uppercase tracking-wider font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> AI Orchestrator Verdict
                          </p>
                          <p className="text-xs text-slate-600 leading-normal italic">
                            "{aiDetails.summary}"
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-4 text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-200">
                            <span>Confidence: <strong className="text-slate-800">{Math.floor(aiDetails.confidence * 100)}%</strong></span>
                            <span>Public Risk: <strong className="text-rose-600">{aiDetails.safetyRisk.split(',')[0]}</strong></span>
                            <span>Affected: <strong className="text-slate-800">{aiDetails.citizensAffected} residents</strong></span>
                          </div>
                        </div>
                      )}

                      {/* Display attachment thumbnails if present */}
                      {item.images && item.images.length > 0 && (
                        <div className="flex items-center gap-2 pt-2">
                          {item.images.map((img, index) => (
                            <img
                              key={index}
                              src={img}
                              alt="Attachment preview"
                              className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col items-center justify-between md:justify-start gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                      <div className="text-center font-mono">
                        <span className="block text-2xl font-extrabold text-slate-800">{item.supportCount}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Supporters</span>
                      </div>

                      {/* Timeline status completion gauge */}
                      <div className="w-24 text-right md:text-center font-mono">
                        <span className="block text-[11px] text-slate-500">Progress</span>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1 border border-slate-200">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${item.progressPercent}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-600 block mt-0.5">{item.progressPercent}% Done</span>
                      </div>
                    </div>

                    {/* Interactive resolution details, current status, & historical timeline logs */}
                    <div className="border-t border-slate-100 mt-4 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reported {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <button
                        onClick={() => setExpandedComplaintId(expandedComplaintId === item.id ? null : item.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 font-sans tracking-tight transition-all cursor-pointer bg-blue-50 hover:bg-blue-100/70 border border-blue-200/50 px-3 py-1.5 rounded-xl self-start sm:self-auto"
                        id={`btn-toggle-timeline-${item.id}`}
                      >
                        <span>{expandedComplaintId === item.id ? 'Hide Resolution Timeline' : 'View Resolution Timeline & History'}</span>
                        {expandedComplaintId === item.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Expanded History & Timeline Log Panels */}
                    {expandedComplaintId === item.id && (
                      <div className="border-t border-slate-100 mt-5 pt-5 space-y-6 animate-fade-in duration-300" id={`expanded-panel-${item.id}`}>
                        
                        {/* 1. Status Callout Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Current Resolution Status</span>
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                item.status === 'resolved' ? 'bg-emerald-500' :
                                item.status === 'in_progress' ? 'bg-indigo-500' :
                                'bg-amber-500'
                              } animate-pulse`} />
                              <h4 className="text-sm font-bold text-slate-800 capitalize">{item.status.replace('_', ' ')}</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-xl">
                              {item.status === 'reported' && 'The incident has been registered and is awaiting community verification/upvotes.'}
                              {item.status === 'ai_processing' && 'The incident is currently being triaged by our Gemini AI models.'}
                              {item.status === 'verified' && 'Validated by local citizens. This ticket has reached the required consensus to be handled.'}
                              {item.status === 'assigned' && 'Dispatched to the municipal agency. A team will be scheduled to address the issue.'}
                              {item.status === 'in_progress' && 'Work crew is currently on-site working on resolution.'}
                              {item.status === 'resolved' && 'The municipal service has successfully resolved the reported issue. Verification closed.'}
                            </p>
                          </div>

                          <div className="bg-white border border-slate-250 p-3 rounded-xl min-w-[160px] font-mono text-[11px] text-slate-600 space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase block">SLA Commitment</span>
                            <div>Target: <strong className="text-slate-800">{item.slaHours} Hours</strong></div>
                            {item.slaDeadline && (
                              <div className="text-[10px] text-slate-500">
                                Deadline: <strong className="text-slate-700">{new Date(item.slaDeadline).toLocaleDateString()} {new Date(item.slaDeadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                              </div>
                            )}
                            {item.status === 'resolved' && item.resolvedAt && (
                              <div className="text-[10px] text-emerald-600 font-bold mt-1">
                                Resolved on: {new Date(item.resolvedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Graphical Vertical Stage Audit Timeline */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">Stage Progress Timeline</h4>
                          <Timeline complaint={item} />
                        </div>

                        {/* 3. Official Officer Progress Activity Log Updates */}
                        {(() => {
                          const updates = state.progresses.filter(p => p.complaintId === item.id);
                          if (updates.length === 0) return null;
                          return (
                            <div className="space-y-4 pt-2">
                              <h4 className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-blue-600" /> Official Officer Activity Logs
                              </h4>
                              <div className="space-y-4 pl-3 border-l-2 border-slate-200">
                                {updates.map((up) => (
                                  <div key={up.id} className="relative pl-5 space-y-1.5" id={`officer-log-${up.id}`}>
                                    <div className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white" />
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px]">
                                      <span className="font-bold text-slate-700 flex items-center gap-1">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" /> {up.officerName} (Officer Dispatch)
                                      </span>
                                      <span className="font-mono text-slate-400">
                                        {new Date(up.timestamp).toLocaleDateString()} at {new Date(up.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-600 leading-relaxed font-sans bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-2xl">
                                      {up.note}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400">
                                      Task Resolution Percentage set to <strong className="text-blue-600">{up.percentage}%</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    )}

                  </div>
                </div>
              );
            })}
            {filteredComplaints.length === 0 && (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl shadow-sm">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-400">No reported complaints recorded yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Be the community hero! Click the "Report Civic Issue" button above to register an incident in your locality.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submitting AI Loader Screen Overlay Modal */}
      {submitting && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <Sparkles className="w-8 h-8 text-blue-400 absolute animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-sans tracking-tight">Gemini AI Orchestrating</h3>
              <p className="text-xs font-mono text-blue-400 h-6">
                {submittingStep}
              </p>
            </div>

            <div className="text-[11px] text-slate-500 italic max-w-xs mx-auto leading-relaxed">
              Our AI engine is currently scanning adjacent GPS nodes to guarantee duplicate suppression and automatically matching responsible departments.
            </div>
          </div>
        </div>
      )}

      {/* Triage Output Verdict Card Modal */}
      {aiAnalysisResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative space-y-5 overflow-hidden">
            <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-blue-600/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center gap-2 text-blue-600">
              <Sparkles className="w-5 h-5 animate-bounce" />
              <h3 className="text-sm font-mono font-bold tracking-wider uppercase">Gemini AI Audit Decision</h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-1">AI Structured Summary</h4>
                <p className="text-sm text-slate-800 font-sans font-semibold leading-relaxed">
                  "{aiAnalysisResult.summary}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4 font-mono text-xs text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Assigned Category</span>
                  <p className="font-bold text-slate-800 mt-0.5">{aiAnalysisResult.category}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Dispatch Agency</span>
                  <p className="font-bold text-blue-600 mt-0.5">{aiAnalysisResult.department}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Triage Severity</span>
                  <p className="font-bold text-rose-600 mt-0.5 uppercase">{aiAnalysisResult.severity}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Estimated Impact</span>
                  <p className="font-bold text-slate-800 mt-0.5">{aiAnalysisResult.citizensAffected} affected</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Suggested Immediate Dispatch</span>
                <p className="text-xs text-slate-500 leading-normal">{aiAnalysisResult.suggestedAction}</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => { setShowSubmitModal(false); resetForm(); }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg shadow-blue-100"
              >
                Acknowledge & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Detected Dialogue Modal */}
      {duplicateState && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-5 overflow-hidden">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm font-mono font-bold tracking-wider uppercase">Similar Incident Reported</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              {duplicateState.message}
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Your Report Preview</span>
              <p className="text-xs font-bold text-slate-800">{duplicateState.payload.title}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2">{duplicateState.payload.description}</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setDuplicateState(null);
                  setShowSubmitModal(false);
                  resetForm();
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg shadow-blue-100 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Support Existing Report (Recommended)</span>
              </button>
              
              <button
                onClick={async () => {
                  const payloadWithForce = {
                    ...duplicateState.payload,
                    forceCreate: true
                  };
                  setDuplicateState(null);
                  setSubmitting(true);
                  setSubmittingStep('Bypassing duplicate filters and filing new ticket...');
                  
                  const res = await onSubmitComplaint(payloadWithForce);
                  setSubmitting(false);
                  if (res && !res.error) {
                    setAiAnalysisResult(res.aiAnalysis);
                  } else {
                    alert('Error: ' + (res?.error || 'Could not report issue.'));
                    setShowSubmitModal(false);
                  }
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-mono text-[10px] uppercase font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>File Brand New Ticket Anyway</span>
              </button>

              <button
                onClick={() => {
                  setDuplicateState(null);
                }}
                className="w-full py-2 text-center text-[10px] text-slate-400 font-mono hover:text-slate-600 cursor-pointer"
              >
                Go Back to Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Submission Form Modal */}
      {showSubmitModal && !submitting && !aiAnalysisResult && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative space-y-5 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-sans tracking-tight">Report Municipal Incident</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">GEMINI CO-ASSISTED TRIAGING PORTAL</p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold font-sans cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {Object.keys(formErrors).length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-sans flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Please correct the following errors:</p>
                    <ul className="list-disc list-inside mt-1 font-mono text-[10px] space-y-0.5">
                      {Object.entries(formErrors).map(([field, msg]) => (
                        <li key={field} className="capitalize">
                          <strong>{field}:</strong> {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Complaint Title</label>
                  {formErrors.title && <span className="text-[10px] text-rose-500 font-mono font-medium">{formErrors.title}</span>}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Major water leak on Oak Street near traffic light"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (formErrors.title) {
                      setFormErrors(prev => {
                        const next = { ...prev };
                        delete next.title;
                        return next;
                      });
                    }
                  }}
                  className={`w-full bg-slate-50 border ${formErrors.title ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-600'} text-slate-850 text-xs rounded-xl px-4 py-3 outline-none transition-all`}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Detailed Description</label>
                  {formErrors.description && <span className="text-[10px] text-rose-500 font-mono font-medium">{formErrors.description}</span>}
                </div>
                
                {/* Rich Text Editor Container */}
                <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
                  {/* Format Toolbar */}
                  <div className="flex flex-wrap items-center justify-between bg-slate-50/80 border-b border-slate-200 px-3 py-2 gap-2 select-none">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyFormatting('bold')}
                        title="Bold (**text**)"
                        className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-slate-200 rounded transition-all cursor-pointer"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('italic')}
                        title="Italic (*text*)"
                        className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-slate-200 rounded transition-all cursor-pointer"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('heading')}
                        title="Heading (### text)"
                        className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-slate-200 rounded transition-all cursor-pointer"
                      >
                        <Heading className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('list')}
                        title="Bullet List (- item)"
                        className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-slate-200 rounded transition-all cursor-pointer"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('quote')}
                        title="Quote (> text)"
                        className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-slate-200 rounded transition-all cursor-pointer"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('clear')}
                        title="Clear Formatting"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer ml-1"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                      <button
                        type="button"
                        onClick={() => setEditorTab('write')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          editorTab === 'write'
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Edit2 className="w-3 h-3" /> Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTab('preview')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          editorTab === 'preview'
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                  </div>

                  {/* Input / Visual Preview Panels */}
                  <div className="bg-white">
                    {editorTab === 'write' ? (
                      <textarea
                        ref={textareaRef}
                        rows={4}
                        placeholder="Describe the issue. Try using the format tools above to outline list items, headings, bold notes, or blockquotes."
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (formErrors.description) {
                            setFormErrors(prev => {
                              const next = { ...prev };
                              delete next.description;
                              return next;
                        });
                          }
                        }}
                        className={`w-full bg-white text-slate-850 text-xs px-4 py-3 outline-none resize-none min-h-[120px] transition-all`}
                      />
                    ) : (
                      <div className="p-3 bg-slate-50/30 min-h-[120px]">
                        {renderRichText(description)}
                      </div>
                    )}
                  </div>

                  {/* Footer Row: character count & help message */}
                  <div className="flex items-center justify-between bg-slate-50/50 border-t border-slate-150 px-3 py-1.5 text-[9px] font-mono text-slate-400">
                    <span>Pro Tip: Highlight text and format instantly.</span>
                    <span className={`${description.length < 10 || description.length > 5000 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                      {description.length} / 5000 chars
                    </span>
                  </div>
                </div>
              </div>

              {/* Geographic selection & dynamic mapping selector widget */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Incident GPS Coordinates Selector</label>
                <InteractiveMap
                  complaints={[]}
                  isSelectorMode={true}
                  onSelectCoordinates={(lat, lng, addr) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setAddress(addr);
                  }}
                />
                <div className="flex gap-4 text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <span>Lat: <strong className="text-slate-800">{latitude}</strong></span>
                  <span>Lng: <strong className="text-slate-800">{longitude}</strong></span>
                  <span className="truncate">Address: <strong className="text-blue-600">{address}</strong></span>
                </div>
              </div>

              {/* Media Picker attachments row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Image upload thumbnail previews */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Camera Evidence ({imageFiles.length}/3)</span>
                    <label className="text-[10px] text-blue-600 font-mono hover:underline cursor-pointer flex items-center gap-1">
                      <PlusCircle className="w-3.5 h-3.5" /> Pick Image
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImagePick}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  <div className="flex gap-2">
                    {imageFiles.map((src, index) => (
                      <div key={index} className="relative group">
                        <img src={src} className="w-12 h-12 rounded object-cover border border-slate-200" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setImageFiles((prev) => prev.filter((_, idx) => idx !== index))}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:scale-110 cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {imageFiles.length === 0 && (
                      <div className="text-[10px] text-slate-400 italic py-3">No files selected.</div>
                    )}
                  </div>
                </div>

                {/* Simulated Voice note attachments */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Simulated Voice Memo</span>
                    {hasVoice && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 border border-emerald-200 rounded uppercase font-mono font-bold">
                        Attached
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={triggerVoiceRecord}
                      className={`px-3 py-2 rounded-lg font-mono text-xs flex items-center gap-1.5 border cursor-pointer ${
                        recording 
                          ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                          : 'bg-white text-slate-600 border-slate-200 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{recording ? 'Recording...' : hasVoice ? 'Record Again' : 'Record Voice'}</span>
                    </button>

                    {hasVoice && !recording && (
                      <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-500">
                        <Play className="w-3 h-3 text-emerald-600 fill-emerald-600 border-none" />
                        <span>0:14 memo.mp3</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Actions submit buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-100 transition-all cursor-pointer"
                  id="submit-form-btn"
                >
                  Confirm & Orchestrate
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
