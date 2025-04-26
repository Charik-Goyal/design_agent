import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { graph } from "../atoms/graph";
import { processData } from "../utility/graph";
import StageSelector from "./Stage";
import { Loader2, User, Cpu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState("Requirements");
  const [dotCount, setDotCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const elements = useRecoilValue(graph);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Loading indicator dots
  useEffect(() => {
    let id;
    if (loading) {
      setDotCount(1);
      id = setInterval(() => {
        setDotCount((c) => (c % 3) + 1);
      }, 500);
    } else {
      setDotCount(0);
    }
    return () => clearInterval(id);
  }, [loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const payload = { msg: text, graph: processData(elements), stage };
      const res = await fetch("http://localhost:8000/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { reply, nextStage } = await res.json();
      setStage(nextStage);

      // Add bot response
      setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { sender: "bot", text: "Error communicating with AI agent." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <StageSelector stage={stage} onChange={setStage} />
  
      {/* Chat window explicitly scrollable */}
      <div className="flex-1 min-h-0 overflow-auto relative bg-white rounded-lg shadow-inner p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.sender === "user";
          const Icon = isUser ? User : Cpu;
          const bubbleClasses = isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-800";
          const label = isUser ? "You" : "AI";
  
          return (
            <div
              key={idx}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-start space-x-2 max-w-md">
                {!isUser && <Icon className="w-6 h-6 text-gray-500" />}
                <div>
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className={`px-4 py-2 rounded-lg whitespace-pre-wrap shadow ${bubbleClasses}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-slate prose-sm text-inherit">
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
                {isUser && <Icon className="w-6 h-6 text-blue-500" />}
              </div>
            </div>
          );
        })}
  
        {/* Spinner Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-lg z-10">
            <Loader2 className="animate-spin mr-2 text-gray-600" />
            <span className="text-gray-600">AI is thinking{".".repeat(dotCount)}</span>
          </div>
        )}
  
        <div ref={messagesEndRef} />
      </div>
  
      {/* Input area */}
      <div className="flex-none flex items-center space-x-2 mt-2">
        <textarea
          className="flex-1 p-3 border border-gray-300 rounded-lg text-sm resize focus:outline-none focus:ring focus:border-blue-300"
          rows={2}
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-white font-semibold shadow-lg transition-colors duration-200
            ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}
        >
          Send
        </button>
      </div>
    </div>
  );  
}
