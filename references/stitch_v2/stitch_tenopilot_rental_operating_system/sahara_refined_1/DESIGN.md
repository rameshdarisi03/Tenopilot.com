---
name: Sahara Refined
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#554339'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#887368'
  outline-variant: '#dbc1b5'
  surface-tint: '#99460a'
  primary: '#964407'
  on-primary: '#ffffff'
  primary-container: '#b65c21'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb68e'
  secondary: '#49607e'
  on-secondary: '#ffffff'
  secondary-container: '#c4dcff'
  on-secondary-container: '#49617f'
  tertiary: '#006480'
  on-tertiary: '#ffffff'
  tertiary-container: '#007ea1'
  on-tertiary-container: '#fbfdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb68e'
  on-primary-fixed: '#331200'
  on-primary-fixed-variant: '#773300'
  secondary-fixed: '#d2e4ff'
  secondary-fixed-dim: '#b0c8eb'
  on-secondary-fixed: '#001c37'
  on-secondary-fixed-variant: '#314865'
  tertiary-fixed: '#bce9ff'
  tertiary-fixed-dim: '#70d2fa'
  on-tertiary-fixed: '#001f2a'
  on-tertiary-fixed-variant: '#004d63'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
  surface-warm: '#FFF8F6'
  surface-muted: '#F6F9FC'
  accent-blue: '#635BFF'
  border-subtle: rgba(26, 26, 26, 0.08)
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 84px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  button:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  section-gap-desktop: 160px
  section-gap-mobile: 80px
  gutter: 32px
  container-max: 1200px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

This design system is built on the pillars of **Professionalism, Precision, and Warmth**. It adopts a high-end SaaS aesthetic influenced by industry leaders like Apple and Stripe, characterized by extreme clarity and a "less but better" approach.

The visual style is **Sophisticated Minimalism**. It leverages heavy whitespace to establish a luxury hierarchy, ensuring that every element on the page feels intentional and "world-class." By mixing high-contrast editorial typography with a modern, technical functional typeface, the design system bridges the gap between traditional reliability and futuristic efficiency. Subtle depth is achieved through layered tonal surfaces rather than heavy borders, creating a UI that feels light, airy, and premium.

## Colors

The palette is anchored by **Sahara Orange (#C2652A)**, a sophisticated, earth-toned primary that communicates maturity and confidence. This is contrasted against **Deep Charcoal (#1A1A1A)** for maximum legibility and a grounded, professional feel.

The background strategy utilizes **Warm White (#FFF8F6)** as the primary canvas to prevent the "starkness" of pure white, creating a more approachable and premium atmosphere. Secondary surfaces use a cooler **#F6F9FC** to distinguish technical sections or code-like blocks. Use the primary orange sparingly for key Call-to-Action (CTA) elements and success states to maintain its visual impact.

## Typography

This system uses a **dual-typeface strategy** to balance editorial elegance with functional clarity. 

- **Playfair Display** is reserved for large display text and headlines. It provides a "literary" and authoritative feel that distinguishes the brand from generic SaaS competitors.
- **Inter** is the workhorse for all UI elements, body copy, and labels. Its high x-height and neutral character ensure readability even at small sizes.

For large headlines, use negative letter-spacing to create a tighter, more "designed" look. Body text should maintain generous line heights to facilitate effortless scanning on long-form marketing pages.

## Layout & Spacing

The layout philosophy follows a **Fixed Center-Aligned Grid** for desktop and a **Fluid Single-Column** for mobile. 

- **Breathing Room:** Utilize a massive `section-gap-desktop` (160px) between major landing page sections. This "Apple-style" spacing forces focus onto one value proposition at a time.
- **Grid:** A 12-column grid with 32px gutters. Cards should typically span 4 or 6 columns.
- **Padding:** Internal card padding should be generous (min 40px) to maintain the airy aesthetic. Elements within a group should use an 8px base scaling system for vertical rhythm.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**.

1.  **The Base:** The `surface-warm` color is the lowest level.
2.  **The Cards:** Primary content sits on pure `#FFFFFF` cards.
3.  **The Shadow:** Use a "Shadow Eight" style—an extremely diffused, multi-layered shadow with low opacity (e.g., `0px 20px 50px rgba(0,0,0,0.04)`).
4.  **Glassmorphism:** Use for the Global Navigation bar. A background blur of 20px with a 70% opacity white fill and a 1px subtle border creates a sense of place and modern depth as the user scrolls.

## Shapes

The design system uses a **Rounded** (0.5rem base) language to feel modern and accessible without becoming overly "bubbly" or "playful." 

- **Standard Buttons & Inputs:** 0.5rem (8px).
- **Content Cards:** 1rem (16px) for a more distinct structural presence.
- **Feature Icons:** Encased in soft-rounded squircles or 1.5rem containers to maintain consistency with the card language.

## Components

### Buttons
- **Primary:** Sahara Orange background, white text. No border. High-contrast and bold.
- **Secondary:** Deep Charcoal background, white text. Used for secondary CTAs to provide a grounded alternative.
- **Ghost:** Transparent background with a 1px border of `border-subtle`. Used for navigation links.

### Cards
Cards are the primary container for features. They must have a white background, the "Shadow Eight" elevation, and 1rem rounded corners. Avoid borders on cards; let the shadow define the boundary.

### Inputs
Input fields should be clean and minimalist. Use a 1px border of `border-subtle` that transitions to `primary_color_hex` on focus. Background should be pure white.

### Glass Navigation
The top navigation bar should always be "sticky" with a background-blur (20px) and a `surface-warm` tint at 80% opacity. A subtle 1px bottom border in `border-subtle` provides the necessary definition against content passing underneath.

### Chips/Tags
Used for "New" labels or categories. Use a 10% opacity Sahara Orange fill with 100% opacity Sahara Orange text. 2px rounded corners (Soft).