# ORKA BARI deployment verification (2026-11-16)

- Binary files copied byte-for-byte from Preview into this repository and verified with SHA-256:
  - `catalogue/orka/bari/model.glb`
  - `catalogue/orka/bari/photo.png`
  - `catalogue/orka/bari/source.zip`
- GitHub Actions browser check passed ([run 43865554377](https://github.com/mhd-yasser/2609-Armchair-Configurator/actions/runs/43865554377)):
  - BARI model loaded and product title rendered; no console errors.
  - Visitor contact form displayed and the sole BARI download was `BARİ_3ds.zip`.
  - PDF preview opened successfully.
  - Existing desk/chair/sofa viewer pages opened with no browser console errors.
- Preview admin/control panel code was not transferred. Inactive dashboard/settings links were hidden from gallery.
- BARI's 4K AI prototype was copied as-is and is **not connected to a production AI API**.
- The contact form validates locally only; it does **not** store or send visitor details.
- **Mobile device physical AR interaction** (wall placement/anchor in actual camera) was not verified by the headless browser check, so a real-device smoke test is still recommended before marketing it as fully validated.
- Exact public domain deployment must be checked following merge of this branch.

Retain the preview repo as the editable experimental environment. Source archive downloads can later be replaced by a manufacturer-selected downloadable asset.
