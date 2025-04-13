import useDesignStore from "../store/useDesignStore";

export default function StepsPanel() {
  const { functionalReqs, addFunctionalReq, entities, addEntity, apis, addAPI } = useDesignStore();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Step 1: Functional Requirements</h3>
        <input
          className="w-full p-2 my-2 border rounded"
          placeholder="Add functional requirement"
          onKeyDown={(e) => {
            if (e.key === "Enter") addFunctionalReq(e.target.value);
          }}
        />
        <ul className="list-disc ml-5 text-sm">
          {functionalReqs.map((req, idx) => <li key={idx}>{req}</li>)}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg">Step 2: Core Entities</h3>
        <input
          className="w-full p-2 my-2 border rounded"
          placeholder="Add entity"
          onKeyDown={(e) => {
            if (e.key === "Enter") addEntity(e.target.value);
          }}
        />
        <ul className="list-disc ml-5 text-sm">
          {entities.map((ent, idx) => <li key={idx}>{ent}</li>)}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg">Step 3: APIs</h3>
        <input
          className="w-full p-2 my-2 border rounded"
          placeholder="Add API"
          onKeyDown={(e) => {
            if (e.key === "Enter") addAPI(e.target.value);
          }}
        />
        <ul className="list-disc ml-5 text-sm">
          {apis.map((api, idx) => <li key={idx}>{api}</li>)}
        </ul>
      </div>
    </div>
  );
}