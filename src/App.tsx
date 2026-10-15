import React from 'react';
import { useDubbingEngine } from './hooks/useDubbingEngine';
import ConfigSidebar from './components/ConfigSidebar';
import TerminalLogs from './components/TerminalLogs';
import ReviewPanel from './components/ReviewPanel';
import ReviewModal from './components/ReviewModal';
import './index.css';

export default function App() {
  const engine = useDubbingEngine();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <ConfigSidebar engine={engine} />
        </div>
        <div className="lg:col-span-7 flex flex-col h-[600px] lg:h-[800px] bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden">
          <TerminalLogs engine={engine} />
          <ReviewPanel 
            items={engine.reviewQueueItems || []} 
            onApprove={engine.handleApprove}
            onRewrite={engine.handleRewrite}
            maxSpeed={engine.maxAutoFitSpeed}
            totalSubs={engine.totalSubsCount} 
          />
        </div>
      </div>
      <ReviewModal engine={engine} />
    </div>
  );
}
