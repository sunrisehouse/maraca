import './Acquisition.css';
import { Backdrop, Box, Button, ButtonGroup, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LineChart } from '@mui/x-charts';
import { ArrowBack, Download, PauseCircle, Pending, PlayCircleFilled } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { initAccelerometer, initAudio, initGyroscope, saveExcelFile, saveExcelFileNoInterpolation, useWaveformVisualizerCanvasRef } from './lib';
import CircularBuffer from "./CircularBuffer";

const decibelBuffer = new CircularBuffer(3000);
const accelerometerBuffer = new CircularBuffer(1000);
const gyroscopeBuffer = new CircularBuffer(1000);

function Acquisition() {
  const navigate = useNavigate()
  
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [maxRunTimeoutId, setMaxRunTimeoutId] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [accelerometer, setAccelerometer] = useState(null);
  const [gyroscope, setGyroscope] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const decibelCanvasRef = useRef(null);
  const accelCanvasRef = useRef(null);
  const gyroCanvasRef = useRef(null);

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
    return () => {
      if (maxRunTimeoutId) clearTimeout(maxRunTimeoutId);
    };
  }, [maxRunTimeoutId]);

  const stopMeasurement = () => {
    setMaxRunTimeoutId(prev => {
      if (prev) clearTimeout(prev);
      return null;
    })
    setRemainingTime(prev => prev - (Date.now() - restartTime));
    setIsMeasuring(false);
    destroyAllSensors();
  };

  const setMaxRunTimeout = (time) => {
    setMaxRunTimeoutId(setTimeout(() => {
      setIsTMaxRunReached(true);
      stopMeasurement();
      destroyAllSensors();
    }, time));
  };

  const drawWaveform = ({ canvas, canvasCtx, data }) => {
    // Canvas 설정
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.fillStyle = 'white';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // 파형 그리기 설정
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#02B2AF';
    canvasCtx.beginPath();

    const sliceWidth = canvas.width / data.length;
    let x = 0;

    // 파형 데이터를 기반으로 선 그리기
    for (let i = 0; i < data.length; i++) {
      // 0에서 255 사이의 값을 -1에서 1 사이로 정규화
      const v = data[i]
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
  }

  useEffect(() => {
    if (decibelCanvasRef && decibelMetrics.length > 0) {
      const decibelCanvas = decibelCanvasRef.current;
      const decibelCanvasCtx = decibelCanvas.getContext('2d');
      const data = decibelMetrics[decibelMetrics.length - 1].samples;
      const draw = () => {
        drawWaveform({
          canvas: decibelCanvas,
          canvasCtx: decibelCanvasCtx,
          data
        });
      };
      requestAnimationFrame(draw);
    }
  }, [decibelMetrics]);

  useEffect(() => {
    if (accelCanvasRef) {
      const accelCanvas = accelCanvasRef.current;
      const accelCanvasCtx = accelCanvas.getContext('2d');
      const data = accelerometerMetrics.map((metric) => metric.a);
      const draw = () => {
        drawWaveform({
          canvas: accelCanvas,
          canvasCtx: accelCanvasCtx,
          data,
        });
      };
      requestAnimationFrame(draw);
    }
  }, [accelerometerMetrics]);

  useEffect(() => {
    if (gyroCanvasRef) {
      const gyroCanvas = gyroCanvasRef.current;
      const gyroCanvasCtx = gyroCanvas.getContext('2d');
      const data = gyroscopeMetrics.map((metric) => metric.a);
      const draw = () => {
        drawWaveform({
          canvas: gyroCanvas,
          canvasCtx: gyroCanvasCtx,
          data,
        });
      };
      requestAnimationFrame(draw);
    }
  }, [gyroscopeMetrics]);

  const startMeasurement = () => {
    const initAudioContext = async () => {
      const { audioContext: sensor } = await initAudio(({ samples, t }) => {
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
        // dB 계산: 최소 RMS 값을 설정하여 로그의 무한대를 방지
        const minRMS = 1e-10; // 최소 RMS 값 설정
        const decibel = 20 * Math.log10(Math.max(rms, minRMS));
        setDecibelMetrics((prevData) => [
          ...prevData,
          {t: t - startTime, d: decibel, samples },
        ]);
      }) || { audioContext: null };
      setAudioContext(sensor);
    }
    const initAccel = async () => {
      const { accelerometer: sensor } = await initAccelerometer(({ t, x, y, z }) => {
        setAccelerometerMetrics((prevData) => [
          ...prevData,
          {
            t: t - startTime,
            x, y, z,
            a: Math.sqrt(x ** 2 + y ** 2 + z ** 2),
          },
        ]);
      }) || { accelerometer: null };
      setAccelerometer(sensor)
    }
    const initGyro = async () => {
      const { gyroscope: sensor } = await initGyroscope(({ t, x, y, z }) => {
        setGyroscopeMetrics((prevData) => [
          ...prevData,
          {
            t: t - startTime,
            x, y, z,
            a: Math.sqrt(x ** 2 + y ** 2 + z ** 2),
          },
        ]);
      }) || { gyroscope: null };
      setGyroscope(sensor);
    }

    initAudioContext();
    initAccel();
    initGyro();
  
    setRestartTime(Date.now());
    setMaxRunTimeout(remainingTime);
    setIsMeasuring(true);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsTWatingReached(true);
      if (!isMeasuring) startMeasurement();
    }, tWaiting);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      try {
        saveExcelFile(
          decibelMetrics,
          accelerometerMetrics,
          gyroscopeMetrics,
        );
      } catch (error) {
        console.error("파일 저장 중 오류가 발생했습니다.", error);
        alert("파일 저장 중 오류가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
      
    }, 400);
  };

  const handleSaveNoInterpolation = () => {
    setIsSaving(true);
    setTimeout(() => {
      try {
        saveExcelFileNoInterpolation(
          decibelMetrics,
          accelerometerMetrics,
          gyroscopeMetrics,
        );
      } catch (error) {
        console.error("파일 저장 중 오류가 발생했습니다.", error);
        alert("파일 저장 중 오류가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
      
    }, 400);
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            {/* Button Group on the left */}
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
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!isTWatingReached || isMeasuring}
                startIcon={<Download />}
              >
                save
              </Button>              
            </ButtonGroup>

            {/*Return Home button on the right*/}
            <Button
                variant="contained"
                onClick={() => navigate('/')}
                startIcon={<ArrowBack />}
              >
                Home
            </Button>
          </Box>
        </Container>
        <Container>
        <Button
          variant="contained"
          onClick={handleSaveNoInterpolation}
          disabled={!isTWatingReached || isMeasuring}
          startIcon={<Download />}
        >
          no interpolation save
        </Button>   
        </Container>
      </Paper>
      <Paper>
        <Container>
          <Box>
            <Typography variant='h6'>Decibel Meter Graph</Typography>
            <Box>
              <Typography variant='h6'>Waveform</Typography>
              <canvas ref={decibelCanvasRef} width="300" height="200" />
            </Box>
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
          <Box>
            <Typography variant='h6'>Accelerometer Graph</Typography>
            <canvas ref={accelCanvasRef} width="300" height="200" />
          </Box>
          <Box>
            <Typography variant='h6'>Gyroscope Graph</Typography>
            <canvas ref={gyroCanvasRef} width="300" height="200" />
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
      <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
        open={isSaving}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  );
}

export default Acquisition;
