import React, { useEffect, useRef } from 'react';

const BarGraphVisualizer = () => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  useEffect(() => {
    const setupAudioContext = async () => {
      // AudioContext 생성
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      // Audio Worklet 모듈 로드
      await audioContextRef.current.audioWorklet.addModule('/maraca/build/test-processor.js');

      // AnalyserNode 설정
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // 작은 fftSize를 사용해 주파수 막대 데이터 수 줄임

      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // 마이크 접근 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // 마이크 스트림을 AnalyserNode와 WorkletNode에 연결
      source.connect(analyserRef.current);

      // 캔버스에 막대그래프 그리기
      const drawBarGraph = () => {
        requestAnimationFrame(drawBarGraph);

        // 주파수 데이터 수집
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');

        // 캔버스 초기화
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        canvasCtx.fillStyle = 'black';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        // 막대그래프 그리기
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArrayRef.current[i];

          canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
          canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

          x += barWidth + 1;
        }
      };

      drawBarGraph();  // 막대그래프 그리기 시작
    };

    // 오디오 컨텍스트 설정
    setupAudioContext();

    return () => {
      // 컴포넌트가 언마운트될 때 오디오 컨텍스트 종료
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return <canvas ref={canvasRef} width="600" height="200" />;
};

export default BarGraphVisualizer;