import React, { useRef, useEffect, useCallback } from 'react';
import './PrivacyVideo.css';



const SKELETON_COLORS = {
  red: '#ff3b5c',
  yellow: '#ffb830',
};


const LIMB_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [5, 7],
  [1, 8],
  [8, 9],
  [8, 10],
  [9, 11],
  [10, 12],
  [11, 13],
  [12, 14],
];

function generatePerson(canvasW, canvasH, index) {
  const baseX = 120 + index * 200 + Math.random() * 60;
  const baseY = canvasH * 0.35;
  const scale = 0.8 + Math.random() * 0.4;

  return {
    id: index,
    x: baseX,
    y: baseY,
    scale,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 1.5,
    fallen: index === 0 && Math.random() > 0.5,
  };
}

function getSkeletonPoints(person, time) {
  const { x, y, scale, phase, speed, fallen } = person;
  const s = scale * 1.2;
  const breathe = Math.sin(time * speed + phase) * 2;
  const sway = Math.sin(time * speed * 0.7 + phase) * 3;

  if (fallen) {

    const groundY = y + 120 * s;
    return [
      { x: x - 60 * s, y: groundY },
      { x: x - 40 * s, y: groundY - 5 },
      { x: x - 40 * s, y: groundY - 15 * s },
      { x: x - 40 * s, y: groundY + 15 * s },
      { x: x - 20 * s, y: groundY - 20 * s },
      { x: x - 20 * s, y: groundY + 20 * s },
      { x: x, y: groundY - 15 * s + breathe },
      { x: x, y: groundY + 15 * s - breathe },
      { x: x + 20 * s, y: groundY },
      { x: x + 20 * s, y: groundY - 10 * s },
      { x: x + 20 * s, y: groundY + 10 * s },
      { x: x + 50 * s, y: groundY - 5 * s },
      { x: x + 50 * s, y: groundY + 5 * s },
      { x: x + 75 * s, y: groundY - 3 * s },
      { x: x + 75 * s, y: groundY + 3 * s },
    ];
  }


  return [
    { x: x + sway, y: y - 5 + breathe },
    { x: x + sway * 0.8, y: y + 20 * s + breathe * 0.5 },
    { x: x - 18 * s + sway, y: y + 25 * s },
    { x: x + 18 * s + sway, y: y + 25 * s },
    { x: x - 25 * s + sway, y: y + 55 * s + breathe },
    { x: x + 25 * s + sway, y: y + 55 * s - breathe },
    { x: x - 20 * s + sway, y: y + 80 * s + breathe * 1.5 },
    { x: x + 20 * s + sway, y: y + 80 * s - breathe * 1.5 },
    { x: x + sway * 0.5, y: y + 75 * s },
    { x: x - 12 * s, y: y + 78 * s },
    { x: x + 12 * s, y: y + 78 * s },
    { x: x - 14 * s, y: y + 110 * s },
    { x: x + 14 * s, y: y + 110 * s },
    { x: x - 14 * s, y: y + 140 * s },
    { x: x + 14 * s, y: y + 140 * s },
  ];
}

function PrivacyVideo({ priority, incidentType }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const draw = useCallback((ctx, canvas, time) => {
    const W = canvas.width;
    const H = canvas.height;


    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0d1117');
    grad.addColorStop(0.5, '#161b22');
    grad.addColorStop(1, '#0d1117');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);


    for (let i = 0; i < 800; i++) {
      const nx = Math.random() * W;
      const ny = Math.random() * H;
      const alpha = Math.random() * 0.08;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(nx, ny, 1, 1);
    }


    const groundY = H * 0.82;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
    ctx.setLineDash([]);


    ctx.fillStyle = 'rgba(40, 50, 70, 0.3)';
    ctx.fillRect(20, H * 0.2, 80, H * 0.6);
    ctx.fillRect(W - 90, H * 0.3, 70, H * 0.5);
    ctx.fillStyle = 'rgba(50, 60, 80, 0.2)';
    ctx.fillRect(W * 0.3, H * 0.15, 120, 40);


    const numPeople = 3;
    const color = SKELETON_COLORS[priority] || '#00e09e';

    for (let i = 0; i < numPeople; i++) {
      const person = {
        id: i,
        x: 140 + i * (W / (numPeople + 1)),
        y: H * 0.25,
        scale: 0.7 + i * 0.15,
        phase: i * 2.1,
        speed: 0.8 + i * 0.3,
        fallen: i === 0,
      };

      const points = getSkeletonPoints(person, time);


      ctx.save();
      ctx.filter = 'blur(12px)';
      ctx.fillStyle = `rgba(100, 120, 160, 0.25)`;
      ctx.beginPath();

      const headPt = points[0];
      const hipPt = points[8];
      ctx.ellipse(
        (headPt.x + hipPt.x) / 2,
        (headPt.y + hipPt.y) / 2,
        30 * person.scale,
        (hipPt.y - headPt.y) / 2 + 20,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();


      ctx.save();
      ctx.filter = 'blur(20px)';
      ctx.fillStyle = 'rgba(180, 160, 140, 0.5)';
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 18 * person.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();


      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      for (const [a, b] of LIMB_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(points[a].x, points[a].y);
        ctx.lineTo(points[b].x, points[b].y);
        ctx.stroke();
      }


      ctx.shadowBlur = 4;
      for (let j = 0; j < points.length; j++) {
        const pt = points[j];
        const radius = j === 0 ? 8 * person.scale : 3.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = j === 0 ? 'rgba(0,0,0,0.6)' : color;
        ctx.fill();
        if (j === 0) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;


      const confidence = (85 + Math.sin(time + i) * 10).toFixed(0);
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillText(`P${i + 1} ${confidence}%`, points[0].x - 12, points[0].y - 18 * person.scale - 5);
      ctx.globalAlpha = 1;
    }


    const scanY = (time * 80) % H;
    ctx.strokeStyle = 'rgba(108, 99, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(W, scanY);
    ctx.stroke();


    const now = new Date();
    const ts = now.toLocaleTimeString('en-US', { hour12: false });
    ctx.font = '600 11px "SF Mono", "Fira Code", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`REC ● ${ts}`, 12, 20);
    ctx.fillText(`AI: POSE ESTIMATION v3.2`, W - 190, 20);


    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(`⚡ ${incidentType}`, 12, H - 12);

  }, [priority, incidentType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();

    let startTime = performance.now();
    const animate = (now) => {
      const time = (now - startTime) / 1000;
      const rect = canvas.getBoundingClientRect();
      ctx.save();
      ctx.clearRect(0, 0, rect.width, rect.height);
      draw(ctx, { width: rect.width, height: rect.height }, time);
      ctx.restore();
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [draw]);

  return (
    <div className="privacy-video">
      <canvas ref={canvasRef} className="privacy-canvas" />
      <div className="privacy-badge">
        <span className="privacy-badge__dot">🛡️</span>
        PRIVACY MODE ACTIVE
      </div>
      <div className="privacy-tech">
        <span>FACE BLUR: ON</span>
        <span>PLATE BLUR: ON</span>
        <span>POSE EST: ON</span>
      </div>
    </div>
  );
}

export default PrivacyVideo;
