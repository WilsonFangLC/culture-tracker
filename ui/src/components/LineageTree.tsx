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
    // Find all root passages (no parent)
    const rootPassages = passages.filter(p => !p.parent_id);
    
    if (rootPassages.length === 0) {
      return { name: 'No passages found' };
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

    // Create a root node that contains all lineages
    return {
      name: 'Lineages',
      children: rootPassages.map(buildTree),
      isCollapsed: false
    };
  };

  const handleNodeClick = (nodeDatum: any) => {
    if (nodeDatum.name === 'Lineages') return; // Skip the root node
    
    const passageId = parseInt(nodeDatum.name.slice(1));
    const passage = passages.find(p => p.id === passageId);
    
    if (passage && onSelectPassage) {
      onSelectPassage(passage);
    }
  };

  const handleNodeToggle = (nodeDatum: any) => {
    if (nodeDatum.name === 'Lineages') return; // Skip the root node
    
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
              fill={nodeDatum.name === 'Lineages' ? '#9E9E9E' : (nodeDatum.children ? '#4CAF50' : '#2196F3')}
              onClick={(e) => {
                e.stopPropagation();
                if (nodeDatum.name !== 'Lineages') {
                  handleNodeToggle(nodeDatum);
                  toggleNode();
                }
              }}
              style={{ cursor: nodeDatum.name === 'Lineages' ? 'default' : 'pointer' }}
            />
            <text
              dy=".35em"
              x={20}
              y={0}
              style={{ 
                fontSize: '12px', 
                cursor: nodeDatum.name === 'Lineages' ? 'default' : 'pointer',
                fontWeight: nodeDatum.name === 'Lineages' ? 'bold' : 'normal'
              }}
              onClick={() => handleNodeClick(nodeDatum)}
            >
              {nodeDatum.name}
            </text>
            {nodeDatum.name !== 'Lineages' && Object.entries(nodeDatum.attributes || {}).map(([key, value], i) => (
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