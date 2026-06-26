/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'citizen' | 'officer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  xp: number;
  level: number;
  trustScore: number; // 0 to 100
  badges: { id: string; name: string; icon: string; description: string; dateEarned: string }[];
  leaderboardRank?: number;
  departmentId?: string; // If role is officer, assigned department
}

export type ComplaintStatus = 'reported' | 'ai_processing' | 'verified' | 'assigned' | 'in_progress' | 'resolved';
export type ComplaintSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Complaint {
  id: string;
  title: string;
  description: string;
  citizenId: string;
  citizenName: string;
  status: ComplaintStatus;
  severity: ComplaintSeverity;
  department: string;
  address: string;
  latitude: number;
  longitude: number;
  supportCount: number;
  progressPercent: number;
  createdAt: string;
  verifiedAt?: string;
  assignedAt?: string;
  resolvedAt?: string;
  images: string[]; // Base64 or URLs
  videos: string[]; // Base64 or URLs
  voiceUrl?: string; // Optional voice recording URL or simulated path
  slaHours: number;
  slaDeadline?: string;
  supporters: string[]; // User IDs who upvoted
  duplicateOf?: string; // ID of primary complaint if duplicate
  nearbyCheckQuestion?: string; // AI generated question to check if complaint is genuine
}

export interface ComplaintAIResult {
  complaintId: string;
  category: string;
  subcategory: string;
  department: string;
  severity: ComplaintSeverity;
  priority: string;
  confidence: number;
  safetyRisk: string;
  citizensAffected: number;
  estimatedDifficulty: string;
  summary: string;
  suggestedAction: string;
  analyzedAt: string;
  nearbyCheckQuestion?: string;
}

export interface ComplaintVerification {
  id: string;
  complaintId: string;
  voterId: string;
  voterName: string;
  vote: 'yes' | 'no' | 'unable';
  timestamp: string;
}

export interface ComplaintProgress {
  id: string;
  complaintId: string;
  officerId: string;
  officerName: string;
  percentage: number;
  note: string;
  images: string[];
  videos: string[];
  timestamp: string;
}

export interface Department {
  id: string;
  name: string;
  icon: string;
  head: string;
  phone: string;
  complaintsCount: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  xpCost: number;
  icon: string;
  category: string;
  redeemed: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userRole: UserRole;
  userName: string;
  details: string;
}

export interface AppState {
  users: User[];
  complaints: Complaint[];
  complaintAI: Record<string, ComplaintAIResult>;
  verifications: ComplaintVerification[];
  progresses: ComplaintProgress[];
  departments: Department[];
  rewards: Reward[];
  auditLogs: AuditLog[];
}
