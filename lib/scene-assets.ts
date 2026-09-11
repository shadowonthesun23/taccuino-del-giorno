export const SCENE_ASSET_BUCKET = 'scene-studio';
export const SCENE_ASSET_MAX_BYTES = 1024 * 1024;
export const SCENE_ASSET_MIME_TYPES = ['image/png', 'image/webp'] as const;

export function validateSceneAssetUpload(file: { size: number; type: string; name: string }) {
  if (!SCENE_ASSET_MIME_TYPES.includes(file.type as (typeof SCENE_ASSET_MIME_TYPES)[number])) return { ok: false as const, error: 'Sono ammessi soltanto PNG e WebP.' };
  if (file.size < 1 || file.size > SCENE_ASSET_MAX_BYTES) return { ok: false as const, error: 'Il file deve essere inferiore a 1 MB.' };
  const extension = file.type === 'image/png' ? 'png' : 'webp';
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9 -]/g, '').trim().slice(0, 80) || 'Nuovo oggetto';
  return { ok: true as const, extension, name: baseName };
}

export function getSceneAssetUrl(asset: { source: 'bundled' | 'storage'; path: string }) {
  if (asset.source === 'bundled') return asset.path;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/storage/v1/object/public/${SCENE_ASSET_BUCKET}/${asset.path.split('/').map(encodeURIComponent).join('/')}` : '';
}

export function resolveSceneAssetUrl(asset: { source: 'bundled' | 'storage'; path: string } | undefined, fallbackPath: string) {
  if (!asset || (asset.source === 'bundled' && asset.path === fallbackPath)) return null;
  return getSceneAssetUrl(asset) || null;
}
