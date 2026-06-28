import { apiFetch } from "../lib/api";
import React, { useState, useEffect } from "react";
import { DriveFile } from "../types";
import { HardDrive, Search, RefreshCw, AlertCircle, ExternalLink, FileText, FileSpreadsheet, File as FileIcon, Folder, Image as ImageIcon } from "lucide-react";

interface DriveViewProps {
  userId?: string;
  googleToken: string | null;
  onReauth: () => void;
}

export default function DriveView({ userId, googleToken, onReauth }: DriveViewProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [creating, setCreating] = useState(false);

  const fetchFiles = async (searchQuery: string = "") => {
    if (!userId || !googleToken) {
      setError("Not connected to Google Drive");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      let q = "trashed = false";
      if (searchQuery) {
        q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
      }
      
      if (filterType === "docs") {
        q += " and mimeType = 'application/vnd.google-apps.document'";
      } else if (filterType === "sheets") {
        q += " and mimeType = 'application/vnd.google-apps.spreadsheet'";
      } else if (filterType === "slides") {
        q += " and mimeType = 'application/vnd.google-apps.presentation'";
      } else if (filterType === "folders") {
        q += " and mimeType = 'application/vnd.google-apps.folder'";
      } else if (filterType === "images") {
        q += " and mimeType contains 'image/'";
      } else if (filterType === "pdf") {
        q += " and mimeType = 'application/pdf'";
      }

      const res = await apiFetch(`/api/drive?userId=${userId}&q=${encodeURIComponent(q)}`, {
        headers: {
          Authorization: `Bearer ${googleToken}`
        }
      });
      
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "reauth_required") {
          setError(data.details ? `Authentication failed: ${data.details}. Please ensure you've granted Google Drive permissions.` : "reauth_required");
          return;
        }
        throw new Error(data.error || "Failed to fetch files");
      }
      
      const data = await res.json();
      setFiles(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load files from Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && googleToken) {
      fetchFiles(query);
    }
  }, [userId, googleToken, filterType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(query);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("document")) return <FileText className="w-5 h-5 text-blue-600" />;
    if (mimeType.includes("spreadsheet")) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    if (mimeType.includes("presentation")) return <FileIcon className="w-5 h-5 text-yellow-600" />;
    if (mimeType.includes("folder")) return <Folder className="w-5 h-5 text-gray-500" />;
    if (mimeType.includes("image/")) return <ImageIcon className="w-5 h-5 text-red-500" />;
    if (mimeType === "application/pdf") return <FileIcon className="w-5 h-5 text-red-600" />;
    return <FileIcon className="w-5 h-5 text-gray-400" />;
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!userId || !googleToken) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/drive/folders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleToken}`,
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({ name: folderName })
      });
      if (!res.ok) throw new Error("Failed to create folder");
      fetchFiles(query); // Refresh
    } catch (err) {
      console.error(err);
      alert("Failed to create folder. Make sure you have granted Drive permissions.");
    } finally {
      setCreating(false);
    }
  };

  const templates = [
    "Class 11 Sociology",
    "Class 12 Sociology",
    "Class 8 Global Perspectives",
    "Class 9 History",
    "Lesson Plans",
    "Project Guidelines"
  ];

  if (!googleToken || error === "reauth_required" || error?.startsWith("Authentication failed")) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-paper-0">
        <HardDrive className="w-16 h-16 text-ink-300 mb-6" />
        <h2 className="font-serif text-2xl font-bold text-ink-900 mb-2">Connect Google Drive</h2>
        <p className="font-sans text-ink-600 max-w-md mb-6">
          Access and search your Google Drive files directly from your dashboard. Files shown belong to the currently signed-in Google account.
        </p>
        
        {error?.startsWith("Authentication failed") && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md text-left">
            <h4 className="font-bold text-red-800 text-sm mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Permission Denied
            </h4>
            <p className="text-red-700 text-xs">
              {error}. When signing in, make sure to check the boxes allowing access to Google Drive.
            </p>
          </div>
        )}

        <button
          onClick={onReauth}
          className="bg-[#2d5a4a] hover:bg-[#1f4236] text-white font-mono text-[11px] font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Connect Google Account
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-paper-0 overflow-hidden relative h-full">
      
      {/* Header & Controls */}
      <div className="p-6 md:p-8 bg-paper-1 border-b border-paper-2 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-900 flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-[#2d5a4a]" />
              Google Drive
            </h2>
            <p className="font-sans text-sm text-ink-500 mt-1">Browse your connected Drive files</p>
          </div>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-md flex items-center relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3" />
            <input
              type="text"
              placeholder="Search files..."
              className="w-full pl-9 pr-4 py-2 bg-paper-0 border border-paper-3 rounded-lg font-sans text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
          {["all", "docs", "sheets", "slides", "pdf", "folders", "images"].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors ${
                filterType === type 
                ? "bg-[#2d5a4a] text-white" 
                : "bg-paper-0 text-ink-600 border border-paper-3 hover:bg-paper-2"
              }`}
            >
              {type === "all" ? "All Files" : type}
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-paper-2">
          <h3 className="font-sans text-xs font-bold text-ink-600 uppercase tracking-wider mb-3">Quick Create Folder</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {templates.map(t => (
              <button
                key={t}
                disabled={creating}
                onClick={() => handleCreateFolder(t)}
                className="px-3 py-1.5 bg-paper-0 border border-paper-3 hover:border-[#2d5a4a]/40 text-ink-700 rounded text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Folder className="w-3.5 h-3.5 text-gray-500" />
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-400 space-y-4">
            <div className="w-8 h-8 border-2 border-[#2d5a4a]/20 border-t-[#2d5a4a] rounded-full animate-spin"></div>
            <p className="font-mono text-[11px] uppercase tracking-wider">Loading Files...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-600 space-y-4">
            <AlertCircle className="w-10 h-10" />
            <p className="font-sans text-sm">{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-400 space-y-4">
            <HardDrive className="w-12 h-12 text-ink-300" />
            <p className="font-sans text-sm">No files found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map(file => (
              <a
                key={file.id}
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-paper-1 border border-paper-2 hover:border-[#2d5a4a]/40 rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 p-2 bg-paper-0 rounded-lg">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-sans font-medium text-sm text-ink-900 truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="font-mono text-[10px] text-ink-500 mt-1 uppercase tracking-wide">
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-paper-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="font-mono text-[10px] text-[#2d5a4a] uppercase font-bold tracking-wider">Open</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#2d5a4a]" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
