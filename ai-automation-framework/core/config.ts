import path from 'path';

export const Config = {
  TIMEOUT: 30000,
  BASE_DIR: path.resolve(__dirname, '..'),
  OUTPUT_DIR: path.resolve(__dirname, '..', 'output'),
  REPORTS_DIR: path.resolve(__dirname, '..', 'reports'),
  SCREENSHOTS_DIR: path.resolve(__dirname, '..', 'reports', 'screenshots'),
  VIDEOS_DIR: path.resolve(__dirname, '..', 'reports', 'videos'),
};
