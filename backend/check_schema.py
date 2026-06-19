import duckdb
import os
base_dir = os.path.abspath(os.path.join(r'C:\Users\52san\.gemini\antigravity\scratch\sentinel-mono\backend\app\services', '../../../ml_pipeline/data'))
events_csv = os.path.join(base_dir, 'Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv')
con = duckdb.connect(':memory:')
con.execute(f"CREATE TABLE historical_events AS SELECT * FROM read_csv_auto('{events_csv}', ignore_errors=true)")
res = con.execute('PRAGMA table_info(historical_events)').fetchall()
for r in res:
    print(r[1])
