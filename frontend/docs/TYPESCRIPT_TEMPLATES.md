# TypeScript React Component Templates

## Basic Functional Component Template

```typescript
import React, { useState, useEffect } from 'react';

// Props interface
interface ComponentNameProps {
  required: string;
  optional?: number;
  onAction?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

// Local state interfaces
interface ComponentState {
  data: string;
  loading: boolean;
  error: string | null;
}

const ComponentName = ({ 
  required,
  optional = 0,
  onAction,
  children,
  className = '',
}: ComponentNameProps): JSX.Element => {
  const [state, setState] = useState<ComponentState>({
    data: '',
    loading: false,
    error: null,
  });

  // Type-safe effect with cleanup
  useEffect(() => {
    let isMounted = true;

    const fetchData = async (): Promise<void> => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // Simulated async operation
        const result = await someAsyncOperation(required);
        
        if (isMounted) {
          setState(prev => ({ ...prev, data: result, loading: false }));
        }
      } catch (error) {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          }));
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [required]);

  // Type-safe event handler
  const handleAction = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    onAction?.(state.data);
  };

  // Loading state
  if (state.loading) {
    return <div className="loading">Loading...</div>;
  }

  // Error state
  if (state.error) {
    return <div className="error">Error: {state.error}</div>;
  }

  return (
    <div className={`component-name ${className}`}>
      <h2>{required}</h2>
      {optional > 0 && <span>Count: {optional}</span>}
      <button type="button" onClick={handleAction}>
        Trigger Action
      </button>
      {children}
    </div>
  );
};

// Async operation example
const someAsyncOperation = async (input: string): Promise<string> => {
  // Simulated API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `Processed: ${input}`;
};

export default ComponentName;
export type { ComponentNameProps };
```

## Generic Component Template

```typescript
import React from 'react';

// Generic props interface
interface GenericListProps<TItem> {
  items: TItem[];
  onSelect: (item: TItem) => void;
  renderItem: (item: TItem, index: number) => React.ReactNode;
  keyExtractor: (item: TItem) => string | number;
  emptyMessage?: string;
  className?: string;
}

// Generic component with constraints
function GenericList<TItem extends { id: string | number }>({
  items,
  onSelect,
  renderItem,
  keyExtractor,
  emptyMessage = 'No items found',
  className = '',
}: GenericListProps<TItem>): JSX.Element {
  // Type guard for item validation
  const isValidItem = (item: unknown): item is TItem => {
    return typeof item === 'object' && item !== null && 'id' in item;
  };

  // Filter valid items
  const validItems = items.filter(isValidItem);

  if (validItems.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <ul className={`generic-list ${className}`}>
      {validItems.map((item, index) => (
        <li
          key={keyExtractor(item)}
          className="list-item"
          onClick={() => onSelect(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelect(item);
            }
          }}
        >
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

export default GenericList;
export type { GenericListProps };
```

## Custom Hook Template

```typescript
import { useState, useEffect, useCallback } from 'react';

// Hook configuration interface
interface UseApiConfig {
  immediate?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

// Hook return type
interface UseApiReturn<TData> {
  data: TData | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<void>;
  reset: () => void;
}

// API function type
type ApiFunction<TData> = () => Promise<TData>;

// Custom hook with generics
function useApi<TData>(
  apiFunction: ApiFunction<TData>,
  config: UseApiConfig = {}
): UseApiReturn<TData> {
  const { immediate = false, retryCount = 0, retryDelay = 1000 } = config;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Type-safe execute function
  const execute = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await apiFunction();
        setData(result);
        setLoading(false);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    setError(lastError?.message || 'Request failed');
    setLoading(false);
  }, [apiFunction, retryCount, retryDelay]);

  // Reset function
  const reset = useCallback((): void => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  // Execute immediately if configured
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

export default useApi;
export type { UseApiConfig, UseApiReturn };
```

## Context Provider Template

```typescript
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// State interface
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  settings: UserSettings;
}

// Action types with discriminated union
type AppAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> };

// Supporting types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface UserSettings {
  notifications: boolean;
  language: string;
  timezone: string;
}

// Context interfaces
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

// Initial state
const initialState: AppState = {
  user: null,
  theme: 'light',
  settings: {
    notifications: true,
    language: 'en',
    timezone: 'UTC',
  },
};

// Reducer with proper typing
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
      };
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    default:
      return state;
  }
};

// Create contexts
const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider props interface
interface AppProviderProps {
  children: ReactNode;
}

// Provider component
export const AppProvider = ({ children }: AppProviderProps): JSX.Element => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value: AppContextValue = {
    state,
    dispatch,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook with type safety
export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  
  return context;
};

// Convenient hooks for specific parts of state
export const useUser = (): User | null => {
  const { state } = useAppContext();
  return state.user;
};

export const useTheme = (): [AppState['theme'], (theme: AppState['theme']) => void] => {
  const { state, dispatch } = useAppContext();
  
  const setTheme = (theme: AppState['theme']): void => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };
  
  return [state.theme, setTheme];
};

// Export types for use in other components
export type { AppState, AppAction, User, UserSettings };
```

## Error Boundary with TypeScript

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

// Props interface
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// State interface
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Call the optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
            <br />
            {this.state.error?.stack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
export type { ErrorBoundaryProps };
```

## Form Component with Validation

```typescript
import React, { useState, useCallback } from 'react';

// Form data interface
interface FormData {
  name: string;
  email: string;
  age: number;
  terms: boolean;
}

// Validation errors interface
interface ValidationErrors {
  name?: string;
  email?: string;
  age?: string;
  terms?: string;
}

// Component props
interface FormComponentProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: Partial<FormData>;
}

const FormComponent = ({ 
  onSubmit, 
  initialData = {} 
}: FormComponentProps): JSX.Element => {
  const [formData, setFormData] = useState<FormData>({
    name: initialData.name || '',
    email: initialData.email || '',
    age: initialData.age || 0,
    terms: initialData.terms || false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Validation function
  const validateForm = useCallback((data: FormData): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!data.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (data.age < 18) {
      newErrors.age = 'Must be at least 18 years old';
    }

    if (!data.terms) {
      newErrors.terms = 'You must accept the terms';
    }

    return newErrors;
  }, []);

  // Handle input changes with proper typing
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const { name, value, type, checked } = event.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));

    // Clear error for this field
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle form submission
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    
    const validationErrors = validateForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" className="error">
            {errors.name}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <span id="email-error" className="error">
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="age">Age:</label>
        <input
          type="number"
          id="age"
          name="age"
          value={formData.age}
          onChange={handleInputChange}
          min="0"
          aria-invalid={!!errors.age}
          aria-describedby={errors.age ? 'age-error' : undefined}
        />
        {errors.age && (
          <span id="age-error" className="error">
            {errors.age}
          </span>
        )}
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            name="terms"
            checked={formData.terms}
            onChange={handleInputChange}
            aria-invalid={!!errors.terms}
            aria-describedby={errors.terms ? 'terms-error' : undefined}
          />
          I accept the terms and conditions
        </label>
        {errors.terms && (
          <span id="terms-error" className="error">
            {errors.terms}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};

export default FormComponent;
export type { FormComponentProps, FormData };
```