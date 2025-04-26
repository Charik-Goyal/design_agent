// StageSelector.jsx
import { ChevronDown } from "lucide-react";

const STAGES = [
  "Requirements",
  "CapacityEstimation",
  "Entities",
  "APIDesign",
  "HighLevelDesign",
  "DeepDive",
];

export default function StageSelector({ stage, onChange }) {
  return (
    <div className="relative mb-4 w-64">
      <label className="block mb-1 text-gray-700 font-medium" htmlFor="stage-select">
        Stage
      </label>
      <select
        id="stage-select"
        value={stage}
        onChange={(e) => onChange(e.target.value)}
        className="
          appearance-none
          w-full
          bg-white
          border border-gray-300
          px-4 py-2 pr-10
          rounded-lg
          shadow-sm
          focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200
          transition duration-150 ease-in-out
        "
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <ChevronDown
        size={20}
        className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}
