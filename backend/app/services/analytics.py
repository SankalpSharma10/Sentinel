import duckdb
from typing import List, Dict, Any
import os

class AnalyticsService:
    def __init__(self):
        self.con = duckdb.connect(database=':memory:')
        self._initialize_real_data()

    def _initialize_real_data(self):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml_pipeline/data"))
        events_csv = os.path.join(base_dir, "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
        violations_csv = os.path.join(base_dir, "jan to may police violation_anonymized791b166.csv")

        # Load Astram Events
        try:
            self.con.execute(f"CREATE TABLE historical_events AS SELECT * FROM read_csv_auto('{events_csv}', ignore_errors=true)")
        except Exception as e:
            print(f"DuckDB Event Load Error: {e}")
            
        # Load Violations
        try:
            self.con.execute(f"CREATE TABLE violations AS SELECT * FROM read_csv_auto('{violations_csv}', ignore_errors=true)")
        except Exception as e:
            print(f"DuckDB Violation Load Error: {e}")
            
        # Create Cascade Transition Matrix
        try:
            self.con.execute("""
                CREATE TABLE cascade_graph AS 
                SELECT 
                    a.junction as source, 
                    b.junction as target, 
                    COUNT(*) as weight
                FROM historical_events a
                JOIN historical_events b 
                    ON CAST(a.start_datetime AS TIMESTAMP) < CAST(b.start_datetime AS TIMESTAMP)
                    AND CAST(a.start_datetime AS TIMESTAMP) >= CAST(b.start_datetime AS TIMESTAMP) - INTERVAL 30 MINUTE
                    AND a.junction != b.junction
                WHERE a.junction IS NOT NULL AND b.junction IS NOT NULL
                AND UPPER(a.junction) NOT IN ('NULL', 'UNKNOWN AREA', '')
                AND UPPER(b.junction) NOT IN ('NULL', 'UNKNOWN AREA', '')
                GROUP BY 1, 2
            """)
        except Exception as e:
            print(f"DuckDB Cascade Graph Error: {e}")

    def get_cascade_predictions(self, active_junctions: List[str], limit: int = 5) -> List[Dict[str, Any]]:
        """
        Uses the transition matrix to predict which junctions are at risk of a cascade
        from the current active incidents.
        """
        if not active_junctions:
            return []
            
        # Format list for SQL IN clause
        safe_junctions = [j.replace("'", "''") for j in active_junctions]
        j_list = ', '.join([f"'{j}'" for j in safe_junctions])
        
        try:
            query = f"""
                SELECT target as junction_name, SUM(weight) as cascade_risk
                FROM cascade_graph
                WHERE source IN ({j_list})
                AND target NOT IN ({j_list})
                GROUP BY 1
                ORDER BY cascade_risk DESC
                LIMIT {limit}
            """
            result = self.con.execute(query)
            columns = [desc[0] for desc in result.description]
            rows = result.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            print(f"Cascade query error: {e}")
            return []

    def get_worst_junctions(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Calculates Chronic Pain Points using the real Astram dataset AND the Violations dataset.
        We cross-reference the two to create a severity index (total_delay_minutes).
        """
        try:
            query = f"""
                SELECT 
                    e.junction_name, 
                    e.incident_count,
                    e.lat,
                    e.lng,
                    45 as avg_delay,
                    COALESCE(v.violation_count, 0) as violation_count,
                    (e.incident_count * 45) + (COALESCE(v.violation_count, 0) * 2) as total_delay_minutes
                FROM (
                    SELECT 
                        COALESCE(junction, police_station, 'Unknown Area') as junction_name, 
                        COUNT(*) as incident_count,
                        MAX(TRY_CAST(latitude AS DOUBLE)) as lat,
                        MAX(TRY_CAST(longitude AS DOUBLE)) as lng
                    FROM historical_events
                    WHERE COALESCE(junction, police_station) IS NOT NULL 
                    AND UPPER(COALESCE(junction, police_station)) NOT IN ('NULL', 'UNKNOWN AREA', '')
                    GROUP BY 1
                ) e
                LEFT JOIN (
                    SELECT COALESCE(junction_name, police_station, 'Unknown Area') as junction_name, COUNT(*) as violation_count
                    FROM violations
                    WHERE COALESCE(junction_name, police_station) IS NOT NULL
                    AND UPPER(COALESCE(junction_name, police_station)) NOT IN ('NULL', 'UNKNOWN AREA', '')
                    GROUP BY 1
                ) v ON e.junction_name = v.junction_name
                ORDER BY total_delay_minutes DESC
                LIMIT {limit}
            """
            result = self.con.execute(query)
            columns = [desc[0] for desc in result.description]
            rows = result.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            print(f"Analytics query error: {e}")
            return []

analytics_service = AnalyticsService()
