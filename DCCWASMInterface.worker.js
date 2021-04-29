onmessage = ({ data: [file, id] }) => {
    const path = `/work-${id}`;
    try {
        if (!FS.analyzePath(path).exists) FS.mkdir(path);
        FS.mount(WORKERFS, { files: [file] }, path);
        const frames = Module.isSafe(`${path}/${file.name}`);

        postMessage({
            ret: frames,
            isSafe: frames === 0,
            id
        });
    } catch (err) {
        postMessage({
            ret: -4,
            isSafe: false,
            id
        });
    } finally {
        try {
            FS.unmount(path);
        } catch { };
    }
}

self.importScripts('https://1lighty.github.io/discord-crasher-checker/DCCWASM.js');
