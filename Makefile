build:
	rm -rf dist
	mkdir dist
	emcc --bind \
	-O3 \
	-Lffmpeg/lib \
	-Iffmpeg/include/ \
	-s EXTRA_EXPORTED_RUNTIME_METHODS="[FS, cwrap, ccall, getValue, setValue, writeAsciiToMemory]" \
	-lavcodec -lavformat -lavfilter -lavdevice -lswresample -lswscale -lavutil -lm -lx264 \
	-pthread \
	-lworkerfs.js \
	-o dist/DCCWASM.js \
	src/main.cpp \
	-s ASSERTIONS=1 \
	-s INITIAL_MEMORY=268435456