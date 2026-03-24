'use client';

/**
 * CategoryBreakdown — 11카테고리 수평 바 차트
 * 카테고리명 / 원점수(-10~+10) / 가중치% / 기여점수
 * 클릭 시 details 팝오버 표시
 */

import { useState } from 'react';
import type { CategoryScore } from '@/lib/scoring/types';

interface Props {
  categories: CategoryScore[];
}

export default function CategoryBreakdown({ categories }: Props) {
  // 팝오버로 열린 카테고리 ID
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="p-5 rounded-xl border border-white/5"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-widest"
            style={{ color: '#64748b' }}>
          11카테고리 분석
        </h3>
        <span className="text-xs" style={{ color: '#475569' }}>
          클릭하면 세부 내용 표시
        </span>
      </div>

      {/* 카테고리 목록 */}
      <div className="space-y-2.5">
        {categories.map((cat) => {
          // 원점수 절대값 기준 바 너비 계산 (max=10 → 100%)
          const barWidthPct = Math.abs(cat.rawScore) * 10; // 0~100
          // 양수=초록, 음수=빨강, 0=회색
          const barColor = cat.rawScore > 0
            ? '#00ff88'
            : cat.rawScore < 0
              ? '#ef4444'
              : '#6b7280';
          // 기여점수 (소수점 2자리)
          const contrib = (cat.weightedScore * 100).toFixed(1);
          const isOpen = openId === cat.id;

          return (
            <div key={cat.id}>
              {/* 카테고리 행 */}
              <button
                className="w-full text-left rounded-lg px-3 py-2 transition-colors"
                style={{ background: isOpen ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onClick={() => setOpenId(isOpen ? null : cat.id)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  {/* 카테고리 번호 */}
                  <span className="text-xs w-5 text-center tabular-nums"
                        style={{ color: '#475569' }}>
                    {cat.id}
                  </span>

                  {/* 카테고리명 + 바 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate"
                            style={{ color: '#cbd5e1' }}>
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-3 ml-2 shrink-0">
                        {/* 가중치 */}
                        <span className="text-xs tabular-nums"
                              style={{ color: '#475569' }}>
                          {(cat.weight * 100).toFixed(0)}%
                        </span>
                        {/* 원점수 */}
                        <span className="text-xs font-semibold tabular-nums w-8 text-right"
                              style={{ color: barColor }}>
                          {cat.rawScore > 0 ? '+' : ''}{cat.rawScore}
                        </span>
                        {/* 기여점수 */}
                        <span className="text-xs tabular-nums w-10 text-right"
                              style={{ color: '#94a3b8' }}>
                          {cat.weightedScore >= 0 ? '+' : ''}{contrib}
                        </span>
                      </div>
                    </div>

                    {/* 수평 바 */}
                    <div className="relative h-1.5 rounded-full overflow-hidden"
                         style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {/* 중심선 (0점) — 50% 위치 */}
                      <div className="absolute top-0 bottom-0 w-px"
                           style={{ left: '50%', background: 'rgba(255,255,255,0.15)' }} />
                      {/* 점수 바 */}
                      <div
                        className="absolute top-0 bottom-0 rounded-full transition-all duration-500"
                        style={{
                          // 양수: 중심(50%)에서 오른쪽으로 / 음수: 왼쪽으로
                          left:  cat.rawScore >= 0 ? '50%' : `${50 - barWidthPct / 2}%`,
                          width: `${barWidthPct / 2}%`,
                          background: barColor,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  </div>

                  {/* 열기/닫기 화살표 */}
                  <span className="text-xs transition-transform duration-200"
                        style={{
                          color: '#475569',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          display: 'inline-block',
                        }}>
                    ▼
                  </span>
                </div>
              </button>

              {/* 팝오버: 세부 근거 */}
              {isOpen && (
                <div className="mx-3 mb-2 p-3 rounded-lg"
                     style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `2px solid ${barColor}` }}>
                  <div className="text-xs font-semibold mb-1.5"
                       style={{ color: '#94a3b8' }}>
                    근거
                  </div>
                  <ul className="space-y-1">
                    {cat.details.map((d, i) => (
                      <li key={i} className="text-xs" style={{ color: '#64748b' }}>
                        • {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 컬럼 헤더 설명 (하단) */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
        <div className="w-5" />
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs" style={{ color: '#334155' }}>
          <span className="w-8 text-center">가중치</span>
          <span className="w-8 text-right">원점수</span>
          <span className="w-10 text-right">기여</span>
          <span className="w-4" />
        </div>
      </div>
    </div>
  );
}
