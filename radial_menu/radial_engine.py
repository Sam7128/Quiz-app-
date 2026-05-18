import math
from typing import List, Optional, Tuple, NamedTuple

class SectorGeometry(NamedTuple):
    index: int
    start_angle: float  # in degrees
    span_angle: float   # in degrees
    label: str

def calculate_sectors(items: List[dict]) -> List[SectorGeometry]:
    """
    Calculate the start and span angles for each item in a radial menu.
    PyQt uses 1/16th of a degree for QPainter.drawPie, but we'll use degrees here.
    0 degrees is at 3 o'clock, counter-clockwise.
    Actually, it's easier to think in degrees where 0 is North if we adjust.
    Let's follow PyQt convention: 0 is 3 o'clock, positive is counter-clockwise.
    To make it intuitive (first item at the top), we start at 90 degrees and go clockwise?
    Wait, if we have 4 items, they should be Top, Right, Bottom, Left.
    """
    count = len(items)
    if count == 0:
        return []
    
    span = 360.0 / count
    sectors = []
    
    # We want the first item to be centered at the top (90 degrees)
    # So its start_angle should be 90 + span/2
    # But QPainter.drawPie(rect, startAngle, spanAngle)
    # If we want the first item to be centered at 90 deg:
    # start = 90 + (span / 2)
    # BUT wait, PyQt angles are counter-clockwise.
    # To go clockwise: start at 90 + span/2, and span is -span.
    
    start_offset = 90.0 + (span / 2.0)
    
    for i, item in enumerate(items):
        # We use negative span to go clockwise
        angle = (start_offset - (i * span)) % 360
        sectors.append(SectorGeometry(
            index=i,
            start_angle=angle,
            span_angle=-span,
            label=item.get("label", "")
        ))
    
    return sectors

def get_hovered_sector(mouse_pos: Tuple[float, float], center: Tuple[float, float], 
                       sectors: List[SectorGeometry], dead_zone: float = 30.0) -> Optional[int]:
    """
    Determine which sector is hovered based on mouse position relative to center.
    Returns None if in dead_zone.
    """
    dx = mouse_pos[0] - center[0]
    dy = mouse_pos[1] - center[1]
    
    distance = math.sqrt(dx*dx + dy*dy)
    if distance < dead_zone:
        return None
    
    # math.atan2(y, x) returns angle in radians from -pi to pi.
    # y is down in screen coordinates, so we negate it for standard Cartesian.
    # Actually, screen Y increases downwards.
    # In standard Cartesian: angle = atan2(y, x)
    # In screen: y_cartesian = -y_screen
    angle_rad = math.atan2(-dy, dx)
    angle_deg = math.degrees(angle_rad)
    if angle_deg < 0:
        angle_deg += 360
        
    # Now angle_deg is 0-360, 0 at 3 o'clock, 90 at 12 o'clock.
    
    for s in sectors:
        # Check if angle is within [start, start + span]
        # Since span is negative (clockwise), we check [start + span, start]
        # Handle wrap around
        start = s.start_angle
        end = s.start_angle + s.span_angle # span is negative
        
        # Normalize angles to [0, 360)
        a = angle_deg
        s_norm = start % 360
        e_norm = end % 360
        
        if s_norm > e_norm:
            # Normal case (e.g., start 135, end 45)
            if e_norm <= a <= s_norm:
                return s.index
        else:
            # Wrap around case (e.g., start 45, end -45 -> 315)
            # s_norm is 45, e_norm is 315
            if a >= s_norm or a <= e_norm: # Wait, this logic is tricky
                pass
    
    # Simplified approach: just find the index based on the angle directly
    if not sectors: return None
    count = len(sectors)
    span = 360.0 / count
    
    # The first item is centered at 90 deg.
    # Angle of first item center: 90
    # Angle of i-th item center: 90 - i * span
    
    # relative_angle: how many degrees clockwise from 12 o'clock (90 deg)
    rel_angle = (90.0 - angle_deg) % 360
    # rel_angle is 0 at 12 o'clock, 90 at 3 o'clock, 180 at 6 o'clock...
    
    index = int((rel_angle + (span / 2.0)) / span) % count
    return index
