# VREEL Desk Setup Configurator

A browser based 3D product configurator for the supplied Desk Setup.glb. The page uses model-viewer and works when served over HTTP.

## Finish controls

Seven independent groups: desktop, cabinet drawer fronts, desk metal, desk front panel, chair upholstery, chair wood, and chair metal. Each group has a separate panel; selecting a part in the model opens a paginated radial finish selector. Cabinet body wood follows wood selections on the cabinet, and retains its original finish when either solid MDF drawer-front option is selected.

Wood options include the original embedded wood plus four compressed Drive finishes. Upholstery options include the original plus eleven compressed Drive finishes. Desk and chair metal each offer matte black, matte white, satin aluminum, bright chrome, and bright gold. The site includes image export and an A4 selection sheet.

The previous placeholder models have been removed. The uploaded Desk Setup GLB provides one physical configuration: the new interface intentionally does not offer unverified sizes or drawer relocation.

## Run locally

```bash
python -m http.server 8000
```

Open http://localhost:8000. The model and texture URLs must be served from the same site.

## Regenerating assets

Place the original Drive color maps as JPGs under `textures/source/` using the short filenames used in `app.js`. Run:

```bash
python tools/prepare_assets.py '/path/to/Desk Setup.glb'
gltf-transform draco model/desk-setup-web.glb model/desk-setup-draco.glb --method edgebreaker
python tools/split_model.py model/desk-setup-draco.glb
```

This separates shared glTF materials, adds planar UVs to otherwise untextured drawer fronts and front panels, reduces embedded and optional color maps to 1024px, and compresses geometry. The original uploaded model is not included in the repo; the static binary parts rebuild the optimized model in the browser.
