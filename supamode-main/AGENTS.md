This file provides guidance to AI Agents when working with code in this repository.

## Project Overview

**Supamode** is a comprehensive admin dashboard application built as a Turborepo monorepo - essentially "Laravel Nova for Supabase". It provides a modern, feature-rich administration interface for Supabase projects with sophisticated role-based access control (RBAC), database management, user administration, and audit logging capabilities.

**Core Purpose**: Enable non-technical staff to navigate and manage Supabase databases through a full-featured roles/permissions system, perfect for support agents and content managers.

## Architecture

### Monorepo Structure

- **apps/app/**: Main React frontend (Vite + React Router 7 + TypeScript)
- **apps/api/**: Hono.js backend API server with type-safe RPC
- **apps/e2e/**: Playwright end-to-end tests
- **packages/features/**: Feature packages (@kit/auth, @kit/dashboard, @kit/data-explorer, @kit/users-explorer, @kit/storage-explorer, @kit/settings, @kit/audit-logs)
- **packages/ui/**: Shared UI components (Shadcn/ui + custom components)
- **packages/supabase/**: Supabase client and database utilities with Drizzle ORM
- **tooling/**: Development tooling (ESLint, TypeScript, Prettier configs)

### Key Technologies

- **Frontend**: React 19, Vite, TypeScript, React Router 7, Tailwind CSS v4, Shadcn/ui
- **Backend**: Hono.js with type-safe RPC, Supabase (PostgreSQL + Auth + Storage), Drizzle ORM
- **State Management**: TanStack Query for server state, React Context for UI state
- **Testing**: Playwright for E2E tests
- **Build System**: Turborepo with pnpm
- **Database**: PostgreSQL with comprehensive RLS policies

## Core Development Patterns

### 1. Feature Development Workflow (CRITICAL)

Always follow this pattern when creating new features:

1. **Service**: Create a service class using Drizzle (e.g., `table-metadata.service.ts`)
2. **Loader**: Create a Router loader for data fetching (e.g., `loaders.ts`)
3. **Hono RPC**: Create type-safe API endpoints (e.g., `update-columns-metadata-action.ts`)
4. **Router**: Load data via loaders into React components
5. **Form Actions**: Use `useFetcher` and router actions for mutations
6. **API Registration**: Register Hono APIs in `apps/api/app/routes/index.ts`

```typescript
// Example Service Pattern
class UserService {
  async getUser(id: number) {
    // Drizzle implementation
  }
}

export function createUserService() {
  return new UserService();
}
```

### 2. API Architecture (Hono + Services) - SERVER-SIDE ONLY

**CRITICAL**: API routes are SERVER-ONLY code. NEVER import into client code.

- **Light services**: Keep services thin - delegate complex algorithms to `/utils`
- **Hono routes contain minimal logic** - delegate to service classes
- **Services contain minimal business logic** - delegate algorithms to pure functions
- **Export Hono APIs from packages** via `/routes` export path only
- **Register APIs** only in `apps/api/app/routes.ts` (server entry point)
- **Use Drizzle client** from `@kit/supabase/clients/drizzle-client` for all database operations
- **Type-safe RPC** between client and server using Hono's RPC capabilities

```typescript
// ❌ BAD - Complex logic in service
class UserService {
  async calculateUserScore(userId: string) {
    const user = await this.getUser(userId);
    // Complex scoring algorithm - WRONG place!
    let score = 0;
    for (const action of user.actions) {
      score += action.weight * Math.log(action.frequency + 1);
    }
    return score * 1.5 + user.baseScore;
  }
}

// ✅ GOOD - Logic extracted to utils, service handles data flow
import { calculateUserScore } from "@kit/scoring/utils";

class UserService {
  async calculateUserScore(userId: string) {
    const user = await this.getUser(userId); // Service handles DB/network
    return calculateUserScore(user); // Utils handles algorithms
  }

  async getUser(userId: string) {
    // Database call - stays in service
    return this.db.select().from(users).where(eq(users.id, userId));
  }
}
```

```typescript
// ✅ CORRECT - Server-side registration only
// @apps/api/app/routes.ts
import { registerMyFeatureRoutes } from "@kit/my-feature/routes"; // SERVER

// ❌ FORBIDDEN - Never import routes in client
// @apps/app/src/main.tsx
import { registerMyFeatureRoutes } from "@kit/my-feature/routes"; // DANGER!
```

### 3. React Component Patterns - CLIENT-SIDE ONLY

**CRITICAL**: React components are CLIENT-ONLY. Export via `/components` path only.

- **Light components**: Keep components thin - ONLY UI logic, no complex algorithms
- **Extract business logic**: Move calculations, processing, and algorithms to `/utils`
- **Small, focused, simple**: Avoid massive components with multiple hooks. Break them down, especially when the JSX gets large.
- **Prefer forms to useState**: when you create forms, you must use useForm from react-hook-forms rather than useState
- **Avoid useEffect**: use it sparingly and if you use it, you must have a valid use-case
- **Functional components with TypeScript** - always type props
- **Named exports** (not default exports)
- **Single responsibility** - split by concern, avoid "god components"
- **Container/Presenter pattern** for data vs UI separation. Do not mix forms and data-fetching in the same component. Fetch data, then pass it down to other components.

```tsx
// ❌ BAD - Business logic mixed in component
function PriceCalculator({ items }: { items: Item[] }) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Complex calculation logic in component - WRONG!
    let sum = 0;
    for (const item of items) {
      sum += item.price * (1 - item.discount) * (1 + item.tax);
    }
    setTotal(sum);
  }, [items]);

  return <div>Total: ${total}</div>;
}

// ✅ GOOD - Business logic extracted to utils
import { calculateTotal } from "@kit/pricing/utils";

function PriceCalculator({ items }: { items: Item[] }) {
  const total = calculateTotal(items); // Pure function from utils
  return <div>Total: ${total}</div>;
}
```

**Component Import Rules:**

```typescript
// ✅ CORRECT - Client-side only
// @apps/app/src/pages/dashboard.tsx
import { MyWidget } from "@kit/my-feature/components";

// ❌ FORBIDDEN - Server importing client code
// @apps/api/app/routes.ts
import { MyWidget } from "@kit/my-feature/components"; // NEVER!
```

Never ever resort to cheap hacks for typechecking such as using "any" unless absolutely required.

## Database Architecture & Security

### Supamode Schema

The application uses a comprehensive `supamode` schema with:

- **Accounts**: Link Supabase Auth users to Supamode accounts
- **Roles**: Hierarchical role system with rank levels
- **Permissions**: System and data permissions with scopes (table, column)
- **Permission Groups**: Bulk permission management
- **Account Roles**: Many-to-many with role assignments
- **Audit Logs**: Comprehensive activity tracking
- **Table Metadata**: Dynamic table/column configuration
- **Saved Views**: User-created filtered views

### Row Level Security (RLS)

- **ALL tables have RLS enabled** unless explicitly stated otherwise
- **Use existing helper functions** for access control:
  - `supamode.has_admin_permission()` for system permissions
  - `supamode.has_data_permission()` for data access
  - `supamode.can_action_account()` for account operations
  - `supamode.check_admin_access()` for JWT validation

### Security Principles

- **Never compromise on security** - it's paramount
- **Use explicit schema references** (e.g., `supamode.accounts`)
- **Validate all inputs** with `supamode.sanitize_identifier()`
- **Implement proper audit logging** for all mutations
- **Consider privilege escalation** in all permission checks

### Database Operations

```sql
-- Example: Always use helper functions
CREATE POLICY select_table ON my_schema.my_table FOR SELECT
USING (supamode.has_data_permission(auth.uid(), 'select', 'my_schema', 'my_table'));
```

## Component & UI Patterns

### Styling with Tailwind CSS v4

- **Use `cn` utility** from `@kit/ui/utils` for class merging
- **Prefer semantic classes** (`bg-background`, `text-muted-foreground`) over fixed colors
- **Use Shadcn design tokens** for consistency

```tsx
import { cn } from "@kit/ui/utils";

<button
  className={cn("btn", className, {
    "text-lg": isLarge,
    "bg-primary": isPrimary,
  })}
>
  Submit
</button>;
```

### Conditional Rendering

- **Use `If` component** instead of ternary operators for complex conditions
- **Supports type inference** when condition value is used

```tsx
import { If } from '@kit/ui/if';

<If condition={user}>
  {(userData) => <UserProfile data={userData} />}
</If>

<If condition={isLoading} fallback={<Content />}>
  <Spinner />
</If>
```

### UI Component Imports

```tsx
// Shadcn UI components
import { Button } from "@kit/ui/button";
import { Card } from "@kit/ui/card";
import { DataTable } from "@kit/ui/data-table";

// Makerkit-specific components
import { If } from "@kit/ui/if";
import { Trans } from "@kit/ui/trans";
import { ProfileAvatar } from "@kit/ui/profile-avatar";
```

### Error Handling Patterns

```tsx
// Loading state
<If condition={isLoading}>
  <div className="flex justify-center p-8">
    <Spinner />
  </div>
</If>

// Error state with type inference
<If condition={error}>
  {(err) => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        <Trans i18nKey="common:errorTitle" />
      </AlertTitle>
      <AlertDescription>{err.message}</AlertDescription>
    </Alert>
  )}
</If>
```

## Development Commands

### Core Commands

```bash
pnpm dev                    # Start all development servers
pnpm lint:fix              # Fix linting issues
pnpm typecheck             # Type check all packages
pnpm format:fix            # Format and fix code
```

### Supabase Commands

````bash
pnpm supabase:web:start    # Start local Supabase instance
pnpm supabase:web:stop     # Stop local Supabase instance
pnpm supabase:web:reset    # Reset local database with seeds
pnpm supabase:web:typegen  # Generate TypeScript types from database
pnpm supabase:web:test     # Run database tests

### Testing Commands

```bash
pnpm --filter e2e test     # Run E2E tests
pnpm run test:unit         # Run unit Tests
````

## TypeScript Best Practices

### Type Safety

- **Avoid `any`** - use `unknown` if necessary
- **Use implicit type inference** when possible
- **Strict type validation** with Zod for API boundaries
- **Descriptive names** for variables, functions, and classes

### Service Class Pattern

```typescript
// Export function, not class
class TableMetadataService {
  async getTableMetadata(schema: string, table: string) {
    // Implementation with Drizzle
  }
}

export function createTableMetadataService() {
  return new TableMetadataService();
}
```

## Feature Package Structure & Export Separation (CRITICAL)

### Package Structure

Each feature package follows this strict structure:

```
packages/features/my-feature/
├── src/
│   ├── api/                # SERVER-ONLY CODE
│   │   ├── routes/         # Hono API routes (thin)
│   │   └── services/       # Backend service classes (thin)
│   ├── components/         # CLIENT-ONLY CODE
│   │   └── index.ts        # React component exports (thin UI only)
│   ├── hooks/              # CLIENT-ONLY CODE
│   │   └── index.ts        # React hooks exports (thin)
│   ├── schemas/            # SHARED CODE
│   │   └── index.ts        # Zod validation schemas
│   ├── types/              # SHARED CODE
│   │   └── index.ts        # TypeScript types
│   ├── utils/              # SHARED CODE (pure functions) - HEAVY LOGIC HERE
│   │   ├── __tests__/      # Vitest tests for business logic
│   │   ├── calculations.ts # Complex algorithms and business logic
│   │   ├── processors.ts   # Data processing functions
│   │   └── index.ts        # Utility function exports
│   ├── loaders.ts          # CLIENT-ONLY (React Router loaders)
│   └── router.ts           # CLIENT-ONLY (React Router config)
├── package.json            # MUST have proper exports
└── README.md
```

### Critical Export Patterns (NEVER MIX CLIENT/SERVER)

**MANDATORY** `package.json` exports structure:

```json
{
  "name": "@kit/my-feature",
  "exports": {
    "./router": "./src/router.ts", // CLIENT: React Router config
    "./routes": "./src/api/routes/index.ts", // SERVER: Hono API routes
    "./components": "./src/components/index.ts", // CLIENT: React components
    "./hooks": "./src/hooks/index.ts", // CLIENT: React hooks
    "./schemas": "./src/schemas/index.ts", // SHARED: Zod schemas
    "./types": "./src/types/index.ts", // SHARED: TypeScript types
    "./utils": "./src/utils/index.ts" // SHARED: Pure functions
  }
}
```

### Import Safety Rules (ENFORCE STRICTLY)

```typescript
// ✅ CORRECT - Explicit, separated imports
import { MyComponent } from "@kit/my-feature/components"; // CLIENT
import { registerRoutes } from "@kit/my-feature/routes"; // SERVER
import { MySchema } from "@kit/my-feature/schemas"; // SHARED
import { calculatePrice, processData } from "@kit/my-feature/utils"; // SHARED LOGIC
import type { MyType } from "@kit/my-feature/types"; // SHARED

// ❌ FORBIDDEN - These will cause security/bundle issues
import { MyComponent } from "@kit/my-feature"; // MIXED
import { MyComponent } from "@kit/my-feature/src/components"; // BYPASS
import { registerRoutes } from "@kit/my-feature/components"; // WRONG CONTEXT
```

## Security Checklist

When adding new features:

- [ ] **RLS policies** implemented and tested
- [ ] **Permission checks** using helper functions
- [ ] **Input validation** with `sanitize_identifier()`
- [ ] **Audit logging** for all mutations
- [ ] **Type safety** with proper TypeScript interfaces
- [ ] **Error handling** with user-friendly messages
- [ ] **Access control** follows role hierarchy

## Database Management

### Schema Changes

1. Edit schema files in `apps/web/supabase/schemas`
2. Run `pnpm --filter web supabase:db:diff` to create migration
3. Run `pnpm --filter web supabase:db:reset` to apply changes
4. Run `pnpm supabase:web:typegen` to regenerate types

### Database

- **Always enable RLS** on new tables unless explicitly instructed otherwise
- **NEVER use SECURITY DEFINER functions** without explicit access controls - they bypass RLS entirely
- **Use locks if required**: Database locks prevent race conditions and timing attacks in concurrent operations. Make sure to take these into account for all database operations.

## Development Workflow

1. **Setup**: Run `pnpm supabase:web:start` to start local Supabase
2. **Development**: Run `pnpm dev` for all development servers
3. **Schema Changes**: Follow database management process above
4. **Feature Development**: Follow the 5-step pattern (Service → Loader → RPC → Router → Actions)
5. **Testing**: Run `pnpm --filter e2e test` before major changes
6. **Code Quality**: Always run `pnpm lint` and `pnpm typecheck`
7. **Database Tests**: run `pnpm run supabase:web:test`. Tests can be found at `apps/web/supabase/tests`

## Important Files & Patterns

### Configuration

- @turbo.json: Turborepo build configuration
- `apps/app/supabase/config.toml`: Supabase local configuration
- `apps/app/vite.config.ts`: Vite frontend build configuration

### Database

- `apps/app/supabase/migrations/20250418034029_schema.sql`: Core Supamode schema
- `packages/supabase/src/database.types.ts`: Autogenerated database types (never update directly)
- `packages/supabase/src/clients/drizzle-client.ts`: Drizzle client setup

### Example Implementation Files

- `packages/features/settings/src/api/services/table-metadata.service.ts`: Service pattern
- `packages/features/settings/src/loaders.ts`: Loader pattern
- `packages/features/settings/src/actions/update-columns-metadata-action.ts`: RPC action pattern
- `apps/api/app/routes/index.ts`: API registration

### Testing Attributes

Add data attributes for E2E testing:

```tsx
<button data-testid="submit-button">Submit</button>
<div data-testid="user-profile" data-user-id={user.id}>Content</div>
```

## CLIENT/SERVER SEPARATION GUARDRAILS (CRITICAL)

### Absolute Rules - NEVER BREAK THESE

1. **NEVER** import server code (`/routes`) in client files (@apps/app/\*\*, components/, hooks/)
2. **NEVER** import client code (`/components`, `/hooks`) in server files (@apps/api/\*\*)
3. **NEVER** use a package's root export (e.g., `@kit/my-feature`) - always use specific paths
4. **ALWAYS** use type-only imports for types: `import type { Type } from '@kit/pkg/types'`
5. **NEVER** put database clients, services, or Hono code in shared exports

### Safe Import Matrix

| Context                   | ✅ Can Import                                           | ❌ Never Import           |
| ------------------------- | ------------------------------------------------------- | ------------------------- |
| **Client (@apps/app/\*)** | `/components`, `/hooks`, `/types`, `/schemas`, `/utils` | `/routes`, `/services`    |
| **Server (@apps/api/\*)** | `/routes`, `/types`, `/schemas`, `/utils`               | `/components`, `/hooks`   |
| **Vitest Tests**          | `/utils`, `/types`, `/schemas` (pure functions only)    | `/components`, `/routes`  |
| **Both**                  | `/types` (type-only), `/schemas`, `/utils`              | Root exports (`@kit/pkg`) |

### Validation Commands

Run these to catch violations:

```bash
# Check for forbidden client/server mixing
pnpm run lint:fix                           # ESLint rules catch most issues
pnpm run typecheck                      # TypeScript catches import errors
pnpm run format:fix                     # Ensure files are formatted
```

## Logic Separation & Testing Strategy (CRITICAL)

### Pure Functions in `/utils` - The Heart of Testable Code

**ALL complex algorithms, calculations, and business logic MUST live in `/utils`** as pure functions that NEVER cross network boundaries:

```typescript
// ✅ CORRECT - Pure functions in utils (no network/DB calls)
// @packages/features/pricing/src/utils/calculations.ts

export function calculateDiscount(
  price: number,
  discountPercent: number
): number {
  return price * (discountPercent / 100);
}

export function calculateTax(amount: number, taxRate: number): number {
  return amount * taxRate;
}

export function processOrderTotal(items: OrderItem[]): OrderSummary {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discount = calculateDiscount(subtotal, 10);
  const tax = calculateTax(subtotal - discount, 0.08);

  return {
    subtotal,
    discount,
    tax,
    total: subtotal - discount + tax,
  };
}

// ❌ WRONG - Network calls don't belong in utils
export async function calculateUserScore(userId: string) {
  const user = await fetch(`/api/users/${userId}`); // NO! Network boundary violation
  return user.score * 1.5;
}

// ✅ CORRECT - Pure logic only
export function calculateUserScore(user: User): number {
  return user.baseScore * 1.5 + user.bonusPoints; // Pure calculation
}
```

**Service orchestrates, Utils compute:**

```typescript
// @packages/features/scoring/src/api/services/user.service.ts
import { calculateUserScore } from "../../../utils/scoring";

class UserService {
  async getUserScore(userId: string): Promise<number> {
    const user = await this.getUser(userId); // Service: network/DB
    return calculateUserScore(user); // Utils: pure logic
  }
}
```

### Vitest Testing (MANDATORY for Complex Logic)

**EVERY function in `/utils` with complex logic MUST have Vitest tests:**

```typescript
// @packages/features/pricing/src/utils/__tests__/calculations.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateDiscount,
  calculateTax,
  processOrderTotal,
} from "../calculations";

describe("calculateDiscount", () => {
  it("calculates 10% discount correctly", () => {
    expect(calculateDiscount(100, 10)).toBe(10);
  });

  it("handles zero discount", () => {
    expect(calculateDiscount(100, 0)).toBe(0);
  });
});

describe("processOrderTotal", () => {
  it("processes complete order with tax and discount", () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 20, quantity: 1 },
    ];

    const result = processOrderTotal(items);

    expect(result.subtotal).toBe(40);
    expect(result.discount).toBe(4); // 10%
    expect(result.tax).toBe(2.88); // 8% of (40-4)
    expect(result.total).toBe(38.88);
  });
});
```

### Architecture Boundaries & Responsibilities

**Services (Network/Database Boundary)**:

- Handle database operations with Drizzle
- Manage external API calls
- Orchestrate data flow between network and logic
- **NEVER** contain complex algorithms or business logic
- **ALWAYS** delegate heavy computations to `/utils`

**Utils (Pure Logic)**:

- Complex algorithms and calculations
- Data transformations and processing
- Business rules and validation logic
- **NEVER** make network calls or database queries
- **ALWAYS** pure functions that can be tested in isolation

### Testing Strategy: Light vs Heavy

**Light Code (NO Vitest needed):**

- React components (just UI rendering)
- Hono routes (just HTTP handling)
- Services (just database/network calls)
- **Testing**: E2E tests cover these adequately

**Heavy Code (MUST have Vitest):**

- Algorithms and calculations in `/utils`
- Data transformations and processing
- Complex business logic and rules
- Pure functions with conditional logic
- **Testing**: Unit tests with 90%+ coverage

## Common Gotchas

1. **LOGIC SEPARATION** - Most critical. Extract algorithms to `/utils` and test with Vitest
2. **CLIENT/SERVER SEPARATION** - Use proper package exports only
3. **Always enable RLS** on new tables unless explicitly documented otherwise
4. **Use helper functions** for permission checks, don't write custom RLS logic
5. **Follow the service → loader → RPC → router pattern** for all features
6. **Generate types** after schema changes with `pnpm supabase:web:typegen`
7. **Test RLS policies** thoroughly - security bugs are the worst kind
8. **Use `cn` utility** for className merging, not manual string concatenation
9. **Import from package exports** (`@kit/ui/button`) not relative paths
10. **Use `@kit/query-builder` for all SQL generation** - don't create duplicate query building logic
11. **Type-only imports** - Use `import type` for TypeScript types to avoid runtime imports

# Critical Security & Architecture Reminders

## CLIENT/SERVER SEPARATION (MOST IMPORTANT)

- **NEVER** import `/routes` (server) in client code (@apps/app/\*\*, components/, hooks/)
- **NEVER** import `/components` or `/hooks` (client) in server code (@apps/api/\*\*)
- **ALWAYS** use specific package exports: `/components`, `/hooks`, `/routes`, `/types`, `/schemas`, `/utils`
- **NEVER** use root package imports (`@kit/pkg`) - always use sub-paths
- **VALIDATE** imports with `pnpm lint && pnpm typecheck` before any code changes

## File Creation Rules

- **NEVER** create files unless absolutely necessary for the goal
- **ALWAYS** prefer editing existing files over creating new ones
- **NEVER** proactively create documentation files (\*.md) or README files
- **ONLY** create documentation if explicitly requested by the User
- **FOLLOW** existing package structure patterns exactly
