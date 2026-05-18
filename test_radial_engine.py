import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from radial_menu.radial_engine import calculate_sectors, get_hovered_sector

def test_radial_engine():
    # Test 4 items (Top, Right, Bottom, Left)
    items = [{"label": str(i)} for i in range(4)]
    sectors = calculate_sectors(items)
    assert len(sectors) == 4
    
    center = (100, 100)
    
    # North (Top) -> index 0
    assert get_hovered_sector((100, 50), center, sectors) == 0
    # East (Right) -> index 1
    assert get_hovered_sector((150, 100), center, sectors) == 1
    # South (Bottom) -> index 2
    assert get_hovered_sector((100, 150), center, sectors) == 2
    # West (Left) -> index 3
    assert get_hovered_sector((50, 100), center, sectors) == 3
    
    # Dead zone
    assert get_hovered_sector((105, 105), center, sectors) is None
    
    # Test 3 items
    items3 = [{"label": str(i)} for i in range(3)]
    sectors3 = calculate_sectors(items3)
    # 0 -> Top (90 deg)
    # 1 -> bottom-right (210 deg or -150 deg?)
    # 2 -> bottom-left (330 deg or -30 deg?)
    # Wait, clockwise from top: 90, 90-120= -30 (330), -30-120= -150 (210)
    assert get_hovered_sector((100, 50), center, sectors3) == 0 # Top
    assert get_hovered_sector((150, 150), center, sectors3) == 1 # Bottom-Right
    assert get_hovered_sector((50, 150), center, sectors3) == 2 # Bottom-Left

    print("Radial Engine tests passed!")

if __name__ == "__main__":
    test_radial_engine()
