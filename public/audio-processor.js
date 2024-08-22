class MyAudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input.length > 0) {
      let sumSquares = 0;

      // 각 샘플의 제곱합을 계산
      input[0].forEach(sample => {
        sumSquares += sample ** 2;
      });

      // 루트 평균 제곱 (RMS) 계산
      const rms = Math.sqrt(sumSquares / input[0].length);

      // 데시벨 계산 (상대적)
      const decibel = 20 * Math.log10(rms);

      // 현재 시간 (Unix 타임스탬프를 밀리초 단위로 계산)
      const timestamp = Date.now();

      // 메인 스레드로 데시벨 값과 시간을 전달
      this.port.postMessage({ decibel, timestamp });
    }

    return true;
  }
}

registerProcessor('audio-processor', MyAudioProcessor);