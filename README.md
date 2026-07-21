# BPR Automation — Panel

Frontend público del pipeline de carga de Market Share / BE / SISO a BigQuery.

- No tiene backend propio. `index.html` lee `status.json` (publicado desde la laptop
  que corre la automatización) y usa la API pública de GitHub para mostrar actividad.
- El formulario abre un [issue nuevo](../../issues) con label `comando` — eso es lo
  que la laptop local recoge y encola.
- El código real de la automatización (credenciales, loaders, config) vive en un
  repo **privado** aparte. Este repo nunca debe contener secretos.

Publicado con GitHub Pages desde `main` / `(root)`.
