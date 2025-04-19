#!/usr/bin/env node

const dgram = require('dgram');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process'); // !! used ONLY for checking if pactl is installed and creating a loopback sink !!
const { Transform } = require('stream');
const fft = require('fft-js').fft;
const fftUtil = require('fft-js').util;


function createDefaultEnv() {fs.writeFileSync(path.resolve(process.cwd(), 'settings.env'), `WLED_IP_ADDRESS='0.0.0.0'\nWLED_UDP_PORT=11988\nUSE_BROADCAST=true\nSAMPLE_RATE=44100\nCHUNK_SIZE=512`.trim(), { encoding: 'utf-8' });console.log(`Created a settings.env file in this directory. Broadcasting by default.`);dotenv.config({ path: path.resolve(process.cwd(), 'settings.env')})} // create settings env file
if (os.platform() !== 'linux') {console.error('This app can only run on Linux.');process.exit(1);} // check if we're on linux
try {execSync('which pactl', { stdio: 'ignore' });} catch (e) {console.error("Pulseaudio is not installed or pactl doesn't exist.");process.exit(1);} // check if pactl exists
if (!fs.existsSync(path.resolve(process.cwd(), 'settings.env'))) {createDefaultEnv();} else {dotenv.config({ path: path.resolve(process.cwd(), 'settings.env') });} // check if settings.env exists
if (!fs.existsSync(path.join(os.homedir(), '.wled-sound'))) {try {const getSource = execSync('pactl list short sources').toString().split('\n').find(line => line.includes('RUNNING'))?.split('\t')[1] || null; if (!getSource) throw 'Start playing some music before you run this.'; const out1 = execSync('pactl load-module module-pipe-sink sink_name=wled file=' + os.homedir() + '/.wled-sound format=s16le rate=44100 channels=1').toString().trim(); const out2 = execSync(`pactl load-module module-loopback source=${getSource} sink=wled`).toString().trim();fs.writeFileSync(os.homedir() + '/.wled-modules', `From WLED-MusicSync\n${out1}\n${out2}`);} catch (e) {console.error(e.message || e); process.exit(1);}} // check if .wled-sound exists and create it if not
if (process.argv.slice(2).includes("--uninstall")) {if (!fs.existsSync(`${os.homedir()}/.wled-modules`)) {console.error("Couldn't find the .wled-modules file. There's probably nothing to uninstall."); process.exit(1);} fs.readFileSync(`${os.homedir()}/.wled-modules`, 'utf8').split('\n').filter(Boolean).slice(1).forEach(id => {try {execSync(`pactl unload-module ${id}`);console.log(`Unloaded module ID ${id}`)} catch (e) {console.warn(`Failed to unload module ${id}:`, e.message); process.exit(1)}}); fs.unlinkSync(`${os.homedir()}/.wled-modules`); fs.unlinkSync(`./settings.env`); process.exit(1);} //uninstalling will unlink the modules and clean up after itself.

function processAudio(buffer) {
  if (buffer.length === 0) return null;

  const audio = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
  const rms = Math.sqrt(audio.reduce((sum, val) => sum + val * val, 0) / audio.length);
  const silenceThreshold = 100;
  const isSilent = rms < silenceThreshold;

  let fftValues = new Array(16).fill(0);
  let rawLevel = 0.0, peakLevel = 0, fftSum = 0.0, peakFreq = 0.0;

  if (!isSilent) {
    let normalized = Array.from(audio, x => Math.max(-1, Math.min(1, x / 32768)));
    const absNormalized = normalized.map(Math.abs);

    const targetLength = Math.pow(2, Math.ceil(Math.log2(normalized.length))); // ahh this is how to find the nearest power of 2.. if only they taught that in school
    if (normalized.length < targetLength) {
      const padding = new Array(targetLength - normalized.length).fill(0);
      normalized = normalized.concat(padding);
    } else if (normalized.length > targetLength) {
      normalized = normalized.slice(0, targetLength);
    }

    const fftResult = fft(normalized);
    const magnitudes = fftUtil.fftMag(fftResult);

    const maxMag = Math.max(...magnitudes);
    const normMagnitudes = magnitudes.map(m => (m / maxMag) * 255);
    fftValues = normMagnitudes.slice(0, 16).map(v => Math.floor(v));

    rawLevel = absNormalized.reduce((a, b) => a + b, 0) / absNormalized.length;
    peakLevel = Math.max(...absNormalized) * 255;
    fftSum = magnitudes.reduce((a, b) => a + b, 0);
    const peakIndex = magnitudes.indexOf(maxMag);
    peakFreq = peakIndex * (parseInt(process.env.SAMPLE_RATE) / normalized.length);
  }
  // this probably isn't perfectly protocol compliant but it works damn it!
  const header = Buffer.from('00002');
  const packet = Buffer.alloc(6 + 2 + 4 + 4 + 1 + 1 + 16 + 2 + 4 + 4);
  let offset = 0;
  header.copy(packet, offset); offset += 6;
  packet.writeUInt8(0, offset++);
  packet.writeUInt8(0, offset++);
  packet.writeFloatLE(rawLevel, offset); offset += 4;
  packet.writeFloatLE(rawLevel, offset); offset += 4;
  packet.writeUInt8(peakLevel, offset++);
  packet.writeUInt8(0, offset++);
  fftValues.forEach(val => packet.writeUInt8(val, offset++));
  packet.writeUInt8(0, offset++);
  packet.writeUInt8(0, offset++);
  packet.writeFloatLE(fftSum, offset); offset += 4;
  packet.writeFloatLE(peakFreq, offset);

  return packet;
}

const fifoPath = path.join(os.homedir(), '.wled-sound');
const audioStream = fs.createReadStream(fifoPath, { encoding: 'binary' });
let bufferAccumulator = Buffer.alloc(0);

audioStream.on('data', (data) => {
  bufferAccumulator = Buffer.concat([bufferAccumulator, Buffer.from(data, 'binary')]);

  while (bufferAccumulator.length >= parseInt(process.env.CHUNK_SIZE) * 2) {
    const chunk = bufferAccumulator.slice(0, parseInt(process.env.CHUNK_SIZE) * 2);
    bufferAccumulator = bufferAccumulator.slice(parseInt(process.env.CHUNK_SIZE) * 2);

    const packet = processAudio(chunk);
    if (packet) {
      const targetIP = process.env.USE_BROADCAST ? "255.255.255.255" : process.env.WLED_IP_ADDRESS;
      udpSocket.send(packet, 0, packet.length, parseInt(process.env.WLED_UDP_PORT), targetIP);
    }
  }
});

const udpSocket = dgram.createSocket('udp4');
if (process.env.USE_BROADCAST) {udpSocket.bind(() => {udpSocket.setBroadcast(true);});}

console.log(`Steaming to ${process.env.USE_BROADCAST ? '255.255.255.255' : process.env.WLED_IP_ADDRESS}:${parseInt(process.env.WLED_UDP_PORT)}`);

