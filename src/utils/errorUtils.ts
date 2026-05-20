/**
 * Safely serialize any error object to a readable format
 */
export function serializeError(error: any): Record<string, any> {
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
      statusCode: (error as any).statusCode,
      errorDescription: (error as any).errorDescription,
    };
  }

  // Handle Supabase error responses (objects)
  if (typeof error === 'object') {
    try {
      return {
        message: String(error.message || error.msg || ''),
        code: String(error.code || ''),
        status: Number(error.status || error.statusCode || 0),
        details: String(error.details || ''),
        hint: String(error.hint || ''),
        statusCode: Number(error.statusCode || 0),
        errorDescription: String(error.errorDescription || ''),
      };
    } catch (e) {
      // If serialization fails, at least get the message
      return { message: String(error) };
    }
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

  // Format message for console
  const errorMessage = serialized.message || 'Unknown error';
  const errorCode = serialized.code ? ` (${serialized.code})` : '';
  const errorStatus = serialized.status ? ` [${serialized.status}]` : '';

  console.error(
    `[Checkout Error] ${errorMessage}${errorCode}${errorStatus}`,
    {
      code: serialized.code,
      status: serialized.status,
      details: serialized.details,
      hint: serialized.hint,
      statusCode: serialized.statusCode,
      errorDescription: serialized.errorDescription,
      payload: payload ? {
        sme_id: payload.sme_id,
        store_id: payload.store_id,
        item_id: payload.item_id,
        status: payload.status,
        customer_name: payload.customer_name ? '[provided]' : '[missing]',
        customer_phone: payload.customer_phone ? '[provided]' : '[missing]',
      } : undefined,
      timestamp: new Date().toISOString(),
    }
  );

  return serialized;
}
