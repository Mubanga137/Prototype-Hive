import { lazy, Suspense } from "react";

// Lazy load the main Messages page to avoid circular deps
const MessagesPageComponent = lazy(() => import("../Messages"));

const CustomerMessages = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading messages...</div>}>
      {/* Render only the inner message content without the outer sidebar wrapper */}
      <div className="w-full h-full">
        <MessagesPageComponent />
      </div>
    </Suspense>
  );
};

export default CustomerMessages;
