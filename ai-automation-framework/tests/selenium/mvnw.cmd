@echo off
setlocal
set "MAVEN_HOME=%~dp0..\\maven\\apache-maven-3.9.9"
set "PATH=%MAVEN_HOME%\\bin;%PATH%"
"%MAVEN_HOME%\\bin\\mvn.cmd" %*
