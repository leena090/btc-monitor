/**
 * Coinbase 프리미엄 계산 모듈 (Tier A)
 * 목적: 코인베이스 현재가 vs 바이낸스 현재가 차이 → 기관 매수/매도 압력 측정
 * 양수 프리미엄 = 미국 기관 매수 압력 (강세 신호)
 * 음수 프리미엄 = 미국 기관 매도 압력 (약세 신호)
 * API: https://api.coinbase.com/v2/prices/BTC-USD/spot (키 불필요)
 */

const COINBASE_SPOT_URL = 'https://api.coinbase.com/v2/prices/BTC-USD/spot';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** 코인베이스 프리미엄 데이터 */
export interface CoinbasePremiumData {
  coinbasePrice: number;    // 코인베이스 BTC-USD 현재가
  binancePrice: number;     // 바이낸스 BTCUSDT 현재가 (비교용)
  premiumUSD: number;       // 프리미엄 절대값 (USD)
  premiumPct: number;       // 프리미엄 비율 (%)
  direction: 'positive' | 'negative' | 'neutral'; // 프리미엄 방향
  fetchedAt: string;
}

// ──────────────────────────────────────────────
// 메인 수집 함수
// ──────────────────────────────────────────────

/**
 * 코인베이스 프리미엄 계산
 * @param binancePrice 바이낸스 현재가 (이미 수집된 값 재사용)
 */
export async function fetchCoinbasePremium(
  binancePrice?: number
): Promise<CoinbasePremiumData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    // 코인베이스 현재가 조회
    const res = await fetch(COINBASE_SPOT_URL, {
      signal: controller.signal,
      headers: {
        // Coinbase API 버전 헤더 (v2 권장)
        'CB-VERSION': '2023-01-01',
      },
    });

    if (!res.ok) {
      throw new Error(`Coinbase API HTTP ${res.status}`);
    }

    const json = await res.json();
    const coinbasePrice = parseFloat(json.data?.amount);

    if (isNaN(coinbasePrice)) {
      throw new Error('Coinbase API 가격 파싱 실패');
    }

    // 바이낸스 가격이 없으면 코인베이스만 반환 (비교 불가)
    const refPrice = binancePrice ?? coinbasePrice;
    const premiumUSD = coinbasePrice - refPrice;
    const premiumPct = refPrice > 0 ? (premiumUSD / refPrice) * 100 : 0;

    return {
      coinbasePrice,
      binancePrice: refPrice,
      premiumUSD,
      premiumPct,
      direction:
        premiumPct > 0.05
          ? 'positive'
          : premiumPct < -0.05
          ? 'negative'
          : 'neutral',
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────────────────────────
// 스코어링 헬퍼 (카테고리 10 — 자금 흐름)
// ──────────────────────────────────────────────

/**
 * 코인베이스 프리미엄 → 자금 흐름 점수
 * 역할: 미국 기관 매수/매도 압력 측정
 * @param premiumPct 프리미엄 비율 (%)
 * @param isIncreasing 프리미엄이 증가 추세인지 (이전값 비교)
 */
export function coinbasePremiumToScore(
  premiumPct: number,
  isIncreasing: boolean
): number {
  if (premiumPct > 0 && isIncreasing) return 4;  // 양수 + 증가 = 강세 (최대)
  if (premiumPct > 0) return 2;                   // 양수 유지
  if (Math.abs(premiumPct) <= 0.05) return 0;     // 중립
  if (premiumPct < 0 && isIncreasing) return -5;  // 음수 + 증가(더 음수) = 강한 약세
  return -3;                                       // 음수
}
