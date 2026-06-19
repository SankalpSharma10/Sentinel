import pandas as pd
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

print("Starting Feature Engineering Pipeline...")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
EVENTS_PATH = os.path.join(DATA_DIR, 'Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv')
OUTPUT_PATH = os.path.join(DATA_DIR, 'processed_events.csv')

# Load Events Data
print(f"Loading events data from {EVENTS_PATH}")
df_events = pd.read_csv(EVENTS_PATH)

# Drop rows without start or end time
df_events = df_events.dropna(subset=['start_datetime', 'end_datetime'])

# Convert to datetime
df_events['start_datetime'] = pd.to_datetime(df_events['start_datetime'], errors='coerce')
df_events['end_datetime'] = pd.to_datetime(df_events['end_datetime'], errors='coerce')

# Drop NaNs created by coercion
df_events = df_events.dropna(subset=['start_datetime', 'end_datetime'])

# 1. Target Variables
df_events['duration_minutes'] = (df_events['end_datetime'] - df_events['start_datetime']).dt.total_seconds() / 60.0

# Filter out negative or absurdly long durations (e.g. > 24 hours)
df_events = df_events[(df_events['duration_minutes'] > 0) & (df_events['duration_minutes'] < 1440)]

# Target 1: High Impact (Duration > 30 mins)
df_events['high_impact'] = (df_events['duration_minutes'] > 30).astype(int)

# Target 2: Duration Class (0: Short < 15, 1: Medium 15-45, 2: Long > 45)
def classify_duration(d):
    if d < 15: return 0
    elif d <= 45: return 1
    else: return 2
df_events['duration_class'] = df_events['duration_minutes'].apply(classify_duration)

# 2. Temporal Features
df_events['hour'] = df_events['start_datetime'].dt.hour
df_events['day_of_week'] = df_events['start_datetime'].dt.dayofweek
df_events['is_peak_hour'] = df_events['hour'].apply(lambda h: 1 if (8 <= h <= 11) or (17 <= h <= 20) else 0)

# 3. Categorical Features (Event Type)
# We will just keep the top event types and one-hot encode them later, or use label encoding.
# For simplicity in this script, we'll extract the string and let the next script handle encoding.
df_events['event_type'] = df_events['event_type'].fillna('Unknown')
df_events['event_cause'] = df_events['event_cause'].fillna('Unknown')

# 4. Spatial Features
# We will use raw latitude and longitude. XGBoost can learn regions from lat/lon directly if given enough depth.
df_events['latitude'] = pd.to_numeric(df_events['latitude'], errors='coerce')
df_events['longitude'] = pd.to_numeric(df_events['longitude'], errors='coerce')
df_events = df_events.dropna(subset=['latitude', 'longitude'])

# Select columns for the final processed dataset
features = [
    'id', 'latitude', 'longitude', 'hour', 'day_of_week', 'is_peak_hour',
    'event_type', 'event_cause', 'duration_minutes', 'high_impact', 'duration_class'
]

df_processed = df_events[features]

# Save processed dataset
df_processed.to_csv(OUTPUT_PATH, index=False)
print(f"Feature engineering complete. Saved {len(df_processed)} rows to {OUTPUT_PATH}")
