<#
  Gera favicon.ico (16/32/48), PNGs (96, 180, 192, 512) e a imagem de compartilhamento (og-image.jpg)
  a partir da logo oficial (assets/official_logo_transparent.png) e do quadro do vídeo (assets/hero_banner_full.jpg).
  Uso (na raiz do projeto):  powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
  Requer apenas Windows PowerShell 5.1 (System.Drawing). Não altera a identidade visual: só reduz e enquadra a logo.
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $root 'assets\official_logo_transparent.png'
$heroPath = Join-Path $root 'assets\hero_banner_full.jpg'

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging;
public static class IconSharpen {
  // Realce leve apenas nos tamanhos minúsculos (16/32/48 px), para o símbolo continuar legível.
  public static Bitmap Apply(Bitmap src, double amount) {
    int w = src.Width, h = src.Height; Bitmap dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    BitmapData sd = src.LockBits(new Rectangle(0,0,w,h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    BitmapData dd = dst.LockBits(new Rectangle(0,0,w,h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    byte[] s = new byte[sd.Stride*h]; byte[] d = new byte[dd.Stride*h]; System.Runtime.InteropServices.Marshal.Copy(sd.Scan0, s, 0, s.Length); int st = sd.Stride;
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
      int i = y*st + x*4; d[i+3] = s[i+3];
      for (int c = 0; c < 3; c++) {
        double sum = 0; int n = 0;
        for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
          if (dx == 0 && dy == 0) continue; int xx = x+dx, yy = y+dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          int j = yy*st + xx*4; if (s[j+3] == 0) continue; sum += s[j+c]; n++; }
        double avg = n > 0 ? sum/n : s[i+c]; double v = s[i+c] + amount*(s[i+c]-avg);
        d[i+c] = (byte)Math.Max(0, Math.Min(255, v));
      }
    }
    System.Runtime.InteropServices.Marshal.Copy(d, 0, dd.Scan0, d.Length); src.UnlockBits(sd); dst.UnlockBits(dd); return dst;
  }
}
'@

$logo = [System.Drawing.Image]::FromFile($logoPath)

# size = lado do ícone; pad = margem (fração do lado); sharpen = realce; bg = $null (transparente) ou cor de fundo
function New-Icon([int]$size, [double]$pad, [double]$sharpen, $bg) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    if ($bg) { $g.Clear($bg) } else { $g.Clear([System.Drawing.Color]::Transparent) }
    $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
    $m = [int][Math]::Round($size * $pad)
    $dst = New-Object System.Drawing.Rectangle $m, $m, ($size - 2*$m), ($size - 2*$m)
    $g.DrawImage($logo, $dst, (New-Object System.Drawing.Rectangle 0, 0, $logo.Width, $logo.Height), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    if ($sharpen -gt 0) { $o = [IconSharpen]::Apply($bmp, $sharpen); $bmp.Dispose(); return $o }
    return $bmp
}
function Save-Png($bmp, [string]$path) { $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png) }
function Get-PngBytes($bmp) { $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $ms.ToArray() }

$navy = [System.Drawing.Color]::FromArgb(255, 7, 12, 22)

# --- favicon.ico: 16, 32 e 48 px (quadros PNG) ---
$frames = @(
    @{ size = 16; bytes = (Get-PngBytes (New-Icon 16 0.02 0.7 $null)) },
    @{ size = 32; bytes = (Get-PngBytes (New-Icon 32 0.02 0.7 $null)) },
    @{ size = 48; bytes = (Get-PngBytes (New-Icon 48 0.02 0.4 $null)) }
)
$ico = New-Object System.IO.MemoryStream; $bw = New-Object System.IO.BinaryWriter $ico
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$frames.Count)
$offset = 6 + 16 * $frames.Count
foreach ($f in $frames) {
    $bw.Write([byte]$f.size); $bw.Write([byte]$f.size); $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$f.bytes.Length); $bw.Write([uint32]$offset)
    $offset += $f.bytes.Length
}
foreach ($f in $frames) { $bw.Write([byte[]]$f.bytes) }
$bw.Flush(); [IO.File]::WriteAllBytes((Join-Path $root 'favicon.ico'), $ico.ToArray())

# --- PNGs ---
$b = New-Icon 96 0.02 0.0 $null;  Save-Png $b (Join-Path $root 'favicon-96x96.png'); $b.Dispose()
$b = New-Icon 180 0.10 0.0 $navy; Save-Png $b (Join-Path $root 'apple-touch-icon.png'); $b.Dispose()   # iOS não aceita transparência: fundo azul-noturno da marca
$b = New-Icon 192 0.02 0.0 $null; Save-Png $b (Join-Path $root 'icon-192.png'); $b.Dispose()
$b = New-Icon 512 0.02 0.0 $null; Save-Png $b (Join-Path $root 'icon-512.png'); $b.Dispose()

# --- imagem de compartilhamento 1200x630 (Open Graph / Twitter) ---
$hero = [System.Drawing.Image]::FromFile($heroPath)
$og = New-Object System.Drawing.Bitmap 1200, 630, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($og); $g.Clear($navy)
$g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
$w = [int][Math]::Round($hero.Width * 630 / $hero.Height); $x = [int][Math]::Round((1200 - $w) / 2)
$g.DrawImage($hero, $x, 0, $w, 630); $g.Dispose()
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1; $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 88L
$og.Save((Join-Path $root 'assets\img\og-image.jpg'), $enc, $ep); $og.Dispose(); $hero.Dispose(); $logo.Dispose()

Get-ChildItem $root -File | Where-Object { $_.Name -match '^(favicon|apple-touch|icon-)' } | ForEach-Object { '{0,-24} {1,6} bytes' -f $_.Name, $_.Length }
Get-ChildItem (Join-Path $root 'assets\img') -File | Where-Object { $_.Name -match '^og-image' } | ForEach-Object { 'assets\img\{0,-14} {1,6} bytes' -f $_.Name, $_.Length }
