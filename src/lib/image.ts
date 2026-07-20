// Client-side avatar processing. A raw phone photo is multiple MB, well past
// Firestore's 1MB per-doc limit, so we downscale to a small square and re-encode
// as a compressed JPEG before storing the result as base64 on the user doc.

const AVATAR_SIZE = 200 // final width/height in px (square)
const JPEG_QUALITY = 0.8

/**
 * Loads an image file, center-crops it to a square, scales it down to
 * AVATAR_SIZE, and returns a compressed JPEG data URL (base64). Rejects if the
 * file isn't a readable image.
 */
export async function fileToAvatarBase64(file: File): Promise<string> {
  const bitmap = await loadImage(file)

  // Center-crop to a square so the avatar isn't stretched.
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('That file is not an image'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Couldn't read that image"))
    }
    img.src = url
  })
}
