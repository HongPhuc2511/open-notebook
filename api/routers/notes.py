import re
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.models import MindMapRequest, NoteCreate, NoteResponse, NoteUpdate
from open_notebook.domain.notebook import Note, Notebook, Source
from open_notebook.exceptions import (
    InvalidInputError,
    NotFoundError,
    OpenNotebookError,
)

router = APIRouter()


@router.get("/notes", response_model=List[NoteResponse])
async def get_notes(
    notebook_id: Optional[str] = Query(None, description="Filter by notebook ID"),
):
    """Get all notes with optional notebook filtering."""
    try:
        if notebook_id:
            # Get notes for a specific notebook
            from open_notebook.domain.notebook import Notebook

            notebook = await Notebook.get(notebook_id)
            notes = await notebook.get_notes()
        else:
            # Get all notes
            notes = await Note.get_all(order_by="updated desc")

        return [
            NoteResponse(
                id=note.id or "",
                title=note.title,
                content=note.content,
                note_type=note.note_type,
                created=str(note.created),
                updated=str(note.updated),
            )
            for note in notes
        ]
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except OpenNotebookError:
        raise
    except Exception as e:
        logger.error(f"Error fetching notes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching notes: {str(e)}")


@router.post("/notes", response_model=NoteResponse)
async def create_note(note_data: NoteCreate):
    """Create a new note."""
    try:
        # Auto-generate title if not provided and it's an AI note
        title = note_data.title
        if not title and note_data.note_type == "ai" and note_data.content:
            from open_notebook.graphs.prompt import graph as prompt_graph

            prompt = "Based on the Note below, please provide a Title for this content, with max 15 words"
            # LangGraph accepts a partial state dict at runtime, but its typed
            # overloads require the full state type (langgraph typing limitation).
            result = await prompt_graph.ainvoke(  # type: ignore[call-overload]
                {
                    "input_text": note_data.content,
                    "prompt": prompt,
                }
            )
            title = result.get("output", "Untitled Note")

        # Validate note_type
        note_type: Optional[Literal["human", "ai"]] = None
        if note_data.note_type in ("human", "ai"):
            note_type = note_data.note_type  # type: ignore[assignment]
        elif note_data.note_type is not None:
            raise HTTPException(
                status_code=400, detail="note_type must be 'human' or 'ai'"
            )

        new_note = Note(
            title=title,
            content=note_data.content,
            note_type=note_type,
        )
        command_id = await new_note.save()

        # Add to notebook if specified
        if note_data.notebook_id:
            from open_notebook.domain.notebook import Notebook

            # Verify the notebook exists (raises NotFoundError -> 404)
            await Notebook.get(note_data.notebook_id)
            await new_note.add_to_notebook(note_data.notebook_id)

        return NoteResponse(
            id=new_note.id or "",
            title=new_note.title,
            content=new_note.content,
            note_type=new_note.note_type,
            created=str(new_note.created),
            updated=str(new_note.updated),
            command_id=str(command_id) if command_id else None,
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except OpenNotebookError:
        raise
    except Exception as e:
        logger.error(f"Error creating note: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating note: {str(e)}")


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str):
    """Get a specific note by ID."""
    try:
        note = await Note.get(note_id)

        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            created=str(note.created),
            updated=str(note.updated),
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except OpenNotebookError:
        raise
    except Exception as e:
        logger.error(f"Error fetching note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching note: {str(e)}")


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, note_update: NoteUpdate):
    """Update a note."""
    try:
        note = await Note.get(note_id)

        # Update only provided fields
        if note_update.title is not None:
            note.title = note_update.title
        if note_update.content is not None:
            note.content = note_update.content
        if note_update.note_type is not None:
            if note_update.note_type in ("human", "ai"):
                note.note_type = note_update.note_type  # type: ignore[assignment]
            else:
                raise HTTPException(
                    status_code=400, detail="note_type must be 'human' or 'ai'"
                )

        command_id = await note.save()

        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            created=str(note.created),
            updated=str(note.updated),
            command_id=str(command_id) if command_id else None,
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except OpenNotebookError:
        raise
    except Exception as e:
        logger.error(f"Error updating note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating note: {str(e)}")


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note."""
    try:
        note = await Note.get(note_id)

        await note.delete()

        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except OpenNotebookError:
        raise
    except Exception as e:
        logger.error(f"Error deleting note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting note: {str(e)}")


MINDMAP_PROMPT = """Create a mind map of the content below as a Markdown outline.
Rules:
- Write in the SAME language as the content.
- Line 1 is a single '# ' heading: the central topic (max 8 words).
- Then 4-8 main branches as '## ' headings, each with 2-5 sub-branches as '- ' bullets.
  Nested bullets (indented by two spaces) are allowed up to 3 levels deep.
- Every node is a short phrase (max 10 words), never a full sentence.
- Output ONLY the Markdown outline. No code fences, no explanations."""

MINDMAP_MAX_CHARS = 80_000


def _clean_outline(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else ""
    if t.endswith("```"):
        t = t[:-3]
    return t.strip()


def _build_mindmap_prompt(language: str | None, topic: str | None) -> str:
    prompt = MINDMAP_PROMPT
    lang = (language or "").strip()[:40]
    if lang and lang.lower() != "auto":
        prompt = prompt.replace(
            "- Write in the SAME language as the content.",
            f"- Write ALL node text in {lang}, translating if needed.",
        )
    focus = (topic or "").strip()[:500]
    if focus:
        prompt += (
            "\n- The user asked for this focus; build the mind map around it "
            f"(use only facts from the content): {focus}"
        )
    return prompt


@router.post("/notes/mindmap", response_model=NoteResponse)
async def generate_mindmap(req: MindMapRequest):
    """Generate a mind map (Markdown outline) from sources and save it as a note."""
    try:
        from open_notebook.graphs.prompt import graph as prompt_graph

        notebook = await Notebook.get(req.notebook_id)

        if req.source_ids:
            sources = [await Source.get(sid) for sid in req.source_ids]
        else:
            sources = await notebook.get_sources(include_full_text=True)
        sources = [s for s in sources if s.full_text and s.full_text.strip()]

        if not sources:
            raise HTTPException(
                status_code=400, detail="No source content available for a mind map"
            )

        per_source = MINDMAP_MAX_CHARS // len(sources)
        context = "\n\n".join(
            f"## {s.title or 'Untitled'}\n\n{(s.full_text or '')[:per_source]}"
            for s in sources
        )

        result = await prompt_graph.ainvoke(  # type: ignore[call-overload]
            {
                "input_text": context,
                "prompt": _build_mindmap_prompt(req.language, req.topic),
            },
            config={"configurable": {"model_id": req.model_id}},
        )
        outline = _clean_outline(result.get("output", ""))
        if not outline:
            raise HTTPException(
                status_code=502, detail="Model returned an empty mind map"
            )

        m = re.match(r"#\s+(.+)", outline)
        title = m.group(1).strip() if m else "Mind map"

        note = Note(title=title, content=outline, note_type="mindmap")
        await note.save()
        await note.add_to_notebook(req.notebook_id)

        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            created=str(note.created),
            updated=str(note.updated),
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook or source not found")
    except OpenNotebookError:
        raise
    except Exception as e:
        logger.error(f"Error generating mind map: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error generating mind map: {str(e)}"
        )
