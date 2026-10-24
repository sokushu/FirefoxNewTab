[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

# FirefoxNewTab

A lightweight Firefox new tab extension with website shortcuts, groups, custom backgrounds, and an optional clock. Built with Manifest V3 and plain HTML, CSS, and JavaScript, it runs directly from the source files without dependencies or a build step.

## Features

- Arrange website shortcuts in a draggable grid with four icon sizes and saved empty spaces.
- Organize websites in a collapsible group sidebar and drag shortcuts between groups.
- Upload custom icons or fetch icons directly from a website when needed.
- Choose from 7 bundled wallpapers, a local image, or 48 background colors.
- Use a dark, light, or system theme and optionally display the local time and date.
- Follow Firefox's interface language automatically and respect the system's reduced motion preference.

## Load in Firefox

Use Firefox 128 or later for on-demand icon fetching, which relies on [`optional_host_permissions`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions).

1. Download or clone this repository and keep its files together.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and select `manifest.json` in the project root.
4. If prompted, allow the extension to replace the new tab page.
5. Open a new tab. Right-click an empty area to add your first website, or click the gear in the lower-right corner to open settings.

Temporary installation lasts until Firefox restarts; load the extension again afterward. See [Mozilla's temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Website shortcuts

### Add and manage websites

The website list starts empty. Right-click an empty background area to open these actions:

| Action | Result |
| --- | --- |
| Add Icon | Add a website to the current group. |
| Change Wallpaper | Open settings at the bundled wallpaper section. |
| Settings | Open the settings drawer. |

Enter a name of up to 50 characters and an HTTP or HTTPS address. Addresses without a scheme automatically receive `https://`. Clicking a shortcut opens the website in the current tab.

Right-click a shortcut or use its three-dot button to open, edit, resize, or delete it. The button appears on hover or keyboard focus and stays visible on touch devices. Deletion requires confirmation; canceling the editor discards unsaved changes.

### Icon sizes and grid capacity

Each group has a logical desktop grid of **10 columns × 6 rows**, totaling **60 base cells**.

| Size | Columns × rows | Base cells |
| --- | --- | --- |
| Normal | 1 × 1 | 1 |
| Wide Icon | 2 × 1 | 2 |
| Tall Icon | 1 × 2 | 2 |
| Large Icon | 2 × 2 | 4 |

A group fits up to 60 normal shortcuts. Larger icons also need a suitable arrangement of free cells. Adding shortcuts is disabled when the group is full; adding, moving between groups, and resizing all check available space. Each website keeps its own size.

Drag shortcuts to empty cells or over other shortcuts to rearrange them. Empty spaces and positions are saved. Press **Esc** or cancel a drag to restore the original layout; drag near the scroll area's edge to reach more cells.

The grid stays aligned to the upper-left of the area beside the sidebar and scrolls only when needed. Narrow windows use fewer columns and save separate positions for each column count. Dragging in a narrow layout does not overwrite desktop positions, and resizing the window alone does not save new positions. In a single-column view, wide icons temporarily shrink horizontally and regain their width when space allows.

### Groups

The sidebar starts with a **Favorites** group. Use **Add Group** to create more groups; names can contain up to 20 characters. Group settings let you change the name and use text, an emoji, or a local image as the icon.

Drag a website onto a group to move it there, including onto its icon when the sidebar is collapsed. If the destination has insufficient space, the website stays in its original position.

Use the arrow at the top of the sidebar to collapse or expand it. The current group and collapsed state are saved. Any group can be renamed or deleted, including the initial group, but at least one group must remain. Deleting a group moves its websites and icons to the first remaining group.

Group changes use vertical slide animations based on sidebar order. Resizing icons and changing the sidebar also animate smoothly. These effects respect the system's reduced motion setting.

### Custom and fetched icons

- Upload PNG, JPEG, WebP, GIF, AVIF, or ICO files up to **2 MiB** for website or group icons.
- Without a custom website icon, the shortcut uses the first character of its name. **Use Default Icon** restores this fallback.
- Icons keep their aspect ratio, are never enlarged, and are resized to a maximum longest edge of **512 px**. They are compressed to WebP at approximately **0.8** quality and reduced further if needed to fit the **128 KiB** stored icon data limit.
- Previously saved PNG icons remain supported. To improve an older icon compressed to 128 px, upload the original image or fetch it again.

To fetch an icon, enter a website address and click **Fetch Icon**. Firefox requests access to that website when needed. The extension reads the site's declared icons and also tries `/favicon.ico`, then converts the result into a local preview. Click **Save** to keep it. Failed or denied requests leave the existing icon intact, and local uploads remain available. No third-party icon service is used.

## Appearance and backgrounds

Click the lower-right gear to open the settings drawer. Close it with its close button, by clicking outside, or by pressing **Esc**.

| Setting | Options and behavior |
| --- | --- |
| Theme | **Dark**, **Light**, or **Follow system**; the default follows the system. |
| Show clock | Off by default. Displays local time in 24-hour `HH:mm:ss` format and a localized date, updated every second. |
| Bundled wallpapers | 7 images, displayed in two columns; click a thumbnail to apply and save. |
| Local background image | PNG, JPEG, WebP, GIF, or AVIF up to **10 MiB**; applied and saved after selection. |
| Background colors | 48 colors; click a swatch to apply and save. |
| Default background | White (`#ffffff`), used on first launch and when restoring the default. |

The theme changes controls, menus, and dialogs while preserving the chosen wallpaper or background color. Shortcut titles and the clock use dark text on bright solid backgrounds. Theme, clock visibility, and sidebar collapse preferences synchronize across open new tabs for the same extension.

## Interface language

The interface follows Firefox's display language using [`browser.i18n.getUILanguage()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/getUILanguage). There is no separate language selector.

Supported interface languages are Simplified Chinese, Traditional Chinese, English, Japanese, Korean, Spanish, French, German, and Portuguese, including Brazilian and European Portuguese. Regional locales use matching or generic translations; unsupported languages fall back to Simplified Chinese. Open a new tab after changing Firefox's display language.

Menus, settings, dialogs, messages, accessibility labels, color names, the extension name, dates, and the default group name are localized. User-entered website titles, URLs, and group names keep their original text. The clock always uses the local time zone.

## Local data and permissions

| Storage | Contents |
| --- | --- |
| `localStorage` | Websites, icons, grid positions, groups, current group, sidebar state, theme, and clock visibility. |
| `IndexedDB` | Background choices and local background images. |

Uploaded images stay in the browser. Managing shortcuts and backgrounds requires no additional permissions. Website access is requested only when you click **Fetch Icon**, and declining access does not prevent local uploads. Backgrounds do not use an external image service. If local storage is unavailable, management operations report an error.

### Compatibility with older data

- Old bundled shortcuts are removed using their preset markers; user-added websites and custom icons are retained.
- The former folder feature has been removed. Websites inside old folders move into their group's main grid, retaining their names, URLs, icons, and sizes.
- If older data exceeds grid capacity, excess websites remain in an **Other Websites** list where they can be opened, edited, or deleted. They return to the grid as space becomes available.

## Development

### Project structure

| Files | Purpose |
| --- | --- |
| `manifest.json` | Extension metadata, new tab override, and optional website permissions. |
| `newtab.html`, `newtab.css`, `newtab.js` | Page structure, base styles, clock, and date. |
| `i18n.js`, `_locales/` | Interface localization and WebExtension message catalogs. |
| `shortcuts.js`, `groups.js`, `sidebar.js` | Website management, groups, and sidebar state. |
| `shortcut-layout.js`, `shortcut-grid.js` | Grid capacity, placement rules, measurements, and dragging. |
| `shortcut-tile-motion.js`, `shortcut-page-transition.js` | Icon resizing and group transition animations. |
| `shortcut-menu.js`, `background-menu.js` | Shortcut and background context menus. |
| `icon-utils.js`, `shortcut-icon-fetcher.js` | Shared icon processing and on-demand website icon fetching. |
| `shortcut-migrations.js` | Compatibility with older saved website data. |
| `background.js`, `background-presets.js`, `assets/` | Background storage, bundled wallpaper list, and images. |
| `settings.js` | Settings drawer, theme, and clock preferences. |
| `wallpaper-picker.css`, `sidebar.css`, `ui-effects.css`, `shortcut-board.css` | Wallpaper picker, sidebar, interaction effects, and grid styles. |
| `README*.md`, `LICENSE` | Documentation in 8 languages and license text. |

### Edit and reload

No dependency installation or build command is required. After editing source files, click **Reload** for the extension in `about:debugging#/runtime/this-firefox`, close the old new tab page, and open a new one.

Local CSS and JavaScript references in `newtab.html` use a shared `?v=...` resource version. Update these parameters together when changing those resources. Keep script dependencies in order: load `i18n.js` first, shared utilities before their consumers, and group, grid, menu, transition, and migration modules before `shortcuts.js`. Modules keep private state in separate scopes and cooperate through explicit interfaces or events. Shared icon processing and capacity rules each have one implementation; wallpaper picker styles stay scoped to the settings drawer.

### Update translations

Use the same message keys across `_locales/*/messages.json`. Insert named values with `newTabI18n.t(key, { name, count })`; localize static content with `data-i18n`, `data-i18n-title`, `data-i18n-aria-label`, and `data-i18n-placeholder`. Include menu text inside templates, update equivalent regional locale catalogs together, and keep all 8 README versions aligned. See [Mozilla's internationalization guide](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization).

## License

See [LICENSE](LICENSE) for the GNU General Public License v3.0.

