import './Acquisition.css';
import { Box, Button, ButtonGroup, Container, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LineChart } from '@mui/x-charts';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Download, PauseCircle, Pending, PlayCircleFilled } from '@mui/icons-material';
import CircularBuffer from './CircularBuffer';
import { useSearchParams } from 'react-router-dom';

const decibelBuffer = new CircularBuffer(3000);
const accelerometerBuffer = new CircularBuffer(1000);
const gyroscopeBuffer = new CircularBuffer(1000);

const initAudio = async () => {
  try {
    // 오디오 컨텍스트 생성
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
    // 오디오 워크렛 모듈을 추가 (my-processor.js)
    await audioContext.audioWorklet.addModule('/maraca/build/audio-processor.js');
  
    // AudioWorkletNode 생성
    const audioNode = new AudioWorkletNode(audioContext, 'audio-processor');
  
    // 사용자로부터 마이크 접근 권한 요청
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
    // 마이크 스트림 생성
    const microphone = audioContext.createMediaStreamSource(stream);
  
    // 마이크 -> AudioWorkletNode -> 출력
    microphone.connect(audioNode);
    audioNode.connect(audioContext.destination);
  
    audioNode.port.onmessage = (event) => {
      const { decibel, samples } = event.data;
      const newMetric = {
        t: Date.now(),
        d: decibel,
        samples,
      }
      decibelBuffer.push(newMetric);
    };
    return { audioContext }
  } catch (error) {
    console.error(error);
  }
  return null;
}

const initAccelerometer = async () => {
  const accPermissionResult = await navigator.permissions.query({ name: "accelerometer" });
  
  if (accPermissionResult.state === "denied") {
    alert("Permission to use accelerometer. gyroscope sensor is denied");
    return () => {};
  }
  
  if (!('Accelerometer' in window)) {
    alert('브라우저가 센서를 지원하지 않습니다.');
    return () => {};
  }

  try {
    const accelerometer = new window.Accelerometer({ frequency: 10 });
    accelerometer.addEventListener("reading", () => {
      const now = Date.now()
      const newMetric = {
        t: now,
        x: accelerometer.x,
        y: accelerometer.y,
        z: accelerometer.z,
        a: Math.sqrt(accelerometer.x ** 2 + accelerometer.y ** 2 + accelerometer.z ** 2),
      }
      accelerometerBuffer.push(newMetric);
    });
    accelerometer.start();
    return { accelerometer }
  } catch (error) {
    if (error.name === 'SecurityError') {
      alert('Sensor construction was blocked by the Permissions Policy.');
    } else if (error.name === 'ReferenceError') {
      alert('Sensor is not supported by the User Agent.');
    } else {
      alert(`${error.name} ${error.message}`);
    }
  }
  return null;
}

const initGyroscope = async () => {
  const gyroPermissionResult = await navigator.permissions.query({ name: "gyroscope" });
  
  if (gyroPermissionResult.state === "denied") {
    alert("Permission to use accelerometer. gyroscope sensor is denied");
    return () => {};
  }

  if (!('Gyroscope' in window)) {
    alert('브라우저가 센서를 지원하지 않습니다.');
    return () => {};
  }

  try {
    const gyroscope = new window.Gyroscope({ frequency: 10 });
    gyroscope.addEventListener("reading", () => {
      const now = Date.now()
      const newMetric = {
        t: now,
        x: gyroscope.x,
        y: gyroscope.y,
        z: gyroscope.z,
        a: Math.sqrt(gyroscope.x ** 2 + gyroscope.y ** 2 + gyroscope.z ** 2),
      }
      gyroscopeBuffer.push(newMetric);
    });
    gyroscope.start();
    return { gyroscope }
  } catch (error) {
    if (error.name === 'SecurityError') {
      alert('Sensor construction was blocked by the Permissions Policy.');
    } else if (error.name === 'ReferenceError') {
      alert('Sensor is not supported by the User Agent.');
    } else {
      alert(`${error.name} ${error.message}`);
    }
  }
  return null;
};

