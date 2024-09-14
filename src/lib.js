import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const initAudio = async (onMessage) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.audioWorklet.addModule('/maraca/build/audio-processor.js');
    const audioNode = new AudioWorkletNode(audioContext, 'audio-processor');
  
    // 사용자로부터 마이크 접근 권한 요청
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
    // 마이크 스트림 생성
    const microphone = audioContext.createMediaStreamSource(stream);
  
    // 마이크 -> AudioWorkletNode -> 출력
    microphone.connect(audioNode);
    audioNode.connect(audioContext.destination);
  
    audioNode.port.onmessage = (event) => {
      const { samples } = event.data;
      onMessage({ samples });
    };
    return { audioContext }
  } catch (error) {
    console.error(error);
  }
  return null;
}

export const initAccelerometer = async (onReading) => {
  try {
    const accPermissionResult = await navigator.permissions.query({ name: "accelerometer" });
  
    if (accPermissionResult.state === "denied") {
      alert("Permission to use accelerometer. gyroscope sensor is denied");
      return () => {};
    }
    
    if (!('Accelerometer' in window)) {
      alert('브라우저가 센서를 지원하지 않습니다.');
      return () => {};
    }

    const accelerometer = new window.Accelerometer({ frequency: 100 });
    accelerometer.addEventListener("reading", () => {
      onReading({
        t: Date.now(),
        x: accelerometer.x,
        y: accelerometer.y,
        z: accelerometer.z,
      })
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

export const initGyroscope = async (onReading) => {
  try {
    const gyroPermissionResult = await navigator.permissions.query({ name: "gyroscope" });
  
    if (gyroPermissionResult.state === "denied") {
      alert("Permission to use accelerometer. gyroscope sensor is denied");
      return () => {};
    }

    if (!('Gyroscope' in window)) {
      alert('브라우저가 센서를 지원하지 않습니다.');
      return () => {};
    }

    const gyroscope = new window.Gyroscope({ frequency: 100 });
    gyroscope.addEventListener("reading", () => {
      onReading({
        t: Date.now(),
        x: gyroscope.x,
        y: gyroscope.y,
        z: gyroscope.z,
      })
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

export const saveExcelFile = (prevDecibelMetrics, accelerometerMetrics, gyroscopeMetrics) => {
  const totalData = [];

  prevDecibelMetrics.sort((a, b) => a.t - b.t);
  const decibelMetrics = prevDecibelMetrics.reduce((acc, cur) => {
    if (acc.length > 0) {
      if (acc[acc.length - 1].t === cur.t) {
        acc[acc.length - 1].samples.push(...cur.samples);
      } else {
        acc.push({ t: cur.t, d: cur.d, samples: [...cur.samples] });
      }
    } else {
      acc.push(cur);
    }
    return acc;
  }, []);
  
  decibelMetrics.forEach((metric, metricIdx) => {
    const prevT = metricIdx === 0 ?  decibelMetrics[0].t - 10 : decibelMetrics[metricIdx - 1].t;
    const factor = (metric.t - prevT) / metric.samples.length;
    metric.samples.forEach((sample, sampleIdx) => {
      totalData.push({
        Time: prevT + factor * sampleIdx,
        Decibel: sample,
      });
    });
  });

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

  totalData.forEach((data, index) => {
    if (data.Decibel === '') {
      if (index > 0) {
        let prevData = null;
        for (let i = index - 1; i > -1; i--) {
          if (totalData[i].Decibel !== '') {
            prevData = totalData[i];
            break;
          }
        }
        let nextData = null;
        for (let i = index + 1; i < totalData.length; i++) {
          if (totalData[i].Decibel !== '') {
            nextData = totalData[i];
            break;
          }
        }
        if (prevData && nextData) {
          const timeRange = nextData.Time - prevData.Time;
          const factor = timeRange > 0 ? (data.Time - prevData.Time) / timeRange : 0;
          totalData[index].Decibel = prevData.Decibel + factor * (nextData.Decibel - prevData.Decibel)
        } else if (prevData) {
          totalData[index].Decibel = prevData.Decibel
        } else if (nextData) {
          totalData[index].Decibel = nextData.Decibel
        }
      }
    }

    if (data.Ax === '') {
      if (index > 0) {
        let prevData = null;
        for (let i = index - 1; i > -1; i--) {
          if (totalData[i].Ax !== '') {
            prevData = totalData[i];
            break;
          }
        }
        let nextData = null;
        for (let i = index + 1; i < totalData.length; i++) {
          if (totalData[i].Ax !== '') {
            nextData = totalData[i];
            break;
          }
        }
        if (prevData && nextData) {
          const timeRange = nextData.Time - prevData.Time;
          const factor = timeRange > 0 ? (data.Time - prevData.Time) / timeRange : 0;
          totalData[index].Ax = prevData.Ax + factor * (nextData.Ax - prevData.Ax)
          totalData[index].Ay = prevData.Ay + factor * (nextData.Ay - prevData.Ay)
          totalData[index].Az = prevData.Az + factor * (nextData.Az - prevData.Az)
        } else if (prevData) {
          totalData[index].Ax = prevData.Ax;
          totalData[index].Ay = prevData.Ay;
          totalData[index].Az = prevData.Az;
        } else if (nextData) {
          totalData[index].Ax = nextData.Ax;
          totalData[index].Ay = nextData.Ay;
          totalData[index].Az = nextData.Az;
        }
      }
    }

    if (data.Rx === '') {
      if (index > 0) {
        let prevData = null;
        for (let i = index - 1; i > -1; i--) {
          if (totalData[i].Rx !== '') {
            prevData = totalData[i];
            break;
          }
        }
        let nextData = null;
        for (let i = index + 1; i < totalData.length; i++) {
          if (totalData[i].Rx !== '') {
            nextData = totalData[i];
            break;
          }
        }
        if (prevData && nextData) {
          const timeRange = nextData.Time - prevData.Time;
          const factor = timeRange > 0 ? (data.Time - prevData.Time) / timeRange : 0;
          totalData[index].Rx = prevData.Rx + factor * (nextData.Rx - prevData.Rx)
          totalData[index].Ry = prevData.Ry + factor * (nextData.Ry - prevData.Ry)
          totalData[index].Rz = prevData.Rz + factor * (nextData.Rz - prevData.Rz)
        } else if (prevData) {
          totalData[index].Rx = prevData.Rx;
          totalData[index].Ry = prevData.Ry;
          totalData[index].Rz = prevData.Rz;
        } else if (nextData) {
          totalData[index].Rx = nextData.Rx;
          totalData[index].Ry = nextData.Ry;
          totalData[index].Rz = nextData.Rz;
        }
      }
    }
  });

  const decibelData = [];

  decibelMetrics.forEach(metric => {
    // Create a new object starting with Time and Decibel
    const newMetric = {
      Time: metric.t,
      Decibel: metric.d,
    };
  
    // Add each sample with keys S1, S2, ..., Sn
    metric.samples.forEach((sample, index) => {
      decibelData.push({
        Time: index === 0 ? metric.t : '',
        Sample: sample,
      });
    });
  
    return newMetric;
  });

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

  //Excel 파일명에 실행시간 추가 - YYYY_WW_MM-HH-mm_ss
  const getFormattedDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  };

  const formattedDate = getFormattedDate();

  // 파일 저장
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  saveAs(blob, `Time_Data_${formattedDate}.xlsx`);
};
