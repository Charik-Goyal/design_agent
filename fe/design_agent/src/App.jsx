import { useState, useCallback, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import ChatBox from "./components/ChatBox";

function App() {
  const [elements, setElements] = useState([]);

  // Load saved elements from localStorage and initialize Excalidraw using initialData
  const getInitialData = () => {
    const savedElements = JSON.parse(localStorage.getItem("myKey"));
    if (savedElements?.length) {
      return {
        elements: savedElements,
        appState: { viewBackgroundColor: "#ffffff" },
        scrollToContent: true
      };
    }
    return undefined;
  };

  // Save elements to localStorage whenever they change
  useEffect(() => {
    if (elements.length) {
      localStorage.setItem("myKey", JSON.stringify(elements));
    }
  }, [elements]);

  const handleChange = useCallback((newElements) => {
    const activeElements = newElements.filter(el => !el.isDeleted);
    setElements((prevElements) => {
      if (JSON.stringify(activeElements) !== JSON.stringify(prevElements)) {
        return activeElements;
      }
      return prevElements;
    });
  }, []);

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

    return val;
  };

  const sendToAgent = async () => {
    const jsonPayload = processData();
    try {
      const res = await fetch("http://localhost:8000/parse-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonPayload),
      });
      const result = await res.json();
      console.log("Agent Response:", result);
    } catch (err) {
      console.error("Error sending to AI agent:", err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-3/4 h-full bg-white border-r border-gray-200 p-2">
        <div className="h-full rounded-lg overflow-hidden shadow relative">
          <Excalidraw 
          initialData={getInitialData()} 
          onChange={handleChange}
          />
        </div>
      </div>
      <div className="w-1/4 h-full bg-gray-100 p-4 flex flex-col">
        <button
          className="absolute top-4 right-4 px-4 py-2 bg-blue-600 text-white rounded shadow"
          onClick={sendToAgent}
        >
          Send to AI Agent
        </button>
        <h2 className="text-xl font-bold mb-4">System Design Agent</h2>
        <ChatBox />
      </div>
    </div>
  );
}

export default App;
