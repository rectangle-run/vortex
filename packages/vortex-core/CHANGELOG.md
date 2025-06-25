# @vortexjs/core

## 2.4.1

### Patch Changes

- d9db531: Remove unused children field in JSXComponent, as it's already in the props, and is never set
- 9360b7e: Switch to MIT-0 license over anti-fascist unlicense, as fascists don't care about licenses. Unlicense was original choice, but had no SPDLX identifier.
- d9db531: Introduce new dependency on vortex common
- d9db531: Make Lifetime an ultraglobal reference
- 2d4f40a: Fix signal equality check returning true for signals with different keys
- 29523e6: Switch to catalog based versions
- ab7aa14: Fix needless initial invalidation in derive and effect
- Updated dependencies [135e33e]
- Updated dependencies [b789f53]
- Updated dependencies [9360b7e]
- Updated dependencies [bf31e90]
- Updated dependencies [14b01be]
- Updated dependencies [29523e6]
  - @vortexjs/common@0.0.1

## 2.4.0

### Minor Changes

- 1ec724f: Introduce Contexts API
- 7127487: Improve attribute typings and add styles

### Patch Changes

- c486c10: Contexts: allow nested contexts
- 14ec38f: Switch README to use that of the main repository

## 2.3.0

### Minor Changes

- e5dbe4a: Introduce use hooks
- 7a9c31e: std: add clocks

## 2.2.0

### Minor Changes

- ccff23f: Add support for lists

## 2.1.0

### Minor Changes

- d2e99ab: Add support for bindings
- d2e99ab: Add support for event handlers

### Patch Changes

- 1fde5eb: Improve typings for children

## 2.0.0

### Major Changes

- 9836ef2: Deprecate component class

  WHAT: The `Component` class, and the static variable indicating the currently rendered component have been deprecated, as they only served to provide the Lifetime used for hooks, which could be used for things other than components.
  WHY: Because we want more fine grained hook lifetimes that aren't tied to components, and the `Component` class was not useful for anything else.
  HOW: You can migrate by switching to the `useHookLifetime` hook

### Minor Changes

- 9836ef2: Introduce if statements
- 9836ef2: Introduce debugging features for signal updates

## 1.0.4

### Patch Changes

- Switch to a proper bundling approach rather than shipping .ts files
