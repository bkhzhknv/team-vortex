function waitForVideoState(video, eventName, predicate) {
  if (predicate()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onReady = () => {
      if (!predicate()) {
        return;
      }

      video.removeEventListener(eventName, onReady);
      resolve();
    };

    video.addEventListener(eventName, onReady);
  });
}

export async function attachCameraStream(video, stream) {
  const metadataReady = waitForVideoState(video, 'loadedmetadata', () => video.readyState >= 1);
  video.srcObject = stream;

  await metadataReady;
  await video.play();
  await waitForVideoState(video, 'loadeddata', () => video.readyState >= 2);

  return video;
}
