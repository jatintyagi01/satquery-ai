import { useState, useEffect } from "react";
import {
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { AdvancedChangeAnalysis, RegionSpectralData } from "../types";

interface Props {
  data?: AdvancedChangeAnalysis;
  selectedRegionIndex?: number | null;
  onSelectRegion?: (index: number | null) => void;
}

export default function AdvancedSpectralBiophysicalAnalysis({
  data,
  selectedRegionIndex = null,
  onSelectRegion,
}: Props) {
  const [activeRegion, setActiveRegion] = useState<number | null>(selectedRegionIndex);

  useEffect(() => {
    setActiveRegion(selectedRegionIndex);
  }, [selectedRegionIndex]);

  if (!data) return null;

  const currentRegionData: RegionSpectralData | undefined =
    activeRegion !== null
      ? data.regions?.find((r) => r.region_index === activeRegion)
      : undefined;

  const cards = currentRegionData ? currentRegionData.cards : data.global_cards;
  const spectralBands = currentRegionData ? currentRegionData.spectral_bands : data.spectral_bands;
  const radarData = currentRegionData ? currentRegionData.biophysical_radar : data.biophysical_radar;
  const aiInterpretation = currentRegionData
    ? currentRegionData.ai_interpretation
    : data.ai_interpretation;
  const spectralDistance = currentRegionData
    ? currentRegionData.spectral_distance
    : data.spectral_distance;

  const handleScopeChange = (idx: number | null) => {
    setActiveRegion(idx);
    if (onSelectRegion) {
      onSelectRegion(idx);
    }
  };

  return (
    <div className="mt-5 pt-5 border-t border-[#2E2018] space-y-4">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <h3 className="text-[13px] font-mono font-bold uppercase tracking-wider text-accent-primary">
              {data.title || "ADVANCED SPECTRAL & BIOPHYSICAL CHANGE ANALYSIS"}
            </h3>
          </div>
          <p className="text-[11px] font-mono text-accent-tertiary mt-0.5">
            {data.subtitle || "Compare spectral, vegetation and radar characteristics between acquisition dates."}
          </p>
        </div>

        {/* Region Scope Selector */}
        {data.regions && data.regions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleScopeChange(null)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded transition-colors ${
                activeRegion === null
                  ? "bg-accent-primary text-space-950 font-bold shadow-sm"
                  : "bg-space-900 border border-[#2E2018] text-accent-secondary hover:border-accent-tertiary"
              }`}
            >
              Scene Aggregate
            </button>
            {data.regions.map((reg) => (
              <button
                key={reg.region_index}
                onClick={() => handleScopeChange(reg.region_index)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded transition-colors ${
                  activeRegion === reg.region_index
                    ? "bg-accent-primary text-space-950 font-bold shadow-sm"
                    : "bg-space-900 border border-[#2E2018] text-accent-secondary hover:border-accent-tertiary"
                }`}
                title={`Inspect ${reg.region_id} (${reg.area_pct.toFixed(1)}% of scene)`}
              >
                {reg.region_id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Scope Indicator Banner ── */}
      {currentRegionData && (
        <div className="flex items-center justify-between text-[11px] font-mono text-accent-primary bg-[#1A1410] border border-accent-tertiary/40 rounded px-3 py-1.5">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal size={13} className="text-accent-primary" />
            Displaying localized metrics for{" "}
            <strong>{currentRegionData.region_id}</strong> (covers{" "}
            {currentRegionData.area_pct.toFixed(1)}% of scene)
          </span>
          <button
            onClick={() => handleScopeChange(null)}
            className="text-[10px] text-accent-tertiary hover:text-accent-primary underline ml-2"
          >
            Reset to Scene
          </button>
        </div>
      )}

      {/* ── Top Metric Cards (Row of 4) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Card 1: Built-up Expansion */}
        <div className="p-3 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between hover:border-[#44342A] transition-colors">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">
            {cards.built_up?.title || "BUILT-UP EXPANSION"}
          </span>
          <div className="my-1">
            <span
              className="text-[20px] font-black font-mono leading-none"
              style={{ color: cards.built_up?.color || "#FFDBBB" }}
            >
              {cards.built_up?.value || "+0.0%"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-[#997E67]">
              {cards.built_up?.label || "Surface Shift"}
            </span>
            {cards.built_up?.t1_val && cards.built_up?.t2_val && (
              <span className="text-[9px] font-mono text-accent-secondary/60">
                {cards.built_up.t1_val} → {cards.built_up.t2_val}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Vegetation Change */}
        <div className="p-3 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between hover:border-[#44342A] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">
              {cards.vegetation?.title || "VEGETATION CHANGE"}
            </span>
            {cards.vegetation?.ndvi_available === false && (
              <span
                className="text-[8px] font-mono px-1 py-0.5 rounded bg-accent-negative/10 text-accent-negative border border-accent-negative/30"
                title="Input is standard RGB without dedicated NIR channel"
              >
                No NIR
              </span>
            )}
          </div>
          <div className="my-1">
            <span
              className="text-[20px] font-black font-mono leading-none"
              style={{ color: cards.vegetation?.color || "#C47A6A" }}
            >
              {cards.vegetation?.value || "0.0%"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-[#997E67]">
              {cards.vegetation?.label || "Vegetation Delta"}
            </span>
            {cards.vegetation?.t1_val && cards.vegetation?.t2_val && (
              <span className="text-[9px] font-mono text-accent-secondary/60">
                {cards.vegetation.t1_val} → {cards.vegetation.t2_val}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: SAR Backscatter */}
        <div className="p-3 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between hover:border-[#44342A] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">
              {cards.sar?.title || "SAR BACKSCATTER"}
            </span>
            {cards.sar?.available ? (
              <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-accent-positive/10 text-accent-positive border border-accent-positive/30">
                Radar
              </span>
            ) : (
              <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-space-800 text-[#997E67] border border-[#2E2018]">
                N/A
              </span>
            )}
          </div>
          <div className="my-1">
            <span
              className="text-[20px] font-black font-mono leading-none"
              style={{ color: cards.sar?.color || "#8FAF8A" }}
            >
              {cards.sar?.value || "N/A"}
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#997E67]">
            {cards.sar?.label || (cards.sar?.available ? "VV / VH Dual-Pol" : "SAR input required")}
          </span>
        </div>

        {/* Card 4: Spectral Distance */}
        <div className="p-3 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between hover:border-[#44342A] transition-colors">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">
            {cards.spectral_distance?.title || "SPECTRAL DISTANCE"}
          </span>
          <div className="my-1">
            <span
              className="text-[20px] font-black font-mono leading-none"
              style={{ color: cards.spectral_distance?.color || "#CCBEB1" }}
            >
              {cards.spectral_distance?.value || `${spectralDistance.toFixed(2)} RMS`}
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#997E67]">
            {cards.spectral_distance?.label || "T1 vs T2 Spectral Difference"}
          </span>
        </div>
      </div>

      {/* ── Charts Grid (Left: Spectral Shift Bar, Right: Biophysical Radar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Chart: Spectral Reflectance Shift */}
        <div className="p-3.5 rounded-md bg-[#120D0A] border border-[#2E2018]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFDBBB] flex items-center gap-1.5">
              <span>📊</span> SPECTRAL REFLECTANCE SHIFT (T1 VS T2)
            </span>
            <span className="text-[10px] font-mono text-[#997E67]">Top of Atmosphere (DN)</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={spectralBands}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="band"
                  tick={{ fill: "#997E67", fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
                  axisLine={{ stroke: "#2E2018" }}
                  tickLine={{ stroke: "#2E2018" }}
                />
                <YAxis
                  tick={{ fill: "#997E67", fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
                  axisLine={{ stroke: "#2E2018" }}
                  tickLine={{ stroke: "#2E2018" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1C1510",
                    borderColor: "rgba(255, 219, 187, 0.25)",
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: "IBM Plex Mono, monospace",
                    color: "#FFDBBB",
                  }}
                  itemStyle={{ color: "#CCBEB1" }}
                  labelStyle={{ color: "#FFDBBB", fontWeight: "bold" }}
                  formatter={(value: any, name: any, item: any) => [
                    `${value} DN`,
                    name === "T1_Before" ? "Before (T1)" : "After (T2)",
                  ]}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono, monospace",
                    color: "#CCBEB1",
                    paddingTop: 4,
                  }}
                />
                <Bar
                  dataKey="T1_Before"
                  name="Before (T1)"
                  fill="#997E67"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="T2_After"
                  name="After (T2)"
                  fill="#FFDBBB"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Biophysical Indices / Radar */}
        <div className="p-3.5 rounded-md bg-[#120D0A] border border-[#2E2018]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFDBBB] flex items-center gap-1.5">
              <span>🎯</span> BIOPHYSICAL INDICES RADAR
            </span>
            <span className="text-[10px] font-mono text-[#997E67]">Normalized Scale (0–100)</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                margin={{ top: 8, right: 20, left: 20, bottom: 8 }}
              >
                <PolarGrid stroke="#2E2018" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "#CCBEB1", fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
                />
                <PolarRadiusAxis
                  stroke="#2E2018"
                  tick={{ fill: "#997E67", fontSize: 8, fontFamily: "IBM Plex Mono, monospace" }}
                  domain={[0, 100]}
                />
                <Radar
                  name="Before (T1)"
                  dataKey="Before"
                  stroke="#997E67"
                  fill="#997E67"
                  fillOpacity={0.35}
                />
                <Radar
                  name="After (T2)"
                  dataKey="After"
                  stroke="#FFDBBB"
                  fill="#FFDBBB"
                  fillOpacity={0.45}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono, monospace",
                    color: "#CCBEB1",
                    paddingTop: 4,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1C1510",
                    borderColor: "rgba(255, 219, 187, 0.25)",
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                  itemStyle={{ color: "#CCBEB1" }}
                  formatter={(value: any, name: any) => [
                    `${value} / 100`,
                    name,
                  ]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── AI-Generated Interpretation & Sensor Status ── */}
      <div className="p-3.5 rounded-md bg-[#120D0A] border border-[#2E2018] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent-primary" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent-primary">
              AI Spectral & Biophysical Interpretation
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#997E67]">
            Evidence-Grounded Synthesis
          </span>
        </div>

        <p className="text-[12px] font-mono text-accent-secondary leading-relaxed bg-[#1A1410] p-2.5 rounded border border-[#2E2018]">
          "{aiInterpretation}"
        </p>

        {/* Modality Status Badges */}
        {data.sensor_status && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-[10px] font-mono">
            <span className="text-[#997E67]">Sensor Telemetry:</span>
            {Object.entries(data.sensor_status).map(([sensor, status]) => {
              const active = status.toLowerCase().includes("active");
              return (
                <span
                  key={sensor}
                  className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                    active
                      ? "bg-accent-positive/10 border-accent-positive/30 text-accent-positive"
                      : "bg-[#1A1410] border-[#2E2018] text-[#997E67]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      active ? "bg-accent-positive" : "bg-[#997E67]"
                    }`}
                  />
                  <strong className="capitalize">{sensor.replace("_", " ")}:</strong>{" "}
                  {status}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
