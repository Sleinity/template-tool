import {
  CheckCircle2,
  Circle,
  CircleAlert,
  Image,
  LoaderCircle,
  MoreHorizontal,
  Type,
} from "lucide-react";
import { useState } from "react";
import { Button, FilterChip, IconButton } from "./actions";
import { Alert, EmptyState, Status } from "./feedback";
import { Input, Select, Textarea, Toggle } from "./fields";
import {
  ConnectedList,
  ConnectedListRow,
  WayfindingBadge,
  WayfindingMark,
  type WayfindingAccent,
} from "./foundation";
import { Disclosure, Menu, MenuItem, Surface } from "./surfaces";

const routeMarks: Array<{
  number: number;
  label: string;
  accent: Exclude<WayfindingAccent, "neutral">;
  state: "inactive" | "hover" | "active";
}> = [
  { number: 1, label: "Variants", accent: "variants", state: "active" },
  { number: 2, label: "Fonts", accent: "fonts", state: "active" },
  { number: 3, label: "Fields", accent: "fields", state: "active" },
  { number: 4, label: "Field rules", accent: "field-rules", state: "active" },
  { number: 5, label: "Validate", accent: "validate", state: "active" },
  { number: 6, label: "Review", accent: "review", state: "active" },
];

const fieldRows = [
  ["Product image", "Image", "All variants", "ready"],
  ["Headline", "Text", "All variants", "attention"],
  ["Price", "Text", "Portrait + Landscape", "ready"],
  ["End date", "Text", "Blue only", "neutral"],
  ["Background image", "Image", "Red only", "blocked"],
  ["Discount", "Text", "All variants", "ready"],
  ["Legal line", "Text area", "Landscape only", "neutral"],
  ["Holiday campaign legal disclaimer and conditions", "Text", "Not connected", "attention"],
] as const;

