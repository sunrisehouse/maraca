async function init() {
  alert('hello')
  const accPermissionResult = await navigator.permissions.query({ name: "accelerometer" });
  const gyroPermissionResult = await navigator.permissions.query({ name: "gyroscope" });
  if (accPermissionResult.state === "denied" || gyroPermissionResult.state === "denied") {
    alert("Permission to use accelerometer. gyroscope sensor is denied");
    return;
  }
  if (!'Accelerometer' in window || !'Gyroscope' in window) {
    alert('브라우저가 센서를 지원하지 않습니다.');
  }
  
  let accelerometer = null;
  try {
    accelerometer = new Accelerometer({ frequency: 10 });
  } catch (error) {
    if (error.name === 'SecurityError') {
      alert('Sensor construction was blocked by the Permissions Policy.');
    } else if (error.name === 'ReferenceError') {
      alert('Sensor is not supported by the User Agent.');
    } else {
      alert(`${error.name} ${error.message}`);
    }
    return;
  }

  let gyroscope = null;
  try {
    gyroscope = new Gyroscope({ frequency: 10 });
  } catch (error) {
    if (error.name === 'SecurityError') {
      alert('Sensor construction was blocked by the Permissions Policy.');
    } else if (error.name === 'ReferenceError') {
      alert('Sensor is not supported by the User Agent.');
    } else {
      alert(`${error.name} ${error.message}`);
    }
    return;
  }
  
  const startButton = document.getElementById('startButton');
  const canvas = document.getElementById('chartCanvas').getContext('2d');
  const accelerometerResult = document.getElementById('accelerometer-result');
  const gyroscopeResult = document.getElementById('gyroscope-result');
  
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
  
  // 차트를 업데이트하는 함수
  function updateChart() {
    chart.update();
  }

  accelerometer.addEventListener("reading", () => {
    accData.push(accelerometer.x + accelerometer.y + accelerometer.z); // 단순화한 가속도 값
    const tr = document.createElement( "tr" );
    const td_t = document.createElement("td");
    const td_x = document.createElement("td");
    const td_y = document.createElement("td");
    const td_z = document.createElement("td");
    td_t.innerText = accelerometer.timestamp;
    td_x.innerText = accelerometer.x;
    td_y.innerText = accelerometer.y;
    td_x.innerText = accelerometer.z;
    tr.appendChild(td_t);
    tr.appendChild(td_x);
    tr.appendChild(td_y);
    tr.appendChild(td_z);
    accelerometerResult.appendChild(tr);
  });

  gyroscope.addEventListener("reading", () => {
    gyroData.push(gyroscope.alpha + gyroscope.beta + gyroscope.gamma);
    const tr = document.createElement( "tr" );
    const td_t = document.createElement("td");
    const td_x = document.createElement("td");
    const td_y = document.createElement("td");
    const td_z = document.createElement("td");
    td_t.innerText = gyroscope.timestamp;
    td_x.innerText = gyroscope.x;
    td_y.innerText = gyroscope.y;
    td_x.innerText = gyroscope.z;
    tr.appendChild(td_t);
    tr.appendChild(td_x);
    tr.appendChild(td_y);
    tr.appendChild(td_z);
    gyroscopeResult.appendChild(tr);
  });

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
  
  // 측정 시작 버튼 클릭 이벤트
  startButton.addEventListener('click', async () => {
    accData = [];
    gyroData = [];
    soundData = [];
    timeData = [];
    startTime = Date.now();

    // 10초 동안 소리 데이터 수집
    const soundInterval = setInterval(getSoundLevel, 100);
    accelerometer.start();
    gyroscope.start();

    setTimeout(() => {
      accelerometer.stop();
      gyroscope.stop();
      clearInterval(soundInterval);
      stream.getTracks().forEach(track => track.stop()); // 마이크 스트림 종료
      updateChart();
      alert("end");
    }, 10000);
  });
}

init();
