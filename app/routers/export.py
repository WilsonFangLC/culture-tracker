for header_key in original_headers:
    if header_key in row_data:
        # Basic fields
        row.append(format_value(row_data[header_key]))
    elif header_key in flat_params:
        # Parameters
        param_data = flat_params[header_key]
        row.append(format_value(
            param_data['value'], 
            header_key, 
            operation_type
        ))
    else:
        # Check if the parameter is applicable 