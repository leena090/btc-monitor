/**
 * Perplexity API 데이터 수집 모듈 (Tier C)
 * 목적: JS 렌더링 필요한 사이트 (CoinGlass, Farside, Deribit) 데이터 추출
 * 서버리스 환경에서 Playwright 불가 → Perplexity sonar 모델로 실시간 웹 검색
 * 캐시 TTL: 30분 (Redis에 저장)
 *
 * 수집 항목:
 *  - CoinGlass: OI 총액/24h변화, 펀딩비 (Binance/Bybit/OKX), 롱/숏 비율
 *  - Farside: BTC ETF 당일 총 순유입 (USD)
 *  - Deribit: 풋/콜 비율
 *  - MVRV 비율 (CryptoQuant 대체)
 *  - 고래 거래소 입금 추이 (대략값)
 *  - 채굴자 유출 상태
 */

const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** Perplexity로 수집한 파생상품 + 옵션 + ETF + 온체인 데이터 */
export interface PerplexityData {
  // CoinGlass: 파생상품 (카테고리 3)
  derivatives: {
    openInterestTotal: number;       // OI 총액 (USD)
    openInterest24hChange: number;   // OI 24h 변화율 (%)
    fundingRateBinance: number;      // 바이낸스 펀딩비 (%)
    fundingRateBybit: number;        // 바이빗 펀딩비 (%)
    fundingRateOkx: number;          // OKX 펀딩비 (%)
    longShortRatioTop: number;       // 탑 트레이더 롱 비율 (%)
  };

  // Deribit: 옵션 (카테고리 4)
  options: {
    putCallRatio: number;            // 풋/콜 비율
    openInterest: number;            // 옵션 OI (USD)
  };

  // Farside: ETF 유출입 (카테고리 5)
  etf: {
    todayTotalFlowUSD: number;       // 당일 ETF 순유입 (USD, 음수=유출)
    weeklyFlowUSD: number;           // 7일 누적 순유입 (USD)
  };

  // 온체인 (카테고리 7): CryptoQuant 무료 대안
  onchain: {
    mvrvRatio: number;               // MVRV 비율
    whaleExchangeInflow: 'high' | 'normal' | 'low'; // 고래 거래소 입금 강도
    minerOutflow: 'spike' | 'normal' | 'low';       // 채굴자 유출 강도
    exchangeReserveTrend: 'decreasing' | 'stable' | 'increasing'; // 거래소 보유량 추세
  };

  rawResponse: string; // 디버깅용 원시 응답
  fetchedAt: string;
}

// ──────────────────────────────────────────────
// Perplexity 쿼리 구성
// ──────────────────────────────────────────────

/**
 * 구조화된 질문 프롬프트 생성
 * JSON 형식 응답을 강제하여 파싱 용이하게
 */
function buildQuery(): string {
  return `Provide current Bitcoin market data in JSON format only. No explanations, just JSON.

{
  "openInterestTotal": <total OI in billions USD from CoinGlass>,
  "openInterest24hChangePct": <24h change percentage>,
  "fundingRateBinance": <current funding rate % from Binance>,
  "fundingRateBybit": <current funding rate %>,
  "fundingRateOkx": <current funding rate %>,
  "longShortRatioTop": <top traders long percentage from CoinGlass>,
  "putCallRatio": <Deribit Bitcoin put/call ratio>,
  "deribitOIBillions": <Deribit BTC options OI in billions>,
  "farsideETFTodayMillions": <Farside today total BTC ETF net flow in millions USD>,
  "farsideETFWeeklyMillions": <7-day cumulative net flow>,
  "mvrvRatio": <Bitcoin MVRV ratio current>,
  "whaleExchangeInflowLevel": <"high" or "normal" or "low" based on CryptoQuant>,
  "minerOutflowLevel": <"spike" or "normal" or "low">,
  "exchangeReserveTrend": <"decreasing" or "stable" or "increasing" based on 30 days>
}`;
}

// ──────────────────────────────────────────────
// 응답 파싱
// ──────────────────────────────────────────────

/**
 * Perplexity 응답에서 JSON 추출 + 안전한 파싱
 * 응답이 마크다운 코드블록에 감싸진 경우 처리
 */
function parsePerplexityResponse(content: string): Record<string, unknown> {
  // 마크다운 코드블록 제거: ```json ... ``` 또는 ``` ... ```
  const cleaned = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // JSON 부분 추출 (중괄호 기준)
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Perplexity 응답에서 JSON을 찾을 수 없음');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * 숫자 파싱 헬퍼 (null/undefined/NaN 방어)
 * @param value 파싱할 값
 * @param fallback 실패 시 기본값
 */
function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
}

