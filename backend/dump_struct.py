import openpyxl
wb = openpyxl.load_workbook('/tmp/innsbruck.xlsx', data_only=True)
ws = wb['Mo. Fees Log']
# Dump cols A-E for rows 1-60 to find year headers + addresses
for r in range(1, 60):
    vals = [ws.cell(row=r, column=c).value for c in range(1, 6)]  # A-E
    if any(v is not None for v in vals):
        print(f"r{r}: A={vals[0]!r} B={vals[1]!r} C={vals[2]!r} D={vals[3]!r} E={vals[4]!r}")
