// src/index.ts

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
    this.source = streamSource // MediaStreamSource provided by the user
    // @vite-ignore
    this.processorURL = new URL('./wave-worklet.js', import.meta.url) // Updated to .js
    this.audioNode = null
  }

  /**
   * Initializes the AudioWorkletNode and connects the source to it.
   * @throws Will throw an error if the worklet module cannot be added.
   */
  async init(): Promise<void> {
    // Register the AudioWorkletProcessor
    await this.context.audioWorklet.addModule(this.processorURL)
    this.audioNode = new AudioWorkletNode(this.context, 'wave-worklet')
    this.source.connect(this.audioNode)
    this.audioNode.connect(this.context.destination) // Optional: Connect to the destination for debugging purposes
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
   * Stops recording and retrieves the WAV buffer from the AudioWorkletProcessor.
   * @returns {Promise<ArrayBuffer>} - The WAV buffer containing the recorded audio.
   * @throws Will throw an error if the AudioWorkletNode is not initialized.
   */
  async stopRecording(): Promise<ArrayBuffer> {
    if (!this.audioNode) {
      throw new Error('WaveWorklet is not initialized.')
    }

    const audioNode = this.audioNode // Assign to local variable to ensure non-null

    return new Promise<ArrayBuffer>(resolve => {
      audioNode.port.onmessage = (event: MessageEvent) => {
        if (event.data.wavBuffer) {
          console.log('Recording stopped, WAV buffer received')
          resolve(event.data.wavBuffer)
        }
      }
      audioNode.port.postMessage('flush')
    })
  }
}
