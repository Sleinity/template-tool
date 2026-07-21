# Figma Editable Field Naming

The Figma plugin detects explicit editable markers and exports them as
`editableFields` bindings in `template.json`.

## Marker Format

Use:

```text
field:type:id
```

Examples:

```text
field:text:headline
field:textarea:description
field:image:productImage
field:color:primaryColor
field:boolean:showLogo
field:number:price
field:date:eventDate
```

## Rules

- `field` is lowercase and case-sensitive.
- `type` uses a supported package field type.
- `id` is unique within the package.
- `id` should be camelCase without spaces.
- Use semantic IDs instead of visual layer descriptions.
- The plugin must bind each field to a Figma `nodeId` and safe package
  property path.

## Current Editor Support

The package editor has dedicated controls for:

- `text`
- `textarea`
- `image`
- `color`
- `boolean`

`number` and `date` are preserved in the package contract but currently use a
basic text fallback or produce a non-blocking editor warning.

## Package Binding Example

```json
{
  "id": "headline",
  "type": "textarea",
  "nodeId": "58:166",
  "property": "text.characters",
  "defaultValue": "Deal of the week.",
  "label": "Headline"
}
```

Editable fields are never inferred from unmarked layers.
