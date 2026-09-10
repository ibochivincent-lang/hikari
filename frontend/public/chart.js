// frontend/public/chart.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Lightweight Canvas charting engine for Hikari NAV & Yield analytics styled with TemplateMo Crypto Vault copper palette.

class HikariYieldChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.timeframe = "30D";

    this.initData();
    this.setupResize();
    this.setupThemeWatcher();
    this.render();
  }

  initData() {
    this.datasets = {
      "1D": [
        { label: "00:00", nav: 1.0421, apy: 7.2 },
        { label: "04:00", nav: 1.0423, apy: 7.2 },
        { label: "08:00", nav: 1.0424, apy: 7.3 },
        { label: "12:00", nav: 1.0426, apy: 7.4 },
        { label: "16:00", nav: 1.0427, apy: 7.4 },
        { label: "20:00", nav: 1.0428, apy: 7.4 },
      ],
      "1W": [
        { label: "Mon", nav: 1.0375, apy: 6.8 },
        { label: "Tue", nav: 1.0384, apy: 6.9 },
        { label: "Wed", nav: 1.0395, apy: 7.1 },
        { label: "Thu", nav: 1.0402, apy: 7.0 },
        { label: "Fri", nav: 1.0411, apy: 7.2 },
        { label: "Sat", nav: 1.0420, apy: 7.3 },
        { label: "Sun", nav: 1.0428, apy: 7.4 },
      ],
      "1M": [
        { label: "Week 1", nav: 1.0120, apy: 6.2 },
        { label: "Week 2", nav: 1.0215, apy: 6.5 },
        { label: "Week 3", nav: 1.0310, apy: 6.9 },
        { label: "Week 4", nav: 1.0428, apy: 7.4 },
      ],
      "1Y": [
        { label: "Q1", nav: 1.0000, apy: 5.8 },
        { label: "Q2", nav: 1.0150, apy: 6.4 },
        { label: "Q3", nav: 1.0290, apy: 7.0 },
        { label: "Q4", nav: 1.0428, apy: 7.4 },
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

  setupThemeWatcher() {
    const observer = new MutationObserver(() => {
      this.render();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  render() {
    if (!this.canvas || !this.ctx) return;

    // Handle high DPI displays
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";

    this.canvas.width = (rect.width || 700) * dpr;
    this.canvas.height = (rect.height || 220) * dpr;
    this.ctx.scale(dpr, dpr);

    const width = rect.width || 700;
    const height = rect.height || 220;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    const data = this.datasets[this.timeframe] || this.datasets["1M"];
    const padding = { top: 25, right: 25, bottom: 35, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minNav = 0.995;
    const maxNav = 1.055;

    // 1. Draw horizontal gridlines
    ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.font = "11px 'Instrument Sans', sans-serif";
    ctx.fillStyle = isLight ? "rgba(110, 110, 110, 0.85)" : "rgba(168, 168, 168, 0.75)";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
      const yVal = minNav + ((maxNav - minNav) * i) / 4;
      const yPos = padding.top + chartH - (i * chartH) / 4;

      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + chartW, yPos);
      ctx.stroke();

      ctx.fillText(`${yVal.toFixed(3)} XLM`, padding.left - 8, yPos + 4);
    }

    // 2. Draw NAV curve points
    const points = data.map((d, idx) => {
      const x = padding.left + (idx * chartW) / (data.length - 1);
      const y = padding.top + chartH - ((d.nav - minNav) / (maxNav - minNav)) * chartH;
      return { x, y, label: d.label, nav: d.nav };
    });

    // Fill area under curve with copper gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, isLight ? "rgba(212, 148, 90, 0.40)" : "rgba(184, 115, 51, 0.45)");
    gradient.addColorStop(0.6, isLight ? "rgba(232, 184, 138, 0.15)" : "rgba(201, 132, 90, 0.15)");
    gradient.addColorStop(1, "rgba(184, 115, 51, 0.0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke curve in copper/bronze
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = isLight ? "#d4945a" : "#c9845a";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Draw points & X-axis labels
    ctx.textAlign = "center";
    points.forEach((p) => {
      // Glow dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#b87333";
      ctx.fill();
      ctx.strokeStyle = isLight ? "#ffffff" : "#1c1c1e";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label below
      ctx.fillStyle = isLight ? "rgba(110, 110, 110, 0.85)" : "rgba(168, 168, 168, 0.8)";
      ctx.fillText(p.label, p.x, height - 10);
    });
  }
}

window.HikariYieldChart = HikariYieldChart;
