import math
import time
import logging
from PyQt6.QtWidgets import QWidget
from PyQt6.QtCore import Qt, QPoint, pyqtSignal, QTimer
from PyQt6.QtGui import QPainter, QColor, QFont, QPen, QCursor

from radial_menu.radial_engine import calculate_sectors, get_hovered_sector
from radial_menu.menu_state import MenuState
from ghostwriter.injector import force_clipboard_paste

logger = logging.getLogger("RadialMenuWidget")

class RadialMenuWidget(QWidget):
    selection_made = pyqtSignal(str)
    closed = pyqtSignal()

    def __init__(self, config_manager, parent=None):
        super().__init__(parent)
        self.config_manager = config_manager
        self.menu_state = MenuState(self.config_manager.get_items())
        
        # UI Settings
        self.radius = 200
        self.inner_radius = 50
        self.dead_zone = 30
        self.setFixedSize(self.radius * 2, self.radius * 2)
        
        # Window Flags
        self.setWindowFlags(Qt.WindowType.WindowStaysOnTopHint | 
                           Qt.WindowType.FramelessWindowHint | 
                           Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        self.highlighted_index = None
        self.sectors = []
        self.update_sectors()
        self._show_started_at = None
        self._first_paint_reported = False
        self._cursor_track_timer = QTimer(self)
        self._cursor_track_timer.timeout.connect(self._update_highlight_from_global_cursor)
        self._cursor_track_timer.setInterval(12)
        
        self.setMouseTracking(True)
        self.center = QPoint(self.radius, self.radius)

    def update_sectors(self):
        items = self.menu_state.get_current_items()
        self.sectors = calculate_sectors(items)
        self.update()

    def show_at(self, pos: QPoint):
        self._show_started_at = time.perf_counter()
        self._first_paint_reported = False
        # Center the widget at the mouse position
        self.move(pos.x() - self.radius, pos.y() - self.radius)
        self.show()
        self.raise_()
        self.activateWindow()
        self._cursor_track_timer.start()
        self._update_highlight_from_global_cursor()

    def show_at_cursor(self):
        self.show_at(QCursor.pos())

    def _update_highlight_from_global_cursor(self):
        local_pos = self.mapFromGlobal(QCursor.pos())
        self.highlighted_index = get_hovered_sector(
            (float(local_pos.x()), float(local_pos.y())),
            (self.center.x(), self.center.y()),
            self.sectors,
            self.dead_zone,
        )
        self.update()

    def paintEvent(self, event):
        if self._show_started_at is not None and not self._first_paint_reported:
            ui_latency_ms = (time.perf_counter() - self._show_started_at) * 1000
            self._first_paint_reported = True
            if ui_latency_ms > 150:
                logger.warning("Radial menu UI show latency %.2fms exceeded 150ms target", ui_latency_ms)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        rect = self.rect()
        
        # Draw background circle
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(30, 30, 30, 180)) # Dark semi-transparent
        painter.drawEllipse(self.center, self.radius, self.radius)
        
        # Draw sectors
        for i, s in enumerate(self.sectors):
            is_highlighted = (i == self.highlighted_index)
            
            # Draw Pie
            if is_highlighted:
                painter.setBrush(QColor(0, 150, 255, 200)) # Highlight blue
            else:
                painter.setBrush(QColor(50, 50, 50, 100)) # Default grey
            
            painter.setPen(QPen(QColor(255, 255, 255, 50), 1))
            
            # PyQt angles are in 1/16th of a degree
            painter.drawPie(rect, int(s.start_angle * 16), int(s.span_angle * 16))
            
            # Draw Label
            self.draw_label(painter, s, is_highlighted)

        # Draw inner hole
        painter.setBrush(QColor(0, 0, 0, 100))
        painter.setPen(QPen(QColor(255, 255, 255, 100), 2))
        painter.drawEllipse(self.center, self.inner_radius, self.inner_radius)
        
        # Draw center icon or text if at root or not
        if not self.menu_state.is_at_root():
            painter.setPen(QColor(255, 255, 255))
            painter.setFont(QFont("Arial", 10, QFont.Weight.Bold))
            painter.drawText(rect, Qt.AlignmentFlag.AlignCenter, "BACK")

    def draw_label(self, painter, sector, highlighted):
        # Calculate label position
        # Label should be in the middle of the sector at some radius
        mid_angle = sector.start_angle + sector.span_angle / 2
        rad = math.radians(mid_angle)
        
        label_radius = (self.radius + self.inner_radius) / 2
        x = self.center.x() + label_radius * math.cos(rad)
        y = self.center.y() - label_radius * math.sin(rad) # Y is down
        
        if highlighted:
            painter.setPen(QColor(255, 255, 255))
            font = QFont("Arial", 11, QFont.Weight.Bold)
        else:
            painter.setPen(QColor(200, 200, 200))
            font = QFont("Arial", 10)
            
        painter.setFont(font)
        
        # Draw centered at x, y
        text = sector.label
        fm = painter.fontMetrics()
        tw = fm.horizontalAdvance(text)
        th = fm.height()
        
        painter.drawText(int(x - tw/2), int(y + th/4), text)

    def mouseMoveEvent(self, event):
        pos = event.position()
        self.highlighted_index = get_hovered_sector(
            (pos.x(), pos.y()), 
            (self.center.x(), self.center.y()), 
            self.sectors, 
            self.dead_zone
        )
        self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.confirm_selection()
        elif event.button() == Qt.MouseButton.RightButton:
            if not self.menu_state.go_back():
                self.hide_menu()
            else:
                self.update_sectors()

    def keyPressEvent(self, event):
        if event.key() == Qt.Key.Key_Escape:
            if not self.menu_state.go_back():
                self.hide_menu()
            else:
                self.update_sectors()

    def confirm_selection(self):
        if self.highlighted_index is not None:
            item = self.menu_state.get_item(self.highlighted_index)
            if item:
                if item["type"] == "submenu":
                    self.menu_state.enter_submenu(self.highlighted_index)
                    self.update_sectors()
                    self.highlighted_index = None
                else:
                    text = item.get("content", "")
                    # Close the menu first so focus can return to the target app,
                    # then inject text via clipboard paste.
                    self.hide_menu()
                    QTimer.singleShot(35, lambda t=text: force_clipboard_paste(t))
        else:
            # If in dead zone and clicked, maybe go back?
            # Requirement says "cancel menu"
            self.hide_menu()

    def hide_menu(self):
        self._cursor_track_timer.stop()
        self.hide()
        # Reset state to root for next time
        while self.menu_state.go_back():
            pass
        self.update_sectors()
        self.closed.emit()
