import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "./actions";
import { Alert, EmptyState, Status } from "./feedback";
import { Input, Select, Textarea, Toggle } from "./fields";
import { Disclosure, Menu, MenuItem, Surface } from "./surfaces";

export function DesignSystemShowcase() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="design-system-showcase">
      <header>
        <p className="ui-metadata">Shared UI foundation</p>
        <h1 className="ui-page-title">Template Tool components</h1>
        <p className="ui-page-description">
          A non-routed development surface for verifying shared light-mode
          tokens, interaction states, and responsive behavior.
        </p>
      </header>

      <div className="design-system-showcase__grid">
        <Surface as="section" className="design-system-showcase__section">
          <h2 className="ui-section-title">Actions and status</h2>
          <div className="design-system-showcase__row">
            <Button leadingIcon={<Plus size={16} />}>Add template</Button>
            <Button variant="secondary">Validate again</Button>
            <Button variant="quiet">Cancel</Button>
            <Button variant="destructive" leadingIcon={<Trash2 size={16} />}>
              Delete
            </Button>
            <IconButton
              label="More template actions"
              icon={<MoreHorizontal size={18} />}
            />
          </div>
          <div className="design-system-showcase__row">
            <Status tone="repaired">Ready</Status>
            <Status tone="attention">3 warnings</Status>
            <Status tone="blocked">Blocked</Status>
            <Status tone="info">Importing</Status>
          </div>
          <Alert tone="attention" title="Font substitution may affect fidelity">
            Add the exact required face before export for reliable line breaks.
          </Alert>
        </Surface>

        <Surface as="section" className="design-system-showcase__section">
          <h2 className="ui-section-title">Fields</h2>
          <Input label="Template name" defaultValue="Summer sale" />
          <Textarea
            label="Headline"
            defaultValue="Up to 30% off selected items."
            helpText="Changes appear in the live preview."
          />
          <Select label="Input pattern" defaultValue="free">
            <option value="free">Free text</option>
            <option value="number">Numbers</option>
          </Select>
          <Toggle
            checked={enabled}
            onChange={setEnabled}
            label="Play template motion"
          />
        </Surface>

        <Surface as="section" className="design-system-showcase__section">
          <h2 className="ui-section-title">Disclosure and menu</h2>
          <Disclosure summary="Technical details">
            <p className="ui-page-description">
              Deep package metadata stays available without dominating the
              default interface.
            </p>
          </Disclosure>
          <Menu
            label={<MoreHorizontal aria-hidden="true" size={18} />}
            accessibleLabel="Open template actions"
          >
            <MenuItem>Rename</MenuItem>
            <MenuItem>Duplicate</MenuItem>
            <MenuItem destructive>Delete</MenuItem>
          </Menu>
        </Surface>

        <Surface as="section" className="design-system-showcase__section">
          <EmptyState
            title="No templates yet"
            description="Add a ZIP template package to create your first reusable template."
            action={<Button leadingIcon={<Plus size={16} />}>Add template</Button>}
          />
        </Surface>
      </div>
    </div>
  );
}
