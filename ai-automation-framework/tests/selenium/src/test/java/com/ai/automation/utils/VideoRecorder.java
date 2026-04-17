package com.ai.automation.utils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Thin wrapper that starts an ffmpeg screen recording and produces a .webm file.
 * Requires ffmpeg available on PATH. If not available, recording is skipped gracefully.
 */
public class VideoRecorder {
  private Process process;
  private File outputFile;
  private boolean recordingEnabled;

  public void start(String testName, boolean enableRecording) {
    // respect flag (used to only record the first test)
    recordingEnabled = enableRecording;
    if (!recordingEnabled) {
      return;
    }

    // Do nothing if already running
    if (process != null && process.isAlive()) {
      return;
    }

    try {
      Path outDir = Path.of("target", "videos");
      Files.createDirectories(outDir);

      String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
      outputFile = outDir.resolve(safeName(testName) + "_" + timestamp + ".webm").toFile();

      // Capture full desktop at modest frame rate to keep file size small.
      ProcessBuilder pb = new ProcessBuilder(
          "ffmpeg",
          "-y",                     // overwrite if exists
          "-f", "gdigrab",         // Windows desktop capture
          "-framerate", "10",
          "-i", "desktop",
          "-vcodec", "libvpx-vp9",
          "-pix_fmt", "yuv420p",
          outputFile.getAbsolutePath()
      );

      // Inherit stderr/stdout so user can see ffmpeg issues if needed.
      pb.redirectError(ProcessBuilder.Redirect.INHERIT);
      pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);

      pb.redirectInput(ProcessBuilder.Redirect.PIPE);

      process = pb.start();
    } catch (IOException e) {
      // ffmpeg not found or cannot start; ignore to keep tests running.
      process = null;
      outputFile = null;
    }
  }

  /**
   * Stops recording and returns the file if it exists and is non-empty.
   */
  public File stop() {
    if (process != null && process.isAlive()) {
      try {
        // ask ffmpeg to stop cleanly so it flushes the container
        process.getOutputStream().write('q');
        process.getOutputStream().flush();
      } catch (IOException ignored) {
      } finally {
        process.destroy();
      }

      try {
        process.waitFor();
      } catch (InterruptedException ignored) {
        Thread.currentThread().interrupt();
      }
    }

    if (outputFile != null && outputFile.isFile() && outputFile.length() > 0) {
      return outputFile;
    }
    return null;
  }

  private String safeName(String name) {
    return name == null ? "test" : name.replaceAll("[^A-Za-z0-9_-]", "_");
  }
}
