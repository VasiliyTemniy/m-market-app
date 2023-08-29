import { AnyAction, configureStore, ThunkAction } from '@reduxjs/toolkit';
import { sharedReducers } from '../shared/store';

const store = configureStore({
  reducer: {
    ...sharedReducers
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  AnyAction
>;

export default store;