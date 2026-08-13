import client from './client'

export interface UploadResult {
  url: string
  filename: string
  original_name: string
  size: number
  content_type: string
}

export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await client.post<UploadResult>('/uploads/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress(e) {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })

  return data
}

export async function uploadImageFromUrl(imageUrl: string): Promise<UploadResult> {
  const { data } = await client.post<UploadResult>('/uploads/from-url', { image_url: imageUrl })
  return data
}

export async function uploadDocument(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await client.post<UploadResult>('/uploads/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress(e) {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })

  return data
}
