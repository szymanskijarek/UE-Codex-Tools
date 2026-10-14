import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { bundle } from '@cc/content';
import { offerLabel, uiDue, unreadCount, type StoryThread } from '@cc/game-rules';
import { currentReplay, navigate, notify } from '../state';
import { Portrait } from '../ui/components';
import { PageHead } from './CoreActions';
import { storyArt, type StoryArt } from './story-art';
import { CRYPTO_URL, INCIDENT_URL, NEWS_URL } from './feed';

/** Link cards a message can carry (another show's page). */
const LINKS = {
  crypto: { href: CRYPTO_URL, title: 'Crypto Bros · careercrash.org/cryptobro', blurb: 'Watch the bros brawl live, every hour', art: '📈🥊' },
  incident: { href: INCIDENT_URL, title: 'Diplomatic Incident · careercrash.org/incident', blurb: 'Forty countries brawl live in the Summit Hall', art: '🔨🌍' },
  news: { href: NEWS_URL, title: 'Broken News · careercrash.org/news', blurb: 'Tonight on BSN', art: '📺🥊' },
};
import { menuSfx } from './menuVoice';
import { acceptGig, acceptOffer, career, rarityOf, declineGig, dismissPing, fireStoryBeat, readThread, replyStory, type CareerSave } from './model';

/**
 * Messages (12 §3): the career story, told like a networking site's inbox.
 * Threads with friends, recruiters and stranger contacts; canned replies;
 * invite-only gigs accepted (once) with a button in the thread; pop-ups when
 * something new arrives; and the runner that times the story's UI beats.
 */

/** How many feed posts the player has scrolled past (Hub sets it; scroll beats read it). */
export const feedSeen = signal(0);

function ago(fights: number, now: number): string {
  const n = now - fights;
  return n <= 0 ? 'Now' : `${n} fight${n === 1 ? '' : 's'} ago`;
}

function Avatar({ t, size }: { t: StoryThread; size: number }) {
  return t.who ? <Portrait c={t.who} size={size} /> : <span class={`li-logo-sq ${size < 40 ? 'sm' : ''}`}>{t.icon ?? '💬'}</span>;
}

function threadState(t: StoryThread): string {
  if (t.offer?.state === 'open') return '📜 Offer letter: pick a perk';
  if (t.gig?.state === 'open') return '📨 Invitation';
  if (t.gig?.state === 'accepted') return '🎬 Accepted';
  if (t.ask) return '💬 Waiting for your reply';
  return '';
}

export function MessagesScreen({ s, id }: { s: CareerSave; id?: string }) {
  const st = s.story;
  if (!st || !st.order.length) {
    return (
      <section>
        <PageHead back="/career" backLabel="Home" title="💬 Messaging" />
        <div class="li-card msg-empty">
          <p>No messages yet.</p>
          <p class="muted small">Nobody writes to an empty profile. Give it a few seconds.</p>
        </div>
      </section>
    );
  }
  const open = id && st.threads[id] ? st.threads[id] : undefined;
  return (
    <section class={`msg-page ${open ? 'has-thread' : ''}`}>
      <PageHead back={open ? '/career/messages' : '/career'} backLabel={open ? 'Messaging' : 'Home'} title="💬 Messaging" />
      <div class="msg-grid">
        <ul class="li-card msg-list">
          {st.order.map((tid) => {
            const t = st.threads[tid]!;
            const last = t.lines[t.lines.length - 1];
            const unread = t.lines.length > t.read || !!t.ask || t.gig?.state === 'open';
            return (
              <li key={tid}>
                <a href={`#/career/messages/${tid}`} class={`msg-row ${tid === id ? 'active' : ''} ${unread ? 'unread' : ''}`}>
                  <Avatar t={t} size={44} />
                  <span class="grow">
                    <b>{t.name}</b>
                    <span class="muted tiny"> · {ago(last?.fight ?? 0, st.fights)}</span>
                    <span class="msg-preview small">{threadState(t) || (last ? `${last.from === 'me' ? 'You: ' : ''}${last.art ? '📎 Attachment' : last.text}` : '')}</span>
                  </span>
                  {unread && <span class="msg-dot" aria-label="Unread" />}
                </a>
              </li>
            );
          })}
        </ul>
        {open ? <Thread s={s} t={open} /> : <div class="li-card msg-pick muted">Pick a conversation.</div>}
      </div>
    </section>
  );
}

