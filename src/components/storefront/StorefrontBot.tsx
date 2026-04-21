import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

interface Message {
  id: string;
  type: "bot" | "user";
  text: string;
  timestamp: Date;
}

interface StorefrontBotProps {
  storeName?: string;
  storeDescription?: string;
}

const StorefrontBot = ({ storeName = "Store", storeDescription = "" }: StorefrontBotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      text: `Hi! 👋 I'm the ${storeName} assistant. How can I help you today? I can help with:\n• Product information\n• Ordering questions\n• Delivery inquiries\n• General support`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simple bot responses based on keywords
  const getBotResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase();

    if (msg.includes("hello") || msg.includes("hi")) {
      return `Welcome to ${storeName}! 😊 How can I assist you?`;
    }

    if (msg.includes("product") || msg.includes("item")) {
      return "We have a wide variety of products available. Browse our storefront or ask me about specific items you're interested in!";
    }

    if (msg.includes("delivery") || msg.includes("shipping")) {
      return "We offer fast and reliable delivery! You can track your order once you place it. Do you have questions about a specific order?";
    }

    if (msg.includes("price") || msg.includes("cost") || msg.includes("how much")) {
      return "Prices vary by product. Check out our catalog to see all available items and their prices. Feel free to ask about specific products!";
    }

    if (msg.includes("thank") || msg.includes("thanks")) {
      return "You're welcome! 😊 Feel free to reach out if you have any other questions.";
    }

    if (msg.includes("contact") || msg.includes("call") || msg.includes("email")) {
      return "You can contact us directly by messaging the store owner! Click the 'Message Store' button on our storefront.";
    }

    if (msg.includes("discount") || msg.includes("promo") || msg.includes("sale")) {
      return "Check our promotions section for current discounts and special offers!";
    }

    return `That's a great question! For more detailed information, please message the store directly or check our product listings. Is there anything else I can help with?`;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate bot thinking time
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: getBotResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsLoading(false);
    }, 800);
  };

  return (
    <>
      {/* Bot Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[50] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>

      {/* Bot Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-24 right-6 z-[50] w-96 max-h-[600px] rounded-2xl shadow-2xl border border-border bg-card flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <p className="font-semibold text-sm">{storeName} Assistant</p>
                <p className="text-xs opacity-80">Always online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.type === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.type === "bot"
                        ? "bg-primary/20 text-primary"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {msg.type === "bot" ? (
                      <Bot size={16} />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                      msg.type === "bot"
                        ? "bg-secondary text-foreground rounded-bl-none"
                        : "bg-primary text-primary-foreground rounded-br-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot size={16} className="text-primary" />
                  </div>
                  <div className="bg-secondary text-foreground px-4 py-2 rounded-2xl rounded-bl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your question..."
                className="flex-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StorefrontBot;
