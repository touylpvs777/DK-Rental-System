import pandas as pd

data = {
    "Name": ["Tom", "John", "Anna"],
    "Age": [25, 30, 22]
}

df = pd.DataFrame(data)

df.to_excel("employees.xlsx", index=False)

print("Excel file created successfully!")