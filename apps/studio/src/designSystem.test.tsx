import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import visualSystemCss from "./styles.css?raw";
import {
  Alert,
  AppNavigation,
  AppNavigationItem,
  AppShell,
  Button,
  CheckboxField,
  CountBadge,
  DesignSystemShowcase,
  IconButton,
  Input,
  MediaInput,
  PageContent,
  PageFooter,
  PageHeader,
  PageWorkspace,
  PreviewWorkspace,
  Status,
  TemplatePreviewStage,
  TemplateThumbnailStage,
  Toggle,
  WorkspaceSidePanel,
} from "./components/ui";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const shellMarkup = renderToStaticMarkup(
  createElement(AppShell, {
    navigation: createElement(
      AppNavigation,
      null,
      createElement(AppNavigationItem, {
        href: "/templates",
        active: true,
        children: "Templates",
      }),
    ),
    header: createElement("div", null, "Template setup"),
    workspaceMinimum: 768,
    children: createElement("p", null, "Workspace"),
  }),
);

assert(
  shellMarkup.includes("Skip to main content") &&
    shellMarkup.includes('aria-current="page"') &&
    shellMarkup.includes('data-workspace-minimum="768"') &&
    shellMarkup.includes("A larger screen is needed for editing"),
  "AppShell should provide skip navigation, active navigation semantics, and the 768px workspace contract.",
);

const workspaceMarkup = renderToStaticMarkup(
  createElement(
    PageWorkspace,
    null,
    createElement(PageHeader, null, "Workspace header"),
    createElement(PageContent, null, "Scrollable content"),
    createElement(PageFooter, null, "Workspace actions"),
  ),
);
const previewMarkup = renderToStaticMarkup(
  createElement(
    PreviewWorkspace,
    {
      header: "Preview",
      toolbar: "Motion preview",
      children: createElement(TemplatePreviewStage, {
        size: "fill",
        children: "Rendered template",
      }),
    },
  ),
);
const panelMarkup = renderToStaticMarkup(
  createElement(WorkspaceSidePanel, {
    header: "Edit content",
    footer: "Save actions",
    children: "Fields",
  }),
);
const thumbnailMarkup = renderToStaticMarkup(
  createElement(TemplateThumbnailStage, {
    name: "Portrait template",
    src: "/preview.png",
  }),
);

assert(
  workspaceMarkup.includes('data-scroll-owner="page"') &&
    workspaceMarkup.includes("page-workspace__footer") &&
    panelMarkup.includes('data-scroll-owner="panel"') &&
    previewMarkup.includes("preview-workspace__toolbar") &&
    previewMarkup.includes('data-tone="light"') &&
    previewMarkup.includes('data-size="fill"') &&
    thumbnailMarkup.includes('class="template-thumbnail__image"'),
  "Shared workspace, side-panel, preview, and static thumbnail primitives should expose their structural contracts.",
);

assert(
  visualSystemCss.includes("--color-divider: var(--color-border-subtle)") &&
    visualSystemCss.includes("--color-preview-stage-light: var(--color-surface-interactive)") &&
    visualSystemCss.includes("--color-preview-stage-border: var(--color-border-default)") &&
    visualSystemCss.includes("--radius-shell: 1.25rem") &&
    visualSystemCss.includes("--radius-panel: 0.75rem") &&
    visualSystemCss.includes("--radius-card: var(--radius-panel)") &&
    visualSystemCss.includes("--control-height-sm: 2.25rem") &&
    visualSystemCss.includes("--control-height-md: 2.625rem") &&
    visualSystemCss.includes(".ui-subsection-title") &&
    visualSystemCss.includes(".ui-control-group-title") &&
    visualSystemCss.includes("background: var(--color-preview-stage-light)") &&
    visualSystemCss.includes(".ui-input[type=\"number\"]") &&
    visualSystemCss.includes("appearance: textfield") &&
    visualSystemCss.includes(".ui-field__control") &&
    visualSystemCss.includes("font-variant-numeric: tabular-nums") &&
    visualSystemCss.includes('.field-editor-input__counter[data-multiline="true"]') &&
    visualSystemCss.includes("border: 1px solid var(--color-border-subtle)"),
  "The visual system should consolidate neutral outlines, radius roles, typography roles, button sizes, shell boundaries, and light preview presentation.",
);

const controlsMarkup = renderToStaticMarkup(
  createElement(
    "div",
    null,
    createElement(Button, { loading: true, loadingLabel: "Saving" }, "Save"),
    createElement(IconButton, { label: "More actions", icon: "..." }),
    createElement(Input, {
      id: "template-name",
      label: "Template name",
      error: "A name is required.",
    }),
    createElement(CheckboxField, {
      id: "required-media",
      label: "Required media",
      checked: true,
      onChange: () => undefined,
    }),
    createElement(MediaInput, {
      id: "replacement-image",
      label: "Product image",
      actionLabel: "Replace image",
      helpText: "PNG or JPEG.",
      onSelect: () => undefined,
    }),
    createElement(CountBadge, { count: 5, label: "diagnostic issues" }),
    createElement(Toggle, {
      checked: true,
      onChange: () => undefined,
      label: "Play template motion",
    }),
    createElement(Status, {
      tone: "attention",
      children: "Needs attention",
    }),
    createElement(Alert, { tone: "blocked", title: "Package blocked" }),
  ),
);

assert(
  controlsMarkup.includes('aria-busy="true"') &&
    controlsMarkup.includes('aria-label="More actions"') &&
    controlsMarkup.includes('for="template-name"') &&
    controlsMarkup.includes('aria-invalid="true"') &&
    controlsMarkup.includes('role="switch"') &&
    controlsMarkup.includes('aria-checked="true"') &&
    controlsMarkup.includes('for="required-media"') &&
    controlsMarkup.includes('for="replacement-image"') &&
    controlsMarkup.includes('aria-label="5 diagnostic issues"') &&
    controlsMarkup.includes('role="alert"'),
  "Shared controls should expose loading, labels, invalid state, switch state, and alert semantics.",
);

const showcaseMarkup = renderToStaticMarkup(
  createElement(DesignSystemShowcase),
);

assert(
  showcaseMarkup.includes("Template Tool components") &&
    showcaseMarkup.includes("Actions and status") &&
    showcaseMarkup.includes("Fields") &&
    showcaseMarkup.includes("No templates yet"),
  "The non-routed showcase should cover shared action, field, feedback, and empty states.",
);
