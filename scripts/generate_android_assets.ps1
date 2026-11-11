param (
    [string]$SourceLogoPath = "frontend\public\logo.png",
    [string]$AndroidResPath = "frontend\android\app\src\main\res"
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $SourceLogoPath)) {
    Write-Error "Source logo file not found at $SourceLogoPath"
    exit 1
}

$logoFullPath = (Resolve-Path $SourceLogoPath).Path
$resFullPath = (Resolve-Path $AndroidResPath).Path
$logo = [System.Drawing.Bitmap]::FromFile($logoFullPath)

Write-Host "Source logo loaded from: $logoFullPath ($($logo.Width)x$($logo.Height))"

# Helper function to generate an icon bitmap
function Create-LauncherIcon {
    param (
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [bool]$isRound = $false,
        [bool]$isForeground = $false
    )

    $destBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($isForeground) {
        # Transparent background for adaptive icon foreground
        $g.Clear([System.Drawing.Color]::Transparent)
        # Safe zone is center 60% of the canvas
        $scale = 0.65
        $targetW = [int]($width * $scale)
        $targetH = [int]($targetW * ($source.Height / $source.Width))
        if ($targetH -gt ($height * $scale)) {
            $targetH = [int]($height * $scale)
            $targetW = [int]($targetH * ($source.Width / $source.Height))
        }
        $destX = [int](($width - $targetW) / 2)
        $destY = [int](($height - $targetH) / 2)

        $g.DrawImage($source, $destX, $destY, $targetW, $targetH)
    } else {
        # White background with rounded rectangle or circle
        $g.Clear([System.Drawing.Color]::Transparent)
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

        if ($isRound) {
            # Circular clip
            $g.FillEllipse($bgBrush, 1, 1, $width - 2, $height - 2)
        } else {
            # Rounded rectangle
            $radius = [int]($width * 0.22)
            $path = New-Object System.Drawing.Drawing2D.GraphicsPath
            $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
            $diameter = $radius * 2
            $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
            $path.AddArc($width - $diameter, 0, $diameter, $diameter, 270, 90)
            $path.AddArc($width - $diameter, $height - $diameter, $diameter, $diameter, 0, 90)
            $path.AddArc(0, $height - $diameter, $diameter, $diameter, 90, 90)
            $path.CloseFigure()
            $g.FillPath($bgBrush, $path)
            $path.Dispose()
        }
        $bgBrush.Dispose()

        # Center logo inside
        $scale = 0.78
        $targetW = [int]($width * $scale)
        $targetH = [int]($targetW * ($source.Height / $source.Width))
        if ($targetH -gt ($height * $scale)) {
            $targetH = [int]($height * $scale)
            $targetW = [int]($targetH * ($source.Width / $source.Height))
        }
        $destX = [int](($width - $targetW) / 2)
        $destY = [int](($height - $targetH) / 2)

        $g.DrawImage($source, $destX, $destY, $targetW, $targetH)
    }

    $g.Dispose()
    return $destBmp
}

# Helper function to generate a splash bitmap
function Create-SplashScreen {
    param (
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [bool]$isLandscape = $false
    )

    $destBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Crisp pure white background
    $g.Clear([System.Drawing.Color]::White)

    # Scale logo nicely for splash
    $scale = if ($isLandscape) { 0.38 } else { 0.58 }
    $targetW = [int]($width * $scale)
    $targetH = [int]($targetW * ($source.Height / $source.Width))

    # Keep within 30% of screen height
    $maxH = [int]($height * 0.28)
    if ($targetH -gt $maxH) {
        $targetH = $maxH
        $targetW = [int]($targetH * ($source.Width / $source.Height))
    }

    $destX = [int](($width - $targetW) / 2)
    $destY = [int](($height - $targetH) / 2 - ($height * 0.04)) # Slightly above center

    $g.DrawImage($source, $destX, $destY, $targetW, $targetH)
    $g.Dispose()
    return $destBmp
}

# --- 1. Mipmap densities for Launcher Icons ---
$mipmapSizes = @{
    "mipmap-mdpi"    = @{ "ic" = 48;  "fg" = 108 }
    "mipmap-hdpi"    = @{ "ic" = 72;  "fg" = 162 }
    "mipmap-xhdpi"   = @{ "ic" = 96;  "fg" = 216 }
    "mipmap-xxhdpi"  = @{ "ic" = 144; "fg" = 324 }
    "mipmap-xxxhdpi" = @{ "ic" = 192; "fg" = 432 }
}

foreach ($density in $mipmapSizes.Keys) {
    $dir = Join-Path $resFullPath $density
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $icSize = $mipmapSizes[$density]["ic"]
    $fgSize = $mipmapSizes[$density]["fg"]

    # 1. ic_launcher.png
    $ic = Create-LauncherIcon -source $logo -width $icSize -height $icSize -isRound $false
    $icPath = Join-Path $dir "ic_launcher.png"
    $ic.Save($icPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $ic.Dispose()
    Write-Host "Created $density/ic_launcher.png ($icSize x $icSize)"

    # 2. ic_launcher_round.png
    $icRound = Create-LauncherIcon -source $logo -width $icSize -height $icSize -isRound $true
    $icRoundPath = Join-Path $dir "ic_launcher_round.png"
    $icRound.Save($icRoundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $icRound.Dispose()
    Write-Host "Created $density/ic_launcher_round.png ($icSize x $icSize)"

    # 3. ic_launcher_foreground.png
    $fg = Create-LauncherIcon -source $logo -width $fgSize -height $fgSize -isForeground $true
    $fgPath = Join-Path $dir "ic_launcher_foreground.png"
    $fg.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fg.Dispose()
    Write-Host "Created $density/ic_launcher_foreground.png ($fgSize x $fgSize)"
}

# --- 2. Splash Screen Resolutions ---
$splashList = @(
    @{ Dir = "drawable";                W = 480;  H = 320;  Land = $true },
    @{ Dir = "drawable-land-mdpi";       W = 480;  H = 320;  Land = $true },
    @{ Dir = "drawable-land-hdpi";       W = 800;  H = 480;  Land = $true },
    @{ Dir = "drawable-land-xhdpi";      W = 1280; H = 720;  Land = $true },
    @{ Dir = "drawable-land-xxhdpi";     W = 1600; H = 960;  Land = $true },
    @{ Dir = "drawable-land-xxxhdpi";    W = 1920; H = 1280; Land = $true },
    @{ Dir = "drawable-port-mdpi";       W = 320;  H = 480;  Land = $false },
    @{ Dir = "drawable-port-hdpi";       W = 480;  H = 800;  Land = $false },
    @{ Dir = "drawable-port-xhdpi";      W = 720;  H = 1280; Land = $false },
    @{ Dir = "drawable-port-xxhdpi";     W = 960;  H = 1600; Land = $false },
    @{ Dir = "drawable-port-xxxhdpi";    W = 1280; H = 1920; Land = $false }
)

foreach ($item in $splashList) {
    $dir = Join-Path $resFullPath $item.Dir
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $splash = Create-SplashScreen -source $logo -width $item.W -height $item.H -isLandscape $item.Land
    $splashPath = Join-Path $dir "splash.png"
    $splash.Save($splashPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $splash.Dispose()
    Write-Host "Created $($item.Dir)/splash.png ($($item.W) x $($item.H))"
}

$logo.Dispose()
Write-Host "All Android Icons and Splash screens successfully generated with Progicart Logo!"

