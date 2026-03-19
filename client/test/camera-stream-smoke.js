import assert from 'node:assert/strict';
import { attachCameraStream } from '../src/components/cameraStream.js';

function createFakeVideo() {
  const listeners = new Map();

  return {
    srcObject: null,
    readyState: 0,
    videoWidth: 0,
    videoHeight: 0,
    playCalls: 0,
    addEventListener(name, handler) {
      listeners.set(name, handler);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    async play() {
      this.playCalls += 1;
    },
    emit(name) {
      const handler = listeners.get(name);
      if (handler) handler();
    },
  };
}

const video = createFakeVideo();
const stream = { id: 'stream-1' };
const pending = attachCameraStream(video, stream);

assert.equal(video.srcObject, stream);
assert.equal(video.playCalls, 0);

video.readyState = 2;
video.videoWidth = 640;
video.videoHeight = 480;
video.emit('loadedmetadata');

await pending;

assert.equal(video.playCalls, 1);
assert.equal(video.videoWidth, 640);
assert.equal(video.videoHeight, 480);

console.log('camera stream smoke test passed');
