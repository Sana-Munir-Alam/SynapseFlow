import fs from 'fs'

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46] // %PDF
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]  // PK.. — docx is a zip container

function matchesSignature(header: Buffer, signature: number[]): boolean {
    if (header.length < signature.length) return false
    return signature.every((byte, i) => header[i] === byte)
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