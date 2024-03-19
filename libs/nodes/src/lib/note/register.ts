export const NOTE_CONFIG = {
  loadComponent: () =>
    import('./note.component').then((mod) => mod.NoteComponent),
};
