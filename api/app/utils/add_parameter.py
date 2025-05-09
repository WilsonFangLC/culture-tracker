#!/usr/bin/env python3
"""
CLI tool to add new parameters to the Culture Tracker system.
"""
import argparse
import pathlib
import re
import json
from typing import List, Dict, Union, Any, Optional

# Define paths
BASE_DIR = pathlib.Path(__file__).parent.parent
BACKEND_PARAMS_FILE = BASE_DIR / "utils" / "parameters.py"
FRONTEND_PARAMS_FILE = BASE_DIR.parent.parent / "ui" / "src" / "utils" / "parameters.ts"

def validate_parameter_name(name: str) -> bool:
    """Validate that the parameter name follows valid naming conventions."""
    return bool(re.match(r'^[a-z_][a-z0-9_]*$', name))

def check_parameter_exists(name: str) -> bool:
    """Check if a parameter already exists."""
    # Check backend file
    with open(BACKEND_PARAMS_FILE, 'r') as f:
        backend_content = f.read()
    
    # Check frontend file
    with open(FRONTEND_PARAMS_FILE, 'r') as f:
        frontend_content = f.read()
    
    # Look for the parameter in both files - use proper string formatting to avoid partial matches
    backend_pattern = rf'"({name})":\s*{{'
    frontend_pattern = rf'"({name})":\s*{{'
    
    return bool(re.search(backend_pattern, backend_content)) and bool(re.search(frontend_pattern, frontend_content))

def add_parameter_to_backend(
    name: str, 
    display_name: str, 
    applicable_to_all_nodes: bool,
    operation_specific: Optional[List[str]] = None
) -> bool:
    """Add a parameter to the backend parameters file."""
    with open(BACKEND_PARAMS_FILE, 'r') as f:
        content = f.readlines()
    
    # Find metadata section
    metadata_start = -1
    metadata_end = -1
    operation_param_lines = []
    
    # Find the ALL_PARAMETER_METADATA section
    for i, line in enumerate(content):
        if 'ALL_PARAMETER_METADATA' in line and '{' in line:
            metadata_start = i
        elif metadata_start >= 0 and '}' in line:
            metadata_end = i
            break
    
    if metadata_start == -1 or metadata_end == -1:
        print("Could not find ALL_PARAMETER_METADATA section in backend file")
        return False
    
    # Prepare the new parameter entry
    if applicable_to_all_nodes:
        new_entry = f'    "{name}": {{"displayName": "{display_name}", "applicableToAllNodes": True}},\n'
    else:
        ops = str(operation_specific) if operation_specific else "[]"
        new_entry = f'    "{name}": {{"displayName": "{display_name}", "applicableToAllNodes": False, "operationSpecific": {ops}}},\n'
    
    # Find the operation_type entry (usually the last one before closing brace)
    operation_type_line = -1
    for i in range(metadata_end - 1, metadata_start, -1):
        if '"operation_type"' in content[i]:
            operation_type_line = i
            break
    
    # Insert the new parameter at the appropriate location
    if operation_type_line != -1:
        # Insert before operation_type
        content.insert(operation_type_line, new_entry)
    else:
        # Insert before closing brace
        content.insert(metadata_end, new_entry)
    
    # Update operation parameter mapping if needed
    if operation_specific:
        # Find OPERATION_PARAMETER_MAPPING
        for i, line in enumerate(content):
            if 'OPERATION_PARAMETER_MAPPING' in line and '{' in line:
                for op in operation_specific:
                    # For each operation type, find its line and add the parameter
                    for j in range(i+1, len(content)):
                        if f"'{op}':" in content[j]:
                            # If the line already has 'operation_type' (last param), insert before it
                            if "'operation_type'" in content[j]:
                                parts = content[j].rsplit("'operation_type'", 1)
                                content[j] = parts[0] + f"'{name}', 'operation_type'" + parts[1]
                            else:
                                # Otherwise, add parameter to the end of the list
                                # Find the closing bracket
                                bracket_pos = content[j].rfind(']')
                                if bracket_pos > 0:
                                    # Insert before closing bracket
                                    content[j] = content[j][:bracket_pos] + f", '{name}'" + content[j][bracket_pos:]
                            break
    
    # Write the updated content
    with open(BACKEND_PARAMS_FILE, 'w') as f:
        f.writelines(content)
    
    return True

