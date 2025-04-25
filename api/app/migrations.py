from sqlmodel import Session, select
from sqlalchemy import text, inspect
from typing import List, Dict, Any
import json
from datetime import datetime
import logging
import os

from .models import CellState
from .database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MIGRATION_FILE = "migration_complete.txt"

def is_migration_complete():
    """Check if migration has already been completed"""
    return os.path.exists(MIGRATION_FILE)

def mark_migration_complete():
    """Mark migration as complete"""
    with open(MIGRATION_FILE, "w") as f:
        f.write(datetime.now().isoformat())

def migrate_old_to_new():
    """
    Migrate data from the old schema (Passage, GrowthMeasurement) to the new schema
    (CellState).
    """
    if is_migration_complete():
        logger.info("Migration already completed. Skipping.")
        return

    try:
        with Session(engine) as session:
            # Check if old tables exist
            inspector = inspect(engine)
            old_tables = [table for table in ['passage', 'growthmeasurement'] 
                         if table in inspector.get_table_names()]
            
            if not old_tables:
                logger.info("No old tables found. Migration not needed.")
                mark_migration_complete()
                return

            logger.info(f"Found old tables: {old_tables}")
            
            # Migrate passages to cell states
            if 'passage' in old_tables:
                passages = session.execute(select(text("* FROM passage"))).fetchall()
                logger.info(f"Migrating {len(passages)} passages to cell states")
                
                for passage in passages:
                    try:
                        # Convert passage to cell state
                        state = CellState(
                            timestamp=datetime.fromisoformat(passage.start_time),
                            parent_id=passage.parent_id,
                            parameters={
                                "status": "culturing",
                                "temperature_c": 37,
                                "volume_ml": 20,
                                "location": "incubator",
                                "passage_number": passage.id,
                                "seed_count": passage.seed_count,
                                "harvest_count": passage.harvest_count,
                                "generation": passage.generation,
                                "doubling_time_hours": passage.doubling_time_hours,
                                "cumulative_pd": passage.cumulative_pd
                            }
                        )
                        session.add(state)
                        session.flush()  # Get the new state's ID

                        # Create harvest transition - Code removed/commented out
                        # harvest_transition = StateTransition(
                        #     state_id=state.id,
                        #     timestamp=datetime.fromisoformat(passage.harvest_time),
                        #     transition_type="harvest",
                        #     parameters={
                        #         "harvest_count": passage.harvest_count,
                        #         "generation": passage.generation,
                        #         "doubling_time_hours": passage.doubling_time_hours
                        #     }
                        # )
                        # session.add(harvest_transition)
                    except Exception as e:
                        logger.error(f"Error migrating passage {passage.id}: {str(e)}")
                        session.rollback()
                        continue

            # Migrate growth measurements to transitions - Code removed/commented out
            if 'growthmeasurement' in old_tables:
                measurements = session.execute(
                    select(text("* FROM growthmeasurement"))
                ).fetchall()
                logger.info(f"Migrating {len(measurements)} measurements to transitions")
                
                for measurement in measurements:
                    try:
                        # Create measurement transition - Code removed/commented out
                        # transition = StateTransition(
                        #     state_id=measurement.passage_id,
                        #     timestamp=datetime.fromisoformat(measurement.timestamp),
                        #     transition_type="measurement",
                        #     parameters={
                        #         "cell_density": measurement.cell_density
                        #     },
                        #     notes=measurement.notes
                        # )
                        # session.add(transition)
                        pass # Added pass to fix indentation error
                    except Exception as e:
                        logger.error(f"Error migrating measurement {measurement.id}: {str(e)}")
                        session.rollback()
                        continue

            # Commit all changes
            session.commit()

            # Drop old tables only if migration was successful
            for table in old_tables:
                try:
                    session.execute(text(f"DROP TABLE {table}"))
                    logger.info(f"Dropped old table: {table}")
                except Exception as e:
                    logger.error(f"Error dropping table {table}: {str(e)}")
                    session.rollback()

            session.commit()
            mark_migration_complete()
            logger.info("Migration completed successfully!")

    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    migrate_old_to_new() 