import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, FastForward, Wand2, Loader2, Clock } from 'lucide-react';

export interface ReviewQueueItem {
  index: number;
  original: string;
  shortened: string;
  neededSpeed: number;
  prevText?: string;
  nextText?: string;
  // Timing info
  subStart?: number;
  subEnd?: number;
  effectiveDuration?: number;
  actualDuration1x?: number;
  prevStart?: number;
  prevEnd?: number;
  nextStart?: number;
  nextEnd?: number;
}

interface ReviewPanelProps {
  items: ReviewQueueItem[];
  onApprove: (index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => void;
  onRewrite?: (index: number, originalText: string, neededSpeed: number) => Promise<string>;
  totalSubs: number;
  maxSpeed: number;
}

/** Chuyển giây sang MM:SS.s */
function fmtTime(s: number | undefined): string {
  if (s === undefined || s === null) return '--:--';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, '0');
  return `${String(m).padStart(2, '0')}:${sec}`;
}

function fmtDur(s: number | undefined): string {
  if (s === undefined || s === null) return '-';
  return `${s.toFixed(2)}s`;
}

export default function ReviewPanel({ items, onApprove, onRewrite, maxSpeed, totalSubs }: ReviewPanelProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-gray-900 border-t border-orange-500/30 shadow-lg shadow-orange-900/20 shrink-0">
      <div className="bg-orange-900/30 border-b border-orange-500/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <h3 className="font-semibold text-orange-100">Khu Vực Kiểm Duyệt ({items.length} câu)</h3>
        </div>
        <span className="text-xs text-orange-200/70">Các câu chờ duyệt không làm gián đoạn tiến trình</span>
      </div>
      
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {items.map((item) => (
          <ReviewItemCard key={item.index} item={item} onApprove={onApprove} onRewrite={onRewrite} maxSpeed={maxSpeed} isLast={item.index >= totalSubs - 1} />
        ))}
      </div>
    </div>
  );
}

