import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import visualSystemCss from "./styles.css?raw";
import familySetupSource from "./views/TemplateFamilySetupPage.tsx?raw";
import {
  Alert,
  AppNavigation,
  AppNavigationItem,
  AppShell,
  Button,
  CheckboxField,
  CountBadge,
  ConnectedList,
  ConnectedListRow,
  DesignSystemShowcase,
  FilePickerButton,
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
  WayfindingBadge,
  WayfindingMark,
  WorkspaceSidePanel,
} from "./components/ui";
import { FieldRuleCardShell } from "./components/template-package/editor/FieldRuleCardShell";
import { FieldRuleConstraintControls } from "./components/template-package/editor/FieldRuleConstraintControls";

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

const foundationMarkup = renderToStaticMarkup(
  createElement("div", null,
    createElement(ConnectedList, {
      label: "Dense fields",
      children: createElement(ConnectedListRow, {
        title: "Headline",
        description: "All variants",
        meta: "Text",
        selected: true,
      }),
    }),
    createElement(WayfindingMark, {
      number: 1,
      label: "Variants",
      accent: "variants",
    }),
    createElement(WayfindingBadge, {
      value: "A",
      label: "Destination A",
      accent: "fields",
    }),
  ),
);

assert(
  foundationMarkup.includes('role="list"') &&
    foundationMarkup.includes('role="listitem"') &&
    foundationMarkup.includes('data-selected="true"') &&
    foundationMarkup.includes('data-accent="variants"') &&
    foundationMarkup.includes("ui-wayfinding-mark__station") &&
    foundationMarkup.includes(">1</span>") &&
    !foundationMarkup.includes(">01</span>") &&
    foundationMarkup.includes("Variants") &&
    foundationMarkup.includes('aria-label="Destination A"') &&
    foundationMarkup.includes(">A</span>") &&
    foundationMarkup.includes('data-state="inactive"') &&
    !foundationMarkup.includes("<svg"),
  "Wayfinding foundation primitives should retain list semantics and expose labelled number or letter signs without decorative pictograms.",
);

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const light = Math.max(foregroundLuminance, backgroundLuminance);
  const dark = Math.min(foregroundLuminance, backgroundLuminance);
  return (light + 0.05) / (dark + 0.05);
}

const foundationContrastPairs = [
  ["primary text", "#f2efea", "#070908", 4.5],
  ["secondary text", "#b8bab5", "#111311", 4.5],
  ["muted text", "#92958f", "#111311", 4.5],
  ["primary action", "#070908", "#f2efea", 4.5],
  ["variants marker", "#070908", "#b8f000", 4.5],
  ["fonts marker", "#070908", "#ff5a1f", 4.5],
  ["fields marker", "#070908", "#8390d8", 4.5],
  ["field rules marker", "#070908", "#ffd43b", 4.5],
  ["validate marker", "#070908", "#6380ff", 4.5],
  ["review marker", "#070908", "#f052b5", 4.5],
  ["feedback label", "#b8bab5", "#232623", 4.5],
  ["feedback title", "#f2efea", "#232623", 4.5],
  ["destructive action", "#070908", "#ff5a1f", 4.5],
] as const;

for (const [label, foreground, background, minimum] of foundationContrastPairs) {
  assert(
    contrastRatio(foreground, background) >= minimum,
    `${label} should meet the WCAG AA contrast target.`,
  );
}

