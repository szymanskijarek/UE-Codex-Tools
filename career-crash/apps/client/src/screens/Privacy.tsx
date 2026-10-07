import { Card } from '../ui/components';

/** What the game keeps in this browser (every key starts with `cc.`). */
const STORED: [string, string][] = [
  ['Career save', 'Your character, squad, cash, items and feed (cc.career.v1), and the latest fight photo (cc.career.photo).'],
  ['Settings', 'Music, sound and action-replay switches (cc.music, cc.muted, cc.replays.v2).'],
  ['Sandbox grudges', 'Who knocked whom down in earlier Sandbox fights (cc.sandboxRivals).'],
  ['Online sign-in', 'A random device ID and a sign-in token for online play (cc.device, cc.token). No name, email or password.'],
];

/** Everything the game stored in this browser. */
function ourKeys(): string[] {
  try {
    return Object.keys(window.localStorage).filter((k) => k.startsWith('cc.'));
  } catch {
    return [];
  }
}

/** Privacy: what's stored where, that nothing tracks you, and how to wipe it. */
export function Privacy() {
  const wipe = () => {
    if (!window.confirm('Delete your career save, settings and sign-in from this browser? This can’t be undone.')) return;
    try {
      for (const k of ourKeys()) window.localStorage.removeItem(k);
    } catch {
      /* storage unavailable: nothing to delete */
    }
    // Start fresh, as on a first visit.
    window.location.hash = '#/';
    window.location.reload();
  };
  return (
    <section class="privacy">
      <h1>Privacy</h1>
      <p class="lead">Short version: no cookies, no tracking, no ads. Your game lives in your browser.</p>

      <Card>
        <h2>What's stored, and where</h2>
        <p>
          Career Crash saves your game in this browser's local storage, so it's still there next time. It never leaves your device unless you play online. It's
          only what the game needs to work, so there's nothing to accept.
        </p>
        <ul>
          {STORED.map(([what, detail]) => (
            <li>
              <b>{what}:</b> {detail}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2>What isn't</h2>
        <ul>
          <li>No cookies.</li>
          <li>No analytics, ads, trackers or third-party scripts. Fonts, music and art all come from this site.</li>
          <li>Fights are simulated on your device. Nobody sees your career unless you show them.</li>
        </ul>
      </Card>

      <Card>
        <h2>Online play</h2>
        <p>
          If you play online, our server keeps your device ID, the display name you choose, your fighters and your fight results, so other players can fight your
          team and you can see the reports. It's hosted on Cloudflare, which keeps standard request logs (such as IP addresses) for security. We don't sell or share
          any of it.
        </p>
      </Card>

      <Card>
        <h2>Diplomatic Incident likes</h2>
        <p>
          Liking a country at <a href="/incident/">/incident</a> (or from the career feed) stores, in this browser, a random vote token and the countries you liked
          this hour (incident:token, incident:likes:…). Our vote server keeps a one-way hash of the token next to the countries it liked, and deletes it two hours
          after the hour; only the totals per country are kept. Your network address is hashed with a salt that's never stored, held in memory to stop floods, and
          dropped within the hour. No accounts, no location: the country you like is the one you chose.
        </p>
      </Card>

      <Card>
        <h2>Delete it</h2>
        <p>Clear this site's data in your browser settings, or press the button: your career save, settings and sign-in are deleted from this browser straight away.</p>
        <button class="danger" onClick={wipe}>
          🗑 Delete everything from this browser
        </button>
      </Card>
    </section>
  );
}
