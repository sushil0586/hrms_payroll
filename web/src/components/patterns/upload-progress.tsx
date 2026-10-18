import type { UploadProgress } from "@/lib/ui/upload-form-data";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadProgressStatus({ progress }: { progress: UploadProgress | null }) {
  if (!progress) return null;
  const percent = progress.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;
  return (
    <div className="upload-progress-status" role="status" aria-live="polite" aria-atomic="true">
      <span>{progress.total ? `${formatBytes(progress.loaded)} of ${formatBytes(progress.total)} uploaded` : `${formatBytes(progress.loaded)} uploaded`}</span>
      {percent !== null ? <progress aria-label="Upload progress" max={100} value={percent}>{percent}%</progress> : null}
    </div>
  );
}
