import React, { useState, useEffect } from 'react';
import { Phone, FileText, AlertCircle, CheckCircle, Loader2, Radio, Mail } from 'lucide-react';

interface VerifyFormProps {
  onVerified: (taskId: string, orderInfo: OrderInfo) => void;
}

export interface OrderInfo {
  orderSn: string;
  mobileTail: string;
  buyerName?: string;
}

interface VerifyResponse {
  success: boolean;
  taskId?: string;
  message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://voice-capsule-api.vercel.app';

// 邮戳组件 - 显示当前日期
const Postmark: React.FC = () => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  
  return (
    <div className="absolute -top-2 -right-2 w-20 h-20 opacity-80 transform rotate-[-12deg] pointer-events-none z-10">
      <div className="w-full h-full rounded-full border-4 border-double border-[#B85450] flex items-center justify-center bg-[#F5F0E6]/90 shadow-sm">
        <div className="text-center">
          <div className="text-[8px] text-[#B85450] font-bold tracking-wider border-b border-[#B85450] pb-0.5 mb-0.5" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>VOICE MEMORY</div>
          <div className="text-xs font-bold text-[#B85450] leading-tight" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>{dateStr}</div>
        </div>
      </div>
    </div>
  );
};

// 复古收音机图标（CSS绘制）
const VintageRadio: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <div className={`relative ${className} mx-auto`}>
    {/* 收音机主体 */}
    <div className="w-full h-full bg-gradient-to-b from-[#D4A574] to-[#8B5A2B] rounded-2xl shadow-lg border-4 border-[#6B4423] relative overflow-hidden">
      {/* 喇叭格栅 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/5 bg-[#3D2C1F] rounded-lg opacity-80">
        <div className="w-full h-full flex flex-col justify-evenly py-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-1 bg-[#5C4033] rounded-full mx-auto w-[90%]" />
          ))}
        </div>
      </div>
      {/* 调频表盘（发光效果） */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1/2 h-6 bg-gradient-to-r from-[#FDF6E3] to-[#E8DCC8] rounded-full border-2 border-[#8B5A2B] shadow-inner">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#B85450] rounded-full shadow-[0_0_6px_rgba(184,84,80,0.8)]" />
      </div>
      {/* 旋钮 */}
      <div className="absolute bottom-2 left-3 w-5 h-5 rounded-full bg-gradient-to-br from-[#FDF6E3] to-[#D4C4B0] border-2 border-[#6B4423] shadow-md" />
      <div className="absolute bottom-2 right-3 w-5 h-5 rounded-full bg-gradient-to-br from-[#FDF6E3] to-[#D4C4B0] border-2 border-[#6B4423] shadow-md" />
    </div>
    {/* 声波装饰（左右） */}
    <div className="absolute top-1/2 -left-4 -translate-y-1/2 flex flex-col gap-1 opacity-60">
      <div className="w-6 h-0.5 bg-[#8B5A2B] rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
      <div className="w-4 h-0.5 bg-[#8B5A2B] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
      <div className="w-6 h-0.5 bg-[#8B5A2B] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
    </div>
    <div className="absolute top-1/2 -right-4 -translate-y-1/2 flex flex-col gap-1 opacity-60">
      <div className="w-6 h-0.5 bg-[#8B5A2B] rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
      <div className="w-4 h-0.5 bg-[#8B5A2B] rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
      <div className="w-6 h-0.5 bg-[#8B5A2B] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
    </div>
  </div>
);

const VerifyForm: React.FC<VerifyFormProps> = ({ onVerified }) => {
  const [orderSn, setOrderSn] = useState('');
  const [mobileTail, setMobileTail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 从URL参数自动填充订单号
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderSnFromUrl = urlParams.get('order_sn');
    if (orderSnFromUrl) {
      setOrderSn(orderSnFromUrl);
    }
  }, []);

  // 验证订单号格式（16位数字）
  const isValidOrderSn = (sn: string): boolean => {
    return /^\d{16}$/.test(sn);
  };

  // 验证手机号后4位
  const isValidMobileTail = (tail: string): boolean => {
    return /^\d{4}$/.test(tail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 前端验证
    if (!isValidOrderSn(orderSn)) {
      setError('订单号应为16位数字');
      return;
    }

    if (!isValidMobileTail(mobileTail)) {
      setError('手机号后4位应为4位数字');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_sn: orderSn,
          mobile_tail: mobileTail,
        }),
      });

      const data: VerifyResponse = await response.json();

      if (data.success && (data.taskId || (data as any).task_id)) {
        const taskId = data.taskId || (data as any).task_id;
        
        console.log('✅ 验证成功，taskId:', taskId);
        setIsSuccess(true);
        
        setTimeout(() => {
          console.log('⏰ setTimeout 执行，准备调用 onVerified');
          onVerified(taskId, {
            orderSn,
            mobileTail,
          });
          console.log('📞 onVerified 已调用');
        }, 800);
      } else {
        setError(data.message || '验证失败，请检查订单信息');
      }
    } catch (err) {
      console.error('验证请求失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6] py-8 px-4 relative overflow-hidden" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", "SimSun", serif' }}>
      

      {/* 邮票外框容器 */}
      <div className="relative max-w-md mx-auto">
        {/* 阴影层 */}
        <div className="absolute inset-0 bg-[#E8E0D0] rounded-sm shadow-2xl transform translate-y-1 translate-x-1" />
        
        {/* 主容器 - 邮票风格 */}
        <div className="relative bg-[#FDF6E3] border-8 border-[#FDF6E3] shadow-xl" 
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='0' r='6' fill='%23F5F0E6'/%3E%3Ccircle cx='10' cy='20' r='6' fill='%23F5F0E6'/%3E%3Ccircle cx='0' cy='10' r='6' fill='%23F5F0E6'/%3E%3Ccircle cx='20' cy='10' r='6' fill='%23F5F0E6'/%3E%3C/svg%3E")`,
               backgroundPosition: '-10px -10px',
               boxShadow: 'inset 0 0 30px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.1)'
             }}>
          
          {/* 内部内容 */}
          <div className="p-6 relative">
            <Postmark />
            
            {/* 标题区域 */}
            <div className="text-center mb-8 pt-4">
              <VintageRadio className="w-20 h-20 mb-4" />
              
              <h1 className="text-3xl font-bold text-[#B85450] mb-2 tracking-wider" 
                  style={{ 
                    fontFamily: '"Source Han Serif SC", "PingFang SC", "SimSun", serif',
                    textShadow: '1px 1px 0px rgba(0,0,0,0.1), -1px -1px 0px rgba(255,255,255,0.8)' 
                  }}>
                亲声时光贴
              </h1>
              <p className="text-[#8B5A2B] text-lg italic tracking-wide" style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }}>
                把声音贴进时光里
              </p>
              
              {/* 装饰线 */}
              <div className="flex items-center justify-center gap-2 mt-4 opacity-50">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#8B5A2B]" />
                <Mail className="w-4 h-4 text-[#8B5A2B]" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#8B5A2B]" />
              </div>
            </div>

            {/* 流程说明卡片（复古信纸风格） */}
            <div className="bg-[#F5F0E6] border-2 border-dashed border-[#C9B8A0] rounded-lg p-5 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#B85450] via-[#D4A574] to-[#B85450] opacity-30" />
              
              <h3 className="font-bold text-[#3D2C1F] mb-3 flex items-center gap-2 text-sm" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                <Radio className="w-4 h-4 text-[#B85450]" />
                制作流程
              </h3>
              <ol className="text-sm text-[#5C4033] space-y-3" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", "SimSun", serif' }}>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#B85450] text-white flex items-center justify-center text-xs flex-shrink-0 shadow-sm border-2 border-[#FDF6E3] font-bold">1</span>
                  <span>输入订单号验证<br/><span className="text-xs text-[#8B5A2B] opacity-70">（微店购买后获得）</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#B85450] text-white flex items-center justify-center text-xs flex-shrink-0 shadow-sm border-2 border-[#FDF6E3] font-bold">2</span>
                  <span>录制3段时光留言<br/><span className="text-xs text-[#8B5A2B] opacity-70">（每段限30秒）</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#B85450] text-white flex items-center justify-center text-xs flex-shrink-0 shadow-sm border-2 border-[#FDF6E3] font-bold">3</span>
                  <span>生成专属播放页<br/><span className="text-xs text-[#8B5A2B] opacity-70">（寄给远方的TA）</span></span>
                </li>
              </ol>
            </div>

            {/* 验证表单 */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 订单号输入 */}
              <div className="relative">
                <label className="block text-sm font-bold text-[#3D2C1F] mb-2 flex items-center gap-1" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                  <FileText className="w-4 h-4 text-[#B85450]" />
                  订单号
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={orderSn}
                    onChange={(e) => setOrderSn(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    placeholder="请输入16位订单号"
                    className="w-full px-4 py-3.5 bg-[#FDF6E3] border-2 border-[#C9B8A0] rounded-lg focus:border-[#B85450] focus:ring-1 focus:ring-[#B85450] outline-none transition-all text-lg text-[#3D2C1F] placeholder:text-[#A09080] shadow-inner"
                    style={{ fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif' }}
                    disabled={isLoading || isSuccess}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8B5A2B] opacity-50" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                    微店订单
                  </div>
                </div>
              </div>

              {/* 手机号后4位输入 */}
              <div className="relative">
                <label className="block text-sm font-bold text-[#3D2C1F] mb-2 flex items-center gap-1" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                  <Phone className="w-4 h-4 text-[#B85450]" />
                  手机号后4位
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={mobileTail}
                    onChange={(e) => setMobileTail(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="请输入4位数字"
                    className="w-full px-4 py-3.5 bg-[#FDF6E3] border-2 border-[#C9B8A0] rounded-lg focus:border-[#B85450] focus:ring-1 focus:ring-[#B85450] outline-none transition-all text-lg text-[#3D2C1F] placeholder:text-[#A09080] shadow-inner"
                    style={{ fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif' }}
                    disabled={isLoading || isSuccess}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8B5A2B] opacity-50" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                    验证归属
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-[#FDF6E3] border-2 border-[#B85450] rounded-lg p-3 flex items-start gap-2 text-[#B85450]" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* 成功提示 */}
              {isSuccess && (
                <div className="bg-[#F5F0E6] border-2 border-green-600 rounded-lg p-3 flex items-center gap-2 text-green-700" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">验证成功，正在进入...</p>
                </div>
              )}

              {/* 提交按钮（复古旋钮风格） */}
              <button
                type="submit"
                disabled={isLoading || isSuccess || !orderSn || !mobileTail}
                className={`w-full py-4 rounded-full font-bold text-lg transition-all relative overflow-hidden ${
                  isLoading || isSuccess || !orderSn || !mobileTail
                    ? 'bg-[#D4C4B0] text-[#8B8B8B] cursor-not-allowed'
                    : 'bg-gradient-to-b from-[#D4A574] to-[#8B5A2B] text-white shadow-[0_4px_0_#5C4033,0_6px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_3px_0_#5C4033,0_4px_8px_rgba(0,0,0,0.3)] hover:translate-y-0.5 active:shadow-none active:translate-y-1 border-2 border-[#6B4423]'
                }`}
                style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}
              >
                {/* 按钮内部纹理 */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                
                <span className="relative flex items-center justify-center gap-2 drop-shadow-md">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      验证中...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      验证成功
                    </>
                  ) : (
                    '开始制作时光贴'
                  )}
                </span>
              </button>
            </form>

            {/* 帮助信息 */}
            <div className="mt-8 text-center">
              <p className="text-sm text-[#8B5A2B] opacity-80" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                找不到订单号？
              </p>
              <p className="text-xs text-[#8B5A2B] opacity-60 mt-1" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                请查看微店订单详情或联系客服
              </p>
            </div>

            {/* 底部提示 */}
            <div className="mt-6 p-3 bg-[#F5F0E6] border border-[#C9B8A0] rounded-lg">
              <p className="text-xs text-[#8B5A2B] flex items-start gap-2" style={{ fontFamily: '"Source Han Serif SC", "PingFang SC", serif' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>如遇录音问题，请点击右上角"在浏览器中打开"</span>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyForm;