import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { graph } from "../atoms/graph";
import { processData } from "../utility/graph";
import StageSelector from "./Stage";
import { User, Bot, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VoiceInput from "./VoiceInput";

export default function ChatBox({
  initialReply = "Hello! How can I help you today?",
  initialStage = "Requirements",
  userId = "test",
}) {
  // 1) seed with the first AI message
  const [messages, setMessages] = useState([
    { sender: "bot", text: initialReply }
  ]);

  // 2) seed the stage and mark that we've already called /start
  const [stage, setStage]     = useState(initialStage);

  // rest stays pretty much the same
  const [committed, setCommitted] = useState("");
  const [interim,   setInterim]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [dotCount,  setDotCount]  = useState(0);
  const elements = useRecoilValue(graph);
  const messagesEndRef = useRef(null);

  // auto‐scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // loading dots
  useEffect(() => {
    let id;
    if (loading) {
      setDotCount(1);
      id = setInterval(() => setDotCount(c => (c % 3) + 1), 500);
    } else {
      setDotCount(0);
    }
    return () => clearInterval(id);
  }, [loading]);

  const sendMessage = async () => {
    const text = committed + (interim ? ` ${interim}` : "");
    if (!text.trim()) return;

    // show user bubble
    setMessages(m => [...m, { sender: "user", text }]);
    setLoading(true);

    try {
        // normal interact
        const payload = {
          user_id: userId,
          message: text,
          graph: processData(elements),
        };
        const res = await fetch("http://localhost:8000/interact", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const { reply, nextStage } = await res.json();
        setStage(nextStage);
        setMessages(m => [...m, { sender: "bot", text: reply }]);
    } catch {
      setMessages(m => [...m, { sender: "bot", text: "Error contacting AI." }]);
    } finally {
      setLoading(false);
      setCommitted("");
      setInterim("");
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSpeech = (text, isFinal) => {
    if (isFinal) {
      setCommitted(c => c + (c ? " " : "") + text);
      setInterim("");
    } else {
      setInterim(text);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <StageSelector stage={stage} onChange={setStage} />

      <div className="flex-1 min-h-0 overflow-auto relative bg-white p-4 space-y-4">
        {messages.map((msg, i) => {
          const isUser = msg.sender === "user";
          return (
            <div key={i} className={`chat ${isUser ? "chat-end" : "chat-start"}`}>
              <div className="chat-image avatar">
                <div className="w-8 rounded-full">
                  {isUser 
                    ? <User className="w-full h-full text-blue-500" />
                    : <Bot  className="w-full h-full text-gray-700" />}
                </div>
              </div>
              <div className="chat-header text-black">
                {isUser ? "You" : "AI"}
              </div>
              <div className={`chat-bubble ${isUser ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-8 rounded-full">
                <Bot className="w-full h-full text-gray-700" />
              </div>
            </div>
            <div className="chat-bubble bg-gray-200 text-black">
              AI is thinking{".".repeat(dotCount)}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-none flex items-center space-x-2 mt-2">
        <textarea
          className="textarea flex-1 p-3 rounded-lg text-sm bg-white text-black"
          rows={2}
          placeholder="Type or speak…"
          value={committed + (interim ? ` ${interim}` : "")}
          onChange={e => {
            setCommitted(e.target.value);
            setInterim("");
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <div className="flex flex-col items-center space-y-1">
          <button
            onClick={sendMessage}
            disabled={loading}
            className={`p-2 rounded-md text-white ${
              loading ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>

          <VoiceInput disabled={loading} onTranscript={handleSpeech} />
        </div>
      </div>
    </div>
  );
}
