@echo off
rem Wrapper to run the powershell CLI tool with execution policy bypassed
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ai-ads-pipeline.ps1" %*

