// Canvas негізіндегі кәсіби Бақыт Дөңгелегі (Колесо Фортуны)
import { sounds } from './audio.js';

export class FortuneWheel {
  constructor(canvasId, onSpinComplete) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onSpinComplete = onSpinComplete;

    this.mode = 'students'; // 'students' or 'topics'
    this.items = [];
    this.currentAngle = 0;
    this.isSpinning = false;
    this.spinSpeed = 0;
    this.spinDeceleration = 0.985;
    this.lastTickIndex = -1;

    this.flapperAngle = 0; // Pointer deflection
    this.lights = [];
    this.lightAnimOffset = 0;

    this.initCanvasSize();
    this.initLights();
    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.draw();
    });
  }

  initCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(rect.width || 480, 520);

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = size;
    this.height = size;
    this.centerX = size / 2;
    this.centerY = size / 2;
    this.radius = size / 2 - 24;
  }

  initLights() {
    const count = 28;
    this.lights = [];
    for (let i = 0; i < count; i++) {
      this.lights.push({
        angle: (i / count) * Math.PI * 2,
        color: i % 2 === 0 ? '#F59E0B' : '#FCD34D'
      });
    }
  }

  setItems(items, mode = 'students') {
    this.items = items;
    this.mode = mode;
    this.draw();
  }

  spin(targetIndex = null) {
    if (this.isSpinning || this.items.length === 0) return;

    sounds.init();
    sounds.playSpinStart();

    this.isSpinning = true;

    // Minimum 4 to 7 full rotations + extra random angle
    const sliceAngle = (Math.PI * 2) / this.items.length;
    let targetAngle;

    if (targetIndex !== null && targetIndex >= 0 && targetIndex < this.items.length) {
      // Point at 3*PI/2 (top: 270 deg or -90 deg)
      // Sector index center: targetIndex * sliceAngle + sliceAngle / 2
      const targetCenter = targetIndex * sliceAngle + sliceAngle / 2;
      const desiredFinalAngle = (Math.PI * 1.5 - targetCenter) % (Math.PI * 2);
      const rotations = (4 + Math.floor(Math.random() * 3)) * Math.PI * 2;
      targetAngle = this.currentAngle + rotations + ((desiredFinalAngle - (this.currentAngle % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2));
    } else {
      const minSpin = Math.PI * 2 * 5;
      const extraSpin = Math.random() * Math.PI * 2 * 3;
      targetAngle = this.currentAngle + minSpin + extraSpin;
    }

    const duration = 4500 + Math.random() * 1000;
    const startAngle = this.currentAngle;
    const deltaAngle = targetAngle - startAngle;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth custom easeOutCubic / easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 3.5);
      this.currentAngle = startAngle + deltaAngle * ease;

      // Check sector passing for tick sound & pointer bounce
      const normalizedAngle = (Math.PI * 1.5 - (this.currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const currentSector = Math.floor(normalizedAngle / sliceAngle) % this.items.length;

      if (currentSector !== this.lastTickIndex) {
        this.lastTickIndex = currentSector;
        sounds.playTick(500 + (progress * 150));
        this.flapperAngle = -20 * (1 - progress);
      } else {
        this.flapperAngle *= 0.85;
      }

      this.lightAnimOffset = (now / 100) % 28;
      this.draw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        this.flapperAngle = 0;
        this.draw();

        // Calculate winning item
        const finalNormalized = (Math.PI * 1.5 - (this.currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const winningIndex = Math.floor(finalNormalized / sliceAngle) % this.items.length;
        const winner = this.items[winningIndex];

        sounds.playWin();
        if (this.onSpinComplete) {
          this.onSpinComplete(winner, winningIndex);
        }
      }
    };

    requestAnimationFrame(animate);
  }

  draw() {
    const { ctx, width, height, centerX, centerY, radius, items, currentAngle } = this;
    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) return;

    const numSlices = items.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    // 1. Draw outer glowing border & rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 14, 0, Math.PI * 2);
    const rimGrad = ctx.createRadialGradient(centerX, centerY, radius - 5, centerX, centerY, radius + 15);
    rimGrad.addColorStop(0, '#D97706');
    rimGrad.addColorStop(0.5, '#FBBF24');
    rimGrad.addColorStop(0.8, '#92400E');
    rimGrad.addColorStop(1, '#1E1B4B');
    ctx.fillStyle = rimGrad;
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    // 2. Outer rim decorative lights
    this.lights.forEach((light, i) => {
      const angle = light.angle;
      const lx = centerX + Math.cos(angle) * (radius + 7);
      const ly = centerY + Math.sin(angle) * (radius + 7);
      const isActive = Math.floor((i + this.lightAnimOffset) % 2) === 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#FEF08A' : '#78350F';
      if (isActive) {
        ctx.shadowColor = '#FDE047';
        ctx.shadowBlur = 8;
      }
      ctx.fill();
      ctx.restore();
    });

    // 3. Draw wheel segments
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentAngle);

    for (let i = 0; i < numSlices; i++) {
      const item = items[i];
      const start = i * sliceAngle;
      const end = start + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();

      // Distinct background colors
      ctx.fillStyle = item.color || this.getColorForIndex(i, numSlices);
      ctx.fill();

      // Border between slices
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      // Segment inner subtle shadow/gradient
      const segGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
      segGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
      segGrad.addColorStop(0.8, 'rgba(0,0,0,0)');
      segGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = segGrad;
      ctx.fill();

      // Draw Item Text
      ctx.save();
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';

      const displayName = item.shortName || item.shortTitle || item.name || item.title || `Сектор ${i + 1}`;
      
      // Auto font sizing based on slice count
      let fontSize = numSlices > 12 ? 11 : numSlices > 6 ? 13 : 15;
      ctx.font = `600 ${fontSize}px 'Outfit', 'Inter', sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;

      // Truncate if long
      let text = displayName;
      if (text.length > 17) {
        text = text.slice(0, 15) + '...';
      }

      ctx.fillText(text, radius - 16, 0);

      // Draw little decorative peg at edge
      ctx.beginPath();
      ctx.arc(radius - 5, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FEF08A';
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();

    // 4. Center Gold Hub / Pin
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 36, 0, Math.PI * 2);
    const centerGrad = ctx.createRadialGradient(centerX - 8, centerY - 8, 2, centerX, centerY, 36);
    centerGrad.addColorStop(0, '#FEF08A');
    centerGrad.addColorStop(0.5, '#F59E0B');
    centerGrad.addColorStop(1, '#78350F');
    ctx.fillStyle = centerGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FDE68A';
    ctx.stroke();

    // Center icon or star
    ctx.fillStyle = '#1E1B4B';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', centerX, centerY);
    ctx.restore();

    // 5. Top Pointer / Flapper (at top center: centerX, centerY - radius)
    ctx.save();
    ctx.translate(centerX, centerY - radius + 3);
    ctx.rotate((this.flapperAngle * Math.PI) / 180);

    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(-14, -14);
    ctx.lineTo(14, -14);
    ctx.closePath();

    const pointerGrad = ctx.createLinearGradient(-14, -14, 14, 22);
    pointerGrad.addColorStop(0, '#EF4444');
    pointerGrad.addColorStop(0.7, '#DC2626');
    pointerGrad.addColorStop(1, '#991B1B');
    ctx.fillStyle = pointerGrad;
    ctx.shadowColor = '#DC2626';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Pointer pivot pin
    ctx.beginPath();
    ctx.arc(0, -8, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FEF08A';
    ctx.fill();

    ctx.restore();
  }

  getColorForIndex(index, total) {
    const palette = [
      '#EF4444', '#F97316', '#F59E0B', '#10B981',
      '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
      '#EC4899', '#14B8A6', '#84CC16', '#A855F7',
      '#0EA5E9', '#D946EF', '#EAB308', '#F43F5E'
    ];
    return palette[index % palette.length];
  }
}
