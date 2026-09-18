import { SampleView } from './taxflow-view';
if (typeof customElements !== 'undefined' && !customElements.get('taxflow-view')) customElements.define('taxflow-view', SampleView as unknown as CustomElementConstructor);
