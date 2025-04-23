import React, { useState } from 'react';
import Tree from 'react-d3-tree';
import { Passage } from '../api';

interface TreeNode {
  name: string;
  attributes?: {
    [key: string]: string | number;
  };
  children?: TreeNode[];
  isCollapsed?: boolean;
}

interface LineageTreeProps {
  passages: Passage[];
  onSelectPassage?: (passage: Passage) => void;
}

const LineageTree: React.FC<LineageTreeProps> = ({ passages, onSelectPassage }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<{ [key: string]: boolean }>({});

  // Transform passages into tree structure
  const transformToTree = (passages: Passage[]): TreeNode => {
    // Find root passage (no parent)
    const rootPassage = passages.find(p => !p.parent_id);
    if (!rootPassage) {
      return { name: 'No root passage found' };
    }

    const buildTree = (passage: Passage): TreeNode => {
      const node: TreeNode = {
        name: `P${passage.id}`,
        attributes: {
          'Generation': passage.generation,
          'Seed Count': passage.seed_count,
          'Harvest Count': passage.harvest_count,
          'Doubling Time': passage.doubling_time_hours?.toFixed(2) || 'N/A',
          'Cumulative PD': passage.cumulative_pd?.toFixed(2) || 'N/A',
          'Measurements': passage.measurements?.length || 0,
          'Freeze Events': passage.freeze_events?.length || 0,
        },
        isCollapsed: collapsedNodes[`P${passage.id}`],
      };

      // Find children
      const children = passages.filter(p => p.parent_id === passage.id);
      if (children.length > 0 && !node.isCollapsed) {
        node.children = children.map(buildTree);
      }

      return node;
    };

    return buildTree(rootPassage);
  };

  const handleNodeClick = (nodeDatum: any) => {
    const passageId = parseInt(nodeDatum.name.slice(1));
    const passage = passages.find(p => p.id === passageId);
    
    if (passage && onSelectPassage) {
      onSelectPassage(passage);
    }
  };

  const handleNodeToggle = (nodeDatum: any) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [nodeDatum.name]: !prev[nodeDatum.name]
    }));
  };

  const treeData = transformToTree(passages);

  return (
    <div style={{ width: '100%', height: '600px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <Tree
        data={treeData}
        orientation="vertical"
        pathFunc="step"
        translate={{ x: 500, y: 50 }}
        nodeSize={{ x: 200, y: 100 }}
        separation={{ siblings: 2, nonSiblings: 2 }}
        renderCustomNodeElement={({ nodeDatum, toggleNode }) => (
          <g>
            <circle
              r={15}
              fill={nodeDatum.children ? '#4CAF50' : '#2196F3'}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeToggle(nodeDatum);
                toggleNode();
              }}
              style={{ cursor: 'pointer' }}
            />
            <text
              dy=".35em"
              x={20}
              y={0}
              style={{ fontSize: '12px', cursor: 'pointer' }}
              onClick={() => handleNodeClick(nodeDatum)}
            >
              {nodeDatum.name}
            </text>
            {Object.entries(nodeDatum.attributes || {}).map(([key, value], i) => (
              <text
                key={key}
                dy=".35em"
                x={20}
                y={20 + i * 15}
                style={{ fontSize: '10px' }}
              >
                {`${key}: ${value}`}
              </text>
            ))}
          </g>
        )}
      />
    </div>
  );
};

export default LineageTree; 