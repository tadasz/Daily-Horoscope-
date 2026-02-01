"""
Astrology microservice — provides natal chart and daily transit calculations.
Powered by Kerykeion (Swiss Ephemeris / NASA JPL data).
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from astro_service import calculate_natal_chart, calculate_daily_transits, get_current_sky

app = FastAPI(title="Horoscope Astrology Service")


class BirthData(BaseModel):
    name: str
    year: int
    month: int
    day: int
    hour: Optional[int] = 12  # default to noon if unknown
    minute: Optional[int] = 0
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    tz: Optional[str] = "UTC"


class TransitRequest(BaseModel):
    natal_chart: dict  # the natal chart data from /natal-chart
    date: Optional[str] = None  # ISO date string, defaults to today


@app.get("/health")
def health():
    return {"status": "ok", "engine": "kerykeion"}


@app.post("/natal-chart")
def natal_chart(data: BirthData):
    """Calculate a full natal chart from birth data."""
    try:
        chart = calculate_natal_chart(
            name=data.name,
            year=data.year,
            month=data.month,
            day=data.day,
            hour=data.hour or 12,
            minute=data.minute or 0,
            lat=data.lat,
            lng=data.lng,
            tz=data.tz or "UTC",
        )
        return {"status": "ok", "chart": chart}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/daily-transits")
def daily_transits(data: TransitRequest):
    """Calculate today's transits relative to a natal chart."""
    try:
        target_date = data.date or date.today().isoformat()
        transits = calculate_daily_transits(data.natal_chart, target_date)
        return {"status": "ok", "transits": transits}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/current-sky")
def current_sky():
    """Get current planetary positions and moon phase (same for all users)."""
    try:
        sky = get_current_sky()
        return {"status": "ok", "sky": sky}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
