param(
    [Parameter(Mandatory)][string]$NodePath,
    [Parameter(Mandatory)][string]$RunnerPath,
    [Parameter(Mandatory)][string]$RunDirectory,
    [Parameter(Mandatory)][int]$Minutes
)
& $NodePath $RunnerPath "--directory=$RunDirectory" "--minutes=$Minutes" *>> (Join-Path $RunDirectory 'runner.log')
exit $LASTEXITCODE
