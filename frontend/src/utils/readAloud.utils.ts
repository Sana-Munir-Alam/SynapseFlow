/*
    Converts Markdown into text suitable for speech synthesis.
    Code blocks are not read aloud. Each code block is replaced with a short natural sentence so the listener knows that code exists in the chat without hearing punctuation and programming syntax.
*/

const convertMathToSpeech = (math: string): string => {
    let text = math

    // Common LaTeX structures.
    text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 divided by $2')
    text = text.replace(/\\sqrt\{([^{}]+)\}/g, 'square root of $1')
    text = text.replace(/\\text\{([^{}]+)\}/g, '$1')

    // Superscripts.
    text = text.replace(/\^2\b/g, ' squared')
    text = text.replace(/\^3\b/g, ' cubed')
    text = text.replace(/\^([a-zA-Z0-9]+)/g, ' to the power of $1')
    text = text.replace(/\^\{([^{}]+)\}/g, ' to the power of $1')

    // Subscripts.
    text = text.replace(/_([a-zA-Z0-9]+)/g, ' sub $1')
    text = text.replace(/_\{([^{}]+)\}/g, ' sub $1')

    // Common mathematical operators.
    text = text.replace(/\\leq|\\le/g, ' less than or equal to ')
    text = text.replace(/\\geq|\\ge/g, ' greater than or equal to ')
    text = text.replace(/\\neq|\\ne/g, ' not equal to ')
    text = text.replace(/\\approx/g, ' approximately ')
    text = text.replace(/\\times/g, ' times ')
    text = text.replace(/\\cdot/g, ' times ')
    text = text.replace(/\\div/g, ' divided by ')
    text = text.replace(/\\pm/g, ' plus or minus ')

    // Greek letters commonly used in university material.
    text = text.replace(/\\alpha/g, ' alpha ')
    text = text.replace(/\\beta/g, ' beta ')
    text = text.replace(/\\gamma/g, ' gamma ')
    text = text.replace(/\\delta/g, ' delta ')
    text = text.replace(/\\theta/g, ' theta ')
    text = text.replace(/\\lambda/g, ' lambda ')
    text = text.replace(/\\mu/g, ' mu ')
    text = text.replace(/\\sigma/g, ' sigma ')
    text = text.replace(/\\pi/g, ' pi ')

    // Common mathematical notation.
    text = text.replace(/\\infty/g, ' infinity ')
    text = text.replace(/\\sum/g, ' sum ')
    text = text.replace(/\\int/g, ' integral ')
    text = text.replace(/\\log/g, ' log ')
    text = text.replace(/\\ln/g, ' natural log ')

    // Remove remaining LaTeX braces and commands.
    text = text.replace(/[{}]/g, '')
    text = text.replace(/\\([a-zA-Z]+)/g, '$1')

    // Make multiplication and comparison operators easier to speak.
    text = text.replace(/\*/g, ' times ')
    text = text.replace(/≤/g, ' less than or equal to ')
    text = text.replace(/≥/g, ' greater than or equal to ')
    text = text.replace(/≠/g, ' not equal to ')
    text = text.replace(/∞/g, ' infinity ')

    // Improve common Big-O notation.
    text = text.replace(/\bO\(([^)]+)\)/g, 'Big O of $1')

    return text.replace(/\s{2,}/g, ' ').trim()
}

export const extractReadableText = (markdown: string): string => {
    if (!markdown?.trim()) {
        return ''
    }

    let text = markdown

    // Replace fenced code blocks.
    text = text.replace(/```[\s\S]*?```/g, ' Code example shown in the chat. ')

    // Replace display math blocks first.
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => ` ${convertMathToSpeech(math)} `)

    // Replace inline math.
    text = text.replace(/\$([^$\n]+)\$/g, (_, math) => ` ${convertMathToSpeech(math)} `)

    // Replace inline code.
    text = text.replace(/`[^`]+`/g, ' Code shown in the chat. ')

    // Remove images but preserve useful alt text.
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')

    // Convert Markdown links into readable text.
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    // Remove headings.
    text = text.replace(/^#{1,6}\s+/gm, '')

    // Convert list markers.
    text = text.replace(/^\s*[-*+]\s+/gm, '')
    text = text.replace(/^\s*\d+\.\s+/gm, '')

    // Remove blockquotes.
    text = text.replace(/^>\s?/gm, '')

    // Remove common Markdown formatting markers.
    text = text.replace(/(\*\*|__|\*|_|~~)/g, '')

    // Remove horizontal rules.
    text = text.replace(/^[-*_]{3,}\s*$/gm, '')

    // Normalize whitespace.
    text = text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim()

    return text
}

/**
 * Detects whether text is primarily Urdu/Arabic-script so the speech
 * engine can be pointed at the right language instead of defaulting to
 * English and mispronouncing (or silently failing on) the Urdu text.
 */
export const detectSpeechLang = (text: string): 'ur-PK' | 'en-US' => {
    const arabicScriptChars = text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) ?? []
    const totalLetters = text.match(/[\p{L}]/gu) ?? []
    if (totalLetters.length === 0) return 'en-US'
    return arabicScriptChars.length / totalLetters.length > 0.3 ? 'ur-PK' : 'en-US'
}