<?php

if (!function_exists('compressAndResizeImage')) {
    /**
     * Compress and resize an image file in-place using PHP GD.
     *
     * Supports JPEG, PNG, WEBP. Skips SVG, GIF, and anything non-image.
     * Resizes to fit within $maxWidth × $maxHeight (preserving aspect ratio),
     * then re-saves at the given JPEG/WEBP quality or PNG compression level.
     *
     * @param string $filePath  Absolute path to the uploaded image file.
     * @param int    $maxWidth  Maximum output width in pixels  (default 1200).
     * @param int    $maxHeight Maximum output height in pixels (default 1200).
     * @param int    $quality   JPEG/WEBP quality 1–100 (default 75).
     * @return bool  true on success, false on failure / unsupported type.
     */
    function compressAndResizeImage(
        string $filePath,
        int $maxWidth  = 1200,
        int $maxHeight = 1200,
        int $quality   = 75
    ): bool {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            return false;
        }

        // Only process raster image types that GD handles well
        $mimeType = mime_content_type($filePath);
        $supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!in_array($mimeType, $supported, true)) {
            return false; // SVG, GIF, PDF etc. are left untouched
        }

        try {
            // Load source image
            $source = match ($mimeType) {
                'image/jpeg', 'image/jpg' => imagecreatefromjpeg($filePath),
                'image/png'               => imagecreatefrompng($filePath),
                'image/webp'              => imagecreatefromwebp($filePath),
                default                   => false,
            };

            if (!$source) {
                return false;
            }

            $origW = imagesx($source);
            $origH = imagesy($source);

            // Calculate new dimensions (only downscale, never upscale)
            [$newW, $newH] = _calcResizeDimensions($origW, $origH, $maxWidth, $maxHeight);

            if ($newW === $origW && $newH === $origH) {
                // No resize needed — still re-save at lower quality
                $resized = $source;
            } else {
                $resized = imagecreatetruecolor($newW, $newH);

                // Preserve transparency for PNG
                if ($mimeType === 'image/png') {
                    imagealphablending($resized, false);
                    imagesavealpha($resized, true);
                    $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
                    imagefilledrectangle($resized, 0, 0, $newW, $newH, $transparent);
                }

                imagecopyresampled($resized, $source, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
                imagedestroy($source);
            }

            // Save back to the same file
            $saved = match ($mimeType) {
                'image/jpeg', 'image/jpg' => imagejpeg($resized, $filePath, $quality),
                'image/webp'              => imagewebp($resized, $filePath, $quality),
                // PNG uses compression 0-9; map quality (0-100) → compression (9-0)
                'image/png'               => imagepng($resized, $filePath, (int) round((100 - $quality) / 11)),
                default                   => false,
            };

            imagedestroy($resized);
            return (bool) $saved;

        } catch (\Throwable $e) {
            log_message('error', '[image_helper] compressAndResizeImage failed for ' . $filePath . ': ' . $e->getMessage());
            return false;
        }
    }
}

if (!function_exists('_calcResizeDimensions')) {
    /**
     * Calculate new width/height fitting within maxW × maxH while preserving ratio.
     * Never upscales. Returns [$width, $height].
     *
     * @internal Used by compressAndResizeImage().
     */
    function _calcResizeDimensions(int $w, int $h, int $maxW, int $maxH): array
    {
        if ($w <= $maxW && $h <= $maxH) {
            return [$w, $h]; // already fits
        }
        $ratio  = min($maxW / $w, $maxH / $h);
        return [(int) round($w * $ratio), (int) round($h * $ratio)];
    }
}
