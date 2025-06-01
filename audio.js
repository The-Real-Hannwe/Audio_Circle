// 1) Set up AudioContext + AnalyserNode:
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 512; // 512 → frequencyBinCount = 256
const frequencyData = new Uint8Array(analyser.frequencyBinCount);

// 2) Load & play an audio file:
const audio = new Audio();
audio.src = 'audio.mp3';            // ← change this path if needed
audio.crossOrigin = 'anonymous';
audio.loop = true;                  // ← remove or set to false if you don't want looping
audio.load();

const sourceNode = audioContext.createMediaElementSource(audio);
sourceNode.connect(analyser);
analyser.connect(audioContext.destination);

// Start playback once the user interacts (or automatically if you’re okay with autoplay):
// If you run into “Autoplay” restrictions, you might need to call `audioContext.resume()` inside a user‐click.
// Here, we’ll try to start immediately:
audio.play().catch(() => {
    // If autoplay is blocked, wait for user gesture:
    const resumeBtn = document.createElement('button');
    resumeBtn.textContent = 'Click to play audio';
    resumeBtn.style.position = 'fixed';
    resumeBtn.style.top = '20px';
    resumeBtn.style.left = '20px';
    document.body.appendChild(resumeBtn);
    resumeBtn.addEventListener('click', () => {
        audioContext.resume().then(() => {
            audio.play();
            resumeBtn.remove();
        });
    });
});

// 3) Monkey-patch `step()` so we pull fresh frequency data each frame:
if (typeof step === 'function') {
    const originalStep = step;
    window.step = function () {
        analyser.getByteFrequencyData(frequencyData);
        originalStep();
    };
} else {
    console.warn('audio.js: could not find global step(), so frequencyData will not update automatically.');
}

// 4) Override `AudioBar.prototype.draw` so each bar reads from frequencyData:
if (typeof AudioBar === 'function') {
    AudioBar.prototype.draw = function () {
        // Each AudioBar has an index = 0..23 (from original constructor argument)
        // But `frequencyData` is length 256; we map bar i → roughly the ith chunk of the lower half spectrum.
        // To keep it simple, we’ll take the first 24 bins directly (lowest frequencies).
        const raw = frequencyData[this.index];       // 0..255
        // Scale it so that max height ≈ 200px (or whatever feels good)
        const scaledHeight = (raw / 255) * 200;      // adjust 200 if you want taller bars

        ctx.shadowColor = barColor;
        ctx.shadowBlur = 10;
        ctx.save();
        ctx.fillStyle = barColor;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);
        // Draw rectangle with height = scaledHeight:
        ctx.fillRect(-this.width / 2, -scaledHeight, this.width, scaledHeight);
        ctx.restore();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    };
} else {
    console.warn('audio.js: could not find AudioBar constructor; bar–frequency mapping will not work.');
}