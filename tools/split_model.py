"""Split a prepared GLB into GitHub-friendly static assets."""
import sys
import json
from pathlib import Path

source = Path(sys.argv[1])
destination = source.parent / 'desk-setup-parts'
destination.mkdir(exist_ok=True)
for stale in destination.glob('part-*.bin'):
    stale.unlink()
data = source.read_bytes()
parts = [data[i:i + 512_000] for i in range(0, len(data), 512_000)]
for index, part in enumerate(parts):
    (destination / f'part-{index:02d}.bin').write_bytes(part)
(destination / 'manifest.json').write_text(json.dumps({'parts': len(parts)}), encoding='utf-8')
print(f'{len(parts)} parts from {len(data)} bytes')
