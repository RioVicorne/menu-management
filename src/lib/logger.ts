// Simple logger utility to replace console statements
function formatLogArg(value: unknown): unknown {
  if (!value) return value;
  // Errors: prefer stack, then message
  if (value instanceof Error) {
    return value.stack || value.message;
  }
  // Objects with a message property (e.g., Supabase/PostgrestError-like)
  // Avoid logging as {} by extracting key fields
  const v = value as Record<string, unknown>;
  if (typeof value === 'object' && 'message' in (v || {})) {
    const msg = String(v.message ?? '');
    const code = 'code' in v ? ` [code=${String(v.code)}]` : '';
    const details = 'details' in v && v.details ? ` | details: ${String(v.details)}` : '';
    return `${msg}${code}${details}`;
  }
  // Fallback: stringify safely
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value;
}

export const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      const formatted = args.map(formatLogArg);
      // eslint-disable-next-line no-console
      console.error(message, ...formatted);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      const formatted = args.map(formatLogArg);
      // eslint-disable-next-line no-console
      console.warn(message, ...formatted);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      const formatted = args.map(formatLogArg);
      // eslint-disable-next-line no-console
      console.info(message, ...formatted);
    }
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      const formatted = args.map(formatLogArg);
      // eslint-disable-next-line no-console
      console.debug(message, ...formatted);
    }
  },
};
