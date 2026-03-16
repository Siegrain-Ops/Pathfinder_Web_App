const PAYPAL_URL =
  'https://www.paypal.com/donate?business=angelo.martinopw%40gmail.com&currency_code=EUR'

export function SupportButton() {
  return (
    <a
      href={PAYPAL_URL}
      target="_blank"
      rel="noreferrer noopener"
      title="Buy me a coffee ☕"
      className="
        flex items-center gap-1.5
        px-3 py-1.5 rounded
        text-stone-400 hover:text-amber-300 hover:bg-stone-800
        text-sm font-medium tracking-wide
        transition-colors duration-150
        select-none whitespace-nowrap
      "
    >
      <span className="text-base leading-none">☕</span>
      <span className="hidden sm:inline">Buy me a coffee</span>
    </a>
  )
}
