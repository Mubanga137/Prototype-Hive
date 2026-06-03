import { useState } from "react";
import { ChevronDown, RotateCw, Trash2, Plus, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGuestTracking } from "@/hooks/useGuestTracking";
import {
  verifyMessagingTables,
  getAllConversations,
  getAllMessages,
  createTestConversation,
  sendTestMessage,
} from "@/lib/messaging-setup";
import {
  createTestSystemConversationsAndMessages,
  createTestVendorNotification,
  createTestRiderNotification,
} from "@/lib/testSystemMessages";

const MessagingDebugPanel = () => {
  const { user, profile } = useAuth();
  const { isGuest, trackingToken } = useGuestTracking();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleVerify = async () => {
    setLoading(true);
    addLog("Starting verification...");
    const result = await verifyMessagingTables();
    addLog(JSON.stringify(result));
    setLoading(false);
  };

  const handleLoadConversations = async () => {
    setLoading(true);
    addLog("Loading all conversations...");
    const convs = await getAllConversations();
    addLog(`Found ${convs?.length || 0} conversations`);
    if (convs?.length) {
      convs.forEach((c: any) => {
        addLog(`  - ${c.id}: ${c.participant_a} <-> ${c.participant_b}`);
      });
    }
    setLoading(false);
  };

  const handleLoadMessages = async () => {
    setLoading(true);
    addLog("Loading all messages...");
    const msgs = await getAllMessages();
    addLog(`Found ${msgs?.length || 0} messages`);
    if (msgs?.length) {
      msgs.forEach((m: any) => {
        addLog(`  - ${m.sender_id}: ${m.content?.substring(0, 50)}`);
      });
    }
    setLoading(false);
  };

  const handleCreateTestData = async () => {
    if (!user?.id) {
      addLog("No user logged in");
      return;
    }
    setLoading(true);
    try {
      // Create a conversation with fake second user
      const testUserId = "test-user-" + Math.random().toString(36).slice(2, 9);
      addLog(`Creating test conversation with ${testUserId}...`);

      const conv = await createTestConversation(user.id, testUserId, 1);
      addLog(`Conversation created: ${conv.id}`);

      // Send test messages
      addLog("Sending test messages...");
      await sendTestMessage(conv.id, user.id, "Hello from customer!");
      addLog("Message 1 sent ✓");

      await sendTestMessage(conv.id, testUserId, "Hello from support!");
      addLog("Message 2 sent ✓");
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const handleCreateSystemReceipt = async () => {
    if (!user?.id) {
      addLog("No user logged in");
      return;
    }
    setLoading(true);
    try {
      addLog("Creating system receipt for customer...");
      const result = await createTestSystemConversationsAndMessages(user.id);
      if (result.success) {
        addLog(result.message);
        addLog(`Conversation: ${result.conversationId}`);
        addLog("Check Messages page - you should see the receipt!");
      } else {
        addLog(`Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const handleCreateVendorNotification = async () => {
    if (!user?.id) {
      addLog("No user logged in");
      return;
    }
    setLoading(true);
    try {
      addLog("Creating vendor notification...");
      const result = await createTestVendorNotification(user.id);
      if (result.success) {
        addLog(result.message);
        addLog(`Conversation: ${result.conversationId}`);
        addLog("You should see a toast notification!");
      } else {
        addLog(`Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const handleCreateRiderNotification = async () => {
    if (!user?.id) {
      addLog("No user logged in");
      return;
    }
    setLoading(true);
    try {
      addLog("Creating rider notification...");
      const result = await createTestRiderNotification(user.id);
      if (result.success) {
        addLog(result.message);
        addLog(`Conversation: ${result.conversationId}`);
        addLog("You should see a toast notification!");
      } else {
        addLog(`Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-[#0F1A35] text-[#FFFBF2] rounded-lg shadow-lg hover:bg-[#0F1A35]/90 transition"
      >
        <span className="text-sm font-semibold">🐛 Messaging Debug</span>
        <ChevronDown size={16} className={`transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-2 bg-[#0F1A35] text-[#FFFBF2] rounded-lg shadow-lg border border-[#B37C1C]/25 p-3 space-y-2 max-h-96 flex flex-col">
          <div className="space-y-1 flex-1 overflow-y-auto bg-[#0F1A35]/50 rounded p-2 text-xs font-mono">
            {logs.length === 0 ? (
              <div className="text-[#FFFBF2]/50">Logs will appear here...</div>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-[#FFFBF2]/70 font-semibold">Basic Actions:</div>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#B37C1C] text-[#FFFBF2] rounded text-sm hover:bg-[#B37C1C]/90 disabled:opacity-50 transition"
            >
              <RotateCw size={14} />
              Verify Tables
            </button>

            <button
              onClick={handleLoadConversations}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#B37C1C]/70 text-[#FFFBF2] rounded text-sm hover:bg-[#B37C1C] disabled:opacity-50 transition"
            >
              Load Conversations
            </button>

            <button
              onClick={handleLoadMessages}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#B37C1C]/70 text-[#FFFBF2] rounded text-sm hover:bg-[#B37C1C] disabled:opacity-50 transition"
            >
              Load Messages
            </button>

            <button
              onClick={handleCreateTestData}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 transition"
            >
              <Plus size={14} />
              Create Test Data
            </button>

            <div className="text-xs text-[#FFFBF2]/70 font-semibold pt-1">System Messages:</div>
            <button
              onClick={handleCreateSystemReceipt}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Zap size={14} />
              Create Receipt 🐝
            </button>

            <button
              onClick={handleCreateVendorNotification}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50 transition"
            >
              <Zap size={14} />
              Create Order 📦
            </button>

            <button
              onClick={handleCreateRiderNotification}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 transition"
            >
              <Zap size={14} />
              Create Delivery 🚀
            </button>

            <button
              onClick={handleClearLogs}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600/70 text-white rounded text-sm hover:bg-red-600 transition"
            >
              <Trash2 size={14} />
              Clear Logs
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingDebugPanel;
