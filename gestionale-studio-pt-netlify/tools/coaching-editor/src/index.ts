import { createManualProgramEditor } from './vendor/components/program-editor';
import { applySnapshot, toSnapshot } from './adapter';
import css from './editor.css';
import { rememberEditorScroll } from './ui-state';

export { applySnapshot, toSnapshot };
export { inheritLegacyWeeks } from './adapter';
export { duplicateDaySnapshot, copyProgramSnapshot } from './adapter';
export function mount(host: HTMLElement, options: { getState: () => any; canEdit: () => boolean; onChange: () => void; onSelectionChange?: () => void; confirm?: (message: string) => Promise<boolean> }) {
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  const nav = document.createElement('nav');
  nav.className = 'pt-editor-weeks';
  nav.setAttribute('aria-label', 'Settimane della scheda');
  const editor = createManualProgramEditor({ id: 'pt', athleteId: '', title: 'Scheda di allenamento', weeks: [1], days: [] }, 1, undefined,
    dirty => { if (dirty) queueMicrotask(() => capture()); }, options.confirm);
  shadow.append(style, nav, editor.element);
  let signature = '';
  let snapshotSignature = '';
  let readOnly: boolean | undefined;
  let activeWeek = 1;
  const inputSignature = () => {
    const state = options.getState();
    return JSON.stringify([state.draftClientId, state.draftProgramId, state.meta, state.sessions, state.sheetOrder,
      state.sheets, state.coachingEditorSnapshot, state.currentSheet, state.activeWeekIndex]);
  };
  const renderNav = () => {
    nav.replaceChildren(...options.getState().sessions.map((label: string, i: number) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label;
      button.setAttribute('aria-pressed', String(activeWeek === i + 1));
      button.onclick = () => { activeWeek = i + 1; options.getState().activeWeekIndex = i; editor.setWeek(activeWeek); signature = inputSignature(); renderNav(); options.onSelectionChange?.(); };
      return button;
    }));
  };
  const sync = () => {
    const restoreScroll = rememberEditorScroll(host);
    const wantedSheet = options.getState().currentSheet;
    const nextSignature = inputSignature();
    if (nextSignature !== signature) {
      const snapshot = toSnapshot(options.getState());
      editor.setSnapshot(snapshot);
      activeWeek = Math.min((Number(options.getState().activeWeekIndex) || 0) + 1, options.getState().sessions.length);
      editor.setWeek(activeWeek);
      snapshotSignature = JSON.stringify(editor.getSnapshot());
      signature = nextSignature;
      readOnly = undefined;
      renderNav();
    }
    const nextReadOnly = !options.canEdit();
    if (readOnly !== nextReadOnly) {
      editor.setReadOnly(nextReadOnly); readOnly = nextReadOnly;
      if (!readOnly) editor.element.querySelector<HTMLButtonElement>('[data-editor-action="toggle-edit"]')?.click();
      const day = editor.getSnapshot().program.days.find(d => d.letter === wantedSheet);
      if (day && !readOnly) Array.from(editor.element.querySelectorAll<HTMLButtonElement>('[data-editor-action="select-day"]')).find(button => button.dataset.dayKey === day.key)?.click();
    }
    restoreScroll();
  };
  const capture = () => {
    if (!options.canEdit()) return;
    const snapshot = editor.getSnapshot();
    const next = JSON.stringify(snapshot);
    const selectedKey = editor.element.querySelector<HTMLElement>('[data-editor-action="select-day"][aria-pressed="true"]')?.dataset.dayKey;
    const selectedDay = snapshot.program.days.find(day => day.key === selectedKey);
    if (selectedDay) options.getState().currentSheet = selectedDay.letter;
    options.getState().activeWeekIndex = activeWeek - 1;
    if (next === snapshotSignature) { signature = inputSignature(); options.onSelectionChange?.(); return; }
    applySnapshot(options.getState(), snapshot);
    snapshotSignature = next;
    signature = inputSignature();
    options.onChange();
    signature = inputSignature();
  };
  ['input', 'change', 'click', 'pointerdown'].forEach(type => editor.element.addEventListener(type, capture));
  sync();
  return { sync, capture };
}
