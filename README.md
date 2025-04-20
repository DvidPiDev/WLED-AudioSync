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
By default, AudioSync will broadcast to every device on the network on port 11988. There is an env file at ~/.audiosync.env.
| Option          | Default | Description                                                                                                                                                                                                            |
|-----------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| WLED_IP_ADDRESS | 0.0.0.0 | The IP of your WLED device. Ignored if broadcast is turned on.                                                                                                                                                         |
| WLED_UDP_PORT   | 11988   | The AR receive port. 11988 by default.                                                                                                                                                                                 |
| USE_BROADCAST   | false   | Send FFT data to every WLED device on the network. Useful for large installs with several devices, useless for one device. May not work (properly) on some routers.                                                    |
| SAMPLE_RATE     | 44100   | 44100 or 88200, the visual difference is basically nonexistent.                                                                                                                                                        |
| CHUNK_SIZE      | 512     | How many bytes of sound data should the script take before processing and sending it off to WLED. 128-16384 is usually fine, the lower this value is, the faster it'll respond to sound changes. MUST be a power of 2. |

### Troubleshooting and FAQ
TBD - probably very soon as I myself am flattered with how well this works.
