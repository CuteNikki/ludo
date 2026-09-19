'use client';

import type { MoveTimeSeconds, Player, PlayerColor, RoomSettings } from '@ludo/shared';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Check, Clock3, Dice6, Dices, Globe, Info, Palette, Repeat, Settings2, ShieldCheck, Sparkles, Swords, Target, UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';

import { onSolid, solidBg } from '@/components/room/player-color';
import { SegmentedControl } from '@/components/segmented-control';
import { TapTooltip } from '@/components/tap-tooltip';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
const MOVE_TIMES: MoveTimeSeconds[] = [15, 30, 45, 60];

interface LobbyPanelProps {
  me: Player | undefined;
  players: Player[];
  settings: RoomSettings;
  isHost: boolean;
  onProfileChange: (profile: { name: string; color: PlayerColor }) => void;
  onSettingsChange: (update: Partial<RoomSettings>) => void;
}

/** Everything you set up before the game starts: your name and color, and the host's room settings. */
export function LobbyPanel({ me, players, settings, isHost, onProfileChange, onSettingsChange }: LobbyPanelProps) {
  return (
    <div className='toy-card divide-y-3 divide-border/15 p-4 sm:p-5'>
      {me && <PlayerProfile player={me} players={players} onChange={onProfileChange} />}
      <LobbySettings settings={settings} isHost={isHost} onChange={onSettingsChange} />
    </div>
  );
}

