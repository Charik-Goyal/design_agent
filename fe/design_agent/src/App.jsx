import { useState, useEffect } from "react";
import { RecoilRoot } from "recoil";
import ExcalidrawCanvas from "./components/ExcalidrawCanvas";
import ChatBox from "./components/ChatBox";
import ProblemSelector from "./components/ProblemSelector";

function App() {
  const [panelWidth, setPanelWidth]   = useState(60);
  const [isResizing, setIsResizing]   = useState(false);
  const [started, setStarted]         = useState(false);
  const [initialReply, setInitialReply]   = useState("");
  const [initialStage, setInitialStage]   = useState("");

  // global mouseup/leave to stop resizing
  useEffect(() => {
    const stop = () => {
      setIsResizing(false);
      document.body.style.userSelect = "";
    };
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
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const pct = (e.clientX / window.innerWidth) * 100;
    if (pct > 20 && pct < 90) setPanelWidth(pct);
  };

  const handleStart = ({ reply, nextStage }) => {
    setInitialReply(reply);
    setInitialStage(nextStage);
    setStarted(true);
  };

  return (
    <RecoilRoot>
      <div
        className="flex h-screen overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Left pane */}
        <div
          className="flex-none h-full overflow-hidden bg-white border-r"
          style={{ width: `${panelWidth}%` }}
        >
          <ExcalidrawCanvas />
        </div>

        {/* Divider */}
        <div
          onMouseDown={startResize}
          className={`flex-none h-full bg-gray-200 hover:bg-gray-400 ${
            isResizing ? "cursor-grabbing" : "cursor-col-resize"
          }`}
          style={{ width: "2px" }}
        />

        {/* Right pane */}
        <div className="flex-auto flex flex-col h-full bg-gray-100">
          {started ? (
            <>
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-black">System Design Agent</h2>
              </div>
              <div className="flex-1 min-h-0 p-4 overflow-hidden">
                <ChatBox
                  initialReply={initialReply}
                  initialStage={initialStage}
                  userId="test"
                />
              </div>
            </>
          ) : (
            <ProblemSelector onStart={handleStart} />
          )}
        </div>
      </div>
    </RecoilRoot>
  );
}

export default App;