function ReviewItemCard({ item, onApprove, onRewrite, maxSpeed, isLast }: { key?: React.Key, item: ReviewQueueItem, onApprove: (index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => void, onRewrite?: (index: number, originalText: string, neededSpeed: number) => Promise<string>, maxSpeed: number, isLast: boolean }) {
  const [text, setText] = useState(item.shortened || item.original);
  const [isRewriting, setIsRewriting] = useState(false);
  const [mergedPrev, setMergedPrev] = useState(false);
  const [mergedNext, setMergedNext] = useState(false);
  
  const handleMergePrev = () => {
    if (!item.prevText) return;
    const t1 = item.prevText.trim();
    let t2 = text.trim();
    const lastChar = t1.slice(-1);
    const hasPunct = [',', '.', '!', '?', ';', ':'].includes(lastChar);
    if (!hasPunct || lastChar === ',') {
      t2 = t2.charAt(0).toLowerCase() + t2.slice(1);
    }
    setText(t1 + (hasPunct ? ' ' : ', ') + t2);
    setMergedPrev(true);
  };

  const handleMergeNext = () => {
    if (!item.nextText) return;
    const t1 = text.trim();
    let t2 = item.nextText.trim();
    const lastChar = t1.slice(-1);
    const hasPunct = [',', '.', '!', '?', ';', ':'].includes(lastChar);
    if (!hasPunct || lastChar === ',') {
      t2 = t2.charAt(0).toLowerCase() + t2.slice(1);
    }
    setText(t1 + (hasPunct ? ' ' : ', ') + t2);
    setMergedNext(true);
  };
  
  const handleRewriteClick = async () => {
    if (!onRewrite) return;
    setIsRewriting(true);
    try {
        const newText = await onRewrite(item.index, item.original, item.neededSpeed);
        setText(newText);
    } catch (e: any) {
        console.error(e);
        alert(e?.message || "Lỗi khi gọi AI rút gọn!");
    }
    setIsRewriting(false);
  };

  const slotDur = item.subEnd !== undefined && item.subStart !== undefined
    ? item.subEnd - item.subStart
    : undefined;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded">Dòng {item.index + 1}</span>
        <span className="text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-1 rounded flex items-center gap-1">
          <FastForward className="w-3 h-3" /> Lố tốc độ ({item.neededSpeed.toFixed(2)}x &gt; {maxSpeed}x)
        </span>
      </div>

      {/* Timing table */}
      <div className="mb-3 bg-gray-900/60 rounded-md p-2 border border-gray-700/50">
        <div className="flex items-center gap-1 mb-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
          <Clock className="w-3 h-3" /> Thời gian
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px]">
          {/* Header row */}
          <div className="text-gray-500 font-medium">Câu</div>
          <div className="text-gray-500 font-medium text-center">Thời điểm</div>
          <div className="text-gray-500 font-medium text-right">Thời lượng</div>

          {/* Prev */}
          {item.prevText && (
            <>
              <div className="text-gray-500 truncate" title={item.prevText}>↑ Trước</div>
              <div className="text-gray-500 font-mono text-center">{fmtTime(item.prevStart)} → {fmtTime(item.prevEnd)}</div>
              <div className="text-gray-500 font-mono text-right">{fmtDur(item.prevEnd !== undefined && item.prevStart !== undefined ? item.prevEnd - item.prevStart : undefined)}</div>
            </>
          )}

          {/* Current */}
          <div className="text-yellow-300 font-semibold">⚡ Câu này</div>
          <div className="text-yellow-300 font-mono text-center">{fmtTime(item.subStart)} → {fmtTime(item.subEnd)}</div>
          <div className="text-yellow-300 font-mono text-right">{fmtDur(slotDur)}</div>

          {/* Next */}
          {item.nextText && (
            <>
              <div className="text-gray-500 truncate" title={item.nextText}>↓ Sau</div>
              <div className="text-gray-500 font-mono text-center">{fmtTime(item.nextStart)} → {fmtTime(item.nextEnd)}</div>
              <div className="text-gray-500 font-mono text-right">{fmtDur(item.nextEnd !== undefined && item.nextStart !== undefined ? item.nextEnd - item.nextStart : undefined)}</div>
            </>
          )}
        </div>

        {/* Audio info row */}
        <div className="mt-2 pt-2 border-t border-gray-700/50 flex gap-4 text-[11px]">
          <span className="text-gray-400">🎙 Audio 1.0x: <span className="text-blue-300 font-mono">{fmtDur(item.actualDuration1x)}</span></span>
          <span className="text-gray-400">📐 Slot hiệu dụng: <span className="text-green-300 font-mono">{fmtDur(item.effectiveDuration)}</span></span>
          <span className="text-gray-400">⚡ Cần: <span className="text-red-300 font-mono">{item.neededSpeed.toFixed(2)}x</span></span>
        </div>
      </div>

      {/* Original text */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Bản gốc (quá dài):</div>
        {item.prevText && <div className="text-xs text-gray-500 italic opacity-50 mb-1">[Trước: {item.prevText}]</div>}
        <div className="text-sm text-gray-300 italic opacity-80 py-1">{item.original}</div>
        {item.nextText && <div className="text-xs text-gray-500 italic opacity-50 mt-1">[Sau: {item.nextText}]</div>}
      </div>
      
      {/* Edit textarea */}
      <div>
        <div className="flex justify-between items-end mb-1">
          <div className="text-xs text-blue-400 flex items-center gap-1">Bản sửa (Chốt cuối):</div>
          <div className="flex gap-2">
            <button onClick={handleMergePrev} disabled={mergedPrev || !item.prevText} className="text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-30 px-2 py-0.5 rounded transition-colors">+ Câu trước</button>
            <button onClick={handleMergeNext} disabled={mergedNext || !item.nextText} className="text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-30 px-2 py-0.5 rounded transition-colors">+ Câu sau</button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-20"
        />
      </div>
      
      {/* Actions */}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          onClick={handleRewriteClick}
          disabled={isRewriting}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-sm font-medium rounded-md transition-colors mr-auto"
        >
          {isRewriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Nhờ AI Rút gọn
        </button>
        <button
          onClick={() => onApprove(item.index, text, { mergePrev: mergedPrev, mergeNext: mergedNext })}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Duyệt & Đưa vào hàng chờ
        </button>
      </div>

    </div>
  );
}
