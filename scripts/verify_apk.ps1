Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "Progicart.apk").Path)
$entries = $zip.Entries | Where-Object { $_.FullName -like "*ic_launcher*" -or $_.FullName -like "*splash*" }
Write-Host "Total icon/splash entries inside APK: $($entries.Count)"
foreach ($e in $entries) {
    Write-Host "$($e.FullName) - $($e.Length) bytes"
}
$zip.Dispose()

