/*
    Converts Markdown into text suitable for speech synthesis.
    Code blocks are not read aloud. Each code block is replaced with a short natural sentence so the listener knows that code exists in the chat without hearing punctuation and programming syntax.
 */
export const extractReadableText = (markdown: string): string => {
    if (!markdown?.trim()) {
        return ''
    }

    let text = markdown

    // Replace fenced code blocks.
    text = text.replace(/```[\s\S]*?```/g,' Code example shown in the chat. ')

    // Replace inline code.
    text = text.replace(/`[^`]+`/g, ' code ')

    // Remove images but preserve useful alt text.
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')

    // Convert Markdown links into readable text.
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')

    // Remove headings.
    text = text.replace(/^#{1,6}\s+/gm,'')

    // Convert list markers.
    text = text.replace(/^\s*[-*+]\s+/gm,'')

    text = text.replace(/^\s*\d+\.\s+/gm,'')

    // Remove blockquotes.
    text = text.replace(/^>\s?/gm,'')

    // Remove common Markdown formatting markers.
    text = text.replace(/(\*\*|__|\*|_|~~)/g,'')

    // Remove horizontal rules.
    text = text.replace(/^[-*_]{3,}\s*$/gm,'')

    // Normalize whitespace.
    text = text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim()

    return text
}