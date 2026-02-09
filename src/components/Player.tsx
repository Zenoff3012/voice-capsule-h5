import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Heart, Share2, Gift, Download, RefreshCw, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Segment {
  id: number;
  uploadUrl: string | null;
}

interface PlayerProps {
  taskId: string;
  segments: Segment[];
  onRestart: () => void;
}

const Player: React.FC<PlayerProps> = ({ taskId, segments, onRestart }) => {
  const [currentSegment, setCurrentSegment] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentUrl = segments[currentSegment]?.uploadUrl;
  const shareUrl = `${window.location.origin}/play/${taskId}`;

  // 播放控制
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  // 切换段落
  const handleSegmentChange = (index: number) => {
    if (index !== currentSegment) {
      setCurrentSegment(index);
      setIsPlaying(false);
      setProgress(0);
    }
  };

  // 音频事件监听
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // 自动播放下一段
      if (currentSegment < segments.length - 1) {
        setTimeout(() => {
          setCurrentSegment(prev => prev + 1);
          setTimeout(() => {
            audio.play();
          }, 100);
        }, 500);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [currentSegment, segments.length]);

  // 当段落改变时自动播放
  useEffect(() => {
    if (audioRef.current && currentUrl) {
      audioRef.current.src = currentUrl;
      audioRef.current.load();
    }
  }, [currentSegment, currentUrl]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 分享功能
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '亲声胶囊 - 一份特别的声音礼物',
          text: '有人为你制作了一份声音礼物，快来听听吧！',
          url: shareUrl,
        });
      } catch (err) {
        console.log('分享取消');
      }
    } else {
      // 复制链接到剪贴板
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('链接已复制到剪贴板');
      } catch {
        alert(`请手动复制链接：${shareUrl}`);
      }
    }
  };

  // 下载音频
  const handleDownload = async () => {
    if (!currentUrl) return;
    
    try {
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `声音胶囊_第${currentSegment + 1}段.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('下载失败，请重试');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* 标题 */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">声音胶囊</h2>
        <p className="text-gray-500 mt-1">一份特别的声音礼物</p>
      </div>

      {/* 播放器卡片 */}
      <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
        {/* 段落选择 */}
        <div className="flex justify-center gap-2 mb-6">
          {segments.map((segment, idx) => (
            <button
              key={segment.id}
              onClick={() => handleSegmentChange(idx)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                idx === currentSegment
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              第{idx + 1}段
            </button>
          ))}
        </div>

        {/* 段落标题 */}
        <div className="text-center mb-6">
          <p className="text-lg font-medium text-gray-700">
            {currentSegment === 0 && '想对TA说的话'}
            {currentSegment === 1 && '你们的故事'}
            {currentSegment === 2 && '祝福与期待'}
          </p>
        </div>

        {/* 音频元素 */}
        <audio ref={audioRef} preload="metadata" />

        {/* 进度条 */}
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-100"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 播放控制 */}
        <div className="flex justify-center items-center gap-6">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isLiked ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentUrl}
            className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={!currentUrl}
            className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleShare}
          className="py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          分享
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <QrCode className="w-5 h-5" />
          {showQR ? '隐藏' : '二维码'}
        </button>
      </div>

      {/* 二维码 */}
      {showQR && (
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 text-center">
          <p className="text-sm text-gray-600 mb-4">扫码收听声音胶囊</p>
          <div className="inline-block p-4 bg-white rounded-xl shadow-inner">
            <QRCodeSVG
              value={shareUrl}
              size={200}
              level="M"
              includeMargin={true}
              imageSettings={{
                src: '/logo.png',
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-4 break-all">{shareUrl}</p>
        </div>
      )}

      {/* 重新制作 */}
      <button
        onClick={onRestart}
        className="w-full py-3 text-gray-500 flex items-center justify-center gap-2 hover:text-orange-500 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        制作新的声音胶囊
      </button>

      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-orange-50 rounded-xl">
        <p className="text-sm text-orange-700 text-center">
          这份声音礼物已保存，随时可以通过链接收听
        </p>
      </div>
    </div>
  );
};

export default Player;
