package com.ai.automation.generated;

import com.ai.automation.BaseTest;
import io.qameta.allure.Description;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import org.testng.annotations.Test;

public class TC_beta_solwerindia_com_152Test extends BaseTest {

  @Epic("Crawl-derived test cases")
  @Feature("form")
  @Severity(SeverityLevel.CRITICAL)
  @Description("Auto-generated: form-1: invalid email is rejected\nExpected: Client-side validation blocks submission and shows clear error on email field")
  @Test(description = "negative | form | form-1: invalid email is rejected")
  public void test_TC_beta_solwerindia_com_152() {
    driver.get("https://beta.solwerindia.com/contact");
    // Step 1: Open https://beta.solwerindia.com/contact
    // Step 2: Enter "not-an-email" in email field
    // Step 3: Submit the form
    // TODO: Add assertions to verify: Client-side validation blocks submission and shows clear error on email field
  }
}
