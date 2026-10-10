import React, { useState } from 'react';
import { Terminal, Copy, Check, Search, Filter } from 'lucide-react';
import type { ExecutionLog } from '../types';

interface LogsViewerProps {
  logs: ExecutionLog[];
}

export const LogsViewer: React.FC<LogsViewerProps> = ({ logs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery.trim() && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCopy = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: ExecutionLog['level']) => {
    switch (level) {
      case 'heal':
        return <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">HEAL</span>;
      case 'error':
        return <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">ERR</span>;
      case 'warn':
        return <span className="text-yellow-400 font-medium bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/30">WARN</span>;
      case 'debug':
        return <span className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">DBG</span>;
      default:
        return <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30">INFO</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Execution Console & Engine Logs</h3>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            {filteredLogs.length} events
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied to Clipboard' : 'Copy Logs'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search engine logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <Filter className="h-3 w-3 text-slate-500 ml-1.5 mr-1" />
          {['all', 'heal', 'info', 'warn', 'error'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono capitalize transition ${
                filterLevel === lvl
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 bg-slate-950 border border-slate-800/90 rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-96 min-h-64 space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-10 font-sans text-xs">
            No logs matched the selected filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 text-slate-300 hover:bg-slate-900/60 p-1 rounded transition">
              <span className="text-slate-500 select-none text-[11px] shrink-0 font-mono">
                {log.timestamp}
              </span>
              <span className="shrink-0 text-[10px]">{getLevelBadge(log.level)}</span>
              <span
                className={`break-all ${
                  log.level === 'heal'
                    ? 'text-amber-300 font-semibold'
                    : log.level === 'error'
                    ? 'text-rose-400'
                    : log.level === 'warn'
                    ? 'text-yellow-300'
                    : 'text-slate-300'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
