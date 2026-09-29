import { useEffect, useState } from 'preact/hooks';
import { Money } from './ui/components';
import { me, online, refreshMe, STANDALONE, toast } from './state';
import { Home } from './screens/Home';
import { Roster } from './screens/Roster';
import { CharacterScreen } from './screens/Character';
import { Fight } from './screens/Fight';
import { Replay } from './screens/Replay';
import { Reports } from './screens/Reports';
import { Office } from './screens/Office';
import { Sandbox } from './screens/Sandbox';
import { CareerScreen } from './career/Career';

function useRoute(): string[] {
  const read = () => (window.location.hash.replace(/^#\/?/, '') || (STANDALONE ? 'career' : 'home')).split('/');
  const [route, setRoute] = useState(read());
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

const TABS: [string, string, string][] = [
  ['home', '🏠', 'Home'],
  ['roster', '👥', 'Staff'],
  ['fight', '🥊', 'Fight'],
  ['reports', '📰', 'Reports'],
  ['office', '🏢', 'Office'],
  ['career', '🏆', 'Career'],
  ['sandbox', '🧪', 'Sandbox'],
];

export function App() {
  const route = useRoute();
  useEffect(() => {
    void refreshMe();
  }, []);
  const [page, arg, arg2] = route;
  let screen;
  switch (page) {
    case 'roster':
      screen = <Roster />;
      break;
    case 'character':
      screen = <CharacterScreen id={arg ?? ''} />;
      break;
    case 'fight':
      screen = <Fight />;
      break;
    case 'replay':
      screen = <Replay battleId={arg} />;
      break;
    case 'reports':
      screen = <Reports />;
      break;
    case 'office':
      screen = <Office />;
      break;
    case 'sandbox':
      screen = <Sandbox />;
      break;
    case 'career':
      screen = <CareerScreen sub={arg} arg={arg2} />;
      break;
    default:
      screen = <Home />;
  }
  const player = me.value?.player;
  return (
    <div class={`shell ${page === 'replay' ? 'wide' : ''}`}>
      <header class="topbar">
        <a class="logo" href="#/home">
          Career<span>Crash</span>
        </a>
        {player ? <Money wallet={player.wallet} /> : <span class="muted">{STANDALONE ? 'Offline' : online.value === 'offline' ? 'Offline — Sandbox only' : 'Connecting…'}</span>}
      </header>
      <main>{screen}</main>
      <nav class="tabs">
        {TABS.filter(([id]) => !STANDALONE || id === 'sandbox' || id === 'career').map(([id, icon, label]) => (
          <a key={id} href={`#/${id}`} class={page === id || (id === 'roster' && page === 'character') ? 'active' : ''}>
            <span class="icon">{icon}</span>
            <span>{label}</span>
          </a>
        ))}
      </nav>
      {toast.value && <div class={`toast ${toast.value.kind}`}>{toast.value.text}</div>}
    </div>
  );
}
