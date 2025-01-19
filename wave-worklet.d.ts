// wave-worklet.d.ts
export {}

declare global {
  // AudioWorkletProcessorConstructor 타입 정의
  type AudioWorkletProcessorConstructor = new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor

  // registerProcessor 함수 선언
  function registerProcessor(
    name: string,
    processorCtor: { new (...args: any[]): AudioWorkletProcessor }
  ): void

  // AudioWorkletProcessor 인터페이스
  interface AudioWorkletProcessor {
    readonly port: MessagePort
    process(
      inputs: Float32Array[][],
      outputs: Float32Array[][],
      parameters: Record<string, Float32Array>
    ): boolean
  }

  // 전역 AudioWorkletProcessor 생성자
  var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor
    new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor
  }

  // 전역 sampleRate 선언
  const sampleRate: number
}
