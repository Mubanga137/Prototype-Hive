import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { checkSupabaseHealth, type SupabaseHealthStatus } from "@/lib/supabaseHealthCheck";

const SupabaseHealthModal = () => {
  const [health, setHealth] = useState<SupabaseHealthStatus | null>(null);
  const [open, setOpen] = useState(false);

  const runCheck = async () => {
    const result = await checkSupabaseHealth();
    setHealth(result);
  };

  useEffect(() => {
    // Check health on mount
    runCheck();

    // Recheck every 30 seconds
    const interval = setInterval(runCheck, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!health) return null;

  const BadgeIcon = health.isHealthy ? CheckCircle : AlertTriangle;
  const badgeColor = health.isHealthy ? "text-green-500" : "text-red-500";

  return (
    <>
      {/* Small floating diagnostic button */}
      {!health.isHealthy && (
        <button
          onClick={() => setOpen(!open)}
          className="fixed bottom-4 right-4 z-50 p-3 bg-red-50 border border-red-300 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          title="Supabase connection issue"
        >
          <AlertTriangle size={20} className="text-red-600" />
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <BadgeIcon size={24} className={badgeColor} />
              <h2 className="text-lg font-bold text-foreground">
                {health.isHealthy ? "Supabase Healthy" : "Supabase Connection Issue"}
              </h2>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${health.canReachAPI ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm">API Reachable: {health.canReachAPI ? "✓" : "✗"}</span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${health.canAuth ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm">Auth Working: {health.canAuth ? "✓" : "✗"}</span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${health.hasValidToken ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm">Token Valid: {health.hasValidToken ? "✓" : "✗"}</span>
              </div>
            </div>

            {health.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-700 font-mono break-words">{health.error}</p>
              </div>
            )}

            {!health.isHealthy && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-700 font-semibold mb-2">Fix CORS Issue:</p>
                <ol className="text-xs text-blue-700 space-y-1">
                  <li>1. Go to Supabase Dashboard</li>
                  <li>2. Project Settings → API</li>
                  <li>3. Add this URL to CORS allow list:</li>
                  <li className="font-mono bg-white p-1 rounded mt-1 overflow-auto">
                    {window.location.origin}
                  </li>
                </ol>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={runCheck}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Clock size={16} /> Retry
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Last checked: {health.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SupabaseHealthModal;
