export const Logger = {
  info: (agent: string, message: string) => {
    console.log(`[INFO] [${agent}] ${message}`);
  },
  warn: (agent: string, message: string) => {
    console.warn(`[WARN] [${agent}] ${message}`);
  },
  error: (agent: string, message: string, error?: any) => {
    console.error(`[ERROR] [${agent}] ${message}`, error || '');
  },
  step: (agent: string, message: string) => {
    console.log(`> [${agent}] ${message}`);
  }
};
