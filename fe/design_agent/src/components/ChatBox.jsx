import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { graph } from "../atoms/graph";
import { processData } from "../utility/graph";
import StageSelector from "./Stage";
import { User, Bot } from "lucide-react";
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let id;
    if (loading) {
      setDotCount(1);
      id = setInterval(() => setDotCount((c) => (c % 3) + 1), 500);
    } else {
      setDotCount(0);
    }
    return () => clearInterval(id);
  }, [loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

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
      setLoading(False);
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

      {/* Chat window */}
      <div className="flex-1 min-h-0 overflow-auto relative bg-white rounded-lg shadow-inner p-4 space-y-4 text-sm leading-snug">
      {messages.map((msg, idx) => {
          const isUser = msg.sender === "user";
          // const time = formatTime(msg.timestamp);
          return (
            <div key={idx} className={`chat ${isUser ? "chat-end" : "chat-start"}`}>               
              <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                  {isUser ? <User className="w-full h-full text-blue-500" /> : <Bot className="w-full h-full text-black" />}
                </div>
              </div>
              <div className="chat-header">
                {isUser ? "You" : "AI"}
              </div>
              <div className={`chat-bubble ${isUser ? "bg-blue-500" : "bg-gray-500"}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                  <Bot className="w-full h-full text-black" />
                </div>
            </div>
            <div className="chat-bubble bg-gray-500">
              <span className="loading loading-dots loading-lg"></span>
            </div>
          </div>
          
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-none flex items-center space-x-2 mt-2">
        <textarea
          className="textarea flex-1 p-3 rounded-lg text-sm text-black bg-white"
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
          className={`px-4 py-2 rounded-lg text-white font-semibold shadow-lg transition-colors duration-200 ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
