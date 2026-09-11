# TypeScript Types and Patterns

## Core Type Definitions

### API Response Types

```typescript
// Generic API response wrapper
interface ApiResponse<TData> {
  success: boolean;
  data: TData;
  message?: string;
  timestamp: string;
}

// Error response type
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

// Paginated response
interface PaginatedResponse<TItem> {
  items: TItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API status types
type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

// HTTP methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// API request configuration
interface ApiConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}
```

### Form and Validation Types

```typescript
// Generic form field type
interface FormField<TValue = string> {
  value: TValue;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

// Form state with validation
interface FormState<TData extends Record<string, unknown>> {
  fields: {
    [K in keyof TData]: FormField<TData[K]>;
  };
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

// Validation rule types
type ValidationRule<TValue> = (value: TValue) => string | undefined;
type ValidationRules<TData> = {
  [K in keyof TData]?: ValidationRule<TData[K]>[];
};

// Form submission result
type FormSubmissionResult<TData> = 
  | { success: true; data: TData }
  | { success: false; errors: Partial<Record<keyof TData, string>> };
```

### Component Prop Patterns

```typescript
// Base component props that most components should extend
interface BaseComponentProps {
  className?: string;
  testId?: string;
  children?: React.ReactNode;
}

// Props with forwarded ref
type PropsWithRef<P, T = HTMLDivElement> = P & {
  ref?: React.Ref<T>;
};

// Polymorphic component props (can be different HTML elements)
type PolymorphicComponentProps<T extends keyof JSX.IntrinsicElements> = {
  as?: T;
} & JSX.IntrinsicElements[T];

// Component with different variants
interface ComponentVariant {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'small' | 'medium' | 'large';
}

// Props that accept either a value or a function that returns a value
type ValueOrFunction<T, TArgs extends unknown[] = []> = T | ((...args: TArgs) => T);

// Render prop pattern
interface RenderPropPattern<TData> {
  children: (data: TData) => React.ReactNode;
  render?: (data: TData) => React.ReactNode;
}
```

### State Management Types

```typescript
// Generic action creator
interface Action<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload: TPayload;
  meta?: Record<string, unknown>;
}

// Reducer type
type Reducer<TState, TAction extends Action> = (
  state: TState,
  action: TAction
) => TState;

// Async action states
interface AsyncState<TData = unknown, TError = string> {
  data: TData | null;
  loading: boolean;
  error: TError | null;
  lastFetch?: Date;
}

// Context provider value pattern
interface ContextValue<TState, TActions = Record<string, unknown>> {
  state: TState;
  actions: TActions;
}

// Store slice pattern (for state management libraries)
interface StoreSlice<TName extends string, TState, TActions> {
  name: TName;
  initialState: TState;
  actions: TActions;
  selectors: Record<string, (state: TState) => unknown>;
}
```

### Utility Types and Helpers

```typescript
// Make specific properties required
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Make specific properties optional
type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Deep partial (makes all nested properties optional)
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Extract function parameters
type ExtractParams<T> = T extends (...args: infer P) => unknown ? P : never;

// Extract promise type
type ExtractPromise<T> = T extends Promise<infer P> ? P : T;

// Brand types for domain-specific values
type Brand<T, TBrand> = T & { readonly __brand: TBrand };
type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;
type Timestamp = Brand<number, 'Timestamp'>;

// Non-empty array type
type NonEmptyArray<T> = [T, ...T[]];

// Exact type (prevents excess properties)
type Exact<T, U extends T> = T & Record<Exclude<keyof U, keyof T>, never>;

// Function that returns a cleanup function
type CleanupFunction = () => void;
type EffectCallback = () => void | CleanupFunction;
```

### Event Handler Types

```typescript
// Common React event types
type ClickHandler<T = HTMLButtonElement> = (event: React.MouseEvent<T>) => void;
type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
type SubmitHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void;
type KeyboardHandler<T = HTMLElement> = (event: React.KeyboardEvent<T>) => void;
type FocusHandler<T = HTMLElement> = (event: React.FocusEvent<T>) => void;

// Custom event handlers
type SelectHandler<T> = (item: T) => void;
type ToggleHandler = (isOpen: boolean) => void;
type ErrorHandler = (error: Error) => void;
type AsyncHandler<T = void> = () => Promise<T>;

// Event handler with additional data
type DataHandler<TData, TEvent = React.MouseEvent> = (
  data: TData,
  event: TEvent
) => void;
```

### Data Fetching Types

```typescript
// Query parameters for API calls
interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

// Resource with CRUD operations
interface ResourceOperations<TEntity, TCreateInput, TUpdateInput> {
  getAll: (params?: QueryParams) => Promise<PaginatedResponse<TEntity>>;
  getById: (id: string) => Promise<TEntity>;
  create: (input: TCreateInput) => Promise<TEntity>;
  update: (id: string, input: TUpdateInput) => Promise<TEntity>;
  delete: (id: string) => Promise<void>;
}

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate: boolean;
  maxAge: number;
  tags: string[];
}

// Data loading states
type LoadingState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: unknown }
  | { status: 'error'; error: string };
```

