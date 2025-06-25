
"use client";

import { useCallback } from 'react';

/**
 * A hook to play sound effects.
 * @param {string} src - The path to the sound file.
 * @param {object} [options] - Optional settings.
 * @param {number} [options.volume=1] - The volume of the sound.
 * @param {number} [options.playbackRate=1] - The playback rate of the sound.
 * @returns {function(): void} A function that plays the sound.
 */
export const useSound = (src, { volume = 1, playbackRate = 1 } = {}) => {
    const play = useCallback(() => {
        if (typeof window !== 'undefined' && src) {
            const audio = new Audio(src);
            audio.volume = volume;
            audio.playbackRate = playbackRate;
            
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // This can happen if autoplay is prevented by the browser,
                    // or if the sound file at the specified `src` is missing.
                    if (error.name === 'NotSupportedError') {
                         console.warn(`Could not play sound: ${src}. The file might be missing or in an unsupported format. Please ensure it exists in the /public directory.`);
                    } else {
                        console.error(`Audio play failed for ${src}:`, error);
                    }
                });
            }
        }
    }, [src, volume, playbackRate]);

    return play;
};
