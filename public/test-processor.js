class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const channelData = input[0]; // 첫 번째 채널의 데이터를 가져옴
      this.buffer.push(...channelData);

      if (this.buffer.length >= 2048) {
        // 메시지를 보내기 위한 데이터 버퍼가 충분히 채워졌을 때
        this.port.postMessage(this.buffer.slice(0, 2048)); 
        this.buffer = this.buffer.slice(2048); // 처리된 데이터를 버퍼에서 제거
      }
    }

    return true; // 계속 처리하도록 `true`를 반환
  }
}

registerProcessor('audio-processor', AudioProcessor);