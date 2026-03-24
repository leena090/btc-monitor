'use client';

/**
 * ScoreGauge — 0~100 원형 게이지 + 등급 + 확신도 + σ 표시
 * Bloomberg Terminal 스타일 다크 테마
 */

import type { SignalResult } from '@/lib/scoring/types';
import { GRADE_COLORS, GRADE_LABELS } from '@/lib/scoring/types';

interface Props {
  data: Pick<SignalResult, 'finalScore' | 'grade' | 'confidence' | 'sigma' | 'rsiMacroBonus' | 'fibConfluenceBonus'>;
}

// 확신도 한국어 레이블 매핑
const CONFIDENCE_LABELS = {
  high:   { text: '확신도: 높음', color: '#00ff88' },
  medium: { text: '확신도: 중간', color: '#f59e0b' },
  low:    { text: '확신도: 낮음', color: '#ef4444' },
};

export default function ScoreGauge({ data }: Props) {
  const { finalScore, grade, confidence, sigma, rsiMacroBonus, fibConfluenceBonus } = data;
  const gradeColor = GRADE_COLORS[grade];
  const confidenceInfo = CONFIDENCE_LABELS[confidence];

  // ─── SVG 원형 게이지 계산 ───
  // 반원(하단) 형태: 180도 호(arc)
  const radius = 70;
  const cx = 100;
  const cy = 100;
  // 전체 호 길이 (반원 기준)
  const circumference = Math.PI * radius; // 반원 둘레
  // 점수에 따라 채워지는 길이 (0~100 → 0~circumference)
  const filled = (finalScore / 100) * circumference;
  const empty = circumference - filled;

  // 반원 호의 시작점/끝점 (왼쪽 180도 ~ 오른쪽 0도)
  // path: M(left) A(arc) (right) 형식
  const gaugePath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div className="flex flex-col items-center p-5 rounded-xl border border-white/5"
         style={{ background: '#12121a' }}>

      {/* 제목 */}
      <div className="text-xs font-semibold tracking-widest mb-4"
           style={{ color: '#64748b' }}>
        종합 시그널 점수
      </div>

      {/* 반원형 게이지 */}
      <div className="relative" style={{ width: 200, height: 110 }}>
        <svg viewBox="0 0 200 110" width="200" height="110">
          {/* 배경 트랙 (회색) */}
          <path
            d={gaugePath}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* 채워진 호 (점수 색상) */}
          <path
            d={gaugePath}
            fill="none"
            stroke={gradeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${empty}`}
            style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 6px ${gradeColor})` }}
          />
        </svg>

        {/* 중앙 점수 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          {/* 최종 점수 */}
          <div className="text-5xl font-bold tabular-nums leading-none"
               style={{ color: gradeColor, textShadow: `0 0 20px ${gradeColor}60` }}>
            {finalScore}
          </div>
          {/* /100 */}
          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>/100</div>
        </div>
      </div>

      {/* 등급 배지 */}
      <div className="mt-3 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide"
           style={{
             background: `${gradeColor}22`,
             color: gradeColor,
             border: `1px solid ${gradeColor}44`,
           }}>
        {GRADE_LABELS[grade]}
      </div>

      {/* 확신도 */}
      <div className="mt-2 text-xs font-medium"
           style={{ color: confidenceInfo.color }}>
        {confidenceInfo.text}
      </div>

      {/* σ 분산도 */}
      <div className="mt-1 text-xs" style={{ color: '#64748b' }}>
        σ = {sigma.toFixed(2)}
        <span className="ml-2 opacity-60">
          {sigma < 2 ? '(수렴)' : sigma > 4 ? '(발산)' : '(보통)'}
        </span>
      </div>

      {/* 보너스 표시 */}
      {(rsiMacroBonus > 0 || fibConfluenceBonus > 0) && (
        <div className="mt-3 flex gap-2">
          {rsiMacroBonus > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#FFD700' }}>
              {rsiMacroBonus === 8 ? '★★' : '★'} RSI 보너스 +{rsiMacroBonus}
            </span>
          )}
          {fibConfluenceBonus > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              Fib +{fibConfluenceBonus}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
