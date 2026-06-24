import re
with open('src/lib/mock-data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

def repl_att(m):
    wh = float(m.group(1))
    oh = float(m.group(3))
    return f'work_minutes: {int(wh * 60)}, overtime_minutes: {int(oh * 60)}'

content = re.sub(r'work_hours:\s*(\d+(\.\d+)?),\s*overtime_hours:\s*(\d+(\.\d+)?)', repl_att, content)

def repl_payroll(m):
    id_part = m.group(1)
    month = m.group(2)
    month_clean = month.replace('-', '')
    rest = m.group(3)
    return f"{{ payroll_id: {id_part}, version: 1, period_id: 'PRP_{month_clean}', month: '{month}', {rest}"

content = re.sub(r'\{\s*payroll_id:\s*([^,]+),\s*month:\s*\'([^\']+)\',\s*(employee_id:.*?\})', repl_payroll, content)

with open('src/lib/mock-data.ts', 'w', encoding='utf-8') as f:
    f.write(content)
