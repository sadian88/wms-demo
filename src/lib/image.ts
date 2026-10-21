/**
 * Comprime una foto tomada con la cámara del celular a un JPEG liviano (data URL)
 * para poder guardarla junto al registro sin saturar el almacenamiento del navegador.
 */
export async function compressImage(
  file: File,
  maxSide = 1024,
  quality = 0.72
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
