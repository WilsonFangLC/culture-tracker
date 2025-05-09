import React from 'react';
// import { Passage } from '../api'; // Commented out: Passage not exported from api.ts
// Removing the import to non-existent component
// import PassageDetails from './PassageDetails';

interface PassageListProps {
  // passages: Passage[]; // Commented out
  passages: any[]; // Using any[] as temporary type
  onSelect: (passage: any) => void; // Using any
  onDelete: (id: number) => void;
  // selectedPassage: Passage | null; // Commented out
  selectedPassage: any | null; // Using any
}

const PassageList: React.FC<PassageListProps> = ({
  passages,
  onSelect,
  onDelete,
  selectedPassage,
}) => {
  return (
    <div className="flex space-x-4">
      <div className="w-1/3">
        <h3 className="text-lg font-semibold mb-2">Passages</h3>
        <ul className="divide-y divide-gray-200">
          {passages.map((passage: any) => ( // Using any
            <li
              key={passage.id}
              onClick={() => onSelect(passage)}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                selectedPassage?.id === passage.id ? 'bg-blue-100' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <span>
                  ID: {passage.id} - Gen: {passage.generation}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering onSelect
                    if (window.confirm(`Delete passage ${passage.id}?`)) {
                      onDelete(passage.id);
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Delete
                </button>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(passage.start_time).toLocaleDateString()} - {new Date(passage.harvest_time).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-2/3">
        {selectedPassage ? (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Passage Details</h3>
            <p>ID: {selectedPassage.id}</p>
            <p>Generation: {selectedPassage.generation}</p>
            <p>Start: {new Date(selectedPassage.start_time).toLocaleDateString()}</p>
            <p>Harvest: {new Date(selectedPassage.harvest_time).toLocaleDateString()}</p>
            {/* Add more details as needed */}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            Select a passage to see details
          </div>
        )}
      </div>
    </div>
  );
};

export default PassageList; 