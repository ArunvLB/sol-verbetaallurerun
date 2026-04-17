package com.ai.automation.utils;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;

public class WebDriverFactory {
  public static WebDriver create() {
    Path localDriver = resolveChromeDriverPath();
    if (localDriver != null) {
      System.setProperty("webdriver.chrome.driver", localDriver.toAbsolutePath().toString());
    } else {
      try {
        Path cacheDir = Path.of("target", "wdm-cache");
        Files.createDirectories(cacheDir);
        Path resCache = cacheDir.resolve("resolution.properties");
        if (!Files.exists(resCache)) {
          Files.createFile(resCache);
        }
        System.setProperty("wdm.resolutionCachePath", resCache.toString());
        var wdm = WebDriverManager.chromedriver()
            .cachePath(cacheDir.toString());
        
        // Use hardcoded version only on Windows if needed, otherwise let it be dynamic for CI
        if (isWindows()) {
          wdm.avoidBrowserDetection().driverVersion("146.0.0");
        }
        
        wdm.setup();
      } catch (Exception e) {
        throw new IllegalStateException(
            "No local chromedriver found and WebDriverManager could not download one. "
                + "Ensure Chrome is installed and internet connection is available.",
            e);
      }
    }
    ChromeOptions options = new ChromeOptions();
    Path chromeBinary = resolveChromeBinaryPath();
    if (chromeBinary != null) {
      options.setBinary(chromeBinary.toString());
    }

    Path profileDir = prepareChromeProfileDir();
    options.addArguments(
        "--headless=new",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--window-size=1366,768",
        "--remote-allow-origins=*",
        "--remote-debugging-port=9222",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-breakpad",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-popup-blocking",
        "--disable-notifications",
        "--disable-background-networking",
        "--disable-features=OptimizationGuideModelDownloading,OptimizationHintsFetching,OptimizationTargetPrediction,MediaRouter,RendererCodeIntegrity",
        "--user-data-dir=" + profileDir.toAbsolutePath()
    );
    return new ChromeDriver(options);
  }

  public static byte[] takeScreenshot(WebDriver driver, String nameHint) {
    if (!(driver instanceof TakesScreenshot ts)) {
      return new byte[0];
    }
    try {
      var rawFile = ts.getScreenshotAs(OutputType.FILE);
      Path dir = Path.of("target", "screenshots");
      Files.createDirectories(dir);
      String fileName = (nameHint == null ? "screenshot" : nameHint.replaceAll("[^A-Za-z0-9_-]", "_"))
          + "_" + System.currentTimeMillis() + ".png";
      Path dest = dir.resolve(fileName);
      Files.copy(rawFile.toPath(), dest, StandardCopyOption.REPLACE_EXISTING);
      return Files.readAllBytes(dest);
    } catch (Exception e) {
      return new byte[0];
    }
  }

  private static Path resolveChromeDriverPath() {
    String envPath = System.getenv("CHROMEDRIVER_PATH");
    if (envPath != null && !envPath.isBlank()) {
      Path path = Path.of(envPath);
      if (Files.exists(path)) {
        return path;
      }
    }

    List<Path> candidates = List.of(
        Path.of("drivers", "chromedriver.exe"),
        Path.of("tests", "selenium", "drivers", "chromedriver.exe"),
        Path.of(".m2repo", "wdm-cache", "chromedriver", "win64", "146.0.7680.165", "chromedriver.exe"),
        Path.of(".m2repo", "wdm-cache", "chromedriver", "win64", "147.0.7727.24", "chromedriver.exe")
    );

    for (Path candidate : candidates) {
      if (Files.exists(candidate)) {
        return candidate;
      }
    }

    // On Linux, check if chromedriver is in PATH
    if (!isWindows()) {
       try {
           Process process = new ProcessBuilder("which", "chromedriver").start();
           if (process.waitFor() == 0) {
               return null; // Let Selenium find it in PATH or via WebDriverManager
           }
       } catch (Exception ignored) {}
    }

    return null;
  }

  private static Path resolveChromeBinaryPath() {
    String envPath = System.getenv("CHROME_BINARY_PATH");
    if (envPath != null && !envPath.isBlank()) {
      Path path = Path.of(envPath);
      if (Files.exists(path)) {
        return path;
      }
    }

    List<Path> candidates = List.of(
        Path.of("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"),
        Path.of("C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe")
    );

    for (Path candidate : candidates) {
      if (Files.exists(candidate)) {
        return candidate;
      }
    }

    // On Linux, check common locations
    if (!isWindows()) {
        List<String> linuxPaths = List.of("/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium");
        for (String path : linuxPaths) {
            Path p = Path.of(path);
            if (Files.exists(p)) return p;
        }
    }

    return null;
  }

  private static Path prepareChromeProfileDir() {
    try {
      return Files.createTempDirectory("selenium-chrome-profile-");
    } catch (Exception e) {
      Path fallback = Path.of("target", "chrome-profile");
      try {
        Files.createDirectories(fallback);
      } catch (Exception ignored) {
      }
      return fallback;
    }
  }

  private static boolean isWindows() {
    return System.getProperty("os.name").toLowerCase().contains("win");
  }
}
