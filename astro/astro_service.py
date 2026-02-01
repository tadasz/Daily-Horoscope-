"""
Core astrology calculations using Kerykeion.
Provides natal chart, transit, and current sky data.
"""

from kerykeion import AstrologicalSubject
from datetime import datetime, date
import math

# Zodiac signs in order
SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# Aspect definitions (angle, name, orb)
ASPECTS = [
    (0, "conjunction", 8),
    (60, "sextile", 6),
    (90, "square", 7),
    (120, "trine", 8),
    (180, "opposition", 8),
]

PLANET_NAMES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]


SIGN_FULL = {
    "Ari": "Aries", "Tau": "Taurus", "Gem": "Gemini", "Can": "Cancer",
    "Leo": "Leo", "Vir": "Virgo", "Lib": "Libra", "Sco": "Scorpio",
    "Sag": "Sagittarius", "Cap": "Capricorn", "Aqu": "Aquarius", "Pis": "Pisces",
}

def _full_sign(abbr: str) -> str:
    """Convert Kerykeion abbreviation to full sign name."""
    return SIGN_FULL.get(abbr, abbr)

def _extract_planet_data(subject: AstrologicalSubject) -> list:
    """Extract planet positions from a Kerykeion subject."""
    planets = []
    planet_attrs = [
        ("sun", "Sun"), ("moon", "Moon"), ("mercury", "Mercury"),
        ("venus", "Venus"), ("mars", "Mars"), ("jupiter", "Jupiter"),
        ("saturn", "Saturn"), ("uranus", "Uranus"), ("neptune", "Neptune"),
        ("pluto", "Pluto"),
    ]
    
    for attr, name in planet_attrs:
        planet = getattr(subject, attr, None)
        if planet:
            sign = getattr(planet, "sign", "Unknown")
            planets.append({
                "name": name,
                "sign": _full_sign(sign),
                "position": getattr(planet, "position", 0),
                "abs_pos": getattr(planet, "abs_pos", 0),
                "house": getattr(planet, "house", ""),
                "retrograde": getattr(planet, "retrograde", False) or False,
            })
    
    return planets


HOUSE_NAMES = [
    "first_house", "second_house", "third_house", "fourth_house",
    "fifth_house", "sixth_house", "seventh_house", "eighth_house",
    "ninth_house", "tenth_house", "eleventh_house", "twelfth_house",
]

def _extract_houses(subject: AstrologicalSubject) -> list:
    """Extract house cusps from a Kerykeion subject."""
    houses = []
    for i, attr_name in enumerate(HOUSE_NAMES, 1):
        house = getattr(subject, attr_name, None)
        if house:
            houses.append({
                "house": i,
                "sign": _full_sign(getattr(house, "sign", "")),
                "position": getattr(house, "position", 0),
                "abs_pos": getattr(house, "abs_pos", 0),
            })
    return houses


def _calculate_aspects(planets1: list, planets2: list) -> list:
    """Calculate aspects between two sets of planets."""
    aspects = []
    for p1 in planets1:
        for p2 in planets2:
            if p1["name"] == p2["name"] and planets1 is planets2:
                continue
            
            diff = abs(p1["abs_pos"] - p2["abs_pos"])
            if diff > 180:
                diff = 360 - diff
            
            for angle, aspect_name, orb in ASPECTS:
                if abs(diff - angle) <= orb:
                    aspects.append({
                        "planet1": p1["name"],
                        "sign1": p1["sign"],
                        "planet2": p2["name"],
                        "sign2": p2["sign"],
                        "aspect": aspect_name,
                        "orb": round(abs(diff - angle), 2),
                    })
                    break
    
    return aspects


def _get_moon_phase(sun_abs: float, moon_abs: float) -> str:
    """Calculate moon phase from Sun and Moon absolute positions."""
    diff = (moon_abs - sun_abs) % 360
    
    if diff < 22.5 or diff >= 337.5:
        return "New Moon"
    elif diff < 67.5:
        return "Waxing Crescent"
    elif diff < 112.5:
        return "First Quarter"
    elif diff < 157.5:
        return "Waxing Gibbous"
    elif diff < 202.5:
        return "Full Moon"
    elif diff < 247.5:
        return "Waning Gibbous"
    elif diff < 292.5:
        return "Last Quarter"
    else:
        return "Waning Crescent"


