# Sistema de diseño del Admin (tema claro)

Marca: lima `#9AC31C` + azul marino `#0B2A4A`. Tipografías: Montserrat (UI) y Orbitron (`font-racing`, solo títulos y cifras).
Todo el estilo vive en `frontend-admin/tailwind.config.js` (colores) y `frontend-admin/src/index.css` (clases de componentes).

## Colores (Tailwind)
| Uso | Clases |
|---|---|
| Fondo de la app | `bg-canvas` |
| Tarjetas / superficies | `bg-surface` (blanco), `bg-surface-2` (gris muy claro, para bloques dentro de una tarjeta) |
| Bordes | `border-line`, `border-line-strong` |
| Texto | `text-ink` (principal), `text-ink-2` (secundario), `text-ink-muted` (ayudas, etiquetas) |
| Marca | `bg-brand`, `bg-brand-soft`, `text-brand-dark` (texto lima legible sobre blanco), `bg-navy`, `text-navy`, `bg-navy-soft` |
| Ciudades | Riobamba = sky (`sky-50/200/700`), Ambato = rose, Cuotas = amber, Kiosco histórico = fuchsia, Autos = lima |

## Clases de componente (index.css)
- Superficies: `card`, `card-pad`, `card-hover`, `panel-title`, `page-title`, `page-sub`, `section-label`
- Botones: `btn-primary` (acción principal, lima), `btn-navy`, `btn-ghost` (secundario con borde), `btn-soft`, `btn-danger`, `btn-danger-soft`, `btn-sm`, `btn-icon`
- Formularios: `input` (también para select y textarea), `label`, `help`
- Insignias: `badge-slate|lime|sky|rose|amber|fuchsia|green|red|navy`; chips de filtro: `chip` / `chip-active`
- Segmentos: `seg` + `seg-item` / `seg-item-active`
- Indicadores: `kpi`, `kpi-label`, `kpi-value`, `kpi-hint`
- Tablas: `table-wrap` + `table-base`
- Avisos: `notice-info|warn|danger|ok`
- Interruptor: `<button role="switch" aria-checked={on} className="switch"><span className="switch-dot"/></button>`
- Estados de carga: `skeleton`; animaciones: `anim-slide-up`, `anim-fade-in`, `anim-pop`

## Equivalencias para migrar código oscuro -> claro
| Antes (oscuro) | Ahora (claro) |
|---|---|
| `bg-black`, `bg-zinc-950`, `carbon-bg` | `bg-canvas` (página) o `bg-surface` (bloque) |
| `bg-zinc-900`, `brushed-metal`, `bg-zinc-900/80` (tarjeta) | `card card-pad` |
| `bg-zinc-950`/`bg-zinc-900` anidado dentro de una tarjeta | `bg-surface-2 border border-line rounded-xl` |
| `text-white` sobre fondo oscuro | `text-ink` |
| `text-white` sobre botón/insignia de color sólido oscuro | se conserva `text-white` |
| `text-zinc-200/300` | `text-ink-2` |
| `text-zinc-400/500/600` | `text-ink-muted` |
| `text-[#9AC31C]` como texto | `text-brand-dark` |
| `border-zinc-700/800` | `border-line-strong` / `border-line` |
| botón lima `bg-[#9AC31C] text-black` | `btn-primary` |
| inputs oscuros | `input` |
| avisos `bg-amber-950/60 border-amber-500/40 text-amber-200` | `notice-warn` (y análogos) |
| `font-racing` | se conserva para títulos y cifras |
| `select-none` en contenedores de datos | quitar (el texto debe poder copiarse) |

## Reglas
- Contraste: texto oscuro sobre fondo claro; nada de blanco sobre fondo claro.
- Botones táctiles de al menos 40 px de alto en móvil; textos de ayuda `text-xs` mínimo.
- Estados vacíos con un mensaje claro y, si aplica, la acción para resolverlo.
- Los textos de la interfaz van en español, claros y sin jerga técnica.
