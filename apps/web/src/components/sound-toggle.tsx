'use client';

import { useTranslation } from 'react-i18next';

import { Volume2, VolumeX } from 'lucide-react';

import { useSound } from '@/components/providers/sound';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';

/** `icon` for the desktop navbar; `segmented` spells it out for the mobile menu. */
export function SoundToggle({ layout = 'icon' }: { layout?: 'icon' | 'segmented' }) {
  const { enabled, setEnabled } = useSound();
  const { t } = useTranslation();

  if (layout === 'segmented')
    return (
      <SegmentedControl<'on' | 'off'>
        aria-label={t('sound.aria')}
        value={enabled ? 'on' : 'off'}
        onChange={(value) => setEnabled(value === 'on')}
        options={[
          {
            value: 'on',
            label: (
              <>
                <Volume2 size={16} /> {t('sound.on')}
              </>
            ),
          },
          {
            value: 'off',
            label: (
              <>
                <VolumeX size={16} /> {t('sound.off')}
              </>
            ),
          },
        ]}
      />
    );

  return (
    <Button
      variant='outline'
      size='icon'
      className='size-10'
      aria-pressed={enabled}
      aria-label={t(enabled ? 'sound.mute' : 'sound.unmute')}
      title={t(enabled ? 'sound.mute' : 'sound.unmute')}
      onClick={() => setEnabled(!enabled)}
    >
      {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </Button>
  );
}
