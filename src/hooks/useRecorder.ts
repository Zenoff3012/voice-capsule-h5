import { useState, useRef, useCallback } from 'react';
import RecordRTC from 'recordrtc';

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  volume: number;
  error: string | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export interface UseRecorderReturn {
  state: RecorderState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  streamRef: React.RefObject<MediaStream | null>;
}

const MAX_RECORDING_TIME = 60; // 60秒限制

export function useRecorder(): UseRecorderReturn {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    volume: 0,
    error: null,
    audioBlob: null,
    audioUrl: null,
  });

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // 获取麦克风权限并开始录音
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;

      // 创建音频分析器用于音量可视化
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // 初始化 RecordRTC
      recorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm;codecs=pcm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 44100,
        disableLogs: true,
      });

      recorderRef.current.startRecording();

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        recordingTime: 0,
      }));

      // 开始计时
      timerRef.current = setInterval(() => {
        setState(prev => {
          const newTime = prev.recordingTime + 1;
          if (newTime >= MAX_RECORDING_TIME) {
            // 到达最大时间自动停止
            stopRecording();
          }
          return { ...prev, recordingTime: newTime };
        });
      }, 1000);

      // 开始音量检测
      volumeRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedVolume = Math.min(average / 128, 1); // 归一化到 0-1
          setState(prev => ({ ...prev, volume: normalizedVolume }));
        }
      }, 100);

    } catch (err) {
      console.error('录音启动失败:', err);
      let errorMessage = '无法启动录音，请检查麦克风权限';
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          errorMessage = '麦克风权限被拒绝，请点击右上角"在浏览器打开"后重试';
        } else if (err.name === 'NotFoundError') {
          errorMessage = '未找到麦克风设备';
        }
      }

      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (volumeRef.current) {
        clearInterval(volumeRef.current);
        volumeRef.current = null;
      }

      // 停止音频分析
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      // 停止录音
      if (recorderRef.current) {
        recorderRef.current.stopRecording(() => {
          const blob = recorderRef.current?.getBlob() || null;
          const url = blob ? URL.createObjectURL(blob) : null;

          setState(prev => ({
            ...prev,
            isRecording: false,
            isPaused: false,
            audioBlob: blob,
            audioUrl: url,
            volume: 0,
          }));

          // 停止所有音轨
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }

          resolve(blob);
        });
      } else {
        resolve(null);
      }
    });
  }, []);

  // 暂停录音
  const pauseRecording = useCallback(() => {
    if (recorderRef.current && state.isRecording) {
      recorderRef.current.pauseRecording();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (volumeRef.current) {
        clearInterval(volumeRef.current);
      }
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording]);

  // 恢复录音
  const resumeRecording = useCallback(() => {
    if (recorderRef.current && state.isPaused) {
      recorderRef.current.resumeRecording();
      // 恢复计时
      timerRef.current = setInterval(() => {
        setState(prev => {
          const newTime = prev.recordingTime + 1;
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
          }
          return { ...prev, recordingTime: newTime };
        });
      }, 1000);
      // 恢复音量检测
      volumeRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedVolume = Math.min(average / 128, 1);
          setState(prev => ({ ...prev, volume: normalizedVolume }));
        }
      }, 100);
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isPaused, stopRecording]);

  // 重置录音状态
  const resetRecording = useCallback(() => {
    // 清理所有资源
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (volumeRef.current) {
      clearInterval(volumeRef.current);
      volumeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    // 释放之前的URL
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      volume: 0,
      error: null,
      audioBlob: null,
      audioUrl: null,
    });

    recorderRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
  }, [state.audioUrl]);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    streamRef,
  };
}

export default useRecorder;
