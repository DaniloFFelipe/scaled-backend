/** biome-ignore-all lint/suspicious/noConsole: I know */
/** biome-ignore-all lint/correctness/useParseIntRadix: I know */
/** biome-ignore-all lint/suspicious/noExplicitAny: I know */

import { randomUUID as uuidv4 } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';

type Resolution = {
  name: string;
  height: number;
  bitrate: string;
};

type ConversionResult =
  | {
      success: true;
      outputDir: string;
      masterPlaylist: string;
    }
  | {
      success: false;
      error: string;
    };

type VideoInfo = {
  width: number;
  height: number;
  duration: number;
};

class VideoToHLSConverter {
  private readonly tmpDir: string;
  private readonly resolutions: Resolution[] = [
    { name: '360p', height: 360, bitrate: '800k' },
    { name: '480p', height: 480, bitrate: '1400k' },
    { name: '720p', height: 720, bitrate: '2800k' },
    { name: '1080p', height: 1080, bitrate: '5000k' },
  ];

  constructor() {
    this.tmpDir = path.join(process.cwd(), 'tmp');
  }

  /**
   * Ensures the tmp directory exists
   */
  private async ensureTmpDir(): Promise<void> {
    try {
      await fs.access(this.tmpDir);
    } catch {
      await fs.mkdir(this.tmpDir, { recursive: true });
    }
  }