/** Lines that arrived since the thread was last read appear one by one, each after a "typing…" pause. */
function Thread({ s, t }: { s: CareerSave; t: StoryThread }) {
  const [shown, setShown] = useState(t.read);
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => setShown(t.read), [t.id]);
  useEffect(() => {
    if (shown >= t.lines.length) {
      setTyping(false);
      readThread(s, t.id);
      return;
    }
    const next = t.lines[shown]!;
    if (next.from === 'me' || next.link) {
      setShown(shown + 1);
      return;
    }
    setTyping(true);
    const ms = next.art ? 900 : Math.min(1800, 500 + next.text.length * 12);
    const h = window.setTimeout(() => {
      setTyping(false);
      setShown(shown + 1);
    }, ms);
    return () => window.clearTimeout(h);
  }, [shown, t.lines.length, t.id]);
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [shown, typing]);
  const done = shown >= t.lines.length;
  const beat = t.ask ? bundle.story.find((b) => b.id === t.ask) : undefined;
  const gig = t.gig ? bundle.gigs.find((g) => g.id === t.gig!.id) : undefined;
  return (
    <div class="li-card msg-thread">
      <header class="msg-head">
        <Avatar t={t} size={48} />
        <div class="grow">
          <b>{t.name}</b>
          <div class="muted small">{t.sub}</div>
        </div>
      </header>
      <div class="msg-lines">
        {t.lines.slice(0, shown).map((l, i) => (
          <div key={i} class={`msg-line ${l.from}`}>
            {l.art ? (
              storyArt(l.art as StoryArt) && <img class="msg-attachment" src={storyArt(l.art as StoryArt)} alt="" />
            ) : l.link ? (
              <a class="li-linkcard msg-link" href={LINKS[l.link].href} {...(LINKS[l.link].href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
                <span class="li-linkcard-art" aria-hidden="true">
                  {LINKS[l.link].art}
                </span>
                <span>
                  <b>{LINKS[l.link].blurb}</b>
                  <small>{LINKS[l.link].title}</small>
                </span>
              </a>
            ) : (
              <div class="msg-bubble">{l.text}</div>
            )}
          </div>
        ))}
        {(typing || (done && t.typing)) && (
          <div class="msg-line them">
            <div class="msg-bubble msg-typing" aria-label={`${t.name} is typing`}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
      {done && beat?.replies && (
        <div class="msg-replies">
          {beat.replies.map((r, i) => (
            <button class="li-btn small" onClick={() => career.value && replyStory(career.value, t.id, i)}>
              {r.text}
            </button>
          ))}
        </div>
      )}
      {done && gig && t.gig?.state === 'open' && (
        <div class="msg-gig">
          <div class="small">
            <b>{gig.title}</b> · {bundle.locale[`${gig.arena}.name`] ?? gig.arena} · {gig.side === 'solo' ? 'You alone' : gig.side === 'cast' ? 'You + their crew' : 'You + your squad'} vs {gig.opponents.length} · 💵 {gig.pay.win}
          </div>
          <div class="msg-gig-note muted tiny">One-off invitation: it can be accepted once, here, and it won't come again.</div>
          <div class="row">
            <button
              class="li-btn primary"
              disabled={!!s.pending}
              title={s.pending ? 'Collect your last fight first' : undefined}
              onClick={() => {
                const cur = career.value;
                const input = cur && acceptGig(cur, gig.id);
                if (!input) return;
                currentReplay.value = { id: 'career', input, title: `Gig · ${gig.title}`, back: '/career/results' };
                navigate('/replay/career');
              }}
            >
              {gig.accept}
            </button>
            <button class="li-btn" onClick={() => career.value && declineGig(career.value, gig.id)}>
              {gig.decline}
            </button>
          </div>
        </div>
      )}
      {done && t.offer?.state === 'open' && (
        <div class="msg-gig msg-offer">
          <div class="small">
            <b>Pick one welcome perk.</b> <span class="muted">Only one, and it can't be swapped later.</span>
          </div>
          {t.offer.choices.map((c, i) => (
            <button
              class="li-btn msg-offer-pick"
              onClick={() => {
                const cur = career.value;
                if (!cur) return;
                const r = acceptOffer(cur, t.id, i);
                notify(r.text, r.ok ? 'good' : 'error');
              }}
            >
              {c.kind === 'hire' && <Portrait c={c.recruit} size={32} />}
              <span class="grow">
                <b>{offerLabel(c)}</b>
                <span class="muted tiny">
                  {c.kind === 'cash' ? 'Straight into your wallet.' : c.kind === 'perk' ? 'A perk for your bag, guaranteed at least that good.' : `${bundle.locale[`${c.recruit.careers[0]}.name`] ?? ''} · Lv ${c.recruit.level} · ${rarityOf(c.recruit)} applicant, no hiring fee.`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {t.gig?.state === 'accepted' && s.pending?.gig === t.gig.id && (
        <div class="msg-gig">
          <button class="li-btn primary" onClick={() => navigate('/career/results')}>
            📋 Collect the gig's results
          </button>
        </div>
      )}
    </div>
  );
}

/** New-message pop-ups, bottom-right (top on phones), at most two; tap to open, ✕ to dismiss. Not shown on Messaging itself. */
export function MessagePings({ s }: { s: CareerSave }) {
  const st = s.story;
  const seen = useRef<Set<string>>(new Set(st?.pings ?? []));
  const pings = (st?.pings ?? []).slice(0, 2);
  useEffect(() => {
    const fresh = pings.filter((id) => !seen.current.has(`${id}:${st?.threads[id]?.lines.length}`));
    if (fresh.length) menuSfx.play('ping');
    for (const id of pings) seen.current.add(`${id}:${st?.threads[id]?.lines.length}`);
  });
  if (!st || !pings.length) return null;
  return (
    <div class="msg-pings" role="status">
      {pings.map((id) => {
        const t = st.threads[id]!;
        const last = [...t.lines].reverse().find((l) => l.from === 'them' && !l.art);
        return (
          <div class="msg-ping" key={id}>
            <button class="msg-ping-open" onClick={() => navigate(`/career/messages/${id}`)}>
              <Avatar t={t} size={40} />
              <span class="grow">
                <b>{t.name}</b>
                <span class="small">{t.gig?.state === 'open' ? '📨 sent you an invitation' : last?.text}</span>
              </span>
            </button>
            <button class="ghost small msg-ping-x" aria-label="Dismiss" onClick={() => dismissPing(s, id)}>
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Times the story's UI beats while any career screen is open: idle waits,
 * the feed being scrolled (with a fallback), and replies left unanswered
 * (the first reply is picked after `fallbackMs`, so nothing ever blocks).
 */
export function StoryRunner({ s }: { s: CareerSave }) {
  const st = s.story;
  const key = st ? `${st.fired.length}:${Object.values(st.threads).map((t) => t.ask ?? '').join(',')}` : '';
  useEffect(() => {
    if (!st) return;
    const timers: number[] = [];
    const fire = (id: string) => career.value && fireStoryBeat(career.value, id);
    for (const b of uiDue(bundle, st)) {
      if (b.trigger.kind === 'idle') timers.push(window.setTimeout(() => fire(b.id), b.trigger.ms));
      else if (b.trigger.kind === 'scroll') timers.push(window.setTimeout(() => fire(b.id), b.trigger.fallbackMs));
    }
    for (const t of Object.values(st.threads)) {
      const beat = t.ask ? bundle.story.find((b) => b.id === t.ask) : undefined;
      if (beat?.fallbackMs) timers.push(window.setTimeout(() => career.value?.story?.threads[t.id]?.ask === beat.id && replyStory(career.value, t.id, 0), beat.fallbackMs));
    }
    return () => timers.forEach((h) => window.clearTimeout(h));
  }, [key]);
  // Scroll beats fire as soon as enough of the feed has been seen.
  const seen = feedSeen.value;
  useEffect(() => {
    if (!st) return;
    for (const b of uiDue(bundle, st)) if (b.trigger.kind === 'scroll' && seen >= b.trigger.posts) fireStoryBeat(s, b.id);
  }, [seen, key]);
  return null;
}

/** Unread conversations, for the nav badge. */
export function unreadMessages(s: CareerSave | null): number {
  return s?.story ? unreadCount(s.story) : 0;
}
