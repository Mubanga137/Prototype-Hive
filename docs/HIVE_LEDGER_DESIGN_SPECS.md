# Hive Ledger — UI Design Specifications

## 🎨 Color Palette

```
BACKGROUND:    #FFFBF2 (Ivory - Primary page background)
HEADER:        #0F1A35 (Deep Navy - Headers, high contrast)
PRIMARY:       #B37C1C (Rich Gold - CTAs, accents)
TEXT_DARK:     #0F1A35 (Navy - Body text)
TEXT_LIGHT:    #64748B (Slate Gray - Secondary text)
BORDER:        #E5E7EB (Light Gray - Card borders)
SUCCESS:       #22C55E (Green - Delivered status)
ERROR:         #EF4444 (Red - Cancelled/warning)
OTP_BORDER:    #B37C1C (Gold - Dashed, security emphasis)
```

## 📐 Typography

```
Display Font:    Georgia, serif (used for "ORDER #" headings)
Body Font:       -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
Font Weights:    400 (regular), 500 (medium), 600 (semibold), 700 (bold)

Heading (Order #):       font-bold text-lg (#0F1A35)
Card Label:              text-xs font-semibold (#0F1A35)
Card Price:              text-lg font-bold (#B37C1C)
Status Label:            text-xs text-center mt-3 font-medium (#64748B)
PIN Display:             font-mono text-3xl font-bold tracking-[0.3em]
```

## 🧩 Component Dimensions

```
LEDGER HEADER:
  - Height: 72px (py-4 = 1rem top/bottom)
  - Avatar: 40×40px, rounded-full
  - Padding: px-4 md:px-6 (responsive)

FILTER TOGGLE:
  - Height: auto (py-2 per button)
  - Button padding: px-4 py-2
  - Underline height: h-1 (4px)
  - Border bottom: 1px gray-200

ORDER CARD:
  - Border radius: rounded-2xl (16px)
  - Shadow: shadow-sm hover:shadow-md
  - Margin bottom: mb-6 (24px spacing)
  - Padding: px-6 py-4 (all sections)

PRODUCT THUMBNAIL:
  - Size: 64×64px (w-16 h-16)
  - Border radius: rounded-lg (8px)
  - Object fit: cover (aspect-square)

STATUS STEPPER:
  - Circle diameter: 32px (w-8 h-8)
  - Circle spacing: 16px horizontal (h-1 w-flex-1)
  - Connector line: h-1 rounded-full bg-gray-200

OTP VAULT:
  - Border: 2px dashed #B37C1C
  - Border radius: rounded-lg (8px)
  - Padding: p-6
  - Background: #FFFBF2 (ivory)

BUTTONS:
  - Primary (WhatsApp): border-2 border-[#0F1A35] navy text
  - Secondary (Cancel): border-2 border-red-500 red text (when enabled)
  - Both: rounded-lg, py-3, flex items-center justify-center gap-2
  - Disabled: opacity-50 cursor-not-allowed
```

## 🎬 Animation & Transitions

```
FILTER UNDERLINE:
  - Easing: spring(damping: 15, stiffness: 100)
  - Type: layoutId="filter-underline" (Framer Motion)
  - Duration: ~300ms

ORDER CARD ENTRY:
  - Initial: { opacity: 0, y: 20 }
  - Animate: { opacity: 1, y: 0 }
  - Delay: 0.05s × index
  - Exit: { opacity: 0, y: -20 }

STATUS CIRCLE FILL:
  - Inactive: bg-gray-200
  - Active: bg-#B37C1C
  - Transition: smooth, 0.3s

PIN REVEAL:
  - Blur toggle: blur-lg ↔ blur-0
  - Color change: text-gray-400 ↔ text-#0F1A35
  - Transition: duration-300
```

## 📱 Responsive Breakpoints

```
MOBILE (< 640px):
  - Full-width cards (px-4)
  - Buttons stack vertically (flex-col)
  - Header: avatar + name (left), stats below header
  - Font sizes: reduced by 2-4px

TABLET (640px - 1024px):
  - Cards: max-w-2xl, centered
  - Buttons: side-by-side (flex-row)
  - Header: avatar + name (left), stats inline (right)

DESKTOP (> 1024px):
  - Cards: max-w-4xl or wider
  - Full sidebar navigation visible
  - Hover states on cards (shadow increase)
```

## 🔤 Text Styling Examples

```html
<!-- Ledger Header Avatar -->
<div class="w-10 h-10 rounded-full bg-[#B37C1C] flex items-center justify-center text-white font-bold">
  U
</div>

<!-- Order Number (Bold, Navy) -->
<h3 class="font-bold text-[#0F1A35] text-lg">
  Order #10293
</h3>

<!-- Price (Gold, Bold) -->
<p class="text-lg font-bold text-[#B37C1C]">
  ZMW 2,500.00
</p>

<!-- PIN Display (Monospace, Spaced) -->
<p class="font-mono text-3xl font-bold tracking-[0.3em]">
  4 9 2 1
</p>

<!-- Status Label (Gray, Italic) -->
<p class="text-xs text-gray-600 mt-3 font-medium italic">
  Ready for Hand-off
</p>

<!-- Warning Text (Red, Italic) -->
<p class="text-xs text-red-700 italic font-medium">
  ⚠️ Crucial: Supply this 4-Digit PIN...
</p>
```

## 🎯 Interactive States

```
BUTTON HOVER:
  background: linear fade +5% brightness
  transition: color 150ms ease

BUTTON DISABLED:
  opacity: 0.5
  cursor: not-allowed
  pointer-events: none

CARD HOVER (Desktop):
  box-shadow: shadow-md
  transition: shadow 200ms ease

FILTER TAB ACTIVE:
  color: #0F1A35 (navy)
  underline: animated gold

FILTER TAB INACTIVE:
  color: #64748B (gray-600)
  hover: color: #1F2937 (darker gray)

OTP REVEAL BUTTON:
  Default: border-#B37C1C, text-#B37C1C, bg-white
  Hover: bg-[#B37C1C]/5
  Active: slight background darken
```

## ♿ Accessibility

- All buttons have `aria-label` attributes
- Color is never the only visual indicator (text + icon used together)
- Text contrast ratios meet WCAG AAA (navy on ivory, gold on white)
- Focus states: outline-2 ring-primary/40
- No auto-playing animations
- Keyboard navigation: Tab through buttons works
- Screen reader friendly: semantic HTML (nav, section, main)

## 🌍 Localization

- All text strings in code (no hardcoded emojis except where culturally relevant)
- Date format: ISO 8601 (YYYY-MM-DD) for storage, locale-aware display
- Currency: Always prefix with "ZMW " (Zambian Kwacha)
- Phone format: Support +260, 0, or 9 prefix styles
- Emoji usage: Limited to universally understood symbols (📦, 💬, ⚠️, 👁️, ❌, 🔒)
