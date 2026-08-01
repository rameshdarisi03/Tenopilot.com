---
name: Sahara Premium Management
colors:
  surface: '#fff8f6'
  surface-dim: '#e4d8d2'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fef1ec'
  surface-container: '#f8ebe6'
  surface-container-high: '#f2e6e0'
  surface-container-highest: '#ede0db'
  on-surface: '#201a17'
  on-surface-variant: '#554339'
  inverse-surface: '#362f2c'
  inverse-on-surface: '#fbeee9'
  outline: '#887368'
  outline-variant: '#dbc1b5'
  surface-tint: '#99460a'
  primary: '#964407'
  on-primary: '#ffffff'
  primary-container: '#b65c21'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb68e'
  secondary: '#725949'
  on-secondary: '#ffffff'
  secondary-container: '#fedcc7'
  on-secondary-container: '#795f4f'
  tertiary: '#636032'
  on-tertiary: '#ffffff'
  tertiary-container: '#b1ad78'
  on-tertiary-container: '#434116'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb68e'
  on-primary-fixed: '#331200'
  on-primary-fixed-variant: '#773300'
  secondary-fixed: '#fedcc7'
  secondary-fixed-dim: '#e1c0ac'
  on-secondary-fixed: '#29180b'
  on-secondary-fixed-variant: '#594233'
  tertiary-fixed: '#eae5ab'
  tertiary-fixed-dim: '#cdc991'
  on-tertiary-fixed: '#1e1c00'
  on-tertiary-fixed-variant: '#4b481d'
  background: '#fff8f6'
  on-background: '#201a17'
  surface-variant: '#ede0db'
  surface-warm: '#f8ede3'
  border-sand: '#d7c2b9'
  critical-red: '#ba1a1a'
  success-emerald: '#059669'
typography:
  display:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  tabular-nums:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin-mobile: 16px
  container-max: 1440px
---

## Brand & Style
The brand personality is **Sophisticated, Earthy, and Authoritative**. It targets high-end property managers who value precision and a "premium" feel. The UI evokes a sense of calm reliability through a "Sahara" inspired palette of warm ochres, sands, and deep clays.

The design style is **Corporate / Modern with a Serif Flair**. It utilizes a structured, Material-inspired layout but elevates the aesthetic using high-contrast editorial typography (Serif headings) and subtle tactile transitions. It avoids the coldness of pure SaaS by using warm neutrals and soft borders rather than harsh grays and sharp corners.

## Colors
The palette is rooted in **Primary Ochre (#c2652a)**, used for brand identity and primary actions. 
- **Surface Strategy:** The system uses a tiered "warm neutral" approach. Backgrounds are nearly white (`#fffbff`), while containers use varying levels of sandy-beige (`#f8ede3` for active states, `#f4e0d4` for variants).
- **Functional Colors:** Error states use a deep "Critical Red," while positive growth and success indicators use a soft "Emerald" rather than a neon green to maintain the earthy aesthetic.
- **Contrast:** High legibility is maintained with a "Deep Charcoal" (`#201a17`) for primary text, ensuring the warm tones don't compromise accessibility.

## Typography
The system uses a **dual-font strategy** to balance character and utility. 
- **Playfair Display (Serif):** Reserved for high-level headings and brand elements to inject a sense of premium tradition and luxury.
- **Manrope (Sans-serif):** Used for all functional UI, body text, and data-heavy labels. It provides a clean, modern contrast to the serif headings.
- **Styling:** Headings use tighter tracking and leading, while labels use expanded tracking (0.08em) and uppercase styling for a sophisticated "architectural" feel.

## Layout & Spacing
The system utilizes a **Fixed Grid with Fluid Containers**. 
- **Structure:** A fixed left navigation (256px/16rem) is paired with a main canvas that has a maximum width of 1440px. 
- **Rhythm:** An 8px base unit drives all dimensions. Section vertical spacing is typically 40px (xl), while card internal padding is 24px (lg).
- **Responsive Behavior:** On mobile, margins reduce to 16px. The sidebar collapses into a bottom navigation or drawer (not shown), and grid-based cards (Action Center) reflow into a single-column vertical stack.

## Elevation & Depth
Depth is created through **Tonal Layering and Border Refinement** rather than heavy shadows.
- **The Flat Stack:** Backgrounds use `#fffbff`, while active navigation and search inputs use `#f8ede3` (Surface Container Low).
- **Subtle Interaction:** Cards (Stat Cards) use a 1px solid border (`#d7c2b9`). On hover, the elevation is boosted using a very soft, tinted shadow: `0 12px 24px -10px rgba(194, 101, 42, 0.1)`. This creates a floating effect that feels light and airy.
- **Glassmorphism:** The TopAppBar uses an 80% opacity white fill with a `backdrop-blur-md` effect to maintain context of the content scrolling beneath it.

## Shapes
The shape language is **Refined and Soft**.
- **Standard Radius:** A base of 8px (0.5rem) is used for buttons and primary navigation items.
- **Container Radius:** Larger components like Stat Cards and Action Center containers use 16px (1rem) to emphasize their role as content buckets.
- **Pills:** Search bars and specific badges (like "Stable" status) use full pill-rounding to differentiate input fields and indicators from clickable structural elements.

## Components
- **Buttons:** Primary buttons are high-contrast (Ochre fill / White text) with center-aligned icons. Secondary buttons (Quick Actions) use a white background with a border and colored icon.
- **Stat Cards:** Feature a colored top-border (2px) to denote status: Error (Red), Primary (Ochre), or Secondary (Brown). They include a "Review" link in all-caps labels.
- **Navigation:** Active states use a "Sahara" background tint (`#f8ede3`) and a 3px right-hand primary border for clear visual anchoring.
- **Inputs:** Search bars use a subtle, no-border approach, relying on a light background tint (`#f9ebe2`) and a full-pill radius.
- **Timeline:** Activity items use a vertical hairline (`#d7c2b9`) and circular icon badges with white borders to "cut through" the line.
- **Chips/Badges:** Small, uppercase labels with background tints for growth metrics (e.g., green tint for +2%).