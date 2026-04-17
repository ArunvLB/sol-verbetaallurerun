import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';
import path from 'path';
import fs from 'fs/promises';

interface TestCaseRecord {
  id: string;
  page: string;
  category: string;
  type: string;
  title: string;
  steps: string[];
  expected: string;
  data?: Record<string, any>;
}

/**
 * Generates Java + Selenium + TestNG test sources from the designed test cases
 * and wires them with Allure reporting. Files are written under tests/selenium/.
 */
export class SeleniumTestExecutionAgent extends BaseAgent {
  constructor() {
    super('SeleniumTestExecutionAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Generating Selenium TestNG suite from test cases...');

    let testCases: TestCaseRecord[] = context.testCases || [];
    if (!testCases.length) {
      // Try loading from disk if present
      const stored = await StorageService.loadJson('test-cases.json', Config.OUTPUT_DIR);
      if (stored?.length) {
        testCases = stored;
        context.testCases = stored;
      }
    }

    if (!testCases.length) {
      Logger.warn(this.name, 'No test cases found. Skipping Selenium suite generation.');
      return context;
    }

    const projectRoot = Config.BASE_DIR;
    const selRoot = path.resolve(projectRoot, 'tests', 'selenium');
    const javaSrc = path.join(selRoot, 'src', 'test', 'java');
    const basePkgPath = path.join(javaSrc, 'com', 'ai', 'automation');
    const genPkgPath = path.join(basePkgPath, 'generated');

    await fs.mkdir(genPkgPath, { recursive: true });

    await this.writePom(selRoot);
    await this.writeTestNg(selRoot);
    await this.writeBaseTest(basePkgPath);
    await this.writeUtils(basePkgPath);

    for (const tc of testCases) {
      await this.writeTestClass(genPkgPath, tc);
    }

    Logger.info(this.name, `Generated ${testCases.length} TestNG classes under tests/selenium/src/test/java/com/ai/automation/generated`);
    return context;
  }

