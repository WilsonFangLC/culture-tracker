import React, { useState } from 'react';
import { CellState } from '../api';
import CreateStateForm from './CreateStateForm';

interface ProcessCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentState?: CellState | null;
  existingStates: CellState[];
  onCreateState: (data: any[]) => void;
}

export default function ProcessCreationModal({
  isOpen,
  onClose,
  parentState,
  existingStates,
  onCreateState
}: ProcessCreationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {parentState ? `Create Child Process for ${parentState.name || `State ${parentState.id}`}` : 'Create New Process'}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <CreateStateForm
          onSubmit={(data) => {
            onCreateState(data);
            onClose();
          }}
          onCancel={onClose}
          existingStates={existingStates}
          initialParentId={parentState?.id}
        />
      </div>
    </div>
  );
} 