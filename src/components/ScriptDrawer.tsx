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
  segmentIndex: number;
}

const MOCK_SCRIPTS: Record<number, Script[]> = {
  0: [
    { id: '1', title: '给孙辈的早安', content: '宝贝，早上好呀！爷爷/奶奶今天想跟你说说心里话...', category: '亲情' },
    { id: '2', title: '给子女的鼓励', content: '孩子，工作再忙也要注意身体，爸爸妈妈永远支持你...', category: '鼓励' },
    { id: '3', title: '给老伴的问候', content: '老伴，这么多年辛苦了，我想对你说...', category: '爱情' },
    { id: '4', title: '自由发挥', content: '', category: '自定义' }
  ],
  1: [
    { id: '5', title: '小时候的故事', content: '记得你小时候，有一次咱们一起去公园，你特别开心...', category: '回忆' },
    { id: '6', title: '家族的传统', content: '咱们家有个传统，就是每年春节都要一起吃团圆饭...', category: '家训' },
    { id: '7', title: '人生的经验', content: '这些年我有一个体会，想分享给你，那就是...', category: '智慧' }
  ],
  2: [
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setSelectedId(null);
      setTimeout(() => {
        setScripts(MOCK_SCRIPTS[segmentIndex] || []);
        setLoading(false);
      }, 100);
    }
  }, [visible, segmentIndex]);

  const handleSelect = (script: Script) => {
    console.log('选中话术:', script.id, script.title); // 调试用
    setSelectedId(script.id);
    
    // 延迟关闭，让用户看到选中效果
    setTimeout(() => {
      onSelect(script.content);
      onClose();
    }, 500);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}>
      {/* 遮罩 */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}
        onClick={onClose}
      />
      
      {/* 抽屉 */}
      <div style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '16px 16px 0 0',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              第 {segmentIndex + 1} 段参考话术
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              不知道说什么？选一句照着读
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <X style={{ width: 24, height: 24, color: '#4b5563' }} />
          </button>
        </div>
        
        {/* 列表 */}
        <div style={{
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              加载中...
            </div>
          ) : (
            scripts.map((script) => {
              const isSelected = selectedId === script.id;
              
              // 调试：在控制台看比较结果
              console.log('渲染卡片:', script.id, 'selectedId:', selectedId, 'isSelected:', isSelected);
              
              return (
                <div
                  key={script.id}
                  onClick={() => handleSelect(script)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #22c55e' : '2px solid transparent',
                    backgroundColor: isSelected ? '#f0fdf4' : '#f9fafb',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                    transform: isSelected ? 'scale(0.98)' : 'scale(1)'
                  }}
                >
                  {/* 选中标记 - 绝对定位右上角 */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#22c55e',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <Check style={{ width: 16, height: 16, color: 'white' }} />
                    </div>
                  )}
                  
                  {/* 标题行 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    paddingRight: isSelected ? '32px' : '0'
                  }}>
                    <MessageSquare 
                      style={{ 
                        width: 16, 
                        height: 16, 
                        color: isSelected ? '#16a34a' : '#f97316',
                        flexShrink: 0
                      }} 
                    />
                    <span style={{
                      fontWeight: 'bold',
                      color: isSelected ? '#166534' : '#1f2937',
                      fontSize: '16px'
                    }}>
                      {script.title}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '12px',
                      color: '#4b5563',
                      marginLeft: 'auto',
                      flexShrink: 0
                    }}>
                      {script.category}
                    </span>
                  </div>
                  
                  {/* 内容 */}
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: isSelected ? '#166534' : '#4b5563'
                  }}>
                    {script.content || <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>（空白，自由发挥）</span>}
                  </p>
                  
                  {/* 选中时的文字提示（卡片内） */}
                  {isSelected && (
                    <div style={{
                      marginTop: '8px',
                      padding: '4px 0',
                      color: '#16a34a',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check style={{ width: 14, height: 14 }} />
                      已选择，即将加载...
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* 底部提示 */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          textAlign: 'center',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          点击话术即可选择并使用
        </div>
      </div>
      
      {/* 简单的 slideUp 动画 */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};