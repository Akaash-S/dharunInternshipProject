import React, { useState, useEffect } from "react";

const EXPORT_OPTIONS = [
  {
    key: "messages",
    label: "Messages",
    api: "http://localhost:8000/api/export/messages",
    fetchApi: "http://localhost:8000/api/rooms/room-3/messages",
    columns: [
      { key: "sender", label: "Sender" },
      { key: "content", label: "Content" },
      { key: "fileName", label: "File Name" },
      { key: "fileSize", label: "File Size" },
      { key: "time", label: "Time" },
    ],
  },
  {
    key: "users",
    label: "Users",
    api: "http://localhost:8000/api/export/users",
    fetchApi: "http://localhost:8000/api/export/users",
    columns: [
      { key: "email", label: "Email" },
      { key: "password", label: "Password (hashed)" },
      { key: "avatar_url", label: "Avatar URL" },
    ],
  },
  {
    key: "rooms",
    label: "Rooms",
    api: "http://localhost:8000/api/export/rooms",
    fetchApi: "http://localhost:8000/api/export/rooms",
    columns: [
      { key: "id", label: "Room ID" },
      { key: "name", label: "Room Name" },
    ],
  },
  {
    key: "all",
    label: "All (JSON)",
    api: "http://localhost:8000/api/export/all",
    fetchApi: "http://localhost:8000/api/export/all",
    columns: [],
  },
];

function Exports() {
  const [selected, setSelected] = useState(EXPORT_OPTIONS[0].key);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");
  const [data, setData] = useState([]);
  const [jsonData, setJsonData] = useState(null);

  const option = EXPORT_OPTIONS.find((o) => o.key === selected);

  useEffect(() => {
    setStatus("");
    if (selected === "all") {
      fetch(option.fetchApi)
        .then((res) => res.json())
        .then((json) => setJsonData(json))
        .catch(() => setJsonData(null));
    } else {
      fetch(option.fetchApi)
        .then((res) => res.json())
        .then((rows) => setData(Array.isArray(rows) ? rows : []))
        .catch(() => setData([]));
    }
  }, [selected, option.fetchApi]);

  const handleDownload = async () => {
    setDownloading(true);
    setStatus("");
    try {
      const res = await fetch(option.api);
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        selected === "all"
          ? "all-data.json"
          : `${option.key}.` + (selected === "all" ? "json" : "xlsx");
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Download successful!");
    } catch (err) {
      setStatus("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 text-blue-700">Export Data</h1>
        <div className="flex gap-2 mb-6">
          {EXPORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setSelected(o.key)}
              className={`px-4 py-2 rounded font-semibold border transition-all ${selected === o.key ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-blue-700 border-gray-300 hover:bg-blue-50"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="mb-4 p-2 bg-gray-200 rounded text-sm text-gray-800 w-full text-center">
          <code>{option.api}</code>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition font-semibold w-full max-w-xs ${downloading ? "opacity-60 cursor-wait" : ""}`}
        >
          {downloading ? "Downloading..." : selected === "all" ? "Download JSON" : "Download Excel"}
        </button>
        {status && (
          <div className={`mt-4 text-sm font-medium ${status.includes("success") ? "text-green-600" : "text-red-600"}`}>{status}</div>
        )}
        <div className="mt-8 w-full overflow-x-auto">
          {selected === "all" ? (
            <pre className="bg-gray-100 p-4 rounded text-xs max-h-96 overflow-auto w-full text-left">
              {jsonData ? JSON.stringify(jsonData, null, 2) : "No data found."}
            </pre>
          ) : (
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {option.columns.map((col) => (
                    <th key={col.key} className="border px-3 py-2">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={option.columns.length} className="text-center py-4 text-gray-400">No data found.</td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx}>
                      {option.columns.map((col) => (
                        <td key={col.key} className="border px-3 py-2">{row[col.key] || "-"}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Exports; 