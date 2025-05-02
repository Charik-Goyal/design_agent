import { useState } from "react";

export default function ProblemSelector({ onStart }) {
  const problems = [
    { label: "Top-K Videos",    value: "topk" },
    { label: "Bitly Shortener", value: "bitly" },
    { label: "Whatsapp", value: "whatsapp" },
    { label: "Gopuff", value: "gopuff" },
    { label: "Dropbox", value: "dropbox" },
    { label: "FB Live Comments", value: "fb-live-comments" },
    { label: "FB Newsfeed", value: "fb-news-feed" },
    { label: "FB Post Search", value: "fb-post-search" },
    { label: "Ticket Master", value: "ticketmaster" },
    { label: "Leetcode", value: "leetcode" },
    { label: "Tinder", value: "tinder" },
    { label: "Uber", value: "uber" },
    { label: "Web Crawler", value: "web-crawler" },
    { label: "Whatsapp", value: "whatsapp" },
    { label: "YouTube", value: "youtube" },
    { label: "Ad Click Aggregator", value: "ad-click-aggregator" },
    // …add more here
  ];
  const [selected, setSelected] = useState(problems[0].value);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "test",        // or pull from auth/context
          problem_name: selected,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { reply, nextStage } = await res.json();
      onStart({ reply, nextStage });
    } catch (err) {
      console.error(err);
      alert("Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h3 className="text-lg text-black font-semibold mb-2">Choose a problem</h3>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="border rounded p-2 mb-4 w-48 text-black"
      >
        {problems.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleStart}
        disabled={loading}
        className={`px-4 py-2 rounded ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600"
        } text-white`}
      >
        {loading ? "Starting…" : "Start Interview"}
      </button>
    </div>
  );
}
