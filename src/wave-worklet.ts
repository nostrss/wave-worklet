class RecorderProcessor extends AudioWorkletProcessor {
  // A buffer to store incoming audio data
  private _buffer: Float32Array[]
  // The audio sample rate
  private sampleRate: number

  constructor(options: AudioWorkletNodeOptions) {
    // Call the parent class constructor
    super()

    // Initialize the buffer
    this._buffer = []

    // Obtain the sample rate from the audio context
    this.sampleRate = (options as any).context.sampleRate

    // Listen for messages from the main thread
    this.port.onmessage = (event: MessageEvent) => {
      // If we receive a 'flush' message, process the stored data
      if (event.data === 'flush') {
        this._flush()
      }
    }
  }

  /**
   * This method is called for every block of audio processing.
   * It receives audio inputs, processes them, and can produce outputs.
   * In this case, we simply store the input data in a buffer.
   * @param inputs - An array of input channels, each containing an array of audio samples
   * @returns true to keep the processor alive
   */
  process(inputs: Float32Array[][]): boolean {
    // inputs[0] is the first channel of the first input
    const input = inputs[0]
    if (input.length > 0) {
      // Get the data for the first channel
      const channelData = input[0]
      // Store a copy of the channel data in the buffer
      this._buffer.push(new Float32Array(channelData))
    }
    // Returning true ensures the processor will continue to run
    return true
  }

  /**
   * Sends the buffered audio data to the main thread after encoding it as WAV.
   * Resets the buffer once done.
   */
  private _flush(): void {
    // If there is any buffered data
    if (this._buffer.length > 0) {
      // Encode the data into a WAV file
      const wavBuffer = this.encodeWAV(this._buffer, this.sampleRate)

      // Post the WAV data back to the main thread
      // Transfer the ArrayBuffer so it doesn't get copied
      this.port.postMessage({ wavBuffer }, [wavBuffer])

      // Clear the buffer
      this._buffer = []
    }
  }

  /**
   * Encodes the recorded samples into a 16-bit PCM WAV file.
   * @param samples - Array of Float32Array representing each chunk of recorded audio
   * @param sampleRate - The sample rate of the audio
   * @returns An ArrayBuffer containing the encoded WAV data
   */
  private encodeWAV(samples: Float32Array[], sampleRate: number): ArrayBuffer {
    // Calculate the total buffer length needed for PCM data (2 bytes per sample)
    const bufferLength = samples.length * samples[0].length * 2

    // Create an ArrayBuffer with space for the WAV header plus the PCM data
    const buffer = new ArrayBuffer(44 + bufferLength)
    const view = new DataView(buffer)

    // Write the RIFF header
    this.writeString(view, 0, 'RIFF')
    // File size: 36 + data size
    view.setUint32(4, 36 + bufferLength, true)
    // WAVE type
    this.writeString(view, 8, 'WAVE')
    // Format chunk identifier
    this.writeString(view, 12, 'fmt ')
    // Format chunk length (16 for PCM)
    view.setUint32(16, 16, true)
    // Audio format (1 = PCM)
    view.setUint16(20, 1, true)
    // Number of channels (1 = mono)
    view.setUint16(22, 1, true)
    // Sample rate
    view.setUint32(24, sampleRate, true)
    // Byte rate = sampleRate * blockAlign
    view.setUint32(28, sampleRate * 2, true)
    // Block align = number of channels * bytesPerSample
    view.setUint16(32, 2, true)
    // Bits per sample (16)
    view.setUint16(34, 16, true)
    // Data chunk identifier
    this.writeString(view, 36, 'data')
    // Data chunk length
    view.setUint32(40, bufferLength, true)

    let offset = 44
    // Write the PCM samples
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i]
      for (let j = 0; j < sample.length; j++) {
        // Clamp the value between -1 and 1, then scale to 16-bit
        const s = Math.max(-1, Math.min(1, sample[j]))
        view.setInt16(offset, s * 0x7fff, true)
        offset += 2
      }
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
