"""Extract device PCM sounds from the original WAV assets (Python standard library)."""

from pathlib import Path
import wave


def main():
    root = Path(__file__).resolve().parent.parent
    for source in sorted((root / "art" / "sounds").glob("*.wav")):
        with wave.open(str(source), "rb") as sound:
            if (sound.getnchannels(), sound.getsampwidth(), sound.getframerate(), sound.getcomptype()) != (
                1, 2, 44100, "NONE"
            ):
                raise ValueError(f"{source.name}: expected mono 16-bit PCM at 44100 Hz")
            pcm = sound.readframes(sound.getnframes())
        destination = root / "src" / "sounds" / source.with_suffix(".snd").name
        destination.write_bytes(pcm)
        print(f"{source.name} -> {destination.name}: {len(pcm)} bytes")


if __name__ == "__main__":
    main()
