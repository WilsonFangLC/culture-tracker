import React from 'react';
import 'reactflow/dist/style.css';

interface CustomFlowProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * A custom wrapper for ReactFlow to handle TypeScript issues
 * This component simply renders its children directly, and we'll manually include the needed ReactFlow code
 */
export default function CustomFlow({ children, style = {}, className = '' }: CustomFlowProps) {
  return (
    <div className={`react-flow ${className}`} style={{ width: '100%', height: '100%', ...style }}>
      {children}
    </div>
  );
} 