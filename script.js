let ctx;
let canvas;
let gameLoop;

const barColor = { hex: "#009dff", timer: 0 };
const audioBarCount = 70;
const audioBars = [];

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 512;
const frequencyData = new Uint8Array(analyser.frequencyBinCount);

const audio = new Audio();
audio.src = "audio.mp3";
audio.crossOrigin = "anonymous";
audio.loop = true;
audio.load();

const sourceNode = audioContext.createMediaElementSource(audio);
sourceNode.connect(analyser);
analyser.connect(audioContext.destination);

audio.play().catch(() => {
    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "Click to play audio";
    resumeBtn.style.position = "fixed";
    resumeBtn.style.top = "20px";
    resumeBtn.style.left = "20px";
    document.body.appendChild(resumeBtn);
    resumeBtn.addEventListener("click", () => {
        audioContext.resume().then(() => {
            audio.play();
            resumeBtn.remove();
        });
    });
});

const logoImage = new Image();
logoImage.src = "logo.png";

window.onload = function () {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const minHeight = 200;
    const maxHeight = 300;

    for (let i = 0; i < audioBarCount; i++) {
        let width = 15;
        audioBars.push(new AudioBar(width, minHeight, maxHeight, i));
    }

    gameLoop = setInterval(step, 1000 / 60);
};

function step() {
    analyser.getByteFrequencyData(frequencyData);
    if (barColor.timer <= 0) {
        barColor.hex = rotateHexHue(barColor.hex, 1);
        barColor.timer = 6;
    }
    barColor.timer--;
    draw();
}

function draw() {
    ctx.fillStyle = "#222222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < audioBars.length; i++) {
        audioBars[i].draw();
    }

    ctx.fillStyle = "black";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 185, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "white";
    ctx.shadowBlur = 5;
    let imageWidth = 300;
    let imageHeight = imageWidth * 1.08952959029;
    ctx.drawImage(
        logoImage,
        canvas.width / 2 - imageWidth / 2,
        canvas.height / 2 - 170,
        imageWidth,
        imageHeight
    );
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
}

function AudioBar(width, minHeight, maxHeight, index) {
    this.index = index;
    this.width = width;
    this.minH = minHeight;
    this.maxH = maxHeight;
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.angle = (index / audioBarCount) * 360;

    this.draw = function () {
        const rawValue = frequencyData[this.index];
        const range = this.maxH - this.minH;
        const scaledH = this.minH + (rawValue / 255) * range;

        ctx.shadowColor = barColor.hex;
        ctx.shadowBlur = 10;
        ctx.save();
        ctx.fillStyle = barColor.hex;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.angle * Math.PI) / 180);
        ctx.fillRect(-this.width / 2, -scaledH, this.width, scaledH);
        ctx.restore();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
    };
}

function rotateHexHue(hex, deg = 1) {
    let fullHex = hex.replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`
    );
    fullHex = fullHex.replace(/^#/, "");
    const bigint = parseInt(fullHex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
    }
    h = (h + deg) % 360;
    if (h < 0) h += 360;
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);

    const toHex = (x) => {
        return Math.round(x * 255).toString(16).padStart(2, "0");
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
