/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

dotenv.config();

const complaintSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long").max(100, "Title is too long"),
  description: z.string().min(10, "Detailed description must be at least 10 characters long").max(5000, "Description is too long"),
  citizenId: z.string().min(1, "Citizen ID is required"),
  citizenName: z.string().min(1, "Citizen Name is required"),
  latitude: z.number({ message: "Latitude coordinates are required" }),
  longitude: z.number({ message: "Longitude coordinates are required" }),
  address: z.string().min(1, "Address location is required"),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  voiceUrl: z.string().optional(),
  forceCreate: z.boolean().optional()
});

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure database directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Lazy load Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        console.log('Gemini AI Client initialized successfully.');
      } catch (err) {
        console.error('Error initializing Gemini AI Client:', err);
      }
    } else {
      console.log('GEMINI_API_KEY is not set or placeholder. Running in local rule-based fallback mode.');
    }
  }
  return aiClient;
}

// Initial Mock Seed Data
const getInitialState = () => ({
  users: [
    {
      id: 'usr_citizen1',
      name: 'Sarah Jenkins',
      email: 'sarah.j@gmail.com',
      role: 'citizen',
      xp: 1420,
      level: 4,
      trustScore: 92,
      badges: [
        { id: 'badge_first', name: 'First Responder', icon: 'ShieldAlert', description: 'Reported first validated civic issue', dateEarned: '2026-05-12' },
        { id: 'badge_verify', name: 'Truth Seeker', icon: 'CheckCircle', description: 'Completed 10 accurate community verifications', dateEarned: '2026-06-10' }
      ]
    },
    {
      id: 'usr_officer_roads',
      name: 'Officer David Vance',
      email: 'vance@city.gov',
      role: 'officer',
      xp: 0,
      level: 1,
      trustScore: 100,
      badges: [],
      departmentId: 'dept_roads'
    },
    {
      id: 'usr_officer_water',
      name: 'Officer Elena Rostova',
      email: 'elena.r@city.gov',
      role: 'officer',
      xp: 0,
      level: 1,
      trustScore: 100,
      badges: [],
      departmentId: 'dept_water'
    },
    {
      id: 'usr_admin',
      name: 'Admin Director Charles',
      email: 'admin@city.gov',
      role: 'admin',
      xp: 0,
      level: 5,
      trustScore: 100,
      badges: []
    }
  ],
  departments: [
    { id: 'dept_roads', name: 'Roads & Infrastructure', icon: 'Hammer', head: 'David Vance', phone: '555-0192', complaintsCount: 1 },
    { id: 'dept_water', name: 'Water & Utilities', icon: 'Droplet', head: 'Elena Rostova', phone: '555-0145', complaintsCount: 1 },
    { id: 'dept_electricity', name: 'Power & Grid', icon: 'Zap', head: 'Marcus Cole', phone: '555-0176', complaintsCount: 0 },
    { id: 'dept_sanitation', name: 'Sanitation & Waste', icon: 'Trash2', head: 'Gary S.', phone: '555-0122', complaintsCount: 1 },
    { id: 'dept_traffic', name: 'Traffic & Signage', icon: 'TrafficCone', head: 'Officer Lin', phone: '555-0111', complaintsCount: 1 },
    { id: 'dept_public_safety', name: 'Public Safety', icon: 'Shield', head: 'Chief Garrison', phone: '555-0191', complaintsCount: 1 }
  ],
  complaints: [
    {
      id: 'comp_1',
      title: 'Massive Pothole on Mission Street',
      description: 'There is a huge pothole at the intersection of Mission and 16th St. It is damaging tires and forcing cars to swerve dangerously. Multiple cyclists have almost crashed.',
      citizenId: 'usr_citizen1',
      citizenName: 'Sarah Jenkins',
      status: 'in_progress',
      severity: 'high',
      department: 'Roads & Infrastructure',
      address: '1980 Mission St, San Francisco, CA 94103',
      latitude: 37.7651,
      longitude: -122.4194,
      supportCount: 14,
      progressPercent: 40,
      createdAt: '2026-06-24T10:00:00Z',
      verifiedAt: '2026-06-24T11:30:00Z',
      assignedAt: '2026-06-24T14:00:00Z',
      slaHours: 24,
      slaDeadline: '2026-06-25T10:00:00Z',
      images: [],
      videos: [],
      supporters: ['usr_citizen1']
    },
    {
      id: 'comp_2',
      title: 'Water Main Pipe Leaking and Flooding Sidewalk',
      description: 'Clean drinking water has been gushing from a cracks in the curb for 3 days. It is creating a massive puddle and flooding the pedestrian walkway.',
      citizenId: 'usr_citizen1',
      citizenName: 'Sarah Jenkins',
      status: 'reported',
      severity: 'medium',
      department: 'Water & Utilities',
      address: '450 Sutter St, San Francisco, CA 94108',
      latitude: 37.7891,
      longitude: -122.4084,
      supportCount: 6,
      progressPercent: 0,
      createdAt: '2026-06-25T15:30:00Z',
      slaHours: 48,
      slaDeadline: '2026-06-27T15:30:00Z',
      images: [],
      videos: [],
      supporters: ['usr_citizen1']
    },
    {
      id: 'comp_3',
      title: 'Illegal Dumping of Toxic Electronic Waste',
      description: 'Someone left 4 old television sets, paint cans, and broken computer monitors right inside the park playground near the sandpit.',
      citizenId: 'usr_citizen1',
      citizenName: 'Sarah Jenkins',
      status: 'resolved',
      severity: 'high',
      department: 'Sanitation & Waste',
      address: '320 Mission Dolores Park, San Francisco, CA 94114',
      latitude: 37.7599,
      longitude: -122.4271,
      supportCount: 22,
      progressPercent: 100,
      createdAt: '2026-06-20T08:00:00Z',
      verifiedAt: '2026-06-20T09:15:00Z',
      assignedAt: '2026-06-20T10:00:00Z',
      resolvedAt: '2026-06-21T14:20:00Z',
      slaHours: 24,
      slaDeadline: '2026-06-21T08:00:00Z',
      images: [],
      videos: [],
      supporters: []
    }
  ],
  complaintAI: {
    'comp_1': {
      complaintId: 'comp_1',
      category: 'Road Damage',
      subcategory: 'Pothole',
      department: 'Roads & Infrastructure',
      severity: 'high',
      priority: 'High priority due to active traffic disruption',
      confidence: 0.96,
      safetyRisk: 'Vehicle tire blowouts, cyclist crashes, swerving hazard.',
      citizensAffected: 450,
      estimatedDifficulty: 'Moderate - requires asphalt hot patch team',
      summary: 'Large, deep crater-style pothole in high-traffic lane on major arterial road.',
      suggestedAction: 'Deploy active traffic management/warning sign, schedule emergency patch crew.',
      analyzedAt: '2026-06-24T10:02:00Z'
    },
    'comp_2': {
      complaintId: 'comp_2',
      category: 'Utility Defect',
      subcategory: 'Water Main Leak',
      department: 'Water & Utilities',
      severity: 'medium',
      priority: 'Medium priority due to wasted clean water resource',
      confidence: 0.91,
      safetyRisk: 'Slippery pedestrian walkway, subbase erosion under pavement.',
      citizensAffected: 120,
      estimatedDifficulty: 'Hard - requires excavation and pipe sealing',
      summary: 'Ongoing pipe line leakage gushing clean water into storm drains.',
      suggestedAction: 'Dispatch water valve technician to shut off local header, schedule excavation team.',
      analyzedAt: '2026-06-25T15:32:00Z'
    },
    'comp_3': {
      complaintId: 'comp_3',
      category: 'Illegal Activities',
      subcategory: 'Hazardous Waste Dumping',
      department: 'Sanitation & Waste',
      severity: 'high',
      priority: 'High priority due to child proximity in park playground',
      confidence: 0.98,
      safetyRisk: 'Lead, mercury exposure to children, sharp broken glass shards.',
      citizensAffected: 180,
      estimatedDifficulty: 'Easy - requiring hazmat disposal truck transport',
      summary: 'Piles of CRT monitors and chemical paint cans abandoned in public family park.',
      suggestedAction: 'Clean up within 24 hours to prevent contact by kids. Report vehicle license plate if camera footage exists.',
      analyzedAt: '2026-06-20T08:03:00Z'
    }
  },
  verifications: [
    { id: 'v_1', complaintId: 'comp_1', voterId: 'usr_citizen1', voterName: 'Sarah Jenkins', vote: 'yes', timestamp: '2026-06-24T11:00:00Z' }
  ],
  progresses: [
    { id: 'pr_1', complaintId: 'comp_1', officerId: 'usr_officer_roads', officerName: 'David Vance', percentage: 40, note: 'Site inspected. Safety barrels placed. Material dispatched for repair crew morning route.', images: [], videos: [], timestamp: '2026-06-24T15:00:00Z' }
  ],
  rewards: [
    { id: 'rew_1', name: 'Municipal Public Transit Pass', description: 'Weekly free bus/train rider pass voucher', xpCost: 500, icon: 'Bus', category: 'Transit', redeemed: false },
    { id: 'rew_2', name: 'Community Garden Seed Pack', description: 'Assorted premium native flower and herb seeds', xpCost: 200, icon: 'Sprout', category: 'Eco', redeemed: false },
    { id: 'rew_3', name: 'Public Library VIP Booking', description: 'Exclusive early access to quiet study pods & equipment', xpCost: 350, icon: 'BookOpen', category: 'Education', redeemed: false }
  ],
  auditLogs: [
    { id: 'aud_1', timestamp: '2026-06-24T10:00:00Z', action: 'Complaint Filed', userRole: 'citizen', userName: 'Sarah Jenkins', details: 'Filed complaint comp_1 (Mission Street Pothole).' },
    { id: 'aud_2', timestamp: '2026-06-24T10:02:00Z', action: 'AI Assessment Completed', userRole: 'admin', userName: 'Gemini AI Orchestrator', details: 'Mapped comp_1 to Roads, calculated High severity.' }
  ]
});

