// wave-worklet.d.ts
export {}

declare global {
  // 1) AudioWorkletProcessorConstructor type definition
  type AudioWorkletProcessorConstructor = new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor

  // 2) registerProcessor function declaration
  function registerProcessor(
    name: string,
    processorCtor: { new (...args: any[]): AudioWorkletProcessor }
  ): void

  // 3) AudioWorkletProcessor interface
  interface AudioWorkletProcessor {
    readonly port: MessagePort
    process(
      inputs: Float32Array[][],
      outputs: Float32Array[][],
      parameters: Record<string, Float32Array>
    ): boolean
  }

  // 4) Global AudioWorkletProcessor constructor
  var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor
    new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor
  }
}
