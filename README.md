# Autocomplete — WeWeb custom element

A free-text input with suggestions supplied from outside (address search, typeahead). The value is whatever
the user types; the component never fetches and never filters. Your workflow does the search, the component
displays the result and handles the keyboard.

Derived from `jpui-combobox` (keyboard, ARIA and Floating UI plumbing). Different model: in the combobox the
value must be one of the options and options are filtered locally; here the value is free text and
suggestions are shown as bound.

## Wiring

1. **On search** (`event.value`, debounced, from `minChars` characters) → fetch results, store them in a
   variable.
2. Bind that variable to **Suggestions** (`[{ label, description?, value? }]`, or map your own fields).
3. **On select** (`event.item` = the original object, `event.value` = text written in the field) → use the pick.
4. Optionally bind **Init value** to the text you want shown after a pick or an outside change. Changing it
   never triggers a search.

## Keyboard

| Key | List open | List closed |
| --- | --- | --- |
| ↓ / ↑ | Move the highlight (wraps) | ↓ opens the list if there are suggestions |
| Enter | Picks the highlighted suggestion | Fires **On enter**; submits the form only if *Submit form on Enter* is on |
| Escape | Closes the list (does not reach an enclosing modal) | Passes through |
| Tab | Closes the list and moves on | — |

Keys pressed during IME composition (Korean, Japanese…) are ignored.

## Settings

| Property | Default | Notes |
| --- | --- | --- |
| Suggestions | 2 samples | Displayed as-is |
| Label / Description / Value field | `label` / `description` / `value` | Value falls back to label |
| Init value | `''` | Replaces the text without searching |
| Min characters | 3 | Trimmed length |
| Debounce (ms) | 300 | On search only; On change is immediate |
| Loading | off | Bind your own flag; shows *Loading text* while no suggestion is bound |
| No results text | `No suggestions` | Shown after a search for the current text returned nothing; empty = keep closed |
| Highlight first suggestion | on | Enter then picks the first result |
| Submit form on Enter | off | Only when nothing is highlighted |
| Clearable, Disabled, Read only, Invalid, Required | | |
| Show suggestions (editor) | off | Keep the list open while styling |
| Accessible label, Clear button label | | |

Form: `fieldName`, custom validation. The visible input carries `name` and `required`.

## Events, actions, variables

- Events: `change`, `search`, `select`, `enter`, `initValueChange`, `focus`, `blur`, `open`, `close`.
- Actions: Focus, Set value, Clear, Open suggestions, Close suggestions.
- Variable `value` (text). Local context `autocomplete`: `value`, `query`, `isOpen`, `activeSuggestion`,
  `suggestionsCount`.
- States: `focus`, `focus-visible`, `disabled`, `readonly`, `invalid`.

## Build

```
npm i
npm run build -- --name=jpui-autocomplete --type=wwobject
```

Check `dist/manager.js` has this run's timestamp: the CLI exits 0 even when the arguments are ignored.
