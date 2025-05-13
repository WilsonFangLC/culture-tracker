import React from 'react';
import { CellState } from '../api';
import EditStateForm from './EditStateForm';

interface EditStateModalProps {
  isOpen: boolean;
  state: CellState | null;
  onClose: () => void;
  onSubmit: (stateId: number, data: { parameters: Record<string, any>; additional_notes?: string }) => Promise<void>;
  isUpdating: boolean;
  updateError: string | null;
}

const EditStateModal: React.FC<EditStateModalProps> = ({
  isOpen,
  state,
  onClose,
  onSubmit,
  isUpdating,
  updateError
}) => {
  if (!isOpen || !state) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
      onClick={onClose} // Close on overlay click
    >
      <div 
        className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit State {state.name || `#${state.id}`}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {updateError && (
          <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg">
            Error updating state: {updateError}
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto">
          <EditStateForm
            state={state}
            onSubmit={async (data) => {
              await onSubmit(state.id, data);
              // We don't close the modal here - the parent component should handle that
              // after checking if the update was successful
            }}
            onCancel={onClose}
          />
        </div>

        {isUpdating && (
          <div className="p-4 mt-4 bg-blue-50 text-blue-700 rounded-lg">
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
};

export default EditStateModal; 