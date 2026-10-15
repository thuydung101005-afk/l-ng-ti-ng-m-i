export interface SrtSubtitle {
  id: number;
  start: number; // in seconds
  end: number;
  text: string;
}

export function parseSrt(srtText: string): SrtSubtitle[] {
  // Normalize line endings and split by double blank lines
  const blocks = srtText.trim().replace(/\r\n/g, '\n').split(/\n\s*\n/);
  
  return blocks.map((block) => {
    // Split block into lines and remove empty lines
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // A valid SRT block needs at least 3 lines: ID, Timestamp, Text
    if (lines.length < 3) return null;

    const id = parseInt(lines[0], 10);
    const timeLine = lines[1];
    
    if (!timeLine || !timeLine.includes('-->')) return null;

    const times = timeLine.split(/\s*-->\s*/);
    const text = lines.slice(2).join(' ');
    
    function timeToSeconds(t: string) {
      if (!t) return 0;
      const parts = t.split(',');
      const time = parts[0];
      const ms = parts.length > 1 ? parts[1] : '0';
      
      const timeParts = time.split(':');
      if (timeParts.length !== 3) return 0;
      
      const hours = parseInt(timeParts[0], 10) || 0;
      const minutes = parseInt(timeParts[1], 10) || 0;
      const seconds = parseInt(timeParts[2], 10) || 0;
      const milliseconds = parseInt(ms, 10) || 0;
      
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }

    return {
      id,
      start: timeToSeconds(times[0]),
      end: timeToSeconds(times[1]),
      text: text.trim()
    };
  }).filter((sub): sub is SrtSubtitle => sub !== null && sub.text.length > 0 && !isNaN(sub.start));
}

export function generateSrt(subs: SrtSubtitle[]): string {
  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    const pad = (num: number, size: number) => num.toString().padStart(size, '0');

    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
  }

  // Lọc bỏ các sub trống (đã bị merge) trước khi xuất SRT
  const validSubs = subs.filter(sub => sub.text.trim().length > 0 && sub.end > 0);
  return validSubs.map((sub, index) => {
    return `${index + 1}\n${formatTime(sub.start)} --> ${formatTime(sub.end)}\n${sub.text}\n`;
  }).join('\n');
}
