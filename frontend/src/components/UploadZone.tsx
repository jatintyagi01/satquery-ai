import { useCallback, useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import type { ImageMetadata } from "../types";
import { api } from "../services/api";

export default function UploadZone({
  label,
  onUploaded,
  current,
}: {
  label: string;
  onUploaded: (meta: ImageMetadata | null) => void;
  current: ImageMetadata | null;
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const meta = await api.uploadImage(file);
      onUploaded(meta);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [onUploaded]);

  return (
    <div className="w-full">
      <div className="text-[14px] font-semibold text-[#F0E4D8] mb-2">{label}</div>
      {current ? (
        <div className="relative rounded-md overflow-hidden border border-white/10 group">
          <img src={current.preview_url} alt={current.filename} className="w-full h-44 object-cover" />
          <button
            onClick={() => onUploaded(null)}
            className="focus-ring absolute top-2 right-2 bg-space-950/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-space-950/85 px-3.5 py-2.5 text-[12px] data">
            <div className="flex justify-between text-[#F0E4D8] font-medium">
              <span className="truncate max-w-[60%]">{current.filename}</span>
              <span>{current.width}×{current.height}px</span>
            </div>
            <div className="flex justify-between text-[#CCBEB1] mt-0.5">
              <span>bands: {current.bands}</span>
              <span>modality: {current.modality_guess}</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`focus-ring cursor-pointer h-44 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors
          ${dragging ? "border-[#FFDBBB] bg-[#FFDBBB]/5" : "border-white/15 hover:border-white/30"}`}
        >
          <input
            ref={inputRef} type="file" className="hidden" accept=".tif,.tiff,.png,.jpg,.jpeg"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {busy ? (
            <span className="text-sm text-[#CCBEB1]">Uploading and extracting metadata…</span>
          ) : (
            <>
              <UploadCloud size={30} className="text-[#FFDBBB]" />
              <span className="text-[14px] font-medium text-[#F0E4D8]">Drag & drop or click to upload</span>
              <span className="text-[12px] text-[#CCBEB1]">GeoTIFF, TIFF, PNG, JPEG</span>
            </>
          )}
        </div>
      )}
      {error && <div className="text-[11px] text-accent-red mt-1">{error}</div>}
    </div>
  );
}