function PlayerProfile({
  player,
  players,
  onChange,
}: {
  player: Player;
  players: Player[];
  onChange: (profile: { name: string; color: PlayerColor }) => void;
}) {
  const { t } = useTranslation();
  const [draftName, setDraftName] = useState(player.name);
  const onChangeRef = useRef(onChange);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setDraftName(player.name);
  }, [player.name]);

  useEffect(() => {
    // Skip autosaving while the field is blank - the server would just fall back to a default name,
    // and that fallback echoing back mid-edit would overwrite whatever the player is about to type.
    if (draftName === player.name || draftName.trim() === '') return;
    saveTimerRef.current = window.setTimeout(() => {
      onChangeRef.current({ name: draftName, color: player.color });
    }, 500);
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [draftName, player.color, player.name]);

  function commitName() {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    if (draftName.trim() === '') {
      setDraftName(player.name);
      return;
    }
    if (draftName !== player.name) onChangeRef.current({ name: draftName, color: player.color });
  }

  const colorNames: Record<PlayerColor, string> = {
    red: t('room.colors.red'),
    blue: t('room.colors.blue'),
    green: t('room.colors.green'),
    yellow: t('room.colors.yellow'),
  };

  return (
    <section className='pb-5'>
      <h2 className='mb-3 flex items-center gap-2 font-display text-2xl'>
        <UserRound size={22} strokeWidth={2.5} /> {t('room.profile.title')}
      </h2>
      <Input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        maxLength={24}
        aria-label={t('room.profile.nameAria')}
      />

      <div className='mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
        <span className='flex items-center gap-2 text-sm font-extrabold'>
          <Palette size={18} strokeWidth={2.5} /> {t('room.profile.color')}
        </span>
        <div className='flex gap-2.5' role='group' aria-label={t('room.profile.colorGroupAria')}>
          {COLORS.map((color) => {
            const occupied = players.some((candidate) => candidate.id !== player.id && candidate.color === color);
            const selected = player.color === color;
            return (
              <button
                key={color}
                type='button'
                disabled={occupied}
                onClick={() => onChange({ name: draftName, color })}
                aria-label={`${colorNames[color]}${occupied ? t('room.profile.occupiedSuffix') : ''}`}
                aria-pressed={selected}
                title={occupied ? `${colorNames[color]}${t('room.profile.occupiedSuffix')}` : colorNames[color]}
                className={cn(
                  'grid size-9 touch-manipulation place-items-center rounded-full border-3 border-border shadow-[inset_0_3px_0_rgb(255_255_255/0.4),0_3px_0_var(--shadow-color)] transition-[transform,box-shadow,opacity] hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:translate-y-0',
                  solidBg[color],
                  selected && 'scale-110',
                )}
              >
                {selected && <Check size={20} strokeWidth={4} className={onSolid[color]} aria-hidden='true' />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LobbySettings({ settings, isHost, onChange }: { settings: RoomSettings; isHost: boolean; onChange: (update: Partial<RoomSettings>) => void }) {
  const { t } = useTranslation();

  return (
    <section className='pt-5'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 font-display text-2xl'>
          <Settings2 size={22} strokeWidth={2.5} /> {t('room.settings.title')}
        </h2>
        {!isHost && (
          <span className='rounded-md border-2 border-border bg-background px-1.5 py-0.5 text-[10px] font-extrabold uppercase'>
            {t('room.settings.hostOnly')}
          </span>
        )}
      </div>

      <fieldset className='space-y-2'>
        <div>
          <legend className='mb-2 flex w-full items-center gap-2 text-sm font-extrabold'>
            <Clock3 size={17} strokeWidth={2.5} /> {t('room.settings.moveTime')}
            <InfoTooltip text={t('room.settings.moveTimeInfo')} />
          </legend>
          <SegmentedControl
            aria-label={t('room.settings.moveTimeGroupAria')}
            value={settings.moveTimeSeconds}
            onChange={(seconds) => onChange({ moveTimeSeconds: seconds })}
            options={MOVE_TIMES.map((seconds) => ({ value: seconds, label: `${seconds}s`, disabled: !isHost }))}
          />
        </div>

        <SettingToggle
          icon={<Sparkles size={18} strokeWidth={2.5} />}
          label={t('room.settings.autoMoves')}
          description={t('room.settings.autoMovesInfo')}
          checked={settings.automaticSingleMove}
          disabled={!isHost}
          onChange={(checked) => onChange({ automaticSingleMove: checked })}
        />
        <SettingToggle
          icon={<Dices size={18} strokeWidth={2.5} />}
          label={t('room.settings.fairDice')}
          description={t('room.settings.fairDiceInfo')}
          checked={settings.fairDice}
          disabled={!isHost}
          onChange={(checked) => onChange({ fairDice: checked })}
        />
        <SettingToggle
          icon={<Dice6 size={18} strokeWidth={2.5} />}
          label={t('room.settings.mustSpawnOnSix')}
          description={t('room.settings.mustSpawnOnSixInfo')}
          checked={settings.mustSpawnOnSix}
          disabled={!isHost}
          onChange={(checked) => onChange({ mustSpawnOnSix: checked })}
        />
        <SettingToggle
          icon={<Swords size={18} strokeWidth={2.5} />}
          label={t('room.settings.extraTurnOnCapture')}
          description={t('room.settings.extraTurnOnCaptureInfo')}
          checked={settings.extraTurnOnCapture}
          disabled={!isHost}
          onChange={(checked) => onChange({ extraTurnOnCapture: checked })}
        />
        <SettingToggle
          icon={<ShieldCheck size={18} strokeWidth={2.5} />}
          label={t('room.settings.safeStartSquares')}
          description={t('room.settings.safeStartSquaresInfo')}
          checked={settings.safeStartSquares}
          disabled={!isHost}
          onChange={(checked) => onChange({ safeStartSquares: checked })}
        />
        <SettingToggle
          icon={<Repeat size={18} strokeWidth={2.5} />}
          label={t('room.settings.threeTriesToLeaveYard')}
          description={t('room.settings.threeTriesToLeaveYardInfo')}
          checked={settings.threeTriesToLeaveYard}
          disabled={!isHost}
          onChange={(checked) => onChange({ threeTriesToLeaveYard: checked })}
        />
        <SettingToggle
          icon={<Target size={18} strokeWidth={2.5} />}
          label={t('room.settings.mustCapture')}
          description={t('room.settings.mustCaptureInfo')}
          checked={settings.mustCapture}
          disabled={!isHost}
          onChange={(checked) => onChange({ mustCapture: checked })}
        />
        <SettingToggle
          icon={<Globe size={18} strokeWidth={2.5} />}
          label={t('room.settings.isPublic')}
          description={t('room.settings.isPublicInfo')}
          checked={settings.isPublic}
          disabled={!isHost}
          onChange={(checked) => onChange({ isPublic: checked })}
        />
      </fieldset>
    </section>
  );
}

function SettingToggle({
  icon,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className='flex min-h-11 items-center justify-between gap-3'>
      <span className='flex min-w-0 flex-1 items-center gap-2 text-sm font-extrabold'>
        <span className={cn('flex min-w-0 items-center gap-2', disabled && 'opacity-60')}>
          {icon}
          <span className='min-w-0'>{label}</span>
        </span>
        <InfoTooltip text={description} />
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const { t } = useTranslation();

  return (
    <TapTooltip
      content={text}
      label={t('room.settings.title')}
      contentClassName='w-64'
      className='ml-auto grid size-8 shrink-0 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:bg-foreground/10 focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground'
    >
      <Info size={17} strokeWidth={2.5} />
    </TapTooltip>
  );
}
