import React, { useState, useCallback, useMemo } from 'react';
import Tree, { RenderCustomNodeElementFn, CustomNodeElementProps, TreeNodeDatum } from 'react-d3-tree';
// import { Passage } from '../api'; // Commented out: Passage not exported from api.ts

interface TreeNode {
  name: string;
  attributes?: Record<string, string | number | undefined>;
  children?: TreeNode[];
  isCollapsed?: boolean;
}

interface LineageTreeProps {
  // passages: Passage[] // Commented out
  passages: any[]; // Using any[] as temporary type
  onSelectPassage?: (passage: any) => void;
}

interface RenderNodeDatum extends TreeNode {
  name: string;
  attributes?: {
    [key: string]: string | number;
  };
  children?: RenderNodeDatum[];
}

const transformToTree = (passages: any[]): TreeNodeDatum | undefined => {
  if (!passages || passages.length === 0) return undefined; // Return undefined instead of null

  const passageMap: { [key: number]: any & { children: any[] } } = {};
  passages.forEach(p => {
    passageMap[p.id] = { ...p, children: [] };
  });

  const treeData: any[] = [];
  passages.forEach(p => {
    if (p.parent_id && passageMap[p.parent_id]) {
      passageMap[p.parent_id].children.push(passageMap[p.id]);
    } else {
      // Root node
      treeData.push(passageMap[p.id]);
    }
  });

  // Assuming a single root for simplicity, or handle multiple roots if necessary
  // react-d3-tree expects a single root object or an array if multiple roots exist
  // This example assumes the transformation results in a structure compatible with TreeNodeDatum
  // If the structure is significantly different, more mapping might be needed.
  if (treeData.length === 0) return undefined;
  // If multiple roots, return the array. If single root, return the first element.
  // For simplicity, returning the first root if it exists, adjust if multiple roots are possible.
  // This basic transformation might need adjustments based on react-d3-tree requirements.
  const mapToTreeNodeDatum = (node: any): TreeNodeDatum => ({
      name: node.name || `Passage ${node.id}`,
      attributes: {
          ID: node.id,
          // Add other relevant attributes
      },
      children: node.children.length > 0 ? node.children.map(mapToTreeNodeDatum) : undefined,
       __rd3t: { id: node.id.toString(), depth: 0, collapsed: false }, // Basic __rd3t structure
  });

  // If multiple roots, map all. Assuming single root based on previous code structure for now.
  // return treeData.map(mapToTreeNodeDatum); // Use this if multiple roots possible
  return mapToTreeNodeDatum(treeData[0]); // Assuming single root
};

const LineageTree: React.FC<LineageTreeProps> = ({ passages, onSelectPassage }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<{ [key: string]: boolean }>({});
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const treeContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (treeContainerRef.current) {
      const dimensions = treeContainerRef.current.getBoundingClientRect();
      setTranslate({
        x: dimensions.width / 2,
        y: dimensions.height / 4 // Start a bit down from the top
      });
    }
  }, []);

  const treeData = useMemo(() => transformToTree(passages), [passages]);

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

  if (!treeData) {
    return <div>No lineage data available.</div>; // Handle case where transform returns undefined
  }

  return (
    <div ref={treeContainerRef} style={{ width: '100%', height: '600px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
      <div className="absolute top-2 left-2 text-sm text-gray-500">
        Click nodes to expand/collapse. Double-click to center.
      </div>
      <Tree
        data={treeData}
        translate={translate}
        orientation="vertical"
        pathFunc="step"
        nodeSize={{ x: 250, y: 150 }}
        separation={{ siblings: 2, nonSiblings: 2.5 }}
        renderCustomNodeElement={renderNode}
        pathClassFunc={() => 'stroke-current text-gray-400'}
      />
    </div>
  );
};

export default LineageTree; 