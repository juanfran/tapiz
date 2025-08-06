import { inject, resource } from '@angular/core';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { CocomaterialApiVector, CocomaterialTag } from '@tapiz/board-commons';
import { BoardApiService } from '../../../../services/board-api.service';

export interface CocoMaterialState {
  page: number;
  tags: CocomaterialTag[];
  filteredTags: string[];
  vectors: CocomaterialApiVector[] | null;
}

const initialState: CocoMaterialState = {
  page: 1,
  tags: [],
  filteredTags: [],
  vectors: null,
};

export const CocomaterialStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const boardApiService = inject(BoardApiService);
    return {
      _vectors: resource({
        params: () => ({
          page: store.page(),
          tags: store.filteredTags(),
        }),
        loader: ({ params }) => {
          const { page, tags } = params;
          return boardApiService
            .getCocomaterialVectors(page, 60, tags)
            .then((response) => {
              if (page === 1) {
                patchState(store, { vectors: response.results });
              } else {
                patchState(store, {
                  vectors: [...(store.vectors() || []), ...response.results],
                });
              }
            });
        },
      }),
    };
  }),
  withMethods((store) => ({
    setFilteredTags(tags: string[]) {
      patchState(store, { filteredTags: tags, page: 1 });
    },
    setPage(page: number) {
      patchState(store, { page });
    },
  })),
  withHooks((store, boardApiService = inject(BoardApiService)) => ({
    onInit() {
      if (!store.tags().length) {
        boardApiService.getCocomaterialTags().subscribe((tags) => {
          patchState(store, { tags });
        });
      }
    },
  })),
);
