import ffmpeg from 'fluent-ffmpeg'

export type VideoMetadata = {
  duration: number
  width: number
  height: number
}

export function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video')
      
      if (!videoStream) {
        reject(new Error('No video stream found'))
        return
      }

      const duration = metadata.format.duration || 0
      const width = videoStream.width || 0
      const height = videoStream.height || 0

      resolve({
        duration,
        width,
        height
      })
    })
  })
}