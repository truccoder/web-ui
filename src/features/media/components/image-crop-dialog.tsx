'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button, Dialog } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cropImageFile, type PixelCrop } from '../lib/crop-image';

/**
 * The pan/zoom crop step, factored out of `MediaUploader` so a caller that uploads through its
 * own endpoint (the avatar, `PUT /profile/picture`) can reuse it — it takes a `File` and hands
 * back a cropped `File`, never touching the media store.
 *
 * THE INNER PANEL MOUNTS ONLY WHILE A FILE IS SET. That is deliberate: the object URL is then
 * created once in a lazy `useState` initialiser and revoked in an unmount cleanup, with no
 * `setState` inside an effect (which `react-hooks/set-state-in-effect` rejects) and no stale crop
 * position carried from the previous image.
 */
export interface ImageCropDialogProps {
  /** The picked file. `null` closes the dialog. */
  file: File | null;
  /** Target aspect ratio. @default 1 */
  aspect?: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

export function ImageCropDialog({ file, aspect = 1, onCancel, onCropped }: ImageCropDialogProps) {
  const t = useT();
  return (
    <Dialog open={file != null} onClose={onCancel} title={t('mediaUploader.cropTitle')} width={480}>
      {file && <CropPanel file={file} aspect={aspect} onCancel={onCancel} onCropped={onCropped} />}
    </Dialog>
  );
}

function CropPanel({
  file,
  aspect,
  onCancel,
  onCropped,
}: {
  file: File;
  aspect: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const t = useT();
  const [src] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<PixelCrop | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const confirm = async () => {
    if (!area) return;
    setWorking(true);
    try {
      onCropped(await cropImageFile(file, area));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--nx-space-element)]">
      <div className="relative h-64 w-full overflow-hidden rounded-nx-sm bg-nx-surface-inverse">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_a: Area, pixels: Area) => setArea(pixels)}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('mediaUploader.cropCancel')}
        </Button>
        <Button size="sm" loading={working} onClick={confirm}>
          {t('mediaUploader.cropConfirm')}
        </Button>
      </div>
    </div>
  );
}
