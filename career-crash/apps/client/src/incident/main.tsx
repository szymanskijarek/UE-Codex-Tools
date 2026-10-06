import { render } from 'preact';
import { Hall } from './Hall';
import '../styles.css';
import '../cryptobro/cryptobro.css';
import './incident.css';

render(<Hall />, document.getElementById('app')!);
