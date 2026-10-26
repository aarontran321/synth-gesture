const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const DEGREE_RGB = {
  1: [1, 85, 154],
  2: [32, 110, 176],
  3: [70, 136, 196],
  4: [10, 78, 150],
  5: [8, 40, 112],
  6: [96, 150, 206],
  7: [140, 180, 220],
};

export function coverRect(srcW, srcH, dstW, dstH) {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  if (srcRatio > dstRatio) {
    const sHeight = srcH;
    const sWidth = srcH * dstRatio;
    return { sx: (srcW - sWidth) / 2, sy: 0, sWidth, sHeight };
  }
  const sWidth = srcW;
  const sHeight = srcW / dstRatio;
  return { sx: 0, sy: (srcH - sHeight) / 2, sWidth, sHeight };
}

export function renderScene(ctx, view, video, hands, energy) {
  const { width, height } = view;
  if (width < 2 || height < 2) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f7fbfe";
  ctx.fillRect(0, 0, width, height);

  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (srcW && srcH) {
    const crop = coverRect(srcW, srcH, width, height);
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, width, height);
    ctx.fillStyle = "rgba(194, 215, 232, 0.08)";
    ctx.fillRect(0, 0, width, height);
    for (const hand of hands) drawHand(ctx, hand.landmarks, crop, srcW, srcH, width, height);
    ctx.restore();
  }

  drawRibbons(ctx, width, height, energy);
}

function project(point, crop, srcW, srcH, width, height) {
  const px = point.x * srcW;
  const py = point.y * srcH;
  return {
    x: ((px - crop.sx) / crop.sWidth) * width,
    y: ((py - crop.sy) / crop.sHeight) * height,
  };
}

function drawHand(ctx, landmarks, crop, srcW, srcH, width, height) {
  const points = landmarks.map((point) => project(point, crop, srcW, srcH, width, height));
  const trace = () => {
    for (const [from, to] of BONES) {
      ctx.moveTo(points[from].x, points[from].y);
      ctx.lineTo(points[to].x, points[to].y);
    }
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  trace();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  trace();
  ctx.strokeStyle = "#161616";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  for (const point of points) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#161616";
    ctx.stroke();
  }
  ctx.restore();
}

function drawRibbons(ctx, width, height, energy) {
  const fingers = energy?.fingers ?? 0;
  const degree = energy?.degree ?? 0;
  if (fingers < 1 || !DEGREE_RGB[degree]) return;

  const [r, g, b] = DEGREE_RGB[degree];
  const alpha = energy.major ? 0.92 : 0.58;
  const volume = energy.volume ?? 0;
  const chaos = ((energy.tilt ?? 0) + 1) / 2;
  const shakiness = chaos * 16;
  const wobble = 0.045 + chaos * 0.12;
  const thickness = 1.6 + volume * 7;
  const time = performance.now() * 0.004;
  const centerY = height - 72;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, height - 150, width, 150);
  ctx.clip();
  ctx.shadowBlur = 8 + volume * 14;
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.45 * alpha})`;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let line = 0; line < fingers; line += 1) {
    const y0 = centerY + (line - (fingers - 1) / 2) * 11;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const wave = Math.sin(x * 0.008 + time + line * 0.55) * 13;
      const jitter = (Math.random() - 0.5) * shakiness * Math.sin(x * wobble + time);
      const y = y0 + wave + jitter;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.lineWidth = Math.max(1.25, thickness - line * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}
