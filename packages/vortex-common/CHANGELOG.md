# @vortexjs/common

## 0.1.1

### Patch Changes

- fab91bb: Denamespace SKL

## 0.1.0

### Minor Changes

- f870d4f: SKL: Add `minified` option to SKL.stringify
- 0885d49: Add new hasher
- 50075fb: SKL: Add undefined support
- 1f8e9da: Introduce description to unreachable state

### Patch Changes

- 1f8e9da: Reformat
- 936f5d6: Decrease hash length from 32 -> 8, making it 64 bits instead of 256, which shouldn't matter, as this does not need a large number of bits, due to it being not security-critical. If you are using this in a security critical manner, don't. This hash has not been tested for security.

## 0.0.3

### Patch Changes

- 49f6d4f: Release .dist files

## 0.0.2

### Patch Changes

- c7656c7: Increment version to trigger CI rebuild

## 0.0.1

### Patch Changes

- 135e33e: Write proper README.md's
- b789f53: Greatly decreate bundle size by making tsup a dev dependency
- 9360b7e: Switch to MIT-0 license over anti-fascist unlicense, as fascists don't care about licenses. Unlicense was original choice, but had no SPDLX identifier.
- bf31e90: Remove accidental logging from findTopLevelProjectPath
- 14b01be: Move findTopLevelProject to common
- 29523e6: Switch to catalog based versions
