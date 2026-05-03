param(
    [string]$url
)

# =========================
# Imports
# =========================
Add-Type -AssemblyName System.Web
Add-Type -AssemblyName PresentationFramework


# =========================
# Config
# =========================

# ■ このPSを使用して，開いたり実行したりできるホワイトリスト．
$allowedRootsFile = "C:\tools\allowed_roots.txt"

# ■ mode=appの場合に，確認なしで実行してもよい拡張子のホワイトリスト．
$skipConfirmExtensionsFile  = "C:\tools\skip_confirm_extensions.txt"


# =========================
# UI Helpers
# =========================

# ■ 処理内で発生するエラーやアラートを表示するための処理．
function Show-Error($message) {
    [System.Windows.MessageBox]::Show(
        $message,
        "OpenFolder Error",
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::Error
    ) | Out-Null
}

# ■ mode=appで，ホワイトリストに入っていない拡張子が来た場合に，実行するかどうかを確認する処理．
function Confirm-Execution($path) {
    $result = [System.Windows.MessageBox]::Show(
        "This file may execute code:`n`n$path`n`nDo you want to open/execute it?",
        "Confirm",
        [System.Windows.MessageBoxButton]::YesNo,
        [System.Windows.MessageBoxImage]::Warning
    )
    return $result -eq [System.Windows.MessageBoxResult]::Yes
}


# =========================
# Explorer Helpers
# =========================

# ■ フォルダを開く処理．
function Open-Folder($path) {
    Start-Process explorer.exe -ArgumentList "`"$path`""
}

# ■ フォルダを開いて，ファイルを選択状態にする処理．
function Select-File($path) {
    Start-Process explorer.exe -ArgumentList "/select,`"$path`""
}

# ■ ファイルをNotePadで開く処理．
function Open-With-Notepad($path) {
    Start-Process notepad.exe -ArgumentList "`"$path`""
}


# =========================
# Security
# =========================
function Is-SubPath($child, $parent) {
    $child = [System.IO.Path]::GetFullPath($child).TrimEnd('\') + '\'
    $parent = [System.IO.Path]::GetFullPath($parent).TrimEnd('\') + '\'
    return $child.StartsWith($parent, [System.StringComparison]::OrdinalIgnoreCase)
}

# =========================
# Load allowed roots
# =========================

if (-not (Test-Path $allowedRootsFile)) {
    Show-Error "Allowed roots config not found:`n$allowedRootsFile"
    exit
}

$allowedRoots = Get-Content $allowedRootsFile |
    Where-Object { $_ -and ($_ -notmatch '^\s*#') } |
    ForEach-Object { $_.Trim() }

if ($allowedRoots.Count -eq 0) {
    Show-Error "No allowed paths configured."
    exit
}

$allowedRoots = $allowedRoots | ForEach-Object {
    try { [System.IO.Path]::GetFullPath($_) } catch { $null }
} | Where-Object { $_ }

# =========================
# Load skip confirmation extensions
# =========================
if (-not (Test-Path $skipConfirmExtensionsFile)) {
    Show-Error "Read-only extensions config not found:`n$skipConfirmExtensionsFile"
    exit
}

$skipConfirmExtensions = Get-Content $skipConfirmExtensionsFile |
    Where-Object { $_ -and ($_ -notmatch '^\s*#') } |
    ForEach-Object { $_.Trim().ToLowerInvariant() }

# =========================
# Parse URL
# =========================
try {
    $uri = [System.Uri]$url
    $query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
    $path = $query["path"]
    $mode = $query["mode"]
} catch {
    Show-Error "Invalid URL:`n$url"
    exit
}

if ([string]::IsNullOrWhiteSpace($path)) {
    Show-Error "Path parameter is missing."
    exit
}

# =========================
# Normalize path
# =========================
try {
    $fullPath = [System.IO.Path]::GetFullPath($path)
} catch {
    Show-Error "Invalid path format:`n$path"
    exit
}

# =========================
# Security check
# =========================
$isAllowed = $false
foreach ($root in $allowedRoots) {
    if (Is-SubPath $fullPath $root) {
        $isAllowed = $true
        break
    }
}

if (-not $isAllowed) {
    Show-Error "Access denied:`n$fullPath"
    exit
}

# =========================
# Existence check
# =========================
if (-not (Test-Path $fullPath)) {
    Show-Error "Path does not exist:`n$fullPath"
    exit
}

# =========================
# Main logic
# =========================

# フォルダの場合は，単にExplorerで開く．
if (Test-Path $fullPath -PathType Container) {
    Open-Folder $fullPath
    exit
}


# ファイルの場合は，，，
if (Test-Path $fullPath -PathType Leaf) {

    # テキストモードの場合は，メモ帳で開く．
    if ($mode -eq "text") {
        Open-With-Notepad $fullPath
        exit
    }

    # アプリモードの場合，，
    if ($mode -eq "app") {

        # ホワイトリストに入っている拡張子の場合は，そのまま実行する．
        $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
        if ($skipConfirmExtensions -contains $extension) {
            Start-Process -FilePath $fullPath
            exit
        }

        # ホワイトリストにない場合は，確認する．OK→実行．NG→フォルダを開く．
        if (Confirm-Execution $fullPath) {
            Start-Process -FilePath $fullPath
        } else {
            Open-Folder $parentFolder
        }
        exit
    }
    
    Show-Error "Invalid mode:`n$mode`n`nUse mode=text or mode=app."
    exit
}

Show-Error "Unsupported path:`n$fullPath"