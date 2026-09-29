import type { ComponentChildren } from 'preact';
import { bundle } from '@cc/content';
import type { Character } from '@cc/game-rules';
import type { Wallet } from '@cc/protocol';
import { descOf, nameOf } from '../i18n';
import { PUPPET_DEFS, puppetUrl } from '../replay/puppet-art';
import { FACE_ATLAS, faceRect, type Emotion } from '../replay/face-art';

export function Money({ wallet }: { wallet: Wallet }) {
  return (
    <div class="wallet">
      <span title="Cash">💵 {wallet.cash}</span>
      <span title="Reputation">⭐ {wallet.rep}</span>
      <span title="Tickets (rated attacks)">🎟️ {wallet.tickets}</span>
    </div>
  );
}

export function CareerChip({ id, small }: { id: string; small?: boolean }) {
  const c = bundle.careers.find((x) => x.id === id);
  return (
    <span class={`chip${small ? ' small' : ''}`} style={{ background: c?.art.color ?? '#999', color: textOn(c?.art.color ?? '#999') }} title={descOf(id)}>
      {nameOf(id)}
    </span>
  );
}

export function CareerChain({ careers }: { careers: string[] }) {
  return (
    <div class="chain">
      {careers.map((c, i) => (
        <>
          {i > 0 && <span class="arrow">→</span>}
          <CareerChip id={c} small />
        </>
      ))}
    </div>
  );
}

export function textOn(bg: string): string {
  const n = parseInt(bg.replace('#', ''), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#1b1f2a' : '#ffffff';
}

export function Portrait({ c, size = 56, mood = 'neutral' }: { c: Pick<Character, 'appearance' | 'careers'>; size?: number; mood?: Emotion }) {
  const career = bundle.careers.find((x) => x.id === c.careers[c.careers.length - 1]);
  const fr = career ? faceRect(career.id, mood) : null;
  if (fr && FACE_ATLAS.url) {
    // Painted face (four emotions per career), cropped out of the face atlas.
    const S = Math.max(fr.w, fr.h) * 1.04;
    return (
      <svg class="portrait" width={size} height={size} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
        <svg x={(S - fr.w) / 2} y={(S - fr.h) / 2} width={fr.w} height={fr.h} viewBox={`${fr.x} ${fr.y} ${fr.w} ${fr.h}`}>
          <image href={FACE_ATLAS.url} width={FACE_ATLAS.w} height={FACE_ATLAS.h} />
        </svg>
      </svg>
    );
  }
  const body = career?.art.color ?? '#999999';
  const hat = career?.art.hat;
  const art = career ? PUPPET_DEFS[career.id] : undefined;
  const url = career ? puppetUrl(career.id) : null;
  const head = art?.parts.head;
  if (art && url && head) {
    // Career art: the sliced head sprite, cropped out of the atlas by a nested (clipping) svg.
    const S = Math.max(head.w, head.h) * 1.08;
    return (
      <svg class="portrait" width={size} height={size} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
        <svg x={(S - head.w) / 2} y={(S - head.h) / 2} width={head.w} height={head.h} viewBox={`${head.x} ${head.y} ${head.w} ${head.h}`}>
          <image href={url} width={art.w} height={art.h} />
        </svg>
      </svg>
    );
  }
  return (
    <svg class="portrait" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="14" y="40" width="36" height="26" rx="9" fill={body} stroke="#1b1f2a" stroke-width="3" />
      <circle cx="32" cy="27" r="15" fill={c.appearance.skin} stroke="#1b1f2a" stroke-width="3" />
      {c.appearance.hairStyle % 3 === 0 && <path d="M17 26 A15 15 0 0 1 47 26 Z" fill={c.appearance.hair} />}
      {c.appearance.hairStyle % 3 === 1 && <rect x="17" y="12" width="30" height="8" fill={c.appearance.hair} />}
      {c.appearance.hairStyle % 3 === 2 && (
        <g fill={c.appearance.hair}>
          <circle cx="22" cy="15" r="6" />
          <circle cx="42" cy="15" r="6" />
          <circle cx="32" cy="11" r="7" />
        </g>
      )}
      {hat && <rect x="16" y="6" width="32" height="9" rx="3" fill={hat} stroke="#1b1f2a" stroke-width="2.5" />}
      <circle cx="27" cy="28" r="2" fill="#1b1f2a" />
      <circle cx="37" cy="28" r="2" fill="#1b1f2a" />
      <path d="M26 35 Q32 39 38 35" stroke="#1b1f2a" stroke-width="2" fill="none" />
    </svg>
  );
}

export function Card({ children, class: cls, onClick }: { children: ComponentChildren; class?: string; onClick?: () => void }) {
  return (
    <div class={`card ${cls ?? ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <p class="empty">{children}</p>;
}
