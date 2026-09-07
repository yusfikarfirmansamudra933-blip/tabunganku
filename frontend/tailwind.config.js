/** @type {import('tailwindcss').Config} */
function withOpacity(varName) {
  return ({ opacityValue }) =>
    opacityValue !== undefined ? `rgb(var(${varName}) / ${opacityValue})` : `rgb(var(${varName}))`;
}

export default {
  content: ["./index.html", "./src/**/*.{js,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        tertiary: withOpacity("--c-tertiary"),
        "on-secondary-fixed": withOpacity("--c-on-secondary-fixed"),
        "surface-container-highest": withOpacity("--c-surface-container-highest"),
        "on-primary-container": withOpacity("--c-on-primary-container"),
        "on-secondary-container": withOpacity("--c-on-secondary-container"),
        "surface-container": withOpacity("--c-surface-container"),
        "secondary-container": withOpacity("--c-secondary-container"),
        "secondary-fixed": withOpacity("--c-secondary-fixed"),
        outline: withOpacity("--c-outline"),
        "inverse-on-surface": withOpacity("--c-inverse-on-surface"),
        surface: withOpacity("--c-surface"),
        "on-tertiary": withOpacity("--c-on-tertiary"),
        "surface-bright": withOpacity("--c-surface-bright"),
        "on-primary-fixed-variant": withOpacity("--c-on-primary-fixed-variant"),
        background: withOpacity("--c-background"),
        "on-error-container": withOpacity("--c-on-error-container"),
        "on-secondary": withOpacity("--c-on-secondary"),
        secondary: withOpacity("--c-secondary"),
        "on-primary": withOpacity("--c-on-primary"),
        "tertiary-container": withOpacity("--c-tertiary-container"),
        "on-background": withOpacity("--c-on-background"),
        "on-secondary-fixed-variant": withOpacity("--c-on-secondary-fixed-variant"),
        "on-surface": withOpacity("--c-on-surface"),
        "inverse-primary": withOpacity("--c-inverse-primary"),
        "on-tertiary-fixed-variant": withOpacity("--c-on-tertiary-fixed-variant"),
        "tertiary-fixed": withOpacity("--c-tertiary-fixed"),
        error: withOpacity("--c-error"),
        "primary-fixed-dim": withOpacity("--c-primary-fixed-dim"),
        "on-tertiary-container": withOpacity("--c-on-tertiary-container"),
        "tertiary-fixed-dim": withOpacity("--c-tertiary-fixed-dim"),
        "primary-fixed": withOpacity("--c-primary-fixed"),
        "inverse-surface": withOpacity("--c-inverse-surface"),
        "surface-tint": withOpacity("--c-surface-tint"),
        "surface-variant": withOpacity("--c-surface-variant"),
        "surface-dim": withOpacity("--c-surface-dim"),
        "secondary-fixed-dim": withOpacity("--c-secondary-fixed-dim"),
        "primary-container": withOpacity("--c-primary-container"),
        "on-error": withOpacity("--c-on-error"),
        "on-surface-variant": withOpacity("--c-on-surface-variant"),
        "outline-variant": withOpacity("--c-outline-variant"),
        "surface-container-low": withOpacity("--c-surface-container-low"),
        "surface-container-high": withOpacity("--c-surface-container-high"),
        "error-container": withOpacity("--c-error-container"),
        "surface-container-lowest": withOpacity("--c-surface-container-lowest"),
        "on-primary-fixed": withOpacity("--c-on-primary-fixed"),
        primary: withOpacity("--c-primary")
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: {
        "gutter-tablet": "1.5rem", "space-xl": "1.5rem", "space-lg": "1.25rem", "space-2xl": "2rem",
        "gutter-mobile": "1rem", "margin-mobile": "1.25rem", "space-sm": "0.75rem", "space-md": "1rem",
        "space-2xs": "0.25rem", "margin-tablet": "2rem", "space-xs": "0.5rem", "space-3xl": "2.5rem"
      },
      fontFamily: {
        "display-lg-mobile": ["Plus Jakarta Sans"], "headline-lg": ["Plus Jakarta Sans"], "headline-md": ["Plus Jakarta Sans"],
        "label-sm": ["Inter"], "body-sm": ["Inter"], "label-md": ["Inter"], "numeric-md": ["Inter"],
        "numeric-hero": ["Plus Jakarta Sans"], "headline-sm": ["Plus Jakarta Sans"], "label-lg": ["Inter"],
        "body-lg": ["Inter"], "body-md": ["Inter"], "display-lg": ["Plus Jakarta Sans"]
      },
      fontSize: {
        "display-lg-mobile": ["32px", { lineHeight: "38px", letterSpacing: "-0.025em", fontWeight: "700" }],
        "headline-lg": ["28px", { lineHeight: "34px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-md": ["22px", { lineHeight: "28px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "label-sm": ["10px", { lineHeight: "14px", letterSpacing: "0.05em", fontWeight: "700" }],
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.005em", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" }],
        "numeric-md": ["18px", { lineHeight: "24px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "numeric-hero": ["36px", { lineHeight: "44px", letterSpacing: "-0.03em", fontWeight: "700" }],
        "headline-sm": ["18px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "-0.005em", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0em", fontWeight: "400" }],
        "display-lg": ["40px", { lineHeight: "48px", letterSpacing: "-0.03em", fontWeight: "700" }]
      }
    }
  },
  plugins: []
};
