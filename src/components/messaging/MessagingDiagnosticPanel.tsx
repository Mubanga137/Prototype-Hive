import { useEffect, useRef, useState } from "react";
import { X, Activity, AlertCircle, CheckCircle } from "lucide-react";

interface LogEntry {
  timestamp: string;
  level: "log" | "error" | "warn" | "success";
  message: string;
  data?: any;
}

export const MessagingDiagnosticPanel = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<"all" | "error" | "success">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Capture all console messages related to messaging
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const captureLog = (level: "log" | "error" | "warn") => {
      return (...args: any[]) => {
        const message = args
          .map((arg) => {
            if (typeof arg === "object") {
              return JSON.stringify(arg, null, 2);
            }
            return String(arg);
          })
          .join(" ");

        // Only capture messaging-related logs
        if (
          message.includes("[Checkout]") ||
          message.includes("[CartDrawer]") ||
          message.includes("[systemMessaging]") ||
          message.includes("[useGlobalMessageListener]")
        ) {
          setLogs((prev) => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              level,
              message,
              data: args[1] || args[0],
            },
          ]);
        }

        // Call original console method
        if (level === "log") originalLog(...args);
        else if (level === "error") originalError(...args);
        else originalWarn(...args);
      };
    };

    console.log = captureLog("log");
    console.error = captureLog("error");
    console.warn = captureLog("warn");

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs =
    filterLevel === "all"
      ? logs
      : filterLevel === "error"
        ? logs.filter((l) => l.level === "error" || l.message.includes("failed") || l.message.includes("Failed"))
        : logs.filter((l) => l.message.includes("SENT") || l.message.includes("COMPLETE") || l.message.includes("created"));

  const errorCount = logs.filter((l) => l.level === "error" || l.message.includes("error")).length;
  const successCount = logs.filter((l) => l.message.includes("SENT") || l.message.includes("SUCCESS")).length;

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[999] flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg hover:shadow-xl"
        aria-label="Toggle diagnostics"
      >
        <Activity size={16} />
        {errorCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {errorCount}
          </span>
        )}
      </button>

      {/* Diagnostic Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-black/80 backdrop-blur-sm">
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-950 text-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
              <div>
                <h2 className="text-lg font-bold">🐝 Messaging Diagnostics</h2>
                <p className="text-xs text-slate-400">Real-time pipeline monitoring</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded p-1 hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="flex gap-4 border-b border-slate-700 bg-slate-850 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-sm">
                  Successful: <strong>{successCount}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-sm">
                  Errors: <strong>{errorCount}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-blue-400" />
                <span className="text-sm">
                  Total Events: <strong>{logs.length}</strong>
                </span>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 border-b border-slate-700 bg-slate-900 px-4 py-3">
              <button
                onClick={() => setFilterLevel("all")}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  filterLevel === "all" ? "bg-primary text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                All ({logs.length})
              </button>
              <button
                onClick={() => setFilterLevel("error")}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  filterLevel === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Errors & Issues ({errorCount})
              </button>
              <button
                onClick={() => setFilterLevel("success")}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  filterLevel === "success" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Success ({successCount})
              </button>
            </div>

            {/* Log Container */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-950 p-4">
              {filteredLogs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-500">
                  <p className="text-center">
                    {filterLevel === "all"
                      ? "Waiting for messaging events... Place an order to see logs."
                      : `No ${filterLevel} events yet.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {filteredLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`rounded border-l-4 bg-slate-900 p-2 ${
                        log.level === "error" ? "border-red-500 text-red-200" : "border-blue-500 text-slate-200"
                      }`}
                    >
                      <div className="flex gap-2">
                        <span className="shrink-0 text-slate-500">{log.timestamp.split("T")[1]}</span>
                        <span className="break-all">{log.message}</span>
                      </div>
                      {log.data && (
                        <details className="mt-1 cursor-pointer text-slate-400">
                          <summary className="text-xs font-semibold hover:text-slate-300">Details</summary>
                          <pre className="mt-1 max-h-40 overflow-y-auto rounded bg-slate-800 p-2 text-slate-300">
                            {typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400">
              <p>💡 Tip: Open browser DevTools (F12) console for more detailed error traces.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessagingDiagnosticPanel;
