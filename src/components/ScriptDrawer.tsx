import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Check } from 'lucide-react';

interface Script {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface ScriptDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
  segmentIndex: number; // 0,1,2 对应第1,2,3段
}

// 按段分类的 Mock 数据（先写死测试，后面接 API）
const MOCK_SCRIPTS: Record<number, Script[]> = {
  0: [ // 第1段：开场/问候
    { id: '1', title: '给孙辈的早安', content: '宝贝，早上好呀！爷爷/奶奶今天想跟你说说心里话...', category: '亲情' },
    { id: '2', title: '给子女的鼓励', content: '孩子，工作再忙也要注意身体，爸爸妈妈永远支持你...', category: '鼓励' },
    { id: '3', title: '给老伴的问候', content: '老伴，这么多年辛苦了，我想对你说...', category: '爱情' },
    { id: '4', title: '自由发挥', content: '', category: '自定义' }
  ],
  1: [ // 第2段：故事/回忆
    { id: '5', title: '小时候的故事', content: '记得你小时候，有一次咱们一起去公园，你特别开心...', category: '回忆' },
    { id: '6', title: '家族的传统', content: '咱们家有个传统，就是每年春节都要一起吃团圆饭...', category: '家训' },
    { id: '7', title: '人生的经验', content: '这些年我有一个体会，想分享给你，那就是...', category: '智慧' }
  ],
  2: [ // 第3段：祝福/结尾
    { id: '8', title: '生日祝福', content: '祝你生日快乐，身体健康，天天开心，万事如意！', category: '祝福' },
    { id: '9', title: '晚安问候', content: '时间不早了，早点休息，做个好梦，明天又是新的一天。', category: '晚安' },
    { id: '10', title: '未来的期待', content: '期待下次见面，到时候咱们一起去...', category: '期待' }
  ]
};

export const ScriptDrawer: React.FC<ScriptDrawerProps> = ({
  visible,
  onClose,
  onSelect,
  segmentIndex
}) => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null); // 记录当前选中的ID，用于显示勾选标记
  const [showToast, setShowToast] = useState(false); // 显示"已选择"提示

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setSelectedId(null); // 重置选中状态
      setShowToast(false);
      
      // TODO: 替换为真实 API
      setTimeout(() => {
        setScripts(MOCK_SCRIPTS[segmentIndex] || []);
        setLoading(false);
      }, 100);
    }
  }, [visible, segmentIndex]);

  const handleSelect = (script: Script) => {
    setSelectedId(script.id);
    setShowToast(true);
    
    // 延迟关闭，让用户看到选中效果
    setTimeout(() => {
      onSelect(script.content);
      onClose();
      setShowToast(false);
    }, 400); // 400ms 动画时间
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* 抽屉 */}
      <div className="relative bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-800">第 {segmentIndex + 1} 段参考话术</h3>
            <p className="text-sm text-gray-500">不知道说什么？选一句照着读</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full active:bg-gray-200">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        {/* 已选择提示 */}
        {showToast && (
          <div className="bg-green-100 text-green-700 px-4 py-2 text-center text-sm font-medium animate-pulse">
            ✓ 已选择，正在加载...
          </div>
        )}
        
        {/* 列表 */}
        <div className="overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : (
            scripts.map((script) => {
              const isSelected = selectedId === script.id;
              return (
                <div 
                  key={script.id}
                  onClick={() => handleSelect(script)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer active:scale-95 relative ${
                    isSelected 
                      ? 'bg-green-50 border-green-500 shadow-md' 
                      : 'bg-gray-50 border-transparent hover:border-orange-400 hover:bg-orange-50'
                  }`}
                >
                  {/* 勾选标记 */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-2 pr-8"> {/* pr-8 防止文字被勾选标记遮挡 */}
                    <MessageSquare className={`w-4 h-4 ${isSelected ? 'text-green-600' : 'text-orange-500'}`} />
                    <span className={`font-bold ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                      {script.title}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600 ml-auto">
                      {script.category}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${isSelected ? 'text-green-700' : 'text-gray-600'}`}>
                    {script.content || <span className="italic text-gray-400">（空白，自由发挥）</span>}
                  </p>
                </div>
              );
            })
          )}
        </div>
        
        {/* 底部提示 */}
        <div className="p-4 border-t bg-gray-50 text-center text-xs text-gray-500">
          点击话术即可选择并使用
        </div>
      </div>
    </div>
  );
};