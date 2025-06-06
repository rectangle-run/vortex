---
"@vortexjs/dom": major
---

breaking: change attribute names from JS form to HTML form

- WHAT:
    - Classes are now auto-hypenhyphenated, e.g. `ariaLabel` becomes `aria-label`, `dataTestId` becomes `data-test-id`, etc.\
    - Certain classes get replace if they're an edge case, `className` becomes `class`, `htmlFor` becomes `for`, etc.
    - If you relied on the legacy behavior, you unfortunately have to use a `use` callback to set the legacy attribute yourself.
- WHY:
    - This change is to align with the HTML standard and allows one to use hyphenated attributes like `aria-label` and `data-test-id` directly in the JSX without needing to convert them manually.
- HOW:
    - If you need to use the legacy behavior, you can use a `use` callback to set the attribute manually, e.g. `<div use={elm => elm.setAttribute("dontHyphenateMe", "value")}}></div>`.
