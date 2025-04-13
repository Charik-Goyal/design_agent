// import { useState } from "react";
// import useDesignStore from "../store/useDesignStore";

// export default function ChatBox() {
//   const [input, setInput] = useState("");
//   const { diagramGraph } = useDesignStore();

//   const handleSend = async () => {
//     const prompt = `Given the graph: ${JSON.stringify(diagramGraph)}, does this functionality exist: ${input}`;
//     const res = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer YOUR_OPENAI_KEY`,
//       },
//       body: JSON.stringify({
//         model: "gpt-4",
//         messages: [
//           { role: "user", content: prompt },
//         ],
//       }),
//     });
//     const data = await res.json();
//     alert(data.choices[0].message.content);
//   };

//   return (
//     <div className="mt-6">
//       <h3 className="font-semibold text-lg mb-2">Chat with Agent</h3>
//       <textarea
//         className="w-full p-2 border rounded h-24 text-sm"
//         placeholder="Ask a system design question..."
//         value={input}
//         onChange={(e) => setInput(e.target.value)}
//       />
//       <button
//         onClick={handleSend}
//         className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded shadow"
//       >
//         Send
//       </button>
//     </div>
//   );
// }

// ChatBox.jsx
import { useState } from "react";

export default function ChatBox() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      const data = await res.json();
      setResponse(data.answer || "No response from AI agent");
    } catch (error) {
      console.error("Chat error:", error);
      setResponse("Error communicating with AI agent");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <textarea
        className="w-full p-2 border rounded mb-2 text-sm"
        rows={4}
        placeholder="Ask a system design question..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        onClick={sendMessage}
        className="w-full px-4 py-2 bg-green-600 text-white rounded shadow mb-4"
      >
        Ask
      </button>
      <div className="bg-white p-3 rounded shadow text-sm overflow-auto h-full">
        <h4 className="font-semibold mb-2">AI Agent Response:</h4>
        <p>{response}</p>
      </div>
    </div>
  );
}