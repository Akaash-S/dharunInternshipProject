import React, { useState, useEffect } from "react";

const TABLE_OPTIONS = [
  { key: "users", label: "Users" },
  { key: "rooms", label: "Rooms" },
  { key: "messages", label: "Messages" },
];

function Exports() {
  const [selectedTable, setSelectedTable] = useState(TABLE_OPTIONS[0].key);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/data/export?table=${selectedTable}`)
      .then((res) => res.json())
      .then((rows) => {
        setData(Array.isArray(rows) ? rows : []);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setError("Failed to fetch data");
        setLoading(false);
      });
  }, [selectedTable]);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 text-blue-700">Live Database Export</h1>
        <div className="flex gap-2 mb-6">
          {TABLE_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setSelectedTable(o.key)}
              className={`px-4 py-2 rounded font-semibold border transition-all ${selectedTable === o.key ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-blue-700 border-gray-300 hover:bg-blue-50"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="mt-8 w-full overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {columns.map((col) => (
                    <th key={col} className="border px-3 py-2">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-4 text-gray-400">No data found.</td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx}>
                      {columns.map((col) => (
                        <td key={col} className="border px-3 py-2">{row[col] || "-"}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Exports; 