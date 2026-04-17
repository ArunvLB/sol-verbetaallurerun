package com.ai.automation;

import com.ai.automation.utils.WebDriverFactory;
import com.ai.automation.utils.VideoRecorder;
import org.openqa.selenium.WebDriver;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import io.qameta.allure.Allure;
import org.testng.ITestResult;
import java.lang.reflect.Method;
import java.util.concurrent.atomic.AtomicBoolean;

public class BaseTest {
  protected WebDriver driver;
  private final VideoRecorder videoRecorder = new VideoRecorder();
  private static final AtomicBoolean videoCaptured = new AtomicBoolean(false);

  @BeforeMethod(alwaysRun = true)
  public void setUp(Method method) {
    driver = WebDriverFactory.create();
    boolean shouldRecord = !videoCaptured.get(); // only first test
    videoRecorder.start(method.getName(), shouldRecord);
  }

  public WebDriver getDriver() {
    return driver;
  }

  @AfterMethod(alwaysRun = true)
  public void tearDown(ITestResult result) {
    try {
      var video = videoRecorder.stop();
      if (video != null) {
        videoCaptured.set(true);
        attachVideo(video);
      }
    } catch (Exception ignored) {
      // Ignore recording errors to keep tests running.
    } finally {
      if (driver != null) {
        driver.quit();
      }
    }
  }

  private void attachVideo(java.io.File file) {
    try {
      byte[] data = java.nio.file.Files.readAllBytes(file.toPath());
      if (data.length > 0) {
        Allure.getLifecycle().addAttachment("Test video", "video/webm", "webm", data);
      }
    } catch (Exception ignored) {
    }
  }
}
