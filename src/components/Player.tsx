import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Heart, Share2, Gift, Download, RefreshCw, QrCode, Image as ImageIcon, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

interface Segment {
  id: number;
  uploadUrl: string | null;
}

interface PlayerProps {
  taskId: string;
  segments: Segment[];
  onRestart: () => void;
}

// 模板配置（对应即梦生成的4张图）
const TEMPLATES = [
  { 
    id: 'ink', 
    name: '水墨', 
    bg: '/templates/bg1.png', 
    titleY: 350,      // 从150下移，避免顶头
    qrY: 850,         // 从1100上移，靠近中间
    hintY: 1300,      // 相应上移
    textColor: '#3D2C1F' 
  },
  { 
    id: 'pastel', 
    name: '蜡笔', 
    bg: '/templates/bg2.png', 
    titleY: 300,      // 圆形中心区域上方
    qrY: 700,         // 靠近圆形中心
    hintY: 1150,      // 下方留白
    textColor: '#8B5A2B' 
  },
  { 
    id: 'flat', 
    name: '拍立得', 
    bg: '/templates/bg3.png', 
    titleY: 400,      // 拍立得相框上方
    qrY: 650,         // 相框内居中偏上（原750太靠下）
    hintY: 1050,      // 相框下方
    textColor: '#4A4A4A' 
  },
  { 
    id: 'watercolor', 
    name: '水彩', 
    bg: '/templates/bg4.png', 
    titleY: 320,      // 从200下移，避开顶部花纹
    qrY: 780,         // 从1000上移，放在视觉中心
    hintY: 1200,      // 相应上移
    textColor: '#5D4E37' 
  },
];

