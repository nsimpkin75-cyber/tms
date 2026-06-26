#!/usr/bin/env python3
import re
import json
import subprocess

def split_sql_by_statements(sql_content):
    """Split SQL content into individual statements."""
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
            if stmt and not stmt.startswith('/*'):
                statements.append(stmt)
            current = []
        # Detect regular SQL statement end
        elif not in_function and line.rstrip().endswith(';'):
            stmt = '\n'.join(current).strip()
            if stmt and not stmt.startswith('/*') and stmt:
                statements.append(stmt)
            current = []
    
    return statements

def execute_sql(query, batch_name, stmt_num):
    """Execute SQL using mcp tool"""
    # Skip comment-only blocks
    if query.strip().startswith('/*'):
        return None, None
    
    try:
        result = subprocess.run(
            ['bash', '-c', f'python3 << \'PYEOF\'\nimport sys; sys.path.insert(0, "/tmp/cc-agent/68203614/project"); from test_mcp import execute_sql; execute_sql("{query.replace(chr(34), chr(92)+chr(34))}")\nPYEOF\n'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            return True, None
        else:
            error = result.stderr or result.stdout
            return False, error
    except Exception as e:
        return False, str(e)

# Read files
with open('/tmp/sql_batch_ac.sql', 'r') as f:
    ac_content = f.read()

with open('/tmp/sql_batch_ad.sql', 'r') as f:
    ad_content = f.read()

statements_ac = split_sql_by_statements(ac_content)
statements_ad = split_sql_by_statements(ad_content)

print(f"Batch AC: {len(statements_ac)} statements")
print(f"Batch AD: {len(statements_ad)} statements")

# For debugging - just output how we'd process these
print("\nExecuting batch AC...")
for i, stmt in enumerate(statements_ac[:5]):
    print(f"  Statement {i+1}: {stmt[:80].replace(chr(10), ' ')}...")
    
print("\nExecuting batch AD...")
for i, stmt in enumerate(statements_ad[:5]):
    print(f"  Statement {i+1}: {stmt[:80].replace(chr(10), ' ')}...")
