# 2609 Armchair Configurator

Interactive 3D furniture product configurator prototype by VREEL.

## Current prototype

- Browser-based 3D product viewer
- Four upholstery presets
- Matte and satin finish controls
- Orbit, zoom, reset, and auto-rotation controls
- Responsive desktop/mobile interface
- Current-selection summary
- Print/product-summary prototype
- Add-to-project interaction prototype

## Model limitation

The legacy armchair model contains a single mesh and material. Material presets therefore affect the complete chair. The production demo should use a model split into separately named materials such as `Upholstery`, `Accent`, and `Metal`.

## Run locally

Serve the repository over HTTP, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Model attribution

See [model/LICENSE.txt](model/LICENSE.txt). The current prototype model is retained from the earlier ArmchairViewer experiment and is used only as a temporary demo asset.
