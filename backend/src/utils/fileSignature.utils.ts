import fs from 'fs'

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46] // %PDF
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]  // PK.. — docx is a zip container

const WEBM_SIGNATURE = [0x1a, 0x45, 0xdf, 0xa3] // EBML
const OGG_SIGNATURE = [0x4f, 0x67, 0x67, 0x53] // OggS
const WAV_SIGNATURE = [0x52, 0x49, 0x46, 0x46] // RIFF
const FTYP_SIGNATURE = [0x66, 0x74, 0x79, 0x70] // ftyp at offset 4

// Checks whether a buffer matches a file signature at a specified byte offset.
// Defaults to offset 0, while supporting formats like MP4 whose signature starts later.
function matchesSignature( buffer: Buffer, signature: number[], offset = 0): boolean {
    if (buffer.length < offset + signature.length) return false
    return signature.every((byte, index) => buffer[offset + index] === byte)
}

/**
 * Verifies that an uploaded audio buffer has a recognizable container
 * signature matching one of the supported MediaRecorder output formats.
 *
 * This prevents blindly trusting the client-provided MIME type.
 */
export function verifyAudioSignature(buffer: Buffer, mimeType: string): boolean {
    // Reject empty or obviously invalid uploads immediately.
    if (!buffer || buffer.length < 12) { return false }
    const type = mimeType.toLowerCase().split(';')[0].trim()

    switch (type) {
        case 'audio/webm':
        case 'video/webm':
            return matchesSignature( buffer, WEBM_SIGNATURE )

        case 'audio/ogg':
        case 'application/ogg':
            return matchesSignature( buffer, OGG_SIGNATURE )

        case 'audio/wav':
        case 'audio/wave':
        case 'audio/x-wav':
            return matchesSignature( buffer, WAV_SIGNATURE )

        case 'audio/mp4':
        case 'audio/m4a':
        case 'video/mp4':
            return matchesSignature(buffer, FTYP_SIGNATURE, 4 )

        default: return false     // Unknown MIME type → reject.
    }
}

/**
 * Confirms the bytes on disk actually match the format the upload was
 * classified as, rather than trusting the client-supplied Content-Type
 * or filename extension alone.
 */
export function verifyPdfOrDocxSignature(filePath: string, isPdf: boolean): boolean {
    const fd = fs.openSync(filePath, 'r')
    const header = Buffer.alloc(4)
    fs.readSync(fd, header, 0, 4, 0)
    fs.closeSync(fd)

    return isPdf ? matchesSignature(header, PDF_SIGNATURE) : matchesSignature(header, ZIP_SIGNATURE)
}