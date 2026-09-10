// frontend/public/chart.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Lightweight Canvas charting engine for Hikari NAV & Yield analytics

class HikariYieldChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.timeframe = "30D";

    this.initData();
    this.setupResize();
    this.render();
  }

  initData() {
    this.datasets = {
      "7D": [
        { label: "Day 1", nav: 1.0375, apy: 6.8 },
        { label: "Day 2", nav: 1.0384, apy: 6.9 },
        { label: "Day 3", nav: 1.0395, apy: 7.1 },
        { label: "Day 4", nav: 1.0402, apy: 7.0 },
        { label: "Day 5", nav: 1.0411, apy: 7.2 },
        { label: "Day 6", nav: 1.0420, apy: 7.3 },
        { label: "Day 7", nav: 1.0428, apy: 7.4 },
      ],
      "30D": [
        { label: "W1", nav: 1.0120, apy: 6.2 },
        { label: "W2", nav: 1.0215, apy: 6.5 },
        { label: "W3", nav: 1.0310, apy: 6.9 },
        { label: "W4", nav: 1.0428, apy: 7.4 },
      ],
      "90D": [
        { label: "M1", nav: 1.0000, apy: 5.8 },
        { label: "M2", nav: 1.0210, apy: 6.6 },
        { label: "M3", nav: 1.0428, apy: 7.4 },
      ],
    };
  }

  setTimeframe(tf) {
    if (this.datasets[tf]) {
      this.timeframe = tf;
      this.render();
    }
  }

  setupResize() {
    window.addEventListener("resize", () => {
      this.render();
    });
  }

  render() {
    if (!this.canvas || !this.ctx) return;

    // Handle high DPI displays
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = (rect.height || 220) * dpr;
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height || 220;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    const data = this.datasets[this.timeframe] || this.datasets["30D"];
    const padding = { top: 25, right: 25, bottom: 35, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minNav = 0.995;
    const maxNav = 1.055;

    // 1. Draw horizontal gridlines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
      const yVal = minNav + ((maxNav - minNav) * i) / 4;
      const yPos = padding.top + chartH - (i * chartH) / 4;

      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + chartW, yPos);
      ctx.stroke();

      ctx.fillText(`${yVal.toFixed(3)} XLM`, padding.left - 8, yPos + 3);
    }

    // 2. Draw NAV curve
    const points = data.map((d, idx) => {
      const x = padding.left + (idx * chartW) / (data.length - 1);
      const y = padding.top + chartH - ((d.nav - minNav) / (maxNav - minNav)) * chartH;
      return { x, y, label: d.label, nav: d.nav };
    });

    // Fill area under curve with neon gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, "rgba(56, 189, 248, 0.35)");
    gradient.addColorStop(0.6, "rgba(129, 140, 248, 0.15)");
    gradient.addColorStop(1, "rgba(56, 189, 248, 0.0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke curve
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Draw points & X-axis labels
    ctx.textAlign = "center";
    points.forEach((p) => {
      // Glow dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
      ctx.strokeStyle = "#0a0d14";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label below
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.fillText(p.label, p.x, height - 12);
    });
  }
}

window.HikariYieldChart = HikariYieldChart;
