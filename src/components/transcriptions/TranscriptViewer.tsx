import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  formatTimestamp,
  getSpeakerColor,
  type TranscriptionUtterance,
} from '@/types/transcription';

interface Props {
  utterances: TranscriptionUtterance[];
  speakers: string[];
  currentTimeMs: number;
  searchQuery?: string;
  onSeek: (ms: number) => void;
}

export function TranscriptViewer({
  utterances,
  speakers,
  currentTimeMs,
  searchQuery = '',
  onSeek,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Identificar utterance ativa
  const activeIdx = useMemo(() => {
    return utterances.findIndex(
      (u) => currentTimeMs >= u.start && currentTimeMs <= u.end,
    );
  }, [utterances, currentTimeMs]);

  // Auto-scroll suave para utterance ativa
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      // Se fora da viewport, faz scroll
      if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIdx]);

  // Filtrar por search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return utterances.map((u, i) => ({ u, i }));
    const q = searchQuery.toLowerCase();
    return utterances
      .map((u, i) => ({ u, i }))
      .filter(({ u }) => u.text.toLowerCase().includes(q));
  }, [utterances, searchQuery]);

  if (utterances.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Sem segmentos de fala identificados.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
      {filtered.map(({ u, i }) => {
        const isActive = i === activeIdx;
        const color = getSpeakerColor(u.speaker, speakers);
        return (
          <div
            key={i}
            ref={isActive ? activeRef : null}
            className={cn(
              'group rounded-lg p-3 transition-all border',
              isActive
                ? 'bg-primary/5 border-primary/30'
                : 'border-transparent hover:bg-muted/40',
            )}
          >
            <div className="flex items-baseline gap-2 mb-1.5">
              <button
                onClick={() => onSeek(u.start)}
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded text-white shrink-0 hover:opacity-80 transition-opacity"
                style={{ backgroundColor: color }}
              >
                {u.speaker}
              </button>
              <button
                onClick={() => onSeek(u.start)}
                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                {formatTimestamp(u.start)}
              </button>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              <Highlight text={u.text} query={searchQuery} />
            </p>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Nada encontrado para “{searchQuery}”.
        </div>
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim();
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-warning/30 text-foreground rounded px-0.5">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
