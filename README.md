# Discord Crasher Checker WASM

To compile this, you must have emscripten and make installed, compile x264 and ffmpeg using emscripten, then place the resulting libs and includes into a folder called ffmpeg/
when doing emconfigure, be sure to set the install path to a designated folder like /opt/ffmpeg, run emmake make install on both x264 first then ffmpeg itself, then copy the /opt/ffmpeg folder into this project.

I suspect most of the size of the WASM binary comes from the ffmpeg libraries.