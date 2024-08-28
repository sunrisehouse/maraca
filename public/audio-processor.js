class MyAudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const samples = input[0];

    if (samples && samples.length > 0) {
      // RMS 계산
      const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);

      // dB 계산: 최소 RMS 값을 설정하여 로그의 무한대를 방지
      const minRMS = 1e-10; // 최소 RMS 값 설정
      const decibel = 20 * Math.log10(Math.max(rms, minRMS));

      // 메인 스레드로 전송
      this.port.postMessage({ decibel, samples });
    }

    return true;
  }
}

registerProcessor('audio-processor', MyAudioProcessor);