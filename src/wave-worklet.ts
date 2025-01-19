// src/wave-worklet.ts

class RecorderProcessor extends AudioWorkletProcessor {
  // A buffer to store incoming audio data (only channel 0)
  private _buffers: Float32Array[][]
  // The audio sample rate
  private sampleRate: number

  constructor() {
    super()

    // Initialize the buffer
    this._buffers = [[]] // Only one channel (index 0)

    // Retrieve the global sampleRate
    this.sampleRate = sampleRate

    // Handle messages from the main thread
    this.port.onmessage = (event: MessageEvent) => {
      if (event.data === 'flush') {
        this._flush()
      }
    }
  }

  /**
   * The process method is called on every audio frame.
   * Here, we store only the first channel (channel 0).
   * @param inputs - Audio input arrays
   * @returns true to keep the processor running
   */
  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0] // The first input (might contain multiple channels)
    if (input && input[0] && input[0].length > 0) {
      // Initialize the buffer array if needed (already done in constructor)
      // Push the current frame of channel-0 samples
      this._buffers[0].push(new Float32Array(input[0]))
    }
    return true
  }

  /**
   * Flush the recorded audio data, encode to WAV, and send it back.
   */
  private _flush(): void {
    if (this._buffers[0].length > 0) {
      // Encode the data into a WAV file
      const wavBuffer = this.encodeWAV(this._buffers, this.sampleRate, 1) // 1 channel
      // Post the WAV data to the main thread
      this.port.postMessage({ wavBuffer }, [wavBuffer])
      // Clear the buffer
      this._buffers[0] = []
    }
  }

  /**
   * Encode the recorded samples into a 16-bit PCM WAV file.
   * @param samples - An array of Float32Array arrays representing each channel's recorded audio (only channel 0 here)
   * @param sampleRate - The audio sample rate
   * @param channels - Number of channels (1 in our case)
   * @returns An ArrayBuffer containing the WAV data
   */
  private encodeWAV(
    samples: Float32Array[][],
    sampleRate: number,
    channels: number
  ): ArrayBuffer {
    // Flatten the chunks of channel 0
    const flattenedChannel0 = this.flattenChannel(samples[0])

    // We assume the total samples are from the single channel 0
    const totalSamples = flattenedChannel0.length

    // Calculate buffer size: totalSamples * numberOfChannels * 2 bytes
    const bufferLength = totalSamples * channels * 2
    // Create an ArrayBuffer for the WAV
    const buffer = new ArrayBuffer(44 + bufferLength)
    const view = new DataView(buffer)

    // Write the RIFF header
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + bufferLength, true)
    this.writeString(view, 8, 'WAVE')
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * 2, true)
    view.setUint16(32, channels * 2, true)
    view.setUint16(34, 16, true)
    this.writeString(view, 36, 'data')
    view.setUint32(40, bufferLength, true)

    // Write the PCM samples for the single channel
    let offset = 44
    for (let i = 0; i < totalSamples; i++) {
      let s = flattenedChannel0[i]
      // Clamp between -1 and 1
      s = Math.max(-1, Math.min(1, s))
      // Scale to 16-bit
      view.setInt16(offset, s * 0x7fff, true)
      offset += 2
    }

    return buffer
  }

  /**
   * Flatten multiple Float32Array chunks into a single Float32Array.
   * @param chunks - An array of Float32Array chunks
   * @returns A single Float32Array
   */
  private flattenChannel(chunks: Float32Array[]): Float32Array {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const merged = new Float32Array(totalLength)

    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    return merged
  }

  /**
   * Write a string into a DataView at the specified offset.
   * @param view - The DataView
   * @param offset - The offset position
   * @param text - The string to write
   */
  private writeString(view: DataView, offset: number, text: string): void {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }
}

registerProcessor('wave-worklet', RecorderProcessor)
