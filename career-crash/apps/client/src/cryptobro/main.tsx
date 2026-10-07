import { render } from 'preact';
import { Floor } from './Floor';
import '../styles.css';
import './cryptobro.css';

const app = document.getElementById('app')!;
// Clear the page's no-JavaScript text first: Preact renders next to it rather than replacing it.
app.replaceChildren();
render(<Floor />, app);
