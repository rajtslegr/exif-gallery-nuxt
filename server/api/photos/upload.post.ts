import type { Photo } from '~~/server/utils/drizzle'
import { blob } from '@nuxthub/blob'
import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { purgeGalleryCache } from '../../utils/cache'
import { hasImageSignature, MAX_FILE_BYTES, MAX_TOTAL_BYTES, parseFormDate, toPhotoFileName } from '../../utils/upload'

interface UploadFile {
  file: File
  type: 'jpeg' | 'webp' | 'avif' | 'thumbnail'
}

interface UploadResultSuccess {
  success: true
  type: 'jpeg' | 'webp' | 'avif' | 'thumbnail'
  pathname: string
}

interface UploadResultError {
  success: false
  error: unknown
  fileName: string
}

export default eventHandler(async (event) => {
  await requireUserSession(event)

  const formData = await readFormData(event)
  const files: UploadFile[] = []

  const formats = ['jpeg', 'webp', 'avif', 'thumbnail'] as const
  formats.forEach((format) => {
    const file = formData.get(format)
    if (file instanceof File) {
      files.push({ file, type: format })
    }
  })

  if (files.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No File Received',
    })
  }

  const validFiles = files.filter(f => f.file.type?.startsWith('image/'))
  if (validFiles.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No Valid Image File Received',
    })
  }

  const oversizedFile = validFiles.find(({ file }) => file.size > MAX_FILE_BYTES)
  if (oversizedFile) {
    throw createError({
      statusCode: 413,
      message: `File "${oversizedFile.file.name}" exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB limit`,
    })
  }

  const totalBytes = validFiles.reduce((total, { file }) => total + file.size, 0)
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw createError({
      statusCode: 413,
      message: `Upload exceeds the ${MAX_TOTAL_BYTES / 1024 / 1024} MB limit`,
    })
  }

  for (const { file } of validFiles) {
    if (!(await hasImageSignature(file))) {
      throw createError({
        statusCode: 415,
        message: `File "${file.name}" is not a supported image`,
      })
    }
  }

  // Generate a unique ID for this upload group
  const uploadId = createCuid()
  const fileName = toPhotoFileName(validFiles[0]!.file)

  const uploadResults = await Promise.allSettled<UploadResultSuccess | UploadResultError>(
    validFiles.map(async (file) => {
      try {
        const filename = file.file.name
        const extension = filename.substring(filename.lastIndexOf('.'))
        const pathname = `Image-${uploadId}-${file.type}${extension}`

        await blob.put(pathname, file.file)

        return {
          success: true,
          type: file.type,
          pathname,
        }
      }
      catch (error) {
        console.error(`Failed to upload ${file.file.name}:`, error)
        return { success: false, error, fileName: file.file.name }
      }
    }),
  )

  const successfulUploads = uploadResults
    .filter((result): result is PromiseFulfilledResult<UploadResultSuccess> => result.status === 'fulfilled' && result.value.success)
    .map(result => result.value)

  if (successfulUploads.length > 0) {
    const fileEntry = successfulUploads.reduce<Partial<Photo>>((acc, upload) => {
      acc[upload.type] = upload.pathname
      return acc
    }, {})

    const tags = formData.get('tags')?.toString() || null

    // Add metadata fields from form data
    const photoEntry: Partial<Photo> = {
      // File info
      fileModified: parseFormDate(formData.get('fileModified')) ?? new Date(),
      // Photos
      ...fileEntry,
      // Description
      title: formData.get('title')?.toString() || null,
      caption: formData.get('caption')?.toString() || null,
      semanticDescription: formData.get('semanticDescription')?.toString() || null,
      // EXIF data
      make: formData.get('make')?.toString() || null,
      model: formData.get('model')?.toString() || null,
      focalLength: Number(formData.get('focalLength')) || null,
      focalLengthIn35mmFormat: Number(formData.get('focalLengthIn35mmFormat')) || null,
      lensMake: formData.get('lensMake')?.toString() || null,
      lensModel: formData.get('lensModel')?.toString() || null,
      fNumber: Number(formData.get('fNumber')) || null,
      iso: Number(formData.get('iso')) || null,
      exposureTime: Number(formData.get('exposureTime')) || null,
      exposureCompensation: Number(formData.get('exposureCompensation')) || null,
      locationName: formData.get('locationName')?.toString() || null,
      latitude: Number(formData.get('latitude')) || null,
      longitude: Number(formData.get('longitude')) || null,
      takenAt: parseFormDate(formData.get('takenAt')),
      // Photo info
      aspectRatio: Number(formData.get('aspectRatio')) || 1.5,
      // Photo config
      priorityOrder: Number(formData.get('priorityOrder')) || null,
    }

    let insertedPhotoId: string | undefined
    try {
      const newPhoto = await db.insert(schema.photo)
        .values({
          ...photoEntry,
          fileName,
        })
        .returning()

      if (!newPhoto.length) {
        throw new Error('Failed to insert photo')
      }

      insertedPhotoId = newPhoto[0]!.id
      await processPhotoTags(insertedPhotoId, tags)
      await purgeGalleryCache(event)
    }
    catch (error) {
      console.error('Failed to insert photo into database:', error)
      // The client sees a failure, so it must not leave files behind: remove the
      // row (photo_tags cascade) and the blobs that were already written.
      if (insertedPhotoId) {
        await db.delete(schema.photo)
          .where(eq(schema.photo.id, insertedPhotoId))
          .catch(rollbackError => console.error('Failed to roll back photo row:', rollbackError))
      }
      await Promise.allSettled(successfulUploads.map(({ pathname }) => blob.delete(pathname)))

      throw createError({
        statusCode: 500,
        message: 'Failed to save photo information',
      })
    }
  }

  const errors = [
    ...uploadResults
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => ({ fileName: 'Unknown', error: result.reason })),
    ...uploadResults
      .filter((result): result is PromiseFulfilledResult<UploadResultError> =>
        result.status === 'fulfilled' && !result.value.success)
      .map(result => ({ fileName: result.value.fileName, error: result.value.error })),
  ]

  return {
    success: successfulUploads.length > 0,
    uploaded: successfulUploads,
    errors: errors.length > 0 ? errors : undefined,
  }
})
