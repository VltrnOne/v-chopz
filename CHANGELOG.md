# Changelog

## [1.1.0] - 2024 - 24-Hour Video Support

### Added
- Support for videos up to 24 hours long (50GB file size limit)
- Async job processing for long videos
- Real-time progress tracking with status polling
- Upload progress bar
- Split progress bar with percentage
- Job status endpoint (`/status/{job_id}`)
- Better duration formatting (hours:minutes:seconds)
- Improved file size display (KB, MB, GB)

### Changed
- Increased file size limit from 500MB to 50GB
- Video splitting now runs asynchronously
- Frontend polls for job status instead of waiting synchronously
- Better error handling for large file uploads

### Technical
- Added job status tracking (in-memory dictionary)
- Implemented async processing with thread pool executor
- Added progress tracking during video splitting
- Optimized ffmpeg encoding with 'fast' preset for long videos

## [1.0.0] - Initial Release

### Features
- Video upload and validation
- Split videos into 1-12 equal segments
- Automatic V-Chopz watermark
- Individual segment download
- ZIP download for all segments
- Clean, modern UI