assert(
  visualSystemCss.includes(".studio-wayfinding-theme") &&
    visualSystemCss.includes("--color-accent-lime: #b8f000") &&
    visualSystemCss.includes("--color-accent-lime-deep: #243000") &&
    visualSystemCss.includes("--color-accent-magenta: #f052b5") &&
    visualSystemCss.includes("--color-accent-magenta-deep: #3a122c") &&
    visualSystemCss.includes("--color-feedback-ready-signal: var(--color-accent-lime)") &&
    visualSystemCss.includes("--color-feedback-surface: var(--color-surface-interactive)") &&
    visualSystemCss.includes("--color-control-on: var(--color-accent-lime)") &&
    visualSystemCss.includes("Semantic aliases remain distinct from route meaning") &&
    visualSystemCss.includes("Route aliases identify location only") &&
    visualSystemCss.includes("font-family: \"Rethink Sans\"") &&
    visualSystemCss.includes(".ui-connected-list") &&
    visualSystemCss.includes(".ui-wayfinding-badge") &&
    visualSystemCss.includes('.ui-wayfinding-badge[data-state="active"]') &&
    visualSystemCss.includes('.ui-wayfinding-badge[data-state="hover"]') &&
    visualSystemCss.includes("background: var(--color-surface-hovered)") &&
    visualSystemCss.includes(".studio-wayfinding-theme .ui-surface") &&
    visualSystemCss.includes(".studio-wayfinding-theme .ui-menu__panel") &&
    visualSystemCss.includes(".ui-select__indicator") &&
    visualSystemCss.includes("--foundation-page-gutter: clamp(1rem, 3vw, 2.5rem)") &&
    visualSystemCss.includes("--working-row-min-height: 3.5rem") &&
    visualSystemCss.includes("--working-row-padding-block: 0.375rem") &&
    visualSystemCss.includes(".ui-connected-list__actions .ui-icon-button") &&
    visualSystemCss.includes("align-items: start"),
  "The opt-in foundation should expose documented route, semantic, typography, layered-surface, numbered-station, and connected-list contracts.",
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
    createElement(FilePickerButton, {
      accept: ".zip",
      onSelect: () => undefined,
      children: "Choose ZIP",
    }),
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
    controlsMarkup.includes('type="file"') &&
    controlsMarkup.includes('accept=".zip"') &&
    controlsMarkup.includes("Choose ZIP") &&
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

const selectorControlMarkup = renderToStaticMarkup(
  createElement(FieldRuleCardShell, {
    fieldId: "selection-property:colour",
    title: "Colour",
    summary: "Selection control",
    typeLabel: "Selector",
    selected: false,
    expanded: false,
    configurable: false,
    selectable: false,
    onSelect: () => undefined,
    reorderLabel: "Drag Colour to reorder",
  }),
);

assert(
  selectorControlMarkup.includes("Selection control") &&
    selectorControlMarkup.includes("Drag Colour to reorder") &&
    !selectorControlMarkup.includes('aria-pressed="false"') &&
    !familySetupSource.includes("Editor order") &&
    familySetupSource.includes('aria-label="Editor control order"'),
  "Family selectors and fields should share one ordered rules list without presenting a non-actionable selector button or a duplicate order surface.",
);

const sharedRuleControlsMarkup = renderToStaticMarkup(
  createElement(FieldRuleConstraintControls, {
    fieldType: "image",
    constraints: {
      replacementMode: "cover",
      aspectRatio: "preserve-frame",
      allowedMimeTypes: ["image/png"],
    },
    onChange: () => undefined,
  }),
);

assert(
  sharedRuleControlsMarkup.includes("Maximum file size (MB)") &&
    sharedRuleControlsMarkup.includes("Minimum width") &&
    sharedRuleControlsMarkup.includes("Default placement") &&
    sharedRuleControlsMarkup.includes("Aspect ratio") &&
    sharedRuleControlsMarkup.includes("Allowed formats"),
  "Package and family rule cards should share the mature image constraint controls.",
);

assert(
  familySetupSource.includes("Add one ZIP for each design and define how people choose between them.") &&
    familySetupSource.includes("Decide which fields share content across variants.") &&
    familySetupSource.includes("Check every variant before saving.") &&
    familySetupSource.includes("family-config-list") &&
    !familySetupSource.includes("setup-navigation__description"),
  "Family setup should use the six concise task descriptions, compact navigation, and one connected Fields inventory.",
);

assert(
  visualSystemCss.includes(".context-preview-frame .inspection-preview-toolbar") &&
    visualSystemCss.includes(".context-preview-frame .template-preview-stage") &&
    visualSystemCss.includes("padding: var(--space-4)") &&
    visualSystemCss.includes("border-radius: 0"),
  "Context previews should use one outer frame with consistent toolbar and stage spacing rather than nested preview borders.",
);

const showcaseMarkup = renderToStaticMarkup(
  createElement(DesignSystemShowcase),
);

assert(
  showcaseMarkup.includes("studio-wayfinding-theme") &&
    showcaseMarkup.includes("Route colour inventory") &&
    showcaseMarkup.includes("Semantic status") &&
    showcaseMarkup.includes("Realistic density fixture") &&
    showcaseMarkup.includes("Station states") &&
    showcaseMarkup.includes("Inactive") &&
    showcaseMarkup.includes("Hover") &&
    showcaseMarkup.includes("Active") &&
    showcaseMarkup.includes("ui-select__indicator") &&
    showcaseMarkup.includes("Needs attention") &&
    showcaseMarkup.includes("No templates yet"),
  "The non-routed showcase should cover the scoped route palette, action and field states, semantic feedback, realistic density, and empty states.",
);
