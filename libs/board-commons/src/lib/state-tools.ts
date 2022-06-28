import { Entries } from 'type-fest';

import { CommonState } from './models/common-state.model';
import { Diff, DiffAdd, DiffEdit, DiffRemove } from './models/diff.model';

export function applyDiff(diff: Diff, state: CommonState): CommonState {
  if (diff?.add) {
    const addEntries = Object.entries(diff.add) as Entries<DiffAdd>;

    for (const [key, value] of addEntries) {
      const stateElement = state[key];

      if (value && stateElement) {
        state = {
          ...state,
          [key]: [...stateElement, ...value],
        };
      }
    }
  }

  if (diff?.set) {
    const setEntries = Object.entries(diff.set) as Entries<DiffAdd>;

    for (const [key, value] of setEntries) {
      if (value && state[key]) {
        state = {
          ...state,
          [key]: [...value],
        };
      }
    }
  }

  if (diff?.remove) {
    const removeEntries = Object.entries(diff.remove) as Entries<DiffRemove>;

    for (const [key, value] of removeEntries) {
      const objs = state[key] as { id: string }[];

      if (value && state[key]) {
        state = {
          ...state,
          [key]: objs.filter((it) => !value.includes(it.id)),
        };
      }
    }
  }

  if (diff?.edit) {
    const editEntries = Object.entries(diff.edit) as Entries<DiffEdit>;
    for (const [key, value] of editEntries) {
      if (value && state && state[key]) {
        const newElements: any = [];

        value.forEach((edit: any) => {
          const finded = (state[key] as any).find(
            (old: any) => old.id === edit.id
          );

          if (!finded) {
            newElements.push(edit);
          }
        });

        state = {
          ...state,
          [key]: [
            ...state[key].map((it: any) => {
              const newValue = (value as any).find(
                (edit: any) => it.id == edit.id
              );

              if (newValue) {
                return {
                  ...it,
                  ...newValue,
                };
              }

              return it;
            }),
            ...newElements,
          ],
        };
      }
    }

    // move note to the top
    if (diff?.edit.notes) {
      const movedNotes = diff?.edit.notes
        .filter((note) => note.position)
        .map((it) => it.id);

      const index = state.notes.findIndex((it) => movedNotes.includes(it.id));

      if (index !== -1) {
        state.notes.push(state.notes.splice(index, 1)[0]);
      }
    }
  }

  return {
    ...state,
  };
}
