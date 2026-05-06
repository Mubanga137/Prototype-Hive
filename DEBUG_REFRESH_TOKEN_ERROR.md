# Fixing "Invalid Refresh Token: Refresh Token Not Found" Error

## Problem
The error occurs when Supabase cannot find a valid refresh token, typically happening when:
- Session has expired
- localStorage was cleared
- Token became invalid on the server
- User has been offline for an extended period
- Browser storage quota was exceeded

## Root Cause
The error `AuthApiError: Invalid Refresh Token: Refresh Token Not Found` happens because:
1. Access token expired
2. Supabase attempted auto-refresh
3. Refresh token was missing or invalid in localStorage
4. Request failed with 401 Unauthorized

## Solution Implemented

### 1. **Supabase Client Error Handling** (`src/integrations/supabase/client.ts`)
- Added `setupAuthErrorHandling()` - Listens for auth state changes
- Added `clearInvalidTokens()` - Removes stale tokens on startup
- Added `forceSignOut()` - Emergency sign-out that clears all session data

### 2. **Auth Hook Enhancement** (`src/hooks/useAuth.tsx`)
- Calls `setupAuthErrorHandling()` on app mount
- Calls `clearInvalidTokens()` to clean stale tokens
- Catches refresh token errors in `getSession()` call
- Gracefully handles errors instead of crashing

### 3. **Role Verification Protection** (`src/hooks/useRoleVerification.ts`)
- Added comprehensive error handling for token issues
- Detects refresh token errors during role verification
- Automatically signs out and redirects on token errors

### 4. **Global Error Handlers** (`src/lib/globalErrorHandler.ts`)
- Catches unhandled promise rejections with token errors
- Intercepts 401 responses from fetch calls
- Automatically signs out user on token errors
- Shows user-friendly toast messages

### 5. **API Wrapper Utilities** (`src/lib/api.ts`)
- `withTokenErrorHandling()` - Wraps queries with error handling
- `safeGetSingle()` - Safe single row fetch
- `safeGetMany()` - Safe multiple rows fetch
- `safeUpdate()` - Safe update operations
- All automatically handle token errors

### 6. **App-Level Integration** (`src/App.tsx`)
- Calls `setupGlobalErrorHandlers()` on mount
- Ensures error handlers are active before any data fetching

## How It Works

```
User tries to fetch data
          ↓
Query encounters 401 / Invalid Token error
          ↓
Global error handler catches it
          ↓
forceSignOut() called:
  - Clears localStorage
  - Removes all auth tokens
  - Ends Supabase session
          ↓
Toast: "Your session has expired. Please log in again."
          ↓
Redirect to /login?reason=session_expired
```

## User Experience

### Before Fix
```
❌ Cryptic error: "Invalid Refresh Token: Refresh Token Not Found"
❌ App crashes or shows broken state
❌ User confused about what happened
❌ Stale session stays in memory
```

### After Fix
```
✅ Automatic detection of invalid tokens
✅ Graceful sign-out and session cleanup
✅ User-friendly message: "Your session has expired"
✅ Automatic redirect to login
✅ Fresh session on re-login
```

## Testing the Fix

### Simulate Refresh Token Error:
1. Open DevTools → Application → Local Storage
2. Find `sb-auth-token` and `sb-refresh-token`
3. Delete or corrupt one of them
4. Try to perform any authenticated action (fetch orders, etc.)
5. Should see error toast and redirect to login

### Manual Verification:
```typescript
// In browser console:
localStorage.removeItem('sb-cnaajzmbkisybwnjeiie-auth-token');

// Then try any action that requires auth
// Should automatically redirect to login
```

## Files Modified/Created

### New Files:
- `src/integrations/supabase/errorHandler.ts` - Error interceptor
- `src/lib/api.ts` - Safe API wrapper functions
- `src/lib/globalErrorHandler.ts` - Global error handlers

### Modified Files:
- `src/integrations/supabase/client.ts` - Added token handling
- `src/hooks/useAuth.tsx` - Added error handling + initialization
- `src/hooks/useRoleVerification.ts` - Added token error detection
- `src/App.tsx` - Initialize global handlers

## Deployment Notes

✅ No breaking changes  
✅ Backward compatible  
✅ Works with existing auth flow  
✅ Gracefully handles edge cases  
✅ No new external dependencies  

## Future Improvements

1. Add persistent error logging to Sentry/LogRocket
2. Implement "retry" button on error state
3. Add telemetry to track token expiration rates
4. Implement token refresh before expiration (background task)
5. Add biometric re-auth on token failure

## Emergency Recovery

If user gets stuck in login loop:

```typescript
// Clear ALL storage
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
    localStorage.removeItem(key);
  }
});

// Hard refresh page
location.reload(true);
```

## Debugging Steps

If error still occurs after fix:

1. **Check console logs** - Look for `[Auth]` or `[Supabase]` prefixed messages
2. **Check localStorage** - Verify tokens exist: `Object.keys(localStorage).filter(k => k.includes('sb-'))`
3. **Check Supabase status** - Visit status.supabase.com
4. **Check CORS** - Ensure supabase.co is not blocked
5. **Check network** - Open DevTools → Network, look for 401 responses
6. **Check session** - `supabase.auth.getSession()`

## Support

For persistent issues:
- Check Supabase logs: https://app.supabase.com/project/cnaajzmbkisybwnjeiie/logs
- Review browser console for detailed error messages
- Test in incognito mode (to eliminate cache issues)
