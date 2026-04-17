$xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd" >
<suite name="AI Automation Subset Suite" parallel="false">
  <listeners>
    <listener class-name="com.ai.automation.utils.AllureTestListener"/>
    <listener class-name="com.ai.automation.utils.ConsoleLoggerListener"/>
  </listeners>
  <test name="First 78 Tests">
    <classes>'

$xmlFooter = '    </classes>
  </test>
</suite>'

$classes = ""
for ($i = 1; $i -le 78; $i++) {
    $classes += "      <class name=`"com.ai.automation.generated.TC_beta_solwerindia_com_$($i)Test`"/>`n"
}

$xmlContent = $xmlHeader + "`n" + $classes + $xmlFooter
[System.IO.File]::WriteAllText("f:\beta.solwer\ai-automation-framework\tests\selenium\testng-first-78.xml", $xmlContent)
