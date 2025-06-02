---
"@vortexjs/core": major
---

Deprecate component class

WHAT: The `Component` class, and the static variable indicating the currently rendered component have been deprecated, as they only served to provide the Lifetime used for hooks, which could be used for things other than components.
WHY: Because we want more fine grained hook lifetimes that aren't tied to components, and the `Component` class was not useful for anything else.
HOW: You can migrate by switching to the `useHookLifetime` hook
