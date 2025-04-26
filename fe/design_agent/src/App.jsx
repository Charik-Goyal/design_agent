import "@excalidraw/excalidraw/index.css";
import React, { useState, useEffect } from "react";
import { RecoilRoot } from "recoil";
import ChatBox from "./components/ChatBox";
import ExcalidrawCanvas from "./components/ExcalidrawCanvas";

function App() {
  const [panelWidth, setPanelWidth] = useState(65); // % of screen for Excalidraw
  const [isResizing, setIsResizing] = useState(false);

  // Stop resizing when mouse released or leaves window
  useEffect(() => {
    const stop = () => setIsResizing(false);
    window.addEventListener("mouseup", stop);
    window.addEventListener("mouseleave", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("mouseleave", stop);
    };
  }, []);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const newWidth = (e.clientX / window.innerWidth) * 100; // percentage
    if (newWidth > 20 && newWidth < 90) setPanelWidth(newWidth);
  };

  return (
    <RecoilRoot>
      <div
        className="flex h-screen overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Left: Excalidraw area */}
        <div
          className="flex-none h-full overflow-hidden bg-white border-r border-gray-200 p-2"
          style={{ width: `${panelWidth}%` }}
        >
          <ExcalidrawCanvas />
        </div>

        {/* Draggable divider – self‑closing, no extra content */}
        <div
          className={`flex-none h-full bg-gray-300 hover:bg-gray-400 active:bg-gray-500 ${
            isResizing ? "cursor-grabbing" : "cursor-col-resize"
          }`}
          style={{ width: "2px" }}
          onMouseDown={startResize}
        />

        {/* Right: Chat panel */}
        <div className="flex-auto flex flex-col h-full overflow-hidden bg-gray-100 p-4">
          <h2 className="text-xl font-bold mb-4 flex-none">System Design Agent</h2>
          <div className="flex-1 h-full min-h-0 overflow-hidden">
            <ChatBox />
          </div>
        </div>
      </div>
    </RecoilRoot>
  );
}

export default App;



