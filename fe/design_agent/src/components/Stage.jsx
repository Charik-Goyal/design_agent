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
      <fieldset className="fieldset">
        <legend className="fieldset-legend text-black block font-medium">Stage</legend>
        <select className="select bg-white text-black"
          value={stage}
          onChange={(e) => onChange(e.target.value)}>
          {STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
        </select>
      </fieldset>
    </div>
  );
}