def add_parameter_to_frontend(
    name: str, 
    display_name: str, 
    applicable_to_all_nodes: bool,
    operation_specific: Optional[List[str]] = None
) -> bool:
    """Add a parameter to the frontend parameters file."""
    with open(FRONTEND_PARAMS_FILE, 'r') as f:
        content = f.readlines()
    
    # Find the ALL_PARAMETER_METADATA section
    metadata_start = -1
    metadata_end = -1
    
    # Find the ALL_PARAMETER_METADATA section
    for i, line in enumerate(content):
        if 'ALL_PARAMETER_METADATA' in line and '{' in line:
            metadata_start = i
        elif metadata_start >= 0 and line.strip() == '};':
            metadata_end = i
            break
    
    if metadata_start == -1 or metadata_end == -1:
        print("Could not find ALL_PARAMETER_METADATA section in frontend file")
        return False
    
    # Prepare the new parameter entry
    if applicable_to_all_nodes:
        new_entry = f'  "{name}": {{ displayName: "{display_name}", applicableToAllNodes: true }},\n'
    else:
        ops_list = [f"'{op}'" for op in operation_specific] if operation_specific else []
        ops_str = f"[{', '.join(ops_list)}]" if ops_list else "[]"
        new_entry = f'  "{name}": {{ displayName: "{display_name}", applicableToAllNodes: false, operationSpecific: {ops_str} }},\n'
    
    # Find the operation_type entry (usually the last one before closing brace)
    operation_type_line = -1
    for i in range(metadata_end - 1, metadata_start, -1):
        if '"operation_type"' in content[i]:
            operation_type_line = i
            break
    
    # Insert the new parameter at the appropriate location
    if operation_type_line != -1:
        # Insert before operation_type
        content.insert(operation_type_line, new_entry)
    else:
        # Insert before closing brace
        content.insert(metadata_end, new_entry)
    
    # Update operation parameter mapping if needed
    if operation_specific:
        # Find OPERATION_PARAMETER_MAPPING
        for i, line in enumerate(content):
            if 'OPERATION_PARAMETER_MAPPING' in line and '{' in line:
                for op in operation_specific:
                    # For each operation type, find its line and add the parameter
                    for j in range(i+1, len(content)):
                        if f"{op}:" in content[j]:
                            # If the line already has 'operation_type' (last param), insert before it
                            if "'operation_type'" in content[j]:
                                parts = content[j].rsplit("'operation_type'", 1)
                                content[j] = parts[0] + f"'{name}', 'operation_type'" + parts[1]
                            else:
                                # Otherwise, add parameter to the end of the list
                                # Find the closing bracket
                                bracket_pos = content[j].rfind(']')
                                if bracket_pos > 0:
                                    # Insert before closing bracket
                                    content[j] = content[j][:bracket_pos] + f", '{name}'" + content[j][bracket_pos:]
                            break
    
    # Write the updated content
    with open(FRONTEND_PARAMS_FILE, 'w') as f:
        f.writelines(content)
    
    return True

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Add a new parameter to the Culture Tracker system")
    parser.add_argument("name", help="Parameter name (snake_case)")
    parser.add_argument("display_name", help="Human-readable display name")
    parser.add_argument("--global", dest="is_global", action="store_true", help="Is this parameter applicable to all nodes?")
    parser.add_argument("--operations", nargs="+", help="Operation types this parameter applies to (if not global)")
    
    args = parser.parse_args()
    
    # Validate parameter name
    if not validate_parameter_name(args.name):
        print(f"Error: Invalid parameter name '{args.name}'. Must be snake_case.")
        return False
    
    # Check if parameter already exists
    if check_parameter_exists(args.name):
        print(f"Error: Parameter '{args.name}' already exists.")
        return False
    
    # Validate operations if parameter is not global
    if not args.is_global and not args.operations:
        print("Error: Non-global parameters must specify at least one operation type.")
        return False
    
    # Add parameter to backend
    if not add_parameter_to_backend(
        args.name, 
        args.display_name, 
        args.is_global, 
        args.operations
    ):
        print("Failed to add parameter to backend.")
        return False
    
    # Add parameter to frontend
    if not add_parameter_to_frontend(
        args.name, 
        args.display_name, 
        args.is_global, 
        args.operations
    ):
        print("Failed to add parameter to frontend.")
        return False
    
    print(f"Successfully added parameter '{args.name}' to both backend and frontend.")
    return True

if __name__ == "__main__":
    main() 