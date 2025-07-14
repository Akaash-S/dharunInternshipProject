import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// Obfuscated secret password (e.g., 'letMeIn123')
const accessCodes = [99, 108, 101, 116, 77, 101, 73, 110, 49, 50, 51, 42, 7];
function getEntryPassword() {
  // The password is from index 1 to -2 (exclusive)
  return String.fromCharCode(...accessCodes.slice(1, -2));
}

function Exports() {
  const [entered, setEntered] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [showError, setShowError] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all table names from Supabase (public schema)
  useEffect(() => {
    async function fetchTables() {
      const { data, error } = await supabase.rpc('pg_catalog.pg_tables', {});
      // Fallback: use information_schema.tables
      let tableNames = [];
      if (!error && Array.isArray(data)) {
        tableNames = data
          .filter(t => t.schemaname === 'public')
          .map(t => t.tablename);
      } else {
        // Try information_schema.tables
        const { data: infoData, error: infoError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
        if (!infoError && Array.isArray(infoData)) {
          tableNames = infoData.map(t => t.table_name);
        }
      }
      setTables(tableNames);
      if (tableNames.length > 0) setSelectedTable(tableNames[0]);
    }
    fetchTables();
  }, []);

  // Always call hooks at the top level!
  useEffect(() => {
    if (!entered || !selectedTable) return;
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError("");
      let { data: rows, error } = await supabase.from(selectedTable).select("*");
      if (!cancelled) {
        if (error) {
          setData([]);
          setError(error.message || "Failed to fetch data");
        } else {
          setData(Array.isArray(rows) ? rows : []);
        }
        setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [selectedTable, entered]);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  function handlePasswordSubmit() {
    if (inputPassword === getEntryPassword()) {
      setEntered(true);
      setShowError(false);
    } else {
      setShowError(true);
      setInputPassword("");
    }
  }

  function downloadFile(url, filename) {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
      })
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => alert('Failed to download file.'));
  }

  if (!entered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4 text-blue-700">Enter Access Code</h1>
          <input
            type="password"
            className="border px-4 py-2 rounded mb-4 w-full"
            placeholder="Enter password"
            value={inputPassword}
            onChange={e => setInputPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded font-semibold w-full"
            onClick={handlePasswordSubmit}
          >
            Enter
          </button>
          {showError && (
            <div className="text-red-600 mt-2 text-sm">Incorrect password</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center w-full max-w-6xl">
        <h1 className="text-2xl font-bold mb-4 text-blue-700">Live Database Export</h1>
        <div className="flex gap-2 mb-6">
          {tables.map((table) => (
            <button
              key={table}
              onClick={() => setSelectedTable(table)}
              className={`px-4 py-2 rounded font-semibold border transition-all ${selectedTable === table ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-blue-700 border-gray-300 hover:bg-blue-50"}`}
            >
              {table}
            </button>
          ))}
        </div>
        <div className="flex gap-4 mb-4">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            onClick={() => downloadFile(`/api/export/${selectedTable}`, `${selectedTable}.xlsx`)}
            disabled={!selectedTable}
          >
            Download Excel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
            onClick={() => downloadFile(`/api/export/${selectedTable}/json`, `${selectedTable}.json`)}
            disabled={!selectedTable}
          >
            Download JSON
          </button>
        </div>
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="mt-8 w-full overflow-x-auto">
            <table className="min-w-full border text-sm bg-white shadow rounded-lg">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="border px-4 py-2 font-semibold text-gray-700 text-left whitespace-nowrap">{col}</th>
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
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {columns.map((col) => (
                        <td key={col} className="border px-4 py-2 whitespace-nowrap text-gray-800">{row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}</td>
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