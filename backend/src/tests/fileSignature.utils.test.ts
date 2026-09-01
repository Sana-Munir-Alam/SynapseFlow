import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { verifyPdfOrDocxSignature } from '../utils/fileSignature.utils'

function writeTempFile(bytes: number[]): string {
    const filePath = path.join(os.tmpdir(), `sig-test-${Date.now()}-${Math.random()}`)
    fs.writeFileSync(filePath, Buffer.from(bytes))
    return filePath
}

describe('verifyPdfOrDocxSignature', () => {
    let filesToClean: string[] = []

    afterEach(() => {
        filesToClean.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f))
        filesToClean = []
    })

    it('accepts a real PDF header when checked as PDF', () => {
        const file = writeTempFile([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // %PDF-1.4
        filesToClean.push(file)
        expect(verifyPdfOrDocxSignature(file, true)).toBe(true)
    })

    it('rejects an HTML file renamed and relabeled as a PDF', () => {
        const file = writeTempFile([...Buffer.from('<html><body>')])
        filesToClean.push(file)
        expect(verifyPdfOrDocxSignature(file, true)).toBe(false)
    })

    it('rejects a real PDF when checked as DOCX', () => {
        const file = writeTempFile([0x25, 0x50, 0x44, 0x46]) // %PDF
        filesToClean.push(file)
        expect(verifyPdfOrDocxSignature(file, false)).toBe(false)
    })

    it('accepts a docx with a correct zip-container signature', () => {
        const file = writeTempFile([0x50, 0x4b, 0x03, 0x04]) // PK..
        filesToClean.push(file)
        expect(verifyPdfOrDocxSignature(file, false)).toBe(true)
    })

    it('rejects a docx claim when the bytes are not a zip container', () => {
        const file = writeTempFile([0x00, 0x00, 0x00, 0x00])
        filesToClean.push(file)
        expect(verifyPdfOrDocxSignature(file, false)).toBe(false)
    })

    it('rejects an empty/truncated file', () => {
        const file = writeTempFile([])
        filesToClean.push(file)
        expect(verifyPdfOrDocxSignature(file, true)).toBe(false)
        expect(verifyPdfOrDocxSignature(file, false)).toBe(false)
    })
})