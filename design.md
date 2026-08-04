# Structural Design - Design System

A clean, minimalist design system inspired by Vercel, optimized for structural engineering tools and calculators.

## 1. Visual Theme & Atmosphere

The design embodies a clean, engineer-centric aesthetic rooted in minimalism and precision. The visual language prioritizes clarity and efficiency, with a strictly **monochromatic palette** anchored by deep black and pure white, punctuated by neutral grays that signal hierarchy and interactivity.

**Key Characteristics**
- Minimalist, technical aesthetic with strong neutrals
- **Strictly Black & White** - No colored accents (no blue, purple, etc.)
- Precision-aligned components with geometric proportions
- High contrast for accessibility and readability
- Generous whitespace for breathing room and focus
- Subtle layering through shadow and opacity
- Engineer-friendly, no-nonsense visual language

## 2. Color Palette & Roles

### Primary
- **Black** (`#171717`): Primary text, headings, buttons, and foreground elements
- **Pure White** (`#FFFFFF`): Primary background for surfaces, cards, and light contexts
- **Off-Black** (`#000000`): Deep text emphasis, hover states, and stark contrast elements

### Neutral Scale
- **Charcoal** (`#171717`): Primary text, buttons, and high-contrast elements
- **Medium Gray** (`#4D4D4D`): Secondary text, muted content, and placeholders
- **Light Border** (`#EBEBEB`): Dividers, borders, input fields, and subtle separations
- **Soft Background** (`#FAFAFA`): Subtle background tint for sections and containers
- **Off-White** (`#EDEDED`): Secondary background color for alternate sections
- **Disabled State** (`#E8E8E8`): Disabled input and button backgrounds

### Interactive States (Monochromatic)
- **Default**: `#171717` (Black)
- **Hover**: `#000000` (Off-Black) or `rgba(23, 23, 23, 0.9)`
- **Active**: `rgba(23, 23, 23, 0.8)`
- **Focus Ring**: `#171717` with `rgba(23, 23, 23, 0.2)` shadow
- **Disabled**: `#E8E8E8` background, `#4D4D4D` text

### Semantic States (Grayscale)
- **Success**: `#171717` (Black checkmarks/icons)
- **Warning**: `#4D4D4D` (Medium Gray text/icons)
- **Error**: `#171717` (Black text with bold emphasis)

## 3. Typography Rules

