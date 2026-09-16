import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Compass,
  Rocket,
  Layers,
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  FileText,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Image as ImageIcon,
  Upload,
  Activity,
} from "lucide-react";
import { api } from "../services/api";
import type { Mission, MissionTask, MissionAffectedRegion, ImageMetadata } from "../types";
import { Badge, Card, PanelTitle, SecondaryButton } from "../components/ui/primitives";
import UploadZone from "../components/UploadZone";

const EXAMPLE_MISSIONS = [
  {
    icon: "🌊",
    title: "Investigate flood damage",
    prompt: "Investigate whether flooding has affected agricultural land.",
    category: "Flood Impact",
  },
  {
    icon: "🌾",
    title: "Assess agricultural changes",
    prompt: "Assess crop health and agricultural surface changes between dates.",
    category: "Agriculture",
  },
  {
    icon: "🏙️",
    title: "Analyze urban expansion",
    prompt: "Analyze urban expansion and new construction footprint.",
    category: "Urban",
  },
  {
    icon: "🌲",
    title: "Investigate vegetation loss",
    prompt: "Investigate tree canopy clearance and vegetation loss.",
    category: "Forestry",
  },
  {
    icon: "💧",
    title: "Analyze water-body dynamics",
    prompt: "Analyze surface water expansion and reservoir shoreline variation.",
    category: "Hydrology",
  },
  {
    icon: "🏗️",
    title: "Detect infrastructure development",
    prompt: "Detect new industrial structures and road infrastructure development.",
    category: "Infrastructure",
  },
];

// Sample images preset helpers
const SAMPLE_PRESETS = [
  {
    label: "Flood & Agriculture Pair",
    desc: "Pre-event vs Post-event flood imagery",
    files: ["sample_data/before_after/before.png", "sample_data/before_after/after.png"],
  },
  {
    label: "Optical + SAR Pair",
    desc: "Co-registered multi-modal observations",
    files: ["sample_data/optical_sar/optical.png", "sample_data/optical_sar/sar.png"],
  },
];

