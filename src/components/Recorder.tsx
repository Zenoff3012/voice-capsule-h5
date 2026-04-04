import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, RotateCcw, Check, Volume2, AlertCircle, ChevronRight, Loader2, MessageSquare } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import { uploadAudioSegment } from '../utils/cos-upload';
import { ScriptDrawer } from './ScriptDrawer';

interface Segment {
  id: number;
  status: 'pending' | 'recording' | 'processing' | 'recorded' | 'uploading' | 'uploaded' | 'error';
  blob: Blob | null;
  url: string | null;
  uploadUrl: string | null;
  retryCount: number;
  errorMsg?: string;
}

interface RecorderProps {
  taskId: string;
  onComplete: (segments: Segment[]) => void;
  onBack: () => void;
  maxDuration?: number; // 新增：支持外部传入时长限制，默认30秒
}

// 修改1: 默认改为30秒，通过 props 可配置
const DEFAULT_MAX_DURATION = 30;
const MAX_RETRIES = 3;
const HOLD_DELAY = 500;

const Recorder: React.FC<RecorderProps> = ({ 
  taskId, 
  onComplete, 
  onBack,
  maxDuration = DEFAULT_MAX_DURATION // 默认30秒
}) => {
  const { state, startRecording, stopRecording, resetRecording } = useRecorder();
  const [currentSegment, setCurrentSegment] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([
    { id: 0, status: 'pending', blob: null, url: null, uploadUrl: null, retryCount: 0 },
    { id: 1, status: 'pending', blob: null, url: null, uploadUrl: null, retryCount: 0 },
    { id: 2, status: 'pending', blob: null, url: null, uploadUrl: null, retryCount: 0 },
  ]);
  const [isHoldStarting, setIsHoldStarting] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showScriptDrawer, setShowScriptDrawer] = useState(false);
  const [currentScript, setCurrentScript] = useState('');
  
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 修改2: 使用 ref 存储 recording 状态，避免闭包问题影响中断逻辑
  const isRecordingRef = useRef(false);

  // 同步 recording 状态到 ref
  useEffect(() => {
    isRecordingRef.current = state.isRecording;
  }, [state.isRecording]);

  useEffect(() => {
    setCurrentScript('');
  }, [currentSegment]);

  // 修改3: 优化自动停止逻辑，使用传入的 maxDuration
  useEffect(() => {
    if (state.isRecording && state.recordingTime >= maxDuration) {
      console.log(`⏰ ${maxDuration}秒到，自动停止录音`);
      handleAutoStop();
    }
  }, [state.isRecording, state.recordingTime, maxDuration]);

  const handleAutoStop = useCallback(async () => {
    if (!isRecordingRef.current) return;
    
    setSegments(prev => {
      const newSegments = [...prev];
      newSegments[currentSegment] = { 
        ...newSegments[currentSegment], 
        status: 'processing' 
      };
      return newSegments;
    });
    
    const blob = await stopRecording();
    await processRecordedBlob(blob);
  }, [currentSegment, stopRecording]);

  // 新增: 提取 blob 处理逻辑，复用于自动停止和手动停止
  const processRecordedBlob = async (blob: Blob | null) => {
    let correctedBlob: Blob | null = blob;
    
    if (!correctedBlob) {
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[currentSegment] = {
          ...newSegments[currentSegment],
          status: 'error',
          errorMsg: '录制失败，请重试',
        };
        return newSegments;
      });
      return;
    }

    if (blob?.type === 'audio/wav' || blob?.type === '') {
      correctedBlob = new Blob([blob], { type: 'audio/webm' });
    }

    const url = URL.createObjectURL(correctedBlob);
    
    setSegments(prev => {
      const newSegments = [...prev];
      newSegments[currentSegment] = {
        ...newSegments[currentSegment],
        status: 'recorded',
        blob: correctedBlob,
        url,
      };
      return newSegments;
    });

    uploadSegment(correctedBlob, currentSegment);
  };

  const handleTouchStart = useCallback(() => {
    if (segments[currentSegment].status !== 'pending' && segments[currentSegment].status !== 'error') {
      return;
    }

    setIsHoldStarting(true);
    holdTimerRef.current = setTimeout(async () => {
      setIsHoldStarting(false);
      setShowGuide(false);
      
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[currentSegment] = { ...newSegments[currentSegment], status: 'recording' };
        return newSegments;
      });

      await startRecording();
    }, HOLD_DELAY);
  }, [currentSegment, segments, startRecording]);

  const handleTouchEnd = useCallback(async () => {
    if (isHoldStarting) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      setIsHoldStarting(false);
      return;
    }
  
    if (!isRecordingRef.current || state.recordingTime >= maxDuration) {
      return;
    }
  
    setSegments(prev => {
      const newSegments = [...prev];
      newSegments[currentSegment] = { 
        ...newSegments[currentSegment], 
        status: 'processing' 
      };
      return newSegments;
    });
  
    const blob = await stopRecording();
    await processRecordedBlob(blob);
  }, [isHoldStarting, currentSegment, stopRecording, state.recordingTime, maxDuration]);

  // 修改4: 优化手动停止，确保立即执行不受 hold 逻辑干扰
  const handleManualStop = useCallback(async () => {
    if (!isRecordingRef.current) return;
    
    console.log('🛑 用户主动点击停止');
    
    // 清除可能存在的 hold 定时器
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      setIsHoldStarting(false);
    }
    
    // 立即更新状态为处理中
    setSegments(prev => {
      const newSegments = [...prev];
      newSegments[currentSegment] = { 
        ...newSegments[currentSegment], 
        status: 'processing' 
      };
      return newSegments;
    });
    
    const blob = await stopRecording();
    await processRecordedBlob(blob);
  }, [currentSegment, stopRecording]);

  const uploadSegment = async (blob: Blob, segmentIndex: number) => {
    setSegments(prev => {
      const newSegments = [...prev];
      newSegments[segmentIndex] = { ...newSegments[segmentIndex], status: 'uploading' };
      return newSegments;
    });

    try {
      const result = await uploadAudioSegment(blob, taskId, segmentIndex);

      if (result.success) {
        setSegments(prev => {
          const newSegments = [...prev];
          newSegments[segmentIndex] = {
            ...newSegments[segmentIndex],
            status: 'uploaded',
            uploadUrl: result.url || null,
          };
          return newSegments;
        });
      } else {
        throw new Error(result.error || '上传失败');
      }
    } catch (error) {
      console.error('上传错误:', error);
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[segmentIndex] = {
          ...newSegments[segmentIndex],
          status: 'error',
          retryCount: newSegments[segmentIndex].retryCount + 1,
          errorMsg: error instanceof Error ? error.message : '上传失败',
        };
        return newSegments;
      });
    }
  };

  const handleRetryUpload = useCallback(async () => {
    const currentSeg = segments[currentSegment];
    if (!currentSeg.blob || currentSeg.retryCount >= MAX_RETRIES) {
      alert('无法重试，请重新录制');
      return;
    }

    await uploadSegment(currentSeg.blob, currentSegment);
  }, [currentSegment, segments]);

  const handleRetry = useCallback(() => {
    const currentSeg = segments[currentSegment];
    if (currentSeg.retryCount >= MAX_RETRIES) {
      alert('该段已重试次数过多，请继续下一段');
      return;
    }

    if (currentSeg.url) {
      URL.revokeObjectURL(currentSeg.url);
    }

    setSegments(prev => {
      const newSegments = [...prev];
      newSegments[currentSegment] = {
        ...newSegments[currentSegment],
        status: 'pending',
        blob: null,
        url: null,
        uploadUrl: null,
        errorMsg: undefined,
      };
      return newSegments;
    });

    resetRecording();
  }, [currentSegment, segments, resetRecording]);

  const handleNextSegment = useCallback(() => {
    if (currentSegment < 2) {
      setCurrentSegment(prev => prev + 1);
      resetRecording();
    }
  }, [currentSegment, resetRecording]);

  const handleComplete = useCallback(() => {
    const allUploaded = segments.every(s => s.status === 'uploaded');
    if (allUploaded) {
      setIsCompleted(true);
      fetch(`/api/complete/${taskId}`, { method: 'POST' }).catch(console.error);
      onComplete(segments);
    } else {
      alert('请等待所有留言上传完成');
    }
  }, [segments, taskId, onComplete]);

  const copyTaskId = () => {
    navigator.clipboard.writeText(taskId);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 新增: 计算进度百分比
  const getProgress = () => {
    if (!state.isRecording) return 0;
    return (state.recordingTime / maxDuration) * 100;
  };

  // 新增: 获取剩余时间颜色
  const getTimeColor = () => {
    const remaining = maxDuration - state.recordingTime;
    if (remaining <= 5) return 'text-red-600 animate-pulse';
    if (remaining <= 10) return 'text-orange-600';
    return 'text-orange-600';
  };

  const getSegmentColor = (segment: Segment) => {
    switch (segment.status) {
      case 'uploaded': return 'bg-green-500';
      case 'uploading': return 'bg-blue-500';
      case 'recorded': return 'bg-yellow-500';
      case 'processing': return 'bg-purple-500 animate-pulse';
      case 'recording': return 'bg-orange-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (segment: Segment) => {
    switch (segment.status) {
      case 'pending': return `按住下方按钮开始录音（限${maxDuration}秒）`;
      case 'recording': return '正在录音...';
      case 'processing': return '正在处理...';
      case 'recorded': return '录音完成，准备上传...';
      case 'uploading': return '正在上传...';
      case 'uploaded': return '上传成功！';
      case 'error': return segment.errorMsg || '上传失败，可重试';
      default: return '';
    }
  };

  const currentSeg = segments[currentSegment];
  const canRecord = currentSeg.status === 'pending' || currentSeg.status === 'error';
  const canProceed = segments.every(s => s.status === 'uploaded');
  
  // 计算环形进度条参数
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (getProgress() / 100) * circumference;

  if (isCompleted) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-green-800 mb-2">录制完成！</h3>
          <p className="text-green-600 mb-4">声音已安全保存，正在制作中...</p>
          
          <div className="bg-white rounded-xl p-4 mb-4 text-left">
            <div className="text-sm text-gray-500 mb-1">任务编号（请保存）</div>
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono font-bold text-orange-600">{taskId}</code>
              <button 
                onClick={copyTaskId}
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 transition-colors"
              >
                {showCopyToast ? '✓ 已复制' : '复制'}
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 space-y-2 bg-white/50 rounded-lg p-4 text-left">
            <p>⏱️ 制作时间：约 30 分钟</p>
            <p>👨‍💼 工作人员将：</p>
            <ul className="text-xs text-gray-500 space-y-1 ml-4">
              <li>• 检查留言质量</li>
              <li>• 合并三段录音</li>
              <li>• 生成专属播放链接</li>
            </ul>
          </div>
          
          <div className="mt-6 pt-4 border-t border-green-200">
            <p className="text-sm text-green-700 mb-2">制作完成后，链接将发送至您的微信</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-sm text-gray-500 underline"
            >
              录制另一个时光贴
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>亲声时光贴 · 用声音传递心意</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* 标题 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">录制声音时光贴</h2>
        <p className="text-gray-500 mt-1">共3段，每段最多{maxDuration}秒</p>
      </div>

      {/* 段进度指示器 */}
      <div className="flex justify-center gap-3 mb-8">
        {segments.map((segment, idx) => (
          <div
            key={segment.id}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all ${
              getSegmentColor(segment)
            } ${idx === currentSegment ? 'ring-4 ring-orange-200 scale-110' : ''}`}
          >
            {segment.status === 'uploaded' ? (
              <Check className="w-6 h-6" />
            ) : segment.status === 'uploading' || segment.status === 'processing' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              idx + 1
            )}
          </div>
        ))}
      </div>

      {/* 当前段信息 */}
      <div className="text-center mb-6">
        <p className="text-lg font-medium text-gray-700 mb-2">
          第 {currentSegment + 1} 段
          {currentSegment === 0 && ' - "想对TA说的话"'}
          {currentSegment === 1 && ' - "你们的故事"'}
          {currentSegment === 2 && ' - "祝福与期待"'}
        </p>
        
        {canRecord && (
          <button
            onClick={() => setShowScriptDrawer(true)}
            className="inline-flex items-center gap-1 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            {currentScript ? '换一句' : '不知道说什么？选个话术'}
          </button>
        )}
        
        <p className="text-sm text-gray-500 mt-2">
          {getStatusText(currentSeg)}
        </p>
      </div>

      {/* 修改5: 录音区域 - 添加环形进度条可视化 */}
      <div className="flex flex-col items-center mb-8">
        {currentScript && (
          <div className="w-full max-w-xs mb-4 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-orange-600 font-medium">参考文案（可照着读）：</span>
              <button 
                onClick={() => setCurrentScript('')}
                className="text-xs text-gray-400 underline ml-auto"
              >
                清空
              </button>
            </div>
            <p className="text-gray-800 text-base leading-relaxed">{currentScript}</p>
          </div>
        )}
        
        {/* 修改: 使用环形进度条替代 canvas */}
        <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
          {state.isRecording ? (
            <>
              {/* 背景圆环 */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke="#fed7aa"
                  strokeWidth="6"
                />
                {/* 进度圆环 */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="6"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                    transition: 'stroke-dashoffset 0.1s linear'
                  }}
                />
              </svg>
              
              {/* 中间显示剩余时间 */}
              <div className="text-center z-10">
                <div className={`text-2xl font-mono font-bold ${getTimeColor()}`}>
                  {formatTime(maxDuration - state.recordingTime)}
                </div>
                <div className="text-xs text-gray-500">剩余</div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-full w-full">
              <Volume2 className="w-8 h-8 mr-2" />
              <span className="text-sm">{showGuide ? '按住录音' : '等待中...'}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-4">
          {/* 录音按钮 - 只在可以录音时显示（未开始或错误状态） */}
          {canRecord && (
            <button
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all relative ${
                isHoldStarting
                  ? 'bg-orange-300 scale-95'
                  : state.isRecording
                  ? 'bg-red-500 scale-105 shadow-lg shadow-red-200'
                  : 'bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl'
              }`}
              disabled={state.isRecording && !isHoldStarting}
            >
              {state.isRecording ? (
                <Square className="w-8 h-8 text-white fill-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
              
              {state.isRecording && (
                <span className="absolute w-full h-full rounded-full bg-red-400 animate-ping opacity-30"></span>
              )}
            </button>
          )}
          
          {/* 中断按钮 - 关键修复：移出 canRecord 条件，只要录音中就显示 */}
          {state.isRecording && (
            <button
              onClick={handleManualStop}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-red-500 text-red-600 rounded-full font-medium hover:bg-red-50 transition-colors shadow-sm active:scale-95 z-10"
            >
              <Square className="w-4 h-4 fill-red-600" />
              <span>结束录音</span>
              <span className="text-xs text-red-400 ml-1">
                ({state.recordingTime}s/{maxDuration}s)
              </span>
            </button>
          )}

          {/* 提示文字 - 录音中显示提示，未录音显示按住提示 */}
          {state.isRecording ? (
            <p className="text-sm text-gray-500">点击上方按钮或松手结束录音</p>
          ) : (
            canRecord && (
              <p className="text-sm text-gray-500">
                {isHoldStarting ? '请继续按住...' : '按住录音，松手或点击结束'}
              </p>
            )
          )}
          
          {/* 下一段/重试按钮 - 只在非录音且非可录音状态显示 */}
          {!canRecord && !state.isRecording && (
            <div className="flex gap-4">
              {currentSeg.status === 'uploaded' && currentSegment < 2 && (
                <button
                  onClick={handleNextSegment}
                  className="px-6 py-3 bg-orange-500 text-white rounded-full font-medium flex items-center gap-2 hover:bg-orange-600 transition-colors"
                >
                  下一段
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              {(currentSeg.status === 'error' || currentSeg.status === 'uploaded') && (
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-gray-500 text-white rounded-full font-medium flex items-center gap-2 hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  重新录制
                </button>
              )}
              {currentSeg.status === 'error' && currentSeg.blob && (
                <button
                  onClick={handleRetryUpload}
                  className="px-6 py-3 bg-blue-500 text-white rounded-full font-medium flex items-center gap-2 hover:bg-blue-600 transition-colors"
                >
                  <Loader2 className="w-5 h-5" />
                  重试上传
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {currentSeg.url && currentSeg.status !== 'uploading' && currentSeg.status !== 'processing' && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">预览：</p>
          <audio
            src={currentSeg.url}
            controls
            className="w-full"
          />
        </div>
      )}

      {(state.error || currentSeg.status === 'error') && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">
              {state.error ? '录音出错' : '上传失败'}
            </p>
            <p className="text-red-600 text-sm">
              {state.error || currentSeg.errorMsg}
            </p>
          </div>
        </div>
      )}

      {/* 底部按钮 */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          返回
        </button>
        {canProceed && (
          <button
            onClick={handleComplete}
            className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            完成制作
          </button>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-blue-700 font-medium mb-2">录音小贴士：</p>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>请在安静的环境下录音</li>
          <li>距离手机麦克风10-15厘米</li>
          <li>每段限{maxDuration}秒，可随时中断</li>
          <li>录音会自动上传，请保持网络畅通</li>
        </ul>
      </div>

      <ScriptDrawer 
        visible={showScriptDrawer}
        onClose={() => setShowScriptDrawer(false)}
        onSelect={setCurrentScript}
        segmentIndex={currentSegment}
      />
    </div>
  );
};

export default Recorder;