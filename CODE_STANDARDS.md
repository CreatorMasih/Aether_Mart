# Aether Mart - Frontend Coding Standards & Conventions

Guidelines to maintain code quality, maintainability, and clean architecture as the platform scales.

---

## 1. Directory Structure Conventions

Feature directories must follow a self-contained structure under `src/features/[feature-name]/`:
- `components/`: Feature-specific UI molecules and organisms.
- `hooks/`: Custom state or side-effect queries bound to this feature.
- `services/`: Repositories, endpoints resolvers, and DTO mappers.
- `store/`: Zustand state slice managers.
- `types/`: Typescript types bound to this domain.
- `schemas/`: Zod form validators.

Shared global primitives are strictly limited to `src/components/ui/` (atoms) or `src/components/layout/` (page layouts).

---

## 2. Naming Conventions

- **React Components**: PascalCase (e.g. `ProductCard.tsx`, `CartItemRow.tsx`).
- **Custom Hooks**: camelCase prefixed with `use` (e.g. `useGeolocation.ts`, `useMediaQuery.ts`).
- **Utility Modules**: camelCase (e.g. `formatters.ts`, `apiClient.ts`).
- **Interfaces & Types**: PascalCase. Avoid prefixing with `I` (e.g. use `User`, not `IUser`).
- **Constants**: UPPER_CASE (e.g. `STORAGE_KEYS`, `USER_ROLES`).
- **Folder Names**: kebab-case (e.g. `customer-catalog`, `modal-manager`).

---

## 3. Strict Component Patterns

Every interactive component should implement standard states:
1. **Loading State**: Render responsive `<Skeleton />` matching component dimensions during fetch.
2. **Error State**: Gracefully catch data failures and display brief descriptors with refresh links.
3. **Empty State**: Render visual indicators (icons + descriptors) if array maps contain zero items.
4. **Accessibility Checks**:
   - Focus rings on active items (`focus-visible:ring-2`).
   - Explicit `aria-label` or description indicators for screen-readers.
   - Reduced-motion presets using Framer Motion variables.

---

## 4. Import Ordering Guide

Maintain uniform import order across all files to reduce git merge noise:
1. React core imports (`react`, `useState`, `useEffect`).
2. Third-party vendor dependencies (`react-router-dom`, `framer-motion`, `zustand`).
3. Global path alias components (`@/components/ui/...`, `@/hooks/...`).
4. Feature local modules (`./hooks/...`, `./components/...`).
5. Types and schemas.
6. CSS stylesheets and styles.
