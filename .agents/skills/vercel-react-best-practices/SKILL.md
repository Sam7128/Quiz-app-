---
name: vercel-react-best-practices
description: Official Vercel engineering standards for React and Next.js. Focuses on performance, bundle size optimization, and modern React patterns.
---

# Vercel & React Best Practices

High-performance React development and Next.js optimization.

## Core Pillars

1. **Performance**: Eliminate request waterfalls, optimize images, and use streaming (SSR/RSC).
2. **Architecture**: Proper use of Server Components vs. Client Components.
3. **Bundle Size**: Tree-shaking, dynamic imports, and dependency auditing.
4. **Data Fetching**: Efficient cache management (SWR/React Query) and prefetching.

## Audit Checklist
- Are we using `next/image` for all images?
- Is state lifting being handled optimally?
- Are there unnecessary `useEffect` hooks?
- Is the bundle being bloated by unused libraries?

## Guardrails
- NEVER suppress React warnings.
- Avoid `any` types in TypeScript implementations.
- Prioritize readability and maintainability over "clever" hacks.