export function DesignSystemShowcase() {
  const [enabled, setEnabled] = useState(false);
  const [filter, setFilter] = useState("all");

  return (
    <main className="design-system-showcase studio-wayfinding-theme">
      <header className="design-system-showcase__header">
        <div>
          <p className="ui-metadata">Studio wayfinding foundation</p>
          <h1 className="ui-page-title">A clear system with creative energy.</h1>
          <p className="ui-page-description">
            Scoped development surface for verifying dark tokens, dense working
            states, semantic colour, and accessible interaction before product rollout.
          </p>
        </div>
      </header>

      <Surface as="section" className="design-system-showcase__routes">
        <div className="design-system-showcase__section-heading">
          <div>
            <p className="ui-metadata">Location, never severity</p>
            <h2 className="ui-section-title">Route colour inventory</h2>
          </div>
          <Status tone="neutral">Foundation candidate</Status>
        </div>
        <div className="design-system-showcase__route-grid">
          {routeMarks.map((route) => (
            <WayfindingMark key={route.accent} {...route} />
          ))}
        </div>
        <div
          className="design-system-showcase__sign-language"
          aria-label="Wayfinding sign language"
        >
          <span className="ui-metadata">Station states</span>
          <span className="design-system-showcase__sign-sample">
            <WayfindingBadge
              value="A"
              accent="fields"
              state="inactive"
              label="Inactive destination A"
            />
            <span>Inactive</span>
          </span>
          <span className="design-system-showcase__sign-sample">
            <WayfindingBadge
              value="B"
              accent="field-rules"
              state="hover"
              label="Hovered destination B"
            />
            <span>Hover</span>
          </span>
          <span className="design-system-showcase__sign-sample">
            <WayfindingBadge
              value="↘"
              accent="review"
              state="active"
              label="Active direction down and right"
            />
            <span>Active</span>
          </span>
        </div>
      </Surface>

      <div className="design-system-showcase__grid">
        <Surface as="section" className="design-system-showcase__section">
          <div className="design-system-showcase__section-heading">
            <h2 className="ui-section-title">Actions</h2>
          </div>
          <div className="design-system-state-matrix" aria-label="Button state matrix">
            <span className="ui-metadata">Default</span>
            <div className="design-system-showcase__row">
              <Button>Add template</Button>
              <Button variant="secondary">Check again</Button>
              <Button variant="quiet">Cancel</Button>
            </div>
            <span className="ui-metadata">Hover and active references</span>
            <div className="design-system-showcase__row">
              <span data-preview-state="hover"><Button>Hover</Button></span>
              <span data-preview-state="active"><Button>Active</Button></span>
            </div>
            <span className="ui-metadata">Focus reference</span>
            <div className="design-system-showcase__row" data-preview-state="focus">
              <Button>Continue</Button>
              <IconButton
                label="More template actions"
                icon={<MoreHorizontal size={18} />}
              />
            </div>
            <span className="ui-metadata">Loading and disabled</span>
            <div className="design-system-showcase__row">
              <Button loading loadingLabel="Saving">Save</Button>
              <Button disabled>Unavailable</Button>
            </div>
            <span className="ui-metadata">Destructive</span>
            <div className="design-system-showcase__row">
              <Button variant="destructive">Delete template</Button>
            </div>
          </div>
        </Surface>

        <Surface as="section" className="design-system-showcase__section">
          <div className="design-system-showcase__section-heading">
            <h2 className="ui-section-title">Semantic status</h2>
          </div>
          <div className="design-system-showcase__row">
            <Status tone="repaired" icon={<CheckCircle2 size={14} />}>
              Ready
            </Status>
            <Status tone="attention" icon={<CircleAlert size={14} />}>
              Needs attention
            </Status>
            <Status tone="blocked" icon={<CircleAlert size={14} />}>
              Blocked
            </Status>
            <Status tone="info" icon={<LoaderCircle size={14} />}>
              Checking
            </Status>
            <Status tone="neutral" icon={<Circle size={14} />}>
              Not checked
            </Status>
          </div>
          <Alert
            tone="attention"
            title="Font substitution may affect fidelity"
            icon={<CircleAlert size={17} />}
          >
            Add the exact required face before export for reliable line breaks.
          </Alert>
          <Alert
            tone="blocked"
            title="A field is not connected"
            icon={<CircleAlert size={17} />}
          >
            Choose whether the field shares content or belongs to one variant.
          </Alert>
        </Surface>

        <Surface as="section" className="design-system-showcase__section">
          <h2 className="ui-section-title">Fields</h2>
          <Input label="Template name" defaultValue="Summer sale" />
          <Input
            label="Missing source"
            defaultValue="Unresolved"
            error="Choose a compatible field before continuing."
          />
          <Textarea
            label="Headline"
            defaultValue="Up to 30% off selected items."
            helpText="Changes appear in the live preview."
          />
          <Select label="Input pattern" defaultValue="free">
            <option value="free">Free text</option>
            <option value="number">Numbers</option>
          </Select>
          <Input label="Managed value" value="Read only" disabled readOnly />
          <Toggle
            checked={enabled}
            onChange={setEnabled}
            label="Play template motion"
          />
        </Surface>

        <Surface as="section" className="design-system-showcase__section">
          <h2 className="ui-section-title">Disclosure and overlay</h2>
          <Disclosure summary="Technical details">
            <p className="ui-technical-detail">
              family:summer-sale · revision:42 · renderer:semantic
            </p>
          </Disclosure>
          <div className="design-system-showcase__row">
            <Menu
              label={<MoreHorizontal aria-hidden="true" size={18} />}
              accessibleLabel="Open template actions"
              panelLabel="Template actions"
            >
              <MenuItem>Rename</MenuItem>
              <MenuItem>Duplicate</MenuItem>
              <MenuItem destructive>Delete</MenuItem>
            </Menu>
            <span className="ui-supporting-copy">
              Menus and drawers are the only elevated surfaces.
            </span>
          </div>
        </Surface>
      </div>

      <Surface as="section" className="design-system-showcase__dense-fixture">
        <div className="design-system-showcase__section-heading">
          <div>
            <p className="ui-metadata">Realistic density fixture</p>
            <h2 className="ui-section-title">Editable fields</h2>
          </div>
          <Status tone="attention" icon={<CircleAlert size={14} />}>
            2 decisions
          </Status>
        </div>
        <div className="design-system-showcase__filters" aria-label="Field filters">
          {[
            ["all", "All", 8],
            ["shared", "Shared", 4],
            ["specific", "Variant-specific", 3],
            ["attention", "Needs attention", 2],
          ].map(([value, label, count]) => (
            <FilterChip
              key={value}
              selected={filter === value}
              label={String(label)}
              count={Number(count)}
              onClick={() => setFilter(String(value))}
            />
          ))}
        </div>
        <ConnectedList label="Editable fields">
          {fieldRows.map(([title, type, scope, state], index) => (
            <ConnectedListRow
              key={title}
              selected={index === 1}
              icon={
                type === "Image" ? (
                  <Image size={20} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Type size={20} strokeWidth={2} aria-hidden="true" />
                )
              }
              title={title}
              description={scope}
              meta={type}
              status={
                state === "ready" ? (
                  <Status tone="repaired" icon={<CheckCircle2 size={14} />}>
                    Ready
                  </Status>
                ) : state === "attention" ? (
                  <Status tone="attention" icon={<CircleAlert size={14} />}>
                    Needs attention
                  </Status>
                ) : state === "blocked" ? (
                  <Status tone="blocked" icon={<CircleAlert size={14} />}>
                    Blocked
                  </Status>
                ) : (
                  <Status tone="neutral" icon={<Circle size={14} />}>
                    Configured
                  </Status>
                )
              }
              actions={
                <IconButton
                  label={`More actions for ${title}`}
                  icon={<MoreHorizontal size={17} />}
                />
              }
            />
          ))}
        </ConnectedList>
      </Surface>

      <Surface as="section" className="design-system-showcase__section">
        <EmptyState
          title="No templates yet"
          description="Add a ZIP template package to create your first reusable template."
          action={<Button>Add template</Button>}
        />
      </Surface>
    </main>
  );
}
