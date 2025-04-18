import { useState } from "react";
import { useRecoilValue } from "recoil";
import { graph } from "../atoms/graph";

export default function ChatBox() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const elements = useRecoilValue(graph)

  const sendMessage = async () => {
    if (!input.trim() && !elements) return;
    let data = {
      "msg": input,
      "graph": processData()
    }
    console.log(JSON.stringify(data))
    try {
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const data = await res.json();
      setResponse(data.answer || "No response from AI agent");
    } catch (error) {
      console.error("Chat error:", error);
      setResponse("Error communicating with AI agent");
    }
  };

  const processData = () => {
    let val = {};
    let rectangles = [];

    for (let t = 0; t < elements.length; t++) {
      let x = elements[t];

      if (x.type === "text") {
        if (x.containerId !== null && val[x.containerId]) {
          val[x.containerId].val = x.text;
        }
        continue;
      }

      val[x.id] = {
        type: x.type,
        val: "",
        ngr: [],
        position: { x: x.x, y: x.y, width: x.width, height: x.height }
      };

      if (x.type !== "arrow" && x.type !== "text" && x.type !== "line" && x.type !== "freedraw") {
        rectangles.push(x.id);
      }

      if (x.type === "arrow" && x.startBinding && x.endBinding) {
        val[x.id] = {
          ...val[x.id],
          start: x.startBinding.elementId,
          end: x.endBinding.elementId
        };
      }
    }

    for (let x in val) {
      if (val[x].type === "arrow") {
        let p = val[x].start;
        let q = val[x].end;
        if (val[p]) val[p].ngr.push(q);
      }
    }

    const isInside = (inner, outer) => {
      return (
        inner.x >= outer.x &&
        inner.y >= outer.y &&
        inner.x + inner.width <= outer.x + outer.width &&
        inner.y + inner.height <= outer.y + outer.height
      );
    };

    rectangles.forEach(outerId => {
      rectangles.forEach(innerId => {
        if (innerId !== outerId) {
          let innerRect = val[innerId].position;
          let outerRect = val[outerId].position;

          if (isInside(innerRect, outerRect)) {
            val[outerId].ngr.push(innerId);
          }
        }
      });
    });
    console.log(val)
    return val;
  };

  return (
    <div className="flex flex-col h-full space-y-2">
      <textarea
        className="w-9 h-full p-6 border rounded m-2 text-sm"
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