// Load Database
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData = getInitialState();
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (err) {
    console.error('Error parsing DB JSON. Reinitializing.', err);
    const defaultData = getInitialState();
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

// Save Database
function saveDB(state: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
}

// Haversine Distance Formula for Duplicate Check
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Text overlap calculation for duplicate check
function textSimilarity(str1: string, str2: string): number {
  const w1 = new Set(str1.toLowerCase().split(/\s+/));
  const w2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...w1].filter(x => w2.has(x)));
  const union = new Set([...w1, ...w2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

async function startServer() {
  const app = express();

  // Handle json payload limits for images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API ROUTES ---

  // Get current active database state
  app.get('/api/state', (req, res) => {
    try {
      const state = loadDB();
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Submit Complaint & Trigger AI Pipeline + Duplicate Check
  app.post('/api/complaints', async (req, res) => {
    try {
      // Validate request payload using Zod schema
      const validationResult = complaintSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map(err => err.message).join(', ');
        return res.status(400).json({ error: errorMessages });
      }

      const { title, description, citizenId, citizenName, latitude, longitude, address, images, videos, voiceUrl, forceCreate } = validationResult.data;

      const state = loadDB();

      // 1. Duplicate Detection Engine (bypassed if forceCreate is true)
      let duplicateDetected = false;
      let matchedComplaint: any = null;

      if (!forceCreate) {
        for (const comp of state.complaints) {
          if (comp.status === 'resolved') continue;

          // Proximity score: Haversine distance < 0.5km (very close)
          const dist = getDistanceKm(latitude, longitude, comp.latitude, comp.longitude);
          const geoScore = dist < 0.5 ? 1 : dist < 1.5 ? 0.5 : 0;

          // Text similarity score
          const txtScore = textSimilarity(description, comp.description);

          // Combined duplicate score (weight GPS: 60%, Text: 40%)
          const duplicateScore = (geoScore * 0.6) + (txtScore * 0.4);

          if (duplicateScore > 0.7) {
            duplicateDetected = true;
            matchedComplaint = comp;
            break;
          }
        }
      }

      if (!forceCreate && duplicateDetected && matchedComplaint) {
        // Increase support count, merge media
        matchedComplaint.supportCount += 1;
        if (!matchedComplaint.supporters.includes(citizenId)) {
          matchedComplaint.supporters.push(citizenId);
        }
        if (images && images.length > 0) {
          matchedComplaint.images = [...(matchedComplaint.images || []), ...images].slice(0, 5);
        }

        // Add progress logs or timeline
        state.auditLogs.unshift({
          id: `aud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Duplicate Merge',
          userRole: 'citizen',
          userName: citizenName,
          details: `Merged duplicate report of "${title}" into original Complaint #${matchedComplaint.id}. Raised support count to ${matchedComplaint.supportCount}.`
        });

        saveDB(state);
        return res.json({
          duplicate: true,
          complaintId: matchedComplaint.id,
          message: 'This complaint matches an existing active report in your area. We have added your details and support to the active card!'
        });
      }

      // 2. Setup standard new complaint structure in pending AI state
      const newComplaintId = `comp_${Date.now()}`;
      const newComplaint = {
        id: newComplaintId,
        title,
        description,
        citizenId,
        citizenName,
        status: 'ai_processing' as const,
        severity: 'medium' as const,
        department: 'Sanitation & Waste', // Placeholder till AI runs
        address: address || 'Auto-captured GPS coordinates',
        latitude: latitude || 37.7749,
        longitude: longitude || -122.4194,
        supportCount: 1,
        progressPercent: 0,
        createdAt: new Date().toISOString(),
        images: images || [],
        videos: videos || [],
        voiceUrl: voiceUrl || null,
        slaHours: 48,
        slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        supporters: [citizenId]
      };

      state.complaints.unshift(newComplaint);
      state.auditLogs.unshift({
        id: `aud_create_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'Complaint Submitted',
        userRole: 'citizen',
        userName: citizenName,
        details: `Submitted new complaint "${title}" at ${address}. Status set to AI Processing.`
      });

      saveDB(state);

      // 3. Run AI Orchestration Layer asynchronously or synchronously to present immediate results
      const aiClient = getGeminiClient();
      let aiResult: any = null;

      if (aiClient) {
        try {
          // Prepare content with image base64 inlineData if present
          const parts: any[] = [
            {
              text: `You are the ultimate Civic AI Orchestrator. Analyze this submitted complaint and return a strictly valid JSON response.
              
              Complaint Title: "${title}"
              Complaint Description: "${description}"
              Captured Location: "${address}"
              
              Respond with a single JSON object that perfectly conforms to this schema (do NOT wrap in markdown formatting outside of JSON, do not add other words):
              {
                "category": "Main Category (e.g. Road Damage, Utility Leak, Waste Disposal, Public Health, Signal Outage)",
                "subcategory": "Specific detail (e.g. Pothole, Water Line, Hazardous Material, Illegal Parking)",
                "department": "One of: Roads & Infrastructure, Water & Utilities, Power & Grid, Sanitation & Waste, Traffic & Signage, Public Safety",
                "severity": "one of: critical, high, medium, low",
                "priority": "Short explanation of urgency level",
                "confidence": 0.95,
                "safetyRisk": "Short summary of human safety risks",
                "citizensAffected": 150,
                "estimatedDifficulty": "one of: Easy, Moderate, Hard",
                "summary": "Elegant 1-sentence executive summary of the issue.",
                "suggestedAction": "First immediately recommended dispatch step.",
                "nearbyCheckQuestion": "A friendly, localized question asking nearby citizens/residents to check or verify if this complaint is genuine (e.g., 'Can someone nearby check if the pothole at Elm St is indeed deep and active?'). Use the details of the complaint to make it highly specific."
              }`
            }
          ];

          // If there's an image, attach it as standard Part
          if (images && images.length > 0) {
            const firstImage = images[0];
            const base64Data = firstImage.split(',')[1] || firstImage;
            const mimeType = firstImage.split(';')[0]?.split(':')[1] || 'image/png';
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType
              }
            });
          }

          const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
              responseMimeType: 'application/json',
            }
          });

          const rawText = response.text || '{}';
          const cleanedText = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
          const parsed = JSON.parse(cleanedText);

          aiResult = {
            complaintId: newComplaintId,
            category: parsed.category || 'Road Damage',
            subcategory: parsed.subcategory || 'Pothole',
            department: parsed.department || 'Roads & Infrastructure',
            severity: (parsed.severity || 'medium').toLowerCase(),
            priority: parsed.priority || 'Medium priority assessment',
            confidence: parsed.confidence || 0.85,
            safetyRisk: parsed.safetyRisk || 'Pedestrian/vehicle swerve danger.',
            citizensAffected: parsed.citizensAffected || 45,
            estimatedDifficulty: parsed.estimatedDifficulty || 'Moderate',
            summary: parsed.summary || 'Citizen report of infrastructure defect.',
            suggestedAction: parsed.suggestedAction || 'Dispatch team for field survey.',
            nearbyCheckQuestion: parsed.nearbyCheckQuestion || `Could you please check if the issue "${title}" is genuine and still active?`,
            analyzedAt: new Date().toISOString()
          };
        } catch (err) {
          console.error('Gemini API call failed, using fallback heuristic:', err);
        }
      }

      // Fallback heuristic if Gemini fails or is not configured
      if (!aiResult) {
        const descLower = description.toLowerCase();
        let dept = 'Roads & Infrastructure';
        let category = 'Road Damage';
        let sub = 'Pothole';
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let risk = 'Pavement wear and tear.';

        if (descLower.includes('water') || descLower.includes('leak') || descLower.includes('pipe') || descLower.includes('gush') || descLower.includes('flood')) {
          dept = 'Water & Utilities';
          category = 'Utility Defect';
          sub = 'Water Leak';
          severity = 'high';
          risk = 'Slip and fall hazards, clean resource waste, local pavement flooding.';
        } else if (descLower.includes('wire') || descLower.includes('spark') || descLower.includes('power') || descLower.includes('light') || descLower.includes('blackout')) {
          dept = 'Power & Grid';
          category = 'Utility Defect';
          sub = 'Electrical Malfunction';
          severity = 'critical';
          risk = 'Fires, electrocution risk, night time lighting blackouts.';
        } else if (descLower.includes('dump') || descLower.includes('trash') || descLower.includes('waste') || descLower.includes('garbage') || descLower.includes('litter')) {
          dept = 'Sanitation & Waste';
          category = 'Sanitation';
          sub = 'Illegal Waste Dump';
          severity = 'medium';
          risk = 'Attracts vermin, environmental contamination, aesthetic park ruin.';
        } else if (descLower.includes('sign') || descLower.includes('traffic') || descLower.includes('car') || descLower.includes('speed') || descLower.includes('parked')) {
          dept = 'Traffic & Signage';
          category = 'Traffic Outage';
          sub = 'Signage Issue';
          severity = 'low';
          risk = 'Blocked driveways, vehicular sightline restrictions.';
        }

        let checkQ = `Can anyone nearby verify if there is an active pothole/road damage issue at "${address || 'the location'}"?`;
        if (dept === 'Water & Utilities') {
          checkQ = `Can anyone nearby verify if there is an active water leak or utility defect at "${address || 'the location'}"?`;
        } else if (dept === 'Power & Grid') {
          checkQ = `Can a nearby resident verify if the power issue or broken fixture is active at "${address || 'the location'}"?`;
        } else if (dept === 'Sanitation & Waste') {
          checkQ = `Can someone nearby check if the illegal trash or sanitation issue is still present at "${address || 'the location'}"?`;
        } else if (dept === 'Traffic & Signage') {
          checkQ = `Can you check if the signage/traffic issue described is currently causing disruptions at "${address || 'the location'}"?`;
        }

        aiResult = {
          complaintId: newComplaintId,
          category,
          subcategory: sub,
          department: dept,
          severity,
          priority: `Priority ${severity.toUpperCase()} - Heuristically analyzed by Local Copilot`,
          confidence: 0.75,
          safetyRisk: risk,
          citizensAffected: Math.floor(Math.random() * 80) + 15,
          estimatedDifficulty: severity === 'critical' ? 'Hard' : severity === 'high' ? 'Moderate' : 'Easy',
          summary: `Heuristic Summary: ${title} in vicinity of ${address || 'coordinates'}.`,
          suggestedAction: 'Deploy visual inspections team within 48 hours to confirm report details.',
          nearbyCheckQuestion: checkQ,
          analyzedAt: new Date().toISOString()
        };
      }

      // 4. Update the complaint document in DB with AI decision details
      const finalState = loadDB();
      const dbComplaint = finalState.complaints.find((c: any) => c.id === newComplaintId);

      if (dbComplaint) {
        dbComplaint.department = aiResult.department;
        dbComplaint.severity = aiResult.severity;
        dbComplaint.nearbyCheckQuestion = aiResult.nearbyCheckQuestion;
        dbComplaint.status = 'reported'; // Transition to standard "reported" status awaiting citizen votes or verification

        // SLA hours by severity
        const hours = aiResult.severity === 'critical' ? 4 : aiResult.severity === 'high' ? 12 : aiResult.severity === 'medium' ? 24 : 72;
        dbComplaint.slaHours = hours;
        dbComplaint.slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

        // Increment department's complaint counts
        const deptDoc = finalState.departments.find((d: any) => d.name === aiResult.department);
        if (deptDoc) {
          deptDoc.complaintsCount += 1;
        }

        // Store separate AI record
        finalState.complaintAI[newComplaintId] = aiResult;

        // Log audit
        finalState.auditLogs.unshift({
          id: `aud_ai_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'AI Auto-Triaged',
          userRole: 'admin',
          userName: 'Gemini AI Orchestrator',
          details: `Processed comp_${newComplaintId}. Mapped to ${aiResult.department} (Severity: ${aiResult.severity.toUpperCase()}, SLA: ${hours}h).`
        });

        saveDB(finalState);
      }

      res.json({
        duplicate: false,
        complaint: dbComplaint || newComplaint,
        aiAnalysis: aiResult
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Verify / Vote on Nearby Complaint
  app.post('/api/verify', (req, res) => {
    try {
      const { complaintId, voterId, voterName, vote } = req.body;

      if (!complaintId || !voterId || !voterName || !vote) {
        return res.status(400).json({ error: 'Missing voter attributes' });
      }

      const state = loadDB();
      const comp = state.complaints.find((c: any) => c.id === complaintId);

      if (!comp) {
        return res.status(440).json({ error: 'Complaint not found.' });
      }

      // Record voter choice
      const newVoteId = `v_${Date.now()}`;
      state.verifications.push({
        id: newVoteId,
        complaintId,
        voterId,
        voterName,
        vote,
        timestamp: new Date().toISOString()
      });

      // Reward Voter with XP and raise trustScore
      const user = state.users.find((u: any) => u.id === voterId);
      if (user) {
        user.xp += 25;
        user.trustScore = Math.min(100, user.trustScore + 2);
        if (user.xp >= user.level * 500) {
          user.level += 1;
          user.badges.push({
            id: `badge_level_${user.level}_${Date.now()}`,
            name: `Level ${user.level} Civic Leader`,
            icon: 'Award',
            description: `Reached Level ${user.level} through consistent community participation!`,
            dateEarned: new Date().toISOString().split('T')[0]
          });
        }
      }

      // Check Verification State transitions
      const allVotes = state.verifications.filter((v: any) => v.complaintId === complaintId);
      const yesVotes = allVotes.filter((v: any) => v.vote === 'yes').length;
      const noVotes = allVotes.filter((v: any) => v.vote === 'no').length;

      let statusChanged = false;
      if (comp.status === 'reported') {
        if (yesVotes >= 2) {
          comp.status = 'verified';
          comp.verifiedAt = new Date().toISOString();
          statusChanged = true;

          // Increase author's trust score
          const author = state.users.find((u: any) => u.id === comp.citizenId);
          if (author) {
            author.xp += 100;
            author.trustScore = Math.min(100, author.trustScore + 5);
          }
        } else if (noVotes >= 2) {
          comp.status = 'resolved'; // Or custom status like rejected/archived
          comp.progressPercent = 100;
          statusChanged = true;

          // Penalize fake author trust score slightly
          const author = state.users.find((u: any) => u.id === comp.citizenId);
          if (author) {
            author.trustScore = Math.max(10, author.trustScore - 15);
          }
        }
      }

      state.auditLogs.unshift({
        id: `aud_vote_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'Verification Voted',
        userRole: 'citizen',
        userName: voterName,
        details: `Voted "${vote.toUpperCase()}" on Complaint #${complaintId}. ${statusChanged ? `Complaint transitioned to ${comp.status.toUpperCase()}.` : ''}`
      });

      saveDB(state);
      res.json({ success: true, complaint: comp, user });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Officer updates progress of a complaint
  app.post('/api/progress', (req, res) => {
    try {
      const { complaintId, officerId, officerName, percentage, note, images, videos } = req.body;

      if (!complaintId || !officerId || percentage === undefined) {
        return res.status(400).json({ error: 'Missing complaintId, officerId, or percentage.' });
      }

      const state = loadDB();
      const comp = state.complaints.find((c: any) => c.id === complaintId);

      if (!comp) {
        return res.status(404).json({ error: 'Complaint not found.' });
      }

      // Add progress track
      const progressId = `pr_${Date.now()}`;
      state.progresses.push({
        id: progressId,
        complaintId,
        officerId,
        officerName,
        percentage,
        note: note || `Slight update from field officer.`,
        images: images || [],
        videos: videos || [],
        timestamp: new Date().toISOString()
      });

      // Update parent complaint percent
      comp.progressPercent = percentage;
      if (comp.status === 'verified' || comp.status === 'reported') {
        comp.status = 'in_progress';
        comp.assignedAt = new Date().toISOString();
      }

      if (percentage >= 100) {
        comp.status = 'resolved';
        comp.resolvedAt = new Date().toISOString();

        // Award reward XP to original reporter
        const reporter = state.users.find((u: any) => u.id === comp.citizenId);
        if (reporter) {
          reporter.xp += 200; // Big bonus for resolved problem!
          reporter.trustScore = Math.min(100, reporter.trustScore + 8);
        }
      }

      state.auditLogs.unshift({
        id: `aud_prog_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'Progress Updated',
        userRole: 'officer',
        userName: officerName,
        details: `Updated Complaint #${complaintId} to ${percentage}% done. Note: "${note}"`
      });

      saveDB(state);
      res.json({ success: true, complaint: comp });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Spend Citizen XP to redeem reward vouchers
  app.post('/api/rewards/redeem', (req, res) => {
    try {
      const { userId, rewardId } = req.body;
      const state = loadDB();

      const user = state.users.find((u: any) => u.id === userId);
      const reward = state.rewards.find((r: any) => r.id === rewardId);

      if (!user || !reward) {
        return res.status(404).json({ error: 'User or Reward not found.' });
      }

      if (user.xp < reward.xpCost) {
        return res.status(400).json({ error: 'Insufficient XP points to redeem this reward.' });
      }

      user.xp -= reward.xpCost;
      reward.redeemed = true;

      state.auditLogs.unshift({
        id: `aud_redeem_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'Reward Redeemed',
        userRole: 'citizen',
        userName: user.name,
        details: `Redeemed "${reward.name}" for ${reward.xpCost} XP points. Remaining XP: ${user.xp}.`
      });

      saveDB(state);
      res.json({ success: true, user, reward });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin save configuration
  app.post('/api/admin/config', (req, res) => {
    try {
      const { action, payload } = req.body;
      const state = loadDB();

      if (action === 'reset') {
        const resetData = getInitialState();
        saveDB(resetData);
        return res.json({ success: true, message: 'System database successfully reset to default seeds.' });
      }

      if (action === 'add_department') {
        const { name, icon, head, phone } = payload;
        const newDept = {
          id: `dept_${Date.now()}`,
          name,
          icon: icon || 'ShieldAlert',
          head: head || 'N/A',
          phone: phone || 'N/A',
          complaintsCount: 0
        };
        state.departments.push(newDept);
        state.auditLogs.unshift({
          id: `aud_dept_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Department Created',
          userRole: 'admin',
          userName: 'Charles (Admin)',
          details: `Created new department "${name}" headed by ${head}.`
        });
        saveDB(state);
        return res.json({ success: true, departments: state.departments });
      }

      res.status(400).json({ error: 'Invalid admin config action' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Officer Copilot Endpoint - Pure Magic
  app.post('/api/copilot', async (req, res) => {
    try {
      const { query, officerName, departmentName } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required.' });
      }

      const state = loadDB();
      // Only summarize complaints assigned to the officer's department or show general if Admin/Super
      const relevantComplaints = departmentName 
        ? state.complaints.filter((c: any) => c.department === departmentName)
        : state.complaints;

      const aiClient = getGeminiClient();

      if (aiClient) {
        try {
          const systemPrompt = `You are the ultimate AI Officer Copilot for the city civic department "${departmentName || 'General Civic Service'}".
          You have direct query access to the database containing all municipal complaints reported by residents.
          
          Here is a compact text representation of all active complaints in the system currently relevant to you:
          ${JSON.stringify(relevantComplaints.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            status: c.status,
            severity: c.severity,
            address: c.address,
            supportCount: c.supportCount,
            progressPercent: c.progressPercent,
            createdAt: c.createdAt,
            slaDeadline: c.slaDeadline
          })), null, 2)}
          
          Respond to the officer's prompt: "${query}" in clear, actionable professional markdown.
          Guidelines:
          - Be accurate: reference specific complaints by their ID and short title.
          - Categorize logically.
          - Summarize unresolved critical complaints or SLA violations if asked.
          - Offer concise worked priorities.
          - Keep response tone supportive, governmental, and crisp. Use bullet points and bold headers.`;

          const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
          });

          return res.json({
            reply: response.text || "I was unable to analyze the data. Please try rephrasing your request."
          });
        } catch (err) {
          console.error('Gemini Copilot API Call failed. Falling back to local rule analysis:', err);
        }
      }

      // Offline Rule-based Heuristic Copilot
      const qLower = query.toLowerCase();
      let reply = '';

      if (qLower.includes('overdue') || qLower.includes('sla') || qLower.includes('violate')) {
        const overdue = relevantComplaints.filter((c: any) => c.status !== 'resolved' && new Date(c.slaDeadline) < new Date());
        if (overdue.length > 0) {
          reply = `### 🚨 Overdue / SLA Violating Issues\n\nI have scanned the active database and found **${overdue.length} complaints** currently exceeding their assigned SLA deadlines:\n\n` +
            overdue.map((c: any) => `- **[${c.id}] ${c.title}**\n  - **Severity:** \`${c.severity.toUpperCase()}\` | **Status:** \`${c.status.toUpperCase()}\` (${c.progressPercent}% completed)\n  - **SLA Deadline:** *${new Date(c.slaDeadline).toLocaleString()}*\n  - **Address:** ${c.address}\n  - **Urgent Action:** Dispatch a supervisor to ${c.address} immediately to expedite final clearance.`).join('\n\n');
        } else {
          reply = `### ✅ SLA Compliance Verification\n\nExcellent news! No outstanding complaints are violating their Service Level Agreement (SLA) deadlines at this time. Keep up the prompt work schedule!`;
        }
      } else if (qLower.includes('critical') || qLower.includes('immediate') || qLower.includes('priority')) {
        const criticals = relevantComplaints.filter((c: any) => c.status !== 'resolved' && (c.severity === 'critical' || c.severity === 'high'));
        if (criticals.length > 0) {
          reply = `### 🔥 Critical & High Severity Issues Requiring Immediate Action\n\nHere are the top priority cases identified by the AI triage engine:\n\n` +
            criticals.map((c: any) => `- **[${c.id}] ${c.title}**\n  - **Risk:** High safety hazard listed. Public upvotes: **${c.supportCount} supporters**.\n  - **Status:** \`${c.status.toUpperCase()}\` | Progress: ${c.progressPercent}%\n  - **Location:** ${c.address}\n  - **Recommendation:** Allocate the primary repair crew to resolve this next.`).join('\n\n');
        } else {
          reply = `### 💤 High-Severity Cases Log\n\nThere are currently no active unresolved Critical or High severity reports requiring immediate dispatch. All current workloads are within normal bounds.`;
        }
      } else if (qLower.includes('summary') || qLower.includes('today') || qLower.includes('statistic') || qLower.includes('weekly')) {
        const pending = relevantComplaints.filter((c: any) => c.status !== 'resolved').length;
        const done = relevantComplaints.filter((c: any) => c.status === 'resolved').length;
        reply = `### 📊 Department Summary Report\n\nGenerated for: **Officer ${officerName || 'Staff'}**\nScope: **${departmentName || 'All City Portals'}**\n\n- **Active Backlog:** ${pending} issues unresolved.\n- **Resolved Cases:** ${done} tickets closed in the current cycle.\n- **Top Sector Area:** Mission District & Downtown.\n\n#### Recommendation\nPrioritize community-verified issues that have gathered more than 5 upvotes to optimize citizen confidence index scores.`;
      } else if (qLower.includes('duplicate')) {
        reply = `### 🔗 Duplicate Assessment\n\nOur duplicate detection engine has merged and combined **1 report** on Mission Street previously. The primary record continues to consolidate all evidence logs correctly under ticket **[comp_1]** to prevent crew allocation overlaps.`;
      } else {
        reply = `### 🤖 Hello Officer ${officerName || 'Hero'}!\n\nI am your AI Department Copilot. You can query me using prompts like:\n- *Show overdue complaints.*\n- *Which complaints require immediate action?*\n- *Summarize today's complaints.*\n- *Generate a ward-wise status report.*\n\nHow can I assist your field dispatch crews today?`;
      }

      res.json({ reply: `${reply}\n\n*(Note: Running in offline/rule-fallback copilot mode. Set GEMINI_API_KEY in Secrets for live generative intelligence!)*` });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // --- VITE MIDDLEWARE FOR DEVELOPMENT ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static files serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
