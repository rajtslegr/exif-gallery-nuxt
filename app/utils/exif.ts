import exifr from 'exifr'

async function getImageAspectRatio(file: File) {
  return createImageBitmap(file).then((bitmap) => {
    const aspectRatio = bitmap.width / bitmap.height
    bitmap.close()
    return aspectRatio
  }).catch(() => {
    return undefined
  })
}

export async function getExifData(file: File) {
  let photo: IPhotoForm = {}

  // Parse the EXIF metadata
  const exifData = await exifr.parse(file)

  photo = {
    make: exifData?.Make,
    model: exifData?.Model,
    focalLength: exifData?.FocalLength,
    focalLengthIn35mmFormat: exifData?.FocalLengthIn35mmFormat,
    lensMake: exifData?.LensMake,
    lensModel: exifData?.LensModel,
    fNumber: exifData?.FNumber,
    iso: exifData?.ISO,
    exposureTime: exifData?.ExposureTime,
    exposureCompensation: exifData?.ExposureCompensation,
    // exifr exposes the computed decimal degrees, not `Latitude`/`Longitude`.
    // Coordinates stay server-side; see `toPublicPhoto`.
    latitude: exifData?.latitude,
    longitude: exifData?.longitude,
    takenAt: exifData?.DateTimeOriginal,
  }

  photo.aspectRatio = await getImageAspectRatio(file)

  return photo
}