### Font Family
**Primary (UI & Body):** Inter (sans-serif fallback: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`)
**Secondary (Code & Math):** JetBrains Mono (monospace fallback: `ui-monospace, SFMono-Regular, 'Cascadia Code', 'Source Code Pro', monospace`)

*Note: Load these fonts via Google Fonts or use system fallbacks.*

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display XL | Inter | 72px | 500 | 83.52px | -0.02em | Hero headlines, max-scale messaging |
| Display L | Inter | 64px | 500 | 64px | -0.02em | Primary page headings, section heroes |
| Display M | Inter | 56px | 500 | 56px | -0.02em | Large feature headlines |
| Display S | Inter | 40px | 500 | 48px | -0.01em | Secondary headline tiers |
| Heading L | Inter | 32px | 500 | 40px | -0.01em | Section headers and card titles |
| Heading M | Inter | 20px | 500 | 36px | 0 | Subsection headings |
| Heading S | Inter | 16px | 500 | 24px | 0 | Tertiary headings and labels |
| Heading XS | Inter | 14px | 500 | 20px | 0 | Small headings, emphasis labels |
| Body Regular | Inter | 16px | 400 | 24px | 0 | Standard body text and descriptions |
| Body Large | Inter | 20px | 400 | 36px | 0 | Large body copy for featured sections |
| Body Small | Inter | 14px | 400 | 20px | 0 | Caption text and helper text |
| Link | Inter | 16px | 400 | 24px | 0 | Hyperlink text with underline on hover |
| Code Mono | JetBrains Mono | 13px | 400 | 20px | 0 | Inline code and code blocks |
| Code Large | JetBrains Mono | 16px | 400 | 24px | 0 | Large code displays and terminals |

### Principles
- Font weights: 400 (regular) for body, 500 (medium) for headings and emphasis
- Line height scales proportionally with size (1.5x for body, 1.25x for headings)
- Inter maintains readability at all sizes with geometric precision
- Monospace is reserved for technical content, commands, code examples, and math blocks
- Text color defaults to **Black** (`#171717`) with secondary options in **Medium Gray** (`#4D4D4D`)
- **No colored text** except for grayscale values

## 4. Component Stylings

### Buttons

**Primary Button (Black)**
- **Background:** `#171717`
- **Text Color:** `#FFFFFF`
- **Padding:** `12px 24px`
- **Font Size:** `14px`
- **Font Weight:** `500`
- **Line Height:** `20px`
- **Border Radius:** `4px`
- **Border:** `1px solid #171717`
- **Box Shadow:** None
- **Hover State:** Background `#000000`, border `#000000`
- **Active State:** Background `rgba(23, 23, 23, 0.8)`
- **Disabled State:** Background `#EBEBEB`, text `#4D4D4D`, border `#EBEBEB`, cursor `not-allowed`

**Secondary Button (White/Outline)**
- **Background:** `#FFFFFF`
- **Text Color:** `#171717`
- **Padding:** `12px 24px`
- **Font Size:** `14px`
- **Font Weight:** `400`
- **Line Height:** `20px`
- **Border Radius:** `4px`
- **Border:** `1px solid #EBEBEB`
- **Box Shadow:** `0 1px 2px rgba(0, 0, 0, 0.05)`
- **Hover State:** Background `#FAFAFA`, border `#D0D0D0`
- **Active State:** Background `#EDEDED`
- **Disabled State:** Background `#FAFAFA`, text `#4D4D4D`, cursor `not-allowed`

**Ghost Button**
- **Background:** Transparent
- **Text Color:** `#171717`
- **Padding:** `12px 24px`
- **Font Size:** `14px`
- **Font Weight:** `400`
- **Line Height:** `20px`
- **Border Radius:** `4px`
- **Border:** `1px solid transparent`
- **Hover State:** Background `rgba(23, 23, 23, 0.05)`, border `#EBEBEB`
- **Active State:** Background `rgba(23, 23, 23, 0.1)`
- **Disabled State:** Text `#4D4D4D`, cursor `not-allowed`

### Cards & Containers

**Card Default**
- **Background:** `#FFFFFF`
- **Border:** `1px solid #EBEBEB`
- **Border Radius:** `6px`
- **Padding:** `24px`
- **Box Shadow:** `0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)`
- **Text Color:** `#171717`

**Card Elevated**
- **Background:** `#FFFFFF`
- **Border:** `1px solid #EBEBEB`
- **Border Radius:** `6px`
- **Padding:** `24px`
- **Box Shadow:** `0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)`
- **Text Color:** `#171717`

**Badge Container**
- **Background:** `#171717` (or `#EBEBEB` for neutral)
- **Text Color:** `#FFFFFF` (or `#171717` for neutral)
- **Padding:** `4px 12px`
- **Font Size:** `12px`
- **Font Weight:** `500`
- **Border Radius:** `999px`
- **Border:** None

### Inputs & Forms

**Text Input**
- **Background:** `#FFFFFF`
- **Text Color:** `#171717`
- **Border:** `1px solid #EBEBEB`
- **Border Radius:** `4px`
- **Padding:** `12px 16px`
- **Font Size:** `14px`
- **Font Weight:** `400`
- **Line Height:** `20px`
- **Placeholder Color:** `#4D4D4D`
- **Focus State:** Border `#171717`, box-shadow `0 0 0 3px rgba(23, 23, 23, 0.1)`
- **Error State:** Border `#171717` (bold), text-color `#171717`
- **Disabled State:** Background `#FAFAFA`, border `#EDEDED`, text `#4D4D4D`, cursor `not-allowed`

**Select / Dropdown**
- **Background:** `#FFFFFF`
- **Text Color:** `#171717`
- **Border:** `1px solid #EBEBEB`
- **Border Radius:** `4px`
- **Padding:** `12px 16px`
- **Font Size:** `14px`
- **Height:** `40px`
- **Focus State:** Border `#171717`

**Checkbox / Radio**
- **Size:** `16px × 16px`
- **Border:** `2px solid #EBEBEB`
- **Border Radius:** `3px` (checkbox), `50%` (radio)
- **Checked Background:** `#171717`
- **Checked Border:** `#171717`
- **Focus:** Box-shadow `0 0 0 3px rgba(23, 23, 23, 0.1)`

### Navigation

**Top Navigation Bar**
- **Background:** `#FFFFFF`
- **Height:** `64px`
- **Padding:** `0 24px`
- **Border Bottom:** `1px solid #EBEBEB`
- **Text Color:** `#171717`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Display:** Flex, items center, justify-content space-between

**Navigation Link (Active)**
- **Text Color:** `#171717`
- **Font Weight:** `500`
- **Border Bottom:** `2px solid #171717`
- **Padding Bottom:** `4px`

**Navigation Link (Hover)**
- **Text Color:** `#000000`
- **Background:** `rgba(23, 23, 23, 0.05)`

**Navigation Link (Default)**
- **Text Color:** `#171717`
- **Hover:** Text `#000000`, background `rgba(23, 23, 23, 0.05)`

**Brand Logo**
- **SVG Icon:** Geometric triangle/badge shape
- **Color:** `#171717`
- **Size:** `20px × 20px`
- **Text:** "Structural Design" in Inter, 16px, weight 500

### Links

**Text Link (Default)**
- **Text Color:** `#171717`
- **Text Decoration:** None
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Line Height:** `24px`
- **Padding:** `4px`
- **Border Radius:** `6px`
- **Hover State:** Background `rgba(23, 23, 23, 0.05)`, text-decoration underline
- **Active State:** Text `#000000`, text-decoration underline
- **Focus:** Box-shadow `0 0 0 2px #FFFFFF, 0 0 0 4px rgba(23, 23, 23, 0.2)`

## 5. Layout Principles

### Spacing System

**Base Unit:** `4px`

**Spacing Scale:**
- **XS:** `4px` — inline spacing, tight padding
- **SM:** `8px` — compact elements, button inner padding
- **MD:** `12px` — form field padding, badge spacing
- **LG:** `16px` — card padding, gap between inline elements
- **XL:** `20px` — section gaps, moderate padding
- **2XL:** `24px` — primary card padding, major spacing
- **3XL:** `32px` — section boundaries, margin spacing
- **4XL:** `40px` — large container padding
- **5XL:** `48px` — section separation
- **6XL:** `72px` — major layout divisions
- **7XL:** `120px` — hero spacing, max whitespace

### Grid & Container

**Max Container Width:** `1400px`
**Padding (sides):** `24px` on tablet, `32px` on desktop
**Column Strategy:** 12-column grid, flexible for responsive adaptation
**Gutter:** `16px` between columns

**Common Breakpoints:**
- **Mobile:** 320px–640px
- **Tablet:** 641px–1024px
- **Desktop:** 1025px–1400px
- **Large Desktop:** 1401px+

### Whitespace Philosophy

Sections are separated by `48px`–`120px` vertical gaps, creating clear visual breathing room. Components internally use consistent `24px` padding. Hero sections utilize maximum whitespace (`72px`–`120px`) to emphasize importance.

### Border Radius Scale

- **Small:** `3px` — Checkboxes, tight geometric elements
- **Medium:** `4px` — Primary buttons, inputs, standard components
- **Medium-Plus:** `6px` — Cards, elevated surfaces, modals
- **Full:** `999px` — Fully rounded pills, badges, circular buttons

### Border Widths

- **Thin:** `1px` — Primary border weight for dividers, card borders, input fields
- **Medium:** `2px` — Focus rings, accent borders, emphasis lines

## 6. Depth & Elevation

| Level | Shadow | Use |
|-------|--------|-----|
| Base | None | Flat sections, text, minimal surfaces |
| Small | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Default cards, containers |
| Medium | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` | Elevated cards, dropdowns |
| Large | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals, popovers |
| Focus | `0 0 0 3px rgba(23,23,23,0.1)` | Focus rings on interactive elements |

### Opacity Levels

- **5%:** Subtle hover backgrounds
- **10%:** Hover state backgrounds
- **20%:** Focus ring shadows
- **50%:** Placeholder text, disabled states
- **80%:** Active state dimming

### Z-index / Layering

| Level | Z-Index | Component |
|-------|---------|-----------|
| Base | 1 | Content sections |
| Sticky | 10 | Navigation bar, sticky headers |
| Dropdown | 20 | Dropdowns, tooltips, popovers |
| Modal | 30 | Modals, dialogs, overlays |
| Toast | 40 | Toast notifications, alerts |

## 7. Logo & Branding

### Logo Structure
The logo consists of a geometric SVG icon followed by the text "Structural Design".

**SVG Icon Specifications:**
- **Shape:** Geometric triangle/badge (abstract structural element)
- **Size:** `20px × 20px`
- **Color:** `#171717` (Black)
- **ViewBox:** `0 0 24 24`
- **Fill:** CurrentColor

**Logo Usage:**
- Always use the complete logo (icon + text) in navigation
- Minimum clear space: `8px` around all sides
- Never stretch or distort the logo
- Use only black (`#171717`) or white (`#FFFFFF`) versions

### Favicon
Use the same geometric SVG icon as the favicon across all pages.

**Implementation:**
```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23171717'><path d='M12 2L2 22h20L12 2zm0 3.5L18.5 20H5.5L12 5.5z'/></svg>">
```

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | ≤640px | Single-column, `16px` padding, stacked navigation |
| Tablet | 641px–1024px | 2-column grid, `24px` padding |
| Desktop | ≥1025px | Multi-column, `32px` padding, full navigation |

### Touch Targets

**Minimum Size:** `44px × 44px` for all interactive elements
**Recommended Size:** `48px × 48px` for mobile priority

### Collapsing Strategy

**Navigation:**
- Desktop: Horizontal menu bar
- Mobile: Hamburger menu or stacked links

**Grid/Layout:**
- Desktop: Multi-column (3–4 columns)
- Tablet: 2-column
- Mobile: 1-column stacked layout

**Spacing:**
- Desktop: `72px`–`120px` section gaps
- Tablet: `48px`–`72px` section gaps
- Mobile: `32px`–`48px` section gaps

**Typography:**
- Desktop: Display sizes `56px`–`72px`
- Mobile: Display sizes `28px`–`32px`, body `16px`

## 9. Do's and Don'ts

### Do

- ✅ Use **only black, white, and gray** colors throughout the entire site
- ✅ Use **Inter** for all UI text and **JetBrains Mono** for code/math
- ✅ Maintain consistent spacing from the scale (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `72px`, `120px`)
- ✅ Use the **Structural Design logo** (geometric triangle) consistently across all pages
- ✅ Apply generous whitespace between sections (`48px`–`120px`)
- ✅ Implement border radius of `4px` for buttons/inputs, `6px` for cards, `999px` for badges
- ✅ Build accessibility with proper ARIA labels and sufficient contrast (WCAG AA)
- ✅ Use the defined shadow scale for elevation
- ✅ Left-align body text for readability
- ✅ Test responsiveness across all breakpoints

### Don't

- ❌ **Never use colored accents** (no blue, purple, pink, green, orange, etc.)
- ❌ Don't mix typefaces (Inter for UI, JetBrains Mono for code only)
- ❌ Don't use button padding other than `12px` vertical/horizontal
- ❌ Don't add shadows beyond the defined elevation scale
- ❌ Avoid border radius extremes (stick to `4px`, `6px`, or `999px`)
- ❌ Don't rely on color alone for status indication
- ❌ Don't use opacity for interactive states unless specified
- ❌ Avoid narrow line heights below `1.4` for body text
- ❌ Don't crowd sections with less than `24px` padding
- ❌ Don't justify-align body text
- ❌ Never use the Vercel logo or any third-party branding

## 10. Implementation Checklist

For each new page or component:

- [ ] Use Inter font for all UI text
- [ ] Use JetBrains Mono for code blocks and math
- [ ] Apply black (`#171717`) for primary text and buttons
- [ ] Apply white (`#FFFFFF`) for backgrounds
- [ ] Use gray scale (`#EBEBEB`, `#4D4D4D`, etc.) for borders and secondary text
- [ ] Include the Structural Design logo in navigation
- [ ] Add favicon with geometric triangle icon
- [ ] Follow spacing scale for all margins/padding
- [ ] Apply correct border radius per component type
- [ ] Use defined shadow scale for elevation
- [ ] Ensure touch targets are minimum `44px`
- [ ] Test on mobile, tablet, and desktop breakpoints
- [ ] Verify all interactive elements have focus states
- [ ] Confirm no colored elements exist (strictly monochrome)
