import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { attachCameraStream } from './cameraStream';
import './CameraNode.css';

function CameraNode({ cameras }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [activity, setActivity] = useState(0);
  const [incidentOverlay, setIncidentOverlay] = useState(false);
  const [simulateHeavy, setSimulateHeavy] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const requestRef = useRef();
  const historyRef = useRef([]);
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    async function initTF() {
      try {
        await tf.ready();
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        const det = await poseDetection.createDetector(model, detectorConfig);
        setDetector(det);
      } catch (err) {
        setErrorMsg('AI Model Error: ' + err.message);
      }
    }
    initTF();
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Camera Error: Media devices are not supported in this browser');
      return undefined;
    }

    let cancelled = false;
    let activeStream = null;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        activeStream = mediaStream;

        if (!videoRef.current || cancelled) {
          return;
        }

        await attachCameraStream(videoRef.current, mediaStream);

        if (!cancelled) {
          setErrorMsg(null);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg('Camera Error: ' + err.message);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const triggerEvent = useCallback(async (type, priority, heavyVolume = false) => {
    const now = Date.now();
    if (now - lastTriggerRef.current < 5000) return;
    lastTriggerRef.current = now;

    setIncidentOverlay(true);
    setTimeout(() => setIncidentOverlay(false), 1000);

    const camera = cameras[0] || { id: 'cam-01', name: 'Webcam Node', lat: 42.9012, lng: 71.3645 };
    try {
      await fetch('http://localhost:4000/api/incidents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          priority,
          heavyVolume,
          requiredVolunteers: heavyVolume ? 3 : 1,
          lat: camera.lat,
          lng: camera.lng,
          cameraId: camera.id,
          locationName: camera.name
        }),
      });
    } catch (e) {}
  }, [cameras]);

  const simulateHeavyRef = useRef(simulateHeavy);
  useEffect(() => {
    simulateHeavyRef.current = simulateHeavy;
  }, [simulateHeavy]);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }
    const video = videoRef.current;
    if (video.readyState < 2) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const canvas = canvasRef.current;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (detector) {
      try {
        const poses = await detector.estimatePoses(video);
        if (poses.length > 0) {
          const pose = poses[0];
          const kp = pose.keypoints;
          
          const pMap = {};
          kp.forEach(p => pMap[p.name] = p);

          ctx.strokeStyle = '#00e09e';
          ctx.lineWidth = 2;
          const connections = [
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_elbow'],
            ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'],
            ['right_elbow', 'right_wrist'],
            ['left_shoulder', 'left_hip'],
            ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle']
          ];

          connections.forEach(([p1, p2]) => {
            const kp1 = pMap[p1];
            const kp2 = pMap[p2];
            if (kp1 && kp2 && kp1.score > 0.3 && kp2.score > 0.3) {
              ctx.beginPath();
              ctx.moveTo(kp1.x, kp1.y);
              ctx.lineTo(kp2.x, kp2.y);
              ctx.stroke();
            }
          });

          kp.forEach(p => {
            if (p.score > 0.3) {
              ctx.fillStyle = '#ffb830';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4, 0, 2*Math.PI);
              ctx.fill();
            }
          });

          const lw = pMap.left_wrist;
          const rw = pMap.right_wrist;
          const sh = pMap.left_shoulder;
          const hp = pMap.left_hip;
          
          if (lw && rw && sh && hp && lw.score > 0.3 && rw.score > 0.3) {
            const now = Date.now();
            historyRef.current.push({ t: now, lw: {x: lw.x, y: lw.y}, rw: {x: rw.x, y: rw.y} });
            historyRef.current = historyRef.current.filter(i => now - i.t < 2000);

            let vel = 0;
            if (historyRef.current.length > 2) {
              const first = historyRef.current[0];
              const last = historyRef.current[historyRef.current.length - 1];
              const dt = (last.t - first.t) / 1000;
              if (dt > 0) {
                const dl = Math.hypot(last.lw.x - first.lw.x, last.lw.y - first.lw.y);
                const dr = Math.hypot(last.rw.x - first.rw.x, last.rw.y - first.rw.y);
                vel = (dl + dr) / (2 * dt);
              }
            }
            
            const act = Math.min(100, (vel / 500) * 100);
            setActivity(act);

            const torsoY = (sh.y + hp.y) / 2;
            const screenBottom30 = canvas.height * 0.7;

            if (torsoY > screenBottom30) {
              if (act > 70) {
                triggerEvent('Medical Emergency (Seizure)', 'red');
              } else if (act < 40) {
                triggerEvent('Heavy Fall', 'yellow', simulateHeavyRef.current);
              }
            }
          }
        }
      } catch (e) {}
    }

    requestRef.current = requestAnimationFrame(processFrame);
  }, [detector, triggerEvent]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [processFrame]);

  return (
    <div className="camera-node-layout">
      <div className="camera-main">
        <div className="camera-feed-container">
          <div className="camera-header">
            <span className="live-dot"></span> LIVE: AI Pose Detection
            {privacyMode && <span className="privacy-badge-inline">🛡️ PRIVACY</span>}
          </div>
          
          <video ref={videoRef} autoPlay playsInline muted className="camera-video-source" />
          
          {errorMsg ? (
            <div style={{ color: '#ff3b5c', zIndex: 100, padding: 20 }}>
              <h2>SYSTEM ERROR</h2>
              <p>{errorMsg}</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className={`pose-canvas ${privacyMode ? 'privacy-blur-active' : ''}`}
            />
          )}
          
          <div className="activity-meter-container">
            <div className="activity-meter-fill" style={{ height: `${activity}%` }}></div>
          </div>

          {incidentOverlay && (
            <div className="incident-overlay">
              <h1>INCIDENT DETECTED</h1>
            </div>
          )}
        </div>
      </div>

      <div className="camera-sidebar glass">
        <h2>System Status</h2>
        <p style={{ color: errorMsg ? '#ff3b5c' : 'inherit' }}>
          {errorMsg ? "Error" : (detector ? "Pose Detection Active" : "Initializing AI Model...")}
        </p>

        <div className="checkbox-container">
          <input
            type="checkbox"
            checked={privacyMode}
            onChange={e => setPrivacyMode(e.target.checked)}
            id="privacyToggle"
          />
          <label htmlFor="privacyToggle">🛡️ Privacy Mode (blur display)</label>
        </div>
        
        <div className="checkbox-container">
          <input 
            type="checkbox" 
            checked={simulateHeavy} 
            onChange={e => setSimulateHeavy(e.target.checked)} 
            id="simHeavy"
          />
          <label htmlFor="simHeavy">Simulate Heavy Object Fall</label>
        </div>

        <div className="trigger-buttons">
          <button className="btn btn-danger trigger-btn" onClick={() => triggerEvent('Medical Emergency (Seizure)', 'red')}>
            [MANUAL] Medical Emergency
          </button>
          <button className="btn btn-warning trigger-btn" style={{ background: '#ffb830', color: '#000' }} onClick={() => triggerEvent('Heavy Fall', 'yellow', simulateHeavy)}>
            [MANUAL] Fall
          </button>
        </div>
      </div>
    </div>
  );
}

export default CameraNode;
