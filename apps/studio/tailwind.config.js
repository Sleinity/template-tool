import { fileURLToPath } from "node:url";

const studioRoot = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    `${studioRoot}/index.html`,
    `${studioRoot}/src/**/*.{ts,tsx}`,
    `${repositoryRoot}/src/**/*.{ts,tsx}`,
    `${repositoryRoot}/packages/template-react/src/**/*.{ts,tsx}`,
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--color-surface-app)",
        navigation: "var(--color-surface-navigation)",
        surface: {
          primary: "var(--color-surface-primary)",
          secondary: "var(--color-surface-secondary)",
          raised: "var(--color-surface-raised)",
          interactive: "var(--color-surface-interactive)",
          hovered: "var(--color-surface-hovered)",
          selected: "var(--color-surface-selected)",
          disabled: "var(--color-surface-disabled)",
        },
        content: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
          link: "var(--color-text-link)",
        },
        line: {
          subtle: "var(--color-border-subtle)",
          DEFAULT: "var(--color-border-default)",
          strong: "var(--color-border-strong)",
          divider: "var(--color-divider)",
          focus: "var(--color-focus-ring)",
        },
        action: {
          primary: "var(--color-action-primary)",
          hover: "var(--color-action-primary-hover)",
          pressed: "var(--color-action-primary-pressed)",
          secondary: "var(--color-action-secondary)",
          destructive: "var(--color-action-destructive)",
        },
      },
      fontFamily: {
        sans: ["var(--font-family-sans)"],
        mono: ["var(--font-family-mono)"],
      },
      borderRadius: {
        md: "var(--radius-control)",
        lg: "var(--radius-panel)",
        xl: "var(--radius-panel)",
        control: "var(--radius-control)",
        card: "var(--radius-panel)",
        workspace: "var(--radius-shell)",
      },
      boxShadow: {
        raised: "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)",
      },
      maxWidth: {
        readable: "var(--content-width-readable)",
        workspace: "var(--content-width-wide)",
      },
    },
  },
  plugins: [],
};
