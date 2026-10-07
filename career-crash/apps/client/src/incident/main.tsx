import { render } from 'preact';
import { Hall } from './Hall';
import '../styles.css';
import '../cryptobro/cryptobro.css';
import './incident.css';

const app = document.getElementById('app')!;
// Clear the page's no-JavaScript text first: Preact renders next to it rather than replacing it.
app.replaceChildren();
render(<Hall />, app);
