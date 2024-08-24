import './Acquisition.css';
import { Box, Button, ButtonGroup, Container, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LineChart } from '@mui/x-charts';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function Acquisition() {
  const [audioContext, setAudioContext] = useState(null);
  const [audioWorkletNode, setAudioWorkletNode] = useState(null);
  const [accelerometer, setAccelerometer] = useState(null);
  const [gyroscope, setGyroscope] = useState(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  const startDate = useMemo(() => {
    return Date.now();
  }, []);
  const endDate = useMemo(() => {
    return startDate + 100000;
  }, []);
  const [decibelMetrics, setDecibelMetrics] = useState([]);
  const [accelerometerMetrics, setAccelerometerMetrics] = useState([]);
  const [gyroscopeMetrics, setGyroscopeMetrics] = useState([]);
  const [decibelMetric, setDecibelMetric] = useState({
    t: 0,
    d: 0,
  });
  const [accelerometerMetric, setAccelerometerMetric] = useState({
    t: 0,
    x: 0,
    y: 0,
    z: 0,
    a: 0,
  });
  const [gyroscopeMetric, setGyroscopeMetric] = useState({
    t: 0,
    x: 0,
    y: 0,
    z: 0,
    a: 0,
  });

  useEffect(() => {
    let accel = null;
    const init = async () => {
      const accPermissionResult = await navigator.permissions.query({ name: "accelerometer" });
      
      if (accPermissionResult.state === "denied") {
        alert("Permission to use accelerometer. gyroscope sensor is denied");
        return () => {};
      }
      
      if (!'Accelerometer' in window) {
        alert('브라우저가 센서를 지원하지 않습니다.');
        return () => {};
      }

      try {
        accel = new window.Accelerometer({ frequency: 10 });
        accel.addEventListener("reading", () => {
          const now = Date.now()
          const newMetric = {
            t: now,
            x: accel.x,
            y: accel.y,
            z: accel.z,
            a: Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2),
          }
          setAccelerometerMetric(newMetric);
          setAccelerometerMetrics(prev => [
            ...prev,
            newMetric,
          ])
        });
        setAccelerometer(accel);
      } catch (error) {
        if (error.name === 'SecurityError') {
          alert('Sensor construction was blocked by the Permissions Policy.');
        } else if (error.name === 'ReferenceError') {
          alert('Sensor is not supported by the User Agent.');
        } else {
          alert(`${error.name} ${error.message}`);
        }
      }
    }
    
    init();

    return () => {
      if (accel) {
        accel.stop();
      }
    };
  }, []);

  useEffect(() => {
    let gyro = null;
    const init = async () => {
      const gyroPermissionResult = await navigator.permissions.query({ name: "gyroscope" });
      
      if (gyroPermissionResult.state === "denied") {
        alert("Permission to use accelerometer. gyroscope sensor is denied");
        return () => {};
      }

      if (!'Gyroscope' in window) {
        alert('브라우저가 센서를 지원하지 않습니다.');
        return () => {};
      }
  
      try {
        gyro = new window.Gyroscope({ frequency: 10 });
        gyro.addEventListener("reading", () => {
          const now = Date.now()
          const newMetric = {
            t: now,
            x: gyro.x,
            y: gyro.y,
            z: gyro.z,
            a: Math.sqrt(gyro.x ** 2 + gyro.y ** 2 + gyro.z ** 2),
          }
          setGyroscopeMetric(newMetric);
          setGyroscopeMetrics(prev => [
            ...prev,
            newMetric,
          ])
        });
        setGyroscope(gyro);
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
      if (gyro) {
        gyro.stop();
      }
    };
  }, []);

  const initAudio = useCallback(async () => {
    try {
      // 오디오 컨텍스트 생성
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // 오디오 워크렛 모듈을 추가 (my-processor.js)
      await audioCtx.audioWorklet.addModule('/maraca/build/audio-processor.js');

      // AudioWorkletNode 생성
      const audioNode = new AudioWorkletNode(audioCtx, 'audio-processor');

      // 사용자로부터 마이크 접근 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 마이크 스트림 생성
      const microphone = audioCtx.createMediaStreamSource(stream);

      // 마이크 -> AudioWorkletNode -> 출력
      microphone.connect(audioNode);
      audioNode.connect(audioCtx.destination);

      audioNode.port.onmessage = (event) => {
        const { decibel, timestamp } = event.data;
        setDecibelMetric({
          t: Date.now(),
          d: decibel,
        });
        setDecibelMetrics(prev => [
          ...prev,
          { t: timestamp, d: decibel },
        ]);
      };
      
      setAudioContext(audioCtx);
      setAudioWorkletNode(audioNode);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const destroyAudio = useCallback(() => {
    if (audioContext) audioContext.close();
    setAudioContext(null);
    setAudioWorkletNode(null);
  }, [audioContext]);

  useEffect(() => {
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  const startMeasurement = useCallback(() => {
    if (audioContext) initAudio();
    if (accelerometer) accelerometer.start();
    if (gyroscope) gyroscope.start();
    setIsMeasuring(true);
  }, [audioContext, accelerometer, gyroscope]);

  const stopMeasurement = useCallback(() => {
    if (audioContext) destroyAudio();
    if (accelerometer) accelerometer.stop();
    if (gyroscope) gyroscope.stop();
    setIsMeasuring(false);
  }, [audioContext, accelerometer, gyroscope]);

  const handleExportFiles = () => {
    // Decibel 데이터를 배열 형식으로 변환
    const decibelData = decibelMetrics.map(metric => ({
      Timestamp: new Date(metric.timestamp).toLocaleString(),
      Decibel: metric.decibel,
    }));
    
    // Accelerometer 데이터를 배열 형식으로 변환
    const accelData = accelerometerMetrics.map(metric => ({
      Timestamp: new Date(metric.timestamp).toLocaleString(),
      AccelX: metric.accelX,
      AccelY: metric.accelY,
      AccelZ: metric.accelZ,
    }));

    const gyroData = gyroscopeMetrics.map(metric => ({
      Timestamp: new Date(metric.timestamp).toLocaleString(),
      GyroX: metric.accelX,
      GyroY: metric.accelY,
      GyroZ: metric.accelZ,
    }));

    // 두 개의 워크시트로 데이터를 추가
    const wb = XLSX.utils.book_new();
    const wsDecibel = XLSX.utils.json_to_sheet(decibelData);
    const wsAccel = XLSX.utils.json_to_sheet(accelData);
    const wsGyro = XLSX.utils.json_to_sheet(gyroData);

    XLSX.utils.book_append_sheet(wb, wsDecibel, "Decibel Data");
    XLSX.utils.book_append_sheet(wb, wsAccel, "Accelerometer Data");
    XLSX.utils.book_append_sheet(wb, wsAccel, "Gyroscope Data");

    // Excel 파일로 변환
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    // 파일 저장
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, "sensor_data.xlsx");
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        paddingBottom: "20px",
        '& .MuiPaper-root': {
          paddingTop: "16px",
          paddingBottom: "16px",
          marginTop: '20px',
        },
      }}
    >
      <Paper>
        <Container>
          <ButtonGroup>
            <Button
              variant="contained"
              onClick={startMeasurement}
              disabled={isMeasuring}
            >
              start
            </Button>
            <Button
              variant="contained"
              onClick={stopMeasurement}
              disabled={!isMeasuring}
            >
              stop
            </Button>
            <Button
              variant="contained"
              onClick={handleExportFiles}
            >
              save
            </Button>
          </ButtonGroup>
        </Container>
      </Paper>
      <Paper>
        <Container>
          <Box>
            <Typography variant='h6'>Decibel Meter Data</Typography>
            <p>Measurement Time: {decibelMetric.t ? decibelMetric.t.toFixed(2) : "N/A"}</p>
            <p>Current Decibel Level: {decibelMetric.d ? decibelMetric.d.toFixed(2) : "N/A"} dB</p>
          </Box>
          <Box>
            <Typography variant='h6'>Accelerometer Data</Typography>
            <p>T: {accelerometerMetric.t ? accelerometerMetric.t.toFixed(2) : "N/A"}</p>
            <p>X: {accelerometerMetric.x ? accelerometerMetric.x.toFixed(2) : "N/A"}</p>
            <p>Y: {accelerometerMetric.y ? accelerometerMetric.y.toFixed(2) : "N/A"}</p>
            <p>Z: {accelerometerMetric.z ? accelerometerMetric.z.toFixed(2) : "N/A"}</p>
            <p>A: {accelerometerMetric.a ? accelerometerMetric.a.toFixed(2) : "N/A"}</p>
          </Box>
          <Box>
            <Typography variant='h6'>Gyroscope Data</Typography>
            <p>T: {gyroscopeMetric.t ? gyroscopeMetric.t.toFixed(2) : "N/A"}</p>
            <p>X: {gyroscopeMetric.x ? gyroscopeMetric.x.toFixed(2) : "N/A"}</p>
            <p>Y: {gyroscopeMetric.y ? gyroscopeMetric.y.toFixed(2) : "N/A"}</p>
            <p>Z: {gyroscopeMetric.z ? gyroscopeMetric.z.toFixed(2) : "N/A"}</p>
            <p>A: {gyroscopeMetric.a ? gyroscopeMetric.a.toFixed(2) : "N/A"}</p>
          </Box>
        </Container>
      </Paper>
      <Paper>
        <Container>
          <Box>
            <Typography variant='h6'>Decibel Meter Graph ({decibelMetrics.length})</Typography>
            <LineChart
              dataset={decibelMetrics}
              xAxis={[{ dataKey: "t" }]}
              series={[
                { dataKey: "d"},
              ]}
              width={300}
              height={200}
            />
          </Box>
          <Box>
            <Typography variant='h6'>Accelerometer Graph ({accelerometerMetrics.length})</Typography>
            <LineChart
              dataset={accelerometerMetrics}
              xAxis={[{ dataKey: "t" }]}
              series={[
                { dataKey: "a"},
              ]}
              width={300}
              height={200}
            />
          </Box>
          <Box>
            <Typography variant='h6'>Gyroscope Graph ({gyroscopeMetrics.length})</Typography>
            <LineChart
              dataset={gyroscopeMetrics}
              xAxis={[{ dataKey: "t" }]}
              series={[
                { dataKey: "a"},
              ]}
              width={300}
              height={200}
            />
          </Box>
        </Container>
      </Paper>
    </Container>
  );
}

export default Acquisition;
