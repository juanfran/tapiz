import * as fromBoard from '../reducers/board.reducer';
import { selectBoardState } from './board.selectors';

describe('Board Selectors', () => {
  it('should select the feature state', () => {
    const result = selectBoardState({
      [fromBoard.boardFeatureKey]: {},
    });

    expect(result).toEqual({});
  });
});
