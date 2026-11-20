import type { TimelineEvent } from '../types';

interface RequestTimelineProps {
  timeline: TimelineEvent[];
}

export function RequestTimeline({ timeline }: RequestTimelineProps) {
  return (
    <ol className="relative space-y-4">
      {timeline.map((event, idx) => {
        const isLast = idx === timeline.length - 1;
        return (
          <li key={`${event.date}-${idx}`} className="relative pl-6">
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-4 bottom-[-16px] w-px bg-rose-100"
              />
            )}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                isLast
                  ? 'bg-rose-600 border-rose-200'
                  : 'bg-white border-rose-300'
              }`}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className={`text-sm font-medium ${isLast ? 'text-slate-900' : 'text-slate-700'}`}>
                {event.status}
              </span>
              <time className="text-xs font-mono tabular-nums text-slate-500">
                {event.date}
              </time>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              <span>{event.actor}</span>
              {event.note && (
                <>
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                  <span>{event.note}</span>
                </>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
