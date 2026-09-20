"""Prepare the supplied desk GLB and Drive color maps for the web viewer.

Usage: python tools/prepare_assets.py '/path/to/Desk Setup.glb'
Place original Drive color JPGs under textures/source, named by the selected keys.
"""
import copy
import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image, ImageOps
from PIL import ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True


ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1])
OUTPUT = ROOT / 'model' / 'desk-setup-web.glb'

with SOURCE.open('rb') as source:
    magic, version, total = struct.unpack('<4sII', source.read(12))
    assert magic == b'glTF' and version == 2
    json_length, json_type = struct.unpack('<I4s', source.read(8))
    assert json_type == b'JSON'
    document = json.loads(source.read(json_length))
    bin_length, bin_type = struct.unpack('<I4s', source.read(8))
    assert bin_type == b'BIN\0'
    original_bin = source.read(bin_length)

# Each primitive gets a distinct material identity where its finish must be
# independent of visually similar finishes elsewhere in the model.
groups = {
    (0, 0): 'cabinet', (0, 4): 'cabinet',
    (1, 0): 'deskMetal', (2, 0): 'deskMetal', (4, 0): 'deskMetal', (6, 0): 'deskMetal',
    (1, 2): 'desktop', (2, 1): 'desktop', (4, 3): 'desktop', (6, 1): 'desktop',
    (3, 0): 'frontPanel', (5, 0): 'frontPanel', (7, 0): 'frontPanel',
    (8, 0): 'chairFabric', (8, 1): 'chairMetal', (8, 3): 'chairWood',
}
material_copies = {}
for (mesh_index, primitive_index), group in groups.items():
    primitive = document['meshes'][mesh_index]['primitives'][primitive_index]
    key = (group, primitive['material'])
    if key not in material_copies:
        material = copy.deepcopy(document['materials'][primitive['material']])
        material['name'] = 'VREEL_' + group + ('_fronts' if group == 'cabinet' and key[1] == 0 else '')
        material_copies[key] = len(document['materials'])
        document['materials'].append(material)
    primitive['material'] = material_copies[key]

# Rebuild buffer views instead of merely appending smaller images: leaving
# the original 3K images in the BIN chunk would defeat compression.
replacements = {}
for image in document['images']:
    view = image['bufferView']
    info = document['bufferViews'][view]
    raw = original_bin[info.get('byteOffset', 0):info.get('byteOffset', 0) + info['byteLength']]
    photo = Image.open(io.BytesIO(raw)).convert('RGB')
    photo.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    photo.save(buffer, format='JPEG', quality=82, optimize=True, progressive=True)
    replacements[view] = buffer.getvalue()

chunks = bytearray()
for index, view in enumerate(document['bufferViews']):
    old_offset = view.get('byteOffset', 0)
    raw = replacements.get(index)
    if raw is None:
        raw = original_bin[old_offset:old_offset + view['byteLength']]
    chunks.extend(b'\0' * (-len(chunks) % 4))
    view['byteOffset'] = len(chunks)
    view['byteLength'] = len(raw)
    chunks.extend(raw)
# Some painted boards have no UVs in the source. Add planar coordinates so
# wood finishes render on drawer fronts and front panel rather than a flat texel.
for (mesh_index, primitive_index), group in groups.items():
    primitive = document['meshes'][mesh_index]['primitives'][primitive_index]
    if group not in ('cabinet', 'frontPanel') or 'TEXCOORD_0' in primitive['attributes']:
        continue
    position = document['accessors'][primitive['attributes']['POSITION']]
    view = document['bufferViews'][position['bufferView']]
    if position['componentType'] != 5126:
        raise ValueError('Unexpected position component type')
    start = view['byteOffset'] + position.get('byteOffset', 0)
    stride = view.get('byteStride', 12)
    dimensions = [b - a for a, b in zip(position['min'], position['max'])]
    axes = sorted(range(3), key=lambda axis: dimensions[axis], reverse=True)[:2]
    uv = bytearray()
    for vertex in range(position['count']):
        xyz = struct.unpack_from('<3f', chunks, start + vertex * stride)
        values = [(xyz[axis] - position['min'][axis]) / max(dimensions[axis], .001) for axis in axes]
        uv.extend(struct.pack('<2f', *values))
    chunks.extend(b'\0' * (-len(chunks) % 4))
    document['bufferViews'].append({'buffer': 0, 'byteOffset': len(chunks), 'byteLength': len(uv), 'target': 34962})
    chunks.extend(uv)
    document['accessors'].append({'bufferView': len(document['bufferViews']) - 1, 'componentType': 5126,
                                  'count': position['count'], 'type': 'VEC2'})
    primitive['attributes']['TEXCOORD_0'] = len(document['accessors']) - 1
chunks.extend(b'\0' * (-len(chunks) % 4))
document['buffers'][0]['byteLength'] = len(chunks)
encoded = json.dumps(document, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
encoded += b' ' * (-len(encoded) % 4)
with OUTPUT.open('wb') as target:
    target.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(encoded) + 8 + len(chunks)))
    target.write(struct.pack('<I4s', len(encoded), b'JSON'))
    target.write(encoded)
    target.write(struct.pack('<I4s', len(chunks), b'BIN\0'))
    target.write(chunks)

for source in (ROOT / 'textures' / 'source').glob('*.jpg'):
    with Image.open(source) as photo:
        photo = ImageOps.exif_transpose(photo).convert('RGB')
        photo.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        photo.save(ROOT / 'textures' / source.name, 'JPEG', quality=81, optimize=True, progressive=True)

print(f'Web model: {OUTPUT.stat().st_size / 1048576:.1f} MiB; {len(replacements)} embedded maps reduced')
