"""
Scheduler module for automated job execution using APScheduler.
APSchedulerを使用した自動化ジョブ実行モジュール
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from app.db import get_db_connection

logger = logging.getLogger("mmam.scheduler")

# Global scheduler instance
scheduler = BackgroundScheduler(timezone='UTC')


def init_scheduler():
    """
    Initialize scheduler and load jobs from database.
    スケジューラを初期化し、データベースからジョブを読み込む
    """
    logger.info("Initializing scheduler...")

    try:
        # Load all jobs from database
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT job_id, job_type, enabled, schedule_type, schedule_value
            FROM scheduled_jobs
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Register enabled jobs
        for job_id, job_type, enabled, schedule_type, schedule_value in rows:
            if enabled:
                try:
                    _register_job(job_id, job_type, schedule_type, schedule_value)
                    logger.info(f"Registered job: {job_id} ({schedule_type}={schedule_value})")
                except Exception as e:
                    logger.exception(f"Failed to register job {job_id}: {e}")

        logger.info(f"Scheduler initialized with {len(scheduler.get_jobs())} active jobs")

    except Exception as e:
        logger.exception(f"Failed to initialize scheduler: {e}")
        raise


def start_scheduler():
    """
    Start the scheduler.
    スケジューラを起動
    """
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")
    else:
        logger.warning("Scheduler already running")


def stop_scheduler():
    """
    Stop the scheduler gracefully.
    スケジューラを正常に停止
    """
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")
    else:
        logger.warning("Scheduler not running")


def reload_job(job_id: str):
    """
    Reload a job from database and update scheduler.
    データベースからジョブを再読み込みしてスケジューラを更新

    Args:
        job_id: Job ID to reload
    """
    try:
        # Remove existing job if present
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
            logger.info(f"Removed existing job: {job_id}")

        # Load job config from database
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT job_id, job_type, enabled, schedule_type, schedule_value
            FROM scheduled_jobs
            WHERE job_id = %s
        """, (job_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            logger.warning(f"Job not found in database: {job_id}")
            return

        job_id, job_type, enabled, schedule_type, schedule_value = row

        # Register job if enabled
        if enabled:
            _register_job(job_id, job_type, schedule_type, schedule_value)
            logger.info(f"Reloaded job: {job_id} ({schedule_type}={schedule_value})")
        else:
            logger.info(f"Job disabled, not registering: {job_id}")

    except Exception as e:
        logger.exception(f"Failed to reload job {job_id}: {e}")
        raise


def get_job_status(job_id: str) -> dict | None:
    """
    Get job status from scheduler.
    スケジューラからジョブステータスを取得

    Args:
        job_id: Job ID

    Returns:
        Job status dict with next_run_time, or None if not found
    """
    job = scheduler.get_job(job_id)
    if not job:
        return None

    return {
        'job_id': job.id,
        'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None
    }


def _register_job(job_id: str, job_type: str, schedule_type: str, schedule_value: str):
    """
    Register a job with the scheduler.
    スケジューラにジョブを登録

    Args:
        job_id: Unique job identifier
        job_type: Type of job (collision_check, nmos_check, etc.)
        schedule_type: 'interval' or 'cron'
        schedule_value: Interval seconds (str) or cron expression
    """
    # Import job functions here to avoid circular imports
    from app.scheduler_jobs import get_job_function

    job_func = get_job_function(job_type)
    if not job_func:
        raise ValueError(f"Unknown job type: {job_type}")

    # Create trigger based on schedule type
    if schedule_type == 'interval':
        seconds = int(schedule_value)
        trigger = IntervalTrigger(seconds=seconds)
    elif schedule_type == 'cron':
        trigger = CronTrigger.from_crontab(schedule_value)
    else:
        raise ValueError(f"Unknown schedule type: {schedule_type}")

    # Register job with scheduler
    scheduler.add_job(
        job_func,
        trigger=trigger,
        id=job_id,
        name=job_id,
        max_instances=1,  # Prevent overlapping executions
        coalesce=True,    # If missed, run only once
        replace_existing=True
    )


def validate_cron_expression(expr: str) -> tuple[bool, str | None]:
    """
    Validate a cron expression.
    Cron式を検証

    Args:
        expr: Cron expression to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        CronTrigger.from_crontab(expr)
        return True, None
    except ValueError as e:
        return False, str(e)
