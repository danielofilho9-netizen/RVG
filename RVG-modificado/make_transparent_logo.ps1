Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\Daniel\.gemini\antigravity\scratch\rvg-solucoes\assets\official_logo.png"
$outputPath = "C:\Users\Daniel\.gemini\antigravity\scratch\rvg-solucoes\assets\official_logo_transparent.png"

$img = [System.Drawing.Image]::FromFile($sourcePath)
$bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)

$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Create circular clip
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
# Slightly inset circle (inset by ~2.5% to cut out any outer grid pixels)
$margin = $img.Width * 0.02
$path.AddEllipse($margin, $margin, $img.Width - ($margin * 2), $img.Height - ($margin * 2))

$g.SetClip($path)
$g.DrawImage($img, 0, 0, $img.Width, $img.Height)

$g.Dispose()
$img.Dispose()

$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Logo converted to transparent PNG successfully at $outputPath"
