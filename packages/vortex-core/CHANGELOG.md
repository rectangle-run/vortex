# @vortexjs/core

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
