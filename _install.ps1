$ErrorActionPreference = "Continue"
Set-Location c:\Innvovik\backend
$uv = "C:\Users\sarth\.local\bin\uv.exe"
$log = "c:\Innvovik\_install.log"
Remove-Item c:\Innvovik\_install.done -ErrorAction SilentlyContinue
"[stage-a start] $(Get-Date -Format o)" | Out-File -Encoding utf8 $log
& $uv add --no-progress langgraph langchain langchain-text-splitters chromadb pypdf numpy *>&1 |
    Out-File -Append -Encoding utf8 $log
"[stage-a exit=$LASTEXITCODE] $(Get-Date -Format o)" | Out-File -Append -Encoding utf8 $log
"[stage-b start] $(Get-Date -Format o)" | Out-File -Append -Encoding utf8 $log
& $uv add --no-progress sentence-transformers *>&1 |
    Out-File -Append -Encoding utf8 $log
"[stage-b exit=$LASTEXITCODE] $(Get-Date -Format o)" | Out-File -Append -Encoding utf8 $log
"finished" | Out-File -Encoding utf8 c:\Innvovik\_install.done
