type AudioEndListener = () => void
let currentAudio: HTMLAudioElement | null = null
let currentAudioUrl: string | null = null
let currentSpeakerId: string | number | null = null
let onEndListener: AudioEndListener | null = null
function revokeCurrentUrl() { if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null } }
/** Stops whatever is playing anywhere in the app — replicates the single-queue
 *  behavior window.speechSynthesis gave for free, now required manually since
 *  each chat message is its own independently-rendered component instance. */
export function stopAllSpeech() {
    if (currentAudio) { currentAudio.pause(); currentAudio.onended = null; currentAudio.onerror = null; currentAudio.src = '' }
    revokeCurrentUrl()
    const listener = onEndListener
    currentAudio = null
    currentSpeakerId = null
    onEndListener = null
    listener?.()
}
export function getCurrentSpeakerId(): string | number | null { return currentSpeakerId }
/** Plays a Blob as the single active playback in the app, stopping anything
 *  else first. `onEnd` fires when this specific playback finishes, errors,
 *  or is pre-empted by a newer one. */
export async function playSpeechBlob(speakerId: string | number, blob: Blob, onEnd: AudioEndListener): Promise<void> {
    stopAllSpeech()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio
    currentAudioUrl = url
    currentSpeakerId = speakerId
    onEndListener = onEnd
    audio.onended = () => { if (currentSpeakerId === speakerId) stopAllSpeech() }
    audio.onerror = () => { if (currentSpeakerId === speakerId) stopAllSpeech() }
    await audio.play()
}