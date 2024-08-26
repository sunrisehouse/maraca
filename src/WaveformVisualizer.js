import { useEffect, useRef } from 'react';

const WaveformVisualizer = () => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    const setupAudioContext = async () => {
      // AudioContext 생성
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      // Audio Worklet 모듈 로드
      await audioContextRef.current.audioWorklet.addModule('/maraca/build/test-processor.js');

      // Worklet 노드 생성
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');

      // 마이크 접근 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // 마이크 스트림을 WorkletNode로 연결
      source.connect(workletNodeRef.current);

      // WorkletNode에서 받은 메시지를 처리해 파형 그리기
      workletNodeRef.current.port.onmessage = (event) => {
        const audioBuffer = event.data;
        drawWaveform(audioBuffer);
      };
    };

    const drawWaveform = (audioBuffer) => {
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext('2d');
      const bufferLength = audioBuffer.length;

      // 캔버스 초기화
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.fillStyle = 'black';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // 파형 그리기
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'lime';
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = audioBuffer[i];
        const y = (v * canvas.height) / 2 + canvas.height / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    // 오디오 컨텍스트 설정
    setupAudioContext();

    return () => {
      // 컴포넌트가 언마운트될 때 오디오 컨텍스트를 종료
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return <canvas ref={canvasRef} width="600" height="200" />;
};

export default WaveformVisualizer;