  /**
   * Gets video information using fluent-ffmpeg
   */
  private getVideoInfo(videoUrl: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoUrl, (err: any, metadata: any) => {
        if (err) {
          reject(new Error(`Failed to probe video: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(
          (stream: any) => stream.codec_type === 'video'
        );

        if (!(videoStream?.width && videoStream?.height)) {
          reject(new Error('No video stream found or missing dimensions'));
          return;
        }

        resolve({
          width: videoStream.width,
          height: videoStream.height,
          duration: metadata.format.duration || 0,
        });
      });
    });
  }

  /**
   * Calculates width maintaining aspect ratio
   */
  private calculateWidth(
    originalWidth: number,
    originalHeight: number,
    targetHeight: number
  ): number {
    const aspectRatio = originalWidth / originalHeight;
    const width = Math.round(targetHeight * aspectRatio);
    // Ensure width is even (required by some encoders)
    return width % 2 === 0 ? width : width - 1;
  }

  /**
   * Converts video to specific resolution using fluent-ffmpeg
   */
  private async convertToResolution(
    videoUrl: string,
    resolution: Resolution,
    originalDimensions: { width: number; height: number },
    outputDir: string
  ): Promise<void> {
    const targetWidth = this.calculateWidth(
      originalDimensions.width,
      originalDimensions.height,
      resolution.height
    );

    const outputPath = path.join(outputDir, resolution.name);
    await fs.mkdir(outputPath, { recursive: true });

    const playlistPath = path.join(outputPath, 'playlist.m3u8');
    const segmentPattern = path.join(outputPath, 'segment_%03d.ts');

    return new Promise((resolve, reject) => {
      const command = ffmpeg(videoUrl)
        .videoCodec('libx264')
        .audioCodec('aac')
        .addOptions([
          '-preset medium',
          '-crf 23',
          `-maxrate ${resolution.bitrate}`,
          `-bufsize ${Number.parseInt(resolution.bitrate) * 2}k`,
          `-vf scale=${targetWidth}:${resolution.height}`,
          '-hls_time 6',
          '-hls_playlist_type vod',
          `-hls_segment_filename ${segmentPattern}`,
          '-f hls',
        ])
        .output(playlistPath)
        .on('start', (commandLine: any) => {
          console.log(`[${resolution.name}] Starting conversion...`);
          console.log(`[${resolution.name}] Command: ${commandLine}`);
        })
        .on('progress', (progress: any) => {
          if (progress.percent) {
            console.log(
              `[${resolution.name}] Progress: ${Math.round(progress.percent)}%`
            );
          }
        })
        .on('end', () => {
          console.log(`✅ ${resolution.name} conversion completed`);
          resolve();
        })
        .on('error', (err, _stdout, stderr) => {
          console.error(`[${resolution.name}] Error:`, err.message);
          if (stderr) {
            console.error(`[${resolution.name}] Stderr:`, stderr);
          }
          reject(
            new Error(
              `Conversion failed for ${resolution.name}: ${err.message}`
            )
          );
        });

      command.run();
    });
  }

  /**
   * Creates master playlist
   */
  private async createMasterPlaylist(
    outputDir: string,
    originalDimensions: { width: number; height: number },
    validResolutions: Resolution[]
  ): Promise<string> {
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    for (const resolution of validResolutions) {
      const targetWidth = this.calculateWidth(
        originalDimensions.width,
        originalDimensions.height,
        resolution.height
      );

      const bandwidth = Number.parseInt(resolution.bitrate) * 1000;
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${targetWidth}x${resolution.height},NAME="${resolution.name}"\n`;
      content += `${resolution.name}/playlist.m3u8\n\n`;
    }

    await fs.writeFile(masterPlaylistPath, content);
    return masterPlaylistPath;
  }

  /**
   * Validates if video URL is accessible
   */
  private validateVideoUrl(videoUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const command = ffmpeg(videoUrl)
        .addOptions(['-t 1', '-f null'])
        .output('-')
        .on('end', () => resolve(true))
        .on('error', () => resolve(false));

      command.run();
    });
  }

  /**
   * Main conversion function
   */
  async convertVideoToHLS(videoUrl: string): Promise<ConversionResult> {
    try {
      console.log('🚀 Starting video conversion to HLS...');
      console.log(`📹 Video URL: ${videoUrl}`);

      // Ensure tmp directory exists
      await this.ensureTmpDir();

      // Validate video URL
      console.log('🔍 Validating video URL...');
      const isValid = await this.validateVideoUrl(videoUrl);
      if (!isValid) {
        throw new Error('Video URL is not accessible or invalid');
      }

      // Create unique output directory
      const sessionId = uuidv4();
      const outputDir = path.join(this.tmpDir, `hls_${sessionId}`);
      await fs.mkdir(outputDir, { recursive: true });
      console.log(`📁 Output directory: ${outputDir}`);

      console.log('📐 Getting video information...');
      const videoInfo = await this.getVideoInfo(videoUrl);
      console.log(
        `Original dimensions: ${videoInfo.width}x${videoInfo.height}`
      );
      console.log(`Duration: ${Math.round(videoInfo.duration)}s`);

      // Filter resolutions that are smaller than or equal to original height
      const validResolutions = this.resolutions.filter(
        (res) => res.height <= videoInfo.height
      );

      if (validResolutions.length === 0) {
        throw new Error(
          `Video resolution (${videoInfo.height}p) is too small for any target resolutions`
        );
      }

      console.log(
        `🎬 Converting to ${validResolutions.length} resolutions: ${validResolutions.map((r) => r.name).join(', ')}`
      );

      // Convert all resolutions concurrently
      const conversionPromises = validResolutions.map((resolution) =>
        this.convertToResolution(videoUrl, resolution, videoInfo, outputDir)
      );

      await Promise.all(conversionPromises);

      console.log('📝 Creating master playlist...');
      const masterPlaylistPath = await this.createMasterPlaylist(
        outputDir,
        videoInfo,
        validResolutions
      );

      // Verify all files were created
      const verificationPromises = validResolutions.map(async (resolution) => {
        const playlistPath = path.join(
          outputDir,
          resolution.name,
          'playlist.m3u8'
        );
        try {
          await fs.access(playlistPath);
          return true;
        } catch {
          throw new Error(`Playlist not found for ${resolution.name}`);
        }
      });

      await Promise.all(verificationPromises);

      console.log('✅ Conversion completed successfully!');
      console.log(`🎯 Master playlist: ${masterPlaylistPath}`);

      return {
        success: true,
        outputDir,
        masterPlaylist: masterPlaylistPath,
      };
    } catch (error) {
      console.error('❌ Conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cleanup function to remove temporary files
   */
  async cleanup(outputDir: string): Promise<void> {
    try {
      if (outputDir.includes('hls_')) {
        await fs.rm(outputDir, { recursive: true, force: true });
        console.log('🧹 Cleanup completed');
      }
    } catch (error) {
      console.error('Failed to cleanup:', error);
    }
  }

  /**
   * Get conversion progress (can be used for monitoring)
   */
  async getConversionInfo(outputDir: string): Promise<{
    resolutions: string[];
    segmentCounts: Record<string, number>;
    totalSize: number;
  }> {
    try {
      const entries = await fs.readdir(outputDir);

      // Process all entries concurrently
      const entryResults = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(outputDir, entry);
          const stat = await fs.stat(entryPath);

          if (
            stat.isDirectory() &&
            this.resolutions.some((r) => r.name === entry)
          ) {
            // Count segments and calculate directory size concurrently
            const segmentDir = await fs.readdir(entryPath);
            const segments = segmentDir.filter((file) => file.endsWith('.ts'));

            const fileSizes = await Promise.all(
              segmentDir.map(async (file) => {
                const filePath = path.join(entryPath, file);
                const fileStat = await fs.stat(filePath);
                return fileStat.size;
              })
            );

            const directorySize = fileSizes.reduce(
              (sum, size) => sum + size,
              0
            );

            return {
              resolution: entry,
              segmentCount: segments.length,
              size: directorySize,
            };
          }

          return null;
        })
      );

      // Filter out null results and build final response
      const validResults = entryResults.filter((result) => !!result) as Array<{
        resolution: string;
        segmentCount: number;
        size: number;
      }>;

      const resolutions = validResults.map((result) => result.resolution);
      const segmentCounts = validResults.reduce(
        (acc, result) => {
          acc[result.resolution] = result.segmentCount;
          return acc;
        },
        {} as Record<string, number>
      );
      const totalSize = validResults.reduce(
        (sum, result) => sum + result.size,
        0
      );

      return { resolutions, segmentCounts, totalSize };
    } catch (error) {
      console.error('Failed to get conversion info:', error);
      return { resolutions: [], segmentCounts: {}, totalSize: 0 };
    }
  }
}

// Main export function
export async function convertVideoToHLS(
  videoUrl: string
): Promise<ConversionResult> {
  const converter = new VideoToHLSConverter();
  return await converter.convertVideoToHLS(videoUrl);
}

// Export class for advanced usage
export { VideoToHLSConverter };

// Example usage with error handling and cleanup:
/*
async function example() {
  const videoUrl = 'https://example.com/video.mp4';
  
  try {
    const result = await convertVideoToHLS(videoUrl);
    
    if (result.success) {
      console.log('✅ Conversion successful!');
      console.log('📁 Output directory:', result.outputDir);
      console.log('📋 Master playlist:', result.masterPlaylist);
      
      // Get conversion info
      const converter = new VideoToHLSConverter();
      const info = await converter.getConversionInfo(result.outputDir);
      console.log('📊 Conversion info:', info);
      
      // Optional: cleanup after serving files
      // await converter.cleanup(result.outputDir);
    } else {
      console.error('❌ Conversion failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}
*/
