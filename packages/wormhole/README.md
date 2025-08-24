# Wormhole

Wormhole is the metaframework for Vortex, providing an opinionated way to build applications with Vortex.

## What it is

- The reccommended way to build applications with Vortex.
- What we believe is the best way to structure applications
- Provides a set of tools that synergize with said reccommended structure

## Build Adapters

Wormhole supports different build adapters for various deployment targets:

### Development
```bash
wormhole dev
```
Uses the DevAdapter for local development with hot reloading and debugging features.

### Vercel
```bash
wormhole build vercel
```
Uses the VercelAdapter with the Vercel Build Output API for production deployment to Vercel. This adapter:
- Generates production-optimized builds (minified, no dev flags)
- Creates lightweight edge functions for each route and API endpoint
- Outputs in the `.vercel/output` directory structure
- Handles static assets separately from serverless functions
- Supports both server-side rendering and API routes

The build output follows the Vercel Build Output API format:
- `.vercel/output/static/`: Client-side JavaScript and CSS bundles
- `.vercel/output/functions/`: Individual edge functions for each route
- `.vercel/output/config.json`: Vercel configuration and routing rules

## Who this isn't for

- People who don't want to use Vortex
- People who are trying to build local-first applications, it's possible, but then you're barely using any of the features of the framework, probably just use Vortex with Vite.
- People who don't like magic. We try to create magic that isn't too confusing, but if compiler features aren't your cup of tea, this isn't for you.
