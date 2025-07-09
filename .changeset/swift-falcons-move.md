---
"@vortexjs/common": patch
---

Decrease hash length from 32 -> 8, making it 64 bits instead of 256, which shouldn't matter, as this does not need a large number of bits, due to it being not security-critical. If you are using this in a security critical manner, don't. This hash has not been tested for security.
