# Appearance: one coherent palette per mode

## User behavior

The header's sun/moon button opens **Light**, **Dark**, and **Use device setting**. New workspaces follow the device setting. Explicit choices override the device. System mode reacts to device-theme changes during the session. The menu supports arrow keys, Home, End, Enter, Escape, Tab and pointer/touch selection.

A small inline bootstrap applies the saved or system mode before stylesheet rendering. `theme.ts` owns the appearance menu and subsequent changes; changing appearance does not rerender pages or reset calculator inputs, chat, saved homes, notes or filters. The root `color-scheme` also themes native controls. The browser theme-color meta tag follows the selected palette.

The choice is stored in `haven.appearance.v1`, separately from `haven.workspace.v1`. It is not included in JSON workspace backups. Storage failures are caught; the choice still applies for the current session. Native cross-session persistence was not verifiable in this build environment. A download opened at a new file path may have a separate storage scope; select appearance again as needed.

## Palette and scope

Light keeps warm-white backgrounds, white cards, forest text and sage accents. Dark uses `#141d18` for the canvas, `#1d2921` for panels, `#edf3e9` for primary text, `#b4c3aa` for secondary text and `#bfd8aa` for accents. Accent button labels use a dedicated dark on-accent token, not the default light text.

Semantic tokens cover the app canvas, sidebar, topbar, navigation, all five pages, dialogs, menus, inputs, placeholders, options, autocomplete, buttons and states, assistant content, comparison tray, financial tables, chart colors and status messages. Separate subtle and strong surfaces preserve hierarchy. Warning and negative values have theme-specific foregrounds and backgrounds. Focus rings, selections and backdrops are included. Original property illustrations keep their own art palettes; the UI is not inverted with a filter.

Existing restrained animations remain intact, including the shared motion easing token. Both themes use the same layout and motion behavior, with reduced-motion preferences honored.

## Verification limits

The ranking/theme browser suite performs 29 groups of rendered-text contrast samples across desktop pages, populated states, dialogs, chat and mobile views in both themes. Sampled normal text is checked against a 4.5:1 threshold and large text against 3:1. Foregrounds are compared with composited inherited background colors. Hidden, inert and disabled nodes, image overlays and some non-text/input rendering are not part of that automated sample. Gradients, images, focus visibility, assistive-technology usability and every possible state require additional manual review. This is not an accessibility certification.

System theme changes, explicit overrides, an existing stored choice, denied storage, 320/390-pixel layouts, menu keyboard behavior and state-preserving switches are covered in the supplied Chromium checks. Storage uses an isolated in-memory adapter, so this does not demonstrate browser-native cross-session persistence. Safari, Firefox and physical-device behavior remain unverified.
