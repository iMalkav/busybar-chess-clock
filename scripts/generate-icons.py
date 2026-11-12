"""Generate original chess-rook app icons from explicit pixel grids."""
from pathlib import Path
import struct
import zlib


FRONT = [
    "XX.XX.XX",
    "XXXXXXXX",
    ".XXXXXX.",
    "..XXXX..",
    "..XXXX..",
    "..XXXX..",
    ".XXXXXX.",
    "XXXXXXXX",
]
BACK = [
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
    "XXXXXXXXXXX",
    ".XXXXXXXXX.",
    "..XXXXXXX..",
    "...XXXXX...",
    "...XXXXX...",
    "...XXXXX...",
    "..XXXXXXX..",
    ".XXXXXXXXX.",
    "XXXXXXXXXXX",
]
IVORY = [(128, 106, 74), (222, 198, 155), (255, 244, 209)]
WOOD = [(112, 71, 38), (180, 124, 69), (237, 184, 123)]


def png(path, grid, color):
    width, height = len(grid[0]), len(grid)
    pixels = b"".join(
        b"\0" + bytes(channel for x, mark in enumerate(row)
                        for channel in ((*color(x, y), 255) if mark == "X" else (0, 0, 0, 0)))
        for y, row in enumerate(grid)
    )

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(pixels, 9))
        + chunk(b"IEND", b"")
    )


if __name__ == "__main__":
    destination = Path(__file__).resolve().parents[1] / "src/appmeta"
    png(destination / "icon_front_8x8.png", FRONT,
        lambda x, y: (WOOD if y >= 6 else IVORY)[2 if x >= 5 or y == 0 else 0 if x <= 2 else 1])
    png(destination / "icon_back_11x11.png", BACK, lambda x, y: (136, 136, 136))
