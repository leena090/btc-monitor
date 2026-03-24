'use client';

/**
 * HeroVerdict — 3초 투자 판단 카드
 * 화면의 주인공. 50대 퇴직금 투자자가 이것만 보고 판단 가능해야 함.
 * 프로 도박사가 "지금이다" 할 때의 확신감을 시각적으로 전달.
 */

import type { SignalResult } from '@/lib/scoring/types';
import { VERDICT_MAP, CONFIDENCE_VERDICT, getSigmaVerdict } from '@/lib/verdict';

interface Props {
  data: Pick<SignalResult, 'finalScore' | 'grade' | 'confidence' | 'sigma' | 'rsiMacroBonus' | 'fibConfluenceBonus' | 'direction'>;
}

export default function HeroVerdict({ data }: Props) {
  const { finalScore, grade, confidence, sigma, rsiMacroBonus, fibConfluenceBonus, direction } = data;
  const verdict = VERDICT_MAP[grade];
  const confInfo = CONFIDENCE_VERDICT[confidence];
  const sigmaInfo = getSigmaVerdict(sigma);

  // 점수 원형 게이지 계산 (반원)
  const radius = 54;
  const circumference = Math.PI * radius;
  const filled = (finalScore / 100) * circumference;
  const empty = circumference - filled;
  const gaugePath = `M ${80 - radius} ${80} A ${radius} ${radius} 0 0 1 ${80 + radius} ${80}`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 ${verdict.pulse ? 'animate-hero-pulse' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${verdict.bgGradient}, #12121a 60%)`,
        borderColor: `${verdict.color}33`,
        // CSS 변수로 글로우 색상 전달 (animation에서 사용)
        '--hero-glow-color': `${verdict.color}25`,
      } as React.CSSProperties}
    >
      {/* 배경 글로우 이펙트 — S/F 등급에서 더 강하게 */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: verdict.color, transform: 'translate(30%, -30%)' }}
      />

      {/* 상단 레이블 */}
      <div className="relative flex items-center justify-between mb-4">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748b' }}>
          투자 판단
        </span>
        {/* 방향 배지 */}
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
          background: `${verdict.color}22`,
          color: verdict.color,
          border: `1px solid ${verdict.color}44`,
        }}>
          {direction === 'LONG' ? 'LONG 매수' : direction === 'SHORT' ? 'SHORT 매도' : direction === 'WAIT' ? '대기' : '매매 금지'}
        </span>
      </div>

      {/* 메인 콘텐츠: 게이지 + 판단 텍스트 */}
      <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
        {/* 왼쪽: 반원 게이지 + 점수 */}
        <div className="relative flex-shrink-0" style={{ width: 160, height: 100 }}>
          <svg viewBox="0 0 160 90" width="160" height="100">
            {/* 배경 트랙 */}
            <path d={gaugePath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round" />
            {/* 점수 호 */}
            <path
              d={gaugePath}
              fill="none"
              stroke={verdict.color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${empty}`}
              style={{
                transition: 'stroke-dasharray 0.8s ease',
                filter: `drop-shadow(0 0 6px ${verdict.color}) drop-shadow(0 0 12px ${verdict.color}50)`,
              }}
            />
          </svg>

          {/* 중앙 점수 */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <div
              className="text-5xl font-black tabular-nums leading-none"
              style={{ color: verdict.color, textShadow: `0 0 24px ${verdict.color}60` }}
            >
              {Math.round(finalScore)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#475569' }}>/100</div>
          </div>
        </div>

        {/* 오른쪽: 판단 텍스트 */}
        <div className="flex-1 text-center sm:text-left">
          {/* 신호등 아이콘 + 메인 헤드라인 */}
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
            <span className="text-4xl">{verdict.icon}</span>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight" style={{
              color: verdict.color,
              textShadow: `0 0 40px ${verdict.color}40`,
            }}>
              {verdict.headline}
            </h2>
          </div>

          {/* 이유 */}
          <p className="text-base mb-4" style={{ color: '#cbd5e1' }}>
            {verdict.reason}
          </p>

          {/* 행동 지침 — 눈에 잘 띄게 */}
          <div className="inline-block px-5 py-2.5 rounded-lg text-sm font-bold" style={{
            background: `${verdict.color}18`,
            color: verdict.color,
            border: `1px solid ${verdict.color}35`,
            boxShadow: `0 0 20px ${verdict.color}10`,
          }}>
            {verdict.action}
          </div>
        </div>
      </div>

      {/* 하단: 확신도 + 시장합의도 + 보너스 */}
      <div className="relative flex flex-wrap items-center gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* 도박사 확신도 */}
        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
          background: `${confInfo.color}15`,
          color: confInfo.color,
        }}>
          {confInfo.gambler}
        </span>

        {/* 시장 합의도 */}
        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
          background: `${sigmaInfo.color}15`,
          color: sigmaInfo.color,
        }}>
          {sigmaInfo.label} (σ {sigma.toFixed(1)})
        </span>

        {/* RSI 보너스 */}
        {rsiMacroBonus > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
            background: 'rgba(255, 215, 0, 0.12)',
            color: '#FFD700',
          }}>
            {rsiMacroBonus === 8 ? '★★' : '★'} RSI 보너스 +{rsiMacroBonus}
          </span>
        )}

        {/* 피보나치 보너스 */}
        {fibConfluenceBonus > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#3b82f6',
          }}>
            Fib 보너스 +{fibConfluenceBonus}
          </span>
        )}
      </div>
    </div>
  );
}
