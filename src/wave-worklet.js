class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = []
    this.sampleRate = sampleRate // Ensure sampleRate is defined correctly
    this.port.onmessage = event => {
      if (event.data === 'flush') {
        this._flush()
      }
    }
  }

  process(inputs) {
    const input = inputs[0]
    if (input.length > 0) {
      const channelData = input[0]
      this._buffer.push(new Float32Array(channelData))
    }
    return true
  }

  _flush() {
    if (this._buffer.length > 0) {
      const wavBuffer = this.encodeWAV(this._buffer, this.sampleRate)
      this.port.postMessage({ wavBuffer }, [wavBuffer])
      this._buffer = []
    }
  }

  encodeWAV(samples, sampleRate) {
    const bufferLength = samples.length * samples[0].length * 2
    const buffer = new ArrayBuffer(44 + bufferLength)
    const view = new DataView(buffer)

    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + bufferLength, true)
    this.writeString(view, 8, 'WAVE')
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    this.writeString(view, 36, 'data')
    view.setUint32(40, bufferLength, true)

    let offset = 44
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i]
      for (let j = 0; j < sample.length; j++) {
        const s = Math.max(-1, Math.min(1, sample[j]))
        view.setInt16(offset, s * 0x7fff, true)
        offset += 2
      }
    }

    return buffer
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
}

registerProcessor('wave-worklet', RecorderProcessor)
