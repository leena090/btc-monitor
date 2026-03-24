'use client';

/**
 * RSIMacroPanel — RSI 3타임프레임 + Cardwell 레짐 + 매크로 보너스 + 히스토리
 */

import type { RsiData } from '@/lib/scoring/types';

interface Props {
  rsi: RsiData;
}

// RSI 값에 따른 색상 반환 (과매도=초록, 과매수=빨강, 중립=회색)
function getRsiColor(value: number): string {
  if (value <= 30) return '#00ff88'; // 과매도 — 매수 신호
  if (value <= 50) return '#f59e0b'; // 약세~중립
  if (value <= 70) return '#3b82f6'; // 강세
  return '#ef4444';                  // 과매수
}

// RSI 게이지 바 너비 (0~100 → 0~100%)
function getRsiBarWidth(value: number): string {
  return `${Math.min(Math.max(value, 0), 100)}%`;
}

// 레짐 배지 스타일
const REGIME_STYLES = {
  bull:    { label: '불장 레짐', color: '#00ff88', bg: 'rgba(0,255,136,0.12)' },
  bear:    { label: '베어 레짐', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  neutral: { label: '중립',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

export default function RSIMacroPanel({ rsi }: Props) {
  const regime = REGIME_STYLES[rsi.regime];

  // RSI 타임프레임별 데이터
  const timeframes = [
    { label: '일봉', value: rsi.daily },
    { label: '주봉', value: rsi.weekly },
    { label: '월봉', value: rsi.monthly },
  ];

  return (
    <div className="p-5 rounded-xl border border-white/5 h-full"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-widest"
            style={{ color: '#64748b' }}>
          RSI 매크로 사이클
        </h3>
        {/* Cardwell 레짐 배지 */}
        <span className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: regime.bg, color: regime.color }}>
          {regime.label}
        </span>
      </div>

      {/* RSI 3타임프레임 */}
      <div className="space-y-3 mb-4">
        {timeframes.map(({ label, value }) => {
          const color = getRsiColor(value);
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
                <span className="text-sm font-bold tabular-nums"
                      style={{ color }}>
                  {value.toFixed(1)}
                </span>
              </div>
              {/* RSI 게이지 바 */}
              <div className="relative h-2 rounded-full overflow-hidden"
                   style={{ background: 'rgba(255,255,255,0.06)' }}>
                {/* 과매도 선 (30) */}
                <div className="absolute top-0 bottom-0 w-px"
                     style={{ left: '30%', background: 'rgba(0,255,136,0.3)' }} />
                {/* 과매수 선 (70) */}
                <div className="absolute top-0 bottom-0 w-px"
                     style={{ left: '70%', background: 'rgba(239,68,68,0.3)' }} />
                {/* RSI 값 바 */}
                <div className="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-700"
                     style={{
                       width: getRsiBarWidth(value),
                       background: `linear-gradient(90deg, transparent, ${color})`,
                       opacity: 0.7,
                     }} />
                {/* 현재 위치 표시 점 */}
                <div className="absolute top-0 bottom-0 w-0.5 rounded-full"
                     style={{
                       left: getRsiBarWidth(value),
                       background: color,
                       boxShadow: `0 0 4px ${color}`,
                     }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* RSI 매크로 보너스 */}
      {rsi.macroBonus > 0 && (
        <div className="mb-4 p-3 rounded-lg"
             style={{ background: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{rsi.macroBonus === 8 ? '★★' : '★'}</span>
            <span className="text-xs font-semibold" style={{ color: '#FFD700' }}>
              RSI 매크로 보너스 +{rsi.macroBonus}점
            </span>
          </div>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            {rsi.macroStatus}
          </p>
        </div>
      )}

      {/* 과거 유사 패턴 — historyCases는 optional이므로 존재할 때만 렌더링 */}
      {rsi.historyCases && rsi.historyCases.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: '#475569' }}>
            과거 유사 패턴
          </div>
          <ul className="space-y-1">
            {rsi.historyCases.map((c, i) => (
              <li key={i} className="text-xs" style={{ color: '#64748b' }}>
                <span className="mr-1" style={{ color: '#334155' }}>{i + 1}.</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
