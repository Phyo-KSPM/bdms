const MAX_PHOTO_DIMENSION = 480
const JPEG_QUALITY = 0.85
const MAX_FILE_BYTES = 5 * 1024 * 1024

export function readDonorPhotoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("INVALID_IMAGE"))
  }
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new Error("FILE_TOO_LARGE"))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("READ_FAILED"))
    reader.onload = () => {
      const src = reader.result
      if (typeof src !== "string") {
        reject(new Error("READ_FAILED"))
        return
      }

      const img = new Image()
      img.onerror = () => reject(new Error("INVALID_IMAGE"))
      img.onload = () => {
        const scale = Math.min(
          1,
          MAX_PHOTO_DIMENSION / Math.max(img.width, img.height)
        )
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("READ_FAILED"))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY))
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