### Component Composition Types

```typescript
// Higher-order component type
type HOC<TInjectedProps, TOriginalProps = {}> = <P extends TInjectedProps>(
  Component: React.ComponentType<P>
) => React.ComponentType<Omit<P, keyof TInjectedProps> & TOriginalProps>;

// Render props component
interface RenderPropsComponent<TProps> {
  (props: TProps): React.ReactElement | null;
}

// Compound component pattern
interface CompoundComponent<TProps> extends React.FC<TProps> {
  Header: React.FC<{ children: React.ReactNode }>;
  Body: React.FC<{ children: React.ReactNode }>;
  Footer: React.FC<{ children: React.ReactNode }>;
}

// Slot-based component pattern
interface SlotProps {
  slot?: string;
  children: React.ReactNode;
}

// Component with slots
interface ComponentWithSlots<TSlots extends string> {
  slots: Record<TSlots, React.ReactNode>;
  children?: React.ReactNode;
}
```

### Domain-Specific Types

```typescript
// User and authentication types
interface User {
  id: UserId;
  email: Email;
  name: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type UserRole = 'admin' | 'moderator' | 'user' | 'guest';

interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

// Authentication state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  refreshToken: string | null;
  expiresAt: Timestamp | null;
}

// Application configuration
interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: Record<string, boolean>;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    mode: 'light' | 'dark' | 'auto';
  };
  analytics: {
    enabled: boolean;
    trackingId?: string;
  };
}
```

### Error Types and Result Patterns

```typescript
// Custom error classes
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Result pattern for error handling
type Result<TData, TError = Error> =
  | { success: true; data: TData }
  | { success: false; error: TError };

// Maybe/Option type for nullable values
type Maybe<T> = T | null | undefined;
type Option<T> = T | null;

// Either type for two possible outcomes
type Either<TLeft, TRight> =
  | { type: 'left'; value: TLeft }
  | { type: 'right'; value: TRight };

// Try-catch wrapper type
type Try<T> = Either<Error, T>;
```

### Testing Types

```typescript
// Mock function types
type MockFn<TArgs extends unknown[] = unknown[], TReturn = unknown> = 
  jest.MockedFunction<(...args: TArgs) => TReturn>;

// Test render options
interface TestRenderOptions {
  initialProps?: Record<string, unknown>;
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  queries?: Record<string, unknown>;
}

// Test utilities
interface TestUtils {
  rerender: (props?: Record<string, unknown>) => void;
  unmount: () => void;
  debug: (element?: HTMLElement) => void;
}

// Component test props
type TestProps<T> = Partial<T> & {
  'data-testid'?: string;
};
```

### Performance and Optimization Types

```typescript
// Lazy loading component
type LazyComponent<P = {}> = React.LazyExoticComponent<React.ComponentType<P>>;

// Memoized component props
interface MemoProps {
  areEqual?: (prevProps: any, nextProps: any) => boolean;
}

// Virtual list item
interface VirtualListItem {
  id: string | number;
  height?: number;
  data: unknown;
}

// Intersection observer options
interface ObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
}
```

## Type Guards and Validation

```typescript
// Basic type guards
const isString = (value: unknown): value is string => 
  typeof value === 'string';

const isNumber = (value: unknown): value is number => 
  typeof value === 'number' && !isNaN(value);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);

// Branded type guards
const isUserId = (value: string): value is UserId => {
  // Add validation logic here
  return /^user_[a-z0-9]+$/.test(value);
};

const isEmail = (value: string): value is Email => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

// Complex type guards
const isUser = (value: unknown): value is User => {
  return (
    isObject(value) &&
    'id' in value &&
    'email' in value &&
    'name' in value &&
    isString(value.id) &&
    isString(value.email) &&
    isString(value.name)
  );
};

// API response type guard
const isApiResponse = <T>(
  value: unknown,
  dataGuard: (data: unknown) => data is T
): value is ApiResponse<T> => {
  return (
    isObject(value) &&
    'success' in value &&
    'data' in value &&
    typeof value.success === 'boolean' &&
    (value.success ? dataGuard(value.data) : true)
  );
};
```

## Utility Functions with Types

```typescript
// Safe property access
const safeGet = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): T[K] | undefined => {
  return obj?.[key];
};

// Type-safe array filtering
const filterDefined = <T>(array: (T | null | undefined)[]): T[] => {
  return array.filter((item): item is T => item !== null && item !== undefined);
};

// Debounce function with proper typing
const debounce = <TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  delay: number
): ((...args: TArgs) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: TArgs) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Type-safe omit function
const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

// Type-safe pick function
const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};
```