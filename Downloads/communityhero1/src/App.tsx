/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAppState } from './hooks/useAppState';
import { Navigation } from './components/Navigation';
import { CitizenPortal } from './components/CitizenPortal';
import { OfficerPortal } from './components/OfficerPortal';
import { AdminPortal } from './components/AdminPortal';
import { InteractiveMap } from './components/InteractiveMap';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const {
    state,
    currentUser,
    loading,
    error,
    switchUser,
    submitComplaint,
    castVote,
    updateProgress,
    redeemReward,
    adminConfig,
    askCopilot
  } = useAppState();

  const [activeTab, setActiveTab] = useState<string>('citizen-dashboard');

  // Sync Active Tab automatically when role switches
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'citizen') {
      setActiveTab('citizen-dashboard');
    } else if (currentUser.role === 'officer') {
      setActiveTab('officer-dashboard');
    } else if (currentUser.role === 'admin') {
      setActiveTab('admin-dashboard');
    }
  }, [currentUser?.id]);

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto" />
          <h3 className="text-sm font-semibold font-mono text-slate-300">Synchronizing Community Hero Hub...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-900 rounded-3xl p-6 max-w-md text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-white font-sans">Database Connection Error</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            We are having difficulty synching with the server. Please check your development environment and ensure your API server is running on Port 3000.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white pb-16">
      
      {/* Top sticky branding, gamification bar & switch personas utility */}
      <Navigation
        currentUser={currentUser}
        users={state?.users || []}
        onSwitchUser={switchUser}
        onReset={() => adminConfig('reset')}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {state && currentUser && (
          <div className="fade-in duration-300">
            {/* Citizen portal flows */}
            {activeTab === 'citizen-dashboard' && (
              <CitizenPortal
                state={state}
                currentUser={currentUser}
                onSubmitComplaint={submitComplaint}
                onCastVote={castVote}
                onRedeemReward={redeemReward}
              />
            )}

            {/* Citizen Full-Screen Map view */}
            {activeTab === 'interactive-map' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white font-sans tracking-tight">Active Incident Map Grid</h2>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">Real-time localized geo-tracking overlays across Ward Districts</p>
                  </div>
                </div>
                <InteractiveMap complaints={state.complaints} />
              </div>
            )}

            {/* Officer Portal dashboard flows */}
            {activeTab === 'officer-dashboard' && (
              <OfficerPortal
                state={state}
                currentUser={currentUser}
                onUpdateProgress={updateProgress}
                onAskCopilot={askCopilot}
              />
            )}

            {/* Officer Copilot full view (shared portal trigger) */}
            {activeTab === 'officer-copilot' && (
              <OfficerPortal
                state={state}
                currentUser={currentUser}
                onUpdateProgress={updateProgress}
                onAskCopilot={askCopilot}
              />
            )}

            {/* Admin Portal flows */}
            {activeTab === 'admin-dashboard' && (
              <AdminPortal
                state={state}
                onAdminConfig={adminConfig}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
