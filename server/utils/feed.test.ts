import { describe, expect, it } from 'vitest'
import { buildRssFeed } from './feed'

interface FeedPhotoInput {
  id: string
  fileName: string
  title?: string | null
  caption?: string | null
  semanticDescription?: string | null
  webp?: string | null
  jpeg?: string | null
  avif?: string | null
  thumbnail?: string | null
  takenAt?: Date | null
  createdAt?: Date | null
  tags: string[]
}

const photo: FeedPhotoInput = {
  id: 'abc123',
  fileName: 'regal-canine-majesty',
  title: 'Regal canine majesty',
  caption: 'A dog & a cat <together>',
  webp: 'Image-x-webp.webp',
  thumbnail: 'Image-x-thumbnail.jpg',
  takenAt: new Date('2024-05-01T10:00:00.000Z'),
  createdAt: new Date('2024-05-02T10:00:00.000Z'),
  tags: ['dog', 'berlin'],
}

function feed(overrides: Partial<FeedPhotoInput> = {}) {
  return buildRssFeed({
    origin: 'https://photos.test',
    title: 'Photo Blog',
    description: 'Photos',
    photos: [{ ...photo, ...overrides }],
  })
}

describe('buildRssFeed', () => {
  it('wraps items in a channel', () => {
    const xml = feed()
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<link>https://photos.test/</link>')
    expect(xml).toContain('<atom:link href="https://photos.test/feed.xml" rel="self"')
    expect(xml).toContain('<item>')
  })

  it('escapes text so a caption cannot break the xml', () => {
    const xml = feed()
    expect(xml).toContain('A dog &amp; a cat &lt;together&gt;')
    expect(xml).not.toContain('& a cat <together>')
  })

  it('uses the photo title, falling back to the file name', () => {
    expect(feed()).toContain('<title>Regal canine majesty</title>')
    expect(feed({ title: null })).toContain('<title>regal-canine-majesty</title>')
  })

  it('prefers webp for the enclosure and names the mime type', () => {
    const xml = feed()
    expect(xml).toContain('url="https://photos.test/photos/Image-x-webp.webp" type="image/webp"')
  })

  it('falls back to the thumbnail when there is no full size image', () => {
    const xml = feed({ webp: null })
    expect(xml).toContain('type="image/jpeg"')
    expect(xml).toContain('Image-x-thumbnail.jpg')
  })

  it('publishes the taken time in rfc 822', () => {
    expect(feed()).toContain('<pubDate>Wed, 01 May 2024 10:00:00 GMT</pubDate>')
  })

  it('lists tags as categories', () => {
    const xml = feed()
    expect(xml).toContain('<category>dog</category>')
    expect(xml).toContain('<category>berlin</category>')
  })

  it('keeps the item link and guid in sync', () => {
    const xml = feed()
    expect(xml).toContain('<link>https://photos.test/p/abc123</link>')
    expect(xml).toContain('<guid isPermaLink="true">https://photos.test/p/abc123</guid>')
  })
})
