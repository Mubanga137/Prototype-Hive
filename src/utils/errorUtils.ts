/**
 * Safely serialize any error object to a readable format
 */
export function serializeError(error: any): {
  message: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
  statusCode?: number;
} {
  if (!error) {
    return { message: 'Unknown error' };
  }

  // Handle Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      status: (error as any).status,
      details: (error as any).details,
      hint: (error as any).hint,
    };
  }

  // Handle Supabase error responses
  if (typeof error === 'object') {
    return {
      message: error.message || JSON.stringify(error),
      code: error.code,
      status: error.status,
      details: error.details,
      hint: error.hint,
      statusCode: error.statusCode,
    };
  }

  // Handle strings
  if (typeof error === 'string') {
    return { message: error };
  }

  // Fallback
  return { message: String(error) };
}

/**
 * Get a user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const serialized = serializeError(error);

  // Handle specific error codes
  if (serialized.code === 'PGRST204') {
    return 'Server validation error. Please try refreshing and try again.';
  }

  if (serialized.status === 400) {
    if (serialized.message?.includes('customer')) {
      return 'Customer information is missing. Please fill in all required fields.';
    }
    if (serialized.message?.includes('column')) {
      return 'Server is having trouble processing your order. Please try again in a moment.';
    }
    return 'Invalid request. Please check your information and try again.';
  }

  if (serialized.status === 401 || serialized.code === '42501') {
    return 'You do not have permission to place this order. Please log in or try again.';
  }

  if (serialized.status === 403) {
    return 'Access denied. Please make sure you are logged in.';
  }

  if (serialized.status === 500) {
    return 'Server error. Please try again shortly.';
  }

  // Return the actual error message if available
  if (serialized.message) {
    return serialized.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log checkout error with full details
 */
export function logCheckoutError(error: any, payload?: any) {
  const serialized = serializeError(error);
  
  console.error('[Checkout Error]', {
    ...serialized,
    payload,
    timestamp: new Date().toISOString(),
  });

  return serialized;
}
