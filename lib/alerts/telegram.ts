/**
 * Telegram Bot API 알림 발송 모듈
 * chat_id: 8796355243 (대표님)
 * Bot Token: 환경변수 TELEGRAM_BOT_TOKEN
 * 직접 HTTP 호출 — 외부 라이브러리 의존 없음
 */

// ──────────────────────────────────────────────
// 텔레그램 발송 설정
// ──────────────────────────────────────────────

/** 대표님 텔레그램 chat_id */
const CHAT_ID = '8796355243';

/** Telegram Bot API 기본 URL */
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

// ──────────────────────────────────────────────
// 텔레그램 API 응답 타입
// ──────────────────────────────────────────────
interface TelegramApiResponse {
  ok: boolean;
  description?: string;
  result?: unknown;
}

// ──────────────────────────────────────────────
// 메시지 발송 함수
// ──────────────────────────────────────────────

/**
 * 텔레그램 메시지 발송
 * @param text 발송할 메시지 본문 (한국어 + 이모지)
 * @returns 발송 성공 여부
 * @throws 환경변수 미설정 시 에러
 */
export async function sendTelegramAlert(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // 봇 토큰 미설정 시 에러 (조용히 실패하지 않음)
  if (!botToken) {
    console.error('[Telegram] TELEGRAM_BOT_TOKEN 환경변수 미설정');
    return false;
  }

  const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        // HTML 파싱 모드 — 볼드/이탤릭 지원
        parse_mode: 'HTML',
        // 링크 미리보기 비활성화 (메시지 깔끔하게)
        disable_web_page_preview: true,
      }),
    });

    const data = (await response.json()) as TelegramApiResponse;

    if (!data.ok) {
      console.error('[Telegram] 발송 실패:', data.description);
      return false;
    }

    console.log('[Telegram] 알림 발송 성공');
    return true;
  } catch (error) {
    console.error('[Telegram] 네트워크 에러:', error);
    return false;
  }
}

/**
 * 여러 알림을 순차 발송 (레이트 리밋 방지용 딜레이 포함)
 * Telegram Bot API 제한: 동일 chat에 초당 1개 메시지 권장
 * @param messages 발송할 메시지 배열
 * @returns 성공한 발송 건수
 */
export async function sendMultipleAlerts(messages: string[]): Promise<number> {
  let successCount = 0;

  for (let i = 0; i < messages.length; i++) {
    const ok = await sendTelegramAlert(messages[i]);
    if (ok) successCount++;

    // 마지막 메시지가 아니면 1초 딜레이 (Telegram 레이트 리밋 준수)
    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return successCount;
}

/**
 * 텔레그램 봇 연결 테스트 (getMe API 호출)
 * @returns 봇 정보 또는 null
 */
export async function testBotConnection(): Promise<{ username: string } | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  try {
    const url = `${TELEGRAM_API_BASE}${botToken}/getMe`;
    const response = await fetch(url);
    const data = (await response.json()) as TelegramApiResponse;

    if (data.ok && data.result) {
      const bot = data.result as { username: string };
      console.log(`[Telegram] 봇 연결 확인: @${bot.username}`);
      return bot;
    }
    return null;
  } catch {
    return null;
  }
}
