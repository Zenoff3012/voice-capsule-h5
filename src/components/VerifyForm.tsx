import React, { useState, useEffect } from 'react';
import { Gift, Phone, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

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
        
        console.log('✅ 验证成功，taskId:', taskId);  // 第1个日志
        setIsSuccess(true);
        
        setTimeout(() => {
          console.log('⏰ setTimeout 执行，准备调用 onVerified');  // 第2个日志
          onVerified(taskId, {
            orderSn,
            mobileTail,
          });
          console.log('📞 onVerified 已调用');  // 第3个日志
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
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Logo和标题 */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
          <Gift className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">亲声胶囊</h1>
        <p className="text-gray-500 mt-2">用声音传递心意</p>
      </div>

      {/* 说明卡片 */}
      <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-5 mb-6 border border-orange-100">
        <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
          <Gift className="w-4 h-4" />
          制作流程
        </h3>
        <ol className="text-sm text-orange-700 space-y-2">
          <li className="flex items-start gap-2">
            <span className="bg-orange-200 text-orange-800 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
            <span>输入订单号验证（微店购买后获得）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-orange-200 text-orange-800 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
            <span>分段录制3段音频（每段60秒）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-orange-200 text-orange-800 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
            <span>生成专属播放页，分享给TA</span>
          </li>
        </ol>
      </div>

      {/* 验证表单 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 订单号输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            订单号
          </label>
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={orderSn}
              onChange={(e) => setOrderSn(e.target.value.replace(/\D/g, '').slice(0, 16))}
              placeholder="请输入16位订单号"
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-lg"
              disabled={isLoading || isSuccess}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-1">
            微店支付后收到的16位订单号
          </p>
        </div>

        {/* 手机号后4位输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            手机号后4位
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={mobileTail}
              onChange={(e) => setMobileTail(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="请输入4位数字"
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-lg"
              disabled={isLoading || isSuccess}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-1">
            用于验证订单归属
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* 成功提示 */}
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm font-medium">验证成功，正在进入...</p>
          </div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isLoading || isSuccess || !orderSn || !mobileTail}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            isLoading || isSuccess || !orderSn || !mobileTail
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              验证中...
            </span>
          ) : isSuccess ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              验证成功
            </span>
          ) : (
            '开始制作'
          )}
        </button>
      </form>

      {/* 帮助信息 */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400">
          找不到订单号？
        </p>
        <p className="text-xs text-gray-400 mt-1">
          请查看微店订单详情或联系客服
        </p>
      </div>

      {/* 微信浏览器提示 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <p className="text-xs text-blue-600 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            如遇录音问题，请点击右上角"在浏览器中打开"
          </span>
        </p>
      </div>
    </div>
  );
};

export default VerifyForm;
