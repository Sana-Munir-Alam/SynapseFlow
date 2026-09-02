/**
 * Builds a Content-Disposition header value that's safe against header
 * injection (a filename containing `"` or a newline can't break out of
 * the header) and correctly displays non-ASCII filenames — Urdu, Arabic,
 * Chinese, etc. — in modern browsers via the RFC 5987/6266 filename*
 * extended parameter, while still giving older clients an ASCII fallback.
 */
export function buildContentDisposition(filename: string, type: 'inline' | 'attachment' = 'inline'): string {
    // ASCII-only fallback for clients that don't understand filename*.
    // Strips control characters and anything non-ASCII, escapes quotes.
    const asciiFallback = filename
        .replace(/[\r\n]/g, '')
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\]/g, '_') || 'file'

    // The real filename, UTF-8 percent-encoded per RFC 5987's attr-char rules.
    // encodeURIComponent leaves !'()* unescaped, but RFC 5987 requires them
    // encoded too, so they're handled explicitly.
    const utf8Value = encodeURIComponent(filename)
        .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

    return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${utf8Value}`
}