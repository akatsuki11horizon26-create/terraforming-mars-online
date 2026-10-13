param(
    [ValidateRange(1, 1440)][int]$Minutes = 300,
    [string]$RunName = ('audit-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
)
$ErrorActionPreference = 'Stop'
if ($RunName -notmatch '^[a-zA-Z0-9-]+$') { throw 'RunName must contain letters, digits and hyphens only.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
$runDirectory = Join-Path $projectRoot "tmp\$RunName"
$taskName = "MARS-$RunName"
if (Test-Path -LiteralPath $runDirectory) { throw 'Use a new RunName. Existing sessions must keep their original deadline.' }
$nodePath = (Get-Command node -ErrorAction Stop).Source
$runnerPath = Join-Path $PSScriptRoot 'audit-session.mjs'
New-Item -ItemType Directory -Path $runDirectory | Out-Null
$shellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
$workerPath = Join-Path $PSScriptRoot 'run-audit-session.ps1'
$action = New-ScheduledTaskAction -Execute $shellPath -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -File `"$workerPath`" -NodePath `"$nodePath`" -RunnerPath `"$runnerPath`" -RunDirectory `"$runDirectory`" -Minutes $Minutes" -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(5) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Minutes ($Minutes + 2))
$trigger.EndBoundary = (Get-Date).AddMinutes($Minutes + 3).ToString('s')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes ($Minutes + 1)) -DeleteExpiredTaskAfter (New-TimeSpan -Hours 1) -Hidden
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$task = Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'MARS bounded audit; persists progress and resumes interrupted runs without AI calls.'
[pscustomobject]@{ TaskName = $task.TaskName; Directory = $runDirectory; Minutes = $Minutes }
