import React, { useState, useEffect } from "react";

function Exports() {
  const exportUrl = "http://localhost:8000/api/export/messages";
  const messagesUrl = "http://localhost:8000/api/rooms/room-3/messages";
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetch(messagesUrl)
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]));
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setStatus("");
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("Failed to download Excel file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "messages.xlsx";
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
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-4 text-blue-700">Export Chat Messages</h1>
        <p className="mb-4 text-gray-700 text-center">
          View and download all chat messages as an Excel file. Use the endpoint below or click the button.
        </p>
        <div className="mb-4 p-2 bg-gray-200 rounded text-sm text-gray-800 w-full text-center">
          <code>{exportUrl}</code>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition font-semibold w-full max-w-xs ${downloading ? "opacity-60 cursor-wait" : ""}`}
        >
          {downloading ? "Downloading..." : "Download Excel"}
        </button>
        {status && (
          <div className={`mt-4 text-sm font-medium ${status.includes("success") ? "text-green-600" : "text-red-600"}`}>{status}</div>
        )}
        <div className="mt-8 w-full overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2">Sender</th>
                <th className="border px-3 py-2">Content</th>
                <th className="border px-3 py-2">File Name</th>
                <th className="border px-3 py-2">File Size</th>
                <th className="border px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-400">No messages found.</td>
                </tr>
              ) : (
                messages.map((msg, idx) => (
                  <tr key={idx}>
                    <td className="border px-3 py-2">{msg.sender}</td>
                    <td className="border px-3 py-2">{msg.content}</td>
                    <td className="border px-3 py-2">{msg.fileName || "-"}</td>
                    <td className="border px-3 py-2">{msg.fileSize || "-"}</td>
                    <td className="border px-3 py-2">{msg.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Exports; 