/**
 * 파싱된 JSON → PerplexityData 변환
 */
function mapToPerplexityData(
  raw: Record<string, unknown>,
  rawResponse: string
): PerplexityData {
  return {
    derivatives: {
      openInterestTotal: safeNum(raw.openInterestTotal) * 1e9, // billions → USD
      openInterest24hChange: safeNum(raw.openInterest24hChangePct),
      fundingRateBinance: safeNum(raw.fundingRateBinance),
      fundingRateBybit: safeNum(raw.fundingRateBybit),
      fundingRateOkx: safeNum(raw.fundingRateOkx),
      longShortRatioTop: safeNum(raw.longShortRatioTop, 50),
    },
    options: {
      putCallRatio: safeNum(raw.putCallRatio, 1.0),
      openInterest: safeNum(raw.deribitOIBillions) * 1e9,
    },
    etf: {
      todayTotalFlowUSD: safeNum(raw.farsideETFTodayMillions) * 1e6,
      weeklyFlowUSD: safeNum(raw.farsideETFWeeklyMillions) * 1e6,
    },
    onchain: {
      mvrvRatio: safeNum(raw.mvrvRatio, 2.0),
      whaleExchangeInflow: (['high', 'normal', 'low'].includes(
        raw.whaleExchangeInflowLevel as string
      )
        ? raw.whaleExchangeInflowLevel
        : 'normal') as 'high' | 'normal' | 'low',
      minerOutflow: (['spike', 'normal', 'low'].includes(
        raw.minerOutflowLevel as string
      )
        ? raw.minerOutflowLevel
        : 'normal') as 'spike' | 'normal' | 'low',
      exchangeReserveTrend: (['decreasing', 'stable', 'increasing'].includes(
        raw.exchangeReserveTrend as string
      )
        ? raw.exchangeReserveTrend
        : 'stable') as 'decreasing' | 'stable' | 'increasing',
    },
    rawResponse,
    fetchedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────
// 메인 수집 함수
// ──────────────────────────────────────────────

/**
 * Perplexity API로 실시간 BTC 파생상품/옵션/ETF/온체인 데이터 수집
 * 호출 전에 Redis TTL 체크 필수 (30분 캐시) — cron/collect에서 처리
 */
export async function fetchPerplexityData(): Promise<PerplexityData> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY 환경변수 미설정');
  }

  const controller = new AbortController();
  // Perplexity API는 응답이 느릴 수 있음 → 30초 타임아웃
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(PERPLEXITY_API, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar', // 실시간 웹 검색 가능한 모델
        messages: [
          {
            role: 'system',
            content:
              'You are a financial data aggregator. Always respond with valid JSON only. No markdown, no explanations.',
          },
          {
            role: 'user',
            content: buildQuery(),
          },
        ],
        temperature: 0.1,     // 낮은 창의성 (사실 기반 응답)
        max_tokens: 500,      // 짧은 JSON만 필요
        return_citations: false,
        search_recency_filter: 'hour', // 최신 데이터 우선
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Perplexity API HTTP ${res.status}: ${errBody}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? '';

    if (!content) {
      throw new Error('Perplexity API 응답 내용 없음');
    }

    // JSON 파싱 + 데이터 변환
    const raw = parsePerplexityResponse(content);
    return mapToPerplexityData(raw, content);
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────────────────────────
// 스코어링 헬퍼
// ──────────────────────────────────────────────

/**
 * 평균 펀딩비 계산 (3거래소)
 */
export function getAverageFundingRate(data: PerplexityData['derivatives']): number {
  return (
    (data.fundingRateBinance + data.fundingRateBybit + data.fundingRateOkx) / 3
  );
}

/**
 * 펀딩비 → 카테고리 3 서브 점수 (역발상)
 * 극음수 = 과도한 숏 포지션 → 숏 스퀴즈 가능
 */
export function fundingRateToScore(avgFundingRate: number): number {
  if (avgFundingRate < -0.05) return 5;                        // 극단적 음수 → 불 신호
  if (avgFundingRate < -0.01) return 3;                        // 음수
  if (avgFundingRate <= 0.02) return 1;                        // 중립
  if (avgFundingRate <= 0.05) return -1;                       // 양수
  return -4;                                                    // 극단적 양수 → 청산 위험
}

/**
 * MVRV → 카테고리 7 서브 점수
 */
export function mvrvToScore(mvrvRatio: number): number {
  if (mvrvRatio < 1.0) return 5;                               // 미실현 손실 — 역사적 바닥
  if (mvrvRatio < 2.0) return 3;
  if (mvrvRatio < 3.5) return 0;                               // 중립
  if (mvrvRatio < 5.0) return -3;                              // 과열
  return -5;                                                    // 역사적 천장
}
