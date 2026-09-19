'use client';

import { useSound } from '@/components/providers/sound';
import { cn } from '@/lib/utils';
import type { GameState, Piece, PlayerColor } from '@ludo/shared';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type Coordinate,
  getCellColor,
  getCellPosition,
  getPieceCoordinate,
  getYardColor,
  isPathCoordinate,
  isStartCoordinate,
  key,
} from './board-geometry';
import { usePieceAnimations } from './use-piece-animations';

const colorStyles: Record<PlayerColor, { base: string; marker: string; pale: string; start: string; token: string; mat: string }> = {
  red: {
    base: 'bg-p-red',
    marker: 'border-p-red',
    pale: 'bg-p-red-soft',
    start: 'bg-background-alternative before:absolute before:inset-1 before:rounded-sm before:border-4 before:border-p-red before:content-[""]',
    token: 'bg-p-red border-p-red-deep',
    mat: 'bg-p-red',
  },
  blue: {
    base: 'bg-p-blue',
    marker: 'border-p-blue',
    pale: 'bg-p-blue-soft',
    start: 'bg-background-alternative before:absolute before:inset-1 before:rounded-sm before:border-4 before:border-p-blue before:content-[""]',
    token: 'bg-p-blue border-p-blue-deep',
    mat: 'bg-p-blue',
  },
  green: {
    base: 'bg-p-green',
    marker: 'border-p-green',
    pale: 'bg-p-green-soft',
    start: 'bg-background-alternative before:absolute before:inset-1 before:rounded-sm before:border-4 before:border-p-green before:content-[""]',
    token: 'bg-p-green border-p-green-deep',
    mat: 'bg-p-green',
  },
  yellow: {
    base: 'bg-p-yellow',
    marker: 'border-p-yellow',
    pale: 'bg-p-yellow-soft',
    start: 'bg-background-alternative before:absolute before:inset-1 before:rounded-sm before:border-4 before:border-p-yellow before:content-[""]',
    token: 'bg-p-yellow border-p-yellow-deep',
    mat: 'bg-p-yellow',
  },
};

interface GameBoardProps {
  state: GameState;
  playerId: string;
  onMove: (pieceId: string) => void;
  /** Size the board from outside (it fills its container's width by default and stays square). */
  className?: string;
}

