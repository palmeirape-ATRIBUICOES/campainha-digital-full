$files = @(
  "frontend\src\pages\MasterAdminDashboard.jsx",
  "frontend\src\pages\PorteiroDashboard.jsx",
  "frontend\src\pages\ResidentDashboard.jsx",
  "frontend\src\pages\ResidentLogin.jsx",
  "frontend\src\pages\ResidentPanels.jsx",
  "frontend\src\components\BroadcastPanel.jsx",
  "frontend\src\components\UnitManager.jsx",
  "frontend\src\components\ResidentManager.jsx"
)

$oldStr = "const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';"
$newStr = "import { API } from '../config';"

foreach ($f in $files) {
  $content = Get-Content $f -Raw -Encoding UTF8
  if ($content -match [regex]::Escape($oldStr)) {
    $content = $content.Replace($oldStr, $newStr)
    Set-Content $f $content -Encoding UTF8
    Write-Host "Fixed: $f"
  } else {
    Write-Host "Skip (not found): $f"
  }
}
