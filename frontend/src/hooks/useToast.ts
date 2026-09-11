import toast, { type ToastOptions } from 'react-hot-toast';

const colors = {
  success:  { bg: '#52c41a', text: '#fff' },
  error:    { bg: '#ef4444', text: '#fff' },
  info:     { bg: '#3b82f6', text: '#fff' },
  warning:  { bg: '#f59e0b', text: '#000' },
  loading:  { bg: '#6b7280', text: '#fff' },
} as const;

export interface CustomToastOptions extends Partial<ToastOptions> {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export interface ToastMethods {
  success: (message: string, options?: CustomToastOptions) => string;
  error: (message: string, options?: CustomToastOptions) => string;
  info: (message: string, options?: CustomToastOptions) => string;
  warning: (message: string, options?: CustomToastOptions) => string;
  loading: (message: string, options?: CustomToastOptions) => string;
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => Promise<T>;
  dismiss: (toastId?: string) => void;
  dismissAll: () => void;
  custom: (jsx: React.ReactNode, options?: CustomToastOptions) => string;
}

export const useToast = (defaultOptions?: CustomToastOptions): ToastMethods => {
  const mergeOptions = (options?: CustomToastOptions): CustomToastOptions => ({
    duration: 4000,
    ...defaultOptions,
    ...options,
  });

  const makeStyle = (key: keyof typeof colors, extra?: CustomToastOptions) => ({
    background: colors[key].bg,
    color: colors[key].text,
    fontWeight: '500',
    borderRadius: '8px',
    ...extra?.style,
  });

  const success = (message: string, options?: CustomToastOptions): string =>
    toast.success(message, { ...mergeOptions(options), style: makeStyle('success', options) });

  const error = (message: string, options?: CustomToastOptions): string =>
    toast.error(message, { ...mergeOptions(options), duration: 5000, style: makeStyle('error', options) });

  const info = (message: string, options?: CustomToastOptions): string =>
    toast(message, { ...mergeOptions(options), icon: 'ℹ️', style: makeStyle('info', options) });

  const warning = (message: string, options?: CustomToastOptions): string =>
    toast(message, { ...mergeOptions(options), icon: '⚠️', style: makeStyle('warning', options) });

  const loading = (message: string, options?: CustomToastOptions): string =>
    toast.loading(message, { ...mergeOptions(options), duration: Infinity, style: makeStyle('loading', options) });

  const promise = <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ): Promise<T> => {
    return toast.promise(promise, options);
  };

  const dismiss = (toastId?: string): void => {
    toast.dismiss(toastId);
  };

  const dismissAll = (): void => {
    toast.dismiss();
  };

  const custom = (jsx: React.ReactNode, options?: CustomToastOptions): string => {
    return toast.custom(jsx as string, mergeOptions(options));
  };

  return {
    success,
    error,
    info,
    warning,
    loading,
    promise,
    dismiss,
    dismissAll,
    custom,
  };
};