const saveExcelFile = (decibelMetrics, accelerometerMetrics, gyroscopeMetrics) => {
  const totalData = decibelMetrics.map(metric => ({
    Time: metric.t,
    Decibel: metric.d,
    Ax: '',
    Ay: '',
    Az: '',
    Rx: '',
    Ry: '',
    Rz: '',
  }));

  // Step 2: Add accelerometerMetrics to totalData
  accelerometerMetrics.forEach(metric => {
    const matchingData = totalData.find(data => data.Time === metric.t);
    if (matchingData) {
      matchingData.Ax = metric.x;
      matchingData.Ay = metric.y;
      matchingData.Az = metric.z;
    } else {
      totalData.push({
        Time: metric.t,
        Decibel: '',
        Ax: metric.x,
        Ay: metric.y,
        Az: metric.z,
        Rx: '',
        Ry: '',
        Rz: '',
      });
    }
  });

  gyroscopeMetrics.forEach(metric => {
    const matchingData = totalData.find(data => data.Time === metric.t);
    if (matchingData) {
      matchingData.Rx = metric.x;
      matchingData.Ry = metric.y;
      matchingData.Rz = metric.z;
    } else {
      totalData.push({
        Time: metric.t,
        Decibel: '',
        Ax: '',
        Ay: '',
        Az: '',
        Rx: metric.x,
        Ry: metric.y,
        Rz: metric.z,
      });
    }
  });

  totalData.sort((a, b) => a.Time - b.Time);

  // Decibel 데이터를 배열 형식으로 변환
  const decibelData = decibelMetrics.map(metric => ({
    Time: metric.t,
    Decibel: metric.d,
    Samples: `${metric.samples}`,
  }));

  // Accelerometer 데이터를 배열 형식으로 변환
  const accelData = accelerometerMetrics.map(metric => ({
    Time: metric.t,
    Ax: metric.x,
    Ay: metric.y,
    Az: metric.z,
    "Linear Acceleration": metric.a,
  }));

  const gyroData = gyroscopeMetrics.map(metric => ({
    Time: metric.t,
    Rx: metric.x,
    Ry: metric.y,
    Rz: metric.z,
    "Angular Acceleration": metric.a,
  }));

  // 두 개의 워크시트로 데이터를 추가
  const wb = XLSX.utils.book_new();
  const wsTotal = XLSX.utils.json_to_sheet(totalData);
  const wsDecibel = XLSX.utils.json_to_sheet(decibelData);
  const wsAccel = XLSX.utils.json_to_sheet(accelData);
  const wsGyro = XLSX.utils.json_to_sheet(gyroData);

  XLSX.utils.book_append_sheet(wb, wsTotal, "Total Data");
  XLSX.utils.book_append_sheet(wb, wsDecibel, "Decibel Data");
  XLSX.utils.book_append_sheet(wb, wsAccel, "Accelerometer Data");
  XLSX.utils.book_append_sheet(wb, wsGyro, "Gyroscope Data");

  // Excel 파일로 변환
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  // 파일 저장
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  saveAs(blob, "Time_Date.xlsx");
};

const useWaveformVisualizerCanvasRef = () => {
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
        canvasCtx.fillStyle = 'white';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        // 파형 그리기 설정
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#02B2AF';
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

        // 가운데 가로선 그리기
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.strokeStyle = '#02B2AF';
        canvasCtx.stroke();
      };

      drawWaveform();
    }).catch((err) => console.error('Error accessing microphone:', err));
  }, []);

  return canvasRef;
}

