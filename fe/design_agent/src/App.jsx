import "@excalidraw/excalidraw/index.css";
import ChatBox from "./components/ChatBox";
import ExcalidrawCanvas from "./components/ExcalidrawCanvas";
import {
  RecoilRoot
} from 'recoil';

function App() {

  return (
    <RecoilRoot>
    <div className="flex h-screen overflow-hidden">
      <div className="w-3/4 h-full bg-white border-r border-gray-200 p-2">
        <ExcalidrawCanvas/>
      </div>
      <div className="w-1/4 h-full bg-gray-100 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">System Design Agent</h2>
        <ChatBox />
      </div>
    </div>
    </RecoilRoot>
  );
}

export default App;
