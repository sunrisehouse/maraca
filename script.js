let accelrometer = null;
if ('Accelerometer' in window) {
  try {
    accelerometer = new Accelerometer({ frequency: 10 });
    accelerometer.onerror = (event) => {
      // Handle runtime errors.
      if (event.error.name === 'NotAllowedError') {
        console.log('Permission to access sensor was denied.');
      } else if (event.error.name === 'NotReadableError') {
        console.log('Cannot connect to the sensor.');
      }
    };
    accelerometer.onreading = (e) => {
      console.log(e);
    };
    accelerometer.start();
  } catch (error) {
    // Handle construction errors.
    if (error.name === 'SecurityError') {
      console.log('Sensor construction was blocked by the Permissions Policy.');
    } else if (error.name === 'ReferenceError') {
      console.log('Sensor is not supported by the User Agent.');
    } else {
      throw error;
    }
  }
}

let gyroscope = null;
if ('Gyroscope' in window) {
  try {
    gyroscope = new Gyroscope({ frequency: 10 });
    gyroscope.onerror = (event) => {
      // Handle runtime errors.
      if (event.error.name === 'NotAllowedError') {
        console.log('Permission to access sensor was denied.');
      } else if (event.error.name === 'NotReadableError') {
        console.log('Cannot connect to the sensor.');
      }
    };
    console.log(1)
    gyroscope.addEventListener("reading", (e) => {
      console.log(`Angular velocity along the X-axis ${gyroscope.x}`);
      console.log(`Angular velocity along the Y-axis ${gyroscope.y}`);
      console.log(`Angular velocity along the Z-axis ${gyroscope.z}`);
    });
    gyroscope.start();
  } catch (error) {
    // Handle construction errors.
    if (error.name === 'SecurityError') {
      console.log('Sensor construction was blocked by the Permissions Policy.');
    } else if (error.name === 'ReferenceError') {
      console.log('Sensor is not supported by the User Agent.');
    } else {
      throw error;
    }
  }
}

if (accelrometer && gyroscope) {
  const startButton = document.getElementById('startButton');
  const canvas = document.getElementById('chartCanvas').getContext('2d');
  
  let accData = [];
  let gyroData = [];
  let soundData = [];
  let timeData = [];
  let startTime;
  
  // Chart.js를 이용해 그래프 초기화
  let chart = new Chart(canvas, {
      type: 'line',
      data: {
          labels: timeData,
          datasets: [
              {
                  label: '가속도',
                  data: accData,
                  borderColor: 'red',
                  fill: false,
                  yAxisID: 'y',
              },
              {
                  label: '각속도',
                  data: gyroData,
                  borderColor: 'blue',
                  fill: false,
                  yAxisID: 'y1',
              },
              {
                  label: '소리 크기',
                  data: soundData,
                  borderColor: 'green',
                  fill: false,
                  yAxisID: 'y2',
              }
          ]
      },
      options: {
          scales: {
              y: {
                  type: 'linear',
                  position: 'left',
                  beginAtZero: true
              },
              y1: {
                  type: 'linear',
                  position: 'right',
                  beginAtZero: true
              },
              y2: {
                  type: 'linear',
                  position: 'right',
                  beginAtZero: true
              }
          }
      }
  });
  
  // 가속도와 각속도 데이터를 수집하는 함수
  function handleMotion(event) {
      let acc = event.acceleration;
      let gyro = event.rotationRate;
  
      if (acc && gyro) {
          accData.push(acc.x + acc.y + acc.z); // 단순화한 가속도 값
          gyroData.push(gyro.alpha + gyro.beta + gyro.gamma); // 단순화한 각속도 값
          timeData.push((Date.now() - startTime) / 1000); // 시간 데이터
          updateChart();
      }
  }
  
  // 소리 크기를 측정하는 함수
  async function handleSound() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
  
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
      const getSoundLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
          }
          let average = sum / dataArray.length;
          soundData.push(average);
      };
  
      // 10초 동안 소리 데이터 수집
      const soundInterval = setInterval(getSoundLevel, 100);
  
      setTimeout(() => {
          clearInterval(soundInterval);
          stream.getTracks().forEach(track => track.stop()); // 마이크 스트림 종료
      }, 10000);
  }
  
  // 차트를 업데이트하는 함수
  function updateChart() {
      chart.update();
  }
  
  // 측정 시작 버튼 클릭 이벤트
  startButton.addEventListener('click', () => {
      accData = [];
      gyroData = [];
      soundData = [];
      timeData = [];
      startTime = Date.now();
  
      if (window.DeviceMotionEvent) {
          window.addEventListener('devicemotion', handleMotion);
      }
  
      handleSound();
  
      setTimeout(() => {
          window.removeEventListener('devicemotion', handleMotion);
      }, 10000);
  });
}
