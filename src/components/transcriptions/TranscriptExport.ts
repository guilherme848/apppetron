import type { Transcription, TranscriptionUtterance } from '@/types/transcription';

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function msToSrtTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const millis = ms % 1000;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(millis, 3)}`;
}

function msToVttTime(ms: number): string {
  return msToSrtTime(ms).replace(',', '.');
}

export function buildSRT(utterances: TranscriptionUtterance[]): string {
  return utterances
    .map((u, i) => {
      return `${i + 1}\n${msToSrtTime(u.start)} --> ${msToSrtTime(u.end)}\n[${u.speaker}] ${u.text}\n`;
    })
    .join('\n');
}

export function buildVTT(utterances: TranscriptionUtterance[]): string {
  const blocks = utterances
    .map((u, i) => {
      return `${i + 1}\n${msToVttTime(u.start)} --> ${msToVttTime(u.end)}\n<v ${u.speaker}>${u.text}</v>\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${blocks}`;
}

export function buildTXT(tx: Transcription): string {
  const header = [
    `Transcrição: ${tx.title}`,
    tx.notes ? `Notas: ${tx.notes}` : null,
    tx.duration_seconds ? `Duração: ${Math.round(tx.duration_seconds)}s` : null,
    `Data: ${new Date(tx.created_at).toLocaleString('pt-BR')}`,
    '',
    '─'.repeat(60),
    '',
  ]
    .filter(Boolean)
    .join('\n');

  let body = '';
  if (tx.utterances && tx.utterances.length > 0) {
    body = tx.utterances
      .map((u) => {
        const time = msToVttTime(u.start).split('.')[0];
        return `[${time}] ${u.speaker}: ${u.text}`;
      })
      .join('\n\n');
  } else if (tx.transcript_text) {
    body = tx.transcript_text;
  }

  let summarySection = '';
  if (tx.summary) {
    summarySection = `\n\n${'─'.repeat(60)}\nRESUMO\n${'─'.repeat(60)}\n\n${tx.summary}`;
  }

  let chaptersSection = '';
  if (tx.chapters && tx.chapters.length > 0) {
    chaptersSection =
      `\n\n${'─'.repeat(60)}\nCAPÍTULOS\n${'─'.repeat(60)}\n\n` +
      tx.chapters
        .map((c) => {
          const time = msToVttTime(c.start).split('.')[0];
          return `[${time}] ${c.headline}\n  ${c.gist}`;
        })
        .join('\n\n');
  }

  return header + body + summarySection + chaptersSection;
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function safeFilename(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}
