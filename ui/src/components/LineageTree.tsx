import React, { useState } from 'react';
import Tree, { RenderCustomNodeElementFn, CustomNodeElementProps } from 'react-d3-tree';
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

interface RenderNodeDatum extends TreeNode {
  name: string;
  attributes?: {
    [key: string]: string | number;
  };
  children?: RenderNodeDatum[];
}

const LineageTree: React.FC<LineageTreeProps> = ({ passages, onSelectPassage }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<{ [key: string]: boolean }>({});

  const transformToTree = (passages: Passage[]): TreeNode => {
    const rootPassages = passages.filter(p => !p.parent_id);
    
    if (rootPassages.length === 0) {
      return { name: 'No passages found' };
    }

    const buildTree = (passage: Passage): TreeNode => {
      const currentPD = Math.log2(passage.harvest_count / passage.seed_count);
      const node: TreeNode = {
        name: `P${passage.id}`,
        attributes: {
          'Cumulative PD': passage.generation.toFixed(2),
          'This Passage PD': currentPD.toFixed(2),
          'Cells': `${passage.seed_count} → ${passage.harvest_count}`,
          'Time': passage.doubling_time_hours ? `${passage.doubling_time_hours.toFixed(1)}h` : 'N/A',
          'Data': `${passage.measurements?.length || 0} measurements`,
        },
        isCollapsed: collapsedNodes[`P${passage.id}`],
      };

      const children = passages.filter(p => p.parent_id === passage.id);
      if (children.length > 0 && !node.isCollapsed) {
        node.children = children.map(buildTree);
      }

      return node;
    };

    return {
      name: 'Lineages',
      children: rootPassages.map(buildTree),
      isCollapsed: false
    };
  };

  const handleNodeClick = (nodeDatum: any) => {
    if (nodeDatum.name === 'Lineages') return;
    
    const passageId = parseInt(nodeDatum.name.slice(1));
    const passage = passages.find(p => p.id === passageId);
    
    if (passage && onSelectPassage) {
      onSelectPassage(passage);
    }
  };

  const handleNodeToggle = (nodeDatum: any) => {
    if (nodeDatum.name === 'Lineages') return;
    
    setCollapsedNodes(prev => ({
      ...prev,
      [nodeDatum.name]: !prev[nodeDatum.name]
    }));
  };

  const treeData = transformToTree(passages);

  const renderNode: RenderCustomNodeElementFn = ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
    const isRoot = nodeDatum.name === 'Lineages';
    const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
    
    return (
      <g>
        {/* Node circle */}
        <circle
          r={isRoot ? 20 : 25}
          fill={isRoot ? '#9E9E9E' : (hasChildren ? '#4CAF50' : '#2196F3')}
          stroke={isRoot ? 'none' : '#FFF'}
          strokeWidth={2}
          onClick={(e) => {
            e.stopPropagation();
            if (!isRoot) {
              handleNodeToggle(nodeDatum);
              toggleNode();
            }
          }}
          style={{ 
            cursor: isRoot ? 'default' : 'pointer',
            filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))'
          }}
        />

        {/* Node title */}
        <text
          dy=".35em"
          x={isRoot ? 30 : 35}
          y={0}
          style={{ 
            fontSize: isRoot ? '16px' : '14px',
            fontWeight: 'normal',
            cursor: isRoot ? 'default' : 'pointer',
            fill: '#333'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        >
          {nodeDatum.name}
        </text>

        {/* Node attributes */}
        {!isRoot && Object.entries(nodeDatum.attributes || {}).map(([key, value], i) => {
          const y = 25 + i * 20;
          const isPD = key.includes('PD');
          
          return (
            <g key={key}>
              {/* Background for PD values */}
              {isPD && (
                <rect
                  x={35}
                  y={y - 14}
                  width={180}
                  height={20}
                  fill={key === 'Cumulative PD' ? '#E3F2FD' : '#F1F8E9'}
                  rx={4}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* Key */}
              <text
                dy=".35em"
                x={35}
                y={y}
                style={{ 
                  fontSize: '12px',
                  fontWeight: 'normal',
                  fill: '#666',
                  pointerEvents: 'none'
                }}
              >
                {key}:
              </text>
              {/* Value */}
              <text
                dy=".35em"
                x={135}
                y={y}
                style={{ 
                  fontSize: '12px',
                  fontWeight: 'normal',
                  fill: '#333',
                  pointerEvents: 'none'
                }}
              >
                {value}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className="relative" style={{ width: '100%', height: '600px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
      <div className="absolute top-2 left-2 text-sm text-gray-500">
        Click nodes to expand/collapse. Double-click to center.
      </div>
      <Tree
        data={treeData}
        orientation="vertical"
        pathFunc="step"
        translate={{ x: 500, y: 80 }}
        nodeSize={{ x: 250, y: 150 }}
        separation={{ siblings: 2, nonSiblings: 2.5 }}
        renderCustomNodeElement={renderNode}
        pathClassFunc={() => 'stroke-current text-gray-400'}
      />
    </div>
  );
};

export default LineageTree; 