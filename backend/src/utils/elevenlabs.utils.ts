import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import env from '../config/env'
const elevenlabs = env.ELEVENLABS_API_KEY ? new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY }) : null
export async function generateSpeech(text: string, languageCode: string): Promise<Uint8Array> {
    if (!elevenlabs || !env.ELEVENLABS_VOICE_ID) throw new Error('TTS is not configured on this server')
    const audio = await elevenlabs.textToSpeech.convert(env.ELEVENLABS_VOICE_ID, { text, modelId: 'eleven_v3', languageCode, outputFormat: 'mp3_44100_128' })
    const chunks: Uint8Array[] = []
    for await (const chunk of audio) chunks.push(chunk)
    const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }
    return result
}