type ConvertNullToUndefined<T> = {
  [K in keyof T]: T[K] extends infer U ? (U extends null ? undefined : U) : never
}

// Union type to accept both Date and string for API responses
export type APIDataPhoto = Omit<Photo, 'fileModified' | 'takenAt' | 'createdAt' | 'updatedAt'>
  & {
    fileModified: Date | string | null
    takenAt: Date | string | null
    createdAt: Date | string | null
    updatedAt: Date | string | null
    // Tags come from the photo_tags relation, not from a photos column
    tags: string[]
  }

export type IPhoto = ConvertNullToUndefined<Omit<Photo, 'tags'>> & { tags: string[] }

// The upload/edit form keeps the comma separated representation
export type IPhotoForm = Partial<Omit<IPhoto, 'tags'>> & { tags?: string }
