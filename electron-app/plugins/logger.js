// plugins/logger.js
module.exports = {
  onStart: () => console.log('[logger] Plugin started.'),
  onLog: (line) => {
    if (line.toLowerCase().includes('title')) {
      console.log('[logger] Title line:', line);
    }
    if (line.toLowerCase().includes('screenshot')) {
      console.log('[logger] Screenshot was saved.');
    }
  },
  onExit: () => console.log('[logger] Plugin completed.')
};
