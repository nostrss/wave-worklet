export class WaveWorklet {
  /**
   * Constructor for WaveWorklet
   * @param {AudioContext} context - The AudioContext instance.
   * @param {MediaStreamAudioSourceNode} streamSource - The MediaStreamSource node created from the microphone input.
   * @throws Will throw an error if context or streamSource is not provided.
   */
  constructor(context, streamSource) {
    if (!context || !streamSource) {
      throw new Error('AudioContext and MediaStreamSource are required.')
    }

    this.context = context
    this.source = streamSource // MediaStreamSource provided by the user
    this.processorURL = new URL('./wave-worklet.js', import.meta.url)
    this.audioNode = null
  }

  /**
   * Initializes the AudioWorkletNode and connects the source to it.
   * @throws Will throw an error if the worklet module cannot be added.
   */
  async init() {
    // Register the AudioWorkletProcessor
    await this.context.audioWorklet.addModule(this.processorURL)
    this.audioNode = new AudioWorkletNode(this.context, 'wave-worklet')
    this.source.connect(this.audioNode)
    this.audioNode.connect(this.context.destination) // Optional: Connect to the destination for debugging purposes
  }

  /**
   * Starts recording by sending a 'start' message to the AudioWorkletProcessor.
   * @throws Will throw an error if the AudioWorkletNode is not initialized.
   */
  startRecording() {
    if (!this.audioNode) {
      throw new Error('WaveWorklet is not initialized.')
    }
    this.audioNode.port.postMessage('start')
    console.log('Recording started')
  }

  /**
   * Stops recording and retrieves the WAV buffer from the AudioWorkletProcessor.
   * @returns {Promise<ArrayBuffer>} - The WAV buffer containing the recorded audio.
   * @throws Will throw an error if the AudioWorkletNode is not initialized.
   */
  async stopRecording() {
    if (!this.audioNode) {
      throw new Error('WaveWorklet is not initialized.')
    }

    return new Promise(resolve => {
      this.audioNode.port.onmessage = event => {
        if (event.data.wavBuffer) {
          console.log('Recording stopped, WAV buffer received')
          resolve(event.data.wavBuffer)
        }
      }
      this.audioNode.port.postMessage('flush')
    })
  }
}
