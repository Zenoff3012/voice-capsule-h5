/**
 * 腾讯云COS直传工具
 * 用于前端直接上传音频文件到COS，避免经过服务器中转
 */

export interface COSCredentials {
  TmpSecretId: string;
  TmpSecretKey: string;
  Token: string;
  ExpiredTime: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

const COS_BUCKET = import.meta.env.VITE_COS_BUCKET || 'voice-capsule-125xxxxxx';
const COS_REGION = import.meta.env.VITE_COS_REGION || 'ap-guangzhou';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://voice-capsule-api.vercel.app';

/**
 * 从后端获取临时密钥
 */
export async function getTempCredentials(): Promise<COSCredentials | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload/credentials`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('获取临时密钥失败');
    }

    const data = await response.json();
    return data.credentials;
  } catch (error) {
    console.error('获取COS临时密钥失败:', error);
    return null;
  }
}

/**
 * 生成唯一的文件Key
 */
export function generateFileKey(taskId: string, segmentIndex: number, extension: string = 'webm'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `audio/${taskId}/segment_${segmentIndex}_${timestamp}_${random}.${extension}`;
}

/**
 * 使用临时密钥上传文件到COS
 * 注意：这里使用简单的POST表单上传方式，适合小文件
 */
export async function uploadToCOS(
  blob: Blob,
  key: string,
  credentials: COSCredentials
): Promise<UploadResult> {
  try {
    // 构建COS上传URL
    const uploadUrl = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${key}`;

    // 构建表单数据
    const formData = new FormData();
    formData.append('key', key);
    formData.append('file', blob, 'audio.webm');

    // 使用fetch上传
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `q-sign-algorithm=sha1&q-ak=${credentials.TmpSecretId}&q-sign-time=${Math.floor(Date.now()/1000)};${credentials.ExpiredTime}&q-key-time=${Math.floor(Date.now()/1000)};${credentials.ExpiredTime}&q-header-list=host&q-url-param-list=&q-signature=${credentials.Token}`,
        'Content-Type': 'audio/webm',
        'x-cos-security-token': credentials.Token,
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}`);
    }

    // 构建访问URL
    const fileUrl = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${key}`;

    return {
      success: true,
      url: fileUrl,
      key: key,
    };
  } catch (error) {
    console.error('COS上传失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    };
  }
}

/**
 * 简化版上传：直接通过后端代理上传
 * 适用于不想处理COS签名的场景
 */
export async function uploadViaBackend(
  blob: Blob,
  taskId: string,
  segmentIndex: number
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('audio', blob, `segment_${segmentIndex}.webm`);
    // 改为下划线
    formData.append('task_id', taskId);        // ✅ 下划线
    formData.append('segment_index', segmentIndex.toString());  // ✅ 下划线

    const response = await fetch(`${API_BASE_URL}/api/upload/audio`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('上传失败');
    }

    const data = await response.json();
    return {
      success: true,
      url: data.url,
      key: data.key,
    };
  } catch (error) {
    console.error('上传失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    };
  }
}

/**
 * 完整的上传流程
 */
export async function uploadAudioSegment(
  blob: Blob,
  taskId: string,
  segmentIndex: number,
  _onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // 优先尝试通过后端上传（更简单可靠）
  return uploadViaBackend(blob, taskId, segmentIndex);
}

export default {
  getTempCredentials,
  generateFileKey,
  uploadToCOS,
  uploadViaBackend,
  uploadAudioSegment,
};
