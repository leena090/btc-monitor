'use client';

/**
 * DetailAccordion — 기존 패널들을 접이식 아코디언으로 감싸는 래퍼
 * 라이트 핀테크 스타일 — 둥근 카드 + 연한 배경
 */

interface AccordionSectionProps {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionSection({ title, subtitle, icon, children, defaultOpen = false }: AccordionSectionProps) {
  return (
    <details className="group card-fintech overflow-hidden" open={defaultOpen}>
      <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none list-none hover:bg-gray-50/50 transition-colors">
        {icon && <span className="text-base flex-shrink-0">{icon}</span>}

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: '#1a1d2e' }}>
            {title}
          </span>
          {subtitle && (
            <span className="text-xs" style={{ color: '#9098b1' }}>
              · {subtitle}
            </span>
          )}
        </div>

        <span className="text-xs transition-transform duration-200 group-open:rotate-180" style={{ color: '#b4bcd0' }}>
          ▼
        </span>
      </summary>

      <div style={{ borderTop: '1px solid #f0f2f5' }}>
        {children}
      </div>
    </details>
  );
}

interface DetailAccordionProps {
  children: React.ReactNode;
}

export default function DetailAccordion({ children }: DetailAccordionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold tracking-wider" style={{ color: '#9098b1' }}>
          상세 분석
        </span>
        <span className="text-xs" style={{ color: '#b4bcd0' }}>
          클릭하여 펼치기
        </span>
      </div>
      {children}
    </div>
  );
}

export { AccordionSection };
