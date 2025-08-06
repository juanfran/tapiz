import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  CocomaterialApiListVectors,
  CocomaterialTag,
} from '@tapiz/board-commons';
import { BoardApiService } from '../../../../services/board-api.service';

export interface CocoMaterialState {
  page: number;
  tags: CocomaterialTag[];
  vectors: CocomaterialApiListVectors | null;
}

const initialState: CocoMaterialState = {
  page: 1,
  tags: [],
  vectors: null,
};

export const CocomaterialStore = signalStore(
  withState(initialState),
  withMethods((store, boardApiService = inject(BoardApiService)) => ({
    initialLoad() {
      if (!store.tags().length) {
        boardApiService.getCocomaterialTags().subscribe((tags) => {
          patchState(store, { tags });
        });
      }
    },
    fetchVectors(tags: string[] = []) {
      boardApiService
        .getCocomaterialVectors(1, 60, tags)
        .subscribe((vectors) => {
          patchState(store, {
            page: 1,
            vectors,
          });
        });
    },
    nextPage(tags: string[] = []) {
      const nextPage = store.page() + 1;
      boardApiService
        .getCocomaterialVectors(nextPage, 60, tags)
        .subscribe((vectors) => {
          patchState(store, {
            page: nextPage,
            vectors: {
              ...vectors,
              results: [
                ...(store.vectors()?.results || []),
                ...vectors.results,
              ],
            },
          });
        });
    },
  })),
);
