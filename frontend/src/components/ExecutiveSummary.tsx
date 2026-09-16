import React from 'react';
import type { Mission } from '../types';
import { Card } from '../components/ui/primitives';

export default function ExecutiveSummary({ mission }: { mission: Mission }) {
  const performedAnalyses = mission.tasks
    .filter((t) => t.status === 'completed')
    .map((t) => t.title)
    .join(', ');

  return (
    <Card className="space-y-4 p-4 bg-[#160F0B] border border-[#2E2018]">
      <h2 className="text-lg font-bold text-[#F0E4D8]">Executive Summary</h2>
      <div className="text-[13px] text-[#CCBEB1] space-y-2">
        <p>
          <strong>Mission Objective:</strong> {mission.objective}
        </p>
        <p>
          <strong>Investigation Performed:</strong>{' '}
          {performedAnalyses || 'No analyses executed.'}
        </p>
        <p>
          <strong>Main Finding:</strong> {mission.primary_finding}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
        <div className="p-2 rounded bg-[#120D0A] border border-[#2E2018] text-center">
          <span className="text-[10px] font-mono uppercase text-[#997E67]">Changed Area (km²)</span>
          <div className="text-[18px] font-black text-[#FFDBBB]">
            {mission.statistics.changed_area_km2.toFixed(2)}
          </div>
        </div>
        <div className="p-2 rounded bg-[#120D0A] border border-[#2E2018] text-center">
          <span className="text-[10px] font-mono uppercase text-[#997E67]">Agricultural Impact (km²)</span>
          <div className="text-[18px] font-black text-[#FFDBBB]">
            {mission.statistics.agricultural_affected_km2.toFixed(2)}
          </div>
        </div>
        <div className="p-2 rounded bg-[#120D0A] border border-[#2E2018] text-center">
          <span className="text-[10px] font-mono uppercase text-[#997E67]">Water Expansion (km²)</span>
          <div className="text-[18px] font-black text-[#FFDBBB]">
            {mission.statistics.water_expansion_km2.toFixed(2)}
          </div>
        </div>
        <div className="p-2 rounded bg-[#120D0A] border border-[#2E2018] text-center">
          <span className="text-[10px] font-mono uppercase text-[#997E67]">Observation Period</span>
          <div className="text-[13px] font-medium text-[#CCBEB1]">N/A</div>
        </div>
      </div>
    </Card>
  );
}
