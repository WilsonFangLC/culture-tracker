import { State } from './state';

export interface CreateStateFormProps {
  onSubmit: (state: Omit<State, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export interface EditStateFormProps {
  state: State;
  onSubmit: (state: Omit<State, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
} 