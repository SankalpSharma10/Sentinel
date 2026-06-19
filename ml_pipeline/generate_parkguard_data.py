"""
ParkGuard Data Generator
Processes raw ASTraM violation + event datasets into dashboard-ready JSON.
Output: frontend/public/parkguard_data.json
"""
import pandas as pd
import numpy as np
import json
import sys
import io
import os
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = Path(__file__).parent.parent / "frontend" / "public" / "parkguard_data.json"

print("Loading violation dataset...")
df = pd.read_csv(DATA_DIR / "jan to may police violation_anonymized791b166.csv", low_memory=False)
print(f"  Loaded {len(df):,} records")

print("Loading ASTraM event dataset...")
events = pd.read_csv(DATA_DIR / "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv", low_memory=False)
print(f"  Loaded {len(events):,} event records")

# ─────────────────────────────────────────────
# DATE PARSING
# ─────────────────────────────────────────────
df['created_datetime'] = pd.to_datetime(df['created_datetime'], format='mixed', utc=True, errors='coerce')
df['hour'] = df['created_datetime'].dt.hour
df['month'] = df['created_datetime'].dt.month
df['day_of_week'] = df['created_datetime'].dt.dayofweek

# ─────────────────────────────────────────────
# STATUS FLAGS
# ─────────────────────────────────────────────
df['val_lower'] = df['validation_status'].fillna('').str.lower().str.strip()
df['is_rejected'] = (df['val_lower'] == 'rejected').astype(int)
df['is_approved'] = (df['val_lower'] == 'approved').astype(int)
df['is_pending'] = (~df['val_lower'].isin(['rejected', 'approved'])).astype(int)

# ─────────────────────────────────────────────
# 1. SUMMARY KPIs
# ─────────────────────────────────────────────
total_challans = len(df)
total_approved = int(df['is_approved'].sum())
total_rejected = int(df['is_rejected'].sum())
total_pending = int(df['is_pending'].sum())
overall_rejection_rate = round(total_rejected / total_challans * 100, 2)
total_devices = int(df['device_id'].nunique())
total_vehicles = int(df['vehicle_number'].nunique())

# Device reliability analysis
device_stats = df.groupby('device_id').agg(
    total=('id', 'count'),
    rejected=('is_rejected', 'sum'),
    approved=('is_approved', 'sum'),
    lat=('latitude', 'mean'),
    lon=('longitude', 'mean'),
    police_station=('police_station', lambda x: x.mode()[0] if len(x) > 0 else 'Unknown')
).reset_index()
device_stats['rejection_rate'] = (device_stats['rejected'] / device_stats['total']).round(4)
device_stats_qualified = device_stats[device_stats['total'] >= 20].copy()

median_rej = float(device_stats_qualified['rejection_rate'].median())
std_rej = float(device_stats_qualified['rejection_rate'].std())

critical_threshold = median_rej + 1.5 * std_rej
warning_threshold = median_rej + 0.5 * std_rej

def classify_device(row):
    if row['rejection_rate'] > critical_threshold:
        return 'critical'
    elif row['rejection_rate'] > warning_threshold:
        return 'warning'
    else:
        return 'good'

device_stats_qualified['status'] = device_stats_qualified.apply(classify_device, axis=1)
device_stats_qualified['reliability_score'] = ((1 - device_stats_qualified['rejection_rate']) * 100).round(1)

n_critical = int((device_stats_qualified['status'] == 'critical').sum())
n_warning = int((device_stats_qualified['status'] == 'warning').sum())
n_good = int((device_stats_qualified['status'] == 'good').sum())

# Vehicles
vehicle_counts = df.groupby('vehicle_number').agg(
    violations=('id', 'count'),
    locations=('police_station', lambda x: x.nunique()),
    vehicle_type=('vehicle_type', lambda x: x.mode()[0] if len(x) > 0 else 'Unknown'),
    last_seen=('created_datetime', 'max'),
    first_seen=('created_datetime', 'min'),
).reset_index()
vehicle_counts = vehicle_counts.sort_values('violations', ascending=False)

summary_kpis = {
    "totalChallans": total_challans,
    "totalApproved": total_approved,
    "totalRejected": total_rejected,
    "totalPending": total_pending,
    "overallRejectionRate": overall_rejection_rate,
    "totalDevices": total_devices,
    "totalVehicles": total_vehicles,
    "criticalDevices": n_critical,
    "warningDevices": n_warning,
    "goodDevices": n_good,
    "repeatOffenders10Plus": int((vehicle_counts['violations'] >= 10).sum()),
    "repeatOffenders5Plus": int((vehicle_counts['violations'] >= 5).sum()),
    "medianRejectionRate": round(median_rej * 100, 2),
    "criticalThreshold": round(critical_threshold * 100, 2),
    "warnThreshold": round(warning_threshold * 100, 2),
    "uniqueJunctions": int(df['junction_name'].nunique()),
    "dateRangeStart": str(df['created_datetime'].min())[:10],
    "dateRangeEnd": str(df['created_datetime'].max())[:10],
}
print("Summary KPIs computed.")

