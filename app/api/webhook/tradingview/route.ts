/**
 * TradingView Essential 웹훅 수신 엔드포인트
 * TradingView에서 Pine Script 알림 → 이 엔드포인트로 POST
 * → 텔레그램 즉시 발송
 *
 * 웹훅 JSON 포맷 (TradingView에서 설정):
 * {"symbol":"BTCUSDT","indicator":"RSI","value":45.2,"timeframe":"W","alert":"rsi_40_50_zone"}
 *
 * 보안: 간단한 secret key 확인 (TRADINGVIEW_WEBHOOK_SECRET 환경변수)
 */

import { sendTelegramAlert } from '@/lib/alerts/telegram';
import { checkAndSetAlertLock } from '@/lib/storage/redis';

// ──────────────────────────────────────────────
// TradingView 웹훅 페이로드 타입
// ──────────────────────────────────────────────
interface TradingViewPayload {
  /** 심볼 (예: BTCUSDT) */
  symbol: string;
  /** 지표 이름 (예: RSI, MACD, MA200) */
  indicator: string;
  /** 지표 값 */
  value: number;
  /** 타임프레임 (D=일봉, W=주봉, M=월봉) */
  timeframe: string;
  /** 알림 유형 식별자 */
  alert: string;
  /** 선택적: 보조 값 (예: MACD signal 값) */
  value2?: number;
  /** 선택적: 인증 시크릿 키 */
  secret?: string;
}

// ──────────────────────────────────────────────
// 알림 유형별 메시지 생성 매핑
// TradingView Pine Script에서 보낸 alert 코드 → 텔레그램 메시지
// ──────────────────────────────────────────────
const ALERT_MESSAGES: Record<string, (p: TradingViewPayload) => string> = {
  // 주봉 RSI 40~50 구간 진입
  rsi_40_50_zone: (p) => [
    `★ [TradingView] RSI 매크로 바닥 시그널`,
    ``,
    `${p.timeframe === 'W' ? '주봉' : '일봉'} RSI: ${p.value.toFixed(1)}`,
    `40~50 구간 진입 감지`,
    `역사적 대세상승 전조 구간`,
  ].join('\n'),

  // 주봉 RSI 50 돌파
  rsi_50_breakout: (p) => [
    `★★ [TradingView] RSI 불장 확정 돌파`,
    ``,
    `${p.timeframe === 'W' ? '주봉' : '일봉'} RSI: ${p.value.toFixed(1)}`,
    `50선 상향 돌파 확인!`,
  ].join('\n'),

  // 월봉 RSI < 40 진입
  rsi_bear_entry: (p) => [
    `⚠️ [TradingView] 베어 레짐 진입`,
    ``,
    `월봉 RSI: ${p.value.toFixed(1)} (< 40)`,
    `주봉 RSI 시그널 무효화 주의`,
  ].join('\n'),

  // 일봉 RSI 30 이하 (단기 과매도)
  rsi_oversold: (p) => [
    `📉 [TradingView] 단기 과매도`,
    ``,
    `일봉 RSI: ${p.value.toFixed(1)} (30 이하)`,
    `단기 반등 가능성 — 주봉/월봉 레짐 확인 필요`,
  ].join('\n'),

  // 가격 MA200 교차
  ma200_cross: (p) => [
    `📊 [TradingView] MA200 ${p.value > (p.value2 ?? 0) ? '상향' : '하향'} 교차`,
    ``,
    `현재가: $${p.value.toLocaleString()}`,
    `MA200: $${(p.value2 ?? 0).toLocaleString()}`,
    `장기 추세 전환 시그널`,
  ].join('\n'),

  // MACD 골든/데드 크로스
  macd_cross: (p) => {
    const isBullish = p.value > (p.value2 ?? 0);
    return [
      `${isBullish ? '🟢' : '🔴'} [TradingView] MACD ${isBullish ? '골든' : '데드'} 크로스`,
      ``,
      `MACD: ${p.value.toFixed(2)}`,
      `Signal: ${(p.value2 ?? 0).toFixed(2)}`,
      `${isBullish ? '상승' : '하락'} 모멘텀 전환`,
    ].join('\n');
  },
};

// ──────────────────────────────────────────────
// POST 핸들러 — TradingView 웹훅 수신
// ──────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    // JSON 파싱
    const payload = (await request.json()) as TradingViewPayload;

    // ── 시크릿 키 검증 (설정된 경우에만) ──
    const expectedSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
    if (expectedSecret && payload.secret !== expectedSecret) {
      console.warn('[Webhook] 인증 실패 — 잘못된 secret key');
      return Response.json(
        { error: '인증 실패' },
        { status: 401 }
      );
    }

    // ── 필수 필드 검증 ──
    if (!payload.alert || !payload.indicator) {
      return Response.json(
        { error: '필수 필드 누락 (alert, indicator)' },
        { status: 400 }
      );
    }

    console.log(
      `[Webhook] TradingView 알림 수신: ${payload.alert} | ${payload.indicator}=${payload.value} (${payload.timeframe})`
    );

    // ── 중복 방지 체크 (같은 알림 1시간 내 재발송 차단) ──
    const today = new Date().toISOString().slice(0, 10);
    const isDuplicate = await checkAndSetAlertLock(
      `tv_${payload.alert}`,
      today,
      3600 // 1시간 쿨다운
    );

    if (isDuplicate) {
      console.log(`[Webhook] 중복 알림 차단: ${payload.alert}`);
      return Response.json({
        status: 'skipped',
        reason: 'duplicate',
        alert: payload.alert,
      });
    }

    // ── 메시지 생성 ──
    const messageBuilder = ALERT_MESSAGES[payload.alert];
    let message: string;

    if (messageBuilder) {
      // 알려진 알림 유형 → 정의된 메시지 포맷 사용
      message = messageBuilder(payload);
    } else {
      // 미정의 알림 유형 → 범용 메시지 생성
      message = [
        `📡 [TradingView] 알림: ${payload.alert}`,
        ``,
        `지표: ${payload.indicator} = ${payload.value}`,
        `타임프레임: ${payload.timeframe}`,
        `심볼: ${payload.symbol}`,
      ].join('\n');
    }

    // ── 텔레그램 즉시 발송 ──
    const sent = await sendTelegramAlert(message);

    return Response.json({
      status: sent ? 'sent' : 'failed',
      alert: payload.alert,
      indicator: payload.indicator,
      value: payload.value,
      timeframe: payload.timeframe,
    });
  } catch (error) {
    console.error('[Webhook] 처리 에러:', error);
    return Response.json(
      { error: '웹훅 처리 실패' },
      { status: 500 }
    );
  }
}
