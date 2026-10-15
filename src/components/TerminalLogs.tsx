import React, { useEffect } from 'react';
import { Terminal } from 'lucide-react';

export default function TerminalLogs({ engine }: { engine: any }) {
  const { logs, logsEndRef } = engine;
  
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);
  
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-900 w-full overflow-hidden">
      <div className="flex items-center space-x-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
        <Terminal className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-mono text-gray-300">Tiến trình hệ thống</span>
      </div>
      <div ref={containerRef} className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-2 scroll-smooth">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">Đang chờ lệnh...</div>
        ) : (
          logs.slice(-200).map((log: any) => (
            <div 
              key={log.id} 
              className={`leading-relaxed break-words ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                'text-gray-300'
              }`}
            >
              <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
              {log.msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
