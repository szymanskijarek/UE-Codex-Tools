import { render } from 'preact';
import { Studio } from './Studio';
import './news.css';

const app = document.getElementById('app')!;
// Clear the page's no-JavaScript text first: Preact renders next to it rather than replacing it.
app.replaceChildren();
render(<Studio />, app);
