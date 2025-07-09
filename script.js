// OLD FUNCTIONALITY: 8x8 Grid Box Controls (Unchanged)
const boxes = document.querySelectorAll(".soundBox .sound");
const audios = document.querySelectorAll("audio");
const stopButtons = document.querySelectorAll(".stop");
const muteButtons = document.querySelectorAll(".mute");

const keyMap = [
    "1", "2", "3", "4", "5", "6", "7", "8",
    "q", "w", "e", "r", "t", "y", "u", "i",
    "a", "s", "d", "f", "g", "h", "j", "k",
    "z", "x", "c", "v", "b", "n", "m", ",",
    "!", "@", "#", "$", "%", "^", "&", "*",
    "Q", "W", "E", "R", "T", "Y", "U", "I",
    "A", "S", "D", "F", "G", "H", "J", "K",
    "Z", "X", "C", "V", "B", "N", "M", "<"
];

const playingAudio = {};
const activeBoxes = {};

function getColumnIndex(box) {
    const index = Array.from(box.parentNode.children).indexOf(box);
    return index % 8;
}

function resetBox(box) {
    if (box) {
        box.style.backgroundColor = "";
    }
}

boxes.forEach(box => {
    const column = getColumnIndex(box);
    const audioIndex = (column + 1);
    const rowIndex = Math.floor(Array.from(box.parentNode.children).indexOf(box) / 8) + 1;
    const audioId = `audio${audioIndex}_${rowIndex}`;
    const audio = document.getElementById(audioId);

    if (!audio) return;

    audio.onended = () => {
        if (activeBoxes[column] === box) {
            resetBox(box);
            playingAudio[column] = null;
            activeBoxes[column] = null;
        }
    };

    box.addEventListener("click", () => {
        if (box.classList.contains("stop") || box.classList.contains("mute")) return;

        if (activeBoxes[column] === box) {
            playingAudio[column].pause();
            playingAudio[column].currentTime = 0;
            resetBox(box);
            playingAudio[column] = null;
            activeBoxes[column] = null;
            return;
        }

        if (playingAudio[column]) {
            playingAudio[column].pause();
            playingAudio[column].currentTime = 0;
        }
        if (activeBoxes[column]) {
            resetBox(activeBoxes[column]);
        }

        audio.play();
        playingAudio[column] = audio;
        activeBoxes[column] = box;
        box.style.backgroundColor = "#7f5af0";
    });
});

stopButtons.forEach((stopBtn, index) => {
    stopBtn.addEventListener("click", () => {
        const column = index;

        if (playingAudio[column]) {
            playingAudio[column].pause();
            playingAudio[column].currentTime = 0;
            playingAudio[column] = null;
        }

        if (activeBoxes[column]) {
            resetBox(activeBoxes[column]);
            activeBoxes[column] = null;
        }
    });
});

muteButtons.forEach((muteBtn, index) => {
    muteBtn.addEventListener("click", () => {
        const column = index;

        if (playingAudio[column]) {
            playingAudio[column].muted = !playingAudio[column].muted;
            muteBtn.style.backgroundColor = playingAudio[column].muted ? "#ffcc00" : "";
        }
    });
});

document.addEventListener("keydown", (e) => {
    const key = e.key;
    const index = keyMap.indexOf(key);

    if (index !== -1 && boxes[index]) {
        boxes[index].click();
    }
});

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const destination = audioContext.createMediaStreamDestination();
let recorder;
let mp3Encoder;
let mp3Data = [];
let isRecording = false;
let recordingTimer;
let secondsElapsed = 0;

const recordBtn = document.getElementById('recordBtn');
const recordingTimerEl = document.getElementById('recordingTimer');

recordBtn.addEventListener('click', () => {
    if (!isRecording) {
        const stream = destination.stream;
        const input = audioContext.createMediaStreamSource(stream);
        const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);

        mp3Encoder = new lamejs.Mp3Encoder(1, audioContext.sampleRate, 128);
        mp3Data = [];

        scriptNode.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const samples = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                samples[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32767));
            }
            const mp3buf = mp3Encoder.encodeBuffer(samples);
            if (mp3buf.length > 0) {
                mp3Data.push(new Int8Array(mp3buf));
            }
        };

        input.connect(scriptNode);
        scriptNode.connect(audioContext.destination); // Optional: So you can still hear during record

        isRecording = true;
        recordBtn.textContent = "⏹️ Stop Recording";
        recordBtn.classList.add("recording");

        // Timer
        secondsElapsed = 0;
        recordingTimerEl.textContent = "Recording: 0s";
        recordingTimer = setInterval(() => {
            secondsElapsed++;
            recordingTimerEl.textContent = `Recording: ${secondsElapsed}s`;
        }, 1000);

        // Stop handler
        recordBtn.onclick = () => {
            if (!isRecording) return;

            clearInterval(recordingTimer);
            recordingTimerEl.textContent = '';
            scriptNode.disconnect();

            const mp3buf = mp3Encoder.flush();
            if (mp3buf.length > 0) {
                mp3Data.push(new Int8Array(mp3buf));
            }

            const blob = new Blob(mp3Data, { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `recording_${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            isRecording = false;
            recordBtn.textContent = "🎙️ Start Recording";
            recordBtn.classList.remove("recording");
            recordBtn.onclick = startRecording; // Rebind original click
        };
    }
});

function startRecording() {
    recordBtn.click();
}




function playSound(url) {
    fetch(url)
        .then(res => res.arrayBuffer())
        .then(buffer => audioContext.decodeAudioData(buffer))
        .then(decoded => {
            const source = audioContext.createBufferSource();
            source.buffer = decoded;

            const gain = audioContext.createGain();
            source.connect(gain);
            gain.connect(audioContext.destination);    // So you can hear it
            gain.connect(destination);                // So it’s recorded
            source.start(0);
        });
}