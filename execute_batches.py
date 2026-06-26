#!/usr/bin/env python3
import sys
import re

def split_sql_by_statements(sql_content):
    """Split SQL content into individual statements."""
    # Split by lines that end with $$; (for plpgsql functions) or regular ;
    statements = []
    current = []
    in_function = False
    
    for line in sql_content.split('\n'):
        current.append(line)
        
        # Detect start of function definition
        if 'AS $$' in line or 'AS $' in line:
            in_function = True
        
        # Detect end of function
        if in_function and re.search(r'\$\$;', line):
            in_function = False
            stmt = '\n'.join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
        # Detect regular SQL statement end
        elif not in_function and line.rstrip().endswith(';'):
            stmt = '\n'.join(current).strip()
            if stmt and not stmt.startswith('--'):
                statements.append(stmt)
            current = []
    
    # Add any remaining statement
    if current:
        stmt = '\n'.join(current).strip()
        if stmt and not stmt.startswith('--'):
            statements.append(stmt)
    
    return statements

# Read batch_ac.sql
with open('/tmp/sql_batch_ac.sql', 'r') as f:
    ac_content = f.read()

statements_ac = split_sql_by_statements(ac_content)
print(f"Batch AC: Found {len(statements_ac)} statements")

# Read batch_ad.sql
with open('/tmp/sql_batch_ad.sql', 'r') as f:
    ad_content = f.read()

statements_ad = split_sql_by_statements(ad_content)
print(f"Batch AD: Found {len(statements_ad)} statements")

# Output first few statements as a sample
print("\n=== First 3 statements from batch_ac.sql (preview) ===")
for i, stmt in enumerate(statements_ac[:3]):
    preview = stmt[:200].replace('\n', ' ')
    print(f"{i+1}: {preview}...")