function InteractiveSlider({ before, after, overlay }: { before: string; after: string; overlay?: string }) {
  const [pos, setPos] = useState(50);
  const [showOverlay, setShowOverlay] = useState(true);
  const safePos = Math.max(1, pos);

  return (
    <div className="space-y-2">
      <div className="relative w-full aspect-video rounded-md overflow-hidden border border-[#2E2018] select-none bg-[#120D0A]">
        {/* Under layer (After) */}
        <img
          src={showOverlay && overlay ? overlay : after}
          className="absolute inset-0 w-full h-full object-cover"
          alt="Current / Overlay"
        />

        {/* Top layer (Before) clipped */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img
            src={before}
            className="h-full object-cover max-w-none"
            style={{ width: `${(100 / safePos) * 100}%` }}
            alt="Baseline observation"
          />
        </div>

        {/* Slider divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent-primary pointer-events-none shadow-[0_0_8px_rgba(255,219,187,0.5)]"
          style={{ left: `${pos}%` }}
        />

        {/* Range slider input */}
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="absolute inset-x-0 bottom-3 w-[92%] mx-[4%] accent-accent-primary cursor-ew-resize opacity-80 hover:opacity-100 transition-opacity"
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-950/80 text-accent-secondary border border-[#2E2018] backdrop-blur-sm">
            BASELINE (T1)
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-950/80 text-accent-primary border border-accent-primary/30 backdrop-blur-sm">
            {showOverlay && overlay ? "CURRENT + AFFECTED OVERLAY" : "CURRENT (T2)"}
          </span>
        </div>
      </div>

      {overlay && (
        <div className="flex items-center justify-between text-[11px] font-mono px-1">
          <span className="text-[#997E67]">Drag slider to compare baseline with post-event analysis</span>
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`px-2.5 py-1 rounded text-[10px] transition-colors border ${
              showOverlay
                ? "bg-accent-primary/10 border-accent-primary/40 text-accent-primary"
                : "bg-space-900 border-[#2E2018] text-[#997E67] hover:text-accent-secondary"
            }`}
          >
            {showOverlay ? "☑ Affected Parcels Active" : "☐ Show Affected Parcels"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MissionPage() {
  const [searchParams] = useSearchParams();
  const initialMissionId = searchParams.get("id");

  const [objective, setObjective] = useState("");
  const [uploadedImages, setUploadedImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<MissionAffectedRegion | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing mission if ID provided in query
  useEffect(() => {
    if (initialMissionId) {
      loadSavedMission(initialMissionId);
    }
  }, [initialMissionId]);

  const loadSavedMission = async (id: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const m = await api.getMission(id);
      setCurrentMission(m);
      setObjective(m.objective);
      if (m.affected_regions.length > 0) {
        setSelectedRegion(m.affected_regions[0]);
      }
    } catch (err: any) {
      setErrorMessage("Could not load mission: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleStartInvestigation = async () => {
    if (!objective.trim()) {
      setErrorMessage("Please specify an investigation objective.");
      return;
    }
    if (uploadedImages.length === 0) {
      setErrorMessage("Please upload or select baseline and observation imagery.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSelectedRegion(null);

    try {
      const imageIds = uploadedImages.map((img) => img.file_id);
      const mission = await api.runMission({
        objective: objective.trim(),
        image_ids: imageIds,
      });
      setCurrentMission(mission);
      if (mission.affected_regions.length > 0) {
        setSelectedRegion(mission.affected_regions[0]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute investigation mission.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!currentMission) return;
    setDownloadingReport(true);
    try {
      const blob = await api.downloadMissionReport(currentMission.mission_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SatQueryAI_MissionReport_${currentMission.mission_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not generate mission report.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const resetInvestigation = () => {
    setCurrentMission(null);
    setSelectedRegion(null);
    setErrorMessage(null);
  };

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[#2E2018] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-[#F0E4D8] flex items-center gap-2 font-display">
              <span>🛰️</span> Mission Mode — Autonomous AI Investigation
            </h1>
          </div>
          <p className="text-[12px] font-mono text-[#997E67] mt-1">
            Turn an Earth-observation objective into an autonomous remote-sensing investigation.
          </p>
        </div>

        {currentMission && (
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={resetInvestigation}>
              <RotateCcw size={14} /> New Investigation
            </SecondaryButton>
            <SecondaryButton onClick={handleDownloadReport} disabled={downloadingReport}>
              <Download size={14} /> {downloadingReport ? "Generating PDF..." : "Generate Mission Report"}
            </SecondaryButton>
          </div>
        )}
      </div>

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="p-3.5 rounded-md bg-accent-negative/10 border border-accent-negative/30 text-accent-negative text-[12px] font-mono flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      
      {!currentMission && (
        <div className="space-y-6">
          {/* Example Mission Cards Grid */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#997E67] mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent-primary" />
              Example Investigation Scenarios
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {EXAMPLE_MISSIONS.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setObjective(ex.prompt)}
                  className="p-3 rounded-md bg-[#160F0B] border border-[#2E2018] hover:border-accent-primary/40 hover:bg-[#1C1510] text-left transition-all group flex items-start gap-3"
                >
                  <span className="text-xl p-1.5 rounded bg-space-950 border border-[#2E2018] group-hover:scale-105 transition-transform">
                    {ex.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-accent-primary group-hover:text-white transition-colors">
                      {ex.title}
                    </div>
                    <div className="text-[11px] font-mono text-[#997E67] mt-0.5 line-clamp-2">
                      "{ex.prompt}"
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Objective Input Area */}
          <Card>
            <div className="space-y-4">
              <div>
                <PanelTitle>What would you like to investigate?</PanelTitle>
                <p className="text-[12px] font-mono text-[#997E67] mt-0.5">
                  Describe the real-world objective. SatQuery will determine the appropriate satellite-image analyses automatically.
                </p>
              </div>

              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Investigate possible flood damage to agricultural land."
                rows={3}
                className="w-full bg-[#120D0A] border border-[#2E2018] rounded-md px-3.5 py-2.5 text-[13px] font-mono text-[#F0E4D8] placeholder-[#997E67]/60 focus:outline-none focus:border-accent-primary transition-colors"
              />

              {/* Imagery Selection */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#997E67] mb-2 flex items-center justify-between">
                  <span>Input Observations (Baseline &amp; Current Imagery)</span>
                  <span className="text-[10px] text-accent-secondary">
                    {uploadedImages.length} image{uploadedImages.length !== 1 ? "s" : ""} selected
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <UploadZone
                    label="Baseline Image"
                    current={uploadedImages[0] || null}
                    onUploaded={(meta) => {
                      const newArr = [...uploadedImages];
                      if (meta) newArr[0] = meta;
                      else newArr.splice(0, 1);
                      setUploadedImages(newArr);
                    }}
                  />
                  <UploadZone
                    label="Current Image"
                    current={uploadedImages[1] || null}
                    onUploaded={(meta) => {
                      const newArr = [...uploadedImages];
                      if (meta) newArr[1] = meta;
                      else newArr.splice(1, 1);
                      setUploadedImages(newArr);
                    }}
                  />
                </div>
              </div>

              {/* Primary Start CTA */}
              <div className="pt-2 flex items-center justify-between">
                <div className="text-[11px] font-mono text-[#997E67] hidden sm:block">
                  Automated Task Decomposition &bull; Zero Technical Jargon Needed
                </div>
                <button
                  type="button"
                  onClick={handleStartInvestigation}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-md font-mono text-[13px] font-bold tracking-wide uppercase transition-all flex items-center gap-2 bg-accent-primary text-space-950 hover:bg-[#ffe3cb] shadow-glow disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Planning &amp; Investigating...
                    </>
                  ) : (
                    <>
                      <Rocket size={16} /> Start Investigation
                    </>
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      
      {currentMission && (
        <div className="space-y-6 animate-fadeIn">
          {/* Mission Top Metadata Bar */}
          <div className="p-4 rounded-md bg-[#160F0B] border border-[#2E2018] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/30 text-accent-primary font-bold">
                  MISSION #{currentMission.mission_id.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono text-[#997E67]">
                  {currentMission.mission_title}
                </span>
              </div>
              <div className="text-[14px] font-mono text-[#F0E4D8] font-bold">
                "{currentMission.objective}"
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-accent-positive" />
              <span className="text-accent-positive font-bold uppercase">
                {currentMission.status === "completed" ? "Investigation Complete" : currentMission.status}
              </span>
            </div>
          </div>

          {/* Analysis & Multi-Modal Visual Evidence: Divided Display */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 1. Comparison Slider */}
              {currentMission.visual_outputs.baseline && currentMission.visual_outputs.current && (
                <Card>
                  <div className="flex items-center justify-between mb-3 border-b border-[#2E2018] pb-2">
                    <div className="flex items-center gap-1.5">
                      <Layers size={14} className="text-accent-primary" />
                      <PanelTitle>Comparison Slider</PanelTitle>
                    </div>
                    <span className="text-[10px] font-mono text-[#997E67]">
                      Baseline vs Current
                    </span>
                  </div>
                  <InteractiveSlider
                    before={currentMission.visual_outputs.baseline}
                    after={currentMission.visual_outputs.current}
                  />
                  <div className="text-[10px] font-mono text-[#997E67] pt-1 text-center">
                    Drag slider to compare baseline with post-event
                  </div>
                </Card>
              )}

              {/* 2. Change Heatmap */}
              {currentMission.visual_outputs.change_heatmap && (
                <Card>
                  <div className="flex items-center justify-between mb-3 border-b border-[#2E2018] pb-2">
                    <div className="flex items-center gap-1.5">
                      <Activity size={14} className="text-accent-primary" />
                      <PanelTitle>Change Heatmap</PanelTitle>
                    </div>
                    <span className="text-[10px] font-mono text-[#997E67]">
                      Spectral Delta
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <img
                      src={currentMission.visual_outputs.change_heatmap}
                      alt="Change Heatmap"
                      className="w-full aspect-video object-cover rounded border border-[#2E2018] bg-[#120D0A]"
                    />
                    <div className="text-[10px] font-mono text-[#997E67] text-right pt-0.5">
                      Normalized intensity difference (Jet Colormap)
                    </div>
                  </div>
                </Card>
              )}

              {/* 3. Affected Parcels */}
              <Card>
                <div className="flex items-center justify-between mb-3 border-b border-[#2E2018] pb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-accent-primary" />
                    <PanelTitle>Affected Parcels</PanelTitle>
                  </div>
                  <span className="text-[10px] font-mono text-[#997E67]">
                    {currentMission.affected_regions.length} Parcels Mapped
                  </span>
                </div>
                <div className="space-y-1.5">
                  <img
                    src={currentMission.visual_outputs.affected_overlay || currentMission.visual_outputs.current}
                    alt="Affected Parcels Overlay"
                    className="w-full aspect-video object-cover rounded border border-[#2E2018] bg-[#120D0A]"
                  />
                  <div className="text-[10px] font-mono text-[#997E67] text-right pt-0.5">
                    Orange bounding boxes indicate delineated high-impact parcels
                  </div>
                </div>
              </Card>
            </div>

              {/* Highlighted Affected Regions Inspector */}
              {currentMission.affected_regions.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-accent-primary" />
                      <PanelTitle>Delineated Impact Parcels</PanelTitle>
                    </div>
                    <span className="text-[10px] font-mono text-[#997E67]">
                      {currentMission.affected_regions.length} Parcels Mapped
                    </span>
                  </div>

                  {/* Parcel Selection Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {currentMission.affected_regions.map((reg) => (
                      <button
                        key={reg.region_id}
                        onClick={() => setSelectedRegion(reg)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors border ${
                          selectedRegion?.region_id === reg.region_id
                            ? "bg-accent-primary text-space-950 font-bold border-accent-primary shadow-sm"
                            : "bg-[#120D0A] text-[#CCBEB1] border-[#2E2018] hover:border-accent-tertiary"
                        }`}
                      >
                        {reg.region_id} ({reg.area_km2.toFixed(2)} km²)
                      </button>
                    ))}
                  </div>

                  {/* Selected Region Detailed Card */}
                  {selectedRegion && (
                    <div className="p-3 rounded bg-[#120D0A] border border-[#2E2018] space-y-2 text-[11px] font-mono">
                      <div className="flex items-center justify-between border-b border-[#2E2018] pb-1.5">
                        <span className="font-bold text-accent-primary uppercase">
                          {selectedRegion.region_id} Telemetry
                        </span>
                        <span className="text-accent-secondary">
                          {selectedRegion.area_km2.toFixed(2)} km² ({selectedRegion.area_pct.toFixed(1)}% of scene)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <span className="text-[#997E67] block">Detected Change</span>
                          <span className="text-accent-secondary font-medium">{selectedRegion.change_type}</span>
                        </div>
                        <div>
                          <span className="text-[#997E67] block">Land Classification</span>
                          <span className="text-accent-secondary font-medium">{selectedRegion.land_type}</span>
                        </div>
                        <div>
                          <span className="text-[#997E67] block">Temporal Status</span>
                          <span className="text-accent-secondary font-medium">{selectedRegion.temporal_status}</span>
                        </div>
                        <div>
                          <span className="text-[#997E67] block">Evidence Basis</span>
                          <span className="text-accent-secondary font-medium">{selectedRegion.evidence_summary}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>


          
          <div className="space-y-4 pt-2">
            {/* Primary Finding Banner */}
            <div className="p-4 rounded-md bg-[#160F0B] border border-accent-primary/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-accent-primary" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-accent-primary font-bold">
                  Primary Investigation Finding
                </span>
              </div>
              <p className="text-[14px] font-mono text-[#F0E4D8] leading-relaxed">
                "{currentMission.primary_finding}"
              </p>
            </div>

            {/* Quantitative Area Metrics (Row of 4 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">
                  Total Changed Area
                </span>
                <div className="my-1">
                  <span className="text-[22px] font-black font-mono text-[#FFDBBB]">
                    {currentMission.statistics.changed_area_km2.toFixed(2)} km²
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#997E67]">
                  {currentMission.statistics.changed_area_pct.toFixed(1)}% of scene footprint
                </span>
              </div>

              <div className="p-3.5 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">
                  Agricultural Impact
                </span>
                <div className="my-1">
                  <span className="text-[22px] font-black font-mono text-accent-negative">
                    {currentMission.statistics.agricultural_affected_km2.toFixed(2)} km²
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#997E67]">
                  {currentMission.statistics.agricultural_affected_pct.toFixed(1)}% of total scene
                </span>
              </div>

              <div className="p-3.5 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">
                  Water Inundation Expansion
                </span>
                <div className="my-1">
                  <span className="text-[22px] font-black font-mono text-accent-secondary">
                    {currentMission.statistics.water_expansion_km2.toFixed(2)} km²
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#997E67]">
                  Surface moisture delta
                </span>
              </div>

              <div className="p-3.5 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">
                  Total Investigated Area
                </span>
                <div className="my-1">
                  <span className="text-[22px] font-black font-mono text-[#997E67]">
                    {currentMission.statistics.total_scene_area_km2.toFixed(2)} km²
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#997E67]">
                  Sentinel-2 10m spatial frame
                </span>
              </div>
            </div>

            {/* Executive Summary & Key Takeaways Card */}
            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#2E2018] pb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-accent-primary" />
                    <PanelTitle>Executive Investigation Summary</PanelTitle>
                  </div>
                  <span className="text-[10px] font-mono text-[#997E67]">
                    Deterministic Remote Sensing Synthesis
                  </span>
                </div>

                <p className="text-[12px] font-mono text-[#F0E4D8] leading-relaxed bg-[#120D0A] p-3 rounded border border-[#2E2018]">
                  {currentMission.executive_summary}
                </p>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67] block mb-1.5">
                    Key Findings:
                  </span>
                  <ul className="space-y-1">
                    {currentMission.key_findings.map((kf, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] font-mono text-accent-secondary">
                        <Check size={14} className="text-accent-positive shrink-0 mt-0.5" />
                        <span>{kf}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <SecondaryButton onClick={handleDownloadReport} disabled={downloadingReport}>
                    <Download size={14} /> {downloadingReport ? "Generating PDF..." : "Download Full Mission Report (PDF)"}
                  </SecondaryButton>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
