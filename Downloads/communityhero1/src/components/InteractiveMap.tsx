/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapPin, Info, Users, Clock, ShieldAlert } from 'lucide-react';
import { Complaint, ComplaintSeverity } from '../types';

interface InteractiveMapProps {
  complaints: Complaint[];
  onSelectComplaint?: (complaint: Complaint) => void;
  selectedComplaintId?: string;
  isSelectorMode?: boolean;
  onSelectCoordinates?: (lat: number, lng: number, address: string) => void;
}

export function InteractiveMap({
  complaints,
  onSelectComplaint,
  selectedComplaintId,
  isSelectorMode = false,
  onSelectCoordinates
}: InteractiveMapProps) {
  const [hoveredComp, setHoveredComp] = useState<Complaint | null>(null);
  const [clickPin, setClickPin] = useState<{ lat: number; lng: number } | null>(null);

  // SF Bounds for mock SVG map projection
  // Lat: 37.7500 to 37.7950
  // Lng: -122.4350 to -122.4000
  const latMin = 37.7500;
  const latMax = 37.7950;
  const lngMin = -122.4350;
  const lngMax = -122.4000;

  const projectCoords = (lat: number, lng: number) => {
    // Project to percentage coordinates (x: 0-100%, y: 0-100%)
    const x = ((lng - lngMin) / (lngMax - lngMin)) * 100;
    // Y-axis is inverted in SVG
    const y = (1 - (lat - latMin) / (latMax - latMin)) * 100;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const deprojectCoords = (xPercent: number, yPercent: number) => {
    const lng = lngMin + (xPercent / 100) * (lngMax - lngMin);
    const lat = latMin + (1 - yPercent / 100) * (latMax - latMin);
    return { lat: parseFloat(lat.toFixed(5)), lng: parseFloat(lng.toFixed(5)) };
  };

  const getSeverityColor = (sev: ComplaintSeverity, status: string) => {
    if (status === 'resolved') return 'bg-emerald-500 border-emerald-200 text-white shadow-sm';
    switch (sev) {
      case 'critical': return 'bg-rose-600 border-rose-300 text-rose-50 ring-rose-400 ring-2 animate-pulse';
      case 'high': return 'bg-orange-500 border-orange-200 text-white shadow-sm';
      case 'medium': return 'bg-amber-400 border-amber-200 text-amber-950 shadow-sm';
      case 'low': return 'bg-blue-500 border-blue-200 text-white shadow-sm';
      default: return 'bg-slate-400 border-slate-200 text-slate-900 shadow-sm';
    }
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isSelectorMode || !onSelectCoordinates) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const coords = deprojectCoords(x, y);
    setClickPin(coords);

    // Simulated Reverse Geocoding Addresses
    const districts = [
      'Mission District', 'SOMA', 'Financial District', 'Chinatown', 
      'Dolores Heights', 'Union Square', 'Civic Center', 'Nob Hill'
    ];
    const randStreet = Math.floor(coords.lat * 1000) % 500 + 100;
    const district = districts[Math.floor((coords.lat + coords.lng) * 100) % districts.length];
    const simAddress = `${randStreet} Broadway Ave, ${district}, San Francisco, CA 94103`;

    onSelectCoordinates(coords.lat, coords.lng, simAddress);
  };

  return (
    <div className="relative w-full h-[400px] md:h-[480px] bg-[#f8fafc] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      {/* Background Stylized City Grid SVG */}
      <svg
        className="w-full h-full cursor-pointer select-none"
        onClick={handleMapClick}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        id="city-grid-svg"
      >
        {/* Ambient Dark Gridlines */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#cbd5e1" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="#f1f5f9" opacity="0.6" />

        {/* Mock Major Highways / Arterials representing SF roads */}
        <path d="M 0 50 Q 30 45 60 65 T 100 60" fill="none" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.9" />
        <path d="M 20 0 C 35 40 40 60 50 100" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.9" />
        <path d="M 80 0 C 70 30 75 70 90 100" fill="none" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.9" />
        <path d="M 0 20 L 100 45" fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.7" />
        <path d="M 0 80 L 100 85" fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.7" />

        {/* Park Overlays (Mission Dolores & Presidio simulated zones) */}
        <rect x="15" y="65" width="20" height="15" rx="2" fill="#10b981" opacity="0.1" />
        <rect x="70" y="10" width="18" height="22" rx="3" fill="#10b981" opacity="0.1" />
        
        {/* Water Outline (Bay side on right) */}
        <path d="M 95 0 C 90 20 88 50 93 80 T 100 100 L 100 0 Z" fill="#0284c7" opacity="0.1" />

        {/* Map Label overlays */}
        <text x="25" y="73" fill="#059669" fontSize="2.5" fontWeight="semibold" opacity="0.6" className="font-sans">Dolores Reserve</text>
        <text x="75" y="22" fill="#059669" fontSize="2.5" fontWeight="semibold" opacity="0.6" className="font-sans">Bay Park</text>
        <text x="50" y="45" fill="#64748b" fontSize="3" fontWeight="bold" opacity="0.4" className="font-sans">METROPOLIS CORE</text>
      </svg>

      {/* Map Interactive Pins */}
      {!isSelectorMode && complaints.map((comp) => {
        const { x, y } = projectCoords(comp.latitude, comp.longitude);
        const isSelected = selectedComplaintId === comp.id;
        
        return (
          <button
            key={comp.id}
            onClick={() => onSelectComplaint?.(comp)}
            onMouseEnter={() => setHoveredComp(comp)}
            onMouseLeave={() => setHoveredComp(null)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full border shadow-md transition-all duration-300 ${
              getSeverityColor(comp.severity, comp.status)
            } ${isSelected ? 'scale-125 ring-4 ring-blue-600 z-20 shadow-lg shadow-blue-100' : 'hover:scale-115 z-10'}`}
            id={`pin-btn-${comp.id}`}
          >
            <MapPin className="w-4 h-4" />
          </button>
        );
      })}

      {/* Selector Pin for creation mode */}
      {isSelectorMode && clickPin && (() => {
        const { x, y } = projectCoords(clickPin.lat, clickPin.lng);
        return (
          <div
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white ring-4 ring-blue-100 shadow-xl animate-bounce z-20"
          >
            <MapPin className="w-5 h-5" />
          </div>
        );
      })()}

      {/* Hover Info Window Tooltip */}
      {hoveredComp && !isSelectorMode && (() => {
        const { x, y } = projectCoords(hoveredComp.latitude, hoveredComp.longitude);
        return (
          <div
            style={{
              left: `${x > 50 ? 'auto' : `${x + 2}%`}`,
              right: `${x > 50 ? `${100 - x + 2}%` : 'auto'}`,
              top: `${y > 70 ? `${y - 18}%` : `${y + 2}%`}`
            }}
            className="absolute bg-white border border-slate-200 text-slate-800 p-3.5 rounded-xl shadow-xl w-60 pointer-events-none z-30 transition-all duration-150 backdrop-blur-md opacity-95"
            id="map-hover-box"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${
                hoveredComp.status === 'resolved' ? 'bg-emerald-500' :
                hoveredComp.severity === 'critical' ? 'bg-rose-500' :
                hoveredComp.severity === 'high' ? 'bg-orange-500' : 'bg-amber-400'
              }`} />
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {hoveredComp.department}
              </p>
            </div>
            <h4 className="text-xs font-semibold font-sans leading-snug line-clamp-2 text-slate-700">
              {hoveredComp.title}
            </h4>
            
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 font-mono">
              <span className="flex items-center gap-0.5">
                <Users className="w-3 h-3 text-slate-400" /> {hoveredComp.supportCount} support
              </span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-slate-400" /> {hoveredComp.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Instructions / Legend Floating overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl shadow-md max-w-xs pointer-events-none font-sans">
        {isSelectorMode ? (
          <p className="font-medium text-blue-700">
            📍 Click anywhere on the city map grid above to set the exact GPS coordinates and capture the address automatically.
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity Legend</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-600 animate-pulse" /> Critical</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500" /> High</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> Low</span>
              <span className="flex items-center gap-1 col-span-2"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Resolved (All Depts)</span>
            </div>
          </div>
        )}
      </div>

      {/* Cluster Indicator overlay */}
      {!isSelectorMode && complaints.length > 0 && (
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-700 text-[10px] font-mono px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Tracking {complaints.length} Local Incidents</span>
        </div>
      )}
    </div>
  );
}