def calculate_natal_chart(name: str, year: int, month: int, day: int,
                          hour: int, minute: int,
                          lat: float = None, lng: float = None,
                          tz: str = "UTC") -> dict:
    """Calculate a complete natal chart."""
    
    kwargs = {
        "name": name,
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "minute": minute,
        "tz_str": tz,
        "online": False,
    }
    
    if lat is not None and lng is not None:
        kwargs["lat"] = lat
        kwargs["lng"] = lng
    
    subject = AstrologicalSubject(**kwargs)
    
    planets = _extract_planet_data(subject)
    houses = _extract_houses(subject)
    
    # Find sun, moon, rising
    sun_data = next((p for p in planets if p["name"] == "Sun"), None)
    moon_data = next((p for p in planets if p["name"] == "Moon"), None)
    
    # Calculate natal aspects
    natal_aspects = _calculate_aspects(planets, planets)
    
    # Moon phase at birth
    moon_phase = ""
    if sun_data and moon_data:
        moon_phase = _get_moon_phase(sun_data["abs_pos"], moon_data["abs_pos"])
    
    return {
        "name": name,
        "birth_data": {
            "year": year, "month": month, "day": day,
            "hour": hour, "minute": minute, "tz": tz,
            "lat": lat, "lng": lng,
        },
        "sun_sign": sun_data["sign"] if sun_data else "Unknown",
        "moon_sign": moon_data["sign"] if moon_data else "Unknown",
        "rising_sign": houses[0]["sign"] if houses else "Unknown",
        "moon_phase_at_birth": moon_phase,
        "planets": planets,
        "houses": houses,
        "natal_aspects": natal_aspects,
        "retrogrades_at_birth": [p["name"] for p in planets if p.get("retrograde")],
    }


def calculate_daily_transits(natal_chart: dict, target_date: str) -> dict:
    """Calculate transits for a specific date relative to a natal chart."""
    
    dt = datetime.fromisoformat(target_date)
    
    # Create a subject for "now" (or target date)
    now_subject = AstrologicalSubject(
        name="Transit",
        year=dt.year,
        month=dt.month,
        day=dt.day,
        hour=dt.hour if hasattr(dt, 'hour') else 12,
        minute=dt.minute if hasattr(dt, 'minute') else 0,
        tz_str="UTC",
        online=False,
    )
    
    transit_planets = _extract_planet_data(now_subject)
    natal_planets = natal_chart.get("planets", [])
    
    # Calculate transit-to-natal aspects
    transit_aspects = _calculate_aspects(transit_planets, natal_planets)
    
    # Current moon
    moon_data = next((p for p in transit_planets if p["name"] == "Moon"), None)
    sun_data = next((p for p in transit_planets if p["name"] == "Sun"), None)
    
    moon_phase = ""
    if sun_data and moon_data:
        moon_phase = _get_moon_phase(sun_data["abs_pos"], moon_data["abs_pos"])
    
    # Current retrogrades
    retrogrades = [p["name"] for p in transit_planets if p.get("retrograde")]
    
    return {
        "date": target_date,
        "moon_sign": moon_data["sign"] if moon_data else "Unknown",
        "moon_phase": moon_phase,
        "current_planets": transit_planets,
        "retrogrades": retrogrades,
        "transit_to_natal": transit_aspects,
        # Summary for LLM (most important transits)
        "summary": _build_transit_summary(transit_planets, transit_aspects, moon_phase, retrogrades),
    }


def _build_transit_summary(planets: list, aspects: list, moon_phase: str, retrogrades: list) -> str:
    """Build a human-readable transit summary for the LLM prompt."""
    moon = next((p for p in planets if p["name"] == "Moon"), None)
    sun = next((p for p in planets if p["name"] == "Sun"), None)
    
    lines = []
    if moon:
        lines.append(f"Moon in {moon['sign']} ({moon_phase})")
    if sun:
        lines.append(f"Sun in {sun['sign']}")
    
    if retrogrades:
        lines.append(f"Retrogrades: {', '.join(retrogrades)}")
    
    # Top 5 most significant transit aspects (by tight orb, slow planets first)
    slow_planets = {"Saturn", "Jupiter", "Uranus", "Neptune", "Pluto"}
    sorted_aspects = sorted(aspects, key=lambda a: (
        0 if a["planet1"] in slow_planets else 1,
        a["orb"]
    ))
    
    for asp in sorted_aspects[:5]:
        lines.append(f"Transiting {asp['planet1']} in {asp['sign1']} {asp['aspect']} natal {asp['planet2']} in {asp['sign2']} (orb {asp['orb']}°)")
    
    return "\n".join(lines)


def get_current_sky() -> dict:
    """Get current planetary positions (no natal chart needed)."""
    now = datetime.utcnow()
    
    subject = AstrologicalSubject(
        name="Now",
        year=now.year,
        month=now.month,
        day=now.day,
        hour=now.hour,
        minute=now.minute,
        tz_str="UTC",
        online=False,
    )
    
    planets = _extract_planet_data(subject)
    moon_data = next((p for p in planets if p["name"] == "Moon"), None)
    sun_data = next((p for p in planets if p["name"] == "Sun"), None)
    
    moon_phase = ""
    if sun_data and moon_data:
        moon_phase = _get_moon_phase(sun_data["abs_pos"], moon_data["abs_pos"])
    
    retrogrades = [p["name"] for p in planets if p.get("retrograde")]
    
    # Transit-to-transit aspects (what's happening in the sky today)
    sky_aspects = _calculate_aspects(planets, planets)
    
    return {
        "timestamp": now.isoformat(),
        "moon_sign": moon_data["sign"] if moon_data else "Unknown",
        "moon_phase": moon_phase,
        "sun_sign": sun_data["sign"] if sun_data else "Unknown",
        "planets": planets,
        "retrogrades": retrogrades,
        "sky_aspects": sky_aspects[:10],  # top 10
    }
