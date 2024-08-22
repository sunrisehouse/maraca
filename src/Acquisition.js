import './Acquisition.css';
import { Box, Button, Container, InputAdornment, Paper, TextField, Toolbar, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

function Acquisition() {
  const [time, setTime] = useState("");
  const [decibel, setDecibel] = useState(0);
  const [accelerometerMetric, setAccelerometerMetric] = useState({
    t: 0,
    x: 0,
    y: 0,
    z: 0,
  });
  const [gyroscopeMetric, setGyroscopeMetric] = useState({
    t: 0,
    x: 0,
    y: 0,
    z: 0,
  });

  useEffect(() => {
    let accelerometer = null;
    let gyroscope = null;
    const init = async () => {
      const accPermissionResult = await navigator.permissions.query({ name: "accelerometer" });
      const gyroPermissionResult = await navigator.permissions.query({ name: "gyroscope" });
      
      if (accPermissionResult.state === "denied" || gyroPermissionResult.state === "denied") {
        alert("Permission to use accelerometer. gyroscope sensor is denied");
      }
      if (!'Accelerometer' in window || !'Gyroscope' in window) {
        alert('브라우저가 센서를 지원하지 않습니다.');
      }
      
      try {
        accelerometer = new window.Accelerometer({ frequency: 10 });
        accelerometer.addEventListener("reading", () => {
          setAccelerometerMetric({
            t: accelerometer.timestamp,
            x: accelerometer.x,
            y: accelerometer.y,
            z: accelerometer.z,
          });
        });
        accelerometer.start();
      } catch (error) {
        if (error.name === 'SecurityError') {
          alert('Sensor construction was blocked by the Permissions Policy.');
        } else if (error.name === 'ReferenceError') {
          alert('Sensor is not supported by the User Agent.');
        } else {
          alert(`${error.name} ${error.message}`);
        }
      }
  
      try {
        gyroscope = new window.Gyroscope({ frequency: 10 });
        gyroscope.addEventListener("reading", () => {
          setGyroscopeMetric({
            t: gyroscope.timestamp,
            x: gyroscope.x,
            y: gyroscope.y,
            z: gyroscope.z,
          });
        });
        gyroscope.start();
      } catch (error) {
        if (error.name === 'SecurityError') {
          alert('Sensor construction was blocked by the Permissions Policy.');
        } else if (error.name === 'ReferenceError') {
          alert('Sensor is not supported by the User Agent.');
        } else {
          alert(`${error.name} ${error.message}`);
        }
      }
    };

    init();

    return () => {
      if (accelerometer) {
        accelerometer.stop();
      }
      if (gyroscope) {
        gyroscope.stop();
      }
    };
  }, []);

  useEffect(() => {
    let audioContext;
    let audioWorkletNode;

    const initAudio = async () => {
      try {
        // 오디오 컨텍스트 생성
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 오디오 워크렛 모듈을 추가 (my-processor.js)
        await audioContext.audioWorklet.addModule('my-processor.js');

        // AudioWorkletNode 생성
        audioWorkletNode = new AudioWorkletNode(audioContext, 'my-audio-processor');

        // 사용자로부터 마이크 접근 권한 요청
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 마이크 스트림 생성
        const microphone = audioContext.createMediaStreamSource(stream);

        // 마이크 -> AudioWorkletNode -> 출력
        microphone.connect(audioWorkletNode);
        audioWorkletNode.connect(audioContext.destination);

        // 오디오 데이터를 처리하기 위한 메시지 핸들러
        audioWorkletNode.port.onmessage = (event) => {
          const { decibel, timestamp } = event.data;

          // 데시벨 값 업데이트
          setDecibel(decibel.toFixed(2));

          // 시간 값을 인간이 읽을 수 있는 형식으로 변환
          const date = new Date(timestamp);
          const formattedTime = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

          // 시간 업데이트
          setTime(formattedTime);
        };
      } catch (error) {
        console.error(error);
      }
    };

    initAudio();

    // 컴포넌트 언마운트 시 리소스 정리
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  return (
    <Container maxWidth="sm">
      <Box>
        <h1>Decibel Meter</h1>
        <p>Measurement Time: {time}</p>
        <p>Current Decibel Level: {decibel} dB</p>
      </Box>
      <Box>
        <h1>Accelerometer Data</h1>
        <p>T: {accelerometerMetric.t ? accelerometerMetric.t.toFixed(2) : "N/A"}</p>
        <p>X: {accelerometerMetric.x ? accelerometerMetric.x.toFixed(2) : "N/A"}</p>
        <p>Y: {accelerometerMetric.y ? accelerometerMetric.y.toFixed(2) : "N/A"}</p>
        <p>Z: {accelerometerMetric.z ? accelerometerMetric.z.toFixed(2) : "N/A"}</p>
      </Box>
      <Box>
        <h1>Gyroscope Data</h1>
        <p>T: {gyroscopeMetric.t ? gyroscopeMetric.t.toFixed(2) : "N/A"}</p>
        <p>X: {gyroscopeMetric.x ? gyroscopeMetric.x.toFixed(2) : "N/A"}</p>
        <p>Y: {gyroscopeMetric.y ? gyroscopeMetric.y.toFixed(2) : "N/A"}</p>
        <p>Z: {gyroscopeMetric.z ? gyroscopeMetric.z.toFixed(2) : "N/A"}</p>
      </Box>
    </Container>
  );
}

export default Acquisition;
