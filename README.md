## Wave Worklet

A JavaScript library for recording audio using AudioWorklet in the browser.

### Introduction

Wave Worklet provides an easy way to record audio in web applications using the Web Audio API's AudioWorklet feature. It captures audio from the user's microphone, processes it in real-time, and provides a WAV buffer that can be played back or saved.

### Installation

Install the package via npm:

```bash
npm install wave-worklet
```

Usage
Here's a basic example of how to use Wave Worklet to record audio:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Wave Worklet Demo</title>
  </head>
  <body>
    <button id="start">Start Recording</button>
    <button id="stop">Stop Recording</button>
    <audio id="audio-player" controls></audio>

    <script type="module">
      import { WaveWorklet } from 'wave-worklet'

      let recorder = null

      document.getElementById('start').addEventListener('click', async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          const context = new AudioContext()
          const source = context.createMediaStreamSource(stream)

          recorder = new WaveWorklet(context, source)
          await recorder.init()

          recorder.startRecording()
          console.log('Recording started')
        } catch (err) {
          console.error('Failed to start recording:', err)
        }
      })

      document.getElementById('stop').addEventListener('click', async () => {
        if (!recorder) {
          console.error('Recorder is not initialized.')
          return
        }

        try {
          const wavBuffer = await recorder.stopRecording()
          const blob = new Blob([wavBuffer], { type: 'audio/wav' })
          const url = URL.createObjectURL(blob)
          const audioPlayer = document.getElementById('audio-player')
          audioPlayer.src = url
        } catch (err) {
          console.error('Failed to stop recording:', err)
        }
      })
    </script>
  </body>
</html>
```

### API Reference

#### `WaveWorklet`

Constructor

```javascript
new WaveWorklet(context, streamSource)
```

- context: An instance of AudioContext.
- streamSource: A MediaStreamAudioSourceNode created from the microphone input.

Methods

- `init()`

  - Initializes the AudioWorkletNode and connects the source.
  - Returns: Promise<void>

- `startRecording()`

  - Starts recording audio.
  - Returns: void

- `stopRecording()`
  - Stops recording and retrieves the WAV buffer.
  - Returns: Promise<ArrayBuffer>

### Requirements

- Browser support for the Web Audio API and AudioWorklet.
- Served over HTTPS (required for getUserMedia).
- Modern browsers like Chrome, Firefox, and Edge.
