import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import type { EvidenceVideo } from '../types';
import { formatFileSize, loadVideoUrl } from '../utils/mediaStorage';

interface EvidenceVideoPlayerProps {
  video: EvidenceVideo;
  compact?: boolean;
}

export function EvidenceVideoPlayer({ video, compact = false }: EvidenceVideoPlayerProps) {
  const [srcUrl, setSrcUrl] = useState<string | null>(video.dataUrl ?? null);
  const [loading, setLoading] = useState<boolean>(!video.dataUrl);

  useEffect(() => {
    if (video.dataUrl) {
      setSrcUrl(video.dataUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadVideoUrl(video.id).then((url) => {
      if (!cancelled) {
        setSrcUrl(url);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [video.id, video.dataUrl]);

  return (
    <div className="bg-rose-50/40 border border-rose-200 rounded-xl overflow-hidden">
      {loading ? (
        <div
          className={`flex items-center justify-center bg-slate-100 text-xs text-slate-500 ${
            compact ? 'h-32' : 'h-44'
          }`}
        >
          กำลังโหลดวิดีโอ...
        </div>
      ) : srcUrl ? (
        <video
          src={srcUrl}
          controls
          playsInline
          preload="metadata"
          className={`w-full bg-slate-950 object-contain ${compact ? 'max-h-36' : 'max-h-56'}`}
        />
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-1 bg-slate-100 px-3 text-center ${
            compact ? 'h-32' : 'h-44'
          }`}
        >
          <Film className="w-5 h-5 text-slate-400" aria-hidden="true" />
          <span className="text-xs text-slate-500">ไม่พบไฟล์วิดีโอในเบราว์เซอร์นี้</span>
        </div>
      )}

      <div className="px-2.5 py-1.5 bg-white border-t border-rose-100 flex items-center justify-between gap-2 text-[11px] text-slate-600">
        <span className="truncate font-medium">{video.name}</span>
        <span className="font-mono tabular-nums text-slate-400 shrink-0">
          {formatFileSize(video.sizeBytes)}
        </span>
      </div>
    </div>
  );
}
