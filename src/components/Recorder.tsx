import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, RotateCcw, Check, Volume2, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import { uploadAudioSegment } from '../utils/cos-upload';

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

const SEGMENT_DURATION = 60; // 每段60秒
const MAX_RETRIES = 3; // 每段最多重试3次
const HOLD_DELAY = 500; // 按住500ms才开始录音（防止误触）

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
  
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 音量可视化
  useEffect(() => {
    if (!canvasRef.current || !state.isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制音量条
      const barCount = 20;
      const barWidth = canvas.width / barCount;
      const maxHeight = canvas.height * 0.8;
      
      for (let i = 0; i < barCount; i++) {
        // 添加一些随机波动效果
        const randomFactor = 0.5 + Math.random() * 0.5;
        const barHeight = state.volume * maxHeight * randomFactor;
        const x = i * barWidth + barWidth * 0.2;
        const y = (canvas.height - barHeight) / 2;
        
        // 渐变色
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#f97316');
        gradient.addColorStop(1, '#ea580c');
        
        ctx.fillStyle = gradient;
        ctx.roundRect(x, y, barWidth * 0.6, barHeight, 4);
        ctx.fill();
      }

      if (state.isRecording) {
        requestAnimationFrame(draw);
      }
    };

    draw();
  }, [state.isRecording, state.volume]);

  // 自动停止：60秒倒计时结束
  useEffect(() => {
    if (state.isRecording && state.recordingTime >= SEGMENT_DURATION) {
      console.log('⏰ 60秒到，自动停止录音');
      handleAutoStop();
    }
  }, [state.isRecording, state.recordingTime]);

  // 自动停止处理（区分于手动停止）
  const handleAutoStop = useCallback(async () => {
    console.log('🔴 handleAutoStop 执行', '当前段:', currentSegment, '录制时间:', state.recordingTime, '是否录制中:', state.isRecording);
    
    

    if (!state.isRecording) {
      console.log('❌ 未在录制中，直接返回');
      return;
    }
    
    // 立即更新为 processing 状态，给用户反馈
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

// ✅ 添加：强制修正 MIME 类型（解决 wav/webm 混乱）
let correctedBlob = blob;
if (blob) {
  // Edge/Chrome 录的是 webm，但可能错误标记为 wav
  const isActuallyWebm = blob.size > 1000; // 有数据就是 webm
  if (blob.type === 'audio/wav' || blob.type === '') {
    correctedBlob = new Blob([blob], { type: 'audio/webm' });
    console.log('📝 修正 MIME 类型:', blob.type, '→ audio/webm');
  } else {
    correctedBlob = blob;
  }
  
  console.log('📊 Blob 详情:', {
    originalType: blob?.type,
    correctedType: correctedBlob?.type,
    size: correctedBlob?.size,
    sizeInMB: correctedBlob ? (correctedBlob.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'
  });
} else {
  console.log('📊 Blob 为 null');
}

// 后续使用 correctedBlob 而不是 blob
if (correctedBlob) {
  const url = URL.createObjectURL(correctedBlob);
  // ... 后续代码
  uploadSegment(correctedBlob, currentSegment); // ✅ 传 correctedBlob
}
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      
      // 更新段状态为已录制
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[currentSegment] = {
          ...newSegments[currentSegment],
          status: 'recorded',
          blob,
          url,
        };
        return newSegments;
      });

      // 自动上传
      uploadSegment(blob, currentSegment);
    } else {
      // 录制失败，回到 pending
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[currentSegment] = {
          ...newSegments[currentSegment],
          status: 'error',
          errorMsg: '录制失败，请重试',
        };
        return newSegments;
      });
    }
  }, [state.isRecording, stopRecording, currentSegment]);

  // 开始按住录音
  const handleTouchStart = useCallback(() => {
    if (segments[currentSegment].status !== 'pending' && segments[currentSegment].status !== 'error') {
      return; // 已录制完成，不能重新录制除非重置
    }

    setIsHoldStarting(true);
    holdTimerRef.current = setTimeout(async () => {
      setIsHoldStarting(false);
      setShowGuide(false);
      
      // 更新当前段状态为录制中
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[currentSegment] = { ...newSegments[currentSegment], status: 'recording' };
        return newSegments;
      });

      await startRecording();
    }, HOLD_DELAY);
  }, [currentSegment, segments, startRecording]);

  // 结束录音（手动）
  const handleTouchEnd = useCallback(async () => {
    console.log('🔵 handleTouchEnd 执行', 'isHoldStarting:', isHoldStarting, '录制时间:', state.recordingTime, '是否录制中:', state.isRecording);
    
    // 如果还在按住延迟中，取消录音
    if (isHoldStarting) {
      console.log('⏹️ 按住延迟中，取消录音');
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      setIsHoldStarting(false);
      return;
    }

    // 如果已经在自动停止处理中，不要重复执行
    if (!state.isRecording || state.recordingTime >= SEGMENT_DURATION) {
      console.log('⏭️ 跳过手动停止，由自动停止处理或已超时');
      return;
    }

    // 手动停止：同样需要 processing 状态
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

// ✅ 添加：强制修正 MIME 类型（解决 wav/webm 混乱）
let correctedBlob = blob;
if (blob) {
  // Edge/Chrome 录的是 webm，但可能错误标记为 wav
  const isActuallyWebm = blob.size > 1000; // 有数据就是 webm
  if (blob.type === 'audio/wav' || blob.type === '') {
    correctedBlob = new Blob([blob], { type: 'audio/webm' });
    console.log('📝 修正 MIME 类型:', blob.type, '→ audio/webm');
  } else {
    correctedBlob = blob;
  }
  
  console.log('📊 Blob 详情:', {
    originalType: blob?.type,
    correctedType: correctedBlob?.type,
    size: correctedBlob?.size,
    sizeInMB: correctedBlob ? (correctedBlob.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'
  });
} else {
  console.log('📊 Blob 为 null');
}

// 后续使用 correctedBlob 而不是 blob
if (correctedBlob) {
  const url = URL.createObjectURL(correctedBlob);
  // ... 后续代码
  uploadSegment(correctedBlob, currentSegment); // ✅ 传 correctedBlob
}
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      
      // 更新段状态为已录制
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[currentSegment] = {
          ...newSegments[currentSegment],
          status: 'recorded',
          blob,
          url,
        };
        return newSegments;
      });

      // 自动上传
      uploadSegment(blob, currentSegment);
    }
  }, [isHoldStarting, state.isRecording, state.recordingTime, stopRecording, currentSegment]);

  // 主动停止录音（新增：按钮点击停止）
  const handleManualStop = useCallback(async () => {
    if (!state.isRecording) return;
    
    console.log('🛑 用户主动点击停止');
    await handleTouchEnd();
  }, [state.isRecording, handleTouchEnd]);

  // 上传音频段
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

  // 重试上传（新增：只重试上传，不重录）
  const handleRetryUpload = useCallback(async () => {
    const currentSeg = segments[currentSegment];
    if (!currentSeg.blob || currentSeg.retryCount >= MAX_RETRIES) {
      alert('无法重试，请重新录制');
      return;
    }

    await uploadSegment(currentSeg.blob, currentSegment);
  }, [currentSegment, segments]);

  // 重录当前段
  const handleRetry = useCallback(() => {
    const currentSeg = segments[currentSegment];
    if (currentSeg.retryCount >= MAX_RETRIES) {
      alert('该段已重试次数过多，请继续下一段');
      return;
    }

    // 释放之前的URL
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

  // 切换到下一段
  const handleNextSegment = useCallback(() => {
    if (currentSegment < 2) {
      setCurrentSegment(prev => prev + 1);
      resetRecording();
    }
  }, [currentSegment, resetRecording]);

  // 完成所有录制
  const handleComplete = useCallback(() => {
    const allUploaded = segments.every(s => s.status === 'uploaded');
    if (allUploaded) {
      onComplete(segments);
    } else {
      alert('请等待所有音频上传完成');
    }
  }, [segments, onComplete]);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取段状态颜色
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

  // 获取状态文字
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
        <p className="text-lg font-medium text-gray-700">
          第 {currentSegment + 1} 段
          {currentSegment === 0 && ' - "想对TA说的话"'}
          {currentSegment === 1 && ' - "你们的故事"'}
          {currentSegment === 2 && ' - "祝福与期待"'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {getStatusText(currentSeg)}
        </p>
      </div>

      {/* 录音按钮区域 */}
      <div className="flex flex-col items-center mb-8">
        {/* 音量可视化 */}
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

        {/* 倒计时 */}
        {state.isRecording && (
          <div className="text-3xl font-mono font-bold text-orange-600 mb-4">
            {formatTime(SEGMENT_DURATION - state.recordingTime)}
          </div>
        )}

        {/* 录音按钮区域 */}
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
              
              {/* 新增：主动停止按钮（录制中时显示） */}
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

        {/* 提示文字 */}
        <p className="text-sm text-gray-500 mt-4">
          {isHoldStarting && '请继续按住...'}
          {state.isRecording && '松开或点击按钮结束录音'}
          {canRecord && !isHoldStarting && !state.isRecording && '按住录音'}
        </p>
      </div>

      {/* 音频预览 */}
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

      {/* 错误提示 */}
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
            className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
          >
            完成制作
          </button>
        )}
      </div>

      {/* 录音提示 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-blue-700 font-medium mb-2">录音小贴士：</p>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>• 请在安静的环境下录音</li>
          <li>• 距离手机麦克风10-15厘米</li>
          <li>• 每段可以重录最多3次</li>
          <li>• 录音会自动上传，请保持网络畅通</li>
        </ul>
      </div>
    </div>
  );
};

export default Recorder;