# ─────────────────────────────────────────────
# 2. DEVICE RELIABILITY (top 200 for map display, all for charts)
# ─────────────────────────────────────────────
top_devices_map = device_stats_qualified.sort_values('rejection_rate', ascending=False).head(200)
device_map_data = []
for _, row in top_devices_map.iterrows():
    device_map_data.append({
        "deviceId": row['device_id'],
        "lat": round(float(row['lat']), 6),
        "lon": round(float(row['lon']), 6),
        "total": int(row['total']),
        "rejected": int(row['rejected']),
        "approved": int(row['approved']),
        "rejectionRate": round(float(row['rejection_rate']) * 100, 2),
        "reliabilityScore": float(row['reliability_score']),
        "status": row['status'],
        "policeStation": str(row['police_station'])
    })

# Distribution histogram for chart
bins = [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100]
bin_labels = ['0-5%', '5-10%', '10-15%', '15-20%', '20-25%', '25-30%', '30-40%', '40-50%', '50-75%', '75-100%']
device_stats_qualified['rej_pct'] = device_stats_qualified['rejection_rate'] * 100
device_dist = pd.cut(device_stats_qualified['rej_pct'], bins=bins, labels=bin_labels, right=False)
device_dist_counts = device_dist.value_counts().sort_index()
device_distribution = [{"range": k, "count": int(v)} for k, v in device_dist_counts.items()]

print(f"Device data prepared: {len(device_map_data)} devices for map")

# ─────────────────────────────────────────────
# 3. JUNCTION HOTSPOTS (cross-ref with events)
# ─────────────────────────────────────────────
junction_df = df[df['junction_name'] != 'No Junction'].copy()
junction_stats = junction_df.groupby('junction_name').agg(
    total=('id', 'count'),
    rejected=('is_rejected', 'sum'),
    approved=('is_approved', 'sum'),
    lat=('latitude', 'mean'),
    lon=('longitude', 'mean'),
    police_station=('police_station', lambda x: x.mode()[0] if len(x) > 0 else 'Unknown'),
    unique_vehicles=('vehicle_number', 'nunique'),
    peak_hour=('hour', lambda x: int(x.mode()[0]) if len(x) > 0 else 0),
).reset_index()
junction_stats['rejection_rate'] = (junction_stats['rejected'] / junction_stats['total']).round(4)
junction_stats = junction_stats[junction_stats['total'] >= 30].sort_values('total', ascending=False)

# ASTraM events: which junctions had road closure events?
events_with_junction = events[events['junction'].notna() & (events['junction'] != '')].copy()
closure_junctions = set(events_with_junction[events_with_junction['requires_road_closure'] == True]['junction'].astype(str).unique())
high_priority_events = set(events_with_junction[events_with_junction['priority'].isin(['High', 'P1', 'CRITICAL', 1, '1'])]['junction'].astype(str).unique())

hotspot_data = []
for _, row in junction_stats.iterrows():
    jname = str(row['junction_name'])
    # Extract BTP ID for cross-referencing
    btp_id = jname.split(' - ')[0] if ' - ' in jname else jname
    in_events = events_with_junction['junction'].astype(str).str.contains(btp_id, na=False).any()
    has_closure = any(btp_id in j for j in closure_junctions)
    
    hotspot_data.append({
        "junctionName": jname,
        "lat": round(float(row['lat']), 6),
        "lon": round(float(row['lon']), 6),
        "total": int(row['total']),
        "rejected": int(row['rejected']),
        "approved": int(row['approved']),
        "rejectionRate": round(float(row['rejection_rate']) * 100, 2),
        "uniqueVehicles": int(row['unique_vehicles']),
        "policeStation": str(row['police_station']),
        "peakHour": int(row['peak_hour']),
        "inEventDataset": bool(in_events),
        "hasRoadClosure": bool(has_closure),
        "congestionRiskScore": round(
            float(row['total']) / junction_stats['total'].max() * 50 +
            float(row['rejection_rate']) * 50, 1
        )
    })

print(f"Junction hotspots: {len(hotspot_data)}")

# ─────────────────────────────────────────────
# 4. REPEAT OFFENDERS
# ─────────────────────────────────────────────
repeat_data = []
for _, row in vehicle_counts.head(300).iterrows():
    violations = int(row['violations'])
    if violations < 3:
        break
    if violations >= 20:
        tier = 3
        tier_label = "Tier 3 — Impound Priority"
        tier_color = "#FF2D55"
    elif violations >= 10:
        tier = 2
        tier_label = "Tier 2 — Escalated Monitoring"
        tier_color = "#FF9F0A"
    elif violations >= 5:
        tier = 1
        tier_label = "Tier 1 — Warning Issued"
        tier_color = "#FFD60A"
    else:
        tier = 0
        tier_label = "Tier 0 — Monitor"
        tier_color = "#6E6E73"

    last_seen_str = str(row['last_seen'])[:10] if pd.notna(row['last_seen']) else 'N/A'
    first_seen_str = str(row['first_seen'])[:10] if pd.notna(row['first_seen']) else 'N/A'

    repeat_data.append({
        "vehicleNumber": str(row['vehicle_number']),
        "vehicleType": str(row['vehicle_type']),
        "violations": violations,
        "locationSpread": int(row['locations']),
        "firstSeen": first_seen_str,
        "lastSeen": last_seen_str,
        "tier": tier,
        "tierLabel": tier_label,
        "tierColor": tier_color,
    })

