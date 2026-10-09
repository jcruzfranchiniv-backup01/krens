import type { ImageMetadata } from 'astro';

type Module = { default: ImageMetadata };

const modules = import.meta.glob<Module>('/src/assets/{photos,brand}/*.{jpg,jpeg,png,webp,avif,svg}', {
  eager: true,
});

const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split('/').pop() ?? '';
  byName.set(file.replace(/\.[^.]+$/, '').toLowerCase(), mod.default);
}

/** Busca por nombre sin extensión. Devuelve undefined si el cliente todavía no la cargó. */
export function findImage(name: string | undefined): ImageMetadata | undefined {
  return name ? byName.get(name.toLowerCase()) : undefined;
}
