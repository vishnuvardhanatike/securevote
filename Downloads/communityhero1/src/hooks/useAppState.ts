/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { User, Complaint, ComplaintAIResult, Department, Reward, AuditLog, AppState } from '../types';

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full state from backend
  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to load application state.');
      const data: AppState = await res.json();
      setState(data);
      
      // Keep selected user sync or default to Sarah (Citizen)
      if (currentUser) {
        const updatedUser = data.users.find(u => u.id === currentUser.id);
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
      } else {
        const citizenUser = data.users.find(u => u.role === 'citizen');
        if (citizenUser) setCurrentUser(citizenUser);
      }
      
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchState();
  }, []);

  // Switch Active User
  const switchUser = (userId: string) => {
    if (!state) return;
    const found = state.users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  // Submit Complaint (with media uploads)
  const submitComplaint = async (payload: {
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address: string;
    images: string[];
    videos: string[];
    voiceUrl?: string;
  }) => {
    if (!currentUser) return { error: 'No user logged in' };
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          citizenId: currentUser.id,
          citizenName: currentUser.name
        })
      });
      const data = await res.json();
      await fetchState(); // Reload updated state
      return data;
    } catch (err: any) {
      console.error(err);
      return { error: err.message || 'Failed to submit complaint' };
    }
  };

  // Cast Community Vote
  const castVote = async (complaintId: string, vote: 'yes' | 'no' | 'unable') => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId,
          voterId: currentUser.id,
          voterName: currentUser.name,
          vote
        })
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  // Upvote / Support a complaint
  const supportComplaint = async (complaintId: string) => {
    if (!currentUser || !state) return;
    try {
      // Find complaint
      const comp = state.complaints.find(c => c.id === complaintId);
      if (!comp) return;
      
      // Submit a simulated duplicate submit or custom upvote logic
      // For upvotes, we can simulate on server by sending complaint with same GPS to trigger support incr,
      // or we can upvote directly. Let's just trigger a simulated upvote by doing verify with 'yes' or trigger state update.
      await castVote(complaintId, 'yes');
    } catch (err) {
      console.error(err);
    }
  };

  // Update Officer Progress
  const updateProgress = async (complaintId: string, percentage: number, note: string, images: string[] = []) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId,
          officerId: currentUser.id,
          officerName: currentUser.name,
          percentage,
          note,
          images
        })
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  // Redeem Reward Voucher
  const redeemReward = async (rewardId: string) => {
    if (!currentUser) return { error: 'No active user session' };
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          rewardId
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchState();
        return { success: true };
      } else {
        return { error: data.error || 'Failed to redeem reward' };
      }
    } catch (err: any) {
      console.error(err);
      return { error: err.message || 'Error redeeming reward' };
    }
  };

  // Admin Config and Reset
  const adminConfig = async (action: 'reset' | 'add_department', payload?: any) => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      if (res.ok) {
        await fetchState();
        return { success: true };
      }
    } catch (err) {
      console.error(err);
    }
    return { success: false };
  };

  // Ask AI Officer Copilot
  const askCopilot = async (query: string) => {
    if (!currentUser) return { reply: 'Error: No active user session.' };
    const departmentName = currentUser.role === 'officer' 
      ? state?.departments.find(d => d.id === currentUser.departmentId)?.name 
      : undefined;

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          officerName: currentUser.name,
          departmentName
        })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error(err);
      return { reply: `Error: ${err.message || 'Failed to communicate with AI Copilot'}` };
    }
  };

  return {
    state,
    currentUser,
    loading,
    error,
    switchUser,
    submitComplaint,
    castVote,
    supportComplaint,
    updateProgress,
    redeemReward,
    adminConfig,
    askCopilot,
    reloadState: fetchState
  };
}
