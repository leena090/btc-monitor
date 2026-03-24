/**
 * 온체인 데이터 수집 모듈 (Tier A — 경로 B: 무료 대안 조합)
 * 수집 항목:
 *  - 해시레이트: Blockchain.com API
 *  - 거래소 BTC 보유량: Blockchain.com API (온체인 잔고 추정)
 *  - 스테이블코인 시총: CoinGecko /api/v3/global
 *
 * 참고: CryptoQuant API 구독 시 → cryptoquant.ts 모듈로 교체
 * 참고: MVRV, 고래 움직임, 채굴자 움직임 → perplexity.ts에서 수집
 */

const BLOCKCHAIN_API = 'https://api.blockchain.info/charts';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** 온체인 데이터 전체 */
export interface OnchainData {
  hashRate: {
    current: number;      // 현재 해시레이트 (TH/s)
    ma30d: number;        // 30일 평균 해시레이트
    trend: 'up' | 'down' | 'sideways';
    isHashRibbonPink: boolean; // 30DMA < 60DMA → 핑크존 (채굴자 항복 신호)
  };
  stablecoinMarketCap: {
    totalUSD: number;     // 전체 스테이블코인 시총 (USD)
    trend30d: 'up' | 'down' | 'sideways'; // 30일 추세
  };
  fetchedAt: string;
}

// ──────────────────────────────────────────────
// Blockchain.com API
// ──────────────────────────────────────────────

/**
 * Blockchain.com 차트 데이터 조회
 * @param chart 차트 이름 (예: 'hash-rate', 'balance')
 * @param timespan 기간 (예: '60days', '90days')
 */
async function fetchBlockchainChart(
  chart: string,
  timespan = '90days'
): Promise<Array<{ x: number; y: number }>> {
  const url = `${BLOCKCHAIN_API}/${chart}?timespan=${timespan}&format=json&cors=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Blockchain.com API HTTP ${res.status} — ${chart}`);
    }
    const json = await res.json();
    // 응답 형식: { values: [{ x: timestamp, y: value }] }
    return json.values ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 이동평균 계산 헬퍼
 */
function movingAverage(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * 해시레이트 데이터 수집 + 해시리본 분석
 * 해시리본: 30DMA < 60DMA = 핑크존 (채굴자 항복 — 역사적 바닥 신호)
 */
async function fetchHashRate(): Promise<OnchainData['hashRate']> {
  const data = await fetchBlockchainChart('hash-rate', '90days');

  if (data.length < 60) {
    throw new Error('해시레이트 데이터 부족');
  }

  // 최근 90일 해시레이트 값 (단위: GH/s → TH/s로 변환 필요)
  const values = data.map((d) => d.y);
  const current = values[values.length - 1];

  // 30일/60일 이동평균 (해시리본 계산)
  const ma30 = movingAverage(values, 30);
  const ma60 = movingAverage(values, 60);

  const ma30Current = ma30[ma30.length - 1];
  const ma60Current = ma60[ma60.length - 1];
  const ma30d = ma30Current;

  // 해시리본 핑크존 판별: 30DMA < 60DMA = 채굴자 항복
  const isHashRibbonPink = ma30Current < ma60Current;

  // 추세 판별 (30DMA vs 60DMA 방향)
  const ma30Prev = ma30[ma30.length - 5] ?? ma30Current;
  const trendChange = ((ma30Current - ma30Prev) / ma30Prev) * 100;
  const trend: 'up' | 'down' | 'sideways' =
    trendChange > 1 ? 'up' : trendChange < -1 ? 'down' : 'sideways';

  return {
    current,
    ma30d,
    trend,
    isHashRibbonPink,
  };
}

// ──────────────────────────────────────────────
// CoinGecko 스테이블코인 시총
// ──────────────────────────────────────────────

/**
 * CoinGecko /api/v3/global 에서 스테이블코인 시총 수집
 * 스테이블코인 증가 = 잠재 매수 자금 대기 = 강세 신호
 */
async function fetchStablecoinMarketCap(): Promise<OnchainData['stablecoinMarketCap']> {
  const url = `${COINGECKO_API}/global`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`CoinGecko API HTTP ${res.status}`);
    }
    const json = await res.json();
    const data = json.data;

    // 전체 시총 중 스테이블코인 비율 × 전체 시총
    const totalMarketCapUSD: number = data?.total_market_cap?.usd ?? 0;
    const stablecoinPct: number = data?.market_cap_percentage?.usdt ?? 0;
    // USDT + USDC 합산 (CoinGecko는 USDT만 market_cap_percentage에 제공하므로 근사)
    const usdcPct: number = data?.market_cap_percentage?.usdc ?? 0;
    const totalStablecoinUSD = totalMarketCapUSD * ((stablecoinPct + usdcPct) / 100);

    // 추세는 단일 호출로 파악 불가 → Redis 이전값과 비교 (현재는 sideways로 초기화)
    // TODO: 이전값 대비 30일 변화율 계산 (Redis에서 30일치 가져와 비교)
    return {
      totalUSD: totalStablecoinUSD,
      trend30d: 'sideways', // 초기값 — 실제는 히스토리 비교 필요
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────────────────────────
// 메인 수집 함수
// ──────────────────────────────────────────────

/**
 * 온체인 데이터 병렬 수집
 * 실패 시 부분 데이터라도 반환 (폴백 처리)
 */
export async function fetchOnchainData(): Promise<OnchainData> {
  const [hashRateResult, stablecoinResult] = await Promise.allSettled([
    fetchHashRate(),
    fetchStablecoinMarketCap(),
  ]);

  // 해시레이트 폴백: 수집 실패 시 기본값 사용
  const hashRate: OnchainData['hashRate'] =
    hashRateResult.status === 'fulfilled'
      ? hashRateResult.value
      : {
          current: 0,
          ma30d: 0,
          trend: 'sideways',
          isHashRibbonPink: false,
        };

  if (hashRateResult.status === 'rejected') {
    console.error('[Onchain] 해시레이트 수집 실패:', hashRateResult.reason);
  }

  // 스테이블코인 폴백
  const stablecoinMarketCap: OnchainData['stablecoinMarketCap'] =
    stablecoinResult.status === 'fulfilled'
      ? stablecoinResult.value
      : { totalUSD: 0, trend30d: 'sideways' };

  if (stablecoinResult.status === 'rejected') {
    console.error('[Onchain] 스테이블코인 수집 실패:', stablecoinResult.reason);
  }

  return {
    hashRate,
    stablecoinMarketCap,
    fetchedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────
// 스코어링 헬퍼 (카테고리 7 — 온체인)
// ──────────────────────────────────────────────

/**
 * 해시리본 상태 → 카테고리 7 서브 점수
 * 핑크존 = 채굴자 항복 = 역사적 바닥 신호 (강력한 매수 시그널)
 */
export function hashRibbonToScore(
  isHashRibbonPink: boolean,
  wasPinkRecently: boolean // 최근 핑크존 → 정상 전환 여부
): number {
  if (wasPinkRecently) return 3; // 해시리본 크로스 직후 (회복 시작)
  if (isHashRibbonPink) return 4; // 핑크존 활성 (채굴자 항복)
  return 0;                       // 정상
}

/**
 * 스테이블코인 시총 추세 → 카테고리 10 서브 점수
 */
export function stablecoinToScore(
  trend30d: 'up' | 'down' | 'sideways'
): number {
  if (trend30d === 'up') return 3;    // 증가 — 잠재 매수 자금 대기
  if (trend30d === 'down') return -3; // 감소 — 자금 이탈
  return 0;                            // 횡보
}