const Player: React.FC<PlayerProps> = ({ taskId, segments, onRestart }) => {
  const [currentSegment, setCurrentSegment] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // 海报相关状态
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0); // 默认第一个模板
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  
  const currentUrl = segments[currentSegment]?.uploadUrl;
  // 根据实际路由调整：auracast.com.cn/play/486cc9f7
  const shareUrl = `${window.location.origin}/play/${taskId}`;
  const currentTemplate = TEMPLATES[selectedTemplate];

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
          title: '亲声时光贴 - 一份特别的声音礼物',
          text: '有人为你制作了一份声音礼物，快来听听吧！',
          url: shareUrl,
        });
      } catch (err) {
        console.log('分享取消');
      }
    } else {
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
      a.download = `亲声时光贴_第${currentSegment + 1}段.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('下载失败，请重试');
    }
  };

  // 生成海报
  const handleGeneratePoster = async () => {
    setIsGenerating(true);
    setShowPosterModal(true);
    
    // 等待DOM渲染完成
    setTimeout(async () => {
      if (posterRef.current) {
        try {
          const canvas = await html2canvas(posterRef.current, {
            width: 1080,
            height: 1920,
            scale: 1,
            useCORS: true, // 允许跨域图片（背景图需要同源或CORS）
            backgroundColor: null,
          });
          
          const image = canvas.toDataURL('image/png', 1.0);
          setPosterImage(image);
        } catch (err) {
          console.error('生成海报失败:', err);
          alert('生成海报失败，请重试');
        } finally {
          setIsGenerating(false);
        }
      }
    }, 100);
  };

  // 保存海报到本地
  const handleSavePoster = () => {
    if (posterImage) {
      const a = document.createElement('a');
      a.href = posterImage;
      a.download = `亲声时光贴_${taskId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* 标题 */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">亲声时光贴</h2>
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

      {/* 操作按钮 - 改为3列布局，增加生成海报 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={handleShare}
          className="py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm"
        >
          <Share2 className="w-4 h-4" />
          分享
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm"
        >
          <QrCode className="w-4 h-4" />
          二维码
        </button>
        <button
          onClick={handleGeneratePoster}
          className="py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-medium text-white flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm"
        >
          <ImageIcon className="w-4 h-4" />
          生成海报
        </button>
      </div>

      {/* 二维码 */}
      {showQR && (
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 text-center">
          <p className="text-sm text-gray-600 mb-4">扫码收听亲声时光贴</p>
          <div className="inline-block p-4 bg-white rounded-xl shadow-inner">
            <QRCodeSVG
              value={shareUrl}
              size={200}
              level="M"
              includeMargin={true}
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
        制作新的亲声时光贴
      </button>

      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-orange-50 rounded-xl">
        <p className="text-sm text-orange-700 text-center">
          这份声音礼物已保存，随时可以通过链接收听
        </p>
      </div>

      {/* 海报预览 Modal */}
      {showPosterModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            
            <div className="p-4 border-b flex justify-between items-center shrink-0">
              <h3 className="font-bold text-gray-800">分享海报</h3>
              <button 
                onClick={() => setShowPosterModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              {/* 模板选择 */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {TEMPLATES.map((tpl, idx) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplate(idx);
                      setPosterImage(null);
                    }}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                      selectedTemplate === idx 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>

              {/* 预览区域 - 使用固定比例容器 */}
              <div className="flex justify-center mb-4">
                <div 
                  className="relative bg-gray-100 rounded-lg overflow-hidden"
                  style={{ 
                    width: '225px',      // 固定宽度
                    height: '400px',     // 固定高度 9:16
                    maxWidth: '100%',
                  }}
                >
                  {isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                      <span className="text-xs text-gray-500">生成中...</span>
                    </div>
                  ) : posterImage ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <img 
                        src={posterImage} 
                        alt="海报预览" 
                        className="max-w-full max-h-full object-contain"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto',
                          display: 'block'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm text-center px-4">
                      <div>
                        点击"生成预览"查看效果<br/>
                        <span className="text-xs opacity-70">首次生成可能需要几秒</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleGeneratePoster}
                  disabled={isGenerating}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {posterImage ? '重新生成' : '生成预览'}
                </button>
                {posterImage && (
                  <button
                    onClick={handleSavePoster}
                    className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                  >
                    保存图片
                  </button>
                )}
              </div>
              
              <p className="text-xs text-gray-400 text-center mt-3">
                长按图片或点击保存到相册
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的海报生成区域（用于 html2canvas 捕获） */}
      <div 
        ref={posterRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '1080px',
          height: '1920px',
          backgroundImage: `url(${currentTemplate.bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* 顶部标题 */}
        <div
          style={{
            position: 'absolute',
            top: `${currentTemplate.titleY}px`,
            left: '0',
            right: '0',
            textAlign: 'center',
            fontSize: '72px',
            fontWeight: 'bold',
            color: currentTemplate.textColor,
            fontFamily: '"Source Han Serif SC", "PingFang SC", serif',
            textShadow: '2px 2px 4px rgba(255,255,255,0.5)',
          }}
        >
          亲声时光贴
        </div>

        {/* 二维码区域 */}
        <div
          style={{
            position: 'absolute',
            top: `${currentTemplate.qrY}px`,
            left: '340px',
            width: '400px',
            height: '400px',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <QRCodeSVG
            value={shareUrl}
            size={360}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* 底部提示文字 */}
        <div
          style={{
            position: 'absolute',
            top: `${currentTemplate.hintY}px`,
            left: '0',
            right: '0',
            textAlign: 'center',
            fontSize: '40px',
            color: currentTemplate.textColor,
            fontFamily: '"KaiTi", "STKaiti", serif',
            letterSpacing: '4px',
          }}
        >
          扫码收听TA的语音留言
        </div>
        
        {/* 装饰性时间戳 */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '60px',
            fontSize: '24px',
            color: currentTemplate.textColor,
            opacity: 0.6,
            fontFamily: '"Source Han Serif SC", serif',
          }}
        >
          {new Date().toLocaleDateString('zh-CN')}
        </div>
      </div>
    </div>
  );
};

export default Player;