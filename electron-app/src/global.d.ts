// global.d.ts

// By declaring this interface, we are telling TypeScript that we expect
// an object named 'electronAPI' to exist on the global 'window' object.
export interface IElectronAPI {
  /**
   * Sends a command object to the main process to be executed by the Rust engine.
   * @param data The command payload to send.
   * @returns A promise that resolves with a string response from the main process.
   */
  runCommand: (data: { [key: string]: any }) => Promise<string>;

  /**
   * Registers a callback function to listen for log messages from the main process.
   * @param callback The function to be called with each log message.
   * @returns void
   */
  onLog: (callback: (message: string) => void) => void;
}

// This declares that the global 'Window' object will have a property
// 'electronAPI' of the type 'IElectronAPI' we defined above.
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
