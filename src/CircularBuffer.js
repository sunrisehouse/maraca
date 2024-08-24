class CircularBuffer {
  constructor(size) {
    this.buffer = new Array(size); // 고정된 크기의 배열
    this.size = size;
    this.head = 0; // 새로운 데이터가 추가될 인덱스
    this.tail = 0; // 오래된 데이터가 제거될 인덱스
    this.isFull = false; // 버퍼가 가득 찼는지 여부
  }

  push(value) {
    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.size;

    // 버퍼가 가득 차면 tail도 앞으로 이동
    if (this.isFull) {
      this.tail = (this.tail + 1) % this.size;
    }

    // 만약 head가 tail과 같다면, 버퍼가 가득 찬 상태
    if (this.head === this.tail) {
      this.isFull = true;
    }
  }

  getLast() {
    if (!this.isFull && this.head === this.tail) {
      return null; // 버퍼가 비어 있을 때
    }

    // 마지막으로 추가된 데이터는 head - 1 위치에 있음
    const lastIndex = (this.head - 1 + this.size) % this.size;
    return this.buffer[lastIndex];
  }

  getBuffer() {
    if (!this.isFull && this.head === this.tail) {
      return []; // 버퍼가 비어있을 때
    }

    if (this.isFull) {
      // 가득 찬 경우 tail부터 head까지 순환하면서 데이터 반환
      return [...this.buffer.slice(this.tail), ...this.buffer.slice(0, this.head)];
    } else {
      // 비어있지 않지만 가득 차지 않은 경우
      return this.buffer.slice(this.tail, this.head);
    }
  }

  clear() {
    this.head = 0;
    this.tail = 0;
    this.isFull = false;
  }
}

export default CircularBuffer;
