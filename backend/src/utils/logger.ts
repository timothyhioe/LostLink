/* eslint-disable no-console */
export const logger = {
  info: (message: string, ...optionalParams: unknown[]): void => {
    console.log(`[INFO] ${message}`, ...optionalParams);
  },
  warn: (message: string, ...optionalParams: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...optionalParams);
  },
  error: (message: string, ...optionalParams: unknown[]): void => {
    console.error(`[ERROR] ${message}`, ...optionalParams);
  }
};

