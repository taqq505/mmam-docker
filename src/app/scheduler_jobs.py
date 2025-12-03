"""
Scheduled job implementations for automation.
自動化用のスケジュールされたジョブの実装
"""
import logging
import json
from datetime import datetime, timezone
from app.db import get_db_connection

logger = logging.getLogger("mmam.scheduler.jobs")


def run_collision_check_job():
    """
    Scheduled job: Run collision checker.
    スケジュールジョブ: コリジョンチェッカーを実行
    """
    job_id = "collision_check"
    logger.info(f"Starting job: {job_id}")

    try:
        # Import here to avoid circular imports
        from app.routers.flows import _collision_checker_core

        # Run collision check
        results = _collision_checker_core()

        # Count total collisions
        collision_count = sum(len(group["entries"]) for group in results)

        # Save result to scheduled_jobs table
        result_data = {"collision_count": collision_count}
        _update_job_result(job_id, "success", result_data)

        logger.info(f"Job {job_id} completed successfully. Collisions found: {collision_count}")

    except Exception as e:
        logger.exception(f"Job {job_id} failed: {e}")
        _update_job_result(job_id, "error", {"error": str(e)})


def run_nmos_check_job():
    """
    Scheduled job: Run NMOS checker.
    スケジュールジョブ: NMOSチェッカーを実行
    """
    job_id = "nmos_check"
    logger.info(f"Starting job: {job_id}")

    try:
        # Import here to avoid circular imports
        from app.routers.flows import _nmos_checker_core

        # Run NMOS check
        payload = _nmos_checker_core(timeout=5)

        # Extract difference count
        difference_count = len(payload.get("differences", []))

        # Save result to scheduled_jobs table
        result_data = {"nmos_difference_count": difference_count}
        _update_job_result(job_id, "success", result_data)

        logger.info(f"Job {job_id} completed successfully. Differences found: {difference_count}")

    except Exception as e:
        logger.exception(f"Job {job_id} failed: {e}")
        _update_job_result(job_id, "error", {"error": str(e)})


def _update_job_result(job_id: str, status: str, result: dict):
    """
    Update job execution result in database.
    データベースにジョブ実行結果を更新

    Args:
        job_id: Job identifier
        status: Execution status ('success' or 'error')
        result: Result data (dict)
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        now = datetime.now(timezone.utc)

        cur.execute("""
            UPDATE scheduled_jobs
            SET last_run_at = %s,
                last_run_status = %s,
                last_run_result = %s::JSONB,
                updated_at = %s
            WHERE job_id = %s
        """, (now, status, json.dumps(result), now, job_id))

        conn.commit()
        cur.close()
        conn.close()

        logger.debug(f"Updated job result for {job_id}: {status}")

    except Exception as e:
        logger.exception(f"Failed to update job result for {job_id}: {e}")


def get_job_function(job_type: str):
    """
    Get job function by job type.
    ジョブタイプからジョブ関数を取得

    Args:
        job_type: Type of job (collision_check, nmos_check, etc.)

    Returns:
        Callable job function, or None if not found
    """
    job_map = {
        "collision_check": run_collision_check_job,
        "nmos_check": run_nmos_check_job
    }

    return job_map.get(job_type)
