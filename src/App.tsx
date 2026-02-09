import  { useState } from 'react';
import VerifyForm, { OrderInfo } from './components/VerifyForm';
import Recorder from './components/Recorder';
import Player from './components/Player';
import './App.css';

type AppView = 'verify' | 'record' | 'complete';

interface Segment {
  id: number;
  status: 'pending' | 'recording' | 'recorded' | 'uploading' | 'uploaded' | 'error';
  blob: Blob | null;
  url: string | null;
  uploadUrl: string | null;
  retryCount: number;
}

function App() {
  const [currentView, setCurrentView] = useState<AppView>('verify');
  const [taskId, setTaskId] = useState<string>('');
  const [_orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);

  // 验证成功回调
  const handleVerified = (newTaskId: string, info: OrderInfo) => {
    setTaskId(newTaskId);
    setOrderInfo(info);
    setCurrentView('record');
  };

  // 录制完成回调
  const handleRecordComplete = (recordedSegments: Segment[]) => {
    setSegments(recordedSegments);
    setCurrentView('complete');
  };

  // 返回验证页
  const handleBackToVerify = () => {
    setCurrentView('verify');
    setTaskId('');
    setOrderInfo(null);
    setSegments([]);
  };

  // 重新开始
  const handleRestart = () => {
    setCurrentView('verify');
    setTaskId('');
    setOrderInfo(null);
    setSegments([]);
  };

  // 渲染当前视图
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">亲</span>
            </div>
            <span className="font-semibold text-gray-800">亲声胶囊</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${currentView === 'verify' ? 'bg-orange-500' : 'bg-gray-300'}`} />
            <div className="w-4 h-0.5 bg-gray-200" />
            <div className={`w-2 h-2 rounded-full ${currentView === 'record' ? 'bg-orange-500' : 'bg-gray-300'}`} />
            <div className="w-4 h-0.5 bg-gray-200" />
            <div className={`w-2 h-2 rounded-full ${currentView === 'complete' ? 'bg-orange-500' : 'bg-gray-300'}`} />
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="py-4">
        {renderView()}
      </main>

      {/* 底部信息 */}
      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">
          亲声胶囊 · 用声音传递心意
        </p>
        <p className="text-xs text-gray-300 mt-1">
          技术支持：AI语音处理
        </p>
      </footer>
    </div>
  );
}

export default App;
