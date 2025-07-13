import React, { useEffect, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

function Files() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("uploadedFiles");
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setFiles(parsed);
      } else {
        setFiles([]);
      }
    } catch {
      setFiles([]);
    }
  }, []);

  const handleDelete = (fileToDelete) => {
    toast(
      (t) => (
        <span className="flex flex-col">
          <span className="font-medium text-sm text-gray-900">
            Delete <span className="text-blue-600">{fileToDelete.fileName}</span>?
          </span>
          <div className="mt-2 flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                toast("🚫 Deletion cancelled");
              }}
              className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const updated = files.filter((f) => f.fileUrl !== fileToDelete.fileUrl);
                setFiles(updated);
                localStorage.setItem("uploadedFiles", JSON.stringify(updated));
                toast.dismiss(t.id);
                toast.success("🗑️ File deleted");
              }}
              className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </span>
      ),
      { duration: 5000 }
    );
  };

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex justify-between items-center">
        <h2 className="text-xl font-semibold text-blue-600 flex items-center gap-2">
          <FileText className="w-5 h-5" /> Shared Files
        </h2>
        <div className={`flex items-center gap-2`}>
          <div
            className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
            title={isOnline ? "Online" : "Offline"}
          ></div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.length === 0 ? (
          <p className="text-gray-400 col-span-full text-center mt-10">No files shared yet.</p>
        ) : (
          files.map((file, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedFile(file)}
              className="cursor-pointer bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <FileText className="text-blue-600 w-6 h-6" />
                <div>
                  <p className="font-medium text-gray-800 truncate">{file.fileName}</p>
                  <p className="text-xs text-gray-400">{file.fileSize}</p>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 items-center">
                <span>🕒 {file.time}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file);
                  }}
                  className="text-red-500 hover:text-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedFile && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{selectedFile.fileName}</h3>
            <p className="text-sm text-gray-500 mb-2">Size: {selectedFile.fileSize}</p>
            <p className="text-sm text-gray-500 mb-4">Sent at: {selectedFile.time}</p>
            {selectedFile.fileUrl?.startsWith("data:image") && (
              <img
                src={selectedFile.fileUrl}
                alt="Preview"
                className="w-full h-auto rounded mb-4"
              />
            )}
            <div className="flex justify-between items-center">
              <a
                href={selectedFile.fileUrl}
                download={selectedFile.fileName}
                className="text-sm px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Download
              </a>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Files;
