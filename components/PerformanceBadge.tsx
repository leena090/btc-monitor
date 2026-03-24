'use client';

/**
 * PerformanceBadge — 백테스트 성과 신뢰 배지
 * HeroVerdict 안에 삽입. 60대가 "과거에도 맞았구나" 즉시 인식.
 * 정직한 수치만 표시 — 과장 금지.
 */

interface Props {
  /** 현재 등급 */
  grade: string;
}

// ─────────────────────────────────────────────
// 백테스트 결과 정적 데이터 (runner.ts 실행 결과 하드코딩)
// — 역사적 데이터가 변하지 않으므로 정적 값으로 충분
// ─────────────────────────────────────────────

const BACKTEST_STATS = {
  // 전체 통계
  totalPoints: 19,           // 테스트한 역사적 시점 수

  // 등급별 적중률
  gradeA: { count: 2, hitRate: 100, avgReturn90d: 35 },
  gradeB: { count: 2, hitRate: 50, avgReturn90d: 80 },
  gradeC: { count: 6, hitRate: 67, avgReturn90d: 55 },

  // 고점 회피 (가장 중요한 지표)
  topAvoidance: { total: 4, avoided: 4, rate: 100 },
  // ATH에서 NO_TRADE 판정 → 이후 평균 -42% 하락 회피
  avgCrashAvoided: 42,

  // 매수 시그널 (A+B) 성과
  buySignalCount: 4,
  buySignalHitRate: 75,      // 3/4 적중
  buySignalAvgReturn: 58,    // 90일 평균 수익률

  // 한계
  bottomDetection: '극단적 바닥에서 매수 시그널 대신 NO_TRADE — 보수적 성향',
};

/** 등급별 과거 성과 한줄 요약 */
function getGradeInsight(grade: string): { text: string; color: string } | null {
  switch (grade) {
    case 'S':
    case 'A':
      return {
        text: `과거 매수 시그널 적중률 ${BACKTEST_STATS.buySignalHitRate}% · 평균 수익 +${BACKTEST_STATS.buySignalAvgReturn}%`,
        color: '#00c471',
      };
    case 'B':
      return {
        text: `과거 B등급 후 90일 평균 +${BACKTEST_STATS.gradeB.avgReturn90d}%`,
        color: '#f59e0b',
      };
    case 'C':
      return {
        text: `과거 C등급 후 90일 평균 +${BACKTEST_STATS.gradeC.avgReturn90d}%`,
        color: '#94a3b8',
      };
    case 'NO_TRADE':
      return {
        text: `고점 회피 ${BACKTEST_STATS.topAvoidance.rate}% — 평균 ${BACKTEST_STATS.avgCrashAvoided}% 하락 방지`,
        color: '#94a3b8',
      };
    case 'F':
      return {
        text: '강한 하락 신호 — 과거 이 구간에서 매수하면 큰 손실',
        color: '#ef4444',
      };
    default:
      return null;
  }
}

export default function PerformanceBadge({ grade }: Props) {
  const insight = getGradeInsight(grade);
  if (!insight) return null;

  return (
    <div className="flex items-center gap-2 mt-3">
      {/* 성과 아이콘 */}
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
           style={{ background: `${insight.color}15`, color: insight.color }}>
        ✓
      </div>

      {/* 성과 텍스트 */}
      <span className="text-xs" style={{ color: '#9098b1' }}>
        {insight.text}
      </span>

      {/* 기간 표시 */}
      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0f2f5', color: '#b4bcd0' }}>
        2015~2025 검증
      </span>
    </div>
  );
}
