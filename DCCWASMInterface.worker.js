onmessage = ({ data: [file, id] }) => {
    if (!FS.analyzePath('/work').exists) FS.mkdir('/work');
    FS.mount(WORKERFS, { files: [file] }, '/work');
    const frames = Module.isSafe('/work/' + file.name);

    data = {
        ret: frames,
        isSafe: frames === 0,
        id
    };
    postMessage(data);

    // Cleanup mount.
    FS.unmount('/work');
}

self.importScripts('https://1lighty.github.io/discord-crasher-checker/DCCWASM.js');
