"""CRUD API for first-class Notebook Reports."""
from fastapi import APIRouter, HTTPException, Response, status
from loguru import logger

from api.models_reports import ReportCreate, ReportResponse, ReportUpdate
from open_notebook.domain.notebook import Notebook
from open_notebook.domain.report import Report
from open_notebook.exceptions import (
    InvalidInputError,
    NotFoundError,
    OpenNotebookError,
)

router = APIRouter()


def to_response(report: Report) -> ReportResponse:
    return ReportResponse(
        id=report.id or "",
        notebook_id=report.notebook_id,
        title=report.title,
        description=report.description,
        status=report.status,
        config=report.config,
        current_version=report.current_version,
        created=str(report.created or ""),
        updated=str(report.updated or ""),
    )


@router.post(
    "/reports",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(request: ReportCreate):
    try:
        await Notebook.get(request.notebook_id)
        report = Report(
            notebook_id=request.notebook_id,
            title=request.title,
            description=request.description,
            config=request.config,
        )
        await report.save()
        return to_response(report)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except InvalidInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except OpenNotebookError:
        raise
    except Exception:
        logger.exception("Unable to create report")
        raise HTTPException(status_code=500, detail="Unable to create report")


@router.get(
    "/notebooks/{notebook_id}/reports",
    response_model=list[ReportResponse],
)
async def list_reports(notebook_id: str):
    try:
        await Notebook.get(notebook_id)
        reports = await Report.for_notebook(notebook_id)
        return [to_response(report) for report in reports]
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except OpenNotebookError:
        raise
    except Exception:
        logger.exception("Unable to list notebook reports")
        raise HTTPException(status_code=500, detail="Unable to list reports")


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str):
    try:
        return to_response(await Report.get(report_id))
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Report not found")
    except OpenNotebookError:
        raise
    except Exception:
        logger.exception("Unable to fetch report")
        raise HTTPException(status_code=500, detail="Unable to fetch report")


@router.put("/reports/{report_id}", response_model=ReportResponse)
async def update_report(report_id: str, request: ReportUpdate):
    try:
        report = await Report.get(report_id)
        fields = request.model_fields_set

        if "title" in fields and request.title is not None:
            report.title = request.title.strip()
        if "description" in fields:
            report.description = request.description or ""
        if "status" in fields and request.status is not None:
            report.status = request.status
        if "config" in fields and request.config is not None:
            report.config = request.config

        await report.save()
        return to_response(report)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Report not found")
    except InvalidInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except OpenNotebookError:
        raise
    except Exception:
        logger.exception("Unable to update report")
        raise HTTPException(status_code=500, detail="Unable to update report")


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: str):
    try:
        report = await Report.get(report_id)
        await report.delete_with_children()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Report not found")
    except OpenNotebookError:
        raise
    except Exception:
        logger.exception("Unable to delete report")
        raise HTTPException(status_code=500, detail="Unable to delete report")