print(f"Repeat offenders: {len(repeat_data)}")

# ─────────────────────────────────────────────
# 5. POLICE STATION METRICS
# ─────────────────────────────────────────────
ps_stats = df.groupby('police_station').agg(
    total=('id', 'count'),
    rejected=('is_rejected', 'sum'),
    approved=('is_approved', 'sum'),
    unique_devices=('device_id', 'nunique'),
    unique_vehicles=('vehicle_number', 'nunique'),
).reset_index()
ps_stats['rejection_rate'] = (ps_stats['rejected'] / ps_stats['total']).round(4)
ps_stats['efficiency_score'] = ((1 - ps_stats['rejection_rate']) * 100).round(1)
ps_stats = ps_stats[ps_stats['total'] >= 100].sort_values('total', ascending=False)

ps_data = []
for _, row in ps_stats.head(25).iterrows():
    ps_data.append({
        "policeStation": str(row['police_station']),
        "total": int(row['total']),
        "rejected": int(row['rejected']),
        "approved": int(row['approved']),
        "rejectionRate": round(float(row['rejection_rate']) * 100, 2),
        "efficiencyScore": float(row['efficiency_score']),
        "uniqueDevices": int(row['unique_devices']),
        "uniqueVehicles": int(row['unique_vehicles']),
    })

print(f"Police stations: {len(ps_data)}")

# ─────────────────────────────────────────────
# 6. HOURLY PATTERN
# ─────────────────────────────────────────────
hourly = df.groupby('hour').agg(total=('id', 'count'), rejected=('is_rejected', 'sum')).reset_index()
hourly['rejection_rate'] = (hourly['rejected'] / hourly['total']).round(4)
hourly_data = [
    {
        "hour": int(row['hour']),
        "label": f"{int(row['hour']):02d}:00",
        "total": int(row['total']),
        "rejected": int(row['rejected']),
        "rejectionRate": round(float(row['rejection_rate']) * 100, 2)
    }
    for _, row in hourly.iterrows()
]

# ─────────────────────────────────────────────
# 7. MONTHLY TREND
# ─────────────────────────────────────────────
month_names = {1:'Jan', 2:'Feb', 3:'Mar', 4:'Apr', 5:'May', 6:'Jun',
               7:'Jul', 8:'Aug', 9:'Sep', 10:'Oct', 11:'Nov', 12:'Dec'}
monthly = df.groupby('month').agg(total=('id', 'count'), rejected=('is_rejected', 'sum')).reset_index()
monthly['rejection_rate'] = (monthly['rejected'] / monthly['total']).round(4)
monthly = monthly.sort_values('month')
monthly_data = [
    {
        "month": month_names.get(int(row['month']), str(row['month'])),
        "total": int(row['total']),
        "rejected": int(row['rejected']),
        "approved": int(row['total']) - int(row['rejected']),
        "rejectionRate": round(float(row['rejection_rate']) * 100, 2)
    }
    for _, row in monthly.iterrows()
]

# ─────────────────────────────────────────────
# 8. VIOLATION TYPE BREAKDOWN
# ─────────────────────────────────────────────
import ast
def extract_violations(s):
    try:
        lst = ast.literal_eval(s)
        return lst if isinstance(lst, list) else [str(lst)]
    except:
        return [str(s)]

violation_expanded = df['violation_type'].dropna().apply(extract_violations).explode()
violation_counts = violation_expanded.value_counts().head(10)
violation_data = [{"type": k, "count": int(v)} for k, v in violation_counts.items()]

# ─────────────────────────────────────────────
# FINAL OUTPUT
# ─────────────────────────────────────────────
output = {
    "generatedAt": pd.Timestamp.now().isoformat(),
    "summaryKPIs": summary_kpis,
    "deviceMapData": device_map_data,
    "deviceDistribution": device_distribution,
    "junctionHotspots": hotspot_data,
    "repeatOffenders": repeat_data,
    "policeStationMetrics": ps_data,
    "hourlyPattern": hourly_data,
    "monthlyTrend": monthly_data,
    "violationTypes": violation_data,
}

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n✅ Data written to: {OUTPUT_FILE}")
print(f"   File size: {OUTPUT_FILE.stat().st_size / 1024:.1f} KB")
