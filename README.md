# Discord Crasher Checker WASM

To compile this, you must have `emscripten`, `make` and `llvm` installed, with which you'll use to compile x264, ffmpeg and this project.

Create a folder where you'll build x264 and ffmpeg, then inside there create a folder called out

 For Windows users, beware you might have to run it like `emconfigure sh` instead of just `emconfigure`, you may also have to modify path so it includes the msys2 linux utilities. If you can't figure it out (I couldn't) just edit the `Makefile` for both x264 and ffmpeg after running `emconfigure` and just add (or whereever you installed msys2) `export PATH := C:/msys64/usr/bin;$(PATH)` somewhere on top.

Download the source of x264, cd into it, run 
```
 emconfigure ./configure --prefix="../out" --host=i686-gnu --enable-static --disable-cli --disable-asm --extra-cflags="-s USE_PTHREADS=1"
  ```  
 ```
 emmake make && emmake make install
```

cd back, download source of ffmpeg, cd into it, run (warning Windows users using msys2, the testing phase may lock up for you)
```
emconfigure ./configure --prefix="../out" --target-os=none --arch=x86_32 --enable-cross-compile --disable-debug --disable-x86asm --disable-inline-asm --disable-stripping --disable-programs --disable-doc --disable-all --enable-avcodec --enable-avformat --enable-avfilter   --enable-avdevice --enable-avutil --enable-swresample --enable-postproc --enable-swscale --enable-protocol=file --enable-decoder=h264,aac,pcm_s16le --enable-demuxer=mov,matroska --enable-muxer=mp4 --enable-gpl --enable-libx264 --extra-cflags="-s USE_PTHREADS=1 -O3 -I../out/include" --extra-cxxflags="-s USE_PTHREADS=1 -O3 -I../out/include" --extra-ldflags="-s USE_PTHREADS=1 -O3 -I../out/include -L../out/lib -s INITIAL_MEMORY=33554432" --nm="llvm-nm -g" --ar=emar --as=llvm-as --ranlib=llvm-ranlib --cc=emcc --cxx=em++ --objcc=emcc --dep-cc=emcc
```
```
emmake make -j4 && emmake make install
```

if everything compiled successfully, copy everything inside the `out` folder, create a new folder inside discord-crasher-checker called `ffmpeg` and paste it in there

then just run
```
make build
```
The resulting WASM binary and js files will be in the `dist` folder

I suspect most of the size of the WASM binary comes from the ffmpeg libraries.
