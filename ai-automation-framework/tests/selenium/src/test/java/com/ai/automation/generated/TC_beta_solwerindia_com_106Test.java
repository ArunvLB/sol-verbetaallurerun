package com.ai.automation.generated;

import com.ai.automation.BaseTest;
import io.qameta.allure.Description;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import org.testng.annotations.Test;

public class TC_beta_solwerindia_com_106Test extends BaseTest {

  @Epic("Crawl-derived test cases")
  @Feature("form")
  @Severity(SeverityLevel.CRITICAL)
  @Description("Auto-generated: form-1: required field validation\nExpected: Inline validation highlights the empty field; form does not submit")
  @Test(description = "negative | form | form-1: required field validation")
  public void test_TC_beta_solwerindia_com_106() {
    driver.get("https://beta.solwerindia.com/contact-building");
    // Step 1: Open https://beta.solwerindia.com/contact-building
    // Step 2: Leave one required/visible field empty in form-1
    // Step 3: Submit the form
    // TODO: Add assertions to verify: Inline validation highlights the empty field; form does not submit
  }
}
