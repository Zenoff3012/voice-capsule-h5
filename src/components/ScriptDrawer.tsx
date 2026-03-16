import React, { useState, useEffect } from 'react';
import { X, MessageSquare } from 'lucide-react';

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

  useEffect(() => {
    if (visible) {
      setLoading(true);
      // TODO: 替换为真实 API
      // import { fetchScripts } from '../utils/api';
      // fetchScripts(segmentIndex).then(setScripts);
      
      setTimeout(() => {
        setScripts(MOCK_SCRIPTS[segmentIndex] || []);
        setLoading(false);
      }, 100);
    }
  }, [visible, segmentIndex]);

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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        {/* 列表 */}
        <div className="overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : (
            scripts.map((script) => (
              <div 
                key={script.id}
                onClick={() => {
                  onSelect(script.content);
                  onClose();
                }}
                className="p-4 bg-gray-50 rounded-xl border-2 border-transparent hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                  <span className="font-bold text-gray-800">{script.title}</span>
                  <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600 ml-auto">
                    {script.category}
                  </span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {script.content || <span className="italic text-gray-400">（空白，自由发挥）</span>}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};