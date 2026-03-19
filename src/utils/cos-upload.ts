/**
 * 音频上传工具（后端代理版）
 * 通过后端上传到 OSS，并自动写入 Notion
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

// ⚠️ 关键修复：改成你的实际后端地址，删除错误的 fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://voicecapsule-aofghbricj.cn-hangzhou.fcapp.run';

/**
 * 通过后端代理上传（推荐：后端自动写 Notion）
 */
export async function uploadViaBackend(
  blob: Blob,
  taskId: string,
  segmentIndex: number
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('audio', blob, `segment_${segmentIndex}.webm`);
    formData.append('task_id', taskId);
    formData.append('segment_index', segmentIndex.toString());

    console.log('=== 上传调试 ===');
    console.log('API地址:', `${API_BASE_URL}/api/upload/audio`);
    console.log('taskId:', taskId);
    console.log('segmentIndex:', segmentIndex);

    const response = await fetch(`${API_BASE_URL}/api/upload/audio`, {
      method: 'POST',
      body: formData,
      // 重要：不要设置 Content-Type，让浏览器自动设置（包含 boundary）
    });

    console.log('响应状态:', response.status);

    // 关键修复：增强错误信息
    if (!response.ok) {
      const errorText = await response.text();
      console.error('上传失败详情:', response.status, errorText);
      throw new Error(`上传失败(${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('上传成功:', data);
    
    return {
      success: true,
      url: data.url,
      key: data.key,
    };
  } catch (error) {
    console.error('上传异常:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络错误，请检查连接',
    };
  }
}

/**
 * 统一上传入口
 */
export async function uploadAudioSegment(
  blob: Blob,
  taskId: string,
  segmentIndex: number
): Promise<UploadResult> {
  // 只走后端代理（OSS + Notion 写入）
  return uploadViaBackend(blob, taskId, segmentIndex);
}

// 导出兼容旧代码
export default {
  uploadAudioSegment,
  uploadViaBackend,
};