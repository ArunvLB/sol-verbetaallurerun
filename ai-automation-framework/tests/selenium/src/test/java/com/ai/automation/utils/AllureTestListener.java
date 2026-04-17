package com.ai.automation.utils;

import io.qameta.allure.Attachment;
import org.openqa.selenium.WebDriver;
import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;
import com.ai.automation.BaseTest;

public class AllureTestListener implements ITestListener {
  @Override
  public void onTestFailure(ITestResult result) {
    attachTextLog("Test failed: " + result.getName());
    attachScreenshot(result);
  }

  @Override
  public void onTestSuccess(ITestResult result) {
    attachScreenshot(result);
  }

  @Attachment(value = "Failure log", type = "text/plain")
  private String attachTextLog(String message) {
    return message;
  }

  private void attachScreenshot(ITestResult result) {
    try {
      Object instance = result.getInstance();
      if (!(instance instanceof BaseTest bt)) {
        return;
      }
      WebDriver driver = bt.getDriver();
      String name = result.getMethod() != null ? result.getMethod().getMethodName() : "screenshot";
      byte[] data = WebDriverFactory.takeScreenshot(driver, name);
      if (data != null && data.length > 0) {
        attachScreenshotBytes("Screenshot - " + name, data);
      }
    } catch (Exception ignored) {
    }
  }

  @Attachment(value = "{0}", type = "image/png", fileExtension = "png")
  private byte[] attachScreenshotBytes(String name, byte[] bytes) {
    return bytes;
  }

  @Override public void onTestStart(ITestResult result) {}
  @Override public void onTestSkipped(ITestResult result) {}
  @Override public void onTestFailedButWithinSuccessPercentage(ITestResult result) {}
  @Override public void onStart(ITestContext context) {}
  @Override public void onFinish(ITestContext context) {}
}
