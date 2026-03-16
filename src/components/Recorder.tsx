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
}

const SEGMENT_DURATION = 60;
const MAX_RETRIES = 3;
const HOLD_DELAY = 500;

const Recorder: React.FC<RecorderProps> = ({ taskId, onComplete, onBack }) => {
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
  
  // 新增：完成页相关状态
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setCurrentScript('');
  }, [currentSegment]);

  useEffect(() => {
    if (state.isRecording && state.recordingTime >= SEGMENT_DURATION) {
      console.log('⏰ 60秒到，自动停止录音');
      handleAutoStop();
    }
  }, [state.isRecording, state.recordingTime]);

  const handleAutoStop = useCallback(async () => {
    console.log('🔴 handleAutoStop 执行', '当前段:', currentSegment);
    
    if (!state.isRecording) {
      console.log('❌ 未在录制中，直接返回');
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
    console.log('🎤 stopRecording 返回 blob:', blob ? '有数据' : '无数据');
  
    let correctedBlob: Blob | null = blob;
    if (blob && correctedBlob) {
      if (blob.type === 'audio/wav' || blob.type === '') {
        correctedBlob = new Blob([blob], { type: 'audio/webm' });
        console.log('📝 修正 MIME 类型:', blob.type, '→ audio/webm');
      }
      
      console.log('📊 Blob 详情:', {
        originalType: blob?.type,
        correctedType: correctedBlob?.type,
        size: correctedBlob.size,
        sizeInMB: (correctedBlob.size / 1024 / 1024).toFixed(2) + ' MB'
      });
    } else {
      console.log('📊 Blob 为 null');
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
  
    if (correctedBlob) {
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
    }
  }, [state.isRecording, stopRecording, currentSegment]);

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
    console.log('🔵 handleTouchEnd 执行');
    
    if (isHoldStarting) {
      console.log('⏹️ 按住延迟中，取消录音');
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      setIsHoldStarting(false);
      return;
    }
  
    if (!state.isRecording || state.recordingTime >= SEGMENT_DURATION) {
      console.log('⏭️ 跳过手动停止');
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
  
    let correctedBlob: Blob | null = blob;
    if (blob) {
      if (blob.type === 'audio/wav' || blob.type === '') {
        correctedBlob = new Blob([blob], { type: 'audio/webm' });
        console.log('📝 修正 MIME 类型:', blob.type, '→ audio/webm');
      }
    } else {
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[currentSegment] = {
          ...newSegments[currentSegment],
          status: 'error',
          errorMsg: '录制失败',
        };
        return newSegments;
      });
      return;
    }

    if (correctedBlob) {
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
    }
  }, [isHoldStarting, state.isRecording, state.recordingTime, stopRecording, currentSegment]);

  const handleManualStop = useCallback(async () => {
    if (!state.isRecording) return;
    
    console.log('🛑 用户主动点击停止');
    await handleTouchEnd();
  }, [state.isRecording, handleTouchEnd]);

  const uploadSegment = async (blob: Blob, segmentIndex: number) => {
    setSegments(prev => {
      const newSegments = [...prev];
      newSegments[segmentIndex] = { ...newSegments[segmentIndex], status: 'uploading' };
      return newSegments;
    });

    try {
      const result = await uploadAudioSegment(blob, taskId, segmentIndex);
      console.log('上传结果:', result);

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

  // 修改：完成录制处理
  const handleComplete = useCallback(() => {
    const allUploaded = segments.every(s => s.status === 'uploaded');
    if (allUploaded) {
      setIsCompleted(true);
      // 通知后端（可选）
      fetch(`/api/complete/${taskId}`, { method: 'POST' }).catch(console.error);
      // 调用父组件的 onComplete（可选）
      onComplete(segments);
    } else {
      alert('请等待所有音频上传完成');
    }
  }, [segments, taskId, onComplete]);

  // 新增：复制任务编号
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
      case 'pending': return '按住下方按钮开始录音';
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

  // 如果已完成，显示完成页
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
              <li>• 检查音频质量</li>
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
              录制另一个胶囊
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>亲声胶囊 · 用声音传递心意</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* 标题 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">录制声音胶囊</h2>
        <p className="text-gray-500 mt-1">共3段，每段最多60秒</p>
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

      {/* 录音按钮区域 */}
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
        
        <div className="h-16 w-full max-w-xs mb-6">
          {state.isRecording ? (
            <canvas
              ref={canvasRef}
              width={300}
              height={64}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Volume2 className="w-6 h-6 mr-2" />
              <span className="text-sm">{showGuide ? '按住按钮开始录音' : '等待录音...'}</span>
            </div>
          )}
        </div>

        {state.isRecording && (
          <div className="text-3xl font-mono font-bold text-orange-600 mb-4">
            {formatTime(SEGMENT_DURATION - state.recordingTime)}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          {canRecord ? (
            <>
              <button
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isHoldStarting
                    ? 'bg-orange-300 scale-95'
                    : state.isRecording
                    ? 'bg-red-500 scale-110 animate-pulse'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl'
                }`}
                disabled={state.isRecording && !isHoldStarting}
              >
                {state.isRecording ? (
                  <Square className="w-10 h-10 text-white fill-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </button>
              
              {state.isRecording && (
                <button
                  onClick={handleManualStop}
                  className="px-6 py-2 bg-gray-600 text-white rounded-full text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-white" />
                  提前结束录音
                </button>
              )}
            </>
          ) : (
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

        <p className="text-sm text-gray-500 mt-4">
          {isHoldStarting && '请继续按住...'}
          {state.isRecording && '松开或点击按钮结束录音'}
          {canRecord && !isHoldStarting && !state.isRecording && '按住录音'}
        </p>
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

      {/* 底部按钮 - 只有未完成时显示 */}
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
          <li>• 请在安静的环境下录音</li>
          <li>• 距离手机麦克风10-15厘米</li>
          <li>• 每段可以重录最多3次</li>
          <li>• 录音会自动上传，请保持网络畅通</li>
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