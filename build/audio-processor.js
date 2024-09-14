class MyAudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const samples = input[0];

    if (samples && samples.length > 0) {
      // 메인 스레드로 전송
      this.port.postMessage({ t: Date.now(), samples });
    }

    return true;
  }
}

registerProcessor('audio-processor', MyAudioProcessor);