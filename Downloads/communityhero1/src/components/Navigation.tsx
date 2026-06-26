/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shield, User as UserIcon, RefreshCw, Trophy, Heart } from 'lucide-react';
import { User } from '../types';

interface NavigationProps {
  currentUser: User | null;
  users: User[];
  onSwitchUser: (userId: string) => void;
  onReset: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navigation({
  currentUser,
  users,
  onSwitchUser,
  onReset,
  activeTab,
  setActiveTab
}: NavigationProps) {
  if (!currentUser) return null;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95" id="nav-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/50">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-sans tracking-tight text-white flex items-center gap-1.5">
                Community Hero <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono font-medium">CIVIC AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">MUNICIPAL ENGAGEMENT PORTAL</p>
            </div>
          </div>

          {/* Role Evaluator & State Reset Quick Tools */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-mono text-slate-400">Testing Persona:</span>
              <select
                value={currentUser.id}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="bg-transparent text-xs text-white border-none focus:ring-0 outline-none cursor-pointer font-sans font-semibold"
                id="persona-selector"
              >
                {users.map((usr) => (
                  <option key={usr.id} value={usr.id} className="bg-slate-900 text-white text-xs">
                    {usr.name} ({usr.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onReset}
              className="p-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 transition-all font-mono text-xs flex items-center gap-1.5 cursor-pointer"
              title="Reset Database to Seed State"
              id="reset-db-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>

        </div>

        {/* User Gamification Stats and Portal Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-t border-slate-800/60 gap-3 text-xs text-slate-300">
          
          {/* Active User Gamification Details */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono">
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-slate-200">{currentUser.name}</span>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded uppercase">
                {currentUser.role}
              </span>
            </div>

            {currentUser.role === 'citizen' && (
              <>
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Level <strong className="text-slate-100">{currentUser.level}</strong></span>
                  <span className="text-[10px] text-slate-500">({currentUser.xp} XP)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Trust Score: <strong className="text-slate-100">{currentUser.trustScore}%</strong></span>
                </div>
              </>
            )}

            {currentUser.role === 'officer' && (
              <span className="text-xs text-blue-400 font-semibold bg-blue-950/30 px-2 py-0.5 border border-blue-900/40 rounded-lg">
                📋 Roads & Utilities Dispatcher
              </span>
            )}
          </div>

          {/* Portal Quick Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
            {currentUser.role === 'citizen' && (
              <>
                <button
                  onClick={() => setActiveTab('citizen-dashboard')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'citizen-dashboard'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-cit-dash"
                >
                  Citizen Portal
                </button>
                <button
                  onClick={() => setActiveTab('interactive-map')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'interactive-map'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-cit-map"
                >
                  Incident Map
                </button>
              </>
            )}

            {currentUser.role === 'officer' && (
              <>
                <button
                  onClick={() => setActiveTab('officer-dashboard')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'officer-dashboard'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-off-dash"
                >
                  Officer Console
                </button>
                <button
                  onClick={() => setActiveTab('officer-copilot')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'officer-copilot'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-off-cop"
                >
                  Copilot Assistant
                </button>
              </>
            )}

            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin-dashboard')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTab === 'admin-dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
                id="tab-adm-dash"
              >
                Control Center (Admin)
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
