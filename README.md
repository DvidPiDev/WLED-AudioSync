# WLED AudioSync
The simplest method of syncing Linux audio to WLED devices.

> [!IMPORTANT]
> This script is **Linux only** and will NOT work on Windows or Mac.

### Fastest install 
Simply grab the latest executable from the [releases](https://github.com/DvidPiDev/WLED-AudioSync/releases) page, play a song and run the executable! \
To keep it running even in the background you can use `tmux` or `screen`.

Keep in mind you need Pulseaudio and a WLED device with AR receive enabled.

### Fastest uninstall
Again, simply run the executable with an `--uninstall` argument and delete the executable itself.

### Configuration
By default, AudioSync will broadcast to every device on the network on port 11988. There is an env file at ~/.audiosync.env which you can edit to customize a few otpions.
| Option          | Default | Description                                                                                                                                                                                                            |
|-----------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| WLED_IP_ADDRESS | 0.0.0.0 | The IP of your WLED device. Ignored if broadcast is turned on.                                                                                                                                                         |
| WLED_UDP_PORT   | 11988   | The AR receive port. 11988 by default.                                                                                                                                                                                 |
| USE_BROADCAST   | false   | Send FFT data to every WLED device on the network. Useful for large installs with several devices, useless for one device. May not work (properly) on some routers.                                                    |
| SAMPLE_RATE     | 44100   | 44100 or 88200, the visual difference is basically nonexistent.                                                                                                                                                        |
| CHUNK_SIZE      | 512     | How many bytes of sound data should the script take before processing and sending it off to WLED. 128-16384 is usually fine, the lower this value is, the faster it'll respond to sound changes. MUST be a power of 2. |

### Troubleshooting and FAQ
- **Q:** Can this work with XYZ audio server? \
  **A:** It's possible. Audiosync checks if you have Pulseaudio installed by running `which pactl`. If that's successful, then it creates a FIFO loopback file at ~/.audiosync. If you can trick into thinking pactl is available (or you modify the script to not care about it) and you create the .audiosync file manually, this will work. The two commands which are used to create the .audiosync file are: `pactl load-module module-pipe-sink sink_name=wled file=~/.audiosync format=s16le rate=44100 channels=1`, `pactl load-module module-loopback source=<DEVICE> sink=wled`. Remember to replace the <DEVICE> part of the second command with the name of your monitor (including the .monitor suffix).

  That being said, it's easier to just use Pulseaudio and let the app figure everything out on its own. Your distro probably already has a Pulseaudio plugin installed alongside the primary audio server.

- **Q:** What is the point of this project, considering there's lots of other FOSS options available? \
  **A:** I do acknowledge that there's more options available, however not all work equally. [WLED SR Server](https://github.com/Victoare/SR-WLED-audio-server-win), which has a neat UI, is limited to Windows. Another option being [feed_my_wled](https://github.com/chrisgott/feed_my_wled), which is almost identical to my project (omitting the automatic setup), works on Linux and Mac, albeit I had lots of trouble setting it up, from a 1 second delay in sound to all FFT values being at 100% when nothing was playing. There's a myriad of other options (including [LedFX](https://github.com/ledfx/ledfx), [xLights](https://github.com/xLightsSequencer/xLights), etc.) however they all have their quirks. By no means do I say that my software is the best, since that can be disproven really fast. (Almost as fast as the time to set audiosync up 😎)


- **Issue:** "Play something first" even though I'm already playing sound. \
  **A:** This is because audiosync can't detect a monitor marked "RUNNING" by Pulseaudio. Keep playing any sound and run this command in a terminal: `pactl list short sources`. If you can't find a single line which says "RUNNING", Pulseaudio itself is the issue. You might have to manually set up the FIFO file with the commands described in question 1.


- **Issue:** Audiosync says it's streaming / broadcasting, however nothing is showing up on my WLED device(s). \
  **A:** Make sure you have AudioReactive receiving enabled and that you're playing an AudioReactive effect. AR effects have a single or double note next to their name. To enable AR receiving, follow these steps: ![Enable AR receiving](https://raw.githubusercontent.com/DvidPiDev/WLED-AudioSync/refs/heads/main/assets/enable_receive.jpg)

- **Issue:** Broadcasting causes one device to be in sync and the rest to be about 1 second behind. \
  **A:** I'm aware of this issue and have no quick fix for this available yet. 
