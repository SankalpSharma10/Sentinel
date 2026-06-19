import random
from datetime import datetime, timedelta
import psycopg2 # type: ignore

def generate_seed_data():
    # This is a placeholder for the seed data generator
    # In a real hackathon, this script would insert 10,000+ realistic rows into PostgreSQL
    print("Generating seed data...")
    print("Connecting to DB (simulated)...")
    
    # Silk Board, KR Puram, Marathahalli, Agara, HSR
    junctions = [
        {"name": "Silk Board Junction", "lat": 12.9172, "lon": 77.6228},
        {"name": "KR Puram", "lat": 13.0084, "lon": 77.6628},
        {"name": "Marathahalli", "lat": 12.9569, "lon": 77.6983},
    ]
    
    # 1. Insert Junctions
    # 2. Generate past 30 days of events
    # 3. Generate ML feature tables
    print("Seed data generation script initialized. Ready to populate.")

if __name__ == "__main__":
    generate_seed_data()
