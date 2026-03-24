'use client';

/**
 * DataFreshness — 각 데이터 소스별 마지막 업데이트 시각 + 신선도 색상
 * 5분 이내=초록, 30분 이내=노랑, 그 이상=빨강
 */

import type { DataFreshnessItem } from '@/lib/scoring/types';

interface Props {
  sources: DataFreshnessItem[];
}

// 신선도 계산 (마지막 업데이트로부터 경과 시간 기준)
function getFreshnessStatus(isoString: string): {
  color: string;
  label: string;
  elapsed: string;
} {
  const elapsed = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // 경과 시간 표시 텍스트
  let elapsedText: string;
  if (days > 0)       elapsedText = `${days}일 전`;
  else if (hours > 0) elapsedText = `${hours}시간 전`;
  else                elapsedText = `${minutes}분 전`;

  // 신선도 색상
  if (minutes <= 5)  return { color: '#00ff88', label: '최신',  elapsed: elapsedText };
  if (minutes <= 30) return { color: '#f59e0b', label: '보통',  elapsed: elapsedText };
  return             { color: '#ef4444', label: '오래됨', elapsed: elapsedText };
}

export default function DataFreshness({ sources }: Props) {
  return (
    <div className="p-5 rounded-xl border border-white/5"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-widest"
            style={{ color: '#64748b' }}>
          데이터 신선도
        </h3>
        {/* 범례 */}
        <div className="flex items-center gap-3 text-xs" style={{ color: '#475569' }}>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />5분
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />30분
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />초과
          </span>
        </div>
      </div>

      {/* 소스 목록 */}
      <div className="space-y-2">
        {sources.map((src) => {
          const freshness = getFreshnessStatus(src.lastUpdated);
          return (
            <div key={src.source}
                 className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
              {/* 신선도 점 */}
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                   style={{
                     background: freshness.color,
                     boxShadow: freshness.label === '최신' ? `0 0 4px ${freshness.color}` : 'none',
                   }} />

              {/* 소스 + 레이블 */}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium" style={{ color: '#cbd5e1' }}>
                  {src.source}
                </span>
                <span className="text-xs ml-1.5" style={{ color: '#475569' }}>
                  {src.label}
                </span>
              </div>

              {/* 업데이트 주기 */}
              <span className="text-xs" style={{ color: '#334155' }}>
                ({src.updateFreq})
              </span>

              {/* 경과 시간 */}
              <span className="text-xs tabular-nums flex-shrink-0"
                    style={{ color: freshness.color }}>
                {freshness.elapsed}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
