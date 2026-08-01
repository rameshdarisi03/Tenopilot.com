---
name: Sahara Refined
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
  secondary-container: '#fbd9c4'
  on-secondary-container: '#775d4d'
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
  on-secondary-fixed: '#29170b'
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
  success-emerald: '#059669'
  critical-red: '#ba1a1a'
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
Sahara Refined is a high-end property management aesthetic that blends "Desert Modern" warmth with corporate precision. The brand targets luxury real estate managers who value sophistication and calm over technical complexity.

The visual style is **Corporate Modern with Tactile Warmth**. It avoids the sterility of typical SaaS platforms by using an earthy, organic color palette, serif typography for storytelling, and subtle "bento-box" containers. The UI should evoke a sense of quiet authority, reliability, and premium service. Interactivity is characterized by soft glows rather than harsh state changes.

## Colors
The palette is rooted in burnt siennas, muted sands, and deep charcoals. 

- **Primary Architecture**: The core brand color is a rich terracotta (#964407), used for calls-to-action and active navigation states.
- **Surface Strategy**: We use a multi-tiered neutral system. `surface` (#fff8f6) acts as the base, while `surface-warm` (#f8ede3) provides a soft, paper-like background for input fields to reduce eye strain.
- **Functional Accents**: Secondary and tertiary tones are desaturated olives and browns, ensuring that decorative elements don't compete with primary actions.
- **Status**: Error states utilize a "Critical Red" (#ba1a1a) which is calibrated to remain legible against warm backgrounds.

## Typography
The system employs a high-contrast typographic pairing:

1.  **Playfair Display (Serif)**: Reserved for high-level headings, brand marks, and hero statements. It communicates luxury and tradition. Use `italic` variants sparingly for emphasis in sub-headers.
2.  **Manrope (Sans-Serif)**: Used for all functional UI text, body copy, and data. It provides the necessary modern clarity and legibility for management tasks.

**Key Rules**:
- Labels should always be uppercase with increased letter-spacing (`0.08em`) to act as clear section anchors.
- Use `tabular-nums` for any pricing, dates, or phone numbers to ensure vertical alignment in lists and forms.
- Mobile scaling reduces `headline-lg` by approximately 25% to maintain readable line-lengths.

## Layout & Spacing
The layout follows a **Fixed-Width Content Canvas** on a fluid background.

- **Shell Architecture**: A fixed 256px (`w-64`) sidebar on the left and a sticky 64px (`h-16`) header.
- **Main Canvas**: Content is centered within a `max-w-1440px` container. For focused tasks (like onboarding), use a narrower `max-w-4xl` (approx 896px) column to minimize eye travel.
- **Spacing Rhythm**: Based on a 4px baseline. Standard page padding is `xl` (40px). Vertical spacing between form groups should be `lg` (24px) to maintain a breathy, high-end feel.
- **Breakpoints**: 
    - Below 768px: Sidebar collapses to a bottom-nav or hamburger menu; margins reduce to 16px.
    - Above 1024px: The "Bento Glow" hover effects are enabled for interactive cards.

## Elevation & Depth
Sahara Refined uses a **Tonal Layering** approach supplemented by **Organic Shadows**.

- **Z-Axis Strategy**:
    - **Level 0 (Background)**: `surface` (#fff8f6).
    - **Level 1 (Cards/Containers)**: `surface-container-lowest` (#ffffff) with a 1px border in `border-sand`.
    - **Level 2 (Active/Floating)**: Use a unique `bento-glow` on hover — a soft, tinted shadow: `0 12px 24px -10px rgba(194, 101, 42, 0.15)`.
- **Navigation**: The top bar uses a `backdrop-blur-md` with 80% opacity to maintain a sense of space while scrolling.
- **Separators**: Use `outline-variant` at 30% opacity for internal card dividers to keep the UI light.

## Shapes
The shape language is sophisticated and noticeably rounded without being "bubbly."

- **Core Elements**: Standard buttons and inputs use a `0.5rem` (8px) radius.
- **Large Containers**: Main content cards and large buttons use `1.5rem` (24px) to emphasize the bento-box container style.
- **Search & Secondary Actions**: Full pills (`rounded-full`) are used for global search bars and secondary "Cancel" or "Chip" buttons to distinguish them from primary task-flow buttons.
- **Inputs**: Form fields should use `rounded-lg` (8px) to provide a structured, trustworthy appearance.

## Components
### Buttons
- **Primary**: Terracotta background, white text, `rounded-full`, with a subtle shadow on hover.
- **Secondary**: Outlined with `outline-variant`, pill-shaped, text in `on-surface-variant`.
- **Action/Add**: `primary-container` (lighter tan/orange) with bold icons.

### Form Fields
- **Inputs**: Use `surface-warm` background and `outline-variant` borders. On focus, transition to a 2px `primary` border with no ring.
- **Labels**: Small, uppercase, bold `label-md` style. Labels should shift color to `primary` when the field is focused.

### Progress Stepper
- A horizontal line in `outline-variant` with active segments in `primary`. Completed/Active steps use a solid `primary` circle with high-contrast white numbers. Inactive steps use `surface-container-high`.

### Navigation Items
- **Sidebar**: Vertical list with 12px padding. Active states use a `surface-container-low` background and a 4px `border-r` solid primary indicator.
- **Icons**: Material Symbols Outlined, weight 400. Active icons should use a `FILL 1` variation.

### Feedback Containers
- Info/Note boxes should use a `border-l-4` accent in `primary` on a `surface-container` background to draw attention without breaking the layout grid.