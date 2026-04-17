package com.ai.automation.utils;

import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;

public class ConsoleLoggerListener implements ITestListener {

  @Override
  public void onTestStart(ITestResult result) {
    System.out.println("[RUNNING] " + result.getTestClass().getName() + "." + result.getMethod().getMethodName());
  }

  @Override
  public void onTestSuccess(ITestResult result) {
    System.out.println("[PASS] " + result.getTestClass().getName() + "." + result.getMethod().getMethodName());
  }

  @Override
  public void onTestFailure(ITestResult result) {
    System.out.println("[FAIL] " + result.getTestClass().getName() + "." + result.getMethod().getMethodName() + " - " + result.getThrowable());
  }

  @Override public void onTestSkipped(ITestResult result) {}
  @Override public void onTestFailedButWithinSuccessPercentage(ITestResult result) {}
  @Override public void onTestFailedWithTimeout(ITestResult result) {}
  @Override public void onStart(ITestContext context) {}
  @Override public void onFinish(ITestContext context) {}
}