function Acquisition() {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [fetchMetricsIntervalId, setFetchMetricsIntervalId] = useState(null);
  const [maxRunTimeoutId, setMaxRunTimeoutId] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [accelerometer, setAccelerometer] = useState(null);
  const [gyroscope, setGyroscope] = useState(null);

  const [decibelMetrics, setDecibelMetrics] = useState([]);
  const [accelerometerMetrics, setAccelerometerMetrics] = useState([]);
  const [gyroscopeMetrics, setGyroscopeMetrics] = useState([]);

  const [searchParams] = useSearchParams();
  const tInterval = Number(searchParams.get('tInterval'));
  const tWaiting = Number(searchParams.get('tWaiting'));
  const tMaxRun = Number(searchParams.get('tMaxRun'));

  const [restartTime, setRestartTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(tMaxRun);
  const [isTWatingReached, setIsTWatingReached] = useState(false);
  const [isTMaxRunReached, setIsTMaxRunReached] = useState(false);

  const startTime = useMemo(() => Date.now());

  const canvasRef = useWaveformVisualizerCanvasRef();

  useEffect(() => {
    const initAudioContext = async () => {
      const { audioContext: sensor } = await initAudio() || { audioContext: null };
      setAudioContext(sensor)
    }
    const initAccel = async () => {
      const { accelerometer: sensor } = await initAccelerometer() || { accelerometer: null };
      setAccelerometer(sensor)
    }
    const initGyro = async () => {
      const { gyroscope: sensor } = await initGyroscope() || { gyroscope: null };
      setGyroscope(sensor);
    }
    initAudioContext();
    initAccel();
    initGyro();
  }, []);

  const destroyAllSensors = useCallback(() => {
    setAudioContext(ac => {
      if (ac) ac.close();
      return null;
    });
    setAccelerometer(am => {
      if (am) am.stop();
      return null;
    })
    setGyroscope(gy => {
      if (gy) gy.stop();
      return null;
    })
  }, []);

  useEffect(() => {
    return () => {
      destroyAllSensors();
    }
  }, []);

  useEffect(() => {
    // Cleanup function to clear intervals and timeouts when the component unmounts
    return () => {
      if (fetchMetricsIntervalId) clearInterval(fetchMetricsIntervalId);
      if (maxRunTimeoutId) clearTimeout(maxRunTimeoutId);
    };
  }, [fetchMetricsIntervalId, maxRunTimeoutId]);

  const setFetchMetricsInterval = () => {
    setFetchMetricsIntervalId(setInterval(() => {
      const decibelData = decibelBuffer.getLast();
      if (decibelData) {
        setDecibelMetrics((prevData) => [
          ...prevData,
          {t: decibelData.t - startTime, d: decibelData.d , samples: decibelData.samples},
        ]);
      }
      const accelData = accelerometerBuffer.getLast();
      if (accelData) {
        setAccelerometerMetrics((prevData) => [
          ...prevData,
          {
            t: accelData.t - startTime,
            x: accelData.x,
            y: accelData.y,
            z: accelData.z,
            a: accelData.a,
          },
        ]);
      }
      const gyroData = gyroscopeBuffer.getLast();
      if (gyroData) {
        setGyroscopeMetrics((prevData) => [
          ...prevData,
          {
            t: gyroData.t - startTime,
            x: gyroData.x,
            y: gyroData.y,
            z: gyroData.z,
            a: gyroData.a,
          },
        ]);
      }
    }, tInterval));
  };

  const stopMeasurement = () => {
    setFetchMetricsIntervalId(prev => {
      if (prev) clearInterval(prev);
      return null;
    });
    setMaxRunTimeoutId(prev => {
      if (prev) clearTimeout(prev);
      return null;
    })
    setRemainingTime(prev => prev - (Date.now() - restartTime));
    setIsMeasuring(false);
  };

  const setMaxRunTimeout = (time) => {
    setMaxRunTimeoutId(setTimeout(() => {
      setIsTMaxRunReached(true);
      stopMeasurement();
      destroyAllSensors();
    }, time));
  };

  const startMeasurement = () => {
    setFetchMetricsInterval();
    setRestartTime(Date.now());
    setMaxRunTimeout(remainingTime);
    setIsMeasuring(true);
  };

  // const handleReset = useCallback(() => {
  //   setAccelerometerMetrics([]);
  //   setGyroscopeMetrics([]);
  //   setDecibelMetrics([]);
  // }, []);

  useEffect(() => {
    setTimeout(() => {
      setIsTWatingReached(true);
      if (!isMeasuring) startMeasurement();
    }, tWaiting);
  }, []);

  const handleSave = () => {
    saveExcelFile(decibelMetrics, accelerometerMetrics, gyroscopeMetrics);
  };

  const decibelMetric = decibelMetrics.length > 0
    ? decibelMetrics[decibelMetrics.length - 1]
    : { t: 0, d: 0 };

  const accelerometerMetric = accelerometerMetrics.length > 0
    ? accelerometerMetrics[accelerometerMetrics.length - 1]
    : { t: 0, x: 0, y: 0, z: 0, a: 0 };

  const gyroscopeMetric = gyroscopeMetrics.length > 0
    ? gyroscopeMetrics[gyroscopeMetrics.length - 1]
    : { t: 0, x: 0, y: 0, z: 0, a: 0 };

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
              onClick={isMeasuring ? stopMeasurement : startMeasurement}
              startIcon={!isTWatingReached ? <Pending /> : isMeasuring ? <PauseCircle /> : <PlayCircleFilled /> }
              color={isMeasuring ? "secondary" : "primary"}
              disabled={!isTWatingReached || isTMaxRunReached}
              sx={{ width: "104px" }}
            >
              {!isTWatingReached ? "wating" : isMeasuring ? "pause " : "restart"}
            </Button>
            {/* <Button
              variant="contained"
              onClick={handleReset}
              disabled={!isTWatingReached || isTMaxRunReached || isMeasuring}
              startIcon={<RestartAlt />}
            >
              reset
            </Button> */}
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!isTWatingReached || isMeasuring}
              startIcon={<Download />}
            >
              save
            </Button>
          </ButtonGroup>
        </Container>
      </Paper>
      <Paper>
        <Container>
          <Box>
            <Typography variant='h6'>Waveform</Typography>
            <canvas ref={canvasRef} width="300" height="200" />
          </Box>
          <Box>
            <Typography variant='h6'>Decibel Meter Graph</Typography>
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
            <Typography variant='h6'>Accelerometer Graph</Typography>
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
            <Typography variant='h6'>Gyroscope Graph</Typography>
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
      <Paper>
        <Container>
          {/* <Box>
            <Typography variant='h6'>Time: ({intervalCount}) ({decibelBuffer.getHead()}) ({accelerometerBuffer.getHead()}) ({gyroscopeBuffer.getHead()})</Typography>
          </Box> */}
          <Box>
            <Typography variant='h6'>Decibel Meter Data ({decibelMetrics.length}/{decibelBuffer.getHead()})</Typography>
            <p>Measurement Time: {decibelMetric.t ? decibelMetric.t.toFixed(2) : "N/A"}</p>
            <p>Current Decibel Level: {decibelMetric.d ? decibelMetric.d.toFixed(2) : "N/A"} dB</p>
          </Box>
          <Box>
            <Typography variant='h6'>Accelerometer Data ({accelerometerMetrics.length}/{accelerometerBuffer.getHead()})</Typography>
            <p>T: {accelerometerMetric.t ? accelerometerMetric.t.toFixed(2) : "N/A"}</p>
            <p>X: {accelerometerMetric.x ? accelerometerMetric.x.toFixed(2) : "N/A"}</p>
            <p>Y: {accelerometerMetric.y ? accelerometerMetric.y.toFixed(2) : "N/A"}</p>
            <p>Z: {accelerometerMetric.z ? accelerometerMetric.z.toFixed(2) : "N/A"}</p>
            <p>A: {accelerometerMetric.a ? accelerometerMetric.a.toFixed(2) : "N/A"}</p>
          </Box>
          <Box>
            <Typography variant='h6'>Gyroscope Data ({gyroscopeMetrics.length}/{gyroscopeBuffer.getHead()})</Typography>
            <p>T: {gyroscopeMetric.t ? gyroscopeMetric.t.toFixed(2) : "N/A"}</p>
            <p>X: {gyroscopeMetric.x ? gyroscopeMetric.x.toFixed(2) : "N/A"}</p>
            <p>Y: {gyroscopeMetric.y ? gyroscopeMetric.y.toFixed(2) : "N/A"}</p>
            <p>Z: {gyroscopeMetric.z ? gyroscopeMetric.z.toFixed(2) : "N/A"}</p>
            <p>A: {gyroscopeMetric.a ? gyroscopeMetric.a.toFixed(2) : "N/A"}</p>
          </Box>
        </Container>
      </Paper>
    </Container>
  );
}

export default Acquisition;
