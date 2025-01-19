// src/wave-worklet.ts

class RecorderProcessor extends AudioWorkletProcessor {
  // A buffer to store incoming audio data for each channel
  private _buffers: Float32Array[][]
  // The audio sample rate
  private sampleRate: number

  // The number of audio channels
  private numberOfChannels: number

  constructor(options: AudioWorkletNodeOptions) {
    // Call the parent class constructor
    super()

    // Initialize the buffer as an empty array of arrays
    this._buffers = []

    // Obtain the sample rate from the global scope
    this.sampleRate = sampleRate // Use the global sampleRate

    // Initialize the number of channels to 1 (mono)
    this.numberOfChannels = 1

    // Listen for messages from the main thread
    this.port.onmessage = (event: MessageEvent) => {
      // If we receive a 'flush' message, process the stored data
      if (event.data === 'flush') {
        this._flush()
      }
      // If you need any handling for other messages, you can add them here
      // else if (event.data === 'start') {
      //   this._start()
      // }
    }
  }

  /**
   * This method is called for every block of audio processing.
   * It receives audio inputs, processes them, and can produce outputs.
   * In this case, we store the input data in a buffer for each channel.
   * @param inputs - An array of input channels, each containing an array of audio samples
   * @returns true to keep the processor alive
   */
  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]
    if (input.length > 0) {
      // Set the number of channels based on the first block of data
      if (this.numberOfChannels === 1) {
        this.numberOfChannels = input.length
      }

      // Initialize buffers for new channels if necessary
      for (let channel = 0; channel < this.numberOfChannels; channel++) {
        const channelData = input[channel]
        if (!this._buffers[channel]) {
          this._buffers[channel] = []
        }
        this._buffers[channel].push(new Float32Array(channelData))
      }
    }
    return true
  }

  /**
   * Sends the buffered audio data to the main thread after encoding it as WAV.
   * Resets the buffer once done.
   */
  private _flush(): void {
    // If there is any buffered data
    if (this._buffers.length > 0) {
      // Encode the data into a WAV file
      const wavBuffer = this.encodeWAV(
        this._buffers,
        this.sampleRate,
        this.numberOfChannels
      )

      // Post the WAV data back to the main thread
      // Transfer the ArrayBuffer so it doesn't get copied
      this.port.postMessage({ wavBuffer }, [wavBuffer])

      // Clear the buffer
      this._buffers = []
    }
  }

  /**
   * Encodes the recorded samples into a 16-bit PCM WAV file.
   * @param samples - Array of Float32Array arrays representing each channel's recorded audio
   * @param sampleRate - The sample rate of the audio
   * @param channels - Number of audio channels
   * @returns An ArrayBuffer containing the encoded WAV data
   */
  /**
   * Encodes the recorded samples into a 16-bit PCM WAV file.
   * @param samples - Array of Float32Array arrays representing each channel's recorded audio
   * @param sampleRate - The sample rate of the audio
   * @param channels - Number of audio channels
   * @returns An ArrayBuffer containing the encoded WAV data
   */
  private encodeWAV(
    samples: Float32Array[][],
    sampleRate: number,
    channels: number
  ): ArrayBuffer {
    // 1) 각 채널별로 쌓인 chunk 들을 하나로 합친다
    const flattenedChannels = samples.map(chunks => {
      // chunks => Float32Array[]
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const merged = new Float32Array(totalLength)

      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      return merged // Float32Array
    })

    // (예시) 모든 채널 길이가 동일하다고 가정
    // 실제로는 길이가 다를 수 있으니, 가장 짧은 길이 혹은 가장 긴 길이 등
    // 로직을 조정해야 할 수도 있음.
    const totalSamples = flattenedChannels[0].length

    // 2) 이번 예시는 모노(1채널)만 다룬다고 가정
    //    만약 스테레오 이상이라면 아래에서 interleave 형태로 작성해야 함.
    //    channels = 1 이면 그냥 모노
    //    channels = 2 이상이면 for 루프에서 sample interleave

    // 아래 코드도 실제로는 interleaving 처리 필요
    const bufferLength = totalSamples * channels * 2
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

    // 3) 모노(1채널)라고 가정하고, flatten된 데이터 하나만 사용 (flattenedChannels[0])
    let offset = 44
    const channelData = flattenedChannels[0] // 모노면 0번 채널만

    for (let i = 0; i < totalSamples; i++) {
      let s = channelData[i]
      // clamp
      s = Math.max(-1, Math.min(1, s))
      view.setInt16(offset, s * 0x7fff, true)
      offset += 2
    }

    return buffer
  }

  /**
   * Helper method to write a string into a DataView at a specific offset.
   * @param view - The DataView to write to
   * @param offset - The starting position of the write
   * @param string - The string to be written
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
}

// Register the processor under the name 'wave-worklet'
registerProcessor('wave-worklet', RecorderProcessor)