  private async writePom(selRoot: string) {
    const pomPath = path.join(selRoot, 'pom.xml');
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.ai</groupId>
  <artifactId>automation-selenium</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <allure.version>2.27.0</allure.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>4.18.1</version>
    </dependency>
    <dependency>
      <groupId>io.github.bonigarcia</groupId>
      <artifactId>webdrivermanager</artifactId>
      <version>5.6.3</version>
    </dependency>
    <dependency>
      <groupId>org.testng</groupId>
      <artifactId>testng</artifactId>
      <version>7.9.0</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>io.qameta.allure</groupId>
      <artifactId>allure-testng</artifactId>
      <version>\${allure.version}</version>
    </dependency>
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.0</version>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-maven</artifactId>
        <version>2.12.0</version>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <suiteXmlFiles>
            <suiteXmlFile>testng.xml</suiteXmlFile>
          </suiteXmlFiles>
          <systemPropertyVariables>
            <allure.results.directory>target/allure-results</allure.results.directory>
          </systemPropertyVariables>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
`;
    await fs.writeFile(pomPath, content, 'utf-8');
  }

  private async writeTestNg(selRoot: string) {
    const filePath = path.join(selRoot, 'testng.xml');
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd" >
<suite name="AI Automation Selenium Suite" parallel="false">
  <listeners>
    <listener class-name="com.ai.automation.utils.AllureTestListener"/>
  </listeners>
  <test name="Generated Tests">
    <packages>
      <package name="com.ai.automation.generated"/>
    </packages>
  </test>
</suite>
`;
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async writeBaseTest(basePkgPath: string) {
    const content = `package com.ai.automation;

import com.ai.automation.utils.WebDriverFactory;
import org.openqa.selenium.WebDriver;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import io.qameta.allure.Attachment;

public class BaseTest {
  protected WebDriver driver;

  @BeforeMethod(alwaysRun = true)
  public void setUp() {
    driver = WebDriverFactory.create();
  }

  @AfterMethod(alwaysRun = true)
  public void tearDown() {
    if (driver != null) {
      driver.quit();
    }
  }

  @Attachment(value = "Screenshot", type = "image/png")
  protected byte[] attachScreenshot() {
    try {
      return WebDriverFactory.takeScreenshot(driver);
    } catch (Exception e) {
      return new byte[0];
    }
  }
}
`;
    const filePath = path.join(basePkgPath, 'BaseTest.java');
    await fs.mkdir(basePkgPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async writeUtils(basePkgPath: string) {
    const utilsPath = path.join(basePkgPath, 'utils');
    await fs.mkdir(utilsPath, { recursive: true });

    const wdFactory = `package com.ai.automation.utils;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class WebDriverFactory {
  public static WebDriver create() {
    WebDriverManager.chromedriver().setup();
    ChromeOptions options = new ChromeOptions();
    options.addArguments("--headless=new", "--disable-gpu", "--window-size=1366,768");
    return new ChromeDriver(options);
  }

  public static byte[] takeScreenshot(WebDriver driver) {
    if (driver instanceof TakesScreenshot) {
      return ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
    }
    return new byte[0];
  }
}
`;
    await fs.writeFile(path.join(utilsPath, 'WebDriverFactory.java'), wdFactory, 'utf-8');

    const allureListener = `package com.ai.automation.utils;

import io.qameta.allure.Attachment;
import org.openqa.selenium.WebDriver;
import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;

public class AllureTestListener implements ITestListener {
  @Override
  public void onTestFailure(ITestResult result) {
    attachTextLog("Test failed: " + result.getName());
    Object instance = result.getInstance();
    if (instance instanceof com.ai.automation.BaseTest bt) {
      attachScreenshot(bt);
    }
  }

  @Attachment(value = "Failure log", type = "text/plain")
  private String attachTextLog(String message) {
    return message;
  }

  @Attachment(value = "Failure screenshot", type = "image/png")
  private byte[] attachScreenshot(com.ai.automation.BaseTest bt) {
    try {
      WebDriver driver = bt.driver;
      return WebDriverFactory.takeScreenshot(driver);
    } catch (Exception e) {
      return new byte[0];
    }
  }

  @Override public void onTestStart(ITestResult result) {}
  @Override public void onTestSuccess(ITestResult result) {}
  @Override public void onTestSkipped(ITestResult result) {}
  @Override public void onTestFailedButWithinSuccessPercentage(ITestResult result) {}
  @Override public void onStart(ITestContext context) {}
  @Override public void onFinish(ITestContext context) {}
}
`;
    await fs.writeFile(path.join(utilsPath, 'AllureTestListener.java'), allureListener, 'utf-8');
  }

  private async writeTestClass(genPkgPath: string, tc: TestCaseRecord) {
    const className = this.toClassName(tc.id);
    const filePath = path.join(genPkgPath, `${className}.java`);
    const stepsComment = tc.steps
      .map((s, i) => `    // Step ${i + 1}: ${this.sanitizeForComment(s)}`)
      .join('\n');

    const title = this.javaString(tc.title);
    const expected = this.javaString(tc.expected);
    const testDesc = this.javaString(`${tc.type} | ${tc.category} | ${tc.title}`);

    const content = `package com.ai.automation.generated;

import com.ai.automation.BaseTest;
import io.qameta.allure.Description;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import org.testng.annotations.Test;

public class ${className} extends BaseTest {

  @Epic("Crawl-derived test cases")
  @Feature("${tc.category}")
  @Severity(${this.severityFor(tc.type)})
  @Description("Auto-generated: ${title}\\nExpected: ${expected}")
  @Test(description = "${testDesc}")
  public void ${this.methodName(tc.id)}() {
    driver.get("${this.javaString(tc.page)}");
${stepsComment || '    // TODO: Add actions'}
    // TODO: Add assertions to verify: ${this.sanitizeForComment(tc.expected)}
  }
}
`;
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private toClassName(id: string) {
    const clean = id.replace(/[^a-zA-Z0-9]/g, '_');
    return clean.match(/^[A-Za-z]/) ? clean + 'Test' : 'TC_' + clean + 'Test';
  }

  private methodName(id: string) {
    const clean = id.replace(/[^a-zA-Z0-9]/g, '_');
    return clean.match(/^[A-Za-z]/) ? 'test_' + clean : 'test_' + clean;
  }

  private severityFor(type: string) {
    switch (type) {
      case 'negative':
        return 'SeverityLevel.CRITICAL';
      case 'edge':
        return 'SeverityLevel.NORMAL';
      default:
        return 'SeverityLevel.MINOR';
    }
  }

  private javaString(input: string): string {
    const safe = (input || '').replace(/[^\x20-\x7E]/g, '');
    return safe.replace(/\\/g, '\\\\').replace(/"/g, '\\\"').replace(/\r?\n/g, '\\n');
  }

  private sanitizeForComment(input: string): string {
    return (input || '').replace(/[^\x20-\x7E]/g, '').replace(/\r?\n/g, ' ');
  }
}
