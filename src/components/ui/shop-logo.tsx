/**
 * Linden Bakery & Café のロゴ。菩提樹の葉のマークは装飾なので読み上げず、
 * 店名は文字としてそのまま残す（Figma の「Logo / Linden Bakery & Café」と同じ構成）。
 */
export function ShopLogo() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        viewBox="0 0 24 24"
        className="size-5 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 3c-4.5 0-8 3.2-8 7.6 0 4.6 3.6 8.1 8 10.4 4.4-2.3 8-5.8 8-10.4C20 6.2 16.5 3 12 3z"
          className="fill-text-primary"
        />
        <path
          d="M12 7v11M12 11l-3-2M12 14l3-2"
          className="fill-none stroke-surface-default"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </svg>
      <span>
        <span className="font-semibold">Linden</span>{' '}
        <span>Bakery &amp; Café</span>
      </span>
    </span>
  );
}
