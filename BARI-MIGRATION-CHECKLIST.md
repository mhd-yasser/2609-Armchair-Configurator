# ORKA BARI public-demo migration — staging checklist

This branch stages the BARI viewer and configuration without the experimental admin/control panel. **Do not merge until all checks below pass.**

## Required binary assets (copy byte-for-byte from `mhd-yasser/VREEL-E-Catalogue-Preview` at the same paths)
- `catalogue/orka/bari/model.glb` — SHA-256: `be2bd6daa6177e5bd612ca9aac241155638ec28341fecb9e62cf164fc51071c8`
- `catalogue/orka/bari/photo.png` — SHA-256: `d1dc49113992dc7047a36849ea9eecb513b74641843fc8690907c65542d90d17`
- `catalogue/orka/bari/source.zip` — SHA-256: `aefcb5a051624c1b96444080e964b7d14b0278a7df24854d60d0dcb54b0064f5`

The linked GitHub connector returns empty content for binary blobs, so these three cannot be copied safely using the current integration. The archive is explicitly intended as the present 3D download; future manufacturer-selected files will replace it.

## Verify before merging
1. Confirm JS dependencies and stylesheet requests are HTTP 200, with no runtime console errors.
2. BARI 100/85/65, cabinet/mirror conditional compatibility, finishes, drawer and door animations and dimensions.
3. Mobile wall AR, rotation/placement/scale. Verify supported and unsupported browser messaging.
4. A4 PDF, images, 4K button. The AI render flow is an experimental prototype, not a production AI service.
5. `3D İndir` requires visitor contact form and offers **only the ZIP archive for BARI**, not an export of current material selection.
6. Confirm the form only validates in-browser; it does **not** capture/send/store lead information. Don't imply lead capture is active.
7. Confirm no preview control panel/admin link or editing route is published; existing desk/chair/sofa pages still work.
8. Test the full site from a preview deployment before merging to `main`.

Production `main` and its CNAME are intentionally unchanged.
