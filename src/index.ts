import waveWorkletUrl from './wave-worklet.ts?url'

export class WaveWorklet {
  private context: AudioContext
  private source: MediaStreamAudioSourceNode
  private processorURL: URL
  private audioNode: AudioWorkletNode | null

  /**
   * Constructor for WaveWorklet
   * @param {AudioContext} context - The AudioContext instance.
   * @param {MediaStreamAudioSourceNode} streamSource - The MediaStreamSource node created from the microphone input.
   * @throws Will throw an error if context or streamSource is not provided.
   */
  constructor(context: AudioContext, streamSource: MediaStreamAudioSourceNode) {
    if (!context || !streamSource) {
      throw new Error('AudioContext and MediaStreamSource are required.')
    }

    this.context = context
    this.source = streamSource
    // @vite-ignore
    this.processorURL = new URL(waveWorkletUrl, import.meta.url)
    this.audioNode = null
  }

  /**
   * Initializes the AudioWorkletNode and connects the source to it.
   * @throws Will throw an error if the worklet module cannot be added.
   */
  async init(): Promise<void> {
    await this.context.audioWorklet.addModule(this.processorURL)
    this.audioNode = new AudioWorkletNode(this.context, 'wave-worklet')
    this.source.connect(this.audioNode)
    this.audioNode.connect(this.context.destination) // optional connection for testing
  }

  /**
   * Starts recording.
   * @throws Will throw an error if the AudioWorkletNode is not initialized.
   */
  startRecording(): void {
    if (!this.audioNode) {
      throw new Error('WaveWorklet is not initialized.')
    }
    console.log('Recording started')
  }

  /**
   * Stops recording, retrieves the WAV buffer, and cleans up resources.
   * @returns {Promise<ArrayBuffer>} The WAV buffer.
   * @throws Will throw an error if the AudioWorkletNode is not initialized.
   */
  async stopRecording(): Promise<ArrayBuffer> {
    return this.flushAndGetWave(/* shouldCleanup */ true)
  }

  /**
   * Flushes the recorded audio but continues recording without cleanup.
   * @returns {Promise<ArrayBuffer>} The WAV buffer.
   * @throws Will throw an error if the AudioWorkletNode is not initialized.
   */
  async flushWaveFile(): Promise<ArrayBuffer> {
    return this.flushAndGetWave(/* shouldCleanup */ false)
  }

  /**
   * Internal method to flush the current buffer from the AudioWorkletNode,
   * returning the WAV data. Can optionally clean up the node.
   * @param shouldCleanup - Whether to disconnect and close the node after flushing
   * @returns A promise that resolves to the WAV ArrayBuffer
   */
  private flushAndGetWave(shouldCleanup: boolean): Promise<ArrayBuffer> {
    if (!this.audioNode) {
      return Promise.reject(new Error('WaveWorklet is not initialized.'))
    }

    const audioNode = this.audioNode

    return new Promise<ArrayBuffer>(resolve => {
      // Handle the message from the AudioWorkletProcessor
      audioNode.port.onmessage = (event: MessageEvent) => {
        if (event.data.wavBuffer) {
          console.log('WAV buffer received')
          resolve(event.data.wavBuffer)

          // If shouldCleanup is true, disconnect and close the port
          if (shouldCleanup) {
            this.source.disconnect(audioNode)
            audioNode.disconnect()
            audioNode.port.close()
            this.audioNode = null
          }
        }
      }

      // Request the processor to flush its buffer
      audioNode.port.postMessage('flush')
    })
  }
}
