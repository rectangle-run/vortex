# @vortexjs/dom

## 2.0.6

### Patch Changes

- Updated dependencies [edb950d]
- Updated dependencies [fab91bb]
- Updated dependencies [cc6741a]
- Updated dependencies [dc695c7]
- Updated dependencies [edb950d]
  - @vortexjs/core@2.7.0
  - @vortexjs/common@0.1.1

## 2.0.5

### Patch Changes

- Updated dependencies [8f071be]
- Updated dependencies [cf5c406]
- Updated dependencies [0536d4b]
- Updated dependencies [3d35737]
  - @vortexjs/core@2.6.0

## 2.0.4

### Patch Changes

- 1f8e9da: Reformat
- Updated dependencies [f870d4f]
- Updated dependencies [dee619e]
- Updated dependencies [a3cda05]
- Updated dependencies [0885d49]
- Updated dependencies [1f8e9da]
- Updated dependencies [936f5d6]
- Updated dependencies [dee619e]
- Updated dependencies [adb9185]
- Updated dependencies [50075fb]
- Updated dependencies [1f8e9da]
  - @vortexjs/common@0.1.0
  - @vortexjs/core@2.5.0

## 2.0.3

### Patch Changes

- 49f6d4f: Release .dist files
- Updated dependencies [49f6d4f]
  - @vortexjs/common@0.0.3
  - @vortexjs/core@2.4.3

## 2.0.2

### Patch Changes

- c7656c7: Increment version to trigger CI rebuild
- Updated dependencies [c7656c7]
  - @vortexjs/common@0.0.2
  - @vortexjs/core@2.4.2

## 2.0.1

### Patch Changes

- 135e33e: Write proper README.md's
- b789f53: Greatly decreate bundle size by making tsup a dev dependency
- 9360b7e: Switch to MIT-0 license over anti-fascist unlicense, as fascists don't care about licenses. Unlicense was original choice, but had no SPDLX identifier.
- d9db531: Introduce new dependency on vortex common
- 29523e6: Switch to catalog based versions
- Updated dependencies [135e33e]
- Updated dependencies [b789f53]
- Updated dependencies [d9db531]
- Updated dependencies [9360b7e]
- Updated dependencies [d9db531]
- Updated dependencies [bf31e90]
- Updated dependencies [14b01be]
- Updated dependencies [d9db531]
- Updated dependencies [2d4f40a]
- Updated dependencies [29523e6]
- Updated dependencies [ab7aa14]
  - @vortexjs/common@0.0.1
  - @vortexjs/core@2.4.1

## 2.0.0

### Major Changes

- 33c8802: breaking: change attribute names from JS form to HTML form

  - WHAT:
    - Classes are now auto-hypenhyphenated, e.g. `ariaLabel` becomes `aria-label`, `dataTestId` becomes `data-test-id`, etc.\
    - Certain classes get replace if they're an edge case, `className` becomes `class`, `htmlFor` becomes `for`, etc.
    - If you relied on the legacy behavior, you unfortunately have to use a `use` callback to set the legacy attribute yourself.
  - WHY:
    - This change is to align with the HTML standard and allows one to use hyphenated attributes like `aria-label` and `data-test-id` directly in the JSX without needing to convert them manually.
  - HOW:
    - If you need to use the legacy behavior, you can use a `use` callback to set the attribute manually, e.g. `<div use={elm => elm.setAttribute("dontHyphenateMe", "value")}}></div>`.

### Minor Changes

- d7f180a: Bindings: Allow checked bindings
- ca3e0dd: Export intrinsic types
- 7127487: Improve attribute typings and add styles

### Patch Changes

- 074a934: Fix setChildren
- 2b1657e: Allow dynamic classnames
- d6017d6: Add aria-describedby type
- 5180529: Allow data attributes
- 14ec38f: Switch README to use that of the main repository
- a4b686e: Fix types to allow dynamic styles
- Updated dependencies [c486c10]
- Updated dependencies [1ec724f]
- Updated dependencies [14ec38f]
- Updated dependencies [7127487]
  - @vortexjs/core@2.4.0

## 1.2.0

### Minor Changes

- 7a9c31e: std: add clocks

### Patch Changes

- e5dbe4a: Fix typings to include use hook
- Updated dependencies [e5dbe4a]
- Updated dependencies [7a9c31e]
  - @vortexjs/core@2.3.0

## 1.1.1

### Patch Changes

- Updated dependencies [ccff23f]
  - @vortexjs/core@2.2.0

## 1.1.0

### Minor Changes

- d2e99ab: Add support for bindings
- d2e99ab: Add support for event handlers

### Patch Changes

- Updated dependencies [d2e99ab]
- Updated dependencies [d2e99ab]
- Updated dependencies [1fde5eb]
  - @vortexjs/core@2.1.0

## 1.0.5

### Patch Changes

- Updated dependencies [9836ef2]
- Updated dependencies [9836ef2]
- Updated dependencies [9836ef2]
  - @vortexjs/core@2.0.0

## 1.0.4

### Patch Changes

- Switch to a proper bundling approach rather than shipping .ts files
- Updated dependencies
  - @vortexjs/core@1.0.4
