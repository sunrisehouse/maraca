import { useEffect, useRef } from 'react';

const WaveformVisualizer = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const drawWaveform = () => {
        requestAnimationFrame(drawWaveform);

        analyser.getByteTimeDomainData(dataArray);

        // Canvas 설정
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        canvasCtx.fillStyle = 'black';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        // 파형 그리기 설정
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'lime';
        canvasCtx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        // 파형 데이터를 기반으로 선 그리기
        for (let i = 0; i < bufferLength; i++) {
          // 0에서 255 사이의 값을 -1에서 1 사이로 정규화
          const v = (dataArray[i] / 128) - 1;
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

      drawWaveform();
    }).catch((err) => console.error('Error accessing microphone:', err));
  }, []);

  return <canvas ref={canvasRef} width="600" height="200" />;
};

export default WaveformVisualizer;