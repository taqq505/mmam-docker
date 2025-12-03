"""
Automation API endpoints for scheduled jobs management.
スケジュールされたジョブ管理のための自動化APIエンドポイント
"""
import logging
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db import get_db_connection
from app.auth import require_roles
from app import scheduler

logger = logging.getLogger("mmam.automation")
router = APIRouter()


class JobConfig(BaseModel):
    """Job configuration model"""
    enabled: bool
    schedule_type: str  # 'interval' or 'cron'
    schedule_value: str  # seconds (str) or cron expression


# --------------------------------------------------------
# Get all jobs
# --------------------------------------------------------
@router.get("/automation/jobs")
def get_jobs(user=Depends(require_roles("editor", "admin"))):
    """
    Get all scheduled jobs with their status.
    全スケジュールジョブとそのステータスを取得
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT job_id, job_type, enabled, schedule_type, schedule_value,
                   last_run_at, last_run_status, last_run_result,
                   created_at, updated_at
            FROM scheduled_jobs
            ORDER BY job_id
        """)

        rows = cur.fetchall()
        cur.close()
        conn.close()

        jobs = []
        for row in rows:
            job_id, job_type, enabled, schedule_type, schedule_value, \
                last_run_at, last_run_status, last_run_result, \
                created_at, updated_at = row

            # Get next_run_time from scheduler
            job_status = scheduler.get_job_status(job_id)
            next_run_time = job_status["next_run_time"] if job_status else None

            # Parse last_run_result if it's a string
            if isinstance(last_run_result, str):
                try:
                    last_run_result = json.loads(last_run_result)
                except json.JSONDecodeError:
                    last_run_result = {}

            jobs.append({
                "job_id": job_id,
                "job_type": job_type,
                "enabled": enabled,
                "schedule_type": schedule_type,
                "schedule_value": schedule_value,
                "last_run_at": last_run_at.isoformat() if last_run_at else None,
                "last_run_status": last_run_status,
                "last_run_result": last_run_result,
                "next_run_time": next_run_time,
                "created_at": created_at.isoformat() if created_at else None,
                "updated_at": updated_at.isoformat() if updated_at else None
            })

        return jobs

    except Exception as e:
        logger.exception(f"Failed to get jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------
# Get single job
# --------------------------------------------------------
@router.get("/automation/jobs/{job_id}")
def get_job(job_id: str, user=Depends(require_roles("editor", "admin"))):
    """
    Get specific job details.
    特定のジョブ詳細を取得
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT job_id, job_type, enabled, schedule_type, schedule_value,
                   last_run_at, last_run_status, last_run_result,
                   created_at, updated_at
            FROM scheduled_jobs
            WHERE job_id = %s
        """, (job_id,))

        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

        job_id, job_type, enabled, schedule_type, schedule_value, \
            last_run_at, last_run_status, last_run_result, \
            created_at, updated_at = row

        # Get next_run_time from scheduler
        job_status = scheduler.get_job_status(job_id)
        next_run_time = job_status["next_run_time"] if job_status else None

        # Parse last_run_result if it's a string
        if isinstance(last_run_result, str):
            try:
                last_run_result = json.loads(last_run_result)
            except json.JSONDecodeError:
                last_run_result = {}

        return {
            "job_id": job_id,
            "job_type": job_type,
            "enabled": enabled,
            "schedule_type": schedule_type,
            "schedule_value": schedule_value,
            "last_run_at": last_run_at.isoformat() if last_run_at else None,
            "last_run_status": last_run_status,
            "last_run_result": last_run_result,
            "next_run_time": next_run_time,
            "created_at": created_at.isoformat() if created_at else None,
            "updated_at": updated_at.isoformat() if updated_at else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------
# Update job configuration
# --------------------------------------------------------
@router.put("/automation/jobs/{job_id}")
def update_job(job_id: str, config: JobConfig, user=Depends(require_roles("admin"))):
    """
    Update job configuration.
    ジョブ設定を更新

    Requires admin role.
    """
    try:
        # Validate schedule_type
        if config.schedule_type not in ["interval", "cron"]:
            raise HTTPException(status_code=400, detail="schedule_type must be 'interval' or 'cron'")

        # Validate interval value
        if config.schedule_type == "interval":
            try:
                seconds = int(config.schedule_value)
                if seconds < 60:
                    raise HTTPException(status_code=400, detail="Minimum interval is 60 seconds (1 minute)")
                if seconds > 2592000:
                    raise HTTPException(status_code=400, detail="Maximum interval is 2592000 seconds (30 days)")
            except ValueError:
                raise HTTPException(status_code=400, detail="schedule_value must be a valid integer for interval")

        # Validate cron expression
        if config.schedule_type == "cron":
            is_valid, error_msg = scheduler.validate_cron_expression(config.schedule_value)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"Invalid cron expression: {error_msg}")

        # Update database
        conn = get_db_connection()
        cur = conn.cursor()

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        cur.execute("""
            UPDATE scheduled_jobs
            SET enabled = %s,
                schedule_type = %s,
                schedule_value = %s,
                updated_at = %s
            WHERE job_id = %s
        """, (config.enabled, config.schedule_type, config.schedule_value, now, job_id))

        if cur.rowcount == 0:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

        conn.commit()
        cur.close()
        conn.close()

        # Reload job in scheduler
        scheduler.reload_job(job_id)

        logger.info(f"Job {job_id} updated by {user['username']}: enabled={config.enabled}, {config.schedule_type}={config.schedule_value}")

        return {"message": "Job updated successfully", "job_id": job_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to update job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------
# Enable job
# --------------------------------------------------------
@router.post("/automation/jobs/{job_id}/enable")
def enable_job(job_id: str, user=Depends(require_roles("admin"))):
    """
    Enable a job.
    ジョブを有効化

    Requires admin role.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        cur.execute("""
            UPDATE scheduled_jobs
            SET enabled = TRUE,
                updated_at = %s
            WHERE job_id = %s
        """, (now, job_id))

        if cur.rowcount == 0:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

        conn.commit()
        cur.close()
        conn.close()

        # Reload job in scheduler
        scheduler.reload_job(job_id)

        logger.info(f"Job {job_id} enabled by {user['username']}")

        return {"message": "Job enabled successfully", "job_id": job_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to enable job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------
# Disable job
# --------------------------------------------------------
@router.post("/automation/jobs/{job_id}/disable")
def disable_job(job_id: str, user=Depends(require_roles("admin"))):
    """
    Disable a job.
    ジョブを無効化

    Requires admin role.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        cur.execute("""
            UPDATE scheduled_jobs
            SET enabled = FALSE,
                updated_at = %s
            WHERE job_id = %s
        """, (now, job_id))

        if cur.rowcount == 0:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

        conn.commit()
        cur.close()
        conn.close()

        # Reload job in scheduler (will remove from scheduler)
        scheduler.reload_job(job_id)

        logger.info(f"Job {job_id} disabled by {user['username']}")

        return {"message": "Job disabled successfully", "job_id": job_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to disable job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------
# Get summary for dashboard
# --------------------------------------------------------
@router.get("/automation/summary")
def get_summary(user=Depends(require_roles("viewer", "editor", "admin"))):
    """
    Get automation summary for dashboard.
    ダッシュボード用の自動化サマリーを取得
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT job_id, last_run_result, last_run_at
            FROM scheduled_jobs
            WHERE job_id IN ('collision_check', 'nmos_check')
        """)

        rows = cur.fetchall()
        cur.close()
        conn.close()

        collision_count = 0
        nmos_difference_count = 0
        last_updated = None

        for job_id, last_run_result, last_run_at in rows:
            if last_run_result:
                # Parse if string
                if isinstance(last_run_result, str):
                    try:
                        last_run_result = json.loads(last_run_result)
                    except json.JSONDecodeError:
                        last_run_result = {}

                if job_id == "collision_check":
                    collision_count = last_run_result.get("collision_count", 0)
                elif job_id == "nmos_check":
                    nmos_difference_count = last_run_result.get("nmos_difference_count", 0)

            # Track most recent update
            if last_run_at:
                if last_updated is None or last_run_at > last_updated:
                    last_updated = last_run_at

        total_alerts = collision_count + nmos_difference_count

        return {
            "total_alerts": total_alerts,
            "collision_count": collision_count,
            "nmos_difference_count": nmos_difference_count,
            "last_updated": last_updated.isoformat() if last_updated else None
        }

    except Exception as e:
        logger.exception(f"Failed to get summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
