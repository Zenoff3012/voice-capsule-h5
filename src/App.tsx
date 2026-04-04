import { useState } from 'react';
import VerifyForm, { OrderInfo } from './components/VerifyForm';
import Recorder from './components/Recorder';
import Player from './components/Player';
import './App.css';

type AppView = 'verify' | 'record' | 'complete';

interface Segment {
  id: number;
  status: 'pending' | 'recording' | 'processing' | 'recorded' | 'uploading' | 'uploaded' | 'error';
  blob: Blob | null;
  url: string | null;
  uploadUrl: string | null;
  retryCount: number;
  errorMsg?: string;
}

function App() {
  const [currentView, setCurrentView] = useState<AppView>('verify');
  const [taskId, setTaskId] = useState<string>('');
  const [_orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);

  const handleVerified = (newTaskId: string, info: OrderInfo) => {
    setTaskId(newTaskId);
    setOrderInfo(info);
    setCurrentView('record');
  };

  const handleRecordComplete = (recordedSegments: Segment[]) => {
    setSegments(recordedSegments);
    setCurrentView('complete');
  };

  const handleBackToVerify = () => {
    setCurrentView('verify');
    setTaskId('');
    setOrderInfo(null);
    setSegments([]);
  };

  const handleRestart = () => {
    setCurrentView('verify');
    setTaskId('');
    setOrderInfo(null);
    setSegments([]);
  };

  const renderView = () => {
    switch (currentView) {
      case 'verify':
        return <VerifyForm onVerified={handleVerified} />;
      case 'record':
        return (
          <Recorder
            taskId={taskId}
            onComplete={handleRecordComplete}
            onBack={handleBackToVerify}
          />
        );
      case 'complete':
        return (
          <Player
            taskId={taskId}
            segments={segments}
            onRestart={handleRestart}
          />
        );
      default:
        return <VerifyForm onVerified={handleVerified} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6]" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", "SimSun", serif' }}>
      {/* 顶部导航 - 复古风格 */}
      <header className="bg-[#FDF6E3] shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-10 border-b border-[#E8E0D0]">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 复古收音机图标（简化版） */}
            <div className="w-9 h-9 bg-gradient-to-br from-[#D4A574] to-[#B85450] rounded-lg flex items-center justify-center shadow-md border-2 border-[#8B5A2B]">
              <span className="text-white font-bold text-sm" style={{ fontFamily: '"Source Han Serif SC", serif' }}>时</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[#3D2C1F] text-lg tracking-wide" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                亲声时光贴
              </span>
              <span className="text-[10px] text-[#8B5A2B] opacity-70" style={{ fontFamily: '"KaiTi", "STKaiti", serif' }}>
                把声音贴进时光里
              </span>
            </div>
          </div>
          
          {/* 进度指示器 - 复古配色 */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              currentView === 'verify' ? 'bg-[#B85450]' : 'bg-[#C9B8A0]'
            }`} />
            <div className="w-3 h-0.5 bg-[#C9B8A0]" />
            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              currentView === 'record' ? 'bg-[#B85450]' : 'bg-[#C9B8A0]'
            }`} />
            <div className="w-3 h-0.5 bg-[#C9B8A0]" />
            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              currentView === 'complete' ? 'bg-[#B85450]' : 'bg-[#C9B8A0]'
            }`} />
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="py-4">
        {renderView()}
      </main>

      {/* 底部信息 - 复古风格 */}
      <footer className="py-6 text-center bg-[#F5F0E6] border-t border-[#E8E0D0] mt-auto">
        <p className="text-sm text-[#8B5A2B] opacity-80 tracking-widest" style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }}>
          亲声时光贴 · 把声音贴进时光里
        </p>
        <p className="text-xs text-[#A09080] mt-2" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
          技术支持：AI语音处理
        </p>
      </footer>
    </div>
  );
}

export default App;