export function GameBoard({ state, playerId, onMove, className }: GameBoardProps) {
  const { t } = useTranslation();
  const { play } = useSound();
  const activeColor = state.phase === 'playing' ? (state.players.find((player) => player.id === state.currentPlayerId)?.color ?? null) : null;
  const [preview, setPreview] = useState<{ pieceId: string; revision: number } | null>(null);
  const { animations, clearAnimation, registerNode } = usePieceAnimations(state);

  const piecesByCell = new Map<string, Piece>();
  const positionedPieces: Array<{ piece: Piece; owner: GameState['players'][number]; coordinate: Coordinate; movable: boolean }> = [];

  const previewPiece =
    preview?.revision === state.revision && state.movablePieceIds.includes(preview.pieceId)
      ? state.pieces.find((piece) => piece.id === preview.pieceId)
      : undefined;
  const previewOwner = previewPiece ? state.players.find((player) => player.id === previewPiece.playerId) : undefined;
  const previewCoordinate =
    previewPiece && previewOwner && state.diceResult !== null
      ? getPieceCoordinate({ ...previewPiece, position: previewPiece.position === -1 ? 0 : previewPiece.position + state.diceResult }, previewOwner.color, 0)
      : null;

  for (const player of state.players) {
    const pieces = state.pieces.filter((piece) => piece.playerId === player.id);
    pieces.forEach((piece) => {
      const originalIndex = parseInt(piece.id.split('-').pop() ?? '0', 10);
      const groundTruthCoordinate = getPieceCoordinate(piece, player.color, originalIndex);

      if (groundTruthCoordinate) {
        const coordinate = animations[piece.id]?.coordinate ?? groundTruthCoordinate;
        piecesByCell.set(key(groundTruthCoordinate), piece);
        positionedPieces.push({
          piece,
          owner: player,
          coordinate,
          movable: state.phase === 'playing' && state.turnStage === 'move' && state.movablePieceIds.includes(piece.id) && piece.playerId === playerId,
        });
      }
    });
  }

  return (
    // The mat around the board takes the color of whoever's turn it is, so it's readable at a glance
    // even when the turn panel is out of view.
    <div
      data-active-color={activeColor ?? undefined}
      className={cn(
        'aspect-square w-full rounded-2xl border-4 border-border p-1.5 shadow-[8px_8px_0_var(--shadow-color)] transition-colors duration-300 sm:p-2.5',
        activeColor ? colorStyles[activeColor].mat : 'bg-background-alternative',
        className,
      )}
    >
      <div
        className='relative grid h-full w-full grid-cols-11 grid-rows-11 gap-0.5 overflow-hidden rounded-lg border-3 border-border bg-border'
        aria-label={t('board.ariaLabel')}
      >
        {Array.from({ length: 121 }, (_, index) => {
          const coordinate: Coordinate = [Math.floor(index / 11), index % 11];
          const piece = piecesByCell.get(key(coordinate));
          const cellColor = getCellColor(coordinate);
          const isStart = cellColor !== null && isStartCoordinate(coordinate);
          const isPreviewTarget = previewCoordinate && key(previewCoordinate) === key(coordinate);

          return (
            <div
              key={key(coordinate)}
              data-cell-role={isStart ? 'start' : cellColor ? 'goal' : undefined}
              className={cn(
                'relative grid min-h-0 min-w-0 place-items-center rounded-[3px] transition-[filter,box-shadow] duration-180 ease-out',
                getCellStyle(coordinate, cellColor, isStart),
                isPreviewTarget && 'z-10 brightness-95',
              )}
            >
              {isPreviewTarget && !piece && previewOwner && (
                <span
                  className={cn(
                    'animate-destination-enter pointer-events-none grid h-[52%] w-[52%] place-items-center rounded-full border-[3px] bg-background-alternative/90 shadow-sm',
                    colorStyles[previewOwner.color].marker,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', colorStyles[previewOwner.color].base)} />
                </span>
              )}
            </div>
          );
        })}

        <div className='pointer-events-none absolute inset-0 z-20' aria-hidden='false'>
          {positionedPieces.map(({ piece, owner, coordinate, movable }) => {
            const animation = animations[piece.id];
            const isMoving = animation?.kind === 'moving';
            const flight = animation?.kind === 'spawning' || animation?.kind === 'capturing' ? animation : undefined;
            const isCaptureTarget = previewCoordinate && key(previewCoordinate) === key(coordinate) && previewPiece?.playerId !== piece.playerId;

            const activeAnimStyle = flight
              ? ({
                  '--capture-from-left': getCellPosition(flight.from[1]),
                  '--capture-from-top': getCellPosition(flight.from[0]),
                  '--capture-to-left': getCellPosition(flight.to[1]),
                  '--capture-to-top': getCellPosition(flight.to[0]),
                } as CSSProperties)
              : undefined;

            return (
              <div
                key={piece.id}
                ref={(node) => registerNode(piece.id, node)}
                className={cn(
                  'pointer-events-none absolute flex items-center justify-center',
                  isMoving || flight ? 'z-50' : 'z-10',
                  !animation && 'transition-[left,top] duration-200 ease-[cubic-bezier(0.22,0.8,0.25,1)] will-change-[left,top]',
                  flight?.kind === 'capturing' && 'animate-piece-capture-flight',
                  flight?.kind === 'spawning' && 'animate-piece-spawn-flight',
                )}
                style={{
                  width: 'calc((100% - 1.25rem) / 11)',
                  height: 'calc((100% - 1.25rem) / 11)',
                  left: getCellPosition(coordinate[1]),
                  top: getCellPosition(coordinate[0]),
                  ...activeAnimStyle,
                }}
                onAnimationEnd={(event) => {
                  if (flight?.kind === 'capturing' && event.animationName === 'piece-capture-flight') clearAnimation(piece.id, 'capturing');
                  if (flight?.kind === 'spawning' && event.animationName === 'piece-spawn-flight') clearAnimation(piece.id, 'spawning');
                }}
              >
                <button
                  type='button'
                  // The board plays its own sounds for pieces (a preview blip, then the move itself).
                  data-sound='none'
                  disabled={!movable}
                  onClick={() => {
                    if (!movable) return;
                    const alreadyPreviewing = preview?.pieceId === piece.id && preview.revision === state.revision;
                    if (alreadyPreviewing) {
                      setPreview(null);
                      onMove(piece.id);
                    } else {
                      // No real hover preceded this click - either a touch tap (pointerType checks
                      // below skip touch on purpose) or a keyboard click without prior focus - so
                      // show the preview first instead of moving immediately.
                      setPreview({ pieceId: piece.id, revision: state.revision });
                      play('preview');
                    }
                  }}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'mouse' || !movable) return;
                    setPreview({ pieceId: piece.id, revision: state.revision });
                    play('preview');
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'mouse') return;
                    setPreview(null);
                  }}
                  onFocus={(event) => {
                    // Only keyboard focus previews (tab to a piece, Enter confirms). Touching a button
                    // also focuses it on many touch devices, right before the click: previewing here
                    // would make that same click count as the confirming one and skip the preview.
                    if (movable && event.currentTarget.matches(':focus-visible')) setPreview({ pieceId: piece.id, revision: state.revision });
                  }}
                  onBlur={() => setPreview(null)}
                  aria-label={t(movable ? 'board.pieceAriaMovable' : 'board.pieceAria', { name: owner.name })}
                  className={cn(
                    'pointer-events-auto block w-[82%] h-auto aspect-square shrink-0 touch-manipulation rounded-full border-[3px] shadow-[inset_0_3px_0_rgba(255,255,255,.4),0_2px_0_var(--shadow-color)] transition-[transform,box-shadow,background-color,border-color] duration-200',
                    colorStyles[owner.color].token,
                    movable && 'animate-movable-piece cursor-pointer outline-4 outline-amber-300 hover:scale-110',
                    isCaptureTarget && 'scale-90 ring-4 ring-amber-300',
                    flight?.kind === 'capturing' && 'animate-piece-capture-token',
                  )}
                >
                  <span className='sr-only'>{owner.name}</span>
                </button>
                {isCaptureTarget && flight?.kind === 'capturing' && (
                  <span
                    className='pointer-events-none absolute -right-1.5 -top-1.5 z-30 grid h-4 w-4 place-items-center rounded-full border border-background-alternative bg-foreground text-[10px] font-black leading-none text-background shadow-sm'
                    aria-label={t('board.captureAria')}
                  >
                    ×
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getCellStyle(coordinate: Coordinate, color: PlayerColor | null, isStart: boolean): string {
  const [row, column] = coordinate;
  const yardColor = getYardColor(row, column);
  const isCenter = row >= 4 && row <= 6 && column >= 4 && column <= 6 && !isPathCoordinate(coordinate) && !color;

  if (color) return isStart ? colorStyles[color].start : colorStyles[color].base;
  if (isPathCoordinate(coordinate)) return 'bg-background-alternative';
  if (isCenter) return 'bg-foreground/10';
  if (yardColor) return colorStyles[yardColor].pale;
  return 'bg-background';
}
