import React from 'react';
import { Passage } from '../api';
import PassageDetails from './PassageDetails';

interface PassageListProps {
  passages: Passage[];
  onSelect: (passage: Passage) => void;
  onDelete: (id: number) => void;
  selectedPassage: Passage | null;
}

const PassageList: React.FC<PassageListProps> = ({
  passages,
  onSelect,
  onDelete,
  selectedPassage,
}) => {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Generation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Harvest Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {passages.map((passage) => (
              <tr
                key={passage.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedPassage?.id === passage.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelect(passage)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {passage.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {passage.generation}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(passage.start_time).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(passage.harvest_time).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(passage.id);
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPassage && (
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Passage Details</h3>
          <PassageDetails passage={selectedPassage} />
        </div>
      )}
    </div>
  );
};

export default